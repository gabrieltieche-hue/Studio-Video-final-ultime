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
