import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFrenchForSpeech } from './frenchSpeechNormalizer';

test('normalizeFrenchForSpeech converts web domains and CLI paths cleanly without mutating words', () => {
  const urlSpeech = normalizeFrenchForSpeech('Vérifie sur info.gouv.fr avant vendredi.');
  assert.match(urlSpeech, /info point gouv point fr/i);
  assert.ok(!urlSpeech.includes('info.gouv.fr'));

  const cliSpeech = normalizeFrenchForSpeech('Ouvre ~/.claude.json puis lance ./scripts/build.ts');
  assert.match(cliSpeech, /tilde slash point claude point json/i);
  assert.match(cliSpeech, /point slash scripts slash build point ts/i);
});

test('normalizeFrenchForSpeech pronounces French percentages, currencies, multipliers and acronyms naturally', () => {
  const smic = normalizeFrenchForSpeech('Le SMIC monte de +1,6 % soit 1 426 € net par mois.');
  assert.match(smic, /\bsmic\b/);
  assert.match(smic, /plus 1 virgule 6 pour cent/);
  assert.match(smic, /1426 euros/);

  const rates = normalizeFrenchForSpeech('Facturé 13 $/j ou 24,50 € en 1er palier.');
  assert.match(rates, /13 dollars par jour/);
  assert.match(rates, /24 euros 50/);
  assert.match(rates, /premier palier/);

  const mult = normalizeFrenchForSpeech('Un levier 10× validé par la HEC et l’INSEE.');
  assert.match(mult, /10 fois/);
  assert.match(mult, /H E C/);
  assert.match(mult, /inssée/);
});
