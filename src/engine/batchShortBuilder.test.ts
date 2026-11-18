import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  parseBulkTopicsInput,
  resolveBeatLayout,
  sanitizeScriptText,
  selectChoreographyForTopic,
} from './batchShortBuilder';
import { getBrollSequenceForTopic } from './brollKeys';

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

test('assignBeatTimingsAndTranscript creates continuous non-overlapping beats and caps long single-beat spans', () => {
  const fallback = buildFallbackBatchScript({
    theme: 'La taxe numérique en 2026',
    category: 'Politique',
  });
  // Intentionally bloat beat 2 spoken line to check pacing cap
  fallback.beats[1].spokenLine = Array.from({ length: 42 }, (_, idx) => `mot${idx + 1}`).join(' ');
  const fullText = fallback.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.0, 38);
  const timed = assignBeatTimingsAndTranscript(fallback.beats, words, durationSec);

  assert.equal(timed.beats.length, fallback.beats.length);
  assert.equal(timed.beats[0].from, 0);
  assert.equal(timed.beats[timed.beats.length - 1].to, timed.durationSec);
  const maxAllowed = Math.max(5.5, timed.durationSec * 0.24) + 0.25;
  for (let i = 0; i < timed.beats.length; i++) {
    if (i > 0) {
      assert.equal(timed.beats[i].from, timed.beats[i - 1].to);
    }
    const span = timed.beats[i].to - timed.beats[i].from;
    assert.ok(span > 0);
    assert.ok(span <= maxAllowed, `Beat ${i + 1} span ${span.toFixed(2)}s exceeded cap ${maxAllowed.toFixed(2)}s`);
  }
  assert.ok(timed.motionTrack.length === fallback.beats.length);
  assert.ok(timed.sfxTrack.length >= 2);
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

test('selectChoreographyForTopic varies hooks across domains and batch rotations and omits terminal_flow on non-dev topics', () => {
  const bank = selectChoreographyForTopic({
    theme: 'Découverts bancaires et crédit conso : ce qui change dès le 20 novembre 2026',
    category: 'Actualité',
    variationIndex: 0,
  });
  const paradox = selectChoreographyForTopic({
    theme: "L'IA ne licencie pas les seniors : elle ferme la porte aux juniors (-28 %)",
    category: 'IA',
    variationIndex: 1,
  });
  const question = selectChoreographyForTopic({
    theme: 'Pourquoi les vidéos parfaites fatiguent le feed',
    category: 'Conseils de vie',
    variationIndex: 0,
  });

  assert.equal(bank.hookType, 'hook_alert');
  assert.equal(question.hookType, 'hook_question');
  assert.notEqual(bank.hookType, paradox.hookType);
  assert.ok(!bank.beatTypes.includes('terminal_flow'));
  assert.ok(!question.beatTypes.includes('terminal_flow'));

  const rotatedHooks = new Set(
    [0, 1, 2, 3, 4].map(
      (i) =>
        selectChoreographyForTopic({
          theme: 'Sujet générique économie',
          category: 'Business',
          variationIndex: i,
        }).hookType
    )
  );
  assert.equal(rotatedHooks.size, 5);
});

test('buildFallbackBatchScript generates 8 kinetic beats with split/fullscreen alternation and Beat 1 Act-2 shatter SFX', () => {
  const script = buildFallbackBatchScript({
    theme: 'Pourquoi 80 % des réunions sont remplacées par des résumés IA en 2026',
    category: 'IA',
  });
  assert.equal(script.beats.length, 8);
  assert.equal(script.beats[0].visualType, 'hook_shatter');
  assert.equal(script.beats[script.beats.length - 1].visualType, 'cta_card');

  assert.equal(resolveBeatLayout(script.beats[0], 0, 8), 'split');
  assert.equal(resolveBeatLayout(script.beats[3], 3, 8), 'fullscreen');
  assert.equal(resolveBeatLayout(script.beats[4], 4, 8), 'fullscreen');
  assert.equal(resolveBeatLayout(script.beats[5], 5, 8), 'split');

  const fullText = script.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.05, 30);
  const timed = assignBeatTimingsAndTranscript(script.beats, words, durationSec);

  const shatterSfx = timed.sfxTrack.find((s) => s.id === 'sfx-hook-shatter');
  assert.ok(shatterSfx);
  assert.equal(shatterSfx.sound, 'glass-shatter');
  assert.ok(shatterSfx.start >= 1.4 && shatterSfx.start <= 2.6);
});

