import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { LOOK_PRESETS } from '../data/shortSpec';
import {
  STORY_BLUEPRINTS,
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  parseBulkTopicsInput,
  resolveBeatLayout,
  sanitizeScriptText,
  selectStoryBlueprint,
  type ElevenLabsCharAlignment,
} from '../engine/batchShortBuilder';
import {
  ALL_BROLL_KEYS,
  getBrollSequenceForTopic,
  isDevOrCodeTopic,
} from '../engine/brollKeys';
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
  DynamicIconKind,
  DynamicVisualType,
  StartBatchRequest,
  StoryBlueprintId,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import {
  applyVoiceSpeedMp3,
  renderDynamicProjectToMp4,
} from './batchRenderer';
import { generateAiSocialCopy } from './socialPublisher';
import { createScheduledPostsForProject } from './socialRouter';
import {
  PROJECTS_DIR,
  ROOT_DIR,
  STORAGE_DIR,
  getAllProjects,
  saveProject,
} from './storageManager';
import { triggerAutoSyncInBackground } from './syncManager';

export const BATCH_JOBS_DIR = path.join(STORAGE_DIR, 'batch-jobs');

const DEFAULT_FREE_VOICE_ID = 'nPczCjzI2devNBz1zQrb';
const activeCancelledBatchIds = new Set<string>();
const activeRunningBatchIds = new Set<string>();

function ensureBatchDir() {
  if (!fs.existsSync(BATCH_JOBS_DIR)) {
    fs.mkdirSync(BATCH_JOBS_DIR, { recursive: true });
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} (${Math.round(timeoutMs / 1000)}s)`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function reconcileOrphanedRunningJob(job: BatchJobRecord): BatchJobRecord {
  if (job.status !== 'running' || activeRunningBatchIds.has(job.id)) {
    return job;
  }
  const updatedMs = Date.parse(job.updatedAt || job.createdAt || '');
  // Only mark orphaned if not actively running in this process and untouched for > 12s
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs < 12_000) {
    return job;
  }

  let changed = false;
  let failedCount = 0;
  let completedCount = 0;
  const nextItems = job.items.map((it) => {
    if (it.step === 'done') {
      completedCount += 1;
      return it;
    }
    if (it.step === 'error') {
      failedCount += 1;
      return it;
    }
    if (it.step === 'cancelled') return it;
    changed = true;
    failedCount += 1;
    return {
      ...it,
      step: 'error' as const,
      error: 'Lot interrompu par un redémarrage du serveur. Relancez la création.',
      completedAt: new Date().toISOString(),
    };
  });

  if (!changed) return job;

  const reconciled: BatchJobRecord = {
    ...job,
    status: completedCount > 0 ? 'partial' : 'failed',
    currentStepLabel: 'Lot interrompu (redémarrage serveur)',
    completedCount,
    failedCount,
    items: nextItems,
    completedAt: new Date().toISOString(),
  };
  return saveBatchJob(reconciled);
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
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8')) as BatchJobRecord;
    return reconcileOrphanedRunningJob(parsed);
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
      jobs.push(reconcileOrphanedRunningJob(parsed));
    } catch {
      // ignore corrupted file
    }
  }
  return jobs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
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

  if (!ai) {
    const unused = existingRows.filter((r) => r.statut !== 'Produit');
    if (unused.length >= safeCount) {
      return unused.slice(0, safeCount).map((r) => ({
        topicId: r.id,
        category: r.categorie,
        theme: r.theme,
        angle: r.angle_viral_fr,
        hookHint: r.hook_propose,
        sources: r.sources,
      }));
    }
    const baseTopic = focus?.trim() || 'Tech & Société';
    return Array.from({ length: safeCount }, (_, i) => ({
      category: 'Tech & Société',
      theme: `${baseTopic} · Décryptage #${i + 1}`,
      angle: `Analyse chiffrée et impact concret pour les Français en 2026.`,
    }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const existingList = existingRows.map((r) => `- ${r.theme}`).join('\n');
  const focusClause = focus?.trim()
    ? `Thématique ou niche demandée par le créateur : "${focus.trim()}".`
    : 'Varie les catégories entre IA, Actualité, Business, Politique, Conseils de vie et Tech & Société.';

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Tu es le stratège éditorial d'une chaîne française de YouTube Shorts / Reels / TikTok style @melvynxdev (ton analytique, direct, chiffré, 40-50s).`,
          `Date du jour : ${today}. ${focusClause}`,
          `Thèmes déjà produits ou listés (NE PAS RÉPÉTER) :\n${existingList || '(aucun)'}`,
          `Génère exactement ${safeCount} sujets distincts à très fort potentiel viral en France.`,
          `Zéro tiret cadratin (pas de —). Chaque hook_propose < 18 mots.`,
        ].join('\n\n'),
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      }),
      28_000,
      'Délai recherche sujets Gemini dépassé'
    );

    const parsed = JSON.parse(response.text || '[]') as Array<
      Omit<NewTopicCandidate, 'categorie' | 'plateformes_cibles'> & { categorie: string }
    >;

    if (Array.isArray(parsed) && parsed.length > 0) {
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
  } catch (err) {
    console.warn('Gemini batch topic research fallback:', err);
  }

  const fallbackUnused = existingRows.filter((r) => r.statut !== 'Produit');
  if (fallbackUnused.length > 0) {
    return fallbackUnused.slice(0, safeCount).map((r) => ({
      topicId: r.id,
      category: r.categorie,
      theme: r.theme,
      angle: r.angle_viral_fr,
      hookHint: r.hook_propose,
      sources: r.sources,
    }));
  }

  return Array.from({ length: safeCount }, (_, i) => ({
    category: 'Tech & Société',
    theme: `${focus?.trim() || 'Tendance France 2026'} · Épisode #${i + 1}`,
    angle: 'Décryptage chiffré et conséquences concrètes.',
  }));
}

