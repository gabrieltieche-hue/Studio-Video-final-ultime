import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { LOOK_PRESETS } from '../data/shortSpec';
import {
  buildTimedProjectFromBeatAudios,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  parseBulkTopicsInput,
  pickTopicIcon,
  resolveBeatLayout,
  resolveChannelCtaProfile,
  sanitizeScriptText,
  trimSpokenLineForPacing,
} from '../engine/batchShortBuilder';
import {
  isDevOrCodeTopic,
  selectBottomMediaForShort,
} from '../engine/brollKeys';
import { humanizeFrenchScript, pickBestHookVariant } from '../engine/outliersMath';
import { auditShortQuality } from '../engine/shortQualityChecklist';
import {
  PRIMITIVE_META_MAP,
  UNIVERSAL_PRIMITIVES_CATALOG,
  UNIVERSAL_PRIMITIVE_IDS,
  validateFullShortPlan,
} from '../engine/shortPrimitivesSchema';
import {
  appendSessionToCsv,
  computeCompositeViralScore,
  normalizeSlug,
  type NewTopicCandidate,
  type TopicCategory,
} from '../engine/topicCsv';
import {
  readTopicsCsv,
  updateTopicStatus,
  writeTopicsCsv,
} from '../engine/topicResearchService';
import type {
  BatchAutoScheduleConfig,
  BatchBeatSpec,
  BatchJobItem,
  BatchJobRecord,
  DynamicVisualType,
  StartBatchRequest,
  UniversalPrimitiveType,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import { renderDynamicProjectToMp4 } from './batchRenderer';
import { resolveAndCacheVisualQuery } from './brollResolverService';
import { generateAiSocialCopy } from './socialPublisher';
import { createScheduledPostsForProject } from './socialRouter';
import { getChannelBrandingKit } from './socialStorage';
import {
  PROJECTS_DIR,
  ROOT_DIR,
  STORAGE_DIR,
  getAllProjects,
  saveProject,
} from './storageManager';
import { triggerAutoSyncInBackground } from './syncManager';
import { synthesizeVoiceoverByBeats, synthesizeVoiceoverUnified } from './voiceEngineService';

export const BATCH_JOBS_DIR = path.join(STORAGE_DIR, 'batch-jobs');

const GEMINI_SCRIPT_TIMEOUT_MS = 60_000;
const MAX_GEMINI_REPAIR_RETRIES = 2;

const activeCancelledBatchIds = new Set<string>();

function ensureBatchDir() {
  if (!fs.existsSync(BATCH_JOBS_DIR)) {
    fs.mkdirSync(BATCH_JOBS_DIR, { recursive: true });
  }
}

export function saveBatchJob(job: BatchJobRecord): BatchJobRecord {
  ensureBatchDir();
  const next: BatchJobRecord = {
    ...job,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(BATCH_JOBS_DIR, `${next.id}.json`),
    JSON.stringify(next, null, 2),
    'utf-8'
  );
  return next;
}

export function getBatchJob(batchId: string): BatchJobRecord | null {
  ensureBatchDir();
  const safeId = path.basename(batchId);
  const p = path.join(BATCH_JOBS_DIR, `${safeId}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as BatchJobRecord;
  } catch {
    return null;
  }
}

export function listBatchJobs(): BatchJobRecord[] {
  ensureBatchDir();
  const files = fs.readdirSync(BATCH_JOBS_DIR).filter((f) => f.endsWith('.json'));
  const jobs: BatchJobRecord[] = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(BATCH_JOBS_DIR, file), 'utf-8')
      ) as BatchJobRecord;
      jobs.push(parsed);
    } catch {
      // ignore corrupted file
    }
  }
  return jobs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY manquante ou non configurée. Impossible de générer un script sur mesure sans fallback.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateBatchTopicsWithGemini(
  count: number,
  focus?: string
): Promise<
  Array<{
    topicId?: string;
    category: string;
    theme: string;
    angle?: string;
    hookHint?: string;
    sources?: string;
  }>
> {
  const { rows: existingRows } = readTopicsCsv(ROOT_DIR);
  const ai = createGeminiClient();
  const safeCount = Math.max(1, Math.min(10, count || 3));

  const today = new Date().toISOString().slice(0, 10);
  const existingList = existingRows.map((r) => `- ${r.theme}`).join('\n');
  const focusClause = focus?.trim()
    ? `Thématique ou niche demandée par le créateur : "${focus.trim()}".`
    : 'Varie les catégories entre Économie, Restauration/Business, Immobilier, Droit, Emploi, Santé et Tech.';

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `Tu es le stratège éditorial d'une chaîne française de YouTube Shorts / Reels / TikTok style @melvynxdev (ton analytique, direct, chiffré, 42-54s).`,
      `Date du jour : ${today}. ${focusClause}`,
      `Thèmes déjà produits ou listés (NE PAS RÉPÉTER) :\n${existingList || '(aucun)'}`,
      `Génère exactement ${safeCount} sujets distincts à très fort potentiel viral en France.`,
      `Zéro tiret cadratin (pas de —). Chaque hook_propose < 16 mots.`,
    ].join('\n\n'),
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            categorie: { type: Type.STRING },
            theme: { type: Type.STRING },
            angle_viral_fr: { type: Type.STRING },
            hook_propose: { type: Type.STRING },
            hook_ecran: { type: Type.STRING },
            score_viral_fr: { type: Type.INTEGER },
            score_actualite: { type: Type.INTEGER },
            score_save_share: { type: Type.INTEGER },
            tension_emotion: { type: Type.STRING },
            sources: { type: Type.STRING },
            slug_short: { type: Type.STRING },
            raison_selection: { type: Type.STRING },
          },
          required: [
            'categorie',
            'theme',
            'angle_viral_fr',
            'hook_propose',
            'hook_ecran',
            'score_viral_fr',
            'score_actualite',
            'score_save_share',
            'tension_emotion',
            'sources',
            'slug_short',
            'raison_selection',
          ],
        },
      },
    },
  });

  const parsed = JSON.parse(response.text || '[]') as Array<
    Omit<NewTopicCandidate, 'categorie' | 'plateformes_cibles'> & { categorie: string }
  >;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Gemini n’a retourné aucun sujet exploitable.');
  }

  const sessionId = `BATCH-${today}-${String(Date.now()).slice(-4)}`;
  const normalized: NewTopicCandidate[] = parsed.slice(0, safeCount).map((p) => ({
    ...p,
    categorie: p.categorie as TopicCategory,
    plateformes_cibles: 'TikTok · Reels · YT Shorts',
  }));
  const { rows, added } = appendSessionToCsv(existingRows, sessionId, today, normalized);
  writeTopicsCsv(ROOT_DIR, rows);

  return added.map((r) => ({
    topicId: r.id,
    category: r.categorie,
    theme: r.theme,
    angle: r.angle_viral_fr,
    hookHint: r.hook_propose,
    sources: r.sources,
  }));
}

