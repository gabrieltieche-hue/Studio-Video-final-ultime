import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { LOOK_PRESETS } from '../data/shortSpec';
import {
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  parseBulkTopicsInput,
  resolveBeatLayout,
  sanitizeScriptText,
  selectChoreographyForTopic,
  trimSpokenLineForPacing,
  type ElevenLabsCharAlignment,
} from '../engine/batchShortBuilder';
import { getBrollSequenceForTopic, isDevOrCodeTopic } from '../engine/brollKeys';
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
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import {
  applyVoiceSpeedMp3,
  probeAudioDurationSec,
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
    const response = await ai.models.generateContent({
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
  item: Pick<BatchJobItem, 'theme' | 'category' | 'angle' | 'hookHint' | 'sources'> & {
    variationIndex?: number;
  }
): Promise<{
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  archetypeLabel: string;
  generatedBy: 'gemini' | 'fallback';
  beats: BatchBeatSpec[];
}> {
  const ai = createGeminiClient();
  const blueprint = selectChoreographyForTopic({
    theme: item.theme,
    category: item.category,
    variationIndex: item.variationIndex,
  });
  const brollSeq = getBrollSequenceForTopic(item.category, item.theme);
  const isDev = isDevOrCodeTopic(item.category, item.theme);

  const fallbackBase = buildFallbackBatchScript({
    theme: item.theme,
    category: item.category,
    angle: item.angle,
    hookHint: item.hookHint,
    sources: item.sources,
    variationIndex: item.variationIndex,
  });

  if (!ai) {
    return {
      ...fallbackBase,
      archetypeLabel: blueprint.label,
      generatedBy: 'fallback',
    };
  }

  try {
    const sequenceSpec = blueprint.beatTypes
      .map((vt, i) => `Beat ${i + 1}: visualType="${vt}", layoutHint="${blueprint.layouts[i]}", brollKey="${i === 7 ? 'studio' : brollSeq[i % brollSeq.length]}"`)
      .join('\n');

    const prompt = [
      `Tu es le directeur créatif et scénariste d'une chaîne française YouTube Shorts / Reels / TikTok ultra-percutante (ton clair, concret, chiffré, rythmé).`,
      `MISSION : Écris un Short 100 % sur mesure pour CE sujet précis, avec une chronologie limpide du début à la fin (aucun remplissage générique, aucun jargon technique si ce n'est pas un sujet code/dev).`,
      `Sujet : "${item.theme}"`,
      `Catégorie : ${item.category}`,
      item.angle ? `Angle vérifié : ${item.angle}` : '',
      item.hookHint ? `Piste de hook : ${item.hookHint}` : '',
      item.sources ? `Sources : ${item.sources}` : '',
      `Chorégraphie imposée (${blueprint.label}) : ${blueprint.narrativeGuide}`,
      `Répartition visuelle des 8 séquences :\n${sequenceSpec}`,
      ``,
      `RÈGLES DE CHRONOLOGIE ET DE QUALITÉ (IMPÉRATIF) :`,
      `1. Longueur équilibrée : 105 à 130 mots parlés au total. CHAQUE spokenLine doit faire 11 à 17 mots maximum (3,5 à 5 secondes par séquence), pour un rythme régulier sans jamais bloquer 10 secondes sur la même carte.`,
      `2. Progression narrative logique :`,
      `   - Beat 1 (Hook) : ouvre fort avec une tension, une date ou un chiffre choc du sujet.`,
      `   - Beat 2 (Fait chiffré / Règle) : pose le contexte concret sans sauter d'étape.`,
      `   - Beat 3 (Mécanisme) : explique POURQUOI ou COMMENT cela se produit.`,
      `   - Beat 4 (Pivot plein écran) : révèle l'élément contre-intuitif ou le point critique.`,
      `   - Beat 5 (Comparaison / Impact) : montre l'avant vs maintenant avec des chiffres réalistes.`,
      `   - Beat 6 (Action concrète) : donne 3 réflexes ou règles pratiques adaptées AU SUJET.`,
      `   - Beat 7 (Preuve & verdict) : cite la source réelle et synthétise ce qu'il faut retenir.`,
      `   - Beat 8 (CTA) : pose une question engageante sur le sujet + @alex.decode.`,
      `3. INTERDICTIONS : zéro tiret cadratin (—), zéro phrase creuse ("bonjour", "dans cette vidéo"), zéro blabla générique ("méthode 2022", "pipeline automatique", "45 min vs 2 min") si le sujet ne parle pas de ça.${!isDev ? ' N’utilise JAMAIS de jargon terminal/code/bash sur ce sujet !' : ''}`,
      `4. Chaque "title" écran doit faire 2 à 5 mots percutants (< 35 caractères).`,
      `5. Remplis ces champs courts adaptés au sujet (toujours en français, sans remplissage générique) :`,
      `   - stampWord : mot tampon court (ex: "20 NOV", "PARADOXE", "PIÈGE", "MESURÉ").`,
      `   - statValue : chiffre ou badge court (<= 10 chars, ex: "20 NOV", "-28 %", "90 %", "@alex.decode").`,
      `   - statLabel : sous-titre factuel du chiffre (<= 40 chars).`,
      `   - leftPair / rightPair : format "Label | Valeur | Détail" (ex: "Avant 2026 | Flou | Frais cachés" et "Nouveau cadre | Encadré | Plafond clair").`,
      `   - itemsPipe : 3 points/actions (ou 4 étapes pour timeline_steps) séparés par " | ", courts et 100 % liés au sujet.`,
      `   - gaugePct : entier 25..96 (pour jauge/impact).`,
      ``,
      `Réponds en JSON strict avec exactement 8 beats adaptés à 100 % au sujet.`,
    ]
      .filter(Boolean)
      .join('\n');

    type GeminiFlatBeat = Partial<BatchBeatSpec> & {
      leftPair?: string;
      rightPair?: string;
      itemsPipe?: string;
    };

    let parsed: {
      hookText?: string;
      youtubeTitle?: string;
      caption?: string;
      hashtags?: string[] | string;
      beats?: GeminiFlatBeat[];
    } = {};

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hookText: { type: Type.STRING },
            youtubeTitle: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: { type: Type.STRING },
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
                  brollKey: { type: Type.STRING },
                  iconKind: { type: Type.STRING },
                  stampWord: { type: Type.STRING },
                  statValue: { type: Type.STRING },
                  statLabel: { type: Type.STRING },
                  leftPair: { type: Type.STRING },
                  rightPair: { type: Type.STRING },
                  itemsPipe: { type: Type.STRING },
                  gaugePct: { type: Type.INTEGER },
                },
                required: [
                  'title',
                  'shortLabel',
                  'screenLabel',
                  'spokenLine',
                  'visualType',
                  'brollKey',
                  'iconKind',
                ],
              },
            },
          },
          required: ['hookText', 'youtubeTitle', 'caption', 'hashtags', 'beats'],
        },
      },
    });

    try {
      const response = await Promise.race([
        geminiPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini script timeout (25s)')), 25_000)
        ),
      ]);

      const rawText = (response.text || '{}')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '');
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const candidate = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as typeof parsed;
      if (Array.isArray(candidate.beats) && candidate.beats.length >= 6) {
        parsed = candidate;
      }
    } catch (geminiErr) {
      console.warn(
        'Gemini batch script fallback triggered:',
        geminiErr instanceof Error ? geminiErr.message : geminiErr
      );
    }

    if (!Array.isArray(parsed.beats) || parsed.beats.length < 6) {
      return {
        ...fallbackBase,
        archetypeLabel: blueprint.label,
        generatedBy: 'fallback',
      };
    }

    const validVisualTypes = new Set<DynamicVisualType>([
      'hook_shatter',
      'hook_stat',
      'hook_alert',
      'hook_versus',
      'hook_question',
      'counter_flip',
      'comparison_bars',
      'timeline_steps',
      'toggles_switch',
      'terminal_flow',
      'key_points',
      'myth_vs_fact',
      'alert_rule',
      'checklist_audit',
      'gauge',
      'cta_card',
    ]);
    const validIcons = new Set<DynamicIconKind>([
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
      'bank',
      'alert',
      'scale',
      'users',
    ]);
    const validBrolls = new Set([
      'ai_meetings',
      'economy',
      'tech_code',
      'business',
      'parliament',
      'teen_phone',
      'studio',
      'focus_clockwork',
      'data_analytics',
      'mobile_attention',
      'startup_team',
      'ai_lab',
    ]);

    const rawBeats = parsed.beats.slice(0, 8);
    const beats: BatchBeatSpec[] = rawBeats.map((b, idx) => {
      const fb = fallbackBase.beats[idx % fallbackBase.beats.length];
      let vt: DynamicVisualType =
        idx === 0
          ? blueprint.hookType
          : idx === rawBeats.length - 1
            ? 'cta_card'
            : validVisualTypes.has(b.visualType as DynamicVisualType)
              ? (b.visualType as DynamicVisualType)
              : blueprint.beatTypes[idx % blueprint.beatTypes.length];

      if (vt === 'terminal_flow' && !isDev) {
        vt = 'checklist_audit';
      }

      const sfxByVt: Partial<Record<DynamicVisualType, BatchBeatSpec['sfxKind']>> = {
        hook_shatter: 'glass-shatter',
        hook_alert: 'impact-boom',
        hook_versus: 'zhhh',
        hook_stat: 'impact-boom',
        hook_question: 'glass-shatter',
        counter_flip: 'thud',
        alert_rule: 'thud',
        myth_vs_fact: 'pop',
        timeline_steps: 'tap',
        gauge: 'zhhh',
        comparison_bars: 'riser',
        toggles_switch: 'tap',
        checklist_audit: 'tap',
        key_points: 'pop',
        terminal_flow: 'pop',
        cta_card: 'pop-back',
      };

      const rawSpoken = sanitizeScriptText(b.spokenLine || fb.spokenLine);
      const spokenLine = trimSpokenLineForPacing(rawSpoken, idx === 0 ? 15 : 18);

      const iconKind = validIcons.has(b.iconKind as DynamicIconKind)
        ? (b.iconKind as DynamicIconKind)
        : fb.iconKind;

      const brollKey =
        idx === rawBeats.length - 1
          ? 'studio'
          : b.brollKey && validBrolls.has(b.brollKey)
            ? b.brollKey
            : fb.brollKey;

      const layoutHint =
        vt === 'gauge' || vt === 'comparison_bars'
          ? 'fullscreen'
          : blueprint.layouts[idx] || (b.layoutHint === 'fullscreen' ? 'fullscreen' : 'split');

      const parsePairTriplet = (
        raw: string | undefined,
        fallback?: { label: string; value: string; sub: string },
        defaultLabel = 'Repère'
      ): { label: string; value: string; sub: string } | undefined => {
        const clean = raw ? sanitizeScriptText(raw) : '';
        if (!clean) return fallback;
        const parts = clean
          .split('|')
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length === 0) return fallback;
        if (parts.length === 1) {
          return {
            label: sanitizeScriptText(fallback?.label || defaultLabel).slice(0, 22),
            value: parts[0].slice(0, 14),
            sub: sanitizeScriptText(fallback?.sub || '').slice(0, 24),
          };
        }
        return {
          label: parts[0].slice(0, 22),
          value: (parts[1] || fallback?.value || '-').slice(0, 14),
          sub: (parts[2] || fallback?.sub || '').slice(0, 24),
        };
      };

      const parsedLeft = b.leftCard && typeof b.leftCard === 'object'
        ? {
            label: sanitizeScriptText(b.leftCard.label || fb.leftCard?.label || 'Avant').slice(0, 22),
            value: sanitizeScriptText(b.leftCard.value || fb.leftCard?.value || '-').slice(0, 14),
            sub: sanitizeScriptText(b.leftCard.sub || fb.leftCard?.sub || '').slice(0, 24),
          }
        : parsePairTriplet(b.leftPair, fb.leftCard, 'Avant');

      const parsedRight = b.rightCard && typeof b.rightCard === 'object'
        ? {
            label: sanitizeScriptText(b.rightCard.label || fb.rightCard?.label || 'Réalité').slice(0, 22),
            value: sanitizeScriptText(b.rightCard.value || fb.rightCard?.value || '-').slice(0, 14),
            sub: sanitizeScriptText(b.rightCard.sub || fb.rightCard?.sub || '').slice(0, 24),
          }
        : parsePairTriplet(b.rightPair, fb.rightCard, 'Réalité');

      const pipeItems = (b.itemsPipe || '')
        .split(/\||;|\n/)
        .map((x) => sanitizeScriptText(x).trim())
        .filter(Boolean);

      const resolvedBullets =
        Array.isArray(b.bullets) && b.bullets.length > 0
          ? b.bullets.map((x) => condenseVisualHeadline(x, 5, 36)).slice(0, 3)
          : pipeItems.length > 0
            ? pipeItems.map((x) => condenseVisualHeadline(x, 5, 36)).slice(0, 3)
            : fb.bullets;

      const resolvedSteps =
        Array.isArray(b.steps) && b.steps.length > 0
          ? b.steps.map((x) => condenseVisualHeadline(x, 2, 18)).slice(0, 4)
          : pipeItems.length > 0
            ? pipeItems.map((x) => condenseVisualHeadline(x, 2, 18)).slice(0, 4)
            : fb.steps;

      const resolvedToggles =
        Array.isArray(b.toggles) && b.toggles.length > 0
          ? b.toggles.slice(0, 3).map((t) => ({
              label: condenseVisualHeadline(t.label || 'Levier', 4, 30),
              before: sanitizeScriptText(t.before || 'OFF').toUpperCase().slice(0, 12),
              after: sanitizeScriptText(t.after || 'ON').toUpperCase().slice(0, 12),
              activeAfter: Boolean(t.activeAfter),
            }))
          : pipeItems.length >= 2
            ? pipeItems.slice(0, 3).map((labelText, tIdx) => ({
                label: condenseVisualHeadline(labelText, 4, 30),
                before: tIdx === 0 ? 'SUBI' : 'OFF',
                after: tIdx === 0 ? 'CORRIGÉ' : 'ACTIF',
                activeAfter: tIdx > 0,
              }))
            : fb.toggles;

      const resolvedComparisonLeft = b.comparisonLeft
        ? {
            label: sanitizeScriptText(b.comparisonLeft.label || 'Avant').slice(0, 26),
            value: sanitizeScriptText(b.comparisonLeft.value || 'Avant').slice(0, 14),
            ratio: Math.max(0.12, Math.min(1, Number(b.comparisonLeft.ratio) || 0.85)),
          }
        : parsedLeft && b.leftPair
          ? {
              label: sanitizeScriptText(parsedLeft.label || 'Avant').slice(0, 26),
              value: sanitizeScriptText(parsedLeft.value || 'Avant').slice(0, 14),
              ratio: fb.comparisonLeft?.ratio ?? 0.85,
            }
          : fb.comparisonLeft;

      const resolvedComparisonRight = b.comparisonRight
        ? {
            label: sanitizeScriptText(b.comparisonRight.label || 'Après').slice(0, 26),
            value: sanitizeScriptText(b.comparisonRight.value || 'Après').slice(0, 14),
            ratio: Math.max(0.12, Math.min(1, Number(b.comparisonRight.ratio) || 0.25)),
          }
        : parsedRight && b.rightPair
          ? {
              label: sanitizeScriptText(parsedRight.label || 'Après').slice(0, 26),
              value: sanitizeScriptText(parsedRight.value || 'Après').slice(0, 14),
              ratio: fb.comparisonRight?.ratio ?? 0.35,
            }
          : fb.comparisonRight;

      const resolvedSubStats =
        Array.isArray(b.subStats) && b.subStats.length > 0
          ? b.subStats.slice(0, 2).map((s) => ({
              value: sanitizeScriptText(s.value || '').slice(0, 14),
              label: sanitizeScriptText(s.label || '').slice(0, 24),
            }))
          : b.leftPair || b.rightPair
            ? [
                {
                  value: (parsedLeft?.value || b.statValue || fb.subStats?.[0]?.value || '-').slice(0, 14),
                  label: (parsedLeft?.label || fb.subStats?.[0]?.label || 'Avant').slice(0, 24),
                },
                {
                  value: (parsedRight?.value || fb.subStats?.[1]?.value || '-').slice(0, 14),
                  label: (parsedRight?.label || fb.subStats?.[1]?.label || 'Impact').slice(0, 24),
                },
              ]
            : fb.subStats;

      return {
        id: `beat-${idx + 1}`,
        title: condenseVisualHeadline(b.title || fb.title, 5, 36),
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
        dateBadge: b.dateBadge ? sanitizeScriptText(b.dateBadge).toUpperCase().slice(0, 22) : fb.dateBadge,
        sourceLabel: b.sourceLabel ? sanitizeScriptText(b.sourceLabel).slice(0, 46) : fb.sourceLabel,
        leftCard: parsedLeft,
        rightCard: parsedRight,
        subStats: resolvedSubStats,
        bullets: resolvedBullets,
        steps: resolvedSteps,
        toggles: resolvedToggles,
        terminalCmd: b.terminalCmd ? sanitizeScriptText(b.terminalCmd).slice(0, 40) : fb.terminalCmd,
        terminalOut:
          Array.isArray(b.terminalOut) && b.terminalOut.length > 0
            ? b.terminalOut.map((l) => sanitizeScriptText(l).slice(0, 44)).slice(0, 3)
            : isDev && pipeItems.length > 0
              ? pipeItems.slice(0, 3).map((l) => l.slice(0, 44))
              : fb.terminalOut,
        comparisonLeft: resolvedComparisonLeft,
        comparisonRight: resolvedComparisonRight,
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

    const normalizedHashtags: string[] = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .map((h) => sanitizeScriptText(h).trim())
          .filter(Boolean)
          .map((h) => (h.startsWith('#') ? h : `#${h}`))
          .slice(0, 5)
      : typeof parsed.hashtags === 'string'
        ? parsed.hashtags
            .split(/[\s,;]+/)
            .map((h) => sanitizeScriptText(h).trim())
            .filter(Boolean)
            .map((h) => (h.startsWith('#') ? h : `#${h}`))
            .slice(0, 5)
        : [];

    return {
      hookText: sanitizeScriptText(parsed.hookText || beats[0].spokenLine),
      youtubeTitle: sanitizeScriptText(parsed.youtubeTitle || item.theme).slice(0, 58),
      caption: sanitizeScriptText(parsed.caption || fallbackBase.caption),
      hashtags: normalizedHashtags.length > 0 ? normalizedHashtags : fallbackBase.hashtags,
      archetypeLabel: blueprint.label,
      generatedBy: 'gemini',
      beats,
    };
  } catch (err) {
    console.warn('Gemini batch script fallback:', err);
    return {
      ...fallbackBase,
      archetypeLabel: blueprint.label,
      generatedBy: 'fallback',
    };
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
      // 1. Scripting
      job.items[i] = {
        ...item,
        step: 'scripting',
        progress: 12,
        startedAt: new Date().toISOString(),
      };
      job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Écriture du script IA`;
      job = saveBatchJob(job);

      const script = await generateScriptForBatchItem({
        ...job.items[i],
        variationIndex: i,
      });
      const fullSpokenText = script.beats.map((b) => b.spokenLine).join(' ');

      if (activeCancelledBatchIds.has(batchId)) continue;

      // 2. Voiceover ElevenLabs
      job.items[i] = {
        ...job.items[i],
        step: 'voiceover',
        progress: 34,
      };
      job.currentStepLabel = `Short ${i + 1}/${job.totalCount} · Synthèse vocale FR (${script.archetypeLabel})`;
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
            notes: `${script.archetypeLabel} (${script.generatedBy === 'gemini' ? 'IA Gemini' : 'Structuré'}) · Look ${lookPreset.label}`,
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
