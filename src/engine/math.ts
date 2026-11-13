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

/**
 * Groups spoken words into 1-3 word / <= 16 char chunks per Melvynx's shorts-codes.md.
 */
export function buildCaptionChunks(
  words: WordCue[],
  maxWords = 3,
  maxChars = 16
): Array<{ words: WordCue[]; start: number; end: number }> {
  const chunks: Array<{ words: WordCue[]; start: number; end: number }> = [];
  let current: WordCue[] = [];
  let chars = 0;

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

  for (const w of words) {
    const nextChars = chars + (current.length ? 1 : 0) + w.text.length;
    if (current.length >= maxWords || (current.length > 0 && nextChars > maxChars)) {
      flush();
    }
    current.push(w);
    chars = current.reduce((acc, item, idx) => acc + item.text.length + (idx ? 1 : 0), 0);
    if (/[.!?…:]$/.test(w.text)) {
      flush();
    }
  }
  flush();
  return chunks;
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
    if (t >= chunk.start - 0.04 && t <= chunk.end + 0.16) {
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
export function getLayoutSeam(t: number, keys: Array<[number, number]>, transitionDur = 0.34): number {
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

export function generateSrt(words: WordCue[], speed = 1.15): string {
  const chunks = buildCaptionChunks(words, 6, 36);
  return chunks
    .map((c, idx) => {
      const start = formatSrtTimestamp(c.start / speed);
      const end = formatSrtTimestamp(c.end / speed);
      const text = c.words.map((w) => w.text).join(' ');
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}