interface RawGeminiBeat {
  title?: string;
  highlightWord?: string;
  strikeWord?: string;
  shortLabel?: string;
  screenLabel?: string;
  spokenLine?: string;
  visualType?: string;
  layoutHint?: string;
  visualQuery?: string;
  brollKey?: string;
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
  dateBadge?: string;
  sourceLabel?: string;
  quoteText?: string;
  quoteHighlight?: string;
  beforeBadText?: string;
  afterGoodText?: string;
  leftCard?: { label?: string; value?: string; sub?: string };
  rightCard?: { label?: string; value?: string; sub?: string };
  comparisonLeft?: { label?: string; value?: string; ratio?: number };
  comparisonRight?: { label?: string; value?: string; ratio?: number };
  multiplierBadge?: string;
  gaugePct?: number;
  matrixHighlightPct?: number;
  matrixCalloutLabel?: string;
  bullets?: string[];
  steps?: string[];
  chartUnit?: string;
  chartPoints?: Array<{ label?: string; value?: number; highlight?: boolean }>;
  dialKnobs?: Array<{ label?: string; value?: number; unit?: string; active?: boolean }>;
  terminalCmd?: string;
  terminalOut?: string[];
  fanCards?: Array<{ tag?: string; metric?: string; label?: string }>;
  receiptItems?: Array<{ label?: string; amount?: string; highlight?: boolean; tone?: string }>;
  receiptTotalLabel?: string;
  receiptTotalValue?: string;
  calendarMonth?: string;
  calendarYear?: string;
  calendarDaysMarked?: number[];
  calendarHighlightDay?: number;
  calendarNote?: string;
  barrierBadge?: string;
  barrierRuleText?: string;
  compressorFrom?: string;
  compressorTo?: string;
  compressorUnitLabel?: string;
  mindmapCenter?: string;
  mindmapNodes?: Array<{ label?: string; detail?: string }>;
  auditRows?: Array<{ label?: string; detail?: string; status?: string; badge?: string }>;
  profileCards?: Array<{ name?: string; role?: string; metric?: string; quote?: string }>;
  notifCount?: string;
  notifItems?: Array<{ sender?: string; message?: string; time?: string }>;
  quotaActualLabel?: string;
  quotaPlannedLabel?: string;
  quotaBars?: Array<{ label?: string; pct?: number }>;
  globeOrigin?: string;
  globeDestinations?: Array<{ label?: string; value?: string }>;
}

interface RawGeminiPlan {
  hookText?: string;
  hookVariants?: string[];
  youtubeTitle?: string;
  caption?: string;
  hashtags?: string[];
  beats?: RawGeminiBeat[];
}

