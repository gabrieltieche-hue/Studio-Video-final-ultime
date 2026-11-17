import type { DynamicIconKind, DynamicVisualType } from '../types/batch';
import type { ShortProject, WhisperWord } from '../types/studio';

export interface TranscriptSection {
  id: string;
  label: string;
  start: number;
  end: number;
  words: WhisperWord[];
}

export interface DynamicBeat {
  id: string;
  index: number;
  title: string;
  shortLabel?: string;
  spokenLine: string;
  screenLabel: string;
  from: number;
  to: number;
  layout: 'split' | 'fullscreen';
  visualType?: DynamicVisualType;
  brollKey?: string;
  brollCaption?: string;
  iconKind?: DynamicIconKind;
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
  dateBadge?: string;
  sourceLabel?: string;
  leftCard?: { label: string; value: string; sub: string };
  rightCard?: { label: string; value: string; sub: string };
  subStats?: Array<{ value: string; label: string }>;
  bullets?: string[];
  steps?: string[];
  toggles?: Array<{ label: string; before: string; after: string; activeAfter: boolean }>;
  terminalCmd?: string;
  terminalOut?: string[];
  comparisonLeft?: { label: string; value: string; ratio: number };
  comparisonRight?: { label: string; value: string; ratio: number };
  multiplierBadge?: string;
  gaugePct?: number;
}

/**
 * Groups transcript words cleanly into editorial sections aligned with motionTrack beats
 * (or natural ~22-word paragraphs when no motionTrack is defined).
 */
export function groupTranscriptSections(
  words: WhisperWord[],
  motionTrack: ShortProject['motionTrack'] = []
): TranscriptSection[] {
  if (!words || words.length === 0) return [];

  const sortedBeats = [...motionTrack].sort((a, b) => a.start - b.start);
  if (sortedBeats.length > 0) {
    const sections: TranscriptSection[] = sortedBeats.map((b, idx) => ({
      id: b.id || `beat-${idx + 1}`,
      label: b.name || `Séquence ${idx + 1}`,
      start: b.start,
      end: b.end,
      words: [],
    }));

    for (const w of words) {
      let targetIdx = sortedBeats.findIndex((b) => w.start >= b.start && w.start < b.end);
      if (targetIdx === -1) {
        targetIdx = sortedBeats.reduce(
          (best, b, i) => (w.start >= b.start ? i : best),
          0
        );
      }
      sections[targetIdx]?.words.push(w);
    }

    return sections.filter((s) => s.words.length > 0);
  }

  const out: TranscriptSection[] = [];
  for (let i = 0; i < words.length; i += 22) {
    const slice = words.slice(i, i + 22);
    out.push({
      id: `sec-${i}`,
      label: `Passage ${out.length + 1}`,
      start: slice[0].start,
      end: slice[slice.length - 1].end,
      words: slice,
    });
  }
  return out;
}

/**
 * Finds the active word index for a given playback time, tolerating small gaps between words.
 */
export function findActiveWordIndex(words: WhisperWord[], currentTime: number): number {
  if (!words || words.length === 0) return -1;
  const exact = words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
  if (exact !== -1) return exact;
  return -1;
}

/**
 * Extracts structured visual beats from any ShortProject (from editSpec.beats, motionTrack, or hookText)
 * so DynamicShortStage and Prompteur always have coherent scenes to display.
 */
