import type { WhisperWord } from '../types/studio';

export type VoiceEngineProvider = 'auto' | 'voicestudio' | 'edge_neural' | 'elevenlabs';

export interface VoiceStudioConfig {
  engine: VoiceEngineProvider;
  voicestudioUrl: string;
  voicestudioModel: string;
  voicestudioVoice: string;
  voicestudioLanguage: string;
  voicestudioInstruct: string;
  edgeVoice: string;
}

export interface EdgeBoundaryEvent {
  offsetSec: number;
  durationSec: number;
  text: string;
}

/**
 * Normalizes Edge TTS concatenated JSON metadata chunks (100ns Windows ticks)
 * into clean per-word WhisperWord cues, splitting multi-word spans like
 * "20 novembre" or "-28 %" proportionally across each token.
 */
export function parseEdgeWordBoundariesToWords(
  rawMetadataText: string,
  fallbackText: string,
  speed = 1.10,
  actualDurationSec?: number
): WhisperWord[] {
  const events: EdgeBoundaryEvent[] = [];

  if (rawMetadataText && rawMetadataText.trim().length > 0) {
    // msedge-tts emits back-to-back JSON objects `{ "Metadata": [...] }` without array brackets
    const jsonBlocks = rawMetadataText.match(/\{\s*"Metadata"\s*:\s*\[[\s\S]*?\]\s*\}/g) || [];
    for (const block of jsonBlocks) {
      try {
        const parsed = JSON.parse(block) as {
          Metadata?: Array<{
            Type?: string;
            Data?: {
              Offset?: number;
              Duration?: number;
              text?: { Text?: string };
            };
          }>;
        };
        for (const item of parsed.Metadata || []) {
          if (item.Type !== 'WordBoundary' || !item.Data) continue;
          const txt = String(item.Data.text?.Text || '').trim();
          const offsetSec = Number(item.Data.Offset || 0) / 10_000_000;
          const durSec = Math.max(0.05, Number(item.Data.Duration || 0) / 10_000_000);
          if (txt && Number.isFinite(offsetSec)) {
            events.push({ offsetSec, durationSec: durSec, text: txt });
          }
        }
      } catch {
        // Skip malformed chunk cleanly
      }
    }
  }

  const speedFactor = Math.max(0.75, Math.min(1.35, speed || 1.10));
  const rawWords: WhisperWord[] = [];

  if (events.length > 0) {
    for (const ev of events) {
      const subTokens = ev.text.split(/\s+/).filter(Boolean);
      const spanStart = ev.offsetSec / speedFactor;
      const spanDur = Math.max(0.06, ev.durationSec / speedFactor);
      if (subTokens.length <= 1) {
        const cleaned = ev.text.trim();
        if (!cleaned) continue;
        rawWords.push({
          id: `w-${rawWords.length + 1}`,
          word: cleaned,
          start: Number(spanStart.toFixed(3)),
          end: Number((spanStart + spanDur).toFixed(3)),
          confidence: 0.99,
        });
      } else {
        const totalChars = Math.max(
          1,
          subTokens.reduce((sum, tok) => sum + tok.length, 0)
        );
        let cursor = spanStart;
        for (const tok of subTokens) {
          const share = (tok.length / totalChars) * spanDur;
          const nextEnd = Math.max(cursor + 0.04, cursor + share);
          rawWords.push({
            id: `w-${rawWords.length + 1}`,
            word: tok,
            start: Number(cursor.toFixed(3)),
            end: Number(nextEnd.toFixed(3)),
            confidence: 0.99,
          });
          cursor = nextEnd;
        }
      }
    }
  }

  // Fallback proportional timeline if metadata was absent
  if (rawWords.length === 0) {
    const tokens = fallbackText.trim().split(/\s+/).filter(Boolean);
    const totalDur = Math.max(2, actualDurationSec || tokens.length * 0.32);
    const totalWeight = tokens.reduce((s, t) => s + Math.max(2, t.length), 0) || 1;
    let cursor = 0.06;
    const usable = Math.max(1.5, totalDur - 0.18);
    for (const tok of tokens) {
      const dur = (Math.max(2, tok.length) / totalWeight) * usable;
      rawWords.push({
        id: `w-${rawWords.length + 1}`,
        word: tok,
        start: Number(cursor.toFixed(3)),
        end: Number((cursor + dur).toFixed(3)),
        confidence: 0.92,
      });
      cursor += dur;
    }
  }

  // Ensure monotonic timestamps and rescale tightly to measured silence-trimmed audio duration
  for (let i = 1; i < rawWords.length; i++) {
    if (rawWords[i].start < rawWords[i - 1].start) {
      rawWords[i].start = rawWords[i - 1].end;
    }
    if (rawWords[i].end <= rawWords[i].start) {
      rawWords[i].end = Number((rawWords[i].start + 0.07).toFixed(3));
    }
  }

  if (actualDurationSec && actualDurationSec > 2 && rawWords.length > 0) {
    const lastEnd = rawWords[rawWords.length - 1].end;
    const expectedEnd = Math.max(1.5, actualDurationSec - 0.06);
    if (lastEnd > 0.5 && Math.abs(lastEnd - expectedEnd) / lastEnd > 0.015) {
      const scale = expectedEnd / lastEnd;
      for (const w of rawWords) {
        w.start = Number((w.start * scale).toFixed(3));
        w.end = Number(Math.max(w.start + 0.05, w.end * scale).toFixed(3));
      }
    }
  }

  return rawWords;
}

