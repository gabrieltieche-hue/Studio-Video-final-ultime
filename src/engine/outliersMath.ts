import type { DynamicVisualType } from '../types/batch';
import type { WhisperWord } from '../types/studio';

export interface OutlierCandidate {
  id: string;
  creatorHandle: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  titleOrHook: string;
  caption?: string;
  views: number;
  likes?: number;
  comments?: number;
  url?: string;
  publishedAt?: string;
}

export type OutlierTier = 'viral' | 'hot' | 'above' | 'normal';

export interface ScoredOutlier<T extends OutlierCandidate = OutlierCandidate> {
  item: T;
  medianViews: number;
  multiplier: number;
  tier: OutlierTier;
}

export function computeMedianViews(views: number[]): number {
  const clean = views.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  if (clean.length % 2 === 1) return clean[mid];
  return Math.round((clean[mid - 1] + clean[mid]) / 2);
}

export function classifyOutlierTier(multiplier: number): OutlierTier {
  if (multiplier >= 3) return 'viral';
  if (multiplier >= 2) return 'hot';
  if (multiplier >= 1.35) return 'above';
  return 'normal';
}

export function scoreOutliers<T extends OutlierCandidate>(items: T[]): Array<ScoredOutlier<T>> {
  if (items.length === 0) return [];
  // Group per creatorHandle + platform so each creator's median is respected
  const byCreator = new Map<string, number[]>();
  for (const it of items) {
    const key = `${it.platform}:${it.creatorHandle.toLowerCase()}`;
    const arr = byCreator.get(key) || [];
    arr.push(it.views);
    byCreator.set(key, arr);
  }

  return items
    .map((item) => {
      const key = `${item.platform}:${item.creatorHandle.toLowerCase()}`;
      const creatorViews = byCreator.get(key) || [item.views];
      const medianViews = Math.max(1, computeMedianViews(creatorViews));
      const multiplier = Number((item.views / medianViews).toFixed(2));
      return {
        item,
        medianViews,
        multiplier,
        tier: classifyOutlierTier(multiplier),
      };
    })
    .sort((a, b) => b.multiplier - a.multiplier || b.item.views - a.item.views);
}

const AI_TELL_REPLACEMENTS: Array<[RegExp, string, string]> = [
  [/\s*\u2014\s*/g, ', ', 'em-dash'],
  [/\s*--\s*/g, ', ', 'double-hyphen'],
  [/\b(?:il est important de noter que|notons que|force est de constater que)\s*/gi, '', 'ai-filler-intro'],
  [/\bdans un monde en constante évolution[,.]?\s*/gi, '', 'cliche-world'],
  [/\bplongeons(?:-nous)?\s+(?:ensemble\s+)?dans\s+/gi, 'Regarde ', 'cliche-dive-in'],
  [/\bau cœur de cette transformation[,.]?\s*/gi, '', 'cliche-heart'],
  [/\bvéritable révolution\b/gi, 'bascule nette', 'cliche-revolution'],
  [/\brévolutionnaire\b/gi, 'massif', 'cliche-revolutionary'],
  [/\bincontournable\b/gi, 'essentiel', 'cliche-incontournable'],
  [/\bbooster\b/gi, 'multiplier', 'cliche-booster'],
  [/\b(?:en conclusion|en résumé|pour conclure)[,:]?\s*/gi, '', 'cliche-conclusion'],
  [/\b(?:bonjour à tous|salut à tous|dans cette vidéo(?:,)?(?:\s+on va voir)?)\s*/gi, '', 'intro-greeting'],
];

/**
 * Strips AI-generated writing tells from French voiceover copy based on
 * studio-script/references/humanize.md and ai-tells.md.
 */
export function humanizeFrenchScript(text: string): {
  cleaned: string;
  strippedPatterns: string[];
} {
  let out = String(text || '').trim();
  const strippedPatterns: string[] = [];

  for (const [pattern, replacement, label] of AI_TELL_REPLACEMENTS) {
    if (pattern.test(out)) {
      strippedPatterns.push(label);
      out = out.replace(pattern, replacement);
    }
  }

  // Collapse excess whitespace and fix leading punctuation/capitalization
  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/^[,;:\s]+/, '')
    .trim();

  if (out.length > 0 && /^[a-zàâéèêëîïôùûüç]/.test(out)) {
    out = out[0].toUpperCase() + out.slice(1);
  }

  return { cleaned: out, strippedPatterns };
}

export interface HookScoreResult {
  hook: string;
  score: number;
  breakdown: {
    curiosity: number;
    brevity: number;
    concreteness: number;
    punch: number;
    antiCliche: number;
  };
  reasons: string[];
}