export async function generateScriptForBatchItem(
  item: Pick<BatchJobItem, 'theme' | 'category' | 'angle' | 'hookHint' | 'sources' | 'blueprintId'>,
  batchIndex = 0
): Promise<{
  blueprintId: StoryBlueprintId;
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  beats: BatchBeatSpec[];
}> {
  const ai = createGeminiClient();
  const blueprint =
    item.blueprintId && STORY_BLUEPRINTS[item.blueprintId]
      ? STORY_BLUEPRINTS[item.blueprintId]
      : selectStoryBlueprint(item.category, item.theme, batchIndex);

  const fallback = buildFallbackBatchScript({
    theme: item.theme,
    category: item.category,
    angle: item.angle,
    hookHint: item.hookHint,
    sources: item.sources,
    blueprintId: blueprint.id,
    batchIndex,
  });

  if (!ai) return fallback;

  const isDev = isDevOrCodeTopic(item.category, item.theme);
  const recommendedBrolls = getBrollSequenceForTopic(item.category, item.theme);
  const brollListStr = ALL_BROLL_KEYS.join('", "');

  const blueprintLines = blueprint.beats.map((tpl, idx) => {
    const resolvedVt = tpl.visualType === 'terminal_flow' && !isDev ? 'ledger_breakdown' : tpl.visualType;
    const defaultBroll = idx === 7 ? 'studio' : recommendedBrolls[idx % recommendedBrolls.length];
    return `${idx + 1}. role="${tpl.role}" | visualType="${resolvedVt}" | layoutHint="${tpl.layoutHint}" | broll conseillé="${defaultBroll}" — Objectif narratif : ${tpl.goal}`;
  });

  try {
    const prompt = [
      `Tu es le directeur créatif et scénariste d'une chaîne française YouTube Shorts / Reels / TikTok ultra-dynamique (style @alex.decode / @melvynxdev, haute rétention, narration logique et fluide).`,
      `Sujet : "${item.theme}"`,
      `Catégorie : ${item.category}`,
      `Angle éditorial imposé pour cette vidéo : ${blueprint.label} (${blueprint.id})`,
      item.angle ? `Angle précis : ${item.angle}` : '',
      item.hookHint ? `Piste de hook : ${item.hookHint}` : '',
      item.sources ? `Sources : ${item.sources}` : '',
      `Écris un script complet de Short français de 105 à 130 mots parlés au total, découpé en EXACTEMENT 8 séquences chronologiques rapides (3 à 5 s chacune).`,
      `RÈGLES DE CHRONOLOGIE ET DE LOGIQUE STRICTES (TRÈS IMPORTANT) :`,
      `- Les 8 spokenLine doivent former UNE SEULE histoire continue, claire et logique du début à la fin (Contexte -> Mécanisme -> Re-hook -> Preuve -> Action -> Verdict -> CTA), avec des connecteurs naturels ("D'abord...", "Concrètement...", "Mais le vrai piège...", "Résultat...", "Pour agir dès maintenant...").`,
      `- INTERDICTION absolue d'inventer des chiffres hors-sujet ou génériques ("45 min vs 2 min", "14 h/sem", etc.). Chaque chiffre, comparaison, ligne de tableau ou toggle doit appartenir 100 % au sujet "${item.theme}".`,
      `- INTERDICTION absolue du tiret cadratin (—) et des banalités ("dans cette vidéo", "bonjour", "salut à tous").`,
      `- Chaque champ "title" affiché à l'écran DOIT faire MAXIMUM 4 à 5 mots percutants (jamais une phrase longue).`,
      `- NE PAS utiliser visualType="terminal_flow" sauf si le sujet concerne explicitement le code ou le développement logiciel.`,
      `- Varie brollKey à travers les séquences en choisissant parmi : "${brollListStr}" (privilégie pour ce sujet : ${recommendedBrolls.join(', ')}).`,
      `- iconKind obligatoire parmi : "ai", "calendar", "chart", "clock", "euro", "law", "lock", "rocket", "terminal", "phone", "shield", "warning".`,
      `STRUCTURE EXACTE DES 8 SÉQUENCES POUR CET ÉPISODE :`,
      ...blueprintLines,
      `Champs visuels requis selon chaque visualType :`,
      `- Pour les hooks (hook_shatter, hook_vs_battle, hook_myth_bust, hook_alert_card, hook_stat) : spokenLine <= 14 mots ! Remplis hookCards (3 cartes courtes {label, sub, tone: "dark"|"light"|"accent"}), statValue (<= 8 chars), statLabel, stampWord (1 mot majuscule), subStats (2 paires), et pour hook_alert_card remplis aussi quoteText + highlightPhrase.`,
      `- Pour counter_flip : statValue, statLabel, comparisonLeft & comparisonRight chiffrés sur le sujet (ratio 0.15..0.95).`,
      `- Pour comparison_bars : comparisonLeft & comparisonRight chiffrés sur le sujet, multiplierBadge (ex: "×3", "+240 €", "÷4"), statValue & statLabel.`,
      `- Pour timeline_steps : steps (4 étapes chronologiques courtes de 1 à 2 mots), stampWord.`,
      `- Pour gauge : gaugePct (25..96), statLabel, bullets (exactement 3 points concrets max 4 mots chacun).`,
      `- Pour toggles_switch : toggles (exactement 3 arbitrages {label, before, after, activeAfter}).`,
      `- Pour ledger_breakdown : ledgerRows (exactement 3 ou 4 lignes chiffrées {label, value, delta, highlight}), statValue & statLabel synthèse.`,
      `- Pour verdict_quote : quoteText (1 phrase punchy <= 16 mots), highlightPhrase (sous-chaîne exacte de quoteText à surligner), quoteSource, stampWord.`,
      `- Pour radar_pillars : bullets (3 critères clés max 4 mots), subStats (3 ou 2 paires score/critère), statLabel.`,
      `- Pour checklist_action : bullets (exactement 3 actions concrètes commençant par un verbe d'action), statValue & statLabel.`,
      `- Pour cta_card : brollKey="studio", statValue="@alex.decode", question liée au sujet.`,
    ]
      .filter(Boolean)
      .join('\n');

    let parsed: {
      hookText?: string;
      youtubeTitle?: string;
      caption?: string;
      hashtags?: string[];
      beats?: Array<Partial<BatchBeatSpec>>;
    } = {};

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  hookText: { type: Type.STRING },
                  youtubeTitle: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  beats: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        shortLabel: { type: Type.STRING },
                        screenLabel: { type: Type.STRING },
                        spokenLine: { type: Type.STRING },
                        visualType: { type: Type.STRING },
                        beatRole: { type: Type.STRING },
                        layoutHint: { type: Type.STRING },
                        brollKey: { type: Type.STRING },
                        brollCaption: { type: Type.STRING },
                        iconKind: { type: Type.STRING },
                        stampWord: { type: Type.STRING },
                        statValue: { type: Type.STRING },
                        statLabel: { type: Type.STRING },
                        hookCards: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              sub: { type: Type.STRING },
                              iconKind: { type: Type.STRING },
                              tone: { type: Type.STRING },
                            },
                          },
                        },
                        subStats: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              value: { type: Type.STRING },
                              label: { type: Type.STRING },
                            },
                          },
                        },
                        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        toggles: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              before: { type: Type.STRING },
                              after: { type: Type.STRING },
                              activeAfter: { type: Type.BOOLEAN },
                            },
                          },
                        },
                        ledgerRows: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              value: { type: Type.STRING },
                              delta: { type: Type.STRING },
                              highlight: { type: Type.BOOLEAN },
                            },
                          },
                        },
                        quoteText: { type: Type.STRING },
                        highlightPhrase: { type: Type.STRING },
                        quoteSource: { type: Type.STRING },
                        terminalCmd: { type: Type.STRING },
                        terminalOut: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                      },
                      required: ['title', 'shortLabel', 'screenLabel', 'spokenLine', 'visualType'],
                    },
                  },
                },
                required: ['hookText', 'youtubeTitle', 'caption', 'hashtags', 'beats'],
              },
            },
          }),
          22_000,
          'Délai génération script Gemini dépassé'
        );

        const rawText = (response.text || '{}')
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/, '');
        const candidate = JSON.parse(rawText) as typeof parsed;
        if (Array.isArray(candidate.beats) && candidate.beats.length >= 6) {
          parsed = candidate;
          break;
        }
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        const isTimeout = /Délai|timeout/i.test(msg);
        if (attempt === 1 || isTimeout) {
          console.warn('Gemini batch script fallback:', msg);
          break;
        } else {
          console.warn('Gemini batch script retry:', msg);
        }
      }
    }

    if (!Array.isArray(parsed.beats) || parsed.beats.length < 6) {
      return fallback;
    }

    const validVisualTypes: DynamicVisualType[] = [
      'hook_shatter',
      'hook_stat',
      'hook_vs_battle',
      'hook_myth_bust',
      'hook_alert_card',
      'counter_flip',
      'comparison_bars',
      'timeline_steps',
      'toggles_switch',
      'terminal_flow',
      'ledger_breakdown',
      'verdict_quote',
      'radar_pillars',
      'checklist_action',
      'key_points',
      'gauge',
      'cta_card',
    ];
    const validIcons: DynamicIconKind[] = [
      'ai',
      'calendar',
      'chart',
      'clock',
      'euro',
      'law',
      'lock',
      'rocket',
      'terminal',
      'phone',
      'shield',
      'warning',
    ];
    const validBrolls = new Set<string>(ALL_BROLL_KEYS);

    const rawBeats = parsed.beats.slice(0, 8);
    const beats: BatchBeatSpec[] = rawBeats.map((b, idx) => {
      const fb = fallback.beats[idx % fallback.beats.length];
      const bpTpl = blueprint.beats[idx % blueprint.beats.length];
      let vt: DynamicVisualType =
        idx === 0
          ? validVisualTypes.includes(b.visualType as DynamicVisualType) &&
            String(b.visualType).startsWith('hook_')
            ? (b.visualType as DynamicVisualType)
            : blueprint.hookType
          : idx === rawBeats.length - 1
            ? 'cta_card'
            : validVisualTypes.includes(b.visualType as DynamicVisualType)
              ? (b.visualType as DynamicVisualType)
              : bpTpl.visualType;

      if (vt === 'terminal_flow' && !isDev) {
        vt = 'ledger_breakdown';
      }

      const sfxByVt: Partial<Record<DynamicVisualType, BatchBeatSpec['sfxKind']>> = {
        hook_shatter: 'glass-shatter',
        hook_myth_bust: 'glass-shatter',
        hook_vs_battle: 'impact-boom',
        hook_alert_card: 'bell',
        hook_stat: 'riser',
        counter_flip: 'thud',
        timeline_steps: 'tap',
        gauge: 'zhhh',
        comparison_bars: 'riser',
        ledger_breakdown: 'tap',
        verdict_quote: 'pop',
        radar_pillars: 'zhhh',
        checklist_action: 'tap',
        toggles_switch: 'tap',
        terminal_flow: 'pop',
        cta_card: 'pop-back',
      };

      const rawSpoken = sanitizeScriptText(b.spokenLine || fb.spokenLine);
      const spokenLine =
        idx === 0
          ? rawSpoken.split(/\s+/).filter(Boolean).slice(0, 15).join(' ')
          : rawSpoken;

      const iconKind = validIcons.includes(b.iconKind as DynamicIconKind)
        ? (b.iconKind as DynamicIconKind)
        : fb.iconKind;

      const brollKey = b.brollKey && validBrolls.has(b.brollKey) ? b.brollKey : fb.brollKey;
      const layoutHint =
        vt === 'gauge' || vt === 'comparison_bars' || vt === 'ledger_breakdown' || vt === 'radar_pillars'
          ? 'fullscreen'
          : b.layoutHint === 'fullscreen' || b.layoutHint === 'split'
            ? b.layoutHint
            : bpTpl.layoutHint || 'split';

      const cleanTitle = condenseVisualHeadline(b.title || fb.title, 5, 38);

      return {
        id: `beat-${idx + 1}`,
        blueprintId: blueprint.id,
        beatRole: bpTpl.role,
        title: cleanTitle,
        shortLabel: sanitizeScriptText(b.shortLabel || fb.shortLabel).slice(0, 22),
        screenLabel: sanitizeScriptText(b.screenLabel || fb.screenLabel).toUpperCase().slice(0, 32),
        spokenLine,
        visualType: vt,
        layoutHint,
        brollKey,
        brollCaption: sanitizeScriptText(b.brollCaption || fb.brollCaption || '').slice(0, 36) || undefined,
        iconKind,
        stampWord: b.stampWord ? sanitizeScriptText(b.stampWord).toUpperCase().slice(0, 14) : fb.stampWord,
        statValue: b.statValue ? sanitizeScriptText(b.statValue).slice(0, 16) : fb.statValue,
        statLabel: b.statLabel ? sanitizeScriptText(b.statLabel).slice(0, 44) : fb.statLabel,
        hookCards:
          Array.isArray(b.hookCards) && b.hookCards.length >= 2
            ? b.hookCards.slice(0, 3).map((hc, hcIdx) => ({
                label: condenseVisualHeadline(hc.label || 'Signal', 3, 18),
                sub: sanitizeScriptText(hc.sub || '').slice(0, 24),
                iconKind: validIcons.includes(hc.iconKind as DynamicIconKind)
                  ? (hc.iconKind as DynamicIconKind)
                  : iconKind,
                tone:
                  hc.tone === 'dark' || hc.tone === 'light' || hc.tone === 'accent'
                    ? hc.tone
                    : hcIdx === 0
                      ? 'dark'
                      : hcIdx === 1
                        ? 'light'
                        : 'accent',
              }))
            : fb.hookCards,
        subStats:
          Array.isArray(b.subStats) && b.subStats.length > 0
            ? b.subStats.slice(0, 3).map((s) => ({
                value: sanitizeScriptText(s.value || '').slice(0, 14),
                label: sanitizeScriptText(s.label || '').slice(0, 24),
              }))
            : fb.subStats,
        bullets:
          Array.isArray(b.bullets) && b.bullets.length > 0
            ? b.bullets.map((x) => condenseVisualHeadline(x, 5, 36)).slice(0, 3)
            : fb.bullets,
        steps:
          Array.isArray(b.steps) && b.steps.length > 0
            ? b.steps.map((x) => condenseVisualHeadline(x, 2, 18)).slice(0, 4)
            : fb.steps,
        toggles:
          Array.isArray(b.toggles) && b.toggles.length > 0
            ? b.toggles.slice(0, 3).map((t) => ({
                label: condenseVisualHeadline(t.label || 'Levier', 4, 30),
                before: sanitizeScriptText(t.before || 'OFF').toUpperCase().slice(0, 10),
                after: sanitizeScriptText(t.after || 'ON').toUpperCase().slice(0, 10),
                activeAfter: Boolean(t.activeAfter),
              }))
            : fb.toggles,
        ledgerRows:
          Array.isArray(b.ledgerRows) && b.ledgerRows.length > 0
            ? b.ledgerRows.slice(0, 4).map((r) => ({
                label: condenseVisualHeadline(r.label || 'Indicateur', 5, 38),
                value: sanitizeScriptText(r.value || '').slice(0, 16),
                delta: r.delta ? sanitizeScriptText(r.delta).slice(0, 22) : undefined,
                highlight: Boolean(r.highlight),
              }))
            : fb.ledgerRows,
        quoteText: b.quoteText ? sanitizeScriptText(b.quoteText).slice(0, 120) : fb.quoteText,
        highlightPhrase: b.highlightPhrase
          ? sanitizeScriptText(b.highlightPhrase).slice(0, 48)
          : fb.highlightPhrase,
        quoteSource: b.quoteSource ? sanitizeScriptText(b.quoteSource).slice(0, 36) : fb.quoteSource,
        terminalCmd:
          vt === 'terminal_flow'
            ? sanitizeScriptText(b.terminalCmd || fb.terminalCmd || '> audit --2026').slice(0, 40)
            : undefined,
        terminalOut:
          vt === 'terminal_flow'
            ? (Array.isArray(b.terminalOut) && b.terminalOut.length > 0
                ? b.terminalOut.map((l) => sanitizeScriptText(l).slice(0, 44)).slice(0, 3)
                : fb.terminalOut)
            : undefined,
        comparisonLeft: b.comparisonLeft
          ? {
              label: sanitizeScriptText(b.comparisonLeft.label || 'Avant').slice(0, 26),
              value: sanitizeScriptText(b.comparisonLeft.value || '').slice(0, 16) || 'Base',
              ratio: Math.max(0.12, Math.min(1, Number(b.comparisonLeft.ratio) || 0.82)),
            }
          : fb.comparisonLeft,
        comparisonRight: b.comparisonRight
          ? {
              label: sanitizeScriptText(b.comparisonRight.label || 'Après').slice(0, 26),
              value: sanitizeScriptText(b.comparisonRight.value || '').slice(0, 16) || 'Optimisé',
              ratio: Math.max(0.12, Math.min(1, Number(b.comparisonRight.ratio) || 0.28)),
            }
          : fb.comparisonRight,
        multiplierBadge: b.multiplierBadge
          ? sanitizeScriptText(b.multiplierBadge).slice(0, 10)
          : fb.multiplierBadge,
        gaugePct:
          typeof b.gaugePct === 'number'
            ? Math.max(20, Math.min(98, Math.round(b.gaugePct)))
            : fb.gaugePct,
        sfxKind: sfxByVt[vt] || 'tap',
      };
    });

    return {
      blueprintId: blueprint.id,
      hookText: sanitizeScriptText(parsed.hookText || beats[0].spokenLine),
      youtubeTitle: sanitizeScriptText(parsed.youtubeTitle || item.theme).slice(0, 58),
      caption: sanitizeScriptText(parsed.caption || fallback.caption),
      hashtags:
        Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
          ? parsed.hashtags.slice(0, 5)
          : fallback.hashtags,
      beats,
    };
  } catch (err) {
    console.warn('Gemini batch script fallback:', err);
    return fallback;
  }
}