/**
 * Parses VoiceStudio's OpenAI-compatible verbose_json word timestamps (`/v1/audio/transcriptions`)
 * into normalized WhisperWord[] synced to measured audio duration.
 */
export function parseVerboseWordsToWhisperWords(
  verboseWords: Array<{ word?: string; text?: string; start?: number; end?: number }> | undefined,
  fallbackText: string,
  actualDurationSec?: number
): WhisperWord[] {
  const valid = (verboseWords || [])
    .map((w) => ({
      text: String(w.word ?? w.text ?? '').trim(),
      start: Number(w.start ?? 0),
      end: Number(w.end ?? 0),
    }))
    .filter((w) => w.text.length > 0 && Number.isFinite(w.start));

  if (valid.length === 0) {
    return parseEdgeWordBoundariesToWords('', fallbackText, 1.10, actualDurationSec);
  }

  const out: WhisperWord[] = valid.map((w, idx) => ({
    id: `w-${idx + 1}`,
    word: w.text,
    start: Number(Math.max(0, w.start).toFixed(3)),
    end: Number(Math.max(w.start + 0.06, w.end).toFixed(3)),
    confidence: 0.98,
  }));

  if (actualDurationSec && actualDurationSec > 2 && out.length > 0) {
    const lastEnd = out[out.length - 1].end;
    if (lastEnd > 0.5 && Math.abs(lastEnd - (actualDurationSec - 0.06)) / lastEnd > 0.02) {
      const scale = Math.max(0.5, actualDurationSec - 0.06) / lastEnd;
      for (const w of out) {
        w.start = Number((w.start * scale).toFixed(3));
        w.end = Number(Math.max(w.start + 0.05, w.end * scale).toFixed(3));
      }
    }
  }

  return out;
}

function tokenizeSourceForCaptions(sourceText: string): string[] {
  const clean = String(sourceText || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];

  // Re-attach isolated spacing before punctuation except French double signs (? ! : ;) kept cleanly attached
  const rawTokens = clean.split(' ').filter(Boolean);
  const tokens: string[] = [];
  for (const tok of rawTokens) {
    if (/^[.,!?:;…]+$/.test(tok) && tokens.length > 0) {
      tokens[tokens.length - 1] = `${tokens[tokens.length - 1]}${tok}`;
    } else {
      tokens.push(tok);
    }
  }
  return tokens;
}

function estimateSpokenExpansionWeight(displayTok: string): number {
  const clean = displayTok.trim();
  if (!clean) return 1;
  // Domains like info.gouv.fr expand to multiple spoken words
  if (/\.[a-z]{2,}/i.test(clean) && !/^\d+[.,]\d+$/.test(clean)) {
    return Math.max(2, clean.split(/[./-]/).filter(Boolean).length * 1.6);
  }
  // Decimals / numbers
  if (/\d+[.,]\d+/.test(clean)) return 3;
  // Acronyms or symbols
  if (clean === '%' || clean === '€' || clean === '$') return 1.5;
  return Math.max(1, Math.min(3, clean.length / 4.5));
}

