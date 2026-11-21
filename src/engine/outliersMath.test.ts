import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyOutlierTier,
  computeMedianViews,
  findSemanticWordTimestamps,
  humanizeFrenchScript,
  pickBestHookVariant,
  scoreHookVariant,
  scoreOutliers,
  type OutlierCandidate,
} from './outliersMath';
import type { WhisperWord } from '../types/studio';

test('computeMedianViews handles odd, even, and invalid inputs accurately', () => {
  assert.equal(computeMedianViews([100, 500, 200]), 200);
  assert.equal(computeMedianViews([100, 200, 400, 1000]), 300);
  assert.equal(computeMedianViews([]), 0);
});

test('scoreOutliers computes per-creator multipliers and sorts highest outliers first', () => {
  const candidates: OutlierCandidate[] = [
    {
      id: 'a1',
      creatorHandle: '@melvynxdev',
      platform: 'instagram',
      titleOrHook: 'Post normal 1',
      views: 15_000,
    },
    {
      id: 'a2',
      creatorHandle: '@melvynxdev',
      platform: 'instagram',
      titleOrHook: 'Post normal 2',
      views: 20_000,
    },
    {
      id: 'a3',
      creatorHandle: '@melvynxdev',
      platform: 'instagram',
      titleOrHook: '72 % des humains n utilisent pas l IA',
      views: 180_000,
    },
    {
      id: 'b1',
      creatorHandle: '@underscore_talk',
      platform: 'tiktok',
      titleOrHook: 'Autre créateur',
      views: 50_000,
    },
  ];

  const scored = scoreOutliers(candidates);
  assert.equal(scored[0].item.id, 'a3');
  assert.equal(scored[0].medianViews, 20_000);
  assert.equal(scored[0].multiplier, 9);
  assert.equal(scored[0].tier, 'viral');
  assert.equal(classifyOutlierTier(2.1), 'hot');
  assert.equal(classifyOutlierTier(1.4), 'above');
  assert.equal(classifyOutlierTier(1.0), 'normal');
});

test('humanizeFrenchScript eliminates em-dashes, AI clichés, and generic intros', () => {
  const aiSlop =
    'Bonjour à tous ! Dans un monde en constante évolution, il est important de noter que Claude — une véritable révolution incontournable — va booster ton travail.';
  const res = humanizeFrenchScript(aiSlop);
  assert.ok(!res.cleaned.includes('—'));
  assert.ok(!/bonjour à tous/i.test(res.cleaned));
  assert.ok(!/dans un monde en constante évolution/i.test(res.cleaned));
  assert.ok(!/révolutionnaire|véritable révolution/i.test(res.cleaned));
  assert.ok(!/incontournable/i.test(res.cleaned));
  assert.ok(!/booster/i.test(res.cleaned));
  assert.ok(res.strippedPatterns.length >= 4);
});

test('pickBestHookVariant prefers concise concrete hooks over vague AI intros', () => {
  const best = pickBestHookVariant([
    'Dans cette vidéo on va plonger dans un outil révolutionnaire incroyable.',
    '72 % de l’humanité n’a jamais posé une question à Claude, pourtant tu es déjà en retard ?',
    'Voici pourquoi tout change.',
  ]);
  assert.ok(best.score >= 7, `Expected score >= 7, got ${best.score}`);
  assert.ok(best.hook.includes('72 %'));

  const weak = scoreHookVariant('Bonjour à tous aujourd’hui un sujet incroyable.');
  assert.ok(weak.score < best.score);
});

test('findSemanticWordTimestamps anchors SFX to exact spoken keywords', () => {
  const words: WhisperWord[] = [
    { id: 'w1', word: 'Cette', start: 0.1, end: 0.3, confidence: 0.99 },
    { id: 'w2', word: 'règle', start: 0.35, end: 0.7, confidence: 0.99 },
    { id: 'w3', word: 'vient', start: 0.75, end: 1.0, confidence: 0.99 },
    { id: 'w4', word: 'd’exploser', start: 1.42, end: 1.9, confidence: 0.99 },
    { id: 'w5', word: '85 %', start: 2.1, end: 2.5, confidence: 0.99 },
  ];

  const hookCues = findSemanticWordTimestamps({
    words,
    beatFrom: 0,
    beatTo: 3.4,
    visualType: 'hook_shatter',
    beatIndex: 0,
    isLastBeat: false,
    currentLayout: 'split',
    totalDurationSec: 42,
  });

  assert.equal(hookCues[0].sound, 'glass-shatter');
  assert.equal(hookCues[0].start, 1.42);
  assert.ok(hookCues.some((c) => c.sound === 'pop' && c.start === 2.1));

  const ctaWords: WhisperWord[] = [
    { id: 'c1', word: 'Abonne-toi', start: 38.6, end: 39.2, confidence: 0.99 },
    { id: 'c2', word: 'et', start: 39.25, end: 39.35, confidence: 0.99 },
    { id: 'c3', word: 'active', start: 39.4, end: 39.7, confidence: 0.99 },
    { id: 'c4', word: 'la', start: 39.75, end: 39.85, confidence: 0.99 },
    { id: 'c5', word: 'cloche', start: 39.9, end: 40.3, confidence: 0.99 },
  ];
  const ctaCues = findSemanticWordTimestamps({
    words: ctaWords,
    beatFrom: 38.2,
    beatTo: 42.0,
    visualType: 'cta_card',
    beatIndex: 7,
    isLastBeat: true,
    currentLayout: 'split',
    totalDurationSec: 42,
  });
  assert.equal(ctaCues[0].sound, 'pop-back');
  assert.equal(ctaCues[0].start, 38.6);
  assert.equal(ctaCues[1].sound, 'bell');
  assert.equal(ctaCues[1].start, 39.9);
});