function normalizeGeminiPlanToBeats(
  rawPlan: RawGeminiPlan,
  item: Pick<BatchJobItem, 'theme' | 'category'>,
  channelHandle: string,
  channelTagline: string,
  isDev: boolean
): {
  hookText: string;
  hookVariants: string[];
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  beats: BatchBeatSpec[];
} {
  const rawBeats = Array.isArray(rawPlan.beats) ? rawPlan.beats.slice(0, 8) : [];
  const iconKind = pickTopicIcon(item.category, item.theme);
  const hookVariants = Array.isArray(rawPlan.hookVariants)
    ? rawPlan.hookVariants.map((h) => sanitizeScriptText(String(h || ''))).filter(Boolean)
    : [];
  const bestHook = hookVariants.length > 0 ? pickBestHookVariant(hookVariants) : null;

  const beats: BatchBeatSpec[] = rawBeats.map((b, idx) => {
    const isLast = idx === rawBeats.length - 1;
    const rawVt = String(b.visualType || '').trim();
    const vt: DynamicVisualType = isLast
      ? 'channel_end_cta'
      : UNIVERSAL_PRIMITIVE_IDS.has(rawVt as UniversalPrimitiveType)
        ? (rawVt as UniversalPrimitiveType)
        : (rawVt as DynamicVisualType);

    const meta = UNIVERSAL_PRIMITIVE_IDS.has(vt as UniversalPrimitiveType)
      ? PRIMITIVE_META_MAP[vt as UniversalPrimitiveType]
      : undefined;

    const layoutHint: 'split' | 'fullscreen' = isLast
      ? 'split'
      : b.layoutHint === 'fullscreen' || b.layoutHint === 'split'
        ? b.layoutHint
        : meta?.preferLayout || 'split';

    const rawSpoken =
      idx === 0 && bestHook && bestHook.score >= 7 && bestHook.hook.length >= 16
        ? bestHook.hook
        : String(b.spokenLine || '');
    const cleanSpoken = trimSpokenLineForPacing(
      humanizeFrenchScript(sanitizeScriptText(rawSpoken)).cleaned,
      idx === 0 ? 15 : 19
    );

    const cleanTone = (v?: string): 'neutral' | 'negative' | 'positive' =>
      v === 'negative' || v === 'positive' ? v : 'neutral';

    const cleanStatus = (v?: string): 'alert' | 'ok' | 'removed' =>
      v === 'ok' || v === 'removed' ? v : 'alert';

    return {
      id: `beat-${idx + 1}`,
      title: condenseVisualHeadline(String(b.title || ''), 6, 44),
      highlightWord: b.highlightWord ? sanitizeScriptText(b.highlightWord).slice(0, 26) : undefined,
      strikeWord: b.strikeWord ? sanitizeScriptText(b.strikeWord).slice(0, 22) : undefined,
      shortLabel: sanitizeScriptText(b.shortLabel || `Séquence ${idx + 1}`).slice(0, 24),
      screenLabel: sanitizeScriptText(b.screenLabel || '').toUpperCase().slice(0, 28),
      spokenLine: cleanSpoken,
      visualType: vt,
      layoutHint,
      visualQuery: b.visualQuery ? sanitizeScriptText(b.visualQuery).slice(0, 80) : undefined,
      brollKey: b.brollKey ? String(b.brollKey).trim() : undefined,
      iconKind,
      stampWord: b.stampWord ? sanitizeScriptText(b.stampWord).toUpperCase().slice(0, 22) : undefined,
      statValue: isLast
        ? channelHandle
        : b.statValue
          ? sanitizeScriptText(b.statValue).slice(0, 20)
          : undefined,
      statLabel: isLast
        ? sanitizeScriptText(b.statLabel || channelTagline).slice(0, 64)
        : b.statLabel
          ? sanitizeScriptText(b.statLabel).slice(0, 64)
          : undefined,
      dateBadge: b.dateBadge ? sanitizeScriptText(b.dateBadge).toUpperCase().slice(0, 24) : undefined,
      sourceLabel: b.sourceLabel ? sanitizeScriptText(b.sourceLabel).slice(0, 56) : undefined,
      quoteText: b.quoteText ? sanitizeScriptText(b.quoteText).slice(0, 180) : undefined,
      quoteHighlight: b.quoteHighlight ? sanitizeScriptText(b.quoteHighlight).slice(0, 60) : undefined,
      beforeBadText: b.beforeBadText ? sanitizeScriptText(b.beforeBadText).slice(0, 100) : undefined,
      afterGoodText: b.afterGoodText ? sanitizeScriptText(b.afterGoodText).slice(0, 100) : undefined,
      leftCard: b.leftCard?.label
        ? {
            label: sanitizeScriptText(b.leftCard.label).slice(0, 28),
            value: sanitizeScriptText(b.leftCard.value || '').slice(0, 18),
            sub: sanitizeScriptText(b.leftCard.sub || '').slice(0, 42),
          }
        : undefined,
      rightCard: b.rightCard?.label
        ? {
            label: sanitizeScriptText(b.rightCard.label).slice(0, 28),
            value: sanitizeScriptText(b.rightCard.value || '').slice(0, 18),
            sub: sanitizeScriptText(b.rightCard.sub || '').slice(0, 42),
          }
        : undefined,
      comparisonLeft: b.comparisonLeft?.label
        ? {
            label: sanitizeScriptText(b.comparisonLeft.label).slice(0, 32),
            value: sanitizeScriptText(b.comparisonLeft.value || '').slice(0, 18),
            ratio: Math.max(0.08, Math.min(1, Number(b.comparisonLeft.ratio) || 0.75)),
          }
        : undefined,
      comparisonRight: b.comparisonRight?.label
        ? {
            label: sanitizeScriptText(b.comparisonRight.label).slice(0, 32),
            value: sanitizeScriptText(b.comparisonRight.value || '').slice(0, 18),
            ratio: Math.max(0.08, Math.min(1, Number(b.comparisonRight.ratio) || 0.35)),
          }
        : undefined,
      multiplierBadge: b.multiplierBadge ? sanitizeScriptText(b.multiplierBadge).slice(0, 14) : undefined,
      gaugePct: typeof b.gaugePct === 'number' ? Math.max(5, Math.min(99, Math.round(b.gaugePct))) : undefined,
      matrixHighlightPct:
        typeof b.matrixHighlightPct === 'number'
          ? Math.max(2, Math.min(98, Math.round(b.matrixHighlightPct)))
          : undefined,
      matrixCalloutLabel: b.matrixCalloutLabel
        ? sanitizeScriptText(b.matrixCalloutLabel).slice(0, 36)
        : undefined,
      bullets: Array.isArray(b.bullets)
        ? b.bullets.map((x) => sanitizeScriptText(x).slice(0, 56)).filter(Boolean).slice(0, 5)
        : undefined,
      steps: Array.isArray(b.steps)
        ? b.steps.map((x) => sanitizeScriptText(x).slice(0, 42)).filter(Boolean).slice(0, 4)
        : undefined,
      chartUnit: b.chartUnit ? sanitizeScriptText(b.chartUnit).slice(0, 10) : undefined,
      chartPoints: Array.isArray(b.chartPoints)
        ? b.chartPoints
            .filter((pt) => pt && pt.label && Number.isFinite(Number(pt.value)))
            .map((pt) => ({
              label: sanitizeScriptText(String(pt.label)).slice(0, 12),
              value: Number(pt.value),
              highlight: Boolean(pt.highlight),
            }))
            .slice(0, 6)
        : undefined,
      dialKnobs: Array.isArray(b.dialKnobs)
        ? b.dialKnobs
            .filter((k) => k && k.label && Number.isFinite(Number(k.value)))
            .map((k, kIdx) => ({
              label: sanitizeScriptText(String(k.label)).slice(0, 20),
              value: Math.max(0, Math.min(100, Math.round(Number(k.value)))),
              unit: (k.unit || '%').slice(0, 6),
              active: k.active ?? kIdx !== 1,
            }))
            .slice(0, 3)
        : undefined,
      terminalCmd: isDev && b.terminalCmd ? sanitizeScriptText(b.terminalCmd).slice(0, 52) : undefined,
      terminalOut:
        isDev && Array.isArray(b.terminalOut)
          ? b.terminalOut.map((l) => sanitizeScriptText(l).slice(0, 54)).filter(Boolean).slice(0, 4)
          : undefined,
      fanCards: Array.isArray(b.fanCards)
        ? b.fanCards
            .filter((fc) => fc && fc.label && fc.metric)
            .map((fc) => ({
              tag: sanitizeScriptText(String(fc.tag || '')).slice(0, 14),
              metric: sanitizeScriptText(String(fc.metric || '')).slice(0, 18),
              label: sanitizeScriptText(String(fc.label || '')).slice(0, 46),
            }))
            .slice(0, 4)
        : undefined,
      receiptItems: Array.isArray(b.receiptItems)
        ? b.receiptItems
            .filter((ri) => ri && ri.label && ri.amount)
            .map((ri) => ({
              label: sanitizeScriptText(String(ri.label)).slice(0, 34),
              amount: sanitizeScriptText(String(ri.amount)).slice(0, 18),
              highlight: Boolean(ri.highlight),
              tone: cleanTone(ri.tone),
            }))
            .slice(0, 5)
        : undefined,
      receiptTotalLabel: b.receiptTotalLabel ? sanitizeScriptText(b.receiptTotalLabel).slice(0, 28) : undefined,
      receiptTotalValue: b.receiptTotalValue ? sanitizeScriptText(b.receiptTotalValue).slice(0, 18) : undefined,
      calendarMonth: b.calendarMonth ? sanitizeScriptText(b.calendarMonth).slice(0, 18) : undefined,
      calendarYear: b.calendarYear ? sanitizeScriptText(b.calendarYear).slice(0, 8) : undefined,
      calendarDaysMarked: Array.isArray(b.calendarDaysMarked)
        ? b.calendarDaysMarked.map(Number).filter((n) => Number.isFinite(n) && n >= 1 && n <= 31).slice(0, 10)
        : undefined,
      calendarHighlightDay:
        typeof b.calendarHighlightDay === 'number' ? Math.max(1, Math.min(31, Math.round(b.calendarHighlightDay))) : undefined,
      calendarNote: b.calendarNote ? sanitizeScriptText(b.calendarNote).slice(0, 48) : undefined,
      barrierBadge: b.barrierBadge ? sanitizeScriptText(b.barrierBadge).toUpperCase().slice(0, 22) : undefined,
      barrierRuleText: b.barrierRuleText ? sanitizeScriptText(b.barrierRuleText).slice(0, 84) : undefined,
      compressorFrom: b.compressorFrom ? sanitizeScriptText(b.compressorFrom).slice(0, 16) : undefined,
      compressorTo: b.compressorTo ? sanitizeScriptText(b.compressorTo).slice(0, 16) : undefined,
      compressorUnitLabel: b.compressorUnitLabel ? sanitizeScriptText(b.compressorUnitLabel).slice(0, 28) : undefined,
      mindmapCenter: b.mindmapCenter ? sanitizeScriptText(b.mindmapCenter).slice(0, 26) : undefined,
      mindmapNodes: Array.isArray(b.mindmapNodes)
        ? b.mindmapNodes
            .filter((n) => n && n.label)
            .map((n) => ({
              label: sanitizeScriptText(String(n.label)).slice(0, 28),
              detail: n.detail ? sanitizeScriptText(String(n.detail)).slice(0, 32) : undefined,
            }))
            .slice(0, 5)
        : undefined,
      auditRows: Array.isArray(b.auditRows)
        ? b.auditRows
            .filter((r) => r && r.label && r.badge)
            .map((r) => ({
              label: sanitizeScriptText(String(r.label)).slice(0, 32),
              detail: sanitizeScriptText(String(r.detail || '')).slice(0, 38),
              status: cleanStatus(r.status),
              badge: sanitizeScriptText(String(r.badge)).slice(0, 16),
            }))
            .slice(0, 4)
        : undefined,
      profileCards: Array.isArray(b.profileCards)
        ? b.profileCards
            .filter((p) => p && p.name && p.metric)
            .map((p) => ({
              name: sanitizeScriptText(String(p.name)).slice(0, 24),
              role: sanitizeScriptText(String(p.role || '')).slice(0, 28),
              metric: sanitizeScriptText(String(p.metric)).slice(0, 16),
              quote: sanitizeScriptText(String(p.quote || '')).slice(0, 56),
            }))
            .slice(0, 3)
        : undefined,
      notifCount: b.notifCount ? sanitizeScriptText(b.notifCount).slice(0, 12) : undefined,
      notifItems: Array.isArray(b.notifItems)
        ? b.notifItems
            .filter((ni) => ni && ni.sender && ni.message)
            .map((ni) => ({
              sender: sanitizeScriptText(String(ni.sender)).slice(0, 24),
              message: sanitizeScriptText(String(ni.message)).slice(0, 52),
              time: ni.time ? sanitizeScriptText(String(ni.time)).slice(0, 12) : undefined,
            }))
            .slice(0, 3)
        : undefined,
      quotaActualLabel: b.quotaActualLabel ? sanitizeScriptText(b.quotaActualLabel).slice(0, 28) : undefined,
      quotaPlannedLabel: b.quotaPlannedLabel ? sanitizeScriptText(b.quotaPlannedLabel).slice(0, 28) : undefined,
      quotaBars: Array.isArray(b.quotaBars)
        ? b.quotaBars
            .filter((qb) => qb && qb.label && Number.isFinite(Number(qb.pct)))
            .map((qb) => ({
              label: sanitizeScriptText(String(qb.label)).slice(0, 14),
              pct: Math.max(5, Math.min(100, Math.round(Number(qb.pct)))),
            }))
            .slice(0, 5)
        : undefined,
      globeOrigin: b.globeOrigin ? sanitizeScriptText(b.globeOrigin).slice(0, 24) : undefined,
      globeDestinations: Array.isArray(b.globeDestinations)
        ? b.globeDestinations
            .filter((gd) => gd && gd.label && gd.value)
            .map((gd) => ({
              label: sanitizeScriptText(String(gd.label)).slice(0, 24),
              value: sanitizeScriptText(String(gd.value)).slice(0, 18),
            }))
            .slice(0, 4)
        : undefined,
      sfxKind: meta?.defaultSfx || 'tap',
    };
  });

  const normalizedHashtags = Array.isArray(rawPlan.hashtags)
    ? rawPlan.hashtags
        .map((h) => sanitizeScriptText(String(h || '')).trim())
        .filter(Boolean)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
        .slice(0, 5)
    : [];

  return {
    hookText: humanizeFrenchScript(sanitizeScriptText(beats[0]?.spokenLine || rawPlan.hookText || '')).cleaned,
    hookVariants,
    youtubeTitle: humanizeFrenchScript(sanitizeScriptText(rawPlan.youtubeTitle || item.theme)).cleaned.slice(0, 60),
    caption: humanizeFrenchScript(sanitizeScriptText(rawPlan.caption || item.theme)).cleaned,
    hashtags: normalizedHashtags.length > 0 ? normalizedHashtags : ['#decryptage', '#actualite', '#france', '#shorts'],
    beats,
  };
}

