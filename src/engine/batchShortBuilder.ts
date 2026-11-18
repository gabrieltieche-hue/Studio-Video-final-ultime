import type {
  BatchBeatSpec,
  DynamicIconKind,
  DynamicVisualType,
  ParsedCustomTopic,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import { getBrollSequenceForTopic, isDevOrCodeTopic } from './brollKeys';

export interface ElevenLabsCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ChoreographyBlueprint {
  id:
    | 'tech_breakdown'
    | 'breaking_alert'
    | 'paradox_buster'
    | 'shock_stat_investigation'
    | 'myth_question';
  label: string;
  hookType: Extract<
    DynamicVisualType,
    'hook_shatter' | 'hook_stat' | 'hook_alert' | 'hook_versus' | 'hook_question'
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
    id: 'tech_breakdown',
    label: 'Rupture Tech & Mécanisme',
    hookType: 'hook_shatter',
    beatTypes: [
      'hook_shatter',
      'counter_flip',
      'timeline_steps',
      'gauge',
      'comparison_bars',
      'toggles_switch',
      'terminal_flow',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Rupture : 1) Choc visuel immédiat 2) Chiffre clé caché 3) Mécanisme en 4 temps 4) Pivot plein écran jauge 5) Avant vs Après 6) 3 réglages concrets 7) Preuve ou test concret 8) Question & CTA.',
  },
  {
    id: 'breaking_alert',
    label: 'Alerte Règle & Échéance',
    hookType: 'hook_alert',
    beatTypes: [
      'hook_alert',
      'alert_rule',
      'counter_flip',
      'comparison_bars',
      'timeline_steps',
      'checklist_audit',
      'gauge',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'split', 'split', 'fullscreen', 'split'],
    narrativeGuide:
      'Arc Alerte Officielle : 1) Date/règle choc 2) Ce qui change concrètement 3) Chiffre d’impact sur le quotidien 4) Comparatif avant/après plein écran 5) Chronologie d’application 6) 3 réflexes à vérifier 7) Indice de risque/impact plein écran 8) Question & CTA.',
  },
  {
    id: 'paradox_buster',
    label: 'Paradoxe & Duel Brut',
    hookType: 'hook_versus',
    beatTypes: [
      'hook_versus',
      'myth_vs_fact',
      'comparison_bars',
      'counter_flip',
      'gauge',
      'checklist_audit',
      'key_points',
      'cta_card',
    ],
    layouts: ['split', 'split', 'fullscreen', 'split', 'fullscreen', 'split', 'split', 'split'],
    narrativeGuide:
      'Arc Duel / Paradoxe : 1) Opposition frontale A vs B 2) Mythe cru vs réalité mesurée 3) Écart chiffré plein écran 4) Pourquoi l’écart se creuse 5) Jauge de bascule plein écran 6) Plan d’adaptation 7) Synthèse terrain 8) Question & CTA.',
  },
  {
    id: 'shock_stat_investigation',
    label: 'Enquête Chiffre Choc',
    hookType: 'hook_stat',
    beatTypes: [
      'hook_stat',
      'counter_flip',
      'timeline_steps',
      'gauge',
      'myth_vs_fact',
      'toggles_switch',
      'comparison_bars',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'split', 'split', 'fullscreen', 'split'],
    narrativeGuide:
      'Arc Enquête Chiffrée : 1) Compteur choc qui défile 2) D’où vient le chiffre 3) Effet domino en 4 étapes 4) Thermomètre/jauge plein écran 5) Idée reçue démontée 6) Bascule pratique 7) Bilan chiffré plein écran 8) Question & CTA.',
  },
  {
    id: 'myth_question',
    label: 'Question Piège & Déclic',
    hookType: 'hook_question',
    beatTypes: [
      'hook_question',
      'myth_vs_fact',
      'timeline_steps',
      'comparison_bars',
      'alert_rule',
      'checklist_audit',
      'gauge',
      'cta_card',
    ],
    layouts: ['split', 'split', 'split', 'fullscreen', 'split', 'split', 'fullscreen', 'split'],
    narrativeGuide:
      'Arc Question Piège : 1) Question contre-intuitive barrée en direct 2) Vraie explication sourcée 3) Comment le piège fonctionne 4) Comparaison nette plein écran 5) Nouvelle règle à retenir 6) 3 actions immédiates 7) Score d’efficacité plein écran 8) Question & CTA.',
  },
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
    /(novembre|janvier|1er|dès le|loi|décret|bancaire|découvert|smic|réforme|interdit|impôt|censure|amende)/.test(
      hay
    )
  ) {
    base = SHORT_CHOREOGRAPHIES[1]; // breaking_alert
  } else if (/(paradoxe|vs|contre|ne .* pas|mais|pourtant|pendant que|juniors|seniors)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[2]; // paradox_buster
  } else if (
    /(pourquoi|comment|piège|mythe|erreur|secret|règle des|fatiguent|mental|conseil)/.test(hay) &&
    !/(réunion|meeting)/.test(hay)
  ) {
    base = SHORT_CHOREOGRAPHIES[4]; // myth_question
  } else if (/\d+\s*%/.test(hay) && !/(réunion|meeting)/.test(hay)) {
    base = SHORT_CHOREOGRAPHIES[3]; // shock_stat_investigation
  } else {
    base = SHORT_CHOREOGRAPHIES[0]; // tech_breakdown
  }

  // Rotate inside a batch so consecutive Shorts NEVER share the exact same hook!
  if (v > 0) {
    const startIdx = SHORT_CHOREOGRAPHIES.findIndex((c) => c.id === base.id);
    base = SHORT_CHOREOGRAPHIES[(startIdx + v) % SHORT_CHOREOGRAPHIES.length];
  }

  // Never put terminal_flow on non-dev / non-tech topics!
  const beatTypes = [...base.beatTypes] as ChoreographyBlueprint['beatTypes'];
  if (!isDev) {
    for (let i = 0; i < beatTypes.length; i++) {
      if (beatTypes[i] === 'terminal_flow') {
        beatTypes[i] = i % 2 === 0 ? 'myth_vs_fact' : 'checklist_audit';
      }
    }
  }

  return {
    ...base,
    beatTypes,
  };
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
 * Keeps spoken lines per beat balanced (~10-18 words) so no beat freezes 11s on one card.
 */
