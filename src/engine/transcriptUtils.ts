import type { BrandLogoId, DynamicIconKind, DynamicVisualType } from '../types/batch';
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
  subBrollKeys?: string[];
  subBrollUrls?: string[];
  brollCaption?: string;
  iconKind?: DynamicIconKind;
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
  dateBadge?: string;
  sourceLabel?: string;
  quoteText?: string;
  quoteHighlight?: string;
  uiUrl?: string;
  uiActionLabel?: string;
  chartUnit?: string;
  chartPoints?: Array<{ label: string; value: number; highlight?: boolean }>;
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
  brandLogo?: BrandLogoId;
  notoIcon?: string;
  matrixHighlightPct?: number;
  matrixTotalDots?: number;
  matrixCalloutLabel?: string;
  dialKnobs?: Array<{ label: string; value: number; unit?: string; active?: boolean }>;
  diffBeforeLines?: string[];
  diffAfterLines?: string[];
  diffScore?: number;
  newsPublication?: string;
  newsHeadline?: string;
  newsHighlightPhrase?: string;
  newsYears?: [string, string];
  neuralLayers?: string[];
  neuralEquation?: string;
  codeLines?: string[];
  repoName?: string;
  repoStars?: string;
  authorName?: string;
  slashCommands?: string[];
  heatCells?: number[];
  hookVariantsList?: Array<{ hook: string; retention: string }>;
  fanCards?: Array<{ tag: string; metric: string; label: string }>;
  toolboxTools?: string[];
  cableAppLabel?: string;
  crtYear?: string;
  crtMetric?: string;
  beforeBadText?: string;
  afterGoodText?: string;
  highlightWord?: string;
  strikeWord?: string;
  visualQuery?: string;
  receiptItems?: Array<{ label: string; amount: string; highlight?: boolean; tone?: 'neutral' | 'negative' | 'positive' }>;
  receiptTotalLabel?: string;
  receiptTotalValue?: string;
  calendarMonth?: string;
  calendarYear?: string;
  calendarDaysMarked?: number[];
  calendarHighlightDay?: number;
  calendarNote?: string;
  scaleTilt?: 'left' | 'right' | 'balanced';
  barrierBadge?: string;
  barrierRuleText?: string;
  compressorFrom?: string;
  compressorTo?: string;
  compressorUnitLabel?: string;
  mindmapCenter?: string;
  mindmapNodes?: Array<{ label: string; detail?: string }>;
  auditRows?: Array<{ label: string; detail: string; status: 'alert' | 'ok' | 'removed'; badge: string }>;
  profileCards?: Array<{ name: string; role: string; metric: string; quote: string }>;
  notifCount?: string;
  notifItems?: Array<{ sender: string; message: string; time?: string }>;
  quotaActualLabel?: string;
  quotaPlannedLabel?: string;
  quotaBars?: Array<{ label: string; pct: number }>;
  globeOrigin?: string;
  globeDestinations?: Array<{ label: string; value: string }>;
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
        subBrollKeys: Array.isArray(b.subBrollKeys) ? b.subBrollKeys.map(String) : undefined,
        subBrollUrls: Array.isArray(b.subBrollUrls) ? b.subBrollUrls.map(String) : undefined,
        brollCaption: typeof b.brollCaption === 'string' ? b.brollCaption : undefined,
        iconKind: typeof b.iconKind === 'string' ? (b.iconKind as DynamicIconKind) : undefined,
        stampWord: typeof b.stampWord === 'string' ? b.stampWord : undefined,
        statValue: typeof b.statValue === 'string' ? b.statValue : undefined,
        statLabel: typeof b.statLabel === 'string' ? b.statLabel : undefined,
        dateBadge: typeof b.dateBadge === 'string' ? b.dateBadge : undefined,
        sourceLabel: typeof b.sourceLabel === 'string' ? b.sourceLabel : undefined,
        quoteText: typeof b.quoteText === 'string' ? b.quoteText : undefined,
        quoteHighlight: typeof b.quoteHighlight === 'string' ? b.quoteHighlight : undefined,
        uiUrl: typeof b.uiUrl === 'string' ? b.uiUrl : undefined,
        uiActionLabel: typeof b.uiActionLabel === 'string' ? b.uiActionLabel : undefined,
        chartUnit: typeof b.chartUnit === 'string' ? b.chartUnit : undefined,
        chartPoints: Array.isArray(b.chartPoints)
          ? (b.chartPoints as Array<{ label: string; value: number; highlight?: boolean }>)
          : undefined,
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
        brandLogo: typeof b.brandLogo === 'string' ? (b.brandLogo as BrandLogoId) : undefined,
        notoIcon: typeof b.notoIcon === 'string' ? b.notoIcon : undefined,
        matrixHighlightPct: typeof b.matrixHighlightPct === 'number' ? b.matrixHighlightPct : undefined,
        matrixTotalDots: typeof b.matrixTotalDots === 'number' ? b.matrixTotalDots : undefined,
        matrixCalloutLabel: typeof b.matrixCalloutLabel === 'string' ? b.matrixCalloutLabel : undefined,
        dialKnobs: Array.isArray(b.dialKnobs) ? (b.dialKnobs as DynamicBeat['dialKnobs']) : undefined,
        diffBeforeLines: Array.isArray(b.diffBeforeLines) ? b.diffBeforeLines.map(String) : undefined,
        diffAfterLines: Array.isArray(b.diffAfterLines) ? b.diffAfterLines.map(String) : undefined,
        diffScore: typeof b.diffScore === 'number' ? b.diffScore : undefined,
        newsPublication: typeof b.newsPublication === 'string' ? b.newsPublication : undefined,
        newsHeadline: typeof b.newsHeadline === 'string' ? b.newsHeadline : undefined,
        newsHighlightPhrase: typeof b.newsHighlightPhrase === 'string' ? b.newsHighlightPhrase : undefined,
        newsYears: Array.isArray(b.newsYears) && b.newsYears.length >= 2
          ? [String(b.newsYears[0]), String(b.newsYears[1])]
          : undefined,
        neuralLayers: Array.isArray(b.neuralLayers) ? b.neuralLayers.map(String) : undefined,
        neuralEquation: typeof b.neuralEquation === 'string' ? b.neuralEquation : undefined,
        codeLines: Array.isArray(b.codeLines) ? b.codeLines.map(String) : undefined,
        repoName: typeof b.repoName === 'string' ? b.repoName : undefined,
        repoStars: typeof b.repoStars === 'string' ? b.repoStars : undefined,
        authorName: typeof b.authorName === 'string' ? b.authorName : undefined,
        slashCommands: Array.isArray(b.slashCommands) ? b.slashCommands.map(String) : undefined,
        heatCells: Array.isArray(b.heatCells) ? b.heatCells.map(Number) : undefined,
        hookVariantsList: Array.isArray(b.hookVariantsList)
          ? (b.hookVariantsList as DynamicBeat['hookVariantsList'])
          : undefined,
        fanCards: Array.isArray(b.fanCards) ? (b.fanCards as DynamicBeat['fanCards']) : undefined,
        toolboxTools: Array.isArray(b.toolboxTools) ? b.toolboxTools.map(String) : undefined,
        cableAppLabel: typeof b.cableAppLabel === 'string' ? b.cableAppLabel : undefined,
        crtYear: typeof b.crtYear === 'string' ? b.crtYear : undefined,
        crtMetric: typeof b.crtMetric === 'string' ? b.crtMetric : undefined,
        beforeBadText: typeof b.beforeBadText === 'string' ? b.beforeBadText : undefined,
        afterGoodText: typeof b.afterGoodText === 'string' ? b.afterGoodText : undefined,
        highlightWord: typeof b.highlightWord === 'string' ? b.highlightWord : undefined,
        strikeWord: typeof b.strikeWord === 'string' ? b.strikeWord : undefined,
        visualQuery: typeof b.visualQuery === 'string' ? b.visualQuery : undefined,
        receiptItems: Array.isArray(b.receiptItems) ? (b.receiptItems as DynamicBeat['receiptItems']) : undefined,
        receiptTotalLabel: typeof b.receiptTotalLabel === 'string' ? b.receiptTotalLabel : undefined,
        receiptTotalValue: typeof b.receiptTotalValue === 'string' ? b.receiptTotalValue : undefined,
        calendarMonth: typeof b.calendarMonth === 'string' ? b.calendarMonth : undefined,
        calendarYear: typeof b.calendarYear === 'string' ? b.calendarYear : undefined,
        calendarDaysMarked: Array.isArray(b.calendarDaysMarked) ? b.calendarDaysMarked.map(Number) : undefined,
        calendarHighlightDay: typeof b.calendarHighlightDay === 'number' ? b.calendarHighlightDay : undefined,
        calendarNote: typeof b.calendarNote === 'string' ? b.calendarNote : undefined,
        scaleTilt:
          b.scaleTilt === 'left' || b.scaleTilt === 'right' || b.scaleTilt === 'balanced'
            ? b.scaleTilt
            : undefined,
        barrierBadge: typeof b.barrierBadge === 'string' ? b.barrierBadge : undefined,
        barrierRuleText: typeof b.barrierRuleText === 'string' ? b.barrierRuleText : undefined,
        compressorFrom: typeof b.compressorFrom === 'string' ? b.compressorFrom : undefined,
        compressorTo: typeof b.compressorTo === 'string' ? b.compressorTo : undefined,
        compressorUnitLabel: typeof b.compressorUnitLabel === 'string' ? b.compressorUnitLabel : undefined,
        mindmapCenter: typeof b.mindmapCenter === 'string' ? b.mindmapCenter : undefined,
        mindmapNodes: Array.isArray(b.mindmapNodes) ? (b.mindmapNodes as DynamicBeat['mindmapNodes']) : undefined,
        auditRows: Array.isArray(b.auditRows) ? (b.auditRows as DynamicBeat['auditRows']) : undefined,
        profileCards: Array.isArray(b.profileCards) ? (b.profileCards as DynamicBeat['profileCards']) : undefined,
        notifCount: typeof b.notifCount === 'string' ? b.notifCount : undefined,
        notifItems: Array.isArray(b.notifItems) ? (b.notifItems as DynamicBeat['notifItems']) : undefined,
        quotaActualLabel: typeof b.quotaActualLabel === 'string' ? b.quotaActualLabel : undefined,
        quotaPlannedLabel: typeof b.quotaPlannedLabel === 'string' ? b.quotaPlannedLabel : undefined,
        quotaBars: Array.isArray(b.quotaBars) ? (b.quotaBars as DynamicBeat['quotaBars']) : undefined,
        globeOrigin: typeof b.globeOrigin === 'string' ? b.globeOrigin : undefined,
        globeDestinations: Array.isArray(b.globeDestinations)
          ? (b.globeDestinations as DynamicBeat['globeDestinations'])
          : undefined,
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
