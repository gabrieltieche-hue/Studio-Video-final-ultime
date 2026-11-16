import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_BLUEPRINTS,
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  estimateSpokenWordWeight,
  parseBulkTopicsInput,
  resolveBeatLayout,
  sanitizeScriptText,
  selectStoryBlueprint,
} from './batchShortBuilder';
import { ALL_BROLL_KEYS, getBrollSequenceForTopic, isDevOrCodeTopic } from './brollKeys';

test('sanitizeScriptText removes em-dashes and normalizes whitespace', () => {
  assert.equal(
    sanitizeScriptText('Un chiffre choc — personne ne le dit   ici.'),
    'Un chiffre choc, personne ne le dit ici.'
  );
});

test('parseBulkTopicsInput parses custom lines, category | theme | angle, and deduplicates', () => {
  const raw = `
    # Commentaire ignoré
    Pourquoi l'électricité coûte 2 fois plus cher en France
    IA | Les agents IA remplacent-ils les devs juniors ? | Focus -28% d'embauches
    Pourquoi l'électricité coûte 2 fois plus cher en France
    Business | 3 erreurs de trésorerie en freelance
  `;
  const parsed = parseBulkTopicsInput(raw);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].category, 'Tech & Société');
  assert.equal(parsed[1].category, 'IA');
  assert.equal(parsed[1].angle, "Focus -28% d'embauches");
  assert.equal(parsed[2].category, 'Business');
});

test('alignmentToWords converts character alignment into speed-adjusted WhisperWords', () => {
  const text = 'Bonjour France.';
  const chars = text.split('');
  const starts = chars.map((_, i) => i * 0.1);
  const ends = chars.map((_, i) => i * 0.1 + 0.08);
  const result = alignmentToWords(
    {
      characters: chars,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    },
    text,
    1.0,
    5
  );
  assert.equal(result.words.length, 2);
  assert.equal(result.words[0].word, 'Bonjour');
  assert.equal(result.words[1].word, 'France.');
  assert.ok(result.words[0].start < result.words[1].start);
  assert.ok(result.durationSec > result.words[1].end);

  const faster = alignmentToWords(
    {
      characters: chars,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    },
    text,
    1.1,
    5
  );
  assert.ok(faster.words[1].end < result.words[1].end);

  const spacedPunct = '2026 : pourquoi ?';
  const spChars = spacedPunct.split('');
  const spRes = alignmentToWords(
    {
      characters: spChars,
      character_start_times_seconds: spChars.map((_, i) => i * 0.1),
      character_end_times_seconds: spChars.map((_, i) => i * 0.1 + 0.08),
    },
    spacedPunct,
    1.0,
    5
  );
  assert.equal(spRes.words.length, 2);
  assert.equal(spRes.words[0].word, '2026 :');
  assert.equal(spRes.words[1].word, 'pourquoi ?');
});

test('assignBeatTimingsAndTranscript creates continuous non-overlapping beats snapped to sentence ends', () => {
  const fallback = buildFallbackBatchScript({
    theme: 'La taxe numérique en 2026',
    category: 'Politique',
    batchIndex: 0,
  });
  const fullText = fallback.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.0, 38);
  const timed = assignBeatTimingsAndTranscript(fallback.beats, words, durationSec);

  assert.equal(timed.beats.length, fallback.beats.length);
  assert.equal(timed.beats[0].from, 0);
  assert.equal(timed.beats[timed.beats.length - 1].to, timed.durationSec);
  for (let i = 1; i < timed.beats.length; i++) {
    assert.equal(timed.beats[i].from, timed.beats[i - 1].to);
    assert.ok(timed.beats[i].to - timed.beats[i].from >= 1.49);
  }
  assert.ok(timed.motionTrack.length === fallback.beats.length);
  assert.ok(timed.sfxTrack.length >= 2);
  assert.ok(estimateSpokenWordWeight('En 2026 c’est 80 %') > estimateSpokenWordWeight('C’est un fait'));
});

