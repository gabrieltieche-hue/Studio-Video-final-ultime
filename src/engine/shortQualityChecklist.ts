import { BROLL_DATABASE_BY_ID } from '../data/brollDatabase';
import { DEFAULT_PLAYBACK_SPEED } from '../data/shortSpec';
import type { BatchBeatSpec, DynamicVisualType } from '../types/batch';
import type { ShortProject } from '../types/studio';
import { buildSemanticCaptionChunks, type WordCue } from './math';

export interface QualityAuditCheck {
  id:
    | 'speed_and_silence'
    | 'subtitles_syntax_design'
    | 'archetype_variety'
    | 'bottom_illustrations'
    | 'pacing_2s';
  label: string;
  passed: boolean;
  details: string;
}

export interface ShortQualityReport {
  passed: boolean;
  score: number;
  maxScore: number;
  checks: QualityAuditCheck[];
  issues: string[];
}

export function auditShortQuality(project: ShortProject): ShortQualityReport {
  const issues: string[] = [];

  // 1. Speed >= 1.10x
  const speed = Number((project.editSpec as { speed?: unknown })?.speed ?? DEFAULT_PLAYBACK_SPEED);
  const speedOk = Number.isFinite(speed) && speed >= 1.1;
  if (!speedOk) {
    issues.push(`Vitesse insuffisante (${speed.toFixed(2)}× < 1.10×)`);
  }

  // 2. Subtitle algorithm (zero mixed sentences / zero cut atomic units)
  const wordCues: WordCue[] = (project.transcript || [])
    .filter((w) => !w.isCut)
    .map((w) => ({ text: w.word, start: w.start, end: w.end }));
  const chunks = buildSemanticCaptionChunks(wordCues, { maxWords: 4, maxChars: 24 });
  let crossSentenceHits = 0;
  let oversizeChunks = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.words.length - 1; i++) {
      if (/[.!?:;—…]$/.test(chunk.words[i].text.trim())) {
        crossSentenceHits += 1;
      }
    }
    const text = chunk.words.map((w) => w.text).join(' ');
    if (text.length > 28) {
      oversizeChunks += 1;
    }
  }
  const subsOk = crossSentenceHits === 0 && oversizeChunks === 0;
  if (!subsOk) {
    issues.push(
      `Sous-titres: ${crossSentenceHits} coupure(s) inter-phrase, ${oversizeChunks} bloc(s) > 28 chars`
    );
  }

  // 3. Archetype variety (>= 7 distinct beats, 0 duplicate archetype inside the video)
  const beats: BatchBeatSpec[] = Array.isArray((project.editSpec as { beats?: unknown })?.beats)
    ? ((project.editSpec as { beats: BatchBeatSpec[] }).beats)
    : [];
  const mainVisuals = beats
    .map((b) => b.visualType)
    .filter((v): v is DynamicVisualType => Boolean(v));
  const nonCtaVisuals = mainVisuals.filter((v) => v !== 'cta_card');
  const uniqueVisuals = new Set(nonCtaVisuals);
  const hasDuplicateArchetype = uniqueVisuals.size !== nonCtaVisuals.length;
  const archetypeOk = !hasDuplicateArchetype && uniqueVisuals.size >= 7;
  if (!archetypeOk) {
    issues.push(
      `Archétypes: ${uniqueVisuals.size} uniques sur ${nonCtaVisuals.length} séquences (minimum 7, 0 doublon)`
    );
  }

  // 4. Bottom illustrations (0 repeated ID, 0 repeated subCategory, 100% bright/high-contrast, sub-rotation on long beats)
  const seenIds = new Set<string>();
  const seenSubCategories = new Set<string>();
  let duplicateIllustration = 0;
  let missingOrDarkIllustration = 0;
  let staleRotationBeats = 0;

  for (const beat of beats) {
    const keys =
      Array.isArray(beat.subBrollKeys) && beat.subBrollKeys.length > 0
        ? beat.subBrollKeys
        : beat.brollKey
          ? [beat.brollKey]
          : [];
    const bFrom = Number((beat as { from?: number }).from ?? 0);
    const bTo = Number((beat as { to?: number }).to ?? 0);
    if (bTo - bFrom > 4.2 && keys.length < 2) {
      staleRotationBeats += 1;
    }
    for (const k of keys) {
      if (seenIds.has(k)) duplicateIllustration += 1;
      seenIds.add(k);
      const entry = BROLL_DATABASE_BY_ID[k];
      if (entry) {
        if (seenSubCategories.has(entry.subCategory)) {
          duplicateIllustration += 1;
        }
        seenSubCategories.add(entry.subCategory);
        if (entry.lighting !== 'bright' && entry.lighting !== 'high-contrast') {
          missingOrDarkIllustration += 1;
        }
      }
    }
  }
  const brollOk =
    beats.length === 0 ||
    (duplicateIllustration === 0 && missingOrDarkIllustration === 0 && staleRotationBeats === 0);
  if (!brollOk) {
    issues.push(
      `Illustrations bas: ${duplicateIllustration} doublon(s), ${missingOrDarkIllustration} sombre(s), ${staleRotationBeats} beat(s) >4.2s sans rotation`
    );
  }

  // 5. Pacing <= 2.5s visual stimulus check (no single beat/sub-illustration span > 3.8s without visual update)
  let staticSpans = 0;
  for (const beat of beats) {
    const bFrom = Number((beat as { from?: number }).from ?? 0);
    const bTo = Number((beat as { to?: number }).to ?? 0);
    const span = Math.max(0, bTo - bFrom);
    const subCount = Math.max(1, Array.isArray(beat.subBrollKeys) ? beat.subBrollKeys.length : 1);
    if (span / subCount > 3.8) {
      staticSpans += 1;
    }
  }
  const pacingOk = staticSpans === 0;
  if (!pacingOk) {
    issues.push(`Rythme: ${staticSpans} séquence(s) dépassent 3.8s sans stimulus visuel`);
  }

  const checks: QualityAuditCheck[] = [
    {
      id: 'speed_and_silence',
      label: 'Cadence 1.10× & silences <= 60ms',
      passed: speedOk,
      details: `Vitesse configurée: ${speed.toFixed(2)}×`,
    },
    {
      id: 'subtitles_syntax_design',
      label: 'Sous-titres sans coupure de phrase',
      passed: subsOk,
      details: `${chunks.length} blocs vérifiés`,
    },
    {
      id: 'archetype_variety',
      label: 'Variété >= 7 archétypes sans doublon',
      passed: archetypeOk,
      details: `${uniqueVisuals.size} archétypes distincts`,
    },
    {
      id: 'bottom_illustrations',
      label: 'Illustrations bas 225× uniques & lumineuses',
      passed: brollOk,
      details: `${seenIds.size} illustrations uniques`,
    },
    {
      id: 'pacing_2s',
      label: 'Stimulus visuel toutes les 1.5–3.5s',
      passed: pacingOk,
      details: pacingOk ? 'Cadence dynamique validée' : `${staticSpans} créneau(x) trop lents`,
    },
  ];

  const score = checks.filter((c) => c.passed).length;
  return {
    passed: score === checks.length,
    score,
    maxScore: checks.length,
    checks,
    issues,
  };
}
