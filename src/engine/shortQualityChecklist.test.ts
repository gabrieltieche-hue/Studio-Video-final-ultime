import test from 'node:test';
import assert from 'node:assert/strict';
import type { BatchBeatSpec } from '../types/batch';
import type { ShortProject } from '../types/studio';
import { alignmentToWords, buildTimedProjectFromBeatAudios } from './batchShortBuilder';
import { selectBottomMediaForShort } from './brollKeys';
import { auditShortQuality } from './shortQualityChecklist';

function makeUniversalSpecs(): BatchBeatSpec[] {
  return [
    {
      id: 'b1',
      title: 'SMIC +1,6 % net',
      shortLabel: 'HOOK',
      screenLabel: 'SALAIRE',
      spokenLine: 'Le SMIC grimpe de 1,6 pour cent dès ce mois-ci.',
      visualType: 'metric_shock_hook',
      layoutHint: 'split',
      statValue: '+1,6 %',
      statLabel: 'Hausse brute mensuelle',
    },
    {
      id: 'b2',
      title: 'Sur la fiche de paie',
      shortLabel: 'PAIE',
      screenLabel: 'BULLETIN',
      spokenLine: 'Voici ce qui reste vraiment net après cotisations.',
      visualType: 'paper_receipt_payslip',
      layoutHint: 'split',
      receiptItems: [
        { label: 'Brut', amount: '1 801 €' },
        { label: 'Cotisations', amount: '-375 €', tone: 'negative' },
        { label: 'Net', amount: '1 426 €', highlight: true, tone: 'positive' },
      ],
    },
    {
      id: 'b3',
      title: 'Poids patronal vs net',
      shortLabel: 'DUEL',
      screenLabel: 'ÉCART',
      spokenLine: 'L’entreprise verse beaucoup plus que ce que touche le salarié.',
      visualType: 'balance_scale_duel',
      layoutHint: 'fullscreen',
      leftCard: { label: 'Employeur', value: '2 190 €', sub: 'Coût' },
      rightCard: { label: 'Salarié', value: '1 426 €', sub: 'Net' },
    },
    {
      id: 'b4',
      title: 'Seuil d’allègement',
      shortLabel: 'SEUIL',
      screenLabel: 'PIÈGE',
      spokenLine: 'Les exonérations disparaissent vite quand le salaire progresse.',
      visualType: 'trap_barrier_alert',
      layoutHint: 'split',
      barrierBadge: 'PLAFOND',
      barrierRuleText: 'Coût marginal doublé autour de 1,6 SMIC.',
    },
    {
      id: 'b5',
      title: 'Ce que montrent les chiffres',
      shortLabel: 'COURBE',
      screenLabel: 'TENDANCE',
      spokenLine: 'La hausse des bas salaires concentre toujours plus d’emplois au minimum.',
      visualType: 'animated_data_chart',
      layoutHint: 'fullscreen',
      chartPoints: [
        { label: '2021', value: 12 },
        { label: '2023', value: 15 },
        { label: '2026', value: 17, highlight: true },
      ],
    },
    {
      id: 'b6',
      title: 'Trois leviers clairs',
      shortLabel: 'ACTIONS',
      screenLabel: 'SOLUTIONS',
      spokenLine: 'Lisser la courbe libère les hausses de salaire dans les PME.',
      visualType: 'scrolling_checklist_spotlight',
      layoutHint: 'split',
      bullets: ['Lisser les allègements', 'Valoriser la qualification', 'Suivre le net réel'],
    },
    {
      id: 'b7',
      title: 'Abonne-toi chaque jour',
      shortLabel: 'CTA',
      screenLabel: 'CHAÎNE',
      spokenLine: 'Abonne-toi et active la cloche pour la suite.',
      visualType: 'channel_end_cta',
      layoutHint: 'split',
    },
  ];
}

test('auditShortQuality passes cleanly on generated 1.10x Short with 6+ unique universal primitives and full-bleed photos', () => {
  const baseBeats = makeUniversalSpecs();
  const beatWindows = [
    { from: 0, to: 3.4 },
    { from: 3.4, to: 7.0 },
    { from: 7.0, to: 10.6 },
    { from: 10.6, to: 14.2 },
    { from: 14.2, to: 17.8 },
    { from: 17.8, to: 21.4 },
    { from: 21.4, to: 24.8 },
  ];
  const selectedMedia = selectBottomMediaForShort({
    beats: baseBeats.map((b, i) => ({ ...b, ...beatWindows[i] })),
    category: 'Économie',
    theme: 'SMIC +1,6 % et fiche de paie',
  });
  const enrichedMedia: BatchBeatSpec[] = baseBeats.map((b, i) => ({
    ...b,
    brollKey: selectedMedia[i].primaryId,
    subBrollKeys: selectedMedia[i].subBrollKeys,
    brollCaption: selectedMedia[i].caption,
  }));
  const fullText = enrichedMedia.map((b) => b.spokenLine).join(' ');
  const { words } = alignmentToWords(null, fullText, 24.8);
  const timed = buildTimedProjectFromBeatAudios({
    beatsSpec: enrichedMedia,
    beatWindows,
    words,
    totalDurationSec: 24.8,
  });

  const project = {
    id: 'proj-quality-ok',
    slug: 'quality-ok',
    title: 'SMIC +1,6 %',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'ready',
    duration: timed.durationSec,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [],
    transcript: words,
    motionTrack: timed.motionTrack,
    layoutTrack: [],
    sfxTrack: timed.sfxTrack,
    feedbacks: [],
    editSpec: {
      speed: 1.1,
      beats: timed.beats,
    },
  } as unknown as ShortProject;

  const report = auditShortQuality(project);
  assert.equal(report.passed, true, `Unexpected quality issues: ${report.issues.join('; ')}`);
  assert.equal(report.score, 5);
});

test('auditShortQuality catches slow speed and duplicate primitive violations', () => {
  const baseBeats = makeUniversalSpecs();
  baseBeats[2].visualType = baseBeats[1].visualType;
  const beatWindows = baseBeats.map((_, i) => ({ from: i * 3.5, to: (i + 1) * 3.5 }));
  const fullText = baseBeats.map((b) => b.spokenLine).join(' ');
  const { words } = alignmentToWords(null, fullText, 24.5);
  const timed = buildTimedProjectFromBeatAudios({
    beatsSpec: baseBeats,
    beatWindows,
    words,
    totalDurationSec: 24.5,
  });

  const project = {
    id: 'proj-quality-bad',
    slug: 'quality-bad',
    title: 'Bad speed & duplicate',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'ready',
    duration: timed.durationSec,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [],
    transcript: words,
    motionTrack: timed.motionTrack,
    layoutTrack: [],
    sfxTrack: timed.sfxTrack,
    feedbacks: [],
    editSpec: {
      speed: 1.02,
      beats: timed.beats,
    },
  } as unknown as ShortProject;

  const report = auditShortQuality(project);
  assert.equal(report.passed, false);
  assert.equal(report.checks.find((c) => c.id === 'speed_and_silence')?.passed, false);
  assert.equal(report.checks.find((c) => c.id === 'archetype_variety')?.passed, false);
});
