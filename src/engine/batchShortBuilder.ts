import type {
  BatchBeatSpec,
  BrandLogoId,
  DynamicIconKind,
  DynamicVisualType,
  MelvynxArchetypeType,
  ParsedCustomTopic,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import {
  isDevOrCodeTopic,
  selectBottomIllustrationsForShort,
} from './brollKeys';
import {
  findSemanticWordTimestamps,
  humanizeFrenchScript,
} from './outliersMath';

export const ALL_MELVYNX_ARCHETYPES: MelvynxArchetypeType[] = [
  'massive_dot_matrix_zoom',
  'avatar_crowd_highlight',
  'confidential_vault_slam',
  'paywall_shock_stack',
  'chat_prompt_refusal_cascade',
  'neural_shield_abliteration',
  'night_shift_multi_agent_laptop',
  'claude_code_slash_cli',
  'rotary_mixing_knobs',
  'code_and_live_preview_split',
  'github_repo_star_rocket',
  'article_highlighter_zoom',
  'pixel_diff_clone_loop',
  'github_heatmap_and_runs',
  'social_feed_waterfall',
  'conveyor_belt_cleaner',
  'red_strike_live_rewrite',
  'ugly_to_apple_ui_morph',
  'retro_crt_1995_parallel',
  'physical_cable_app_plug',
  'metallic_toolbox_explode',
  'card_fan_explosion_10x',
  'ab_hook_leaderboard',
  'cloud_vs_offline_shield',
  'voice_shortcut_waveform',
];

export interface ElevenLabsCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ChoreographyBlueprint {
  id:
    | 'melvynx_dot_matrix'
    | 'melvynx_neural_cli'
    | 'melvynx_crowd_agents'
    | 'melvynx_paywall_alert'
    | 'melvynx_paradox_duel'
    | 'melvynx_social_attention'
    | 'melvynx_product_stack';
  label: string;
  hookType: Extract<
    MelvynxArchetypeType,
    | 'massive_dot_matrix_zoom'
    | 'avatar_crowd_highlight'
    | 'confidential_vault_slam'
    | 'paywall_shock_stack'
  >;
  beatTypes: [
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
    DynamicVisualType,
  ];
  layouts: [
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
    'split' | 'fullscreen',
  ];
  narrativeGuide: string;
}

export const SHORT_CHOREOGRAPHIES: ChoreographyBlueprint[] = [
  {
    id: 'melvynx_dot_matrix',
    label: 'Matrice Population & Zoom',
    hookType: 'massive_dot_matrix_zoom',
    beatTypes: [
      'massive_dot_matrix_zoom',
      'article_highlighter_zoom',
      'ugly_to_apple_ui_morph',
      'retro_crt_1995_parallel',
      'pixel_diff_clone_loop',
      'conveyor_belt_cleaner',
      'ab_hook_leaderboard',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc @melvynxdev Signature : 1) Matrice à points + loupe zoom 2) Article presse surligné 3) UI brute transformée en carte Apple 4) Parallèle CRT 1995 vs 2026 plein écran 5) Diff pixel avant/après 6) Tapis nettoyeur anti-bruit 7) Podium A/B chiffré 8) CTA.',
  },
  {
    id: 'melvynx_neural_cli',
    label: 'Coffre Neural & CLI',
    hookType: 'confidential_vault_slam',
    beatTypes: [
      'confidential_vault_slam',
      'chat_prompt_refusal_cascade',
      'claude_code_slash_cli',
      'neural_shield_abliteration',
      'rotary_mixing_knobs',
      'code_and_live_preview_split',
      'github_repo_star_rocket',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc IA & Code : 1) Coffre-fort claqué 2) Cascade prompts bloqués 3) Commandes slash CLI 4) Ablitération couche neurale plein écran 5) Console rotative 3 réglages 6) Split code + rendu live 7) Fusée stars GitHub 8) CTA.',
  },
  {
    id: 'melvynx_crowd_agents',
    label: 'Foule & Agents 24/7',
    hookType: 'avatar_crowd_highlight',
    beatTypes: [
      'avatar_crowd_highlight',
      'night_shift_multi_agent_laptop',
      'physical_cable_app_plug',
      'github_heatmap_and_runs',
      'card_fan_explosion_10x',
      'metallic_toolbox_explode',
      'cloud_vs_offline_shield',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Équipe & Système : 1) Foule d’avatars avec focus central 2) Laptop nuit multi-agents 3) Câble physique connecté à l’app 4) Heatmap verte + CI plein écran 5) Éventail 10× 6) Boîte à outils éclatée 7) Cloud vs Local sécurisé 8) CTA.',
  },
  {
    id: 'melvynx_paywall_alert',
    label: 'Alerte Règle & Paywall',
    hookType: 'paywall_shock_stack',
    beatTypes: [
      'paywall_shock_stack',
      'article_highlighter_zoom',
      'red_strike_live_rewrite',
      'cloud_vs_offline_shield',
      'retro_crt_1995_parallel',
      'conveyor_belt_cleaner',
      'voice_shortcut_waveform',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Alerte Officielle : 1) Pile de paywalls choc 2) Surligneur article presse 3) Rature rouge + réécriture propre 4) Bouclier local vs risque cloud plein écran 5) Comparatif 1995 vs 2026 6) Tapis tri rapide 7) Onde vocale live 8) CTA.',
  },
  {
    id: 'melvynx_paradox_duel',
    label: 'Paradoxe & Réécriture',
    hookType: 'avatar_crowd_highlight',
    beatTypes: [
      'avatar_crowd_highlight',
      'red_strike_live_rewrite',
      'ugly_to_apple_ui_morph',
      'card_fan_explosion_10x',
      'social_feed_waterfall',
      'metallic_toolbox_explode',
      'ab_hook_leaderboard',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Paradoxe : 1) Isolement dans la foule 2) Erreur barrée + correction directe 3) Interface archaïque -> Apple UI 4) Explosion éventail 10× plein écran 5) Cascade feed social 6) Boîte outils dépliée 7) Classement A/B 8) CTA.',
  },
  {
    id: 'melvynx_social_attention',
    label: 'Saturation Feed & Focus',
    hookType: 'massive_dot_matrix_zoom',
    beatTypes: [
      'massive_dot_matrix_zoom',
      'social_feed_waterfall',
      'voice_shortcut_waveform',
      'pixel_diff_clone_loop',
      'conveyor_belt_cleaner',
      'ab_hook_leaderboard',
      'ugly_to_apple_ui_morph',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Attention : 1) Matrice 160 points zoomée 2) Cascade posts viraux 3) Onde micro rapide 4) Comparateur diff visuel plein écran 5) Tapis tri 6) Leaderboard hooks 7) Carte Apple épurée 8) CTA.',
  },
  {
    id: 'melvynx_product_stack',
    label: 'Pile Produit & Levier',
    hookType: 'confidential_vault_slam',
    beatTypes: [
      'confidential_vault_slam',
      'github_repo_star_rocket',
      'physical_cable_app_plug',
      'code_and_live_preview_split',
      'github_heatmap_and_runs',
      'rotary_mixing_knobs',
      'night_shift_multi_agent_laptop',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Build Produit : 1) Révélation confidentielle 2) Repo star rocket 3) Connecteur API physique 4) Code + preview plein écran 5) Heatmap verte 6) Console rotative 7) Agents nocturnes 8) CTA.',
  },
];

const DEV_ONLY_ARCHETYPES = new Set<DynamicVisualType>([
  'claude_code_slash_cli',
  'code_and_live_preview_split',
  'github_repo_star_rocket',
  'github_heatmap_and_runs',
  'neural_shield_abliteration',
  'chat_prompt_refusal_cascade',
  'terminal_flow',
  'neural_scan',
]);

const UNIVERSAL_MELVYNX_POOL: MelvynxArchetypeType[] = [
  'article_highlighter_zoom',
  'ab_hook_leaderboard',
  'conveyor_belt_cleaner',
  'red_strike_live_rewrite',
  'ugly_to_apple_ui_morph',
  'cloud_vs_offline_shield',
  'voice_shortcut_waveform',
  'card_fan_explosion_10x',
  'retro_crt_1995_parallel',
  'metallic_toolbox_explode',
  'rotary_mixing_knobs',
  'pixel_diff_clone_loop',
  'social_feed_waterfall',
  'physical_cable_app_plug',
];