/**
 * Evaluates a French Short hook on the studio-script 5 x 2 = 10 rubric:
 * 1) Curiosity / open loop / contrast
 * 2) Brevity (<= 15 words)
 * 3) Concreteness (digits, %, dates, named tools/entities)
 * 4) Immediate punch (question, negation, tension verb)
 * 5) Zero AI cliché / zero greeting / zero em-dash
 */
export function scoreHookVariant(rawHook: string): HookScoreResult {
  const { cleaned, strippedPatterns } = humanizeFrenchScript(rawHook);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const reasons: string[] = [];

  // 1. Curiosity / Open loop (0..2)
  let curiosity = 0;
  if (/\?|pourquoi|personne|secret|cach[ée]|jamais|vrai|réel|vraiment|sans\s+que/i.test(cleaned)) {
    curiosity += 1;
  }
  if (/(?:mais|pourtant|alors\s+que|sauf\s+que|ne\s+veulent\s+pas|arrête|faux|erreur)/i.test(cleaned)) {
    curiosity += 1;
  }
  if (curiosity === 0) reasons.push('Manque un écart de curiosité ou une rupture');

  // 2. Brevity (0..2)
  let brevity = 0;
  if (words.length >= 5 && words.length <= 15) brevity = 2;
  else if (words.length >= 4 && words.length <= 20) brevity = 1;
  else reasons.push(`Longueur sous-optimale (${words.length} mots)`);

  // 3. Concreteness (0..2)
  let concreteness = 0;
  if (/\d/.test(cleaned)) concreteness += 1;
  if (/(?:%|€|\$|millions?|milliards?|ans?|mois|jours?|Claude|GPT|OpenAI|Anthropic|TikTok|Instagram|France|UE|Google|GitHub|DeepSeek)/i.test(cleaned)) {
    concreteness += 1;
  }
  if (concreteness === 0) reasons.push('Ajoute un chiffre, une date ou un outil concret');

  // 4. Punch & energy (0..2)
  let punch = 0;
  if (/(?:explos|chut|zéro|rien|interdi|bloqu|perdu|gagne|divis|tripl|paye|vole|force|vire)/i.test(cleaned)) {
    punch += 1;
  }
  if (/^(?:tu|tes|ton|on|personne|comment|pourquoi|\d+|les\s+|l['’]|ce\s+)/i.test(cleaned)) {
    punch += 1;
  }

  // 5. Anti-cliché discipline (0..2)
  let antiCliche = 2;
  if (strippedPatterns.length > 0) antiCliche -= 1;
  if (/(?:bonjour|salut|dans cette vidéo|révolutionnaire|incontournable|incroyable|voici comment)/i.test(rawHook)) {
    antiCliche -= 1;
    reasons.push('Contient un cliché ou une intro générique');
  }
  antiCliche = Math.max(0, antiCliche);

  const score = curiosity + brevity + concreteness + punch + antiCliche;
  return {
    hook: cleaned,
    score,
    breakdown: {
      curiosity,
      brevity,
      concreteness,
      punch,
      antiCliche,
    },
    reasons,
  };
}

export function pickBestHookVariant(variants: string[]): HookScoreResult {
  const valid = variants.map((v) => String(v || '').trim()).filter((v) => v.length >= 8);
  if (valid.length === 0) {
    return scoreHookVariant('');
  }
  const scored = valid.map((v) => scoreHookVariant(v));
  scored.sort((a, b) => b.score - a.score || a.hook.length - b.hook.length);
  return scored[0];
}

export type SemanticSfxSound =
  | 'glass-shatter'
  | 'impact-boom'
  | 'zhhh'
  | 'whoosh'
  | 'riser'
  | 'pop-back'
  | 'thud'
  | 'stamp'
  | 'tap'
  | 'click'
  | 'tick'
  | 'pop'
  | 'bell';

export interface SemanticSfxCue {
  sound: SemanticSfxSound;
  start: number;
  volume: number;
  reason: string;
}

const FRACTURE_WORD_RE = /^(?:explos|bloqu|chut|effondr|interdi|piège|erreur|stop|danger|jamais|zéro|rien|perdu|caché|secret|refus|censur|fractur|piég|ferm|écras|chute|perd)/i;
const NUMBER_WORD_RE = /(?:\d|%|\b(?:millions?|milliards?|fois|zéro|double|triple|dix|vingt|cinquante|cent)\b)/i;
const ACTION_WORD_RE = /^(?:cliqu|activ|coup|install|test|regard|scann|vérifi|lanc|ouvr|chang|retir|nettoi|compar|calcul|supprim|réduit)/i;
const CTA_SUB_WORD_RE = /^(?:abonne|abonner|suis|rejoins|clique)/i;
const CTA_BELL_WORD_RE = /^(?:cloche|notif|enregistr|sauvegard)/i;

function cleanFrenchToken(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^(?:[cdjlmnst]|qu)['’]/i, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Schedules SFX on EXACT word timestamps from WhisperWord[] alignment rather than
 * arbitrary fixed offsets, respecting minimum spacing (0.28s) so audio never stacks awkwardly.
 */
export function findSemanticWordTimestamps(params: {
  words: WhisperWord[];
  beatFrom: number;
  beatTo: number;
  visualType: DynamicVisualType;
  beatIndex: number;
  isLastBeat: boolean;
  previousLayout?: 'split' | 'fullscreen';
  currentLayout: 'split' | 'fullscreen';
  totalDurationSec: number;
  fallbackSfxKind?: SemanticSfxSound;
}): SemanticSfxCue[] {
  const {
    words,
    beatFrom,
    beatTo,
    visualType,
    beatIndex,
    isLastBeat,
    previousLayout,
    currentLayout,
    totalDurationSec,
    fallbackSfxKind,
  } = params;

  const span = Math.max(0.8, beatTo - beatFrom);
  const beatWords = words.filter((w) => w.start >= beatFrom - 0.08 && w.start < beatTo - 0.05);
  const cues: SemanticSfxCue[] = [];

  const pushUnique = (sound: SemanticSfxSound, time: number, volume: number, reason: string) => {
    const safeTime = Number(Math.max(0.05, Math.min(totalDurationSec - 0.15, time)).toFixed(2));
    if (cues.some((c) => Math.abs(c.start - safeTime) < 0.26)) return;
    cues.push({ sound, start: safeTime, volume, reason });
  };

  if (beatIndex === 0) {
    // Beat 1 Hook: Primary semantic shock on fracture/number + crisp Act 1 entry snap
    const fractureWord = beatWords.find(
      (w) => w.start >= beatFrom + 0.95 && FRACTURE_WORD_RE.test(cleanFrenchToken(w.word))
    );
    const numWord = beatWords.find(
      (w) => w.start >= beatFrom + 0.95 && NUMBER_WORD_RE.test(w.word)
    );
    const pivotAt = fractureWord?.start ?? numWord?.start ?? beatFrom + Math.max(1.25, Math.min(2.1, span * 0.44));
    const primary: SemanticSfxSound =
      visualType === 'trap_barrier_alert' ||
      visualType === 'notification_explosion_stamp' ||
      visualType === 'hook_alert' ||
      visualType === 'hook_stat' ||
      visualType === 'confidential_vault_slam' ||
      visualType === 'paywall_shock_stack'
        ? 'impact-boom'
        : visualType === 'balance_scale_duel' ||
            visualType === 'hook_versus' ||
            visualType === 'avatar_crowd_highlight'
          ? 'zhhh'
          : 'glass-shatter';
    pushUnique(primary, pivotAt, 0.46, 'hook-act2-semantic');
    if (numWord && fractureWord && Math.abs(numWord.start - fractureWord.start) > 0.32) {
      pushUnique('pop', numWord.start, 0.34, 'hook-digit');
    } else {
      pushUnique(
        visualType === 'trap_barrier_alert' || visualType === 'confidential_vault_slam' ? 'riser' : 'thud',
        Math.min(beatTo - 0.25, pivotAt + 0.3),
        0.30,
        'hook-resonance'
      );
    }
    pushUnique('pop', beatFrom + 0.08, 0.34, 'hook-act1-entry');
    return cues;
  }

  if (isLastBeat || visualType === 'channel_end_cta' || visualType === 'cta_card') {
    const subWord = beatWords.find((w) => CTA_SUB_WORD_RE.test(cleanFrenchToken(w.word)));
    const bellWord = beatWords.find((w) => CTA_BELL_WORD_RE.test(cleanFrenchToken(w.word)));
    const subAt = subWord?.start ?? beatFrom + Math.min(0.95, span * 0.32);
    const bellAt = bellWord?.start ?? subAt + 0.45;
    pushUnique('pop-back', subAt, 0.42, 'cta-subscribe');
    pushUnique('bell', bellAt, 0.38, 'cta-bell');
    return cues;
  }

  // Geometry transition whoosh on split <-> fullscreen switches
  if (previousLayout && previousLayout !== currentLayout) {
    pushUnique('zhhh', beatFrom + 0.04, 0.35, 'layout-transition');
  }

  // Multi-event UI / checklist / pipeline / audit primitives
  if (
    visualType === 'scrolling_checklist_spotlight' ||
    visualType === 'audit_table_detector' ||
    visualType === 'rotary_control_deck' ||
    visualType === 'process_pipeline' ||
    visualType === 'paper_receipt_payslip' ||
    visualType === 'radial_mindmap_hub' ||
    visualType === 'editorial_evidence_board' ||
    visualType === 'toggles_switch' ||
    visualType === 'checklist_audit' ||
    visualType === 'rotary_console' ||
    visualType === 'rotary_mixing_knobs' ||
    visualType === 'claude_code_slash_cli' ||
    visualType === 'metallic_toolbox_explode' ||
    visualType === 'ab_hook_leaderboard' ||
    visualType === 'card_fan_explosion_10x' ||
    visualType === 'night_shift_multi_agent_laptop'
  ) {
    const actionHits = beatWords
      .filter((w) => ACTION_WORD_RE.test(cleanFrenchToken(w.word)))
      .slice(0, 3);
    if (actionHits.length >= 2) {
      actionHits.forEach((w, i) => pushUnique(i === 2 ? 'pop' : 'tap', w.start, 0.34, `ui-word-${i}`));
    } else {
      [0.24, 0.86, 1.48].forEach((offset, i) => {
        if (offset < span - 0.28) {
          pushUnique(i === 2 ? 'pop' : 'tap', beatFrom + offset, 0.32, `ui-step-${i}`);
        }
      });
    }
    return cues;
  }

  // Slam / compression / stamp / morph / trap primitives
  if (
    visualType === 'hydraulic_compressor' ||
    visualType === 'countdown_calendar_stamp' ||
    visualType === 'notification_explosion_stamp' ||
    visualType === 'trap_barrier_alert' ||
    visualType === 'before_after_morph' ||
    visualType === 'hand_drawn_marker_highlight' ||
    visualType === 'neural_scan' ||
    visualType === 'neural_shield_abliteration' ||
    visualType === 'pixel_diff' ||
    visualType === 'pixel_diff_clone_loop' ||
    visualType === 'humanizer_belt' ||
    visualType === 'conveyor_belt_cleaner' ||
    visualType === 'red_strike_live_rewrite' ||
    visualType === 'ugly_to_apple_ui_morph' ||
    visualType === 'physical_cable_app_plug'
  ) {
    const numHit = beatWords.find((w) => NUMBER_WORD_RE.test(w.word));
    const actHit = beatWords.find((w) => ACTION_WORD_RE.test(cleanFrenchToken(w.word)));
    if (actHit) pushUnique('tap', actHit.start, 0.33, 'scan-action');
    pushUnique(
      visualType === 'hydraulic_compressor' ||
        visualType === 'countdown_calendar_stamp' ||
        visualType === 'trap_barrier_alert' ||
        visualType === 'neural_scan' ||
        visualType === 'neural_shield_abliteration'
        ? 'thud'
        : 'pop',
      numHit?.start ?? beatFrom + span * 0.52,
      0.38,
      'scan-payoff'
    );
    return cues;
  }

  // General semantic trigger: digit / percentage or fracture word inside the beat
  const numHit = beatWords.find((w) => NUMBER_WORD_RE.test(w.word));
  const fracHit = beatWords.find((w) => FRACTURE_WORD_RE.test(cleanFrenchToken(w.word)));
  const actHit = beatWords.find((w) => ACTION_WORD_RE.test(cleanFrenchToken(w.word)));

  if (fracHit) {
    pushUnique('thud', fracHit.start, 0.38, `fracture-${fracHit.word}`);
  } else if (numHit) {
    pushUnique(
      visualType === 'animated_data_chart' ||
        visualType === 'split_comparison_window' ||
        visualType === 'balance_scale_duel' ||
        visualType === 'dot_population_scale' ||
        visualType === 'segmented_quota_slider' ||
        visualType === 'comparison_bars' ||
        visualType === 'gauge' ||
        visualType === 'github_repo_star_rocket' ||
        visualType === 'retro_crt_1995_parallel' ||
        visualType === 'cloud_vs_offline_shield'
        ? 'impact-boom'
        : 'pop',
      numHit.start,
      0.36,
      `number-${numHit.word}`
    );
  } else if (actHit) {
    pushUnique('tap', actHit.start, 0.33, `action-${actHit.word}`);
  } else if (fallbackSfxKind && cues.length === 0) {
    pushUnique(fallbackSfxKind, beatFrom + 0.14, 0.32, 'beat-entry');
  }

  return cues;
}

