import type {
  BatchBeatSpec,
  DynamicIconKind,
  DynamicVisualType,
  StoryBlueprintId,
  ParsedCustomTopic,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import { getBrollSequenceForTopic, isDevOrCodeTopic, type BrollKey } from './brollKeys';

export interface ElevenLabsCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface StoryBlueprintBeatTemplate {
  role: NonNullable<BatchBeatSpec['beatRole']>;
  visualType: DynamicVisualType;
  layoutHint: 'split' | 'fullscreen';
  goal: string;
}

export interface StoryBlueprintSpec {
  id: StoryBlueprintId;
  label: string;
  hookType: DynamicVisualType;
  beats: StoryBlueprintBeatTemplate[];
}

export const STORY_BLUEPRINTS: Record<StoryBlueprintId, StoryBlueprintSpec> = {
  shock_mechanism: {
    id: 'shock_mechanism',
    label: 'Choc & Mécanisme',
    hookType: 'hook_shatter',
    beats: [
      { role: 'hook', visualType: 'hook_shatter', layoutHint: 'split', goal: 'Rupture immédiate avec 3 cartes choc + chiffre clé' },
      { role: 'context', visualType: 'counter_flip', layoutHint: 'split', goal: 'Fait chiffré daté + bascule avant/après' },
      { role: 'mechanism', visualType: 'timeline_steps', layoutHint: 'split', goal: 'Mécanisme exact en 4 étapes chronologiques' },
      { role: 'rehook', visualType: 'gauge', layoutHint: 'fullscreen', goal: 'Re-hook mi-vidéo avec indice mesuré + 3 déclencheurs' },
      { role: 'proof', visualType: 'comparison_bars', layoutHint: 'fullscreen', goal: 'Preuve comparative chiffrée à fort contraste' },
      { role: 'action', visualType: 'toggles_switch', layoutHint: 'split', goal: '3 réglages ou arbitrages concrets à activer/couper' },
      { role: 'payoff', visualType: 'verdict_quote', layoutHint: 'split', goal: 'Verdict synthétique + source vérifiable' },
      { role: 'cta', visualType: 'cta_card', layoutHint: 'split', goal: 'Question débat + appel à s’abonner' },
    ],
  },
  versus_debate: {
    id: 'versus_debate',
    label: 'Duel & Arbitrage',
    hookType: 'hook_vs_battle',
    beats: [
      { role: 'hook', visualType: 'hook_vs_battle', layoutHint: 'split', goal: 'Face-à-face direct Option A vs Option B' },
      { role: 'context', visualType: 'ledger_breakdown', layoutHint: 'fullscreen', goal: 'Ventilation chiffrée ligne par ligne du coût ou rendement' },
      { role: 'mechanism', visualType: 'comparison_bars', layoutHint: 'fullscreen', goal: 'Comparaison visuelle directe avec multiplicateur' },
      { role: 'rehook', visualType: 'verdict_quote', layoutHint: 'split', goal: 'Nuance clé que la majorité oublie' },
      { role: 'proof', visualType: 'radar_pillars', layoutHint: 'fullscreen', goal: 'Score sur 3 critères décisifs du sujet' },
      { role: 'action', visualType: 'toggles_switch', layoutHint: 'split', goal: '3 critères de bascule pour choisir sans se tromper' },
      { role: 'payoff', visualType: 'counter_flip', layoutHint: 'split', goal: 'Écart net final chiffré sur 12 mois' },
      { role: 'cta', visualType: 'cta_card', layoutHint: 'split', goal: 'Demande de camp en commentaire + abonnement' },
    ],
  },
  chronology_actu: {
    id: 'chronology_actu',
    label: 'Chronologie & Impact',
    hookType: 'hook_alert_card',
    beats: [
      { role: 'hook', visualType: 'hook_alert_card', layoutHint: 'split', goal: 'Alerte actu datée avec phrase surlignée + chiffre clé' },
      { role: 'context', visualType: 'timeline_steps', layoutHint: 'split', goal: 'Chronologie des faits en 4 dates/étapes claires' },
      { role: 'mechanism', visualType: 'ledger_breakdown', layoutHint: 'fullscreen', goal: 'Ce qui change concrètement en chiffres' },
      { role: 'rehook', visualType: 'verdict_quote', layoutHint: 'split', goal: 'Effet indirect ou clause peu connue' },
      { role: 'proof', visualType: 'gauge', layoutHint: 'fullscreen', goal: 'Niveau d’impact réel + 3 conséquences immédiates' },
      { role: 'action', visualType: 'checklist_action', layoutHint: 'split', goal: '3 réflexes concrets à vérifier dès cette semaine' },
      { role: 'payoff', visualType: 'comparison_bars', layoutHint: 'fullscreen', goal: 'Avant la mesure vs après application' },
      { role: 'cta', visualType: 'cta_card', layoutHint: 'split', goal: 'Prochain décryptage + abonnement' },
    ],
  },
  myth_buster: {
    id: 'myth_buster',
    label: 'Mythe vs Réalité',
    hookType: 'hook_myth_bust',
    beats: [
      { role: 'hook', visualType: 'hook_myth_bust', layoutHint: 'split', goal: 'Idée reçue cassée net dès la première phrase' },
      { role: 'context', visualType: 'comparison_bars', layoutHint: 'fullscreen', goal: 'Ce qu’on croit vs les chiffres réels' },
      { role: 'mechanism', visualType: 'verdict_quote', layoutHint: 'split', goal: 'Pourquoi cette croyance est trompeuse' },
      { role: 'rehook', visualType: 'counter_flip', layoutHint: 'split', goal: 'Le chiffre qui renverse la perspective' },
      { role: 'proof', visualType: 'ledger_breakdown', layoutHint: 'fullscreen', goal: 'Preuve chiffrée détaillée en 3 lignes' },
      { role: 'action', visualType: 'checklist_action', layoutHint: 'split', goal: '3 étapes pour corriger le tir immédiatement' },
      { role: 'payoff', visualType: 'radar_pillars', layoutHint: 'fullscreen', goal: 'Nouvel équilibre sur 3 axes mesurés' },
      { role: 'cta', visualType: 'cta_card', layoutHint: 'split', goal: 'Partage + abonnement' },
    ],
  },
  deep_dive_playbook: {
    id: 'deep_dive_playbook',
    label: 'Méthode & Leviers',
    hookType: 'hook_stat',
    beats: [
      { role: 'hook', visualType: 'hook_stat', layoutHint: 'split', goal: 'Chiffre d’accroche fort + promesse concrète' },
      { role: 'context', visualType: 'radar_pillars', layoutHint: 'fullscreen', goal: 'Diagnostic sur 3 piliers clés du problème' },
      { role: 'mechanism', visualType: 'toggles_switch', layoutHint: 'split', goal: 'Ce qu’on coupe vs ce qu’on automatise' },
      { role: 'rehook', visualType: 'timeline_steps', layoutHint: 'split', goal: 'Séquence d’exécution rapide en 4 temps' },
      { role: 'proof', visualType: 'gauge', layoutHint: 'fullscreen', goal: 'Taux d’efficacité terrain + 3 gains directs' },
      { role: 'action', visualType: 'checklist_action', layoutHint: 'split', goal: 'Checklist actionnable en 3 points' },
      { role: 'payoff', visualType: 'ledger_breakdown', layoutHint: 'fullscreen', goal: 'Bilan chiffré après application' },
      { role: 'cta', visualType: 'cta_card', layoutHint: 'split', goal: 'Prochain épisode + abonnement' },
    ],
  },
};

const BLUEPRINT_ORDER: StoryBlueprintId[] = [
  'shock_mechanism',
  'versus_debate',
  'chronology_actu',
  'myth_buster',
  'deep_dive_playbook',
];

export function getBlueprintLabel(blueprintId?: StoryBlueprintId): string {
  if (!blueprintId || !STORY_BLUEPRINTS[blueprintId]) return 'Choc & Mécanisme';
  return STORY_BLUEPRINTS[blueprintId].label;
}

export function selectStoryBlueprint(
  category: string,
  theme: string,
  batchIndex = 0,
  excludeIds?: Set<StoryBlueprintId>
): StoryBlueprintSpec {
  const hay = `${category} ${theme}`.toLowerCase();

  let preferred: StoryBlueprintId = 'shock_mechanism';
  if (/( vs |contre|ou |compar|livret|etf|arbitr|choisir|meilleur)/.test(hay)) {
    preferred = 'versus_debate';
  } else if (/(mythe|faux|erreur|piège|arnaque|mensonge|sous-factur|personne ne|arrêt|arret)/.test(hay)) {
    preferred = 'myth_buster';
  } else if (/(loi|décret|parlement|censure|janvier|2026|2027|actualit|politique|interdi|taxe|smic|paie)/.test(hay)) {
    preferred = 'chronology_actu';
  } else if (/(règle|outil|méthode|comment|astuce|productiv|fatigue|checklist|guide|\b\d+\s+(outil|erreur|règle|étape|habitudes))/i.test(hay)) {
    preferred = 'deep_dive_playbook';
  }

  if (excludeIds && excludeIds.size < BLUEPRINT_ORDER.length) {
    if (!excludeIds.has(preferred)) {
      return STORY_BLUEPRINTS[preferred];
    }
    const startOffset = Math.max(0, BLUEPRINT_ORDER.indexOf(preferred));
    for (let step = 1; step < BLUEPRINT_ORDER.length; step++) {
      const candidate = BLUEPRINT_ORDER[(startOffset + step) % BLUEPRINT_ORDER.length];
      if (!excludeIds.has(candidate)) {
        return STORY_BLUEPRINTS[candidate];
      }
    }
  }

  const safeIdx = Math.max(0, Math.floor(batchIndex));
  if (safeIdx === 0) {
    return STORY_BLUEPRINTS[preferred];
  }

  // Rotate across blueprints for subsequent items in the same batch so consecutive Shorts never look alike
  const startOffset = BLUEPRINT_ORDER.indexOf(preferred);
  const rotatedId = BLUEPRINT_ORDER[(Math.max(0, startOffset) + safeIdx) % BLUEPRINT_ORDER.length];
  return STORY_BLUEPRINTS[rotatedId];
}

export function sanitizeScriptText(text: string): string {
  return String(text || '')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Forces punchy, scannable on-screen headlines (max 5 words / 38 chars) so cards never become text walls.
 */
export function condenseVisualHeadline(text: string, maxWords = 5, maxChars = 38): string {
  const clean = sanitizeScriptText(text).replace(/[.:;!?]+$/g, '');
  if (!clean) return 'Décryptage';
  const words = clean.split(/\s+/).filter(Boolean).slice(0, maxWords);
  let joined = words.join(' ');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
  }
  return joined || clean.slice(0, maxChars);
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

/**
 * Estimates spoken token expansion for French TTS (e.g. "2026" -> "deux mille vingt-six", "80 %" -> "quatre-vingts pour cent").
 */
export function estimateSpokenWordWeight(line: string): number {
  const tokens = sanitizeScriptText(line).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  let total = 0;
  for (const tok of tokens) {
    if (/^(19|20)\d{2}[.,;:!?]*$/.test(tok)) {
      total += 3.5;
    } else if (/^[+-]?\d+(?:[.,]\d+)?[%€$kKmM]*[.,;:!?]*$/.test(tok)) {
      total += 2.3;
    } else if (/[%€$/]/.test(tok)) {
      total += 2.0;
    } else if (/^[,.;:!?…]+$/.test(tok)) {
      total += 0.2;
    } else {
      total += 1.0;
    }
  }
  return Math.max(1, total);
}

export function computeProportionalWords(
  text: string,
  durationSec: number
): WhisperWord[] {
  const clean = sanitizeScriptText(text);
  const rawWords = clean.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const safeDuration = Math.max(4, durationSec);
  const weights = rawWords.map((w) => {
    if (/^(19|20)\d{2}[.,;:!?]*$/.test(w)) return 10;
    if (/\d/.test(w)) return Math.max(6, w.length + 3);
    return Math.max(2, w.length);
  });
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
      const lastEnd = words[words.length - 1].end;
      return {
        words,
        durationSec: Number((lastEnd + 0.85).toFixed(2)),
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
    spec.visualType === 'ledger_breakdown' ||
    spec.visualType === 'radar_pillars'
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

  const beatWeights = beatsSpec.map((b) => estimateSpokenWordWeight(b.spokenLine));
  const totalWeight = beatWeights.reduce((a, b) => a + b, 0);
  const cumulativeFractions: number[] = [];
  let running = 0;
  for (const w of beatWeights) {
    running += w;
    cumulativeFractions.push(running / totalWeight);
  }

  let wordCursor = 0;
  let prevEnd = 0;

  const beats = beatsSpec.map((spec, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === beatsSpec.length - 1;
    const from = isFirst ? 0 : prevEnd;
    const remainingBeats = beatsSpec.length - 1 - idx;

    let to: number;
    if (isLast) {
      to = safeDuration;
    } else if (words.length >= beatsSpec.length) {
      const idealIdx = Math.round(cumulativeFractions[idx] * words.length) - 1;
      const minIdx = Math.min(words.length - 1 - remainingBeats, wordCursor);
      const maxIdx = Math.max(minIdx, words.length - 1 - remainingBeats);
      const searchStart = Math.max(minIdx, idealIdx - 4);
      const searchEnd = Math.min(maxIdx, idealIdx + 4);

      let bestIdx = Math.max(minIdx, Math.min(maxIdx, idealIdx));
      let bestScore = -Infinity;

      for (let k = searchStart; k <= searchEnd; k++) {
        const tok = words[k].word;
        const nextStart = k + 1 < words.length ? words[k + 1].start : safeDuration;
        const pauseGap = nextStart - words[k].end;
        let score = -Math.abs(k - idealIdx) * 3.5;
        if (/[.!?…]$/.test(tok)) score += 100;
        else if (/[,;:]$/.test(tok)) score += 45;
        if (pauseGap >= 0.16) score += 35;
        else if (pauseGap >= 0.08) score += 14;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = k;
        }
      }

      const nextWordStart =
        bestIdx + 1 < words.length ? words[bestIdx + 1].start : safeDuration;
      const boundary = (words[bestIdx].end + nextWordStart) / 2;
      const minStep = isFirst ? 2.2 : 1.5;
      const maxAllowedTo = safeDuration - remainingBeats * 1.5;
      to = Number(Math.max(from + minStep, Math.min(maxAllowedTo, boundary)).toFixed(2));
      wordCursor = bestIdx + 1;
    } else {
      const weight = beatWeights[idx] / totalWeight;
      const maxAllowedTo = safeDuration - remainingBeats * 1.5;
      to = Number(Math.max(from + 1.5, Math.min(maxAllowedTo, from + safeDuration * weight)).toFixed(2));
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

  const typeMap: Record<BatchBeatSpec['visualType'], ShortProject['motionTrack'][number]['type']> = {
    hook_shatter: 'typography',
    hook_stat: 'counter',
    hook_vs_battle: 'typography',
    hook_myth_bust: 'typography',
    hook_alert_card: 'card',
    counter_flip: 'counter',
    comparison_bars: 'chart',
    timeline_steps: 'card',
    toggles_switch: 'card',
    terminal_flow: 'card',
    ledger_breakdown: 'chart',
    verdict_quote: 'typography',
    radar_pillars: 'chart',
    checklist_action: 'card',
    key_points: 'card',
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
    if (idx === 0) {
      const act2At = Number(Math.max(1.2, Math.min(2.4, (b.to - b.from) * 0.48)).toFixed(2));
      if (b.visualType === 'hook_shatter' || b.visualType === 'hook_myth_bust') {
        sfxTrack.push({
          id: 'sfx-hook-shatter',
          sound: 'glass-shatter',
          start: act2At,
          volume: 0.44,
        });
        sfxTrack.push({
          id: 'sfx-hook-boom',
          sound: 'impact-boom',
          start: act2At,
          volume: 0.38,
        });
      } else {
        sfxTrack.push({
          id: 'sfx-hook-accent',
          sound: b.sfxKind || 'impact-boom',
          start: act2At,
          volume: 0.38,
        });
      }
      return;
    }

    const sound =
      b.sfxKind ||
      (b.layout === 'fullscreen' && beats[idx - 1]?.layout === 'split'
        ? 'zhhh'
        : idx === beats.length - 1
          ? 'pop-back'
          : undefined);
    if (!sound) return;

    const at =
      idx === beats.length - 1
        ? Number(Math.min(safeDuration - 0.3, b.from + 0.65).toFixed(2))
        : Number(Math.max(0.1, b.from + 0.12).toFixed(2));
    if (at < safeDuration - 0.2) {
      sfxTrack.push({
        id: `sfx-${idx + 1}`,
        sound,
        start: at,
        volume: sound === 'riser' ? 0.26 : 0.34,
      });
    }
    if (idx === beats.length - 1) {
      const bellAt = Number(Math.min(safeDuration - 0.2, at + 0.12).toFixed(2));
      sfxTrack.push({
        id: `sfx-${idx + 1}-bell`,
        sound: 'bell',
        start: bellAt,
        volume: 0.3,
      });
    }
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

function pickTopicIcon(category: string, theme: string): DynamicIconKind {
  const hay = `${category} ${theme}`.toLowerCase();
  if (/(réunion|meeting|calendrier|agenda)/.test(hay)) return 'calendar';
  if (/(ia|ai|agent|code|dev|résumé|llm)/.test(hay)) return 'ai';
  if (/(euro|salaire|smic|loyer|économie|crédit|banque|livret|etf|freelance|impôt|taxe)/.test(hay)) return 'euro';
  if (/(loi|parlement|censure|politique|décret|interdi)/.test(hay)) return 'law';
  if (/(temps|heure|minute|productiv|fatigue)/.test(hay)) return 'clock';
  if (/(sécurité|risque|piège|arnaque|protection)/.test(hay)) return 'shield';
  return 'chart';
}

export function extractPrimaryTopicStat(theme: string, angle = ''): {
  stat: string;
  label: string;
  hasExplicitNumber: boolean;
} {
  const hay = `${theme} ${angle}`;
  const pct = hay.match(/([+-]?\d{1,3}(?:[.,]\d+)?\s*%)/);
  if (pct) return { stat: pct[1].replace(/\s+%/, ' %'), label: 'Écart relevé', hasExplicitNumber: true };

  const eur = hay.match(/(\d+(?:[.,]\d+)?\s*(?:€|euros?|k\/mois|k€|M€))/i);
  if (eur) return { stat: eur[1], label: 'Montant en jeu', hasExplicitNumber: true };

  const mult = hay.match(/(\d+\s*(?:fois|×|x)\b)/i);
  if (mult) return { stat: mult[1], label: 'Facteur clé', hasExplicitNumber: true };

  const dur = hay.match(/(\d+\s*(?:min|minutes?|heures?|h|jours?|ans?)\b)/i);
  if (dur) return { stat: dur[1], label: 'Repère temporel', hasExplicitNumber: true };

  return { stat: '2026', label: 'Analyse chiffrée', hasExplicitNumber: false };
}

function rotateBrolls(baseSeq: BrollKey[], batchIndex: number): BrollKey[] {
  if (baseSeq.length === 0) return ['business'];
  const shift = Math.max(0, batchIndex) % baseSeq.length;
  return [...baseSeq.slice(shift), ...baseSeq.slice(0, shift)];
}

export function buildFallbackBatchScript(input: {
  theme: string;
  category: string;
  angle?: string;
  hookHint?: string;
  sources?: string;
  blueprintId?: StoryBlueprintId;
  batchIndex?: number;
}): {
  blueprintId: StoryBlueprintId;
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  beats: BatchBeatSpec[];
} {
  const cleanTheme = sanitizeScriptText(input.theme);
  const cleanAngle = sanitizeScriptText(input.angle || '');
  const shortTopic = condenseVisualHeadline(cleanTheme, 4, 30);
  const topicStat = extractPrimaryTopicStat(cleanTheme, cleanAngle);
  const iconKind = pickTopicIcon(input.category, cleanTheme);
  const isDev = isDevOrCodeTopic(input.category, cleanTheme);
  const batchIdx = Math.max(0, input.batchIndex || 0);

  const blueprint = input.blueprintId && STORY_BLUEPRINTS[input.blueprintId]
    ? STORY_BLUEPRINTS[input.blueprintId]
    : selectStoryBlueprint(input.category, cleanTheme, batchIdx);

  const brollPool = rotateBrolls(getBrollSequenceForTopic(input.category, cleanTheme), batchIdx);
  const pickBroll = (i: number): BrollKey => brollPool[i % brollPool.length];

  const vsMatch = cleanTheme.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*:|\s+en\s+\d{4}|$)/i);
  const sideA = vsMatch ? condenseVisualHeadline(vsMatch[1], 3, 20) : 'Option classique';
  const sideB = vsMatch ? condenseVisualHeadline(vsMatch[2], 3, 20) : 'Nouvelle approche';
  const sourceShort = input.sources ? condenseVisualHeadline(input.sources, 3, 26) : 'Données 2026';

  const cleanHookStem = cleanTheme.replace(/\s*[?!.]+\s*$/, '').trim();
  const isInterrogativeOrClause = /(\?|\b(?:pourquoi|comment|quand|qui|faut-il|peut-on|remplacent-ils|vaut-il|est-ce)\b)/i.test(
    cleanTheme
  );

  const hookLine = sanitizeScriptText(
    input.hookHint ||
      (blueprint.id === 'versus_debate'
        ? `${sideA} contre ${sideB} : voici le chiffre que personne ne calcule.`
        : blueprint.id === 'myth_buster'
          ? isInterrogativeOrClause
            ? `${cleanHookStem} ? Les chiffres prouvent l’inverse de ce qu’on répète.`
            : `On répète partout la même erreur sur ${shortTopic.toLowerCase()}, mais les chiffres prouvent l’inverse.`
          : blueprint.id === 'chronology_actu'
            ? isInterrogativeOrClause
              ? `${cleanHookStem} ? Ce qui vient de basculer change déjà la donne.`
              : `Ce qui vient de basculer sur ${shortTopic.toLowerCase()} change déjà la donne.`
            : isInterrogativeOrClause
              ? `${cleanHookStem} ? Voici l’écart concret qui change tout.`
              : `${shortTopic} vient de basculer, et cet écart change tout en 2026.`)
  );

  const statDisplay = topicStat.hasExplicitNumber ? topicStat.stat : '×3';
  const defaultBullets = [
    `Impact direct sur ${condenseVisualHeadline(shortTopic, 3, 22)}`,
    cleanAngle ? condenseVisualHeadline(cleanAngle, 4, 28) : 'Vérification chiffrée terrain',
    'Application dès cette semaine',
  ];

  const beats: BatchBeatSpec[] = blueprint.beats.map((tpl, idx) => {
    let vt: DynamicVisualType = tpl.visualType;
    if (vt === 'terminal_flow' && !isDev) {
      vt = 'ledger_breakdown';
    }
    const brollKey = idx === 7 ? 'studio' : pickBroll(idx);
    const common = {
      id: `beat-${idx + 1}`,
      blueprintId: blueprint.id,
      beatRole: tpl.role,
      visualType: vt,
      layoutHint: tpl.layoutHint,
      brollKey,
      iconKind,
    };

    if (idx === 0) {
      return {
        ...common,
        title: shortTopic,
        shortLabel: blueprint.label,
        screenLabel: `${input.category.toUpperCase()} · SIGNAL`,
        spokenLine: hookLine,
        brollCaption: `Focus · ${shortTopic}`,
        stampWord: blueprint.id === 'myth_buster' ? 'FAUX' : blueprint.id === 'versus_debate' ? 'DUEL' : 'BASCULE',
        statValue: statDisplay,
        statLabel: topicStat.label,
        hookCards:
          blueprint.id === 'versus_debate'
            ? [
                { label: sideA, sub: 'Réflexe historique', iconKind: 'clock', tone: 'dark' },
                { label: 'VS', sub: statDisplay, iconKind: 'chart', tone: 'light' },
                { label: sideB, sub: 'Alternative 2026', iconKind, tone: 'accent' },
              ]
            : [
                { label: 'Avant', sub: 'Ancien réflexe', iconKind: 'clock', tone: 'dark' },
                { label: statDisplay, sub: sourceShort, iconKind, tone: 'light' },
                { label: 'En 2026', sub: 'Nouveau standard', iconKind: 'rocket', tone: 'accent' },
              ],
        subStats: [
          { value: statDisplay, label: topicStat.label },
          { value: sourceShort, label: 'Source terrain' },
        ],
        comparisonLeft: { label: sideA, value: 'Réflexe subi', ratio: 0.82 },
        comparisonRight: { label: sideB, value: statDisplay, ratio: 0.34 },
        quoteText: hookLine,
        highlightPhrase: shortTopic,
        quoteSource: sourceShort,
        sfxKind: 'glass-shatter',
      };
    }

    if (idx === 1) {
      return {
        ...common,
        title: `Le point de départ`,
        shortLabel: 'Contexte',
        screenLabel: 'FAIT SOURCE',
        spokenLine:
          cleanAngle ||
          `D’abord, regardons le point de départ : sur ${shortTopic.toLowerCase()}, le coût caché passe souvent inaperçu.`,
        brollCaption: `Constat · ${sourceShort}`,
        statValue: statDisplay,
        statLabel: `Mesuré sur ${shortTopic}`,
        comparisonLeft: { label: 'Modèle subi', value: 'Coût caché', ratio: 0.84 },
        comparisonRight: { label: 'Approche mesurée', value: statDisplay, ratio: 0.28 },
        steps: ['Situation', 'Blocage', 'Déclic', 'Mesure'],
        ledgerRows: [
          { label: 'Situation actuelle', value: 'Dispersion', delta: 'Friction', highlight: false },
          { label: 'Point de rupture', value: statDisplay, delta: sourceShort, highlight: true },
          { label: 'Marges perdues', value: 'Sous-évaluées', delta: 'À corriger', highlight: false },
        ],
        bullets: defaultBullets,
        sfxKind: 'thud',
      };
    }

    if (idx === 2) {
      return {
        ...common,
        title: `Comment ça fonctionne`,
        shortLabel: 'Mécanisme',
        screenLabel: 'MÉCANISME',
        spokenLine: `Concrètement, le basculement vient de l’enchaînement : repérer le goulot, chiffrer l’écart et corriger au bon endroit.`,
        brollCaption: 'Enchaînement réel',
        steps: ['Repérer', 'Chiffrer', 'Arbitrer', 'Stabiliser'],
        stampWord: 'LOGIQUE',
        comparisonLeft: { label: sideA, value: 'Subi', ratio: 0.86 },
        comparisonRight: { label: sideB, value: 'Maîtrisé', ratio: 0.32 },
        ledgerRows: [
          { label: 'Étape 1 · Diagnostic', value: 'Mesure nette', delta: 'Clair' },
          { label: 'Étape 2 · Arbitrage', value: statDisplay, delta: 'Décisif', highlight: true },
          { label: 'Étape 3 · Suivi', value: 'Régulier', delta: 'Durable' },
        ],
        quoteText: `Ce n’est pas un détail technique : c’est la structure du calcul qui fait toute la différence.`,
        highlightPhrase: 'la structure du calcul',
        quoteSource: sourceShort,
        toggles: [
          { label: 'Décision à l’instinct', before: 'ACTIF', after: 'COUPÉ', activeAfter: false },
          { label: 'Calcul coût réel', before: 'OFF', after: 'ON', activeAfter: true },
          { label: 'Suivi chiffré', before: 'OFF', after: 'ON', activeAfter: true },
        ],
        sfxKind: 'tap',
      };
    }

    if (idx === 3) {
      return {
        ...common,
        title: `Le point aveugle`,
        shortLabel: 'Re-hook',
        screenLabel: 'CE QU’ON OUBLIE',
        spokenLine: `Mais le vrai piège n’est pas celui qu’on croit : la majorité regarde le chiffre de surface et rate l’effet cumulé.`,
        brollCaption: 'Effet cumulé caché',
        gaugePct: 84,
        statValue: statDisplay,
        statLabel: 'Poids de l’effet cumulé',
        bullets: defaultBullets,
        steps: ['Signal', 'Piège', 'Ajustement', 'Impact'],
        quoteText: `Ce qui compte n’est pas le chiffre affiché le jour 1, mais l’écart cumulé sur 12 mois.`,
        highlightPhrase: 'l’écart cumulé sur 12 mois',
        quoteSource: shortTopic,
        comparisonLeft: { label: 'Effet jour 1', value: 'Faible', ratio: 0.28 },
        comparisonRight: { label: 'Effet 12 mois', value: 'Majeur', ratio: 0.9 },
        sfxKind: 'zhhh',
      };
    }

    if (idx === 4) {
      return {
        ...common,
        title: `L’écart chiffré`,
        shortLabel: 'Preuve',
        screenLabel: 'PREUVE TERRAIN',
        spokenLine: `Quand on met les deux options face à face, la différence devient nette sur la durée et sur le résultat.`,
        brollCaption: 'Comparatif chiffré',
        comparisonLeft: { label: `${sideA}`, value: 'Coût subi', ratio: 0.88 },
        comparisonRight: { label: `${sideB}`, value: statDisplay, ratio: 0.3 },
        multiplierBadge: 'NET',
        statValue: statDisplay,
        statLabel: `Différence observée sur ${shortTopic}`,
        gaugePct: 86,
        bullets: defaultBullets,
        ledgerRows: [
          { label: 'Référence passive', value: 'Base 100', delta: 'Érodée' },
          { label: 'Option optimisée', value: statDisplay, delta: 'Avantage net', highlight: true },
          { label: 'Fiabilité 2026', value: 'Vérifiée', delta: sourceShort },
        ],
        sfxKind: 'riser',
      };
    }

    if (idx === 5) {
      return {
        ...common,
        title: `3 leviers concrets`,
        shortLabel: 'Action',
        screenLabel: 'PLAN D’ACTION',
        spokenLine: `Pour en tirer parti dès cette semaine, applique ces trois réglages simples dans l’ordre.`,
        brollCaption: 'Mise en application',
        toggles: [
          { label: 'Piloter sans chiffres', before: 'ACTIF', after: 'COUPÉ', activeAfter: false },
          { label: `Suivre ${condenseVisualHeadline(shortTopic, 2, 18)}`, before: 'OFF', after: 'ON', activeAfter: true },
          { label: 'Vérifier chaque mois', before: 'OFF', after: 'ON', activeAfter: true },
        ],
        bullets: [
          `Poser un repère chiffré sur ${condenseVisualHeadline(shortTopic, 2, 16)}`,
          'Supprimer la friction principale',
          'Réévaluer au bout de 30 jours',
        ],
        sfxKind: 'tap',
      };
    }

    if (idx === 6) {
      return {
        ...common,
        title: `Le verdict final`,
        shortLabel: 'Verdict',
        screenLabel: 'CONCLUSION',
        spokenLine: input.sources
          ? `Selon ${sanitizeScriptText(input.sources)}, l’écart se creuse vite entre ceux qui ajustent maintenant et ceux qui attendent.`
          : `Résultat : ceux qui s’adaptent dès maintenant gardent une longueur d’avance durable.`,
        brollCaption: `Verdict · ${sourceShort}`,
        statValue: statDisplay,
        statLabel: 'Avantage cumulé',
        quoteText: `Celui qui ajuste ses paramètres aujourd’hui transforme une contrainte en avantage net.`,
        highlightPhrase: 'en avantage net',
        quoteSource: sourceShort,
        ledgerRows: [
          { label: 'Avant ajustement', value: 'Subi', delta: 'Coût continu' },
          { label: 'Après réglage', value: statDisplay, delta: 'Gain confirmé', highlight: true },
        ],
        comparisonLeft: { label: 'Attendre', value: 'Écart subi', ratio: 0.85 },
        comparisonRight: { label: 'Ajuster tôt', value: 'Gain net', ratio: 0.25 },
        bullets: defaultBullets,
        terminalCmd: isDev ? `> audit --${normalizeTerminalSlug(shortTopic)}` : undefined,
        terminalOut: isDev
          ? ['✓ Goulot identifié', '✓ Latence réduite', '✓ Pipeline vérifié']
          : undefined,
        sfxKind: 'pop',
      };
    }

    return {
      ...common,
      title: `Et toi, quel choix ?`,
      shortLabel: 'CTA',
      screenLabel: 'PROCHAIN ÉPISODE',
      spokenLine: `Dis-moi en commentaire ce que tu en penses, et abonne-toi pour ne pas rater le prochain décryptage.`,
      brollCaption: 'Nouveau décryptage bientôt',
      statValue: '@alex.decode',
      statLabel: `${input.category} · Décryptages 2026`,
      sfxKind: 'pop-back',
    };
  });

  const catTag = input.category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return {
    blueprintId: blueprint.id,
    hookText: hookLine,
    youtubeTitle: cleanTheme.slice(0, 58),
    caption: `${hookLine}\n\nQuel est ton avis sur ${shortTopic.toLowerCase()} ? Dis-le en commentaire.`,
    hashtags: [`#${catTag || 'decryptage'}`, '#actualite', '#france', '#shorts'].slice(0, 4),
    beats,
  };
}

function normalizeTerminalSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18) || 'audit-2026'
  );
}
