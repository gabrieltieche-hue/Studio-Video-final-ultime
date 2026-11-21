import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEdgeWordBoundariesToWords,
  parseVerboseWordsToWhisperWords,
  realignWordsToSourceBeatText,
} from './voiceAlignment';

test('parseEdgeWordBoundariesToWords splits multi-word boundaries proportionally and applies speed factor', () => {
  const sampleMeta = [
    JSON.stringify({
      Metadata: [
        {
          Type: 'WordBoundary',
          Data: { Offset: 1_000_000, Duration: 2_000_000, text: { Text: 'À' } },
        },
      ],
    }),
    JSON.stringify({
      Metadata: [
        {
          Type: 'WordBoundary',
          Data: { Offset: 5_000_000, Duration: 6_000_000, text: { Text: '-28 %' } },
        },
      ],
    }),
    JSON.stringify({
      Metadata: [
        {
          Type: 'WordBoundary',
          Data: { Offset: 12_000_000, Duration: 4_000_000, text: { Text: 'banque' } },
        },
      ],
    }),
  ].join('');

  const words = parseEdgeWordBoundariesToWords(sampleMeta, 'À -28 % banque', 1.0);
  assert.equal(words.length, 4);
  assert.deepEqual(
    words.map((w) => w.word),
    ['À', '-28', '%', 'banque']
  );
  assert.ok(words[0].start >= 0.09 && words[0].end > words[0].start);
  assert.ok(words[1].start < words[2].start);
  assert.ok(words[2].end <= words[3].start + 0.05);
});

test('parseEdgeWordBoundariesToWords rescales smoothly to measured audio duration when drift > 3.5%', () => {
  const sampleMeta = [
    JSON.stringify({
      Metadata: [
        {
          Type: 'WordBoundary',
          Data: { Offset: 1_000_000, Duration: 4_000_000, text: { Text: 'Bonjour' } },
        },
      ],
    }),
    JSON.stringify({
      Metadata: [
        {
          Type: 'WordBoundary',
          Data: { Offset: 6_000_000, Duration: 10_000_000, text: { Text: 'France' } },
        },
      ],
    }),
  ].join('');

  const words = parseEdgeWordBoundariesToWords(sampleMeta, 'Bonjour France', 1.0, 3.2);
  assert.equal(words.length, 2);
  const lastEnd = words[words.length - 1].end;
  assert.ok(Math.abs(lastEnd - 3.12) < 0.15, `expected ~3.12s, got ${lastEnd}`);
});

test('parseVerboseWordsToWhisperWords converts VoiceStudio verbose_json words cleanly', () => {
  const words = parseVerboseWordsToWhisperWords(
    [
      { word: 'Premier', start: 0.12, end: 0.55 },
      { word: 'réflexe', start: 0.58, end: 1.12 },
    ],
    'Premier réflexe'
  );
  assert.equal(words.length, 2);
  assert.equal(words[0].word, 'Premier');
  assert.equal(words[1].word, 'réflexe');
  assert.equal(words[0].start, 0.12);
});

test('realignWordsToSourceBeatText preserves punctuated display words and keeps every word inside beat bounds', () => {
  const raw = [
    { id: 'r1', word: 'Banque', start: 0.04, end: 0.36, confidence: 0.99 },
    { id: 'r2', word: 'de', start: 0.37, end: 0.48, confidence: 0.99 },
    { id: 'r3', word: 'France', start: 0.49, end: 0.92, confidence: 0.99 },
    { id: 'r4', word: 'plus', start: 1.05, end: 1.25, confidence: 0.99 },
    { id: 'r5', word: '1', start: 1.26, end: 1.44, confidence: 0.99 },
    { id: 'r6', word: 'virgule', start: 1.45, end: 1.82, confidence: 0.99 },
    { id: 'r7', word: '6', start: 1.83, end: 2.02, confidence: 0.99 },
    { id: 'r8', word: 'pour', start: 2.03, end: 2.24, confidence: 0.99 },
    { id: 'r9', word: 'cent', start: 2.25, end: 2.55, confidence: 0.99 },
  ];

  const aligned = realignWordsToSourceBeatText({
    rawBeatWords: raw,
    sourceBeatText: 'Banque de France. Hausse +1,6 % confirmée.',
    beatStartOffsetSec: 5.0,
    beatDurationSec: 3.0,
    idPrefix: 'b2',
  });

  assert.deepEqual(
    aligned.map((w) => w.word),
    ['Banque', 'de', 'France.', 'Hausse', '+1,6', '%', 'confirmée.']
  );
  for (let i = 0; i < aligned.length; i++) {
    assert.ok(aligned[i].start >= 5.0, `Word ${i} before beat offset`);
    assert.ok(aligned[i].end <= 8.0, `Word ${i} past beat end`);
    if (i > 0) {
      assert.ok(aligned[i].start >= aligned[i - 1].end - 0.001, `Non-monotonic at ${i}`);
    }
  }
});