test('computeStaggeredScheduleSlots outputs chronological ISO slots spaced by intervalHours', () => {
  const slots = computeStaggeredScheduleSlots(4, '2026-11-20T10:00:00.000Z', 12);
  assert.equal(slots.length, 4);
  assert.equal(slots[0], '2026-11-20T10:00:00.000Z');
  assert.equal(slots[1], '2026-11-20T22:00:00.000Z');
  assert.equal(slots[2], '2026-11-21T10:00:00.000Z');
  assert.equal(slots[3], '2026-11-21T22:00:00.000Z');
});

test('condenseVisualHeadline enforces scannable <= 5 word headlines and <= 38 chars', () => {
  const longHeadline = 'Pourquoi 80 % des réunions sont remplacées par des résumés IA en 2026.';
  const condensed = condenseVisualHeadline(longHeadline, 5, 38);
  assert.ok(condensed.split(/\s+/).length <= 5);
  assert.ok(condensed.length <= 38);
  assert.equal(condensed.endsWith('.'), false);
});

test('batch shorts vary blueprints, hooks, B-Rolls and exclude boilerplate or terminal_flow on non-dev topics', () => {
  const topics = [
    { category: 'Actualité', theme: 'Livret A vs ETF en 2026 : le vrai calcul' },
    { category: 'Politique', theme: 'Ce qui change sur le SMIC au 1er janvier' },
    { category: 'Business', theme: 'Pourquoi 90 % des freelances sous-facturent' },
  ];

  const scripts = topics.map((t, idx) =>
    buildFallbackBatchScript({ ...t, batchIndex: idx })
  );

  // Blueprints and hooks must all be distinct across the 3 consecutive items
  const blueprintIds = new Set(scripts.map((s) => s.blueprintId));
  const hookVisuals = new Set(scripts.map((s) => s.beats[0].visualType));
  assert.equal(blueprintIds.size, 3);
  assert.equal(hookVisuals.size, 3);

  for (const s of scripts) {
    assert.equal(s.beats.length, 8);
    assert.equal(s.beats[s.beats.length - 1].visualType, 'cta_card');
    const serialized = JSON.stringify(s);
    assert.equal(serialized.includes('Méthode 2022'), false);
    assert.equal(serialized.includes('14 h/sem'), false);
    assert.equal(serialized.includes('analyser --impact-2026'), false);
    assert.equal(
      s.beats.some((b) => b.visualType === 'terminal_flow'),
      false,
      'Non-dev topics must not emit terminal_flow'
    );
  }

  assert.equal(isDevOrCodeTopic('IA', 'Développeur TypeScript et agents CLI'), true);
  assert.equal(isDevOrCodeTopic('Économie', 'Livret A vs ETF en 2026'), false);
  assert.equal(ALL_BROLL_KEYS.length, 12);
  assert.ok(getBrollSequenceForTopic('Politique', 'Censure parlementaire').includes('parliament'));
  assert.equal(Object.keys(STORY_BLUEPRINTS).length, 5);
  assert.notEqual(
    selectStoryBlueprint('Tech', 'Sujet A', 0).id,
    selectStoryBlueprint('Tech', 'Sujet B', 1).id
  );
  const used = new Set<NonNullable<Parameters<typeof selectStoryBlueprint>[3]> extends Set<infer T> ? T : never>();
  const batch5 = [
    ['Business', 'Livret A vs ETF en 2026'],
    ['Politique', 'Ce qui change sur le SMIC au 1er janvier'],
    ['Conseils de vie', 'La règle des 5 minutes contre la fatigue'],
    ['IA', 'Les agents IA remplacent-ils les juniors ?'],
    ['Business', 'Pourquoi 90 % des freelances sous-facturent'],
  ].map(([cat, th], i) => {
    const bp = selectStoryBlueprint(cat, th, i, used);
    used.add(bp.id);
    return bp.id;
  });
  assert.equal(new Set(batch5).size, 5);
  assert.equal(resolveBeatLayout(scripts[0].beats[0], 0, 8), 'split');
});

