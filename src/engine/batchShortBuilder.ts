import type {
  BatchBeatSpec,
  DynamicIconKind,
  DynamicVisualType,
  ParsedCustomTopic,
  UniversalPrimitiveType,
} from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';
import {
  findSemanticWordTimestamps,
  humanizeFrenchScript,
  type SemanticSfxSound,
} from './outliersMath';
import {
  PRIMITIVE_META_MAP,
  normalizeToUniversalPrimitive,
} from './shortPrimitivesSchema';

export interface ElevenLabsCharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ChannelCtaProfile {
  handle: string;
  brandName: string;
  tagline: string;
  initial: string;
}

export function resolveChannelCtaProfile(override?: Partial<ChannelCtaProfile>): ChannelCtaProfile {
  const handleRaw = (override?.handle || '@decryptage.fr').trim();
  const handle = handleRaw.startsWith('@') ? handleRaw : `@${handleRaw}`;
  const brandName = (override?.brandName || 'Décryptage FR').trim();
  const tagline = (override?.tagline || 'Analyses & Décryptages · 1 Short par jour').trim();
  const initialSource = brandName.replace(/^@/, '') || handle.replace(/^@/, '') || 'D';
  return {
    handle,
    brandName,
    tagline,
    initial: initialSource[0].toUpperCase(),
  };
}

export function sanitizeScriptText(text: string): string {
  return humanizeFrenchScript(text).cleaned;
}

/**
 * Keeps on-screen headlines punchy and crisp WITHOUT ugly ellipsis truncation.
 */
export function condenseVisualHeadline(text: string, maxWords = 6, maxChars = 44): string {
  const clean = sanitizeScriptText(text).replace(/[.:;!?]+$/g, '').trim();
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean).slice(0, maxWords);
  while (words.length > 2 && words.join(' ').length > maxChars) {
    words.pop();
  }
  return words.join(' ');
}

export function trimSpokenLineForPacing(text: string, maxWords = 20): string {
  const clean = sanitizeScriptText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return /[.!?…]$/.test(clean) ? clean : `${clean}.`;
  }
  const clipped = words.slice(0, maxWords).join(' ').replace(/[,:;]+$/, '');
  return /[.!?…]$/.test(clipped) ? clipped : `${clipped}.`;
}

export function parseBulkTopicsInput(raw: string, maxCount = 12): ParsedCustomTopic[] {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const out: ParsedCustomTopic[] = [];
  for (const line of lines.slice(0, maxCount)) {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      out.push({
        category: parts[0],
        theme: parts[1],
        angle: parts[2] || '',
      });
    } else {
      out.push({
        category: 'Général',
        theme: line,
        angle: '',
      });
    }
  }
  return out;
}

export function computeProportionalWords(fullText: string, totalDurationSec: number): WhisperWord[] {
  const tokens = sanitizeScriptText(fullText).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const totalWeight = tokens.reduce((acc, w) => acc + Math.max(2, w.length), 0);
  const safeTotal = Math.max(4, totalDurationSec);
  let cursor = 0.08;
  const usableSpan = Math.max(2, safeTotal - 0.16);

  return tokens.map((word, idx) => {
    const weight = Math.max(2, word.length);
    const slice = (weight / totalWeight) * usableSpan;
    const start = Number(cursor.toFixed(3));
    const end = Number(Math.min(safeTotal - 0.04, cursor + slice).toFixed(3));
    cursor = end;
    return {
      id: `w-${idx + 1}`,
      word,
      start,
      end: Math.max(start + 0.06, end),
      confidence: 0.95,
    };
  });
}