export function selectChoreographyForTopic(input: {
  theme: string;
  category: string;
  variationIndex?: number;
}): ChoreographyBlueprint {
  const hay = `${input.category} ${input.theme}`.toLowerCase();
  const isDev = isDevOrCodeTopic(input.category, input.theme);
  const v = typeof input.variationIndex === 'number' ? Math.max(0, input.variationIndex) : 0;

  let base: ChoreographyBlueprint;

  if (
    /(novembre|janvier|1er|dès le|loi|décret|bancaire|découvert|smic|réforme|interdit|impôt|censure|amende|paywall|facture|abonnement)/.test(
      hay
    )
  ) {
    base = SHORT_CHOREOGRAPHIES[3]; // melvynx_paywall_alert
  } else if (/(claude|cli|terminal|mcp|neural|abliteration|prompt|deepseek)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[1]; // melvynx_neural_cli
  } else if (/(github|repo|open source|star|heatmap|produit|stack|api|sdk)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[6]; // melvynx_product_stack
  } else if (/(feed|vidéo|tiktok|instagram|scroll|attention|fatigue|5 minutes)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[5]; // melvynx_social_attention
  } else if (/(paradoxe|vs|contre|ne .* pas|mais|pourtant|juniors|seniors|freelance)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[4]; // melvynx_paradox_duel
  } else if (/\d+\s*%/.test(hay) && !/(réunion|meeting)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[0]; // melvynx_dot_matrix
  } else {
    base = SHORT_CHOREOGRAPHIES[2]; // melvynx_crowd_agents
  }

  // Rotate inside a batch so consecutive Shorts NEVER share the exact same hook or choreography
  if (v > 0) {
    const startIdx = SHORT_CHOREOGRAPHIES.findIndex((c) => c.id === base.id);
    base = SHORT_CHOREOGRAPHIES[(startIdx + v) % SHORT_CHOREOGRAPHIES.length];
  }

  // Keep non-dev Shorts free of terminal/code/GitHub archetypes while preserving 7 unique archetypes
  const beatTypes = [...base.beatTypes] as ChoreographyBlueprint['beatTypes'];
  if (!isDev) {
    const used = new Set<DynamicVisualType>(beatTypes);
    for (let i = 0; i < beatTypes.length; i++) {
      if (DEV_ONLY_ARCHETYPES.has(beatTypes[i])) {
        const replacement =
          UNIVERSAL_MELVYNX_POOL.find((cand) => !used.has(cand)) || 'ab_hook_leaderboard';
        used.delete(beatTypes[i]);
        beatTypes[i] = replacement;
        used.add(replacement);
      }
    }
  }

  return {
    ...base,
    beatTypes,
  };
}

export function sanitizeScriptText(text: string): string {
  return humanizeFrenchScript(text).cleaned;
}

/**
 * Forces punchy, scannable on-screen headlines (max 5 words / 38 chars) so cards never become text walls.
 */
export function condenseVisualHeadline(text: string, maxWords = 5, maxChars = 38): string {
  const clean = sanitizeScriptText(text).replace(/[.:;!?]+$/g, '');
  if (!clean) return 'Décryptage';
  const words = clean.split(/\s+/).filter(Boolean).slice(0, maxWords);
  while (
    words.length > 2 &&
    /^(et|ou|de|du|des|le|la|les|un|une|à|au|aux|en|pour|sur|par|dans|avec|sans)$/i.test(
      words[words.length - 1]
    )
  ) {
    words.pop();
  }
  let joined = words.join(' ');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
  }
  return joined || clean.slice(0, maxChars);
}

/**
 * Keeps spoken lines per beat balanced (~11-19 words) while cutting cleanly at sentence/clause
 * boundaries so lines never end in broken half-clauses.
 */
export function trimSpokenLineForPacing(text: string, maxWords = 20): string {
  const clean = sanitizeScriptText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;

  const minCut = Math.max(5, Math.floor(maxWords * 0.55));
  for (let i = Math.min(words.length - 1, maxWords - 1); i >= minCut; i--) {
    if (/[.!?]$/.test(words[i])) {
      return words.slice(0, i + 1).join(' ');
    }
  }

  for (let i = Math.min(words.length - 1, maxWords - 1); i >= minCut; i--) {
    if (/[,;:]$/.test(words[i])) {
      const candidate = words.slice(0, i + 1);
      const lastClean = candidate[candidate.length - 1].replace(/[,;:]+$/, '');
      if (
        candidate.length > minCut &&
        /^(et|ou|de|du|des|le|la|les|un|une|à|au|aux|en|pour|sur|par|dans|avec|sans|que|qui|mais|dès|vers|chez|entre|face|lors|sous|après|avant|contre)$/i.test(
          lastClean
        )
      ) {
        candidate.pop();
      }
      const joined = candidate.join(' ').replace(/[,;:]+$/, '').trim();
      return /[.!?]$/.test(joined) ? joined : `${joined}.`;
    }
  }

  const candidate = words.slice(0, maxWords);
  while (
    candidate.length > minCut &&
    /^(et|ou|de|du|des|le|la|les|un|une|à|au|aux|en|pour|sur|par|dans|avec|sans|que|qui|dont|ce|cet|cette|ces|se|ne|si|mais|dès|vers|chez|entre|face|lors|sous|après|avant|contre|depuis)$/i.test(
      candidate[candidate.length - 1].replace(/[,;:.!?]+$/, '')
    )
  ) {
    candidate.pop();
  }
  const sliced = candidate.join(' ').replace(/[,;:]+$/, '').trim();
  return /[.!?]$/.test(sliced) ? sliced : `${sliced}.`;
}