test('getBrollSequenceForTopic avoids ado/paradoxe false match and buildFallbackBatchScript uses domain titles and natural spoken sources', () => {
  const aiAgentsBrolls = getBrollSequenceForTopic(
    'Business',
    '90 % des entreprises ratent leurs économies IA : le paradoxe des agents autonomes'
  );
  assert.ok(!aiAgentsBrolls.includes('teen_phone'));
  assert.ok(!aiAgentsBrolls.includes('mobile_attention'));
  assert.equal(aiAgentsBrolls[0], 'startup_team');

  const bankScript = buildFallbackBatchScript({
    theme: 'Découverts bancaires et crédit conso : ce qui change dès le 20 novembre 2026',
    category: 'Actualité',
    sources: 'service-public.gouv.fr (Nov 2026)',
  });
  assert.ok(!bankScript.beats.some((b) => b.title === 'Ce qui change' || b.title === 'Le point critique'));
  assert.equal(bankScript.beats[2].comparisonLeft?.value, '180 €/an');
  assert.ok(!bankScript.beats[6].spokenLine.includes('('));
  assert.ok(!bankScript.beats[6].spokenLine.includes('.gouv.fr'));
});

test('alignmentToWords rescales subtitle timing to match actual MP3 duration and keeps beat boundaries locked', () => {
  const sampleText = 'Un deux trois quatre cinq six sept huit neuf dix.';
  const chars = sampleText.split('');
  // Simulate raw ElevenLabs timestamps spanning 10s, while actual measured MP3 duration is 12.0s (>2.5% diff)
  const starts = chars.map((_, i) => Number((i * 0.2).toFixed(3)));
  const ends = chars.map((_, i) => Number((i * 0.2 + 0.16).toFixed(3)));
  const res = alignmentToWords(
    {
      characters: chars,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    },
    sampleText,
    1.0,
    12.0
  );
  const lastEnd = res.words[res.words.length - 1].end;
  assert.ok(lastEnd >= 11.7 && lastEnd <= 12.05, `Expected rescaled last word near 11.88s, got ${lastEnd}`);
});

test('every SFX asset scheduled by buildFallbackBatchScript exists on disk via resolveSfxAssetPath', async () => {
  const { resolveSfxAssetPath } = await import('../server/batchRenderer');
  const script = buildFallbackBatchScript({
    theme: "L'IA ne licencie pas les seniors : elle ferme la porte aux juniors (-28 %)",
    category: 'IA',
  });
  const timed = assignBeatTimingsAndTranscript(
    script.beats,
    alignmentToWords(null, script.beats.map((b) => b.spokenLine).join(' '), 1.05, 36).words,
    36
  );
  for (const s of timed.sfxTrack) {
    const resolved = resolveSfxAssetPath(s.sound);
    assert.ok(resolved, `Missing SFX audio asset for "${s.sound}"`);
  }
});

test('buildFallbackBatchScript enforces subscribe/bell CTA with zero commentaire ask', () => {
  const script = buildFallbackBatchScript({
    theme: 'Les agents IA en entreprise',
    category: 'Business',
  });
  const lastBeat = script.beats[script.beats.length - 1];
  assert.ok(!/commentaire/i.test(lastBeat.spokenLine));
  assert.ok(/abonne|cloche/i.test(lastBeat.spokenLine));
  assert.ok(!/commentaire/i.test(script.caption));
});
