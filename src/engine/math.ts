/**
 * Deterministic motion-design math & caption timing engine.
 * Faithful TypeScript port of melvynx/video-agent-skills/skills/short-editing/engine/lib/kit.js.
 */

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const seg = (t: number, a: number, b: number): number => {
  if (b <= a) return t >= b ? 1 : 0;
  return clamp((t - a) / (b - a), 0, 1);
};

/**
 * Critically damped spring: never overshoots, settles smoothly in ~4.7 / w seconds.
 */
export const spring = (x: number, w = 13): number => {
  if (x <= 0) return 0;
  return 1 - (1 + w * x) * Math.exp(-w * x);
};

/**
 * Smoothstep interpolation between 0 and 1.
 */
export const smoothstep = (x: number): number => {
  const k = clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
};

/**
 * Smootherstep (Ken Perlin) interpolation for camera/window transitions.
 */
export const smootherstep = (x: number): number => {
  const k = clamp(x, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
};

/**
 * Clean 0.26s smoothstep exit from 1 -> 0 so no ghost frame remains on the next beat.
 */
export const leave = (t: number, endAt: number, dur = 0.26): number => {
  if (t <= endAt - dur) return 1;
  if (t >= endAt) return 0;
  return 1 - smoothstep((t - (endAt - dur)) / dur);
};

/**
 * Retargets smoothly between keyframes [[t, value, w?], ...] using critically damped springs.
 */
export function track(t: number, keys: Array<[number, number, number?]>, defaultW = 14): number {
  if (!keys.length) return 0;
  let value = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [kt, kv, kw] = keys[i];
    if (t < kt) break;
    const w = kw ?? defaultW;
    const p = spring(t - kt, w);
    value = lerp(value, kv, p);
  }
  return value;
}

export interface WordCue {
  text: string;
  start: number;
  end: number;
  emph?: boolean;
}

export interface CaptionChunk {
  words: WordCue[];
  start: number;
  end: number;
  activeIndex: number;
}

const HARD_SENTENCE_END_RE = /[.!?:;—…][)"'»”’]*$/;

const ATOMIC_COMPOUND_PAIRS: Array<[RegExp, RegExp]> = [
  [/^claude$/i, /^code[.,!?:;—…]*$/i],
  [/^deepseek$/i, /^v\d+(?:\.\d+)?[.,!?:;—…]*$/i],
  [/^wispr$/i, /^flow[.,!?:;—…]*$/i],
  [/^simon$/i, /^willison[.,!?:;—…]*$/i],
  [/^service$/i, /^public[.,!?:;—…]*$/i],
  [/^github$/i, /^actions?[.,!?:;—…]*$/i],
  [/^open$/i, /^(?:ai|source)[.,!?:;—…]*$/i],
  [/^apple$/i, /^ui[.,!?:;—…]*$/i],
  [/^mcp$/i, /^servers?[.,!?:;—…]*$/i],
  [/^hec$/i, /^paris[.,!?:;—…]*$/i],
  [/^moins$/i, /^de$/i],
  [/^[+-]?\d+(?:[.,]\d+)?$/, /^[%€$×][.,!?:;—…]*$/i],
];

const ORPHAN_TRAILING_RE =
  /^(?:à|au|aux|de|du|des|d['’]|le|la|les|l['’]|un|une|en|et|ou|par|pour|sur|dans|avec|sans|che[rz]|vers|entre|contre)$/i;

const NUMBER_LEAD_RE = /^[+-]?\d+(?:[.,\s]\d+)*$/;
const NUMBER_UNIT_FOLLOW_RE =
  /^(?:%|€|\$|x|×|\$\/j|€\/j|\$\/mois|€\/mois|€\/an|\$\/an|k\$|k€|ms|s|min|h|ans?|mois|jours?|millions?|milliards?)[.,!?:;—…]*$/i;