export function alignmentToWords(
  alignment: ElevenLabsCharAlignment | null | undefined,
  fallbackText: string,
  fallbackDurationSec: number
): { words: WhisperWord[]; durationSec: number } {
  if (
    alignment &&
    Array.isArray(alignment.characters) &&
    Array.isArray(alignment.character_start_times_seconds) &&
    Array.isArray(alignment.character_end_times_seconds) &&
    alignment.characters.length > 0
  ) {
    const words: WhisperWord[] = [];
    let buf = '';
    let wordStart: number | null = null;
    let wordEnd: number | null = null;

    const flush = () => {
      const cleaned = buf.trim();
      if (cleaned && wordStart !== null && wordEnd !== null) {
        words.push({
          id: `w-${words.length + 1}`,
          word: cleaned,
          start: Number(Math.max(0, wordStart).toFixed(3)),
          end: Number(Math.max(wordStart + 0.05, wordEnd).toFixed(3)),
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
        durationSec: Number(Math.max(fallbackDurationSec + 0.35, lastEnd + 0.5).toFixed(2)),
      };
    }
  }

  const proportional = computeProportionalWords(fallbackText, fallbackDurationSec);
  const lastEnd =
    proportional.length > 0 ? proportional[proportional.length - 1].end : fallbackDurationSec;
  return {
    words: proportional,
    durationSec: Number(Math.max(fallbackDurationSec, lastEnd + 0.45).toFixed(2)),
  };
}

export function resolveBeatLayout(
  spec: BatchBeatSpec,
  index: number,
  total: number
): 'split' | 'fullscreen' {
  if (spec.layoutHint === 'split' || spec.layoutHint === 'fullscreen') {
    return spec.layoutHint;
  }
  if (index === 0 || index === total - 1) return 'split';
  const norm = normalizeToUniversalPrimitive(spec.visualType);
  if (norm === 'channel_end_cta') return 'split';
  return PRIMITIVE_META_MAP[norm]?.preferLayout || 'split';
}

const PRIMITIVE_MOTION_TRACK_TYPE: Record<
  UniversalPrimitiveType,
  ShortProject['motionTrack'][number]['type']
> = {
  metric_shock_hook: 'counter',
  dot_population_scale: 'counter',
  paper_receipt_payslip: 'card',
  countdown_calendar_stamp: 'card',
  balance_scale_duel: 'card',
  trap_barrier_alert: 'typography',
  hydraulic_compressor: 'counter',
  scrolling_checklist_spotlight: 'card',
  radial_mindmap_hub: 'card',
  audit_table_detector: 'card',
  profile_objection_deck: 'card',
  notification_explosion_stamp: 'card',
  segmented_quota_slider: 'chart',
  hand_drawn_marker_highlight: 'card',
  before_after_morph: 'card',
  animated_data_chart: 'chart',
  split_comparison_window: 'chart',
  process_pipeline: 'card',
  terminal_chat_window: 'card',
  rotary_control_deck: 'card',
  globe_network_flow: 'card',
  editorial_evidence_board: 'card',
  channel_end_cta: 'rocket',
};

function buildMotionAndSfxTracks(
  beats: Array<BatchBeatSpec & { from: number; to: number; layout: 'fullscreen' | 'split' }>,
  words: WhisperWord[],
  safeDuration: number
): {
  motionTrack: ShortProject['motionTrack'];
  sfxTrack: ShortProject['sfxTrack'];
} {
  const motionTrack: ShortProject['motionTrack'] = beats.map((b, idx) => {
    const norm = normalizeToUniversalPrimitive(b.visualType);
    return {
      id: `mot-${b.id}`,
      componentId: `comp-${b.id}`,
      name: b.title,
      start: b.from,
      end: b.to,
      type: PRIMITIVE_MOTION_TRACK_TYPE[norm] || 'card',
      color: idx === 0 ? '#007AFF' : idx === beats.length - 1 ? '#059669' : '#14161B',
    };
  });

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
      fallbackSfxKind: b.sfxKind as SemanticSfxSound | undefined,
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

  return { motionTrack, sfxTrack };
}

/**
 * Exact frame-accurate timeline builder driven by REAL measured per-beat MP3 durations.
 * Guarantees 0.00s cumulative drift between audio voiceover, visual beats, SFX & subtitles.
 */
export function buildTimedProjectFromBeatAudios(params: {
  beatsSpec: BatchBeatSpec[];
  beatWindows: Array<{ from: number; to: number }>;
  words: WhisperWord[];
  totalDurationSec: number;
}): {
  beats: Array<BatchBeatSpec & { from: number; to: number; layout: 'fullscreen' | 'split' }>;
  motionTrack: ShortProject['motionTrack'];
  sfxTrack: ShortProject['sfxTrack'];
  durationSec: number;
} {
  const { beatsSpec, beatWindows, words, totalDurationSec } = params;
  const safeDuration = Number(
    Math.max(
      totalDurationSec,
      beatWindows.length > 0 ? beatWindows[beatWindows.length - 1].to : 0,
      words.length > 0 ? words[words.length - 1].end + 0.35 : 0
    ).toFixed(2)
  );

  const beats = beatsSpec.map((spec, idx) => {
    const win = beatWindows[idx];
    const from = Number((win ? win.from : 0).toFixed(2));
    const isLast = idx === beatsSpec.length - 1;
    const to = Number((isLast ? safeDuration : win ? win.to : from + 4).toFixed(2));
    const layout = resolveBeatLayout(spec, idx, beatsSpec.length);

    return {
      ...spec,
      title: condenseVisualHeadline(spec.title, 6, 44),
      spokenLine: sanitizeScriptText(spec.spokenLine),
      from,
      to: Math.max(from + 0.8, to),
      layout,
    };
  });

  const { motionTrack, sfxTrack } = buildMotionAndSfxTracks(beats, words, safeDuration);

  return {
    beats,
    motionTrack,
    sfxTrack,
    durationSec: safeDuration,
  };
}

/**
 * Fallback proportional timeline aligner when beat timings must be derived from full transcript.
 */
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
    Math.max(12, totalDurationSec, words.length > 0 ? words[words.length - 1].end + 0.45 : 0).toFixed(2)
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
        Math.max(wordCursor, Math.round((cumSpecWords / totalSpecWords) * words.length) - 1)
      );
      const nextWordStart =
        targetWordIdx + 1 < words.length ? words[targetWordIdx + 1].start : safeDuration;
      const boundary = (words[targetWordIdx].end + nextWordStart) / 2;
      const minStep = isFirst ? 2.2 : 2.0;
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
      title: condenseVisualHeadline(spec.title, 6, 44),
      spokenLine: sanitizeScriptText(spec.spokenLine),
      from,
      to,
      layout,
    };
  });

  const { motionTrack, sfxTrack } = buildMotionAndSfxTracks(beats, words, safeDuration);

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
  if (/(euro|salaire|smic|loyer|économie|impôt|budget|pouvoir|marge|restaurant|prix)/.test(hay)) return 'euro';
  if (/(loi|parlement|censure|politique|décret|interdit|règle|rgpd|contrat)/.test(hay)) return 'law';
  if (/(sécurité|risque|alerte|fraude|protection)/.test(hay)) return 'shield';
  if (/(réunion|meeting|calendrier|agenda|délai)/.test(hay)) return 'calendar';
  if (/(junior|senior|salarié|emploi|équipe|jeune|ado)/.test(hay)) return 'users';
  if (/(téléphone|écran|réseau|tiktok|instagram|scroll)/.test(hay)) return 'phone';
  if (/(ia|ai|agent|code|dev|résumé|llm|mcp)/.test(hay)) return 'ai';
  if (/(temps|heure|minute|productiv)/.test(hay)) return 'clock';
  return 'chart';
}