/**
 * Aligns raw TTS WordBoundary/Whisper words (from phonetically normalized speech)
 * back onto the exact punctuated display tokens of a single beat, guaranteeing:
 * - Zero stripped punctuation (`.`, `,`, `?`, `!` stay attached so sentences never fuse)
 * - Exact duration parity with the beat's measured MP3 slice
 * - Zero drift across beats when combined beat-by-beat
 */
export function realignWordsToSourceBeatText(params: {
  rawBeatWords: WhisperWord[];
  sourceBeatText: string;
  beatStartOffsetSec: number;
  beatDurationSec: number;
  idPrefix?: string;
}): WhisperWord[] {
  const sourceTokens = tokenizeSourceForCaptions(params.sourceBeatText);
  if (sourceTokens.length === 0) return [];

  const dur = Math.max(0.4, params.beatDurationSec);
  const offset = Math.max(0, params.beatStartOffsetSec);
  const raw = params.rawBeatWords.filter((w) => w.word && w.word.trim().length > 0);
  const prefix = params.idPrefix || 'w';

  if (raw.length === 0) {
    // Proportional distribution weighted by syllable/character length
    const weights = sourceTokens.map((t) => estimateSpokenExpansionWeight(t));
    const totalW = weights.reduce((a, b) => a + b, 0) || 1;
    const usable = Math.max(0.3, dur - 0.06);
    let cursor = offset + 0.02;
    return sourceTokens.map((tok, i) => {
      const slice = (weights[i] / totalW) * usable;
      const start = Number(cursor.toFixed(3));
      const end = Number(Math.min(offset + dur - 0.01, Math.max(start + 0.05, cursor + slice)).toFixed(3));
      cursor = end;
      return {
        id: `${prefix}-${i + 1}`,
        word: tok,
        start,
        end,
        confidence: 0.94,
      };
    });
  }

  // Rescale raw beat words so they fit inside [0, dur - 0.03] cleanly
  const firstStart = Math.max(0, raw[0].start);
  const rawLastEnd = Math.max(firstStart + 0.2, raw[raw.length - 1].end);
  const targetSpan = Math.max(0.25, dur - 0.05);
  const scale = rawLastEnd > 0.1 ? targetSpan / rawLastEnd : 1;

  const scaledRaw = raw.map((w) => ({
    start: Number(Math.max(0, w.start * scale).toFixed(3)),
    end: Number(Math.min(dur - 0.01, Math.max(w.start * scale + 0.04, w.end * scale)).toFixed(3)),
    confidence: w.confidence ?? 0.97,
  }));

  // Map weighted cumulative positions in sourceTokens onto scaledRaw spans
  const weights = sourceTokens.map((t) => estimateSpokenExpansionWeight(t));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  const out: WhisperWord[] = [];
  let rawIdx = 0;
  let cumW = 0;

  for (let i = 0; i < sourceTokens.length; i++) {
    const tok = sourceTokens[i];
    const startFrac = cumW / totalWeight;
    cumW += weights[i];
    const endFrac = i === sourceTokens.length - 1 ? 1 : cumW / totalWeight;

    const firstRawIdx = Math.min(
      scaledRaw.length - 1,
      Math.max(rawIdx, Math.floor(startFrac * scaledRaw.length))
    );
    const lastRawIdx =
      i === sourceTokens.length - 1
        ? scaledRaw.length - 1
        : Math.min(
            scaledRaw.length - 1,
            Math.max(firstRawIdx, Math.ceil(endFrac * scaledRaw.length) - 1)
          );

    const spanStart = offset + scaledRaw[firstRawIdx].start;
    const spanEnd = offset + scaledRaw[lastRawIdx].end;
    const prevEnd = out.length > 0 ? out[out.length - 1].end : offset;
    const safeStart = Number(Math.max(prevEnd, spanStart).toFixed(3));
    const safeEnd = Number(Math.min(offset + dur - 0.01, Math.max(safeStart + 0.045, spanEnd)).toFixed(3));

    out.push({
      id: `${prefix}-${i + 1}`,
      word: tok,
      start: safeStart,
      end: safeEnd,
      confidence: scaledRaw[firstRawIdx].confidence,
    });

    rawIdx = Math.min(scaledRaw.length - 1, lastRawIdx + 1);
  }

  return out;
}

