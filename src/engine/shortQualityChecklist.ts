import { BROLL_DATABASE_BY_ID } from '../data/brollDatabase';
import { DEFAULT_PLAYBACK_SPEED } from '../data/shortSpec';
import type { BatchBeatSpec, DynamicVisualType } from '../types/batch';
import type { ShortProject } from '../types/studio';
import { buildSemanticCaptionChunks, type WordCue } from './math';
import { normalizeToUniversalPrimitive } from './shortPrimitivesSchema';

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

  // 1. Speed >= 1.08x (sweet spot 1.10x)
  const speed = Number((project.editSpec as { speed?: unknown })?.speed ?? DEFAULT_PLAYBACK_SPEED);
  const speedOk = Number.isFinite(speed) && speed >= 1.08;
  if (!speedOk) {
    issues.push(`Vitesse insuffisante (${speed.toFixed(2)}× < 1.08×)`);
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

  // 3. Archetype variety (>= 6 distinct non-CTA universal primitives, 0 duplicates inside the video)
  const beats: BatchBeatSpec[] = Array.isArray((project.editSpec as { beats?: unknown })?.beats)
    ? ((project.editSpec as { beats: BatchBeatSpec[] }).beats)
    : [];
  const mainVisuals = beats
    .map((b) => normalizeToUniversalPrimitive(b.visualType as DynamicVisualType))
    .filter((v) => v !== 'channel_end_cta');
  const uniqueVisuals = new Set(mainVisuals);
  const hasDuplicateArchetype = uniqueVisuals.size !== mainVisuals.length;
  const archetypeOk = !hasDuplicateArchetype && uniqueVisuals.size >= 6;
  if (!archetypeOk) {
    issues.push(
      `Primitives: ${uniqueVisuals.size} uniques sur ${mainVisuals.length} séquences (minimum 6, 0 doublon)`
    );
  }

  // 4. Bottom full-bleed photographic media (no back-to-back repeats, bright/high-contrast, rotation on long beats)
  const seenKeys: string[] = [];
  let backToBackDuplicate = 0;
  let missingOrDarkMedia = 0;
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
    if (bTo - bFrom > 4.4 && keys.length < 2) {
      staleRotationBeats += 1;
    }
    for (const k of keys) {
      if (seenKeys.length > 0 && seenKeys[seenKeys.length - 1] === k) {
        backToBackDuplicate += 1;
      }
      seenKeys.push(k);
      const entry = BROLL_DATABASE_BY_ID[k];
      if (!entry || (entry.lighting !== 'bright' && entry.lighting !== 'high-contrast')) {
        missingOrDarkMedia += 1;
      }
    }
  }
  const brollOk =
    beats.length === 0 ||
    (backToBackDuplicate === 0 && missingOrDarkMedia === 0 && staleRotationBeats === 0);
  if (!brollOk) {
    issues.push(
      `Médias bas: ${backToBackDuplicate} répétition(s) consécutive(s), ${missingOrDarkMedia} manquant(s), ${staleRotationBeats} beat(s) >4.4s sans rotation`
    );
  }

  // 5. Pacing <= 3.9s visual stimulus check
  let staticSpans = 0;
  for (const beat of beats) {
    const bFrom = Number((beat as { from?: number }).from ?? 0);
    const bTo = Number((beat as { to?: number }).to ?? 0);
    const span = Math.max(0, bTo - bFrom);
    const subCount = Math.max(1, Array.isArray(beat.subBrollKeys) ? beat.subBrollKeys.length : 1);
    if (span / subCount > 3.9) {
      staticSpans += 1;
    }
  }
  const pacingOk = staticSpans === 0;
  if (!pacingOk) {
    issues.push(`Rythme: ${staticSpans} séquence(s) dépassent 3.9s sans stimulus visuel`);
  }

  const checks: QualityAuditCheck[] = [
    {
      id: 'speed_and_silence',
      label: 'Cadence 1.10× & silences maîtrisés',
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
      label: 'Variété >= 6 primitives sans doublon',
      passed: archetypeOk,
      details: `${uniqueVisuals.size} primitives distinctes`,
    },
    {
      id: 'bottom_illustrations',
      label: 'Visuels bas plein cadre & lumineux',
      passed: brollOk,
      details: `${seenKeys.length} plans plein cadre`,
    },
    {
      id: 'pacing_2s',
      label: 'Stimulus visuel régulier',
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