function normalizeSpacingAroundPunctuation(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)»”])/g, '$1')
    .replace(/([([«“])\s+/g, '$1');
}

/**
 * Normalizes spacing around punctuation and merges atomic multi-word tokens
 * (-28 %, +1,6 %, 13 $/j, 2 000 $, 1 426 €, Claude Code, Banque de France, paths)
 * without EVER crossing a hard sentence boundary.
 */
export function mergeAtomicTokens(words: WordCue[]): WordCue[] {
  if (!words || words.length === 0) return [];

  // Step 1: Normalize spacing around inline tokens
  const cleanTokens: WordCue[] = [];
  for (const raw of words) {
    const text = normalizeSpacingAroundPunctuation(raw.text);
    if (!text) continue;
    cleanTokens.push({ ...raw, text });
  }

  // Step 2: Merge known multi-word atomic phrases & number + unit pairs WITHOUT crossing sentence ends
  const merged: WordCue[] = [];
  let i = 0;
  while (i < cleanTokens.length) {
    const curr = cleanTokens[i];
    const next = cleanTokens[i + 1];
    const next2 = cleanTokens[i + 2];

    const currEndsSentence = HARD_SENTENCE_END_RE.test(curr.text);

    // 3-word atomic: "Banque de France", "2 000 $", "1 426 €"
    if (
      !currEndsSentence &&
      next &&
      !HARD_SENTENCE_END_RE.test(next.text) &&
      next2 &&
      ((/^banque$/i.test(curr.text) && /^de$/i.test(next.text) && /^france[.,!?:;—…]*$/i.test(next2.text)) ||
        (/^\d{1,3}$/.test(curr.text) && /^\d{3}$/.test(next.text) && NUMBER_UNIT_FOLLOW_RE.test(next2.text)))
    ) {
      merged.push({
        text: `${curr.text} ${next.text} ${next2.text}`,
        start: curr.start,
        end: Math.max(curr.end, next2.end),
        emph: Boolean(curr.emph || next.emph || next2.emph),
      });
      i += 3;
      continue;
    }

    // 2-word atomic: number + unit (-28 %, +1,6 %, 13 $/j, 1,10 x), spaced thousands (1 426), or named compound
    if (!currEndsSentence && next) {
      const isNumPlusUnit = NUMBER_LEAD_RE.test(curr.text) && NUMBER_UNIT_FOLLOW_RE.test(next.text);
      const isThousandPair = /^\d{1,3}$/.test(curr.text) && /^\d{3}[.,!?:;—…]*$/.test(next.text);
      const isNamedCompound = ATOMIC_COMPOUND_PAIRS.some(
        ([re1, re2]) => re1.test(curr.text) && re2.test(next.text)
      );

      if (isNumPlusUnit || isThousandPair || isNamedCompound) {
        merged.push({
          text: `${curr.text} ${next.text}`,
          start: curr.start,
          end: Math.max(curr.end, next.end),
          emph: Boolean(curr.emph || next.emph),
        });
        i += 2;
        continue;
      }
    }

    merged.push(curr);
    i += 1;
  }

  // Step 3: Attach standalone punctuation tokens (., ,, !, ?, :, ;, —, …) onto preceding token
  const finalTokens: WordCue[] = [];
  for (const tok of merged) {
    if (/^[,.;:!?…—]+$/.test(tok.text) && finalTokens.length > 0) {
      const prev = finalTokens[finalTokens.length - 1];
      prev.text =
        tok.text === '.' || tok.text === ',' || tok.text === '…'
          ? `${prev.text}${tok.text}`
          : `${prev.text} ${tok.text}`;
      prev.end = Math.max(prev.end, tok.end);
      continue;
    }
    finalTokens.push(tok);
  }

  return finalTokens;
}

export interface SemanticChunkOptions {
  maxWords?: number;
  maxChars?: number;
  idealMaxChars?: number;
  avoidOrphanEnding?: boolean;
}

/**
 * Groups spoken words into natural 1-4 word chunks obeying hard sentence boundaries
 * (., !, ?, :, ;, —, …) and atomic token protection.
 */
export function buildCaptionChunks(
  words: WordCue[],
  maxWords = 3,
  maxChars = 16,
  options: SemanticChunkOptions = {}
): Array<{ words: WordCue[]; start: number; end: number }> {
  const safeWords = mergeAtomicTokens(words);
  const chunks: Array<{ words: WordCue[]; start: number; end: number }> = [];
  let current: WordCue[] = [];
  let chars = 0;
  const avoidOrphan = Boolean(options.avoidOrphanEnding);

  const flush = () => {
    if (!current.length) return;
    chunks.push({
      words: current,
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
    chars = 0;
  };

  for (let idx = 0; idx < safeWords.length; idx++) {
    const w = safeWords[idx];
    const nextW = safeWords[idx + 1];
    const nextChars = chars + (current.length ? 1 : 0) + w.text.length;

    if (current.length >= maxWords || (current.length > 0 && nextChars > maxChars)) {
      if (
        avoidOrphan &&
        current.length >= 2 &&
        ORPHAN_TRAILING_RE.test(current[current.length - 1].text)
      ) {
        const orphan = current[current.length - 1];
        if (orphan.text.length + 1 + w.text.length <= maxChars) {
          current = current.slice(0, -1);
          flush();
          current.push(orphan);
        } else {
          flush();
        }
      } else {
        flush();
      }
    }

    current.push(w);
    chars = current.reduce((acc, item, j) => acc + item.text.length + (j ? 1 : 0), 0);

    // Hard sentence boundary: ALWAYS close block immediately after strong punctuation
    if (HARD_SENTENCE_END_RE.test(w.text)) {
      flush();
      continue;
    }

    // Soft breath pause at commas or ideal length when followed by a word that wouldn't fit well
    if (avoidOrphan && current.length >= 2 && /,$/u.test(w.text)) {
      flush();
    } else if (
      avoidOrphan &&
      current.length >= 3 &&
      nextW &&
      !ORPHAN_TRAILING_RE.test(w.text) &&
      chars >= (options.idealMaxChars ?? 20)
    ) {
      flush();
    }
  }
  flush();
  return chunks;
}

/**
 * Primary @melvynx.dev semantic breath-group subtitle chunker (2-4 words max, 1 line <= 24 chars,
 * strict sentence locks, atomic numbers/paths/compounds, zero trailing orphan prepositions).
 */
export function buildSemanticCaptionChunks(
  words: WordCue[],
  options: SemanticChunkOptions = {}
): Array<{ words: WordCue[]; start: number; end: number }> {
  return buildCaptionChunks(words, options.maxWords ?? 4, options.maxChars ?? 24, {
    idealMaxChars: options.idealMaxChars ?? 20,
    avoidOrphanEnding: options.avoidOrphanEnding ?? true,
  });
}

export function getActiveCaptionChunk(
  t: number,
  chunks: Array<{ words: WordCue[]; start: number; end: number }>,
  hideSpans: Array<[number, number]> = []
): CaptionChunk | null {
  for (const [ha, hb] of hideSpans) {
    if (t >= ha && t <= hb) return null;
  }

  for (const chunk of chunks) {
    if (t >= chunk.start - 0.04 && t <= chunk.end + 0.14) {
      let activeIndex = 0;
      for (let i = 0; i < chunk.words.length; i++) {
        if (t >= chunk.words[i].start - 0.02) activeIndex = i;
      }
      return { ...chunk, activeIndex };
    }
  }
  return null;
}

/**
 * Computes the paper/camera seam (y in 1920px stage height).
 * 1160 = split, 1920 = paper only, 0 = full camera/editorial.
 */
export function getLayoutSeam(t: number, keys: Array<[number, number]>, transitionDur = 0.24): number {
  if (!keys.length) return 1160;
  let current = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [kt, target] = keys[i];
    if (t < kt) break;
    const prev = keys[i - 1][1];
    if (t < kt + transitionDur) {
      const k = smootherstep((t - kt) / transitionDur);
      return lerp(prev, target, k);
    }
    current = target;
  }
  return current;
}

export function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export const formatClock = formatTimecode;

export function formatSrtTimestamp(seconds: number): string {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(msTotal / 3600000);
  const m = Math.floor((msTotal % 3600000) / 60000);
  const s = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateSrt(words: WordCue[], speed = 1.10): string {
  const chunks = buildSemanticCaptionChunks(words, { maxWords: 4, maxChars: 28 });
  return chunks
    .map((c, idx) => {
      const start = formatSrtTimestamp(c.start / speed);
      const end = formatSrtTimestamp(c.end / speed);
      const text = c.words.map((w) => w.text).join(' ');
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}