function buildUniversalPrimitivesPromptGuide(isDev: boolean): string {
  const usable = UNIVERSAL_PRIMITIVES_CATALOG.filter((p) => isDev || !p.devOnly);
  return usable
    .map((p) => `- "${p.id}" (${p.label}, préféré: ${p.preferLayout}) -> ${p.useCase}`)
    .join('\n');
}

function buildGeminiScriptResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      hookText: { type: Type.STRING },
      hookVariants: { type: Type.ARRAY, items: { type: Type.STRING } },
      youtubeTitle: { type: Type.STRING },
      caption: { type: Type.STRING },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      beats: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            highlightWord: { type: Type.STRING },
            strikeWord: { type: Type.STRING },
            shortLabel: { type: Type.STRING },
            screenLabel: { type: Type.STRING },
            spokenLine: { type: Type.STRING },
            visualType: { type: Type.STRING },
            layoutHint: { type: Type.STRING },
            visualQuery: { type: Type.STRING },
            stampWord: { type: Type.STRING },
            statValue: { type: Type.STRING },
            statLabel: { type: Type.STRING },
            sourceLabel: { type: Type.STRING },
            quoteText: { type: Type.STRING },
            quoteHighlight: { type: Type.STRING },
            beforeBadText: { type: Type.STRING },
            afterGoodText: { type: Type.STRING },
            leftCard: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                sub: { type: Type.STRING },
              },
            },
            rightCard: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                sub: { type: Type.STRING },
              },
            },
            comparisonLeft: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                ratio: { type: Type.NUMBER },
              },
            },
            comparisonRight: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING },
                ratio: { type: Type.NUMBER },
              },
            },
            multiplierBadge: { type: Type.STRING },
            gaugePct: { type: Type.INTEGER },
            matrixHighlightPct: { type: Type.INTEGER },
            matrixCalloutLabel: { type: Type.STRING },
            bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            chartUnit: { type: Type.STRING },
            chartPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  highlight: { type: Type.BOOLEAN },
                },
              },
            },
            dialKnobs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.INTEGER },
                  unit: { type: Type.STRING },
                  active: { type: Type.BOOLEAN },
                },
              },
            },
            terminalCmd: { type: Type.STRING },
            terminalOut: { type: Type.ARRAY, items: { type: Type.STRING } },
            fanCards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tag: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
              },
            },
            receiptItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  highlight: { type: Type.BOOLEAN },
                  tone: { type: Type.STRING },
                },
              },
            },
            receiptTotalLabel: { type: Type.STRING },
            receiptTotalValue: { type: Type.STRING },
            calendarMonth: { type: Type.STRING },
            calendarYear: { type: Type.STRING },
            calendarDaysMarked: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            calendarHighlightDay: { type: Type.INTEGER },
            calendarNote: { type: Type.STRING },
            barrierBadge: { type: Type.STRING },
            barrierRuleText: { type: Type.STRING },
            compressorFrom: { type: Type.STRING },
            compressorTo: { type: Type.STRING },
            compressorUnitLabel: { type: Type.STRING },
            mindmapCenter: { type: Type.STRING },
            mindmapNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  detail: { type: Type.STRING },
                },
              },
            },
            auditRows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  detail: { type: Type.STRING },
                  status: { type: Type.STRING },
                  badge: { type: Type.STRING },
                },
              },
            },
            profileCards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  quote: { type: Type.STRING },
                },
              },
            },
            notifCount: { type: Type.STRING },
            notifItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sender: { type: Type.STRING },
                  message: { type: Type.STRING },
                  time: { type: Type.STRING },
                },
              },
            },
            quotaActualLabel: { type: Type.STRING },
            quotaPlannedLabel: { type: Type.STRING },
            quotaBars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  pct: { type: Type.INTEGER },
                },
              },
            },
            globeOrigin: { type: Type.STRING },
            globeDestinations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
              },
            },
          },
          required: ['title', 'highlightWord', 'shortLabel', 'spokenLine', 'visualType', 'layoutHint'],
        },
      },
    },
    required: ['hookText', 'hookVariants', 'youtubeTitle', 'caption', 'hashtags', 'beats'],
  };
}

