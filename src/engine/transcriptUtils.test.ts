import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDynamicBeatsFromProject,
  findActiveWordIndex,
  groupTranscriptSections,
} from './transcriptUtils';
import type { ShortProject, WhisperWord } from '../types/studio';

const SAMPLE_WORDS: WhisperWord[] = [
  { id: 'w1', word: 'On', start: 0.1, end: 0.3, confidence: 0.99 },
  { id: 'w2', word: 'teste', start: 0.35, end: 0.7, confidence: 0.99 },
  { id: 'w3', word: 'le', start: 1.5, end: 1.7, confidence: 0.99 },
  { id: 'w4', word: 'système', start: 1.75, end: 2.3, confidence: 0.99 },
];

test('groupTranscriptSections aligns words to motionTrack beats', () => {
  const sections = groupTranscriptSections(SAMPLE_WORDS, [
    { id: 'b1', componentId: 'c1', name: 'Hook', start: 0, end: 1.2, type: 'card' },
    { id: 'b2', componentId: 'c2', name: 'Preuve', start: 1.2, end: 3.0, type: 'chart' },
  ]);

  assert.equal(sections.length, 2);
  assert.equal(sections[0].label, 'Hook');
  assert.equal(sections[0].words.map((w) => w.word).join(' '), 'On teste');
  assert.equal(sections[1].label, 'Preuve');
  assert.equal(sections[1].words.map((w) => w.word).join(' '), 'le système');
});

test('groupTranscriptSections falls back to paragraph chunks when motionTrack is empty', () => {
  const words = Array.from({ length: 30 }, (_, i) => ({
    id: `w-${i}`,
    word: `mot${i}`,
    start: i * 0.4,
    end: i * 0.4 + 0.3,
    confidence: 0.95,
  }));

  const sections = groupTranscriptSections(words, []);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].words.length, 22);
  assert.equal(sections[1].words.length, 8);
});

test('findActiveWordIndex returns matching index or -1 in silence', () => {
  assert.equal(findActiveWordIndex(SAMPLE_WORDS, 0.45), 1);
  assert.equal(findActiveWordIndex(SAMPLE_WORDS, 1.0), -1);
  assert.equal(findActiveWordIndex(SAMPLE_WORDS, 2.0), 3);
});

test('buildDynamicBeatsFromProject prefers editSpec.beats when present', () => {
  const proj: ShortProject = {
    id: 'p1',
    slug: 'p1',
    title: 'IA Agent',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'draft',
    duration: 30,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [],
    transcript: SAMPLE_WORDS,
    motionTrack: [],
    layoutTrack: [],
    sfxTrack: [],
    musicTrack: { trackName: 'upbeat.mp3', volume: 0.24, ducking: true },
    feedbacks: [],
    motionComponents: {},
    contactSheet: [],
    styleProfile: {
      name: 'Papier',
      fontFamily: 'Bricolage Grotesque',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 6,
    },
    editSpec: {
      beats: [
        { id: 'sb1', title: 'Hook IA', spokenLine: 'L’IA change tout.', from: 0, to: 10, layout: 'split' },
        { id: 'sb2', title: 'Verdict', spokenLine: 'Passe à l’action.', from: 10, to: 30, layout: 'fullscreen' },
      ],
    },
  };

  const beats = buildDynamicBeatsFromProject(proj);
  assert.equal(beats.length, 2);
  assert.equal(beats[0].title, 'Hook IA');
  assert.equal(beats[1].layout, 'fullscreen');
});