export async function synthesizeVoiceoverForProject(params: {
  projectDir: string;
  fullText: string;
  speed: number;
  voiceFilename?: string;
}): Promise<{
  voiceMp3Path?: string;
  audioTrackUrl?: string;
  words: WhisperWord[];
  durationSec: number;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const cleanText = sanitizeScriptText(params.fullText).slice(0, 1500);
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const estDuration = Math.max(16, Math.round((wordCount / (2.55 * (params.speed || 1.0))) * 10) / 10);

  if (apiKey) {
    const requestedVoice =
      process.env.ELEVENLABS_VOICE_ID?.trim() &&
      /^[A-Za-z0-9]{15,32}$/.test(process.env.ELEVENLABS_VOICE_ID.trim())
        ? process.env.ELEVENLABS_VOICE_ID.trim()
        : DEFAULT_FREE_VOICE_ID;

    const callTts = (vId: string) =>
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}/with-timestamps`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.44,
            similarity_boost: 0.78,
            style: 0.22,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      });

    try {
      let res = await callTts(requestedVoice);
      if ((res.status === 402 || res.status === 404) && requestedVoice !== DEFAULT_FREE_VOICE_ID) {
        res = await callTts(DEFAULT_FREE_VOICE_ID);
      }

      if (res.ok) {
        const data = (await res.json()) as {
          audio_base64?: string;
          normalized_alignment?: ElevenLabsCharAlignment;
          alignment?: ElevenLabsCharAlignment;
        };
        if (data.audio_base64) {
          fs.mkdirSync(params.projectDir, { recursive: true });
          const voiceFile = params.voiceFilename || 'voice.mp3';
          const rawMp3Path = path.join(params.projectDir, `raw-${voiceFile}`);
          const voiceMp3Path = path.join(params.projectDir, voiceFile);
          fs.writeFileSync(rawMp3Path, Buffer.from(data.audio_base64, 'base64'));

          const actualDuration = applyVoiceSpeedMp3(rawMp3Path, voiceMp3Path, params.speed);
          fs.rmSync(rawMp3Path, { force: true });

          const alignment = data.normalized_alignment || data.alignment;
          const { words } = alignmentToWords(alignment, cleanText, params.speed, actualDuration);

          const finalDuration = Number(Math.max(actualDuration + 0.5, words.length ? words[words.length - 1].end + 0.6 : actualDuration).toFixed(2));
          return {
            voiceMp3Path,
            audioTrackUrl: `/storage/projects/${path.basename(params.projectDir)}/${voiceFile}`,
            words,
            durationSec: finalDuration,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`ElevenLabs TTS failed (${res.status}):`, errText.slice(0, 300));
      }
    } catch (err) {
      console.warn('ElevenLabs TTS exception:', err);
    }
  }

  const { words, durationSec } = alignmentToWords(null, cleanText, params.speed, estDuration);
  return {
    words,
    durationSec,
  };
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
  activeRunningBatchIds.add(batchId);
  try {
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
        // 1. Scripting (with strict 28s timeout so it can never freeze at 12%)
        job.items[i] = {
          ...item,
          step: 'scripting',
          progress: 12,
          startedAt: new Date().toISOString(),
        };
        job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Écriture du script IA`;
        job = saveBatchJob(job);

        const script = await generateScriptForBatchItem(job.items[i], i);
        const fullSpokenText = script.beats.map((b) => b.spokenLine).join(' ');

        if (activeCancelledBatchIds.has(batchId)) continue;

        // 2. Voiceover ElevenLabs
        job.items[i] = {
          ...job.items[i],
          blueprintId: script.blueprintId,
          step: 'voiceover',
          progress: 34,
        };
        job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Synthèse vocale FR`;
        job = saveBatchJob(job);

        const existing = getAllProjects();
        const { id: projectId, slug } = buildUniqueProjectIdentifiers(item.theme, existing);
        const projectDir = path.join(PROJECTS_DIR, projectId);
        fs.mkdirSync(projectDir, { recursive: true });

        const clampedSpeed = Math.min(1.06, Math.max(0.95, Number(req.speed) || 1.05));
        const voice = await synthesizeVoiceoverForProject({
          projectDir,
          fullText: fullSpokenText,
          speed: clampedSpeed,
        });

        const timed = assignBeatTimingsAndTranscript(
          script.beats,
          voice.words,
          voice.durationSec
        );

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
          currentVersion: 'v1',
          versions: [
            {
              version: 'v1',
              createdAt: new Date().toISOString(),
              status: req.renderMp4 ? 'rendering' : 'done',
              duration: timed.durationSec,
              fps: 25,
              notes: `Créé en masse · ${STORY_BLUEPRINTS[script.blueprintId]?.label || script.blueprintId} · Look ${lookPreset.label}`,
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
            blueprintId: script.blueprintId,
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
          blueprintId: script.blueprintId,
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

          const rendered = await withTimeout(
            renderDynamicProjectToMp4({
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
            }),
            240_000,
            'Délai rendu MP4 1080×1920 dépassé'
          );

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
  } finally {
    activeRunningBatchIds.delete(batchId);
  }
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
      throw new Error('Aucun sujet disponible dans le CSV. Utilisez Recherche IA ou Liste libre.');
    }
  } else {
    selectedItems = await generateBatchTopicsWithGemini(req.count || 3, req.focus);
  }

  const batchId = `batch-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  const usedBlueprintIds = new Set<StoryBlueprintId>();
  const items: BatchJobItem[] = selectedItems.map((src, idx) => {
    if (usedBlueprintIds.size >= Object.keys(STORY_BLUEPRINTS).length) {
      usedBlueprintIds.clear();
    }
    const bp = selectStoryBlueprint(src.category, src.theme, idx, usedBlueprintIds);
    usedBlueprintIds.add(bp.id);
    return {
      index: idx + 1,
      topicId: src.topicId,
      category: src.category,
      theme: src.theme,
      angle: src.angle,
      hookHint: src.hookHint,
      sources: src.sources,
      blueprintId: bp.id,
      step: 'queued',
      progress: 0,
    };
  });

  const clampedSpeed = Math.min(1.06, Math.max(0.95, Number(req.speed) || 1.05));
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