export function parseBulkTopicsInput(rawText: string, maxItems = 20): ParsedCustomTopic[] {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const seen = new Set<string>();
  const out: ParsedCustomTopic[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((p) => sanitizeScriptText(p));
    let category = 'Tech & Société';
    let theme = '';
    let angle = '';

    if (parts.length >= 2) {
      category = parts[0] || 'Tech & Société';
      theme = parts[1] || '';
      angle = parts[2] || '';
    } else {
      theme = parts[0] || '';
    }

    if (!theme || theme.length < 4) continue;
    const dedupKey = theme.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    out.push({
      category: category.slice(0, 32),
      theme: theme.slice(0, 140),
      angle: angle.slice(0, 220),
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

export function computeProportionalWords(
  text: string,
  durationSec: number
): WhisperWord[] {
  const clean = sanitizeScriptText(text);
  const rawWords = clean.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const safeDuration = Math.max(4, durationSec);
  const weights = rawWords.map((w) => Math.max(2, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let cursor = 0.08;
  const usable = Math.max(1, safeDuration - 0.55);

  return rawWords.map((word, idx) => {
    const weight = weights[idx] / totalWeight;
    const span = usable * weight;
    const start = Number(cursor.toFixed(3));
    const end = Number(Math.min(safeDuration, cursor + Math.max(0.12, span * 0.92)).toFixed(3));
    cursor += span;
    return {
      id: `w-${idx + 1}`,
      word,
      start,
      end: Math.max(start + 0.08, end),
      confidence: 0.95,
    };
  });
}

export function alignmentToWords(
  alignment: ElevenLabsCharAlignment | null | undefined,
  fallbackText: string,
  speed = 1.0,
  fallbackDurationSec = 42
): { words: WhisperWord[]; durationSec: number } {
  const safeSpeed = Math.max(0.75, Math.min(1.5, speed || 1.0));

  if (
    alignment &&
    Array.isArray(alignment.characters) &&
    Array.isArray(alignment.character_start_times_seconds) &&
    Array.isArray(alignment.character_end_times_seconds) &&
    alignment.characters.length > 0 &&
    alignment.characters.length === alignment.character_start_times_seconds.length &&
    alignment.characters.length === alignment.character_end_times_seconds.length
  ) {
    const words: WhisperWord[] = [];
    let buf = '';
    let wordStart: number | null = null;
    let wordEnd: number | null = null;

    const flush = () => {
      const cleaned = buf.trim();
      if (!cleaned || wordStart === null || wordEnd === null) {
        buf = '';
        wordStart = null;
        wordEnd = null;
        return;
      }
      const start = Number((wordStart / safeSpeed).toFixed(3));
      const end = Number(Math.max(start + 0.06, wordEnd / safeSpeed).toFixed(3));
      if (/^[:;!?.,…]+$/.test(cleaned) && words.length > 0) {
        const prev = words[words.length - 1];
        prev.word =
          cleaned === '.' || cleaned === ',' || cleaned === '…'
            ? `${prev.word}${cleaned}`
            : `${prev.word} ${cleaned}`;
        prev.end = Math.max(prev.end, end);
      } else {
        words.push({
          id: `w-${words.length + 1}`,
          word: cleaned,
          start,
          end,
          confidence: 0.99,
        });
      }
      buf = '';
      wordStart = null;
      wordEnd = null;
    };

    for (let i = 0; i < alignment.characters.length; i++) {
      const ch = alignment.characters[i];
      const st = Number(alignment.character_start_times_seconds[i]);
      const en = Number(alignment.character_end_times_seconds[i]);

      if (/^\s$/.test(ch)) {
        flush();
        continue;
      }

      if (wordStart === null && Number.isFinite(st)) {
        wordStart = st;
      }
      if (Number.isFinite(en)) {
        wordEnd = en;
      }
      buf += ch;
    }
    flush();

    if (words.length > 0) {
      let lastEnd = words[words.length - 1].end;
      // Lock subtitle timeline tightly to measured post-atempo audio duration if drift > 2.5%
      if (fallbackDurationSec > 4 && lastEnd > 2) {
        const expectedSpeechEnd = Math.max(2, fallbackDurationSec - 0.12);
        const relDiff = Math.abs(lastEnd - expectedSpeechEnd) / lastEnd;
        if (relDiff > 0.025 && relDiff < 0.45) {
          const factor = expectedSpeechEnd / lastEnd;
          for (const w of words) {
            w.start = Number((w.start * factor).toFixed(3));
            w.end = Number(Math.max(w.start + 0.06, w.end * factor).toFixed(3));
          }
          lastEnd = words[words.length - 1].end;
        }
      }
      return {
        words,
        durationSec: Number(Math.max(fallbackDurationSec + 0.45, lastEnd + 0.85).toFixed(2)),
      };
    }
  }

  const proportional = computeProportionalWords(fallbackText, fallbackDurationSec);
  const lastEnd =
    proportional.length > 0 ? proportional[proportional.length - 1].end : fallbackDurationSec;
  return {
    words: proportional,
    durationSec: Number(Math.max(fallbackDurationSec, lastEnd + 0.6).toFixed(2)),
  };
}

export function resolveBeatLayout(spec: BatchBeatSpec, index: number, total: number): 'split' | 'fullscreen' {
  if (spec.layoutHint === 'split' || spec.layoutHint === 'fullscreen') {
    return spec.layoutHint;
  }
  if (
    spec.visualType === 'gauge' ||
    spec.visualType === 'comparison_bars' ||
    spec.visualType === 'chart_curve' ||
    spec.visualType === 'neural_shield_abliteration' ||
    spec.visualType === 'pixel_diff_clone_loop' ||
    spec.visualType === 'github_heatmap_and_runs' ||
    spec.visualType === 'card_fan_explosion_10x' ||
    spec.visualType === 'retro_crt_1995_parallel' ||
    spec.visualType === 'code_and_live_preview_split' ||
    spec.visualType === 'cloud_vs_offline_shield' ||
    spec.visualType === 'conveyor_belt_cleaner'
  ) {
    return 'fullscreen';
  }
  if (index === 0 || index === total - 1) {
    return 'split';
  }
  return 'split';
}

export function assignBeatTimingsAndTranscript(
  beatsSpec: BatchBeatSpec[],
  words: WhisperWord[],
  totalDurationSec: number
): {
  beats: Array<BatchBeatSpec & { from: number; to: number; layout: 'fullscreen' | 'split' }>;
  motionTrack: ShortProject['motionTrack'];
  sfxTrack: ShortProject['sfxTrack'];
  durationSec: number;
} {
  const safeDuration = Number(
    Math.max(12, totalDurationSec, words.length > 0 ? words[words.length - 1].end + 0.6 : 0).toFixed(2)
  );

  if (beatsSpec.length === 0) {
    return { beats: [], motionTrack: [], sfxTrack: [], durationSec: safeDuration };
  }

  const beatWordCounts = beatsSpec.map((b) =>
    Math.max(1, sanitizeScriptText(b.spokenLine).split(/\s+/).filter(Boolean).length)
  );
  const totalSpecWords = beatWordCounts.reduce((a, b) => a + b, 0);

  let wordCursor = 0;
  let cumSpecWords = 0;
  let prevEnd = 0;
  const maxSingleBeatSpan = Math.max(5.5, safeDuration * 0.24);

  const beats = beatsSpec.map((spec, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === beatsSpec.length - 1;
    const from = isFirst ? 0 : prevEnd;
    cumSpecWords += beatWordCounts[idx];

    let to: number;
    if (isLast) {
      to = safeDuration;
    } else if (words.length > 0) {
      const targetWordIdx = Math.min(
        words.length - 1,
        Math.max(
          wordCursor,
          Math.round((cumSpecWords / totalSpecWords) * words.length) - 1
        )
      );
      const nextWordStart =
        targetWordIdx + 1 < words.length ? words[targetWordIdx + 1].start : safeDuration;
      const boundary = (words[targetWordIdx].end + nextWordStart) / 2;
      const minStep = isFirst ? 2.4 : 2.1;
      const remainingMin = (beatsSpec.length - 1 - idx) * 2.0;
      to = Number(
        Math.max(
          from + minStep,
          Math.min(from + maxSingleBeatSpan, safeDuration - remainingMin, boundary)
        ).toFixed(2)
      );
      wordCursor = targetWordIdx + 1;
    } else {
      const weight = beatWordCounts[idx] / totalSpecWords;
      to = Number(
        Math.max(from + 2.0, Math.min(from + maxSingleBeatSpan, from + safeDuration * weight)).toFixed(2)
      );
    }

    prevEnd = to;
    const layout = resolveBeatLayout(spec, idx, beatsSpec.length);

    return {
      ...spec,
      title: condenseVisualHeadline(spec.title, 5, 38),
      spokenLine: sanitizeScriptText(spec.spokenLine),
      from,
      to,
      layout,
    };
  });

  const typeMap: Record<DynamicVisualType, ShortProject['motionTrack'][number]['type']> = {
    massive_dot_matrix_zoom: 'counter',
    avatar_crowd_highlight: 'card',
    confidential_vault_slam: 'typography',
    paywall_shock_stack: 'card',
    chat_prompt_refusal_cascade: 'card',
    neural_shield_abliteration: 'card',
    night_shift_multi_agent_laptop: 'card',
    claude_code_slash_cli: 'card',
    rotary_mixing_knobs: 'card',
    code_and_live_preview_split: 'card',
    github_repo_star_rocket: 'rocket',
    article_highlighter_zoom: 'card',
    pixel_diff_clone_loop: 'card',
    github_heatmap_and_runs: 'chart',
    social_feed_waterfall: 'card',
    conveyor_belt_cleaner: 'card',
    red_strike_live_rewrite: 'typography',
    ugly_to_apple_ui_morph: 'card',
    retro_crt_1995_parallel: 'card',
    physical_cable_app_plug: 'card',
    metallic_toolbox_explode: 'card',
    card_fan_explosion_10x: 'counter',
    ab_hook_leaderboard: 'chart',
    cloud_vs_offline_shield: 'card',
    voice_shortcut_waveform: 'card',
    hook_shatter: 'typography',
    hook_stat: 'counter',
    hook_alert: 'typography',
    hook_versus: 'typography',
    hook_question: 'typography',
    dot_matrix_zoom: 'counter',
    neural_scan: 'card',
    dual_stopwatch: 'counter',
    rotary_console: 'card',
    pixel_diff: 'card',
    humanizer_belt: 'card',
    headline_news: 'card',
    counter_flip: 'counter',
    comparison_bars: 'chart',
    chart_curve: 'chart',
    source_quote: 'card',
    ui_window: 'card',
    timeline_steps: 'card',
    toggles_switch: 'card',
    terminal_flow: 'card',
    key_points: 'card',
    myth_vs_fact: 'card',
    alert_rule: 'card',
    checklist_audit: 'card',
    gauge: 'chart',
    cta_card: 'rocket',
  };

  const motionTrack: ShortProject['motionTrack'] = beats.map((b, idx) => ({
    id: `mot-${b.id}`,
    componentId: `comp-${b.id}`,
    name: b.title,
    start: b.from,
    end: b.to,
    type: typeMap[b.visualType] || 'card',
    color: idx === 0 ? '#258EFF' : idx === beats.length - 1 ? '#059669' : '#14161B',
  }));

  const sfxTrack: ShortProject['sfxTrack'] = [];
  beats.forEach((b, idx) => {
    const prevLayout = idx > 0 ? beats[idx - 1].layout : undefined;
    const semanticCues = findSemanticWordTimestamps({
      words,
      beatFrom: b.from,
      beatTo: b.to,
      visualType: b.visualType,
      beatIndex: idx,
      isLastBeat: idx === beats.length - 1,
      previousLayout: prevLayout,
      currentLayout: b.layout,
      totalDurationSec: safeDuration,
      fallbackSfxKind: b.sfxKind,
    });
    semanticCues.forEach((cue, cIdx) => {
      if (sfxTrack.some((existing) => Math.abs(existing.start - cue.start) < 0.22)) return;
      const stableId =
        idx === 0 && cIdx === 0 && cue.sound === 'glass-shatter'
          ? 'sfx-hook-shatter'
          : `sfx-${idx + 1}-${cIdx + 1}-${cue.reason}`;
      sfxTrack.push({
        id: stableId,
        sound: cue.sound,
        start: cue.start,
        volume: cue.volume,
      });
    });
  });

  return {
    beats,
    motionTrack,
    sfxTrack,
    durationSec: safeDuration,
  };
}

export function computeStaggeredScheduleSlots(
  count: number,
  startAtIso: string,
  intervalHours: number
): string[] {
  const safeCount = Math.max(0, Math.min(50, Math.floor(count)));
  const baseMs = Number.isFinite(Date.parse(startAtIso))
    ? Date.parse(startAtIso)
    : Date.now() + 60 * 60 * 1000;
  const stepMs = Math.max(0.25, Number(intervalHours) || 24) * 3600 * 1000;

  return Array.from({ length: safeCount }, (_, i) =>
    new Date(baseMs + i * stepMs).toISOString()
  );
}

export function pickTopicIcon(category: string, theme: string): DynamicIconKind {
  const hay = `${category} ${theme}`.toLowerCase();
  if (/(banque|découvert|crédit|agios|livret)/.test(hay)) return 'bank';
  if (/(euro|salaire|smic|loyer|économie|impôt|budget|pouvoir)/.test(hay)) return 'euro';
  if (/(loi|parlement|censure|politique|décret|interdit|règle)/.test(hay)) return 'law';
  if (/(sécurité|risque|alerte|fraude|protection)/.test(hay)) return 'shield';
  if (/(réunion|meeting|calendrier|agenda)/.test(hay)) return 'calendar';
  if (/(junior|senior|salarié|emploi|équipe|jeune|ado)/.test(hay)) return 'users';
  if (/(téléphone|écran|réseau|tiktok|instagram|scroll)/.test(hay)) return 'phone';
  if (/(ia|ai|agent|code|dev|résumé|llm)/.test(hay)) return 'ai';
  if (/(temps|heure|minute|productiv)/.test(hay)) return 'clock';
  return 'chart';
}

function extractTopicDateBadge(hay: string): string {
  const m = hay.match(/\b(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+20\d{2})?)\b/i);
  if (m) return m[1].toUpperCase();
  return 'DÈS 2026';
}

function extractTopicStat(hay: string): string {
  const pct = hay.match(/([+-]?\d+(?:[.,]\d+)?\s*%)/);
  if (pct) return pct[1];
  const mins = hay.match(/(\d+\s*(?:minutes|min|heures|h|ans|euros|€))/i);
  if (mins) return mins[1];
  return '3× PLUS';
}

function formatSourceForSpeech(raw?: string): string {
  const clean = sanitizeScriptText(raw || '').trim();
  if (!clean) return 'les données officielles';
  const normalized = clean
    .replace(/\(([^)]*)\)/g, ' ')
    .replace(/service-public\.gouv\.fr/gi, 'Service Public')
    .replace(/\b([a-z0-9-]+)\.(gouv\.fr|fr|com|org|io)\b/gi, '$1')
    .replace(/Notes sectorielles France\s*[·-]\s*/gi, '')
    .replace(/[·|]/g, ' et ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || 'les données officielles';
}

interface DomainPreset {
  statValue: string;
  statLabel: string;
  stampWord: string;
  leftCard: { label: string; value: string; sub: string };
  rightCard: { label: string; value: string; sub: string };
  compLeft: { label: string; value: string; ratio: number };
  compRight: { label: string; value: string; ratio: number };
  multiplier: string;
  gaugePct: number;
  steps: [string, string, string, string];
  bullets: [string, string, string];
  actionBullets: [string, string, string];
  toggles: Array<{ label: string; before: string; after: string; activeAfter: boolean }>;
  quoteText: string;
  quoteHighlight: string;
  uiUrl: string;
  uiActionLabel: string;
  uiRows: [string, string, string];
  chartUnit: string;
  chartPoints: Array<{ label: string; value: number; highlight?: boolean }>;
  beatTitles: [string, string, string, string, string, string];
  spokenBeats: [string, string, string, string, string, string, string, string];
  ctaTitle: string;
  ctaTagline: string;
}

function buildDomainPreset(
  category: string,
  theme: string,
  statVal: string,
  angle?: string,
  sourceSpoken = 'les données officielles'
): DomainPreset {
  const hay = `${category} ${theme}`.toLowerCase();

  if (/(banque|découvert|crédit|agios|frais|livret)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '20 NOV' : statVal,
      statLabel: 'Réforme découvert bancaire',
      stampWord: 'ENCADRÉ',
      leftCard: { label: 'Ancien découvert', value: 'Flou', sub: 'Frais surprises' },
      rightCard: { label: 'Dès le 20 nov', value: 'Encadré', sub: 'Crédit vérifié' },
      compLeft: { label: 'Découvert subi avant', value: '180 €/an', ratio: 0.88 },
      compRight: { label: 'Avec plafond & alerte', value: '24 €/an', ratio: 0.24 },
      multiplier: '÷7,5',
      gaugePct: 78,
      steps: ['Seuil fixé', 'Vérif revenus', 'Alerte SMS', 'Frais bloqués'],
      bullets: ['Solvabilité contrôlée', 'Coût total affiché', 'Frais d’incident plafonnés'],
      actionBullets: ['Vérifier ton autorisation actuelle', 'Activer l’alerte SMS gratuite', 'Comparer le TAEG écrit'],
      toggles: [
        { label: 'Découvert automatique flou', before: 'ACTIF', after: 'STOPPÉ', activeAfter: false },
        { label: 'Test de solvabilité écrit', before: 'OFF', after: 'OBLIGATOIRE', activeAfter: true },
        { label: 'Plafond réel de frais', before: 'OFF', after: 'ACTIVÉ', activeAfter: true },
      ],
      quoteText: 'Tout découvert bancaire devient un vrai crédit soumis à vérification claire des revenus dès novembre.',
      quoteHighlight: 'un vrai crédit soumis à vérification',
      uiUrl: 'banque.service-public.fr/decouvert',
      uiActionLabel: 'Fixer mon plafond',
      uiRows: ['Audit des rentrées nettes', 'Simulation TAEG réel', 'Blocage alerte 80 %'],
      chartUnit: ' €',
      chartPoints: [
        { label: '2022', value: 195 },
        { label: '2023', value: 188 },
        { label: '2024', value: 180 },
        { label: '2025', value: 162 },
        { label: '2026', value: 24, highlight: true },
      ],
      beatTitles: [
        'Ce qui change le 20 nov',
        'Comment ta banque vérifie',
        'Frais divisés par 7',
        'Découvert subi vs Encadré',
        '3 clics dans ton appli',
        'Ce que tu économises',
      ],
      spokenBeats: [
        'Le 20 novembre, ton découvert bancaire change de règle : il devient un vrai crédit encadré.',
        'Ta banque doit désormais vérifier tes revenus avant de t’accorder un découvert automatique.',
        'Résultat concret : le taux est affiché clairement et les frais abusifs sont plafonnés.',
        'La courbe des agios chute de 180 euros par an à seulement 24 euros bien réglés.',
        'Entre un découvert subi sans plafond et une alerte active, tu divises la facture par sept.',
        'Ouvre ton appli bancaire aujourd’hui : vérifie ton plafond, active l’alerte SMS et compare le taux.',
        `Selon ${sourceSpoken}, les clients qui ajustent leur plafond économisent dès le premier mois.`,
        'Abonne-toi et active la cloche pour ne rater aucune règle qui protège ton argent.',
      ],
      ctaTitle: 'Protège ton compte',
      ctaTagline: 'Argent, Banques & Décryptages',
    };
  }

  if (/(junior|senior|embauche|emploi|smic|salaire|chômage)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '-28 %' : statVal,
      statLabel: 'Offres juniors depuis 2023',
      stampWord: 'FRACTURE',
      leftCard: { label: 'Profils seniors', value: '98 %', sub: 'Postes maintenus' },
      rightCard: { label: 'Jeunes diplômés', value: '-28 %', sub: 'Offres fermées' },
      compLeft: { label: 'Offres juniors 2023', value: '100 base', ratio: 0.9 },
      compRight: { label: 'Offres juniors 2026', value: '72 base', ratio: 0.56 },
      multiplier: '-28 %',
      gaugePct: 72,
      steps: ['Tâches simples', 'Reprises IA', 'Moins de CDI', 'Rôle seniorisé'],
      bullets: ['Tâches d’entrée automatisées', 'Seniors 2× plus rapides', 'Attentes dès le jour 1'],
      actionBullets: ['Publier des projets chiffrés en ligne', 'Auditer et corriger du code IA', 'Viser les PME à flux concrets'],
      toggles: [
        { label: 'CV théorique sans démo', before: 'CLASSIQUE', after: 'FILTRÉ', activeAfter: false },
        { label: 'Relecture critique d’agents', before: 'OPTION', after: 'EXIGÉ', activeAfter: true },
        { label: 'Preuves live vérifiables', before: 'RARE', after: 'PRIORITÉ', activeAfter: true },
      ],
      quoteText: 'Dans les métiers exposés à l’IA, les embauches juniors chutent alors que les postes seniors restent stables.',
      quoteHighlight: 'les embauches juniors chutent',
      uiUrl: 'emploi.observatoire.fr/juniors-2026',
      uiActionLabel: 'Auditer mon profil',
      uiRows: ['1 projet déployé mesurable', 'Maîtrise revue & debug IA', 'Cas client chiffré clair'],
      chartUnit: '',
      chartPoints: [
        { label: '2022', value: 104 },
        { label: '2023', value: 100 },
        { label: '2024', value: 89 },
        { label: '2025', value: 78 },
        { label: '2026', value: 72, highlight: true },
      ],
      beatTitles: [
        'Offres juniors bloquées',
        'Chute des premiers CDI',
        'Seniors vs Débutants',
        'Ce que montrent les chiffres',
        '3 preuves qui recrutent',
        'Comment passer devant',
      ],
      spokenBeats: [
        'L’IA ne vire pas les seniors, elle ferme la porte aux premiers emplois des juniors.',
        'Selon Stanford et la Banque de France, les offres juniors ont chuté de vingt-huit pour cent.',
        'Pourquoi ? Parce que les tâches simples de rédaction, support et code basique partent vers l’IA.',
        'Pour le même salaire, un senior avec l’IA produit autant que deux débutants réunis.',
        'Du coup, envoyer un simple CV d’école ne suffit plus pour décrocher un entretien.',
        'La solution : montre trois preuves en ligne, un projet chiffré, du debug IA et un résultat client.',
        `Les chiffres de ${sourceSpoken} le confirment : ceux qui savent piloter ces outils restent recrutés.`,
        'Abonne-toi et active la cloche pour garder une longueur d’avance sur l’emploi.',
      ],
      ctaTitle: 'Décroche ton poste 2026',
      ctaTagline: 'Emploi, IA & Carrière FR',
    };
  }

  if (
    /\b(loi|parlement|interdiction|réseau|réseaux|écran|ado|ados|politique|état|décret|censure)\b/i.test(
      hay
    )
  ) {
    return {
      statValue: statVal === '3× PLUS' ? '74 %' : statVal,
      statLabel: 'Mineurs exposés sans filtre',
      stampWord: 'VOTÉ',
      leftCard: { label: 'Avant le vote', value: 'Libre', sub: 'Case à cocher' },
      rightCard: { label: 'Nouveau cadre', value: 'Strict', sub: 'Tiers vérifié' },
      compLeft: { label: 'Exposition sans filtre', value: '3 h 15/j', ratio: 0.88 },
      compRight: { label: 'Avec cadre appliqué', value: '45 min/j', ratio: 0.3 },
      multiplier: '÷4,3',
      gaugePct: 81,
      steps: ['Projet déposé', 'Débat public', 'Contrôle âge', 'Application'],
      bullets: ['Auto-déclaration jugée naïve', 'Double vérification tiers', 'Amendes pour plateformes'],
      actionBullets: ['Protéger vie privée et anonymat', 'Éviter le contournement VPN', 'Vérifier l’audit européen'],
      toggles: [
        { label: 'Case d’âge contournable', before: 'EN COURS', after: 'INTERDITE', activeAfter: false },
        { label: 'Preuve anonyme sans photo', before: 'OFF', after: 'ACTIF', activeAfter: true },
        { label: 'Sanctions plateformes', before: 'FAIBLES', after: 'APPLIQUÉES', activeAfter: true },
      ],
      quoteText: 'La simple case déclarative ne suffit plus : le contrôle d’âge devient contraignant pour chaque plateforme.',
      quoteHighlight: 'contrôle d’âge devient contraignant',
      uiUrl: 'regulation.numerique.gouv.fr/age',
      uiActionLabel: 'Vérifier la règle',
      uiRows: ['Jeton d’âge anonyme tiers', 'Zéro stockage pièce d’identité', 'Blocage compte non vérifié'],
      chartUnit: '%',
      chartPoints: [
        { label: '2022', value: 68 },
        { label: '2023', value: 74 },
        { label: '2024', value: 79 },
        { label: '2025', value: 82 },
        { label: '2026', value: 45, highlight: true },
      ],
      beatTitles: [
        'Le nouveau texte',
        'Comment ça s’applique',
        'Courbe d’exposition réelle',
        'Avant vs Nouveau cadre',
        '3 leviers de contrôle',
        'Ce que change la loi',
      ],
      spokenBeats: [
        'On a voulu verrouiller l’accès aux plateformes avant quinze ans, mais le vrai test commence maintenant.',
        'Le texte impose aux plateformes un contrôle tiers réel pour remplacer la simple case de date de naissance.',
        'L’outil repose sur un jeton anonyme : ton identité reste hors ligne pendant que l’âge est certifié.',
        'Dans les pays pilotes, la courbe d’exposition chute dès le blocage des flux algorithmiques nocturnes.',
        'L’écart passe de plus de trois heures quotidiennes à quarante-cinq minutes sur les comptes encadrés.',
        'Reste un angle mort énorme : le contournement via VPN ou comptes partagés reste dur à bloquer.',
        `Selon ${sourceSpoken}, les sanctions européennes décideront si cette règle est appliquée ou contournée.`,
        'Abonne-toi et active la cloche pour suivre chaque décision qui redéfinit nos règles numériques.',
      ],
      ctaTitle: 'Comprends les vraies règles',
      ctaTagline: 'Politique, Lois & Société',
    };
  }

  if (/(agents|entreprise|entreprises|économies|business|rentabil|productivité|coût)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '90 %' : statVal,
      statLabel: 'Projets IA sans gain comptable',
      stampWord: 'PARADOXE',
      leftCard: { label: 'Promesse IA', value: '+40 %', sub: 'Vitesse perçue' },
      rightCard: { label: 'Bilan comptable', value: '0 €', sub: 'Coût caché réel' },
      compLeft: { label: 'Déploiement sans refonte', value: '90 %', ratio: 0.9 },
      compRight: { label: 'Gains nets mesurés', value: '10 %', ratio: 0.22 },
      multiplier: '9 sur 10',
      gaugePct: 90,
      steps: ['Outil ajouté', 'Double saisie', 'Coût API & audit', 'Zéro marge'],
      bullets: ['Agents ajoutés sans tri', 'Relecture humaine doublée', 'Coûts API sous-estimés'],
      actionBullets: ['Supprimer la tâche avant d’automatiser', 'Mesurer le coût par dossier', 'Cibler un goulot unique'],
      toggles: [
        { label: 'Empiler des gadgets IA', before: 'MODE', after: 'STOPPÉ', activeAfter: false },
        { label: 'Audit coût réel par flux', before: 'OFF', after: 'PRIORITÉ', activeAfter: true },
        { label: 'Contrôle droits & erreurs', before: 'FLOU', after: 'VERROUILLÉ', activeAfter: true },
      ],
      quoteText: 'Neuf déploiements IA sur dix accélèrent la production brute sans réduire d’un euro les coûts finaux.',
      quoteHighlight: 'sans réduire d’un euro les coûts finaux',
      uiUrl: 'kpi.entreprise.fr/audit-agents',
      uiActionLabel: 'Calculer le ROI',
      uiRows: ['Temps humain de relecture', 'Facture API & maintenance', 'Marge nette après 90 jours'],
      chartUnit: '%',
      chartPoints: [
        { label: 'T1', value: 18 },
        { label: 'T2', value: 42 },
        { label: 'T3', value: 68 },
        { label: 'T4', value: 84 },
        { label: '2026', value: 90, highlight: true },
      ],
      beatTitles: [
        'Le piège des coûts cachés',
        'Pourquoi ça coûte cher',
        'Courbe des coûts IA',
        'Gadgets vs Gain réel',
        '3 étapes rentables',
        'La règle qui gagne',
      ],
      spokenBeats: [
        'Quatre-vingt-dix pour cent des entreprises installent des agents IA, mais gagnent zéro euro de plus.',
        'Générer du texte deux fois plus vite oblige souvent les équipes à relire deux fois plus d’erreurs.',
        'Au final, entre les abonnements API et la relecture humaine, toute l’économie promise disparaît.',
        'Sur la courbe, le nombre d’outils explose alors que la marge réelle reste bloquée sous dix pour cent.',
        'Celles qui gagnent vraiment de l’argent suppriment d’abord les tâches inutiles sur un seul circuit clair.',
        'Fais ces trois gestes : chronomètre la relecture, calcule le coût par dossier, simplifie avant d’automatiser.',
        `Les audits de ${sourceSpoken} prouvent qu’un outil simple rapporte plus que dix agents empilés.`,
        'Abonne-toi et active la cloche pour éviter les faux gains en business.',
      ],
      ctaTitle: 'Évite les faux gains IA',
      ctaTagline: 'Business, IA & Stratégie FR',
    };
  }

  if (/(feed|vidéo|attention|fatigue|brut|5 minutes|conseil|habitude)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '5 min' : statVal,
      statLabel: 'Réflexe anti-feed passif',
      stampWord: 'SATURATION',
      leftCard: { label: 'Vidéo IA lisse', value: '0,8 s', sub: 'Skippée direct' },
      rightCard: { label: 'Format brut incarné', value: '3× plus', sub: 'Partages & saves' },
      compLeft: { label: 'Rétention contenu lisse', value: '18 %', ratio: 0.3 },
      compRight: { label: 'Rétention preuve directe', value: '54 %', ratio: 0.86 },
      multiplier: '×3',
      gaugePct: 79,
      steps: ['Scroll passif', 'Rejet du lisse', 'Signal humain', 'Sauvegarde'],
      bullets: ['Filtre instinctif en 0,8 s', 'Preuve vécue recherchée', 'Action immédiate en 5 min'],
      actionBullets: ['Couper les feeds lisses le matin', 'Lancer un bloc simple de 5 minutes', 'Garder une preuve concrète par jour'],
      toggles: [
        { label: 'Montage cloné sans âme', before: 'SATURÉ', after: 'IGNORÉ', activeAfter: false },
        { label: 'Une idée claire en 5 min', before: 'OFF', after: 'PRIORITÉ', activeAfter: true },
        { label: 'Partages & sauvegardes', before: 'FAIBLES', after: 'BOOSTÉS', activeAfter: true },
      ],
      quoteText: 'Plus le feed devient généré et lisse, plus le cerveau filtre en moins d’une seconde pour chercher du réel.',
      quoteHighlight: 'filtre en moins d’une seconde',
      uiUrl: 'attention.studio/test-retention',
      uiActionLabel: 'Appliquer 5 min',
      uiRows: ['0,8 s : détection du faux', 'Preuve chiffrée dès le début', 'Règle des 5 min appliquée'],
      chartUnit: '%',
      chartPoints: [
        { label: '2022', value: 48 },
        { label: '2023', value: 41 },
        { label: '2024', value: 31 },
        { label: '2025', value: 23 },
        { label: '2026', value: 18, highlight: true },
      ],
      beatTitles: [
        'Pourquoi le feed sature',
        'Règle des 5 minutes',
        'Chute du lisse en feed',
        'Lisse IA vs Format brut',
        '3 signaux qui retiennent',
        'Le retour au concret',
      ],
      spokenBeats: [
        'Si les vidéos trop parfaites t’ennuient en moins d’une seconde, ce n’est pas un hasard du tout.',
        'Face au flot de contenus lissés, notre attention rejette instinctivement ce qui sonne faux ou générique.',
        'Sur ton attention quotidienne, la règle des cinq minutes coupe la procrastination avant même d’ouvrir un réseau.',
        'La courbe de rétention des formats clonés s’effondre à dix-huit pour cent dès les trois premières secondes.',
        'À l’inverse, un angle vécu et précis triple la rétention réelle et les enregistrements utiles.',
        'Découpe ton objectif du matin en cinq minutes nettes, puis coupe les écrans jusqu’à midi.',
        `Les analyses de ${sourceSpoken} montrent une prime massive à ce qui reste sincère, chiffré et actionnable.`,
        'Abonne-toi et active la cloche pour retrouver chaque semaine des formats nets et sans remplissage.',
      ],
      ctaTitle: 'Teste la règle des 5 min',
      ctaTagline: 'Attention, Création & Vie FR',
    };
  }

  if (/(réunion|meeting|résumé)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '80 %' : statVal,
      statLabel: 'Réunions remplacées par async',
      stampWord: 'OBSOLÈTE',
      leftCard: { label: 'Visio classique', value: '60 min', sub: 'Zéro trace' },
      rightCard: { label: 'Résumé IA structuré', value: '90 sec', sub: 'Actions claires' },
      compLeft: { label: 'Réunions par semaine', value: '14 h', ratio: 0.9 },
      compRight: { label: 'Avec synthèse async', value: '3 h', ratio: 0.24 },
      multiplier: '÷4,6',
      gaugePct: 84,
      steps: ['Ordre du jour', 'Captation', 'Décisions', 'Suivi écrit'],
      bullets: ['Compte rendu horodaté', 'Décisions listées sans flou', '11 h récupérées par semaine'],
      actionBullets: ['Supprimer les points statut hebdo', 'Envoyer une note de 90 secondes', 'Garder le live uniquement pour trancher'],
      toggles: [
        { label: 'Points statut sans fin', before: 'ACTIF', after: 'SUPPRIMÉ', activeAfter: false },
        { label: 'Synthèse écrite automatique', before: 'OFF', after: 'ON', activeAfter: true },
        { label: 'Décision en 3 lignes', before: 'OFF', after: 'ON', activeAfter: true },
      ],
      quoteText: 'Quatre réunions sur cinq ne servent qu’à lire un statut qu’un résumé structuré règle en quatre-vingt-dix secondes.',
      quoteHighlight: 'quatre-vingt-dix secondes',
      uiUrl: 'workspace.equipe.fr/async',
      uiActionLabel: 'Passer en async',
      uiRows: ['Transcript trié par décision', 'Actions assignées avec date', 'Agenda libéré automatiquement'],
      chartUnit: ' h',
      chartPoints: [
        { label: '2022', value: 16 },
        { label: '2023', value: 14 },
        { label: '2024', value: 11 },
        { label: '2025', value: 6 },
        { label: '2026', value: 3, highlight: true },
      ],
      beatTitles: [
        'La visio inutile recule',
        'Flux async en direct',
        'Heures perdues en visio',
        'Réunion 1 h vs Résumé',
        '3 règles équipe claire',
        'Ce qui reste essentiel',
      ],
      spokenBeats: [
        'Quatre-vingts pour cent de tes réunions disparaissent dès qu’un résumé structuré remplace le tour de table.',
        'L’outil capture la voix, isole les blocages et sort trois décisions datées sans bloquer six agendas.',
        'Dans cette interface async, chacun valide sa ligne en deux minutes au lieu d’attendre une heure de visio.',
        'La courbe du temps passé en appel chute de quatorze heures par semaine à moins de trois heures.',
        'Soixante minutes subies face à quatre-vingt-dix secondes claires : l’écart de concentration est massif.',
        'Coupe les points statut dès lundi et réserve les appels uniquement aux désaccords à trancher en direct.',
        `Les retours de ${sourceSpoken} prouvent que les équipes async livrent plus vite sans brûler leurs matinées.`,
        'Abonne-toi et active la cloche pour découvrir d’autres méthodes concrètes qui te font gagner du temps.',
      ],
      ctaTitle: 'Arrête les réunions inutiles',
      ctaTagline: 'Productivité & IA concrète',
    };
  }

  // Smart dynamic fallback tuned directly to theme + angle + stat + sources
  const topicShort = condenseVisualHeadline(theme, 4, 30);
  const effectiveStat = statVal === '3× PLUS' ? '76 %' : statVal;
  const cleanAngle = sanitizeScriptText(
    angle || `${topicShort} cache un écart massif entre le discours officiel et la réalité mesurée.`
  );
  return {
    statValue: effectiveStat,
    statLabel: `Impact mesuré · ${topicShort}`,
    stampWord: 'BASCULE',
    leftCard: { label: 'Ce qu’on croit', value: 'Stable', sub: 'Discours courant' },
    rightCard: { label: 'Réalité 2026', value: effectiveStat, sub: 'Sur le terrain' },
    compLeft: { label: 'Méthode subie avant', value: 'Coût haut', ratio: 0.86 },
    compRight: { label: 'Avec stratégie claire', value: 'Maîtrisé', ratio: 0.28 },
    multiplier: effectiveStat,
    gaugePct: 82,
    steps: ['Constat brut', 'Coût caché', 'Réglage clé', 'Gain net'],
    bullets: [`Impact direct sur ${topicShort}`, 'Seuil caché rarement chiffré', 'Écart rapide à vérifier'],
    actionBullets: [`Auditer ta situation sur ${topicShort}`, 'Comparer les chiffres à 3 mois', 'Appliquer le réglage prioritaire'],
    toggles: [
      { label: 'Subir le changement sans chiffre', before: 'ACTIF', after: 'STOPPÉ', activeAfter: false },
      { label: 'Indicateur concret vérifié', before: 'OFF', after: 'ACTIF', activeAfter: true },
      { label: 'Action prioritaire ciblée', before: 'OFF', after: 'ACTIF', activeAfter: true },
    ],
    quoteText: cleanAngle,
    quoteHighlight: cleanAngle.split(/\s+/).slice(0, 6).join(' '),
    uiUrl: 'analyse.decryptage.fr/2026',
    uiActionLabel: 'Vérifier l’impact',
    uiRows: [`Repère clé : ${effectiveStat}`, 'Coût caché mis au clair', 'Plan d’adaptation vérifié'],
    chartUnit: '%',
    chartPoints: [
      { label: '2022', value: 42 },
      { label: '2023', value: 54 },
      { label: '2024', value: 65 },
      { label: '2025', value: 74 },
      { label: '2026', value: 82, highlight: true },
    ],
    beatTitles: [
      'Le constat chiffré',
      'Mécanique cachée',
      `Courbe · ${topicShort.slice(0, 18)}`,
      'Avant vs Méthode nette',
      '3 réglages vérifiables',
      'Verdict sur le terrain',
    ],
    spokenBeats: [
      `${topicShort} vient de basculer, et presque personne n’a vu l’impact exact sur les chiffres.`,
      cleanAngle,
      `Sur cet écran, tout se joue autour du seuil de ${effectiveStat} que la majorité continue d’ignorer.`,
      'La courbe des quatre dernières années montre une accélération nette qui redéfinit les règles du jeu.',
      'Entre subir la tendance ou ajuster ses critères dès maintenant, l’écart réel se chiffre dès ce trimestre.',
      `Trois réflexes suffisent cette semaine : vérifier tes chiffres, couper la friction et tester l’option active.`,
      `Selon ${sourceSpoken}, ceux qui s’adaptent dès le début gardent l’avantage avant que tout le monde suive.`,
      'Abonne-toi et active la cloche pour recevoir nos prochains décryptages chiffrés chaque semaine.',
    ],
    ctaTitle: 'Passe du bruit aux faits',
    ctaTagline: 'Décryptages France 2026',
  };
}