/**
 * Generates a 100% bespoke Short script + visual storyboard strictly validated against the 22 universal
 * Melvynx primitives. Retries up to 2 times if Gemini output is malformed or incomplete; NEVER falls back
 * silently to hardcoded presets or cross-topic demo copy.
 */
export async function generateScriptForBatchItem(
  item: Pick<BatchJobItem, 'theme' | 'category' | 'angle' | 'hookHint' | 'sources'> & {
    variationIndex?: number;
    batchCooldownIds?: Set<string>;
  }
): Promise<{
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  archetypeLabel: string;
  generatedBy: 'gemini';
  beats: BatchBeatSpec[];
}> {
  const ai = createGeminiClient();
  const isDev = isDevOrCodeTopic(item.category, item.theme);

  let branding = resolveChannelCtaProfile();
  try {
    const kit = getChannelBrandingKit();
    branding = resolveChannelCtaProfile({
      handle: kit.handle,
      brandName: kit.brandName,
      tagline: kit.tagline,
    });
  } catch {
    // Keep clean neutral default if branding file isn't present yet
  }

  const primitivesGuide = buildUniversalPrimitivesPromptGuide(isDev);
  const basePrompt = [
    `Tu es le Directeur Artistique et Scénariste d'une chaîne française YouTube Shorts / Reels / TikTok style @melvynxdev (montage motion design éditorial, rythme sec, 42–54 secondes).`,
    `SUJET EXACT À TRAITER (100 % sur mesure, zéro contenu générique) :`,
    `- Thème : "${item.theme}"`,
    `- Catégorie : ${item.category}`,
    item.angle ? `- Angle éditorial : ${item.angle}` : '',
    item.hookHint ? `- Piste de hook : ${item.hookHint}` : '',
    item.sources ? `- Sources : ${item.sources}` : '',
    `- Compte chaîne : ${branding.handle} (${branding.tagline})`,
    ``,
    `PRIMITIVES VISUELLES DISPONIBLES (choisis LIBREMENT les plus adaptées au sens de chaque phrase — INTERDICTION de répéter deux fois la même primitive sur les beats 1 à 7) :`,
    primitivesGuide,
    `- "channel_end_cta" : EXCLUSIVEMENT pour le dernier beat (Beat 8).`,
    ``,
    `RÈGLES DE STRUCTURE & DE QUALITÉ STRICTES :`,
    `1. GÉNÈRE D'ABORD "hookVariants" : exactement 3 variantes de hook parlé (< 15 mots chacune) sur des angles distincts (paradoxe, chiffre choc daté, erreur coûteuse). Zéro salut/intro ("dans cette vidéo", "bonjour").`,
    `2. Écris exactement 8 beats (Beats 1 à 7 = narration + preuve visuelle, Beat 8 = CTA d'abonnement/cloche sur ${branding.handle} avec boucle logique vers le Beat 1, sans JAMAIS demander de commentaire).`,
    `3. Longueur totale : 95 à 145 mots parlés au total. Chaque "spokenLine" fait 10 à 18 mots en français oral naturel, concret et chiffré.`,
    `4. Titre visuel façon @melvynxdev sur CHAQUE beat : "title" (2 à 5 mots, max 36 caractères, JAMAIS tronqué) + "highlightWord" (EXACTEMENT 1 mot ou expression courte présente dans "title" qui sera affichée en pastille bleue #007AFF).`,
    `5. Re-hook géométrique obligatoire : varie librement "layoutHint" entre "split" (visuel haut + B-roll photo plein cadre en bas) et "fullscreen" (au moins 2 beats en "fullscreen" au milieu de la vidéo pour les schémas riches comme audit_table_detector, scrolling_checklist_spotlight, balance_scale_duel, animated_data_chart, hydraulic_compressor, radial_mindmap_hub, segmented_quota_slider, split_comparison_window, before_after_morph, editorial_evidence_board). Beats 1 et 8 en "split".`,
    `6. REMPLIS IMPÉRATIVEMENT les champs concrets spécifiques à la primitive choisie pour chaque beat (100 % liés au sujet "${item.theme}") :`,
    `   - metric_shock_hook -> statValue, statLabel, stampWord`,
    `   - dot_population_scale -> matrixHighlightPct (1..98), matrixCalloutLabel`,
    `   - paper_receipt_payslip -> receiptItems (3..5 lignes {label, amount, highlight, tone}), receiptTotalLabel, receiptTotalValue`,
    `   - countdown_calendar_stamp -> calendarMonth, calendarYear, calendarDaysMarked, calendarHighlightDay, calendarNote, stampWord`,
    `   - balance_scale_duel -> leftCard {label, value, sub}, rightCard {label, value, sub}`,
    `   - trap_barrier_alert -> barrierBadge, barrierRuleText, bullets`,
    `   - hydraulic_compressor -> compressorFrom, compressorTo, compressorUnitLabel`,
    `   - scrolling_checklist_spotlight -> bullets (3..5 règles/signes concrets)`,
    `   - radial_mindmap_hub -> mindmapCenter, mindmapNodes (3..5 {label, detail})`,
    `   - audit_table_detector -> auditRows (3..4 {label, detail, status: 'alert'|'ok'|'removed', badge})`,
    `   - profile_objection_deck -> profileCards (2..3 {name, role, metric, quote})`,
    `   - notification_explosion_stamp -> notifCount, notifItems (2..3 {sender, message, time}), stampWord`,
    `   - segmented_quota_slider -> quotaActualLabel, quotaPlannedLabel, gaugePct, quotaBars`,
    `   - hand_drawn_marker_highlight -> quoteText, quoteHighlight, sourceLabel`,
    `   - before_after_morph -> beforeBadText, afterGoodText`,
    `   - animated_data_chart -> chartUnit, chartPoints (4..5 {label, value, highlight})`,
    `   - split_comparison_window -> comparisonLeft {label, value, ratio}, comparisonRight {label, value, ratio}, multiplierBadge`,
    `   - process_pipeline -> steps (3..4 étapes)`,
    isDev ? `   - terminal_chat_window -> terminalCmd, terminalOut (2..4 lignes)` : '',
    `   - rotary_control_deck -> dialKnobs (3 {label, value, unit, active})`,
    `   - globe_network_flow -> globeOrigin, globeDestinations (2..4 {label, value})`,
    `   - editorial_evidence_board -> fanCards (3 {tag, metric, label})`,
    `   - channel_end_cta -> statValue="${branding.handle}", statLabel="${branding.tagline}"`,
    `7. Renseigne aussi "visualQuery" (2-4 mots décrivant la scène photo idéale en bas, ex: "bistrot cuisine addition", "fiche paie salaire france").`,
    `8. INTERDICTIONS : zéro tiret cadratin (—), zéro cliché ("révolutionnaire", "incontournable", "plongeons dans"), zéro étiquette méta bidon.${!isDev ? ' Sujet non technique : interdit de mentionner terminal/code/CLI/GitHub !' : ''}`,
  ]
    .filter(Boolean)
    .join('\n');

  let lastErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_GEMINI_REPAIR_RETRIES; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : [
            basePrompt,
            ``,
            `CORRECTION OBLIGATOIRE (tentative précédente rejetée pour erreurs de schéma) :`,
            ...lastErrors.map((e) => `- ${e}`),
            `Corrige TOUS ces points dans ta réponse JSON stricte.`,
          ].join('\n');

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: buildGeminiScriptResponseSchema(),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout Gemini (${GEMINI_SCRIPT_TIMEOUT_MS / 1000}s)`)), GEMINI_SCRIPT_TIMEOUT_MS)
        ),
      ]);

      const rawText = (response.text || '{}')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '');
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const rawPlan = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as RawGeminiPlan;

      const normalized = normalizeGeminiPlanToBeats(
        rawPlan,
        item,
        branding.handle,
        branding.tagline,
        isDev
      );

      const validation = validateFullShortPlan(
        {
          hookText: normalized.hookText,
          hookVariants: normalized.hookVariants,
          beats: normalized.beats,
        },
        { isDevTopic: isDev }
      );

      if (validation.valid) {
        const mediaPicks = selectBottomMediaForShort({
          beats: normalized.beats,
          category: item.category,
          theme: item.theme,
          batchCooldownIds: item.batchCooldownIds,
        });

        // Optionally enrich split beats that define bespoke visualQuery via local bright-image cache
        const usedQueryHashes = new Set<string>();
        const cachedUrlsPerBeat = await Promise.all(
          normalized.beats.map(async (b, bIdx) => {
            const layout = resolveBeatLayout(b, bIdx, normalized.beats.length);
            if (layout === 'fullscreen' || !b.visualQuery || bIdx === normalized.beats.length - 1) {
              return undefined;
            }
            const cached = await resolveAndCacheVisualQuery(b.visualQuery, usedQueryHashes).catch(() => null);
            return cached ? [cached] : undefined;
          })
        );

        const enrichedBeats: BatchBeatSpec[] = normalized.beats.map((b, bIdx) => {
          const pick = mediaPicks[bIdx];
          if (!pick) return b;
          pick.subBrollKeys.forEach((id) => item.batchCooldownIds?.add(id));
          return {
            ...b,
            brollKey: pick.primaryId,
            subBrollKeys: pick.subBrollKeys,
            subBrollUrls: cachedUrlsPerBeat[bIdx],
            brollCaption: pick.caption,
          };
        });

        return {
          hookText: normalized.hookText,
          youtubeTitle: normalized.youtubeTitle,
          caption: normalized.caption,
          hashtags: normalized.hashtags,
          archetypeLabel: 'Melvynx Universel IA',
          generatedBy: 'gemini',
          beats: enrichedBeats,
        };
      }

      lastErrors = validation.errors;
    } catch (err) {
      lastErrors = [err instanceof Error ? err.message : 'Erreur parsing JSON Gemini'];
    }
  }

  throw new Error(
    `Échec génération Gemini pour "${item.theme}" après ${MAX_GEMINI_REPAIR_RETRIES + 1} tentatives: ${lastErrors.slice(0, 3).join(' | ')}`
  );
}

export async function synthesizeVoiceoverForProject(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename?: string;
}): Promise<{
  providerUsed?: string;
  voiceUsed?: string;
  voiceMp3Path?: string;
  audioTrackUrl?: string;
  words: WhisperWord[];
  durationSec: number;
}> {
  return synthesizeVoiceoverUnified(params);
}

function buildUniqueProjectIdentifiers(baseTitle: string, existingProjects: ShortProject[]) {
  const existingSlugs = new Set(existingProjects.map((p) => p.slug));
  const existingIds = new Set(existingProjects.map((p) => p.id));

  let baseSlug = normalizeSlug(baseTitle).slice(0, 40) || `short-${Date.now()}`;
  if (baseSlug.length < 3) baseSlug = `short-${Date.now()}`;

  let slug = baseSlug;
  let n = 2;
  while (existingSlugs.has(slug) || existingIds.has(`proj-${slug}`)) {
    slug = `${baseSlug.slice(0, 35)}-${n}`;
    n += 1;
  }

  return {
    id: `proj-${slug}`,
    slug,
  };
}

async function runBatchPipeline(batchId: string, req: StartBatchRequest, port: number) {
  let job = getBatchJob(batchId);
  if (!job) return;

  const scheduleSlots =
    req.autoSchedule?.enabled && req.autoSchedule.platforms.length > 0
      ? computeStaggeredScheduleSlots(
          job.items.length,
          req.autoSchedule.startAtIso,
          req.autoSchedule.intervalHours
        )
      : [];

  const lookPreset = LOOK_PRESETS[req.lookId] || LOOK_PRESETS.papier;
  const batchCooldownIds = new Set<string>();

  for (let i = 0; i < job.items.length; i++) {
    if (activeCancelledBatchIds.has(batchId)) {
      for (let k = i; k < job.items.length; k++) {
        job.items[k] = {
          ...job.items[k],
          step: 'cancelled',
          completedAt: new Date().toISOString(),
        };
      }
      job.status = 'cancelled';
      job.currentStepLabel = 'Lot annulé par l’utilisateur';
      job.completedAt = new Date().toISOString();
      job = saveBatchJob(job);
      return;
    }

    const item = job.items[i];
    try {
      // 1. Scripting strictly via Gemini (isolated per item — zero fallback leakage)
      job.items[i] = {
        ...item,
        step: 'scripting',
        progress: 12,
        startedAt: new Date().toISOString(),
      };
      job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Écriture & storyboard IA`;
      job = saveBatchJob(job);

      const script = await generateScriptForBatchItem({
        ...job.items[i],
        variationIndex: i,
        batchCooldownIds,
      });

      if (activeCancelledBatchIds.has(batchId)) continue;

      // 2. Beat-by-beat Voiceover Synthesis (1.10x natural + French normalizer + exact durations)
      job.items[i] = {
        ...job.items[i],
        step: 'voiceover',
        progress: 34,
      };
      job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Voix FR beat par beat`;
      job = saveBatchJob(job);

      const existing = getAllProjects();
      const { id: projectId, slug } = buildUniqueProjectIdentifiers(item.theme, existing);
      const projectDir = path.join(PROJECTS_DIR, projectId);
      fs.mkdirSync(projectDir, { recursive: true });

      const clampedSpeed = Math.min(1.25, Math.max(0.95, Number(req.speed) || 1.10));
      const voice = await synthesizeVoiceoverByBeats({
        projectDir,
        beats: script.beats.map((b) => ({ id: b.id, spokenLine: b.spokenLine })),
        speed: clampedSpeed,
      });

      const timed = buildTimedProjectFromBeatAudios({
        beatsSpec: script.beats,
        beatWindows: voice.beatWindows,
        words: voice.words,
        totalDurationSec: voice.durationSec,
      });

      const layoutTrack: ShortProject['layoutTrack'] = timed.beats.map((b, bIdx) => ({
        id: `layout-${b.id}`,
        layout: resolveBeatLayout(b, bIdx, timed.beats.length),
        start: b.from,
        end: b.to,
      }));

      const project: ShortProject = {
        id: projectId,
        slug,
        title: sanitizeScriptText(item.theme),
        topicId: item.topicId,
        topicCategory: item.category,
        hookText: script.hookText,
        mode: 'faceless_explainer',
        platform: 'youtube_shorts',
        status: req.renderMp4 ? 'rendering' : 'ready',
        duration: timed.durationSec,
        fps: 25,
        resolution: { width: 1080, height: 1920 },
        audioTrackUrl: voice.audioTrackUrl,
        voiceProvider: voice.providerUsed,
        currentVersion: 'v1',
        versions: [
          {
            version: 'v1',
            createdAt: new Date().toISOString(),
            status: req.renderMp4 ? 'rendering' : 'done',
            duration: timed.durationSec,
            fps: 25,
            notes: `${script.archetypeLabel} · Look ${lookPreset.label}`,
            audioTrackUrl: voice.audioTrackUrl,
          },
        ],
        transcript: voice.words,
        motionTrack: timed.motionTrack,
        layoutTrack,
        sfxTrack: timed.sfxTrack,
        musicTrack: {
          trackName: req.musicTrack || 'upbeat',
          volume: 0.24,
          ducking: true,
        },
        feedbacks: [],
        motionComponents: {},
        contactSheet: [],
        editSpec: {
          lookId: req.lookId,
          speed: clampedSpeed,
          hookText: script.hookText,
          sources: item.sources || '',
          youtubeTitle: script.youtubeTitle,
          caption: script.caption,
          hashtags: script.hashtags,
          beats: timed.beats,
        },
        styleProfile: {
          name: lookPreset.label,
          fontFamily: lookPreset.fontDisplay.replace(/['"]/g, '').split(',')[0] || 'Bricolage Grotesque',
          accentColor: lookPreset.accent,
          textColor: lookPreset.ink,
          cardBg: lookPreset.sheet,
          captionsPosition: 'bottom',
          visualBeatsTarget: timed.beats.length,
        },
      };

      const qualityAudit = auditShortQuality(project);
      if (!qualityAudit.passed) {
        console.warn(`[quality-gate] ${project.slug}: ${qualityAudit.issues.join(' | ')}`);
      }
      saveProject(project);

      if (item.topicId) {
        try {
          updateTopicStatus(ROOT_DIR, item.topicId, 'Produit');
        } catch {
          // non-fatal if CSV row changed
        }
      }

      job.items[i] = {
        ...job.items[i],
        projectId: project.id,
        projectSlug: project.slug,
        version: 'v1',
        duration: timed.durationSec,
        beatsCount: timed.beats.length,
        progress: 50,
      };
      job = saveBatchJob(job);

      // 3. Render real 1080x1920 MP4
      if (req.renderMp4) {
        if (activeCancelledBatchIds.has(batchId)) continue;
        job.items[i] = {
          ...job.items[i],
          step: 'rendering',
          progress: 55,
        };
        job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Rendu MP4 1080×1920`;
        job = saveBatchJob(job);

        const rendered = await renderDynamicProjectToMp4({
          project,
          version: 'v1',
          lookId: req.lookId,
          port,
          voiceMp3Path: voice.voiceMp3Path,
          onProgress: (renderPct) => {
            const latest = getBatchJob(batchId);
            if (!latest) return;
            latest.items[i] = {
              ...latest.items[i],
              progress: Math.min(92, 52 + Math.round(renderPct * 0.4)),
            };
            saveBatchJob(latest);
          },
        });

        project.status = 'ready';
        project.duration = rendered.duration;
        project.versions[0] = {
          ...project.versions[0],
          status: 'done',
          duration: rendered.duration,
          outputMp4: rendered.outputMp4Url,
          contactSheetUrl: rendered.contactSheetUrl,
        };
        saveProject(project);

        job.items[i] = {
          ...job.items[i],
          duration: rendered.duration,
          outputMp4Url: rendered.outputMp4Url,
          thumbnailUrl: rendered.thumbnailUrl,
          progress: 92,
        };
        job = saveBatchJob(job);
      }

      // 4. Optional Auto-Schedule
      if (req.autoSchedule?.enabled && req.autoSchedule.platforms.length > 0 && scheduleSlots[i]) {
        job.items[i] = {
          ...job.items[i],
          step: 'scheduling',
          progress: 95,
        };
        job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Planification sociale`;
        job = saveBatchJob(job);

        const copy = await generateAiSocialCopy(project);
        const scheduledResult = await createScheduledPostsForProject({
          projectId: project.id,
          version: 'v1',
          platforms: req.autoSchedule.platforms,
          scheduledAt: scheduleSlots[i],
          youtubeTitle: copy.youtubeTitle || script.youtubeTitle,
          youtubeDescription: copy.youtubeDescription,
          caption: copy.caption || script.caption,
          tiktokCaption: copy.tiktokCaption,
          hashtags: copy.hashtags || script.hashtags,
          coverTimestampSec: copy.coverTimestampSec,
          privacy: req.autoSchedule.privacy || 'public',
        });

        job.items[i] = {
          ...job.items[i],
          scheduledCount: scheduledResult.jobs.length,
          scheduledAt: scheduleSlots[i],
        };
      }

      job.items[i] = {
        ...job.items[i],
        step: 'done',
        progress: 100,
        completedAt: new Date().toISOString(),
      };
      job.completedCount += 1;
      job = saveBatchJob(job);
      triggerAutoSyncInBackground(project.id);
    } catch (err) {
      job.items[i] = {
        ...job.items[i],
        step: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue pendant la génération',
        completedAt: new Date().toISOString(),
      };
      job.failedCount += 1;
      job = saveBatchJob(job);
    }
  }

  job.status =
    job.failedCount === 0
      ? 'completed'
      : job.completedCount > 0
        ? 'partial'
        : 'failed';
  job.currentStepLabel =
    job.status === 'completed'
      ? `Lot terminé · ${job.completedCount}/${job.totalCount} vidéos prêtes`
      : `Lot terminé avec ${job.failedCount} erreur(s)`;
  job.completedAt = new Date().toISOString();
  saveBatchJob(job);
}

export async function startBatchJob(
  req: StartBatchRequest,
  port: number
): Promise<BatchJobRecord> {
  ensureBatchDir();

  let selectedItems: Array<{
    topicId?: string;
    category: string;
    theme: string;
    angle?: string;
    hookHint?: string;
    sources?: string;
  }> = [];

  if (req.sourceMode === 'custom') {
    const parsed = parseBulkTopicsInput((req.customTopics || []).join('\n'), 12);
    if (parsed.length === 0) {
      throw new Error('Ajoutez au moins un sujet de vidéo (1 par ligne).');
    }
    selectedItems = parsed.map((p) => ({
      category: p.category,
      theme: p.theme,
      angle: p.angle,
    }));
  } else if (req.sourceMode === 'csv') {
    const { rows } = readTopicsCsv(ROOT_DIR);
    if (req.topicIds && req.topicIds.length > 0) {
      const idSet = new Set(req.topicIds);
      selectedItems = rows
        .filter((r) => idSet.has(r.id))
        .map((r) => ({
          topicId: r.id,
          category: r.categorie,
          theme: r.theme,
          angle: r.angle_viral_fr,
          hookHint: r.hook_propose,
          sources: r.sources,
        }));
    } else {
      const limit = Math.max(1, Math.min(10, req.count || 3));
      const pool = [...rows]
        .filter((r) => r.statut !== 'Produit')
        .sort((a, b) => {
          if (a.statut === 'Retenu (Choix IA)' && b.statut !== 'Retenu (Choix IA)') return -1;
          if (b.statut === 'Retenu (Choix IA)' && a.statut !== 'Retenu (Choix IA)') return 1;
          return computeCompositeViralScore(b) - computeCompositeViralScore(a);
        });
      selectedItems = pool.slice(0, limit).map((r) => ({
        topicId: r.id,
        category: r.categorie,
        theme: r.theme,
        angle: r.angle_viral_fr,
        hookHint: r.hook_propose,
        sources: r.sources,
      }));
    }
    if (selectedItems.length === 0) {
      throw new Error('Aucun sujet disponible dans le CSV. Utilisez Recherche IA ou Liste personnalisée.');
    }
  } else {
    selectedItems = await generateBatchTopicsWithGemini(req.count || 3, req.focus);
  }

  const batchId = `batch-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  const items: BatchJobItem[] = selectedItems.map((src, idx) => ({
    index: idx + 1,
    topicId: src.topicId,
    category: src.category,
    theme: src.theme,
    angle: src.angle,
    hookHint: src.hookHint,
    sources: src.sources,
    step: 'queued',
    progress: 0,
  }));

  const clampedSpeed = Math.min(1.25, Math.max(0.95, Number(req.speed) || 1.10));
  const job = saveBatchJob({
    id: batchId,
    status: 'running',
    sourceMode: req.sourceMode,
    lookId: req.lookId || 'papier',
    musicTrack: req.musicTrack || 'upbeat',
    speed: clampedSpeed,
    renderMp4: req.renderMp4 !== false,
    autoSchedule: req.autoSchedule,
    currentStepLabel: `Initialisation du lot (${items.length} vidéos)...`,
    totalCount: items.length,
    completedCount: 0,
    failedCount: 0,
    items,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  void runBatchPipeline(batchId, req, port);
  return job;
}

export function cancelBatchJob(batchId: string): BatchJobRecord {
  const job = getBatchJob(batchId);
  if (!job) {
    throw new Error(`Lot "${batchId}" introuvable.`);
  }
  activeCancelledBatchIds.add(batchId);
  return job;
}

export async function bulkScheduleBatchJob(
  batchId: string,
  config: Omit<BatchAutoScheduleConfig, 'enabled'>
): Promise<{ batch: BatchJobRecord; scheduledJobsCount: number }> {
  const job = getBatchJob(batchId);
  if (!job) {
    throw new Error(`Lot "${batchId}" introuvable.`);
  }
  const doneItems = job.items.filter((it) => it.step === 'done' && it.projectId);
  if (doneItems.length === 0) {
    throw new Error('Aucune vidéo terminée à programmer dans ce lot.');
  }
  const slots = computeStaggeredScheduleSlots(
    doneItems.length,
    config.startAtIso,
    config.intervalHours
  );

  let scheduledJobsCount = 0;
  for (let i = 0; i < doneItems.length; i++) {
    const item = doneItems[i];
    if (!item.projectId) continue;
    const result = await createScheduledPostsForProject({
      projectId: item.projectId,
      version: item.version || 'v1',
      platforms: config.platforms,
      scheduledAt: slots[i],
      privacy: config.privacy || 'public',
    });
    scheduledJobsCount += result.jobs.length;
    const idxInAll = job.items.findIndex((x) => x.index === item.index);
    if (idxInAll !== -1) {
      job.items[idxInAll] = {
        ...job.items[idxInAll],
        scheduledCount: (job.items[idxInAll].scheduledCount || 0) + result.jobs.length,
        scheduledAt: slots[i],
      };
    }
  }

  const saved = saveBatchJob(job);
  return { batch: saved, scheduledJobsCount };
}