export function buildDynamicBeatsFromProject(project: ShortProject): DynamicBeat[] {
  const duration = Math.max(10, project.duration || 45);
  const specBeats = Array.isArray((project.editSpec as { beats?: unknown })?.beats)
    ? ((project.editSpec as { beats: Array<Record<string, unknown>> }).beats)
    : [];

  if (specBeats.length > 0) {
    return specBeats.map((b, idx) => {
      const from = Number(b.from ?? (idx * duration) / specBeats.length);
      const to = Number(b.to ?? ((idx + 1) * duration) / specBeats.length);
      const layoutRaw = String(b.layout || b.layoutHint || 'split');
      const vType = b.visualType as DynamicVisualType | undefined;
      return {
        id: String(b.id || `spec-beat-${idx + 1}`),
        index: idx + 1,
        title: String(b.title || b.shortLabel || `Séquence ${idx + 1}`),
        shortLabel: typeof b.shortLabel === 'string' ? b.shortLabel : undefined,
        spokenLine: String(b.spokenLine || b.text || ''),
        screenLabel: String(b.screenLabel || b.hookScreen || b.title || `Beat ${idx + 1}`),
        from: Number.isFinite(from) ? from : 0,
        to: Number.isFinite(to) ? to : duration,
        layout: layoutRaw === 'fullscreen' ? 'fullscreen' : 'split',
        visualType: vType,
        brollKey: typeof b.brollKey === 'string' ? b.brollKey : undefined,
        brollCaption: typeof b.brollCaption === 'string' ? b.brollCaption : undefined,
        iconKind: typeof b.iconKind === 'string' ? (b.iconKind as DynamicIconKind) : undefined,
        stampWord: typeof b.stampWord === 'string' ? b.stampWord : undefined,
        statValue: typeof b.statValue === 'string' ? b.statValue : undefined,
        statLabel: typeof b.statLabel === 'string' ? b.statLabel : undefined,
        dateBadge: typeof b.dateBadge === 'string' ? b.dateBadge : undefined,
        sourceLabel: typeof b.sourceLabel === 'string' ? b.sourceLabel : undefined,
        leftCard:
          b.leftCard && typeof b.leftCard === 'object'
            ? (b.leftCard as DynamicBeat['leftCard'])
            : undefined,
        rightCard:
          b.rightCard && typeof b.rightCard === 'object'
            ? (b.rightCard as DynamicBeat['rightCard'])
            : undefined,
        subStats: Array.isArray(b.subStats)
          ? (b.subStats as Array<{ value: string; label: string }>)
          : undefined,
        bullets: Array.isArray(b.bullets) ? b.bullets.map(String) : undefined,
        steps: Array.isArray(b.steps) ? b.steps.map(String) : undefined,
        toggles: Array.isArray(b.toggles)
          ? (b.toggles as DynamicBeat['toggles'])
          : undefined,
        terminalCmd: typeof b.terminalCmd === 'string' ? b.terminalCmd : undefined,
        terminalOut: Array.isArray(b.terminalOut) ? b.terminalOut.map(String) : undefined,
        comparisonLeft:
          b.comparisonLeft && typeof b.comparisonLeft === 'object'
            ? (b.comparisonLeft as DynamicBeat['comparisonLeft'])
            : undefined,
        comparisonRight:
          b.comparisonRight && typeof b.comparisonRight === 'object'
            ? (b.comparisonRight as DynamicBeat['comparisonRight'])
            : undefined,
        multiplierBadge: typeof b.multiplierBadge === 'string' ? b.multiplierBadge : undefined,
        gaugePct: typeof b.gaugePct === 'number' ? b.gaugePct : undefined,
      };
    });
  }

  const sections = groupTranscriptSections(project.transcript || [], project.motionTrack || []);
  if ((project.motionTrack || []).length > 0) {
    return project.motionTrack.map((m, idx) => {
      const matchingSec = sections.find((s) => s.id === m.id);
      const line = matchingSec
        ? matchingSec.words.map((w) => w.word).join(' ')
        : idx === 0 && project.hookText
          ? project.hookText
          : m.name;
      const matchingLayout = (project.layoutTrack || []).find(
        (l) => m.start >= l.start && m.start < l.end
      );
      return {
        id: m.id,
        index: idx + 1,
        title: m.name,
        spokenLine: line,
        screenLabel: m.name,
        from: m.start,
        to: m.end,
        layout: matchingLayout?.layout === 'fullscreen' ? 'fullscreen' : 'split',
      };
    });
  }

  const fallbackText =
    project.hookText ||
    (project.transcript || []).map((w) => w.word).join(' ') ||
    project.title;

  return [
    {
      id: 'beat-1',
      index: 1,
      title: project.title,
      spokenLine: fallbackText,
      screenLabel: project.topicCategory || 'Short Studio',
      from: 0,
      to: duration,
      layout: project.mode === 'split_screen_clips' ? 'split' : 'fullscreen',
    },
  ];
}
