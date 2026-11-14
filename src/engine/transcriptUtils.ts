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
  spokenLine: string;
  screenLabel: string;
  from: number;
  to: number;
  layout: 'split' | 'fullscreen';
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
      const layoutRaw = String(b.layout || 'split');
      return {
        id: String(b.id || `spec-beat-${idx + 1}`),
        index: idx + 1,
        title: String(b.title || b.shortLabel || `Séquence ${idx + 1}`),
        spokenLine: String(b.spokenLine || b.text || ''),
        screenLabel: String(b.screenLabel || b.hookScreen || b.title || `Beat ${idx + 1}`),
        from: Number.isFinite(from) ? from : 0,
        to: Number.isFinite(to) ? to : duration,
        layout: layoutRaw === 'fullscreen' ? 'fullscreen' : 'split',
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
