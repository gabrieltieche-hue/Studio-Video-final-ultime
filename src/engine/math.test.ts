import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spring,
  leave,
  track,
  buildCaptionChunks,
  buildSemanticCaptionChunks,
  getActiveCaptionChunk,
  getLayoutSeam,
  generateSrt,
} from './math';
import { BEATS, CAPTION_CHUNKS, DEFAULT_PLAYBACK_SPEED, SHORT_DURATION, WORD_CUES } from '../data/shortSpec';

test('critically damped spring never overshoots 1 and stays monotonic', () => {
  assert.equal(spring(-0.5, 13), 0);
  assert.equal(spring(0, 13), 0);
  let prev = 0;
  for (let x = 0.01; x <= 2.0; x += 0.02) {
    const val = spring(x, 13);
    assert.ok(val >= prev, `spring decreased at x=${x}`);
    assert.ok(val <= 1.0, `spring overshot 1 at x=${x}: ${val}`);
    prev = val;
  }
  assert.ok(spring(1.0, 13) > 0.999);
});

test('leave exit hits exact 0 at endAt and stays 1 before exit window', () => {
  assert.equal(leave(1.0, 3.0, 0.26), 1);
  assert.equal(leave(2.74, 3.0, 0.26), 1);
  const mid = leave(2.87, 3.0, 0.26);
  assert.ok(mid > 0.45 && mid < 0.55);
  assert.equal(leave(3.0, 3.0, 0.26), 0);
  assert.equal(leave(3.2, 3.0, 0.26), 0);
});

test('track retargets smoothly between keyframes', () => {
  const keys: Array<[number, number, number?]> = [
    [0, 1],
    [2, 1.12, 40],
    [4, 1.0, 40],
  ];
  assert.equal(track(1.0, keys), 1);
  assert.ok(track(2.5, keys) > 1.11);
  assert.ok(track(5.0, keys) < 1.001);
});

test('caption chunking obeys maxWords=3, maxChars=16 and sentence boundaries', () => {
  const words = [
    { text: 'Interdire', start: 0.0, end: 0.3 },
    { text: 'les', start: 0.3, end: 0.45 },
    { text: 'réseaux.', start: 0.45, end: 0.85 },
    { text: 'En', start: 0.9, end: 1.05 },
    { text: 'Australie,', start: 1.05, end: 1.5, emph: true },
  ];
  const chunks = buildCaptionChunks(words, 3, 16);
  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks[0].words.map((w) => w.text),
    ['Interdire', 'les']
  );
  assert.deepEqual(
    chunks[1].words.map((w) => w.text),
    ['réseaux.']
  );
  assert.deepEqual(
    chunks[2].words.map((w) => w.text),
    ['En', 'Australie,']
  );
  const active = getActiveCaptionChunk(1.2, chunks);
  assert.ok(active);
  assert.equal(active.activeIndex, 1);
  assert.equal(getActiveCaptionChunk(1.2, chunks, [[1.0, 1.6]]), null);
});

test('layout seam transitions smoothly and respects key targets', () => {
  const keys: Array<[number, number]> = [
    [0, 1160],
    [10, 1920],
    [20, 0],
  ];
  assert.equal(getLayoutSeam(5, keys), 1160);
  const mid = getLayoutSeam(10.17, keys, 0.34);
  assert.ok(mid > 1400 && mid < 1700);
  assert.equal(getLayoutSeam(12, keys), 1920);
  assert.equal(getLayoutSeam(22, keys), 0);
});

test('SRT generator formats timestamps cleanly', () => {
  const srt = generateSrt([{ text: 'Test', start: 0, end: 1.15 }], 1.15);
  assert.match(srt, /00:00:00,000 --> 00:00:01,000/);
});

test('grouped (4, 22) caption chunks keep natural multi-word phrases together', () => {
  const words = [
    { text: 'On', start: 0.04, end: 0.15 },
    { text: 'a', start: 0.2, end: 0.22 },
    { text: 'voulu', start: 0.27, end: 0.52 },
    { text: 'interdire', start: 0.57, end: 1.21, emph: true },
    { text: 'les', start: 1.23, end: 1.32 },
    { text: 'réseaux', start: 1.36, end: 1.68 },
    { text: 'avant', start: 1.74, end: 2.03 },
    { text: '15 ans.', start: 2.08, end: 2.62, emph: true },
  ];
  const chunks = buildCaptionChunks(words, 4, 22);
  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks[0].words.map((w) => w.text),
    ['On', 'a', 'voulu', 'interdire']
  );
  assert.deepEqual(
    chunks[1].words.map((w) => w.text),
    ['les', 'réseaux', 'avant']
  );
  assert.deepEqual(
    chunks[2].words.map((w) => w.text),
    ['15 ans.']
  );
});