export function buildFallbackBatchScript(input: {
  theme: string;
  category: string;
  angle?: string;
  hookHint?: string;
  sources?: string;
  variationIndex?: number;
  batchCooldownIds?: Set<string>;
}): {
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  beats: BatchBeatSpec[];
} {
  const cleanTheme = sanitizeScriptText(input.theme);
  const cleanAngle = sanitizeScriptText((input.angle || '').replace(/\s+\+\s+/g, ', et '));
  const shortTopic = condenseVisualHeadline(cleanTheme, 4, 30);
  const statVal = extractTopicStat(`${cleanTheme} ${cleanAngle}`);
  const dateBadge = extractTopicDateBadge(`${cleanTheme} ${cleanAngle}`);
  const iconKind = pickTopicIcon(input.category, cleanTheme);
  const blueprint = selectChoreographyForTopic(input);
  const sourceClean = sanitizeScriptText(input.sources || 'les données officielles 2026').slice(0, 48);
  const sourceSpoken = formatSourceForSpeech(input.sources);
  const preset = buildDomainPreset(input.category, cleanTheme, statVal, cleanAngle, sourceSpoken);

  const hookLine = trimSpokenLineForPacing(
    input.hookHint || preset.spokenBeats[0],
    18
  );
  const angleLine = trimSpokenLineForPacing(
    cleanAngle || preset.spokenBeats[1],
    19
  );

  const detectTopicBrand = (): BrandLogoId => {
    const h = `${input.category} ${cleanTheme}`.toLowerCase();
    if (/claude|anthropic/.test(h)) return 'claude';
    if (/openai|chatgpt|gpt/.test(h)) return 'openai';
    if (/deepseek/.test(h)) return 'deepseek';
    if (/github|repo|open source/.test(h)) return 'github';
    if (/instagram|reel/.test(h)) return 'instagram';
    if (/tiktok/.test(h)) return 'tiktok';
    if (/apple|ios|iphone/.test(h)) return 'apple';
    if (/google|youtube/.test(h)) return 'google';
    return 'ai';
  };
  const brandLogo = detectTopicBrand();
  const numericPctMatch = preset.statValue.match(/\d+(?:[.,]\d+)?/);
  const numericPct = numericPctMatch ? Math.min(99, Math.max(1, Number(numericPctMatch[0].replace(',', '.')))) : 72;

  const repoSlug = shortTopic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 22) || 'audit-fr-2026';

  const topicTools: string[] = [
    condenseVisualHeadline(preset.actionBullets[0] || preset.bullets[0], 2, 16),
    condenseVisualHeadline(preset.actionBullets[1] || preset.bullets[1], 2, 16),
    condenseVisualHeadline(preset.actionBullets[2] || preset.bullets[2], 2, 16),
    condenseVisualHeadline(preset.steps[0] || 'Audit', 2, 16),
    condenseVisualHeadline(preset.steps[1] || 'Filtre', 2, 16),
    condenseVisualHeadline(preset.steps[3] || 'Preuve', 2, 16),
  ];

  const beatContents: Record<number, Omit<BatchBeatSpec, 'id' | 'visualType' | 'layoutHint'>> = {
    0: {
      title: shortTopic,
      shortLabel: 'Hook',
      screenLabel: `${input.category.toUpperCase()} · ALERTE`,
      spokenLine: hookLine,
      iconKind,
      brandLogo,
      notoIcon: iconKind === 'law' ? 'balance-scale' : iconKind === 'bank' ? 'bank' : 'bolt',
      stampWord: preset.stampWord,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      dateBadge,
      matrixHighlightPct: Math.min(25, Math.max(1, Math.round(100 - numericPct) || 6)),
      matrixTotalDots: 160,
      matrixCalloutLabel: preset.statLabel || `IMPACT · ${preset.statValue}`,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      subStats: [
        { value: preset.statValue, label: preset.leftCard.label },
        { value: preset.multiplier, label: 'Écart net' },
      ],
      beforeBadText: `${preset.leftCard.label} : ${preset.leftCard.value}`,
      afterGoodText: `${preset.rightCard.label} : ${preset.rightCard.value}`,
    },
    1: {
      title: preset.beatTitles[0],
      shortLabel: 'Preuve source',
      screenLabel: 'SOURCE VÉRIFIÉE',
      spokenLine: angleLine,
      iconKind,
      brandLogo,
      notoIcon: 'search',
      dateBadge,
      sourceLabel: sourceClean,
      authorName: sourceClean.split('·')[0]?.trim() || 'Observatoire FR',
      quoteText: preset.quoteText,
      quoteHighlight: preset.quoteHighlight,
      newsPublication: sourceClean.split('·')[0]?.trim() || 'Observatoire FR',
      newsHeadline: preset.quoteText,
      newsHighlightPhrase: preset.quoteHighlight,
      newsYears: ['2022', '2026'],
      neuralLayers: ['Entrée', 'Filtre', 'Sortie'],
      neuralEquation: `${preset.leftCard.value} -> ${preset.rightCard.value}`,
      repoName: `fr/${repoSlug}`,
      repoStars: '14 820 ★',
      codeLines: [
        `const cible = "${shortTopic}";`,
        `const avant = "${preset.compLeft.value}";`,
        `const apres = "${preset.compRight.value}";`,
      ],
      slashCommands: ['/audit --reel', '/filtre --cout', '/verdict --2026'],
      matrixHighlightPct: numericPct,
      matrixTotalDots: 160,
      matrixCalloutLabel: preset.leftCard.label,
      stampWord: preset.stampWord,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      bullets: preset.bullets,
      beforeBadText: preset.leftCard.label,
      afterGoodText: preset.rightCard.label,
    },
    2: {
      title: preset.beatTitles[1],
      shortLabel: 'Mécanisme',
      screenLabel: 'EN DIRECT',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[2], 24),
      iconKind,
      brandLogo,
      notoIcon: 'gear',
      sourceLabel: sourceClean,
      uiUrl: preset.uiUrl,
      uiActionLabel: preset.uiActionLabel,
      bullets: preset.uiRows,
      steps: preset.steps,
      slashCommands: ['/effort max', `/scan "${shortTopic.slice(0, 14)}"`, '/export --net'],
      cableAppLabel: shortTopic,
      beforeBadText: preset.compLeft.label,
      afterGoodText: preset.compRight.label,
      dialKnobs: [
        { label: 'Vitesse', value: 88, unit: '%', active: true },
        { label: 'Précision', value: 94, unit: '%', active: true },
        { label: 'Coût net', value: 18, unit: '%', active: false },
      ],
      chartUnit: preset.chartUnit,
      chartPoints: preset.chartPoints,
      stampWord: 'MESURÉ',
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
    },
    3: {
      title: preset.beatTitles[2],
      shortLabel: 'Pivot',
      screenLabel: 'PLEIN ÉCRAN',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[3], 24),
      iconKind,
      brandLogo,
      notoIcon: 'chart-increasing',
      chartUnit: preset.chartUnit,
      chartPoints: preset.chartPoints,
      gaugePct: preset.gaugePct,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      multiplierBadge: preset.multiplier,
      bullets: preset.bullets,
      crtYear: '1995',
      crtMetric: preset.compLeft.value,
      heatCells: [1, 2, 3, 4, 2, 3, 4, 4, 2, 3, 4, 4, 3, 4, 4, 4, 2, 3, 4, 4, 4],
      fanCards: [
        { tag: 'BASE', metric: preset.compLeft.value, label: preset.compLeft.label },
        { tag: 'LEVIER', metric: preset.multiplier, label: shortTopic },
        { tag: 'GAIN NET', metric: preset.compRight.value, label: preset.compRight.label },
      ],
      codeLines: [
        `const seuil = "${preset.statValue}";`,
        `const delta = "${preset.multiplier}";`,
        `return verifier(${preset.gaugePct});`,
      ],
      diffBeforeLines: [preset.leftCard.label, preset.leftCard.value, preset.leftCard.sub],
      diffAfterLines: [preset.rightCard.label, preset.rightCard.value, preset.rightCard.sub],
      diffScore: preset.gaugePct,
      neuralLayers: ['Données brutes', 'Filtre vérifié', 'Signal net'],
      neuralEquation: `${preset.compLeft.value} -> ${preset.compRight.value}`,
    },
    4: {
      title: preset.beatTitles[3],
      shortLabel: 'Écart chiffré',
      screenLabel: 'COMPARAISON',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[4], 24),
      iconKind,
      brandLogo,
      notoIcon: 'balance-scale',
      sourceLabel: sourceClean,
      quoteText: preset.quoteText,
      quoteHighlight: preset.quoteHighlight,
      newsPublication: sourceClean.split('·')[0]?.trim() || 'Archive Presse',
      newsHeadline: preset.quoteText,
      newsHighlightPhrase: preset.quoteHighlight,
      newsYears: ['AVANT', '2026'],
      crtYear: '1995',
      crtMetric: preset.compLeft.value,
      diffBeforeLines: [preset.leftCard.label, preset.leftCard.value, preset.leftCard.sub],
      diffAfterLines: [preset.rightCard.label, preset.rightCard.value, preset.rightCard.sub],
      diffScore: preset.gaugePct,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      multiplierBadge: preset.multiplier,
      statValue: preset.compRight.value,
      statLabel: preset.statLabel,
      dateBadge,
      bullets: preset.bullets,
      steps: preset.steps,
      heatCells: [1, 2, 2, 3, 4, 3, 4, 4, 2, 4, 4, 3, 4, 4, 3, 4, 4, 4, 3, 4, 4],
      fanCards: [
        { tag: 'AVANT', metric: preset.compLeft.value, label: preset.leftCard.label },
        { tag: 'BASCULE', metric: preset.statValue, label: preset.statLabel },
        { tag: 'APRÈS', metric: preset.compRight.value, label: preset.rightCard.label },
      ],
      dialKnobs: [
        { label: 'Signal', value: 92, unit: '%', active: true },
        { label: 'Bruit', value: 12, unit: '%', active: false },
        { label: 'Impact', value: preset.gaugePct, unit: '%', active: true },
      ],
    },
    5: {
      title: preset.beatTitles[4],
      shortLabel: 'Actions',
      screenLabel: 'PLAN CONCRET',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[5], 24),
      iconKind,
      brandLogo,
      notoIcon: 'check',
      uiUrl: preset.uiUrl,
      uiActionLabel: preset.uiActionLabel,
      toggles: preset.toggles,
      bullets: preset.actionBullets,
      toolboxTools: topicTools,
      codeLines: [
        `check("${preset.actionBullets[0]}");`,
        `apply("${preset.actionBullets[1]}");`,
        `ship("${preset.actionBullets[2]}");`,
      ],
      diffBeforeLines: [
        preset.toggles[0]?.label || preset.leftCard.label,
        preset.compLeft.label,
        'Sans règle mesurée',
      ],
      diffAfterLines: preset.actionBullets,
      diffScore: 96,
      hookVariantsList: [
        { hook: preset.actionBullets[0], retention: '84 %' },
        { hook: preset.actionBullets[1], retention: '91 %' },
        { hook: preset.actionBullets[2], retention: '96 %' },
      ],
      dialKnobs: [
        { label: 'Clarté', value: 95, unit: '%', active: true },
        { label: 'Vitesse', value: 89, unit: '%', active: true },
        { label: 'Friction', value: 14, unit: '%', active: false },
      ],
      fanCards: [
        { tag: '01', metric: '#1 PRIORITÉ', label: preset.actionBullets[0] },
        { tag: '02', metric: preset.multiplier, label: preset.actionBullets[1] },
        { tag: '03', metric: preset.compRight.value, label: preset.actionBullets[2] },
      ],
      sourceLabel: sourceClean,
      statValue: '3/3 ACTIFS',
      statLabel: 'Réflexes immédiats',
    },
    6: {
      title: preset.beatTitles[5],
      shortLabel: 'Verdict',
      screenLabel: 'BILAN SOURCÉ',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[6], 25),
      iconKind,
      brandLogo,
      notoIcon: 'bullseye',
      sourceLabel: sourceClean,
      bullets: preset.actionBullets,
      repoName: `fr/${repoSlug}`,
      repoStars: '18 400 ★',
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      beforeBadText: preset.leftCard.label,
      afterGoodText: preset.rightCard.label,
      hookVariantsList: [
        { hook: preset.leftCard.label, retention: '32 %' },
        { hook: preset.bullets[0], retention: '68 %' },
        { hook: preset.rightCard.label, retention: '92 %' },
      ],
      diffBeforeLines: [preset.compLeft.label, preset.compLeft.value, preset.leftCard.sub],
      diffAfterLines: [preset.compRight.label, preset.compRight.value, preset.rightCard.sub],
      diffScore: preset.gaugePct,
      gaugePct: preset.gaugePct,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      multiplierBadge: preset.multiplier,
      fanCards: [
        { tag: 'AVANT', metric: preset.compLeft.value, label: preset.leftCard.label },
        { tag: 'LEVIER', metric: preset.multiplier, label: preset.statLabel },
        { tag: 'VERDICT', metric: preset.compRight.value, label: preset.rightCard.label },
      ],
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      terminalCmd: isDevOrCodeTopic(input.category, cleanTheme)
        ? '> audit --impact-2026'
        : undefined,
      terminalOut: isDevOrCodeTopic(input.category, cleanTheme)
        ? preset.actionBullets.map((b) => `✓ ${b}`)
        : undefined,
    },
    7: {
      title: preset.ctaTitle,
      shortLabel: 'CTA',
      screenLabel: 'SUITE EN DIRECT',
      spokenLine: trimSpokenLineForPacing(preset.spokenBeats[7], 18),
      iconKind: 'rocket',
      brandLogo,
      notoIcon: 'bell',
      statValue: '@alex.decode',
      statLabel: preset.ctaTagline,
    },
  };

  const rawBeatInputs = blueprint.beatTypes.map((_, idx) => ({
    spokenLine: beatContents[idx].spokenLine,
    title: beatContents[idx].title,
  }));
  const semanticBrolls = selectBottomIllustrationsForShort({
    beats: rawBeatInputs,
    category: input.category,
    theme: cleanTheme,
    batchCooldownIds: input.batchCooldownIds,
    estimatedDurationSec: 46,
  });

  const beats: BatchBeatSpec[] = blueprint.beatTypes.map((vt, idx) => {
    const content = beatContents[idx];
    const brollPick = semanticBrolls[idx];
    const sfxByVt: Partial<Record<DynamicVisualType, BatchBeatSpec['sfxKind']>> = {
      massive_dot_matrix_zoom: 'pop',
      avatar_crowd_highlight: 'zhhh',
      confidential_vault_slam: 'impact-boom',
      paywall_shock_stack: 'glass-shatter',
      chat_prompt_refusal_cascade: 'thud',
      neural_shield_abliteration: 'thud',
      night_shift_multi_agent_laptop: 'pop',
      claude_code_slash_cli: 'tap',
      rotary_mixing_knobs: 'tap',
      code_and_live_preview_split: 'zhhh',
      github_repo_star_rocket: 'pop',
      article_highlighter_zoom: 'pop',
      pixel_diff_clone_loop: 'pop',
      github_heatmap_and_runs: 'zhhh',
      social_feed_waterfall: 'tap',
      conveyor_belt_cleaner: 'pop',
      red_strike_live_rewrite: 'thud',
      ugly_to_apple_ui_morph: 'pop',
      retro_crt_1995_parallel: 'impact-boom',
      physical_cable_app_plug: 'pop',
      metallic_toolbox_explode: 'pop',
      card_fan_explosion_10x: 'riser',
      ab_hook_leaderboard: 'pop',
      cloud_vs_offline_shield: 'thud',
      voice_shortcut_waveform: 'tap',
      hook_shatter: 'glass-shatter',
      hook_alert: 'impact-boom',
      hook_versus: 'zhhh',
      hook_stat: 'impact-boom',
      hook_question: 'glass-shatter',
      dot_matrix_zoom: 'pop',
      neural_scan: 'thud',
      dual_stopwatch: 'tap',
      rotary_console: 'tap',
      pixel_diff: 'pop',
      humanizer_belt: 'tap',
      headline_news: 'pop',
      counter_flip: 'thud',
      alert_rule: 'thud',
      myth_vs_fact: 'pop',
      source_quote: 'pop',
      chart_curve: 'zhhh',
      ui_window: 'tap',
      timeline_steps: 'tap',
      gauge: 'zhhh',
      comparison_bars: 'riser',
      toggles_switch: 'tap',
      checklist_audit: 'tap',
      key_points: 'pop',
      terminal_flow: 'pop',
      cta_card: 'pop-back',
    };

    return {
      id: `beat-${idx + 1}`,
      visualType: vt,
      layoutHint: blueprint.layouts[idx],
      sfxKind: sfxByVt[vt] || 'tap',
      brollKey: brollPick?.primaryId || 'biz_saas_mrr_rocket',
      subBrollKeys: brollPick?.subBrollKeys || [brollPick?.primaryId || 'biz_saas_mrr_rocket'],
      brollCaption: brollPick?.caption || condenseVisualHeadline(content.title, 3, 28),
      ...content,
    };
  });

  const catTag = input.category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return {
    hookText: hookLine,
    youtubeTitle: cleanTheme.slice(0, 58),
    caption: `${hookLine}\n\nEnregistre ce Short et abonne-toi pour recevoir les prochains décryptages.`,
    hashtags: [`#${catTag || 'decryptage'}`, '#actualite', '#france', '#shorts'].slice(0, 4),
    beats,
  };
}
