import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
} from './batchShortBuilder';
import { auditShortQuality } from './shortQualityChecklist';
import type { ShortProject } from '../types/studio';

test('auditShortQuality passes cleanly on generated 1.10x Short with 7 unique archetypes and semantic bottom illustrations', () => {
  const script = buildFallbackBatchScript({
    theme: 'Claude Code CLI et MCP : pourquoi 80 % des devs changent de workflow',
    category: 'Tech & Code',
  });
  const fullText = script.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.1, 38);
  const timed = assignBeatTimingsAndTranscript(script.beats, words, durationSec);

  const project = {
    id: 'proj-quality-ok',
    slug: 'quality-ok',
    title: 'Claude Code CLI',
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

test('auditShortQuality catches slow speed and duplicate archetype violations', () => {
  const script = buildFallbackBatchScript({
    theme: 'Réforme découvert bancaire 2026',
    category: 'Actualité',
  });
  const fullText = script.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.0, 38);
  const timed = assignBeatTimingsAndTranscript(script.beats, words, durationSec);
  // Intentionally introduce duplicate visualType and low speed
  timed.beats[2].visualType = timed.beats[1].visualType;

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