test('shortSpec WORD_CUES are strictly monotonic and CAPTION_CHUNKS contain <= 4 words in unified blocks', () => {
  assert.ok(WORD_CUES.length > 50);
  for (let i = 0; i < WORD_CUES.length; i++) {
    assert.ok(WORD_CUES[i].start < WORD_CUES[i].end, `Invalid word span at ${i}`);
    if (i > 0) {
      assert.ok(WORD_CUES[i].start >= WORD_CUES[i - 1].start, `Non-monotonic start at ${i}`);
    }
  }
  assert.ok(CAPTION_CHUNKS.length > 10);
  for (const chunk of CAPTION_CHUNKS) {
    assert.ok(chunk.words.length >= 1 && chunk.words.length <= 4, `Chunk size out of range: ${chunk.words.length}`);
    assert.ok(chunk.end <= SHORT_DURATION);
  }
});

test('shortSpec BEATS cover 0 to SHORT_DURATION continuously and run at DEFAULT_PLAYBACK_SPEED = 1.10', () => {
  assert.equal(DEFAULT_PLAYBACK_SPEED, 1.10);
  assert.equal(BEATS[0].from, 0);
  for (let i = 1; i < BEATS.length; i++) {
    assert.equal(BEATS[i].from, BEATS[i - 1].to, `Gap or overlap at beat ${i + 1}`);
  }
  assert.equal(BEATS[BEATS.length - 1].to, SHORT_DURATION);
  const finalSec = SHORT_DURATION / DEFAULT_PLAYBACK_SPEED;
  assert.ok(finalSec >= 45 && finalSec <= 56, `Unexpected duration ${finalSec}`);
});

test('buildSemanticCaptionChunks strictly flushes on sentence boundaries and protects atomic tokens', () => {
  const sentenceTokens = [
    'Offres',
    'en',
    'France.',
    'Croisement',
    'Banque',
    'de',
    'France',
    '!',
    'Découvert',
    'sans',
    'plafond',
    ';',
    'Sur',
    'ton',
    'compte.',
    'Deux',
    'outils',
    'réunis',
    '—',
    'Du',
    'coup',
    'tu',
    'payes',
    '-28',
    '%',
    'soit',
    '13',
    '$/j',
    'ou',
    '2',
    '000',
    '$',
    'avec',
    'Claude',
    'Code',
    'et',
    'DeepSeek',
    'V4.1',
    'dans',
    '~/.claude.json',
    'via',
    '/effort',
    'et',
    'SKILL.md.',
  ].map((text, idx) => ({ text, start: idx * 0.25, end: idx * 0.25 + 0.2 }));

  const chunks = buildSemanticCaptionChunks(sentenceTokens, { maxWords: 4, maxChars: 24 });
  const strings = chunks.map((c) => c.words.map((w) => w.text).join(' '));

  // Hard sentence boundary checks: ZERO block may mix end of sentence N with start of sentence N+1
  for (const s of strings) {
    assert.ok(!s.includes('France. Croisement'), `Cross-sentence leak in "${s}"`);
    assert.ok(!s.includes('plafond; Sur') && !s.includes('plafond ; Sur'), `Cross-sentence leak in "${s}"`);
    assert.ok(!s.includes('réunis — Du'), `Cross-sentence leak in "${s}"`);
  }

  // Atomic protection checks: numbers+units, compound names, and CLI paths stay glued together
  assert.ok(strings.some((s) => s.includes('Banque de France')), `Banque de France split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('-28 %')), `-28 % split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('13 $/j')), `13 $/j split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('2 000 $')), `2 000 $ split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('Claude Code')), `Claude Code split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('DeepSeek V4.1')), `DeepSeek V4.1 split in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('~/.claude.json')), `~/.claude.json missing in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('/effort')), `/effort missing in ${JSON.stringify(strings)}`);
  assert.ok(strings.some((s) => s.includes('SKILL.md.')), `SKILL.md missing in ${JSON.stringify(strings)}`);
});