export function trimSpokenLineForPacing(text: string, maxWords = 19): string {
  const clean = sanitizeScriptText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  const sliced = words.slice(0, maxWords).join(' ').replace(/[,;:]+$/, '');
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
  if (spec.visualType === 'gauge' || spec.visualType === 'comparison_bars') {
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
    hook_shatter: 'typography',
    hook_stat: 'counter',
    hook_alert: 'typography',
    hook_versus: 'typography',
    hook_question: 'typography',
    counter_flip: 'counter',
    comparison_bars: 'chart',
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
    if (idx === 0) {
      const act2At = Number(Math.max(1.4, Math.min(2.6, (b.to - b.from) * 0.48)).toFixed(2));
      const primarySfx =
        b.visualType === 'hook_alert'
          ? 'impact-boom'
          : b.visualType === 'hook_versus'
            ? 'zhhh'
            : b.visualType === 'hook_stat'
              ? 'impact-boom'
              : 'glass-shatter';
      const secondarySfx =
        b.visualType === 'hook_versus'
          ? 'thud'
          : b.visualType === 'hook_alert'
            ? 'riser'
            : b.visualType === 'hook_stat'
              ? 'pop'
              : 'impact-boom';

      sfxTrack.push({
        id: 'sfx-hook-shatter',
        sound: primarySfx,
        start: act2At,
        volume: 0.46,
      });
      sfxTrack.push({
        id: 'sfx-hook-boom',
        sound: secondarySfx,
        start: act2At,
        volume: 0.38,
      });
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
        ? Number(Math.min(safeDuration - 0.3, b.from + 0.7).toFixed(2))
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
  toggles: Array<{ label: string; before: string; after: string; activeAfter: boolean }>;
  beatTitles: [string, string, string, string, string, string];
  ctaTitle: string;
  ctaTagline: string;
}

function buildDomainPreset(category: string, theme: string, statVal: string): DomainPreset {
  const hay = `${category} ${theme}`.toLowerCase();

  if (/(banque|découvert|crédit|agios|frais|livret)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '20 NOV' : statVal,
      statLabel: 'Nouvelles règles bancaires',
      stampWord: 'ENCADRÉ',
      leftCard: { label: 'Ancien découvert', value: 'Flou', sub: 'Frais surprises' },
      rightCard: { label: 'Règle 2026', value: 'Encadré', sub: 'Crédit vérifié' },
      compLeft: { label: 'Découvert subi avant', value: '180 €/an', ratio: 0.88 },
      compRight: { label: 'Avec plafond & alerte', value: '24 €/an', ratio: 0.24 },
      multiplier: '÷7,5',
      gaugePct: 78,
      steps: ['Seuil fixé', 'Vérif revenus', 'Alerte SMS', 'Frais bloqués'],
      bullets: ['Solvabilité contrôlée', 'Coût total affiché', 'Frais d’incident plafonnés'],
      toggles: [
        { label: 'Découvert sans plafond clair', before: 'ACTIF', after: 'INTERDIT', activeAfter: false },
        { label: 'Calcul complet avant accord', before: 'OFF', after: 'OBLIGATOIRE', activeAfter: true },
        { label: 'Alerte avant frais bancaires', before: 'OFF', after: 'ACTIVÉE', activeAfter: true },
      ],
      beatTitles: [
        'Règle du 20 novembre',
        'Mécanisme anti-agios',
        'Coût réel des frais',
        'Les 4 étapes bancaires',
        '3 réflexes compte sain',
        'Ce que fixe la loi',
      ],
      ctaTitle: 'Garde ton pouvoir d’achat',
      ctaTagline: 'Argent, Banques & Décryptages',
    };
  }

  if (/(junior|senior|embauche|emploi|smic|salaire|chômage)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '-28 %' : statVal,
      statLabel: 'Impact sur l’emploi mesuré',
      stampWord: 'FRACTURE',
      leftCard: { label: 'Profils seniors', value: '98 %', sub: 'Postes maintenus' },
      rightCard: { label: 'Jeunes diplômés', value: '-28 %', sub: 'Offres fermées' },
      compLeft: { label: 'Offres juniors 2023', value: '100 base', ratio: 0.9 },
      compRight: { label: 'Offres juniors 2026', value: '72 base', ratio: 0.56 },
      multiplier: '-28 %',
      gaugePct: 72,
      steps: ['Tâches simples', 'Reprises IA', 'Moins de CDI', 'Rôle seniorisé'],
      bullets: ['Premiers postes filtrés', 'Compétence métier clé', 'Audit IA exigé'],
      toggles: [
        { label: 'CV générique sans preuve', before: 'CLASSIQUE', after: 'FILTRÉ', activeAfter: false },
        { label: 'Maîtrise flux & contrôle IA', before: 'OPTION', after: 'EXIGÉ', activeAfter: true },
        { label: 'Projets chiffrés vérifiables', before: 'RARE', after: 'PRIORITÉ', activeAfter: true },
      ],
      beatTitles: [
        'La porte se ferme',
        'Pourquoi l’IA filtre',
        'Chute des offres juniors',
        'Seniors vs Débutants',
        '3 preuves qui recrutent',
        'Verdict marché 2026',
      ],
      ctaTitle: 'Anticipe le marché 2026',
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
      statLabel: 'Citoyens directement concernés',
      stampWord: 'VOTÉ',
      leftCard: { label: 'Avant le vote', value: 'Libre', sub: 'Zéro contrôle' },
      rightCard: { label: 'Nouveau cadre', value: 'Strict', sub: 'Sanctions prévues' },
      compLeft: { label: 'Exposition sans filtre', value: '3 h 15/j', ratio: 0.88 },
      compRight: { label: 'Avec cadre appliqué', value: '45 min/j', ratio: 0.3 },
      multiplier: '÷4,3',
      gaugePct: 81,
      steps: ['Projet déposé', 'Débat public', 'Contrôle âge', 'Application'],
      bullets: ['Vérification renforcée', 'Plateformes responsabilisées', 'Effet immédiat'],
      toggles: [
        { label: 'Auto-déclaration naïve', before: 'EN COURS', after: 'STOPPÉE', activeAfter: false },
        { label: 'Contrôle tiers vérifié', before: 'OFF', after: 'ACTIF', activeAfter: true },
        { label: 'Sanctions plateformes', before: 'FAIBLES', after: 'APPLIQUÉES', activeAfter: true },
      ],
      beatTitles: [
        'Le nouveau texte',
        'Comment ça s’applique',
        'Impact sur l’usage',
        'Avant vs Nouveau cadre',
        '3 leviers de contrôle',
        'Ce que change la loi',
      ],
      ctaTitle: 'Comprends les vraies règles',
      ctaTagline: 'Politique, Lois & Société',
    };
  }

  if (/(agents|entreprise|entreprises|économies|business|rentabil|productivité|coût)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '90 %' : statVal,
      statLabel: 'Projets IA sans gain financier net',
      stampWord: 'PARADOXE',
      leftCard: { label: 'Promesse IA', value: '+40 %', sub: 'Vitesse perçue' },
      rightCard: { label: 'Bilan comptable', value: '0 €', sub: 'Coût caché réel' },
      compLeft: { label: 'Déploiement sans refonte', value: '90 %', ratio: 0.9 },
      compRight: { label: 'Gains nets mesurés', value: '10 %', ratio: 0.22 },
      multiplier: '9 sur 10',
      gaugePct: 90,
      steps: ['Outil ajouté', 'Double saisie', 'Coût API & audit', 'Zéro marge'],
      bullets: ['Process inchangés', 'Sécurité des agents lourde', 'ROI long à prouver'],
      toggles: [
        { label: 'Empiler des gadgets IA', before: 'MODE', after: 'STOPPÉ', activeAfter: false },
        { label: 'Cibler un flux mesurable', before: 'OFF', after: 'PRIORITÉ', activeAfter: true },
        { label: 'Contrôle sécurité & droits', before: 'FLOU', after: 'VERROUILLÉ', activeAfter: true },
      ],
      beatTitles: [
        'Gain rapide, zéro marge',
        'Le piège des agents',
        'Part d’échec financier',
        'Gadget vs Flux rentable',
        '3 réglages pour le ROI',
        'Ce qui rapporte vraiment',
      ],
      ctaTitle: 'Évite les faux gains IA',
      ctaTagline: 'Business, IA & Stratégie FR',
    };
  }

  if (/(feed|vidéo|attention|fatigue|brut|5 minutes|conseil|habitude)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '5 min' : statVal,
      statLabel: 'Micro-action contre le feed lisse',
      stampWord: 'SATURATION',
      leftCard: { label: 'Vidéo IA lisse', value: '0,8 s', sub: 'Skippée direct' },
      rightCard: { label: 'Format brut incarné', value: '3× plus', sub: 'Partages & saves' },
      compLeft: { label: 'Rétention contenu générique', value: '18 %', ratio: 0.3 },
      compRight: { label: 'Rétention angle humain', value: '54 %', ratio: 0.86 },
      multiplier: '×3',
      gaugePct: 79,
      steps: ['Scroll passif', 'Rejet du lisse', 'Signal humain', 'Sauvegarde'],
      bullets: ['Moins de mise en scène', 'Règle des 5 minutes', 'Preuve concrète en face'],
      toggles: [
        { label: 'Montage cloné sans âme', before: 'SATURÉ', after: 'IGNORÉ', activeAfter: false },
        { label: 'Une idée claire en 5 min', before: 'OFF', after: 'PRIORITÉ', activeAfter: true },
        { label: 'Partages & sauvegardes', before: 'FAIBLES', after: 'BOOSTÉS', activeAfter: true },
      ],
      beatTitles: [
        'Pourquoi le feed sature',
        'La règle des 5 minutes',
        'Taux de rejet du lisse',
        'Lisse IA vs Format brut',
        '3 signaux qui retiennent',
        'Le retour au concret',
      ],
      ctaTitle: 'Teste la règle des 5 min',
      ctaTagline: 'Attention, Création & Vie FR',
    };
  }

  if (/(réunion|meeting|résumé)/.test(hay)) {
    return {
      statValue: statVal === '3× PLUS' ? '80 %' : statVal,
      statLabel: 'Réunions remplacées en 2026',
      stampWord: 'OBSOLÈTE',
      leftCard: { label: 'Visio classique', value: '60 min', sub: 'Zéro trace' },
      rightCard: { label: 'Résumé IA structuré', value: '90 sec', sub: 'Actions claires' },
      compLeft: { label: 'Réunions par semaine', value: '14 h', ratio: 0.9 },
      compRight: { label: 'Avec synthèse async', value: '3 h', ratio: 0.24 },
      multiplier: '÷4,6',
      gaugePct: 84,
      steps: ['Ordre du jour', 'Captation', 'Décisions', 'Suivi écrit'],
      bullets: ['Compte rendu instantané', 'Décisions horodatées', 'Moins d’interruptions'],
      toggles: [
        { label: 'Points statut sans fin', before: 'ACTIF', after: 'SUPPRIMÉ', activeAfter: false },
        { label: 'Synthèse audio automatique', before: 'OFF', after: 'ON', activeAfter: true },
        { label: 'Décision en 3 lignes', before: 'OFF', after: 'ON', activeAfter: true },
      ],
      beatTitles: [
        'La visio inutile recule',
        'Le nouveau flux async',
        'Temps récupéré chaque semaine',
        'Réunion 1 h vs Résumé',
        '3 règles équipe claire',
        'Ce qui reste essentiel',
      ],
      ctaTitle: 'Arrête les réunions inutiles',
      ctaTagline: 'Productivité & IA concrète',
    };
  }

  return {
    statValue: statVal === '3× PLUS' ? '90 %' : statVal,
    statLabel: 'Écart mesuré sur le terrain',
    stampWord: 'BASCULE',
    leftCard: { label: 'Promesse affichée', value: 'Rapide', sub: 'Sur le papier' },
    rightCard: { label: 'Réalité mesurée', value: 'Complexe', sub: 'Sur le terrain' },
    compLeft: { label: 'Approche classique', value: '12 h/sem', ratio: 0.86 },
    compRight: { label: 'Méthode structurée', value: '3 h/sem', ratio: 0.28 },
    multiplier: '÷4',
    gaugePct: 82,
    steps: ['Constat brut', 'Point bloquant', 'Ajustement', 'Résultat net'],
    bullets: ['Cause racine identifiée', 'Coût réel mesuré', 'Gain vérifiable'],
    toggles: [
      { label: 'Automatisme sans contrôle', before: 'ACTIF', after: 'CORRIGÉ', activeAfter: false },
      { label: 'Indicateur chiffré clair', before: 'OFF', after: 'ACTIF', activeAfter: true },
      { label: 'Routine courte vérifiée', before: 'OFF', after: 'ACTIF', activeAfter: true },
    ],
    beatTitles: [
      'Le constat chiffré',
      'Ce qui bloque vraiment',
      'L’écart réel mesuré',
      'Avant vs Méthode nette',
      '3 leviers vérifiables',
      'Verdict sur le terrain',
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
  const brollSeq = getBrollSequenceForTopic(input.category, cleanTheme);
  const preset = buildDomainPreset(input.category, cleanTheme, statVal);

  const hookLine = trimSpokenLineForPacing(
    input.hookHint ||
      `${shortTopic} vient de basculer, et voici ce qui change vraiment pour toi.`
  );
  const angleLine = trimSpokenLineForPacing(
    cleanAngle ||
      `Les derniers chiffres montrent un écart massif avec ce qu’on imagine souvent sur ce sujet.`,
    18
  );
  const sourceClean = sanitizeScriptText(input.sources || 'les données officielles 2026').slice(0, 48);
  const sourceSpoken = formatSourceForSpeech(input.sources);

  const beatContents: Record<number, Omit<BatchBeatSpec, 'id' | 'visualType' | 'layoutHint'>> = {
    0: {
      title: shortTopic,
      shortLabel: 'Hook',
      screenLabel: `${input.category.toUpperCase()} · ALERTE`,
      spokenLine: hookLine,
      brollKey: brollSeq[0],
      brollCaption: condenseVisualHeadline(shortTopic, 3, 28),
      iconKind,
      stampWord: preset.stampWord,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      dateBadge,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      subStats: [
        { value: preset.statValue, label: 'Signal clé' },
        { value: preset.multiplier, label: 'Écart réel' },
      ],
    },
    1: {
      title: preset.beatTitles[0],
      shortLabel: 'Constat',
      screenLabel: 'FAIT VÉRIFIÉ',
      spokenLine: angleLine,
      brollKey: brollSeq[1],
      brollCaption: 'Constat vérifié',
      iconKind,
      dateBadge,
      sourceLabel: sourceClean,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      leftCard: preset.leftCard,
      rightCard: preset.rightCard,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      bullets: preset.bullets,
    },
    2: {
      title: preset.beatTitles[1],
      shortLabel: 'Mécanisme',
      screenLabel: 'EN 4 TEMPS',
      spokenLine: `Concrètement, tout s’enchaîne en quatre étapes précises qui modifient la suite.`,
      brollKey: brollSeq[2],
      brollCaption: 'Mécanique réelle',
      iconKind,
      steps: preset.steps,
      stampWord: 'MESURÉ',
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
      spokenLine: `Le vrai point de bascule ne vient pas des annonces, mais de l’effet concret au quotidien.`,
      brollKey: brollSeq[3],
      iconKind,
      gaugePct: preset.gaugePct,
      statValue: `${preset.gaugePct} %`,
      statLabel: preset.statLabel,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      multiplierBadge: preset.multiplier,
      bullets: preset.bullets,
    },
    4: {
      title: preset.beatTitles[3],
      shortLabel: 'Écart chiffré',
      screenLabel: 'COMPARAISON',
      spokenLine: `Quand on compare l’ancien fonctionnement avec la nouvelle situation, la différence saute aux yeux.`,
      brollKey: brollSeq[4],
      iconKind,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      multiplierBadge: preset.multiplier,
      statValue: preset.compRight.value,
      statLabel: preset.statLabel,
      dateBadge,
      bullets: preset.bullets,
      steps: preset.steps,
    },
    5: {
      title: preset.beatTitles[4],
      shortLabel: 'Actions',
      screenLabel: 'PLAN CONCRET',
      spokenLine: `Pour t’adapter dès cette semaine, garde ces trois repères simples sous les yeux.`,
      brollKey: brollSeq[0],
      brollCaption: 'Plan immédiat',
      iconKind,
      toggles: preset.toggles,
      bullets: preset.bullets,
    },
    6: {
      title: preset.beatTitles[5],
      shortLabel: 'Preuve',
      screenLabel: 'BILAN SOURCÉ',
      spokenLine: `D’après ${sourceSpoken}, ceux qui anticipent ce changement évitent l’essentiel du choc.`,
      brollKey: brollSeq[1],
      brollCaption: 'Bilan sourcé',
      iconKind,
      sourceLabel: sourceClean,
      bullets: preset.bullets,
      gaugePct: preset.gaugePct,
      comparisonLeft: preset.compLeft,
      comparisonRight: preset.compRight,
      multiplierBadge: preset.multiplier,
      statValue: preset.statValue,
      statLabel: preset.statLabel,
      terminalCmd: isDevOrCodeTopic(input.category, cleanTheme)
        ? '> audit --impact-2026'
        : undefined,
      terminalOut: isDevOrCodeTopic(input.category, cleanTheme)
        ? preset.bullets.map((b) => `✓ ${b}`)
        : undefined,
    },
    7: {
      title: preset.ctaTitle,
      shortLabel: 'CTA',
      screenLabel: 'SUITE EN DIRECT',
      spokenLine: `Abonne-toi et active la cloche pour recevoir les prochains décryptages chaque semaine.`,
      brollKey: 'studio',
      brollCaption: 'Décryptage · @alex.decode',
      iconKind: 'rocket',
      statValue: '@alex.decode',
      statLabel: preset.ctaTagline,
    },
  };

  const beats: BatchBeatSpec[] = blueprint.beatTypes.map((vt, idx) => {
    const content = beatContents[idx];
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

    return {
      id: `beat-${idx + 1}`,
      visualType: vt,
      layoutHint: blueprint.layouts[idx],
      sfxKind: sfxByVt[vt] || 'tap',
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
