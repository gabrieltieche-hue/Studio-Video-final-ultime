import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildTimedProjectFromBeatAudios,
  computeStaggeredScheduleSlots,
  condenseVisualHeadline,
  parseBulkTopicsInput,
  resolveBeatLayout,
  resolveChannelCtaProfile,
  sanitizeScriptText,
  trimSpokenLineForPacing,
} from './batchShortBuilder';
import { BROLL_DATABASE, BROLL_DATABASE_BY_ID } from '../data/brollDatabase';
import { getBrollSequenceForTopic, isDevOrCodeTopic, selectBottomMediaForShort } from './brollKeys';
import { buildDynamicBeatsFromProject } from './transcriptUtils';
import type { BatchBeatSpec } from '../types/batch';
import type { ShortProject } from '../types/studio';

function makeUniversalTestBeats(): BatchBeatSpec[] {
  return [
    {
      id: 'b1',
      title: 'Marges en restauration',
      highlightWord: 'Marges',
      shortLabel: 'MARGES',
      screenLabel: 'RESTAURANT',
      spokenLine: 'Quatre restaurants indépendants sur dix ferment avant trois ans faute de marge nette.',
      visualType: 'metric_shock_hook',
      layoutHint: 'split',
      statValue: '40 %',
      statLabel: 'Taux de fermeture avant 3 ans',
      stampWord: 'ALERTE',
      sfxKind: 'impact-boom',
    },
    {
      id: 'b2',
      title: 'Ticket réel du menu',
      highlightWord: 'réel',
      shortLabel: 'TICKET',
      screenLabel: 'CAISSE',
      spokenLine: 'Sur une addition de vingt euros la matière et les charges mangent presque tout.',
      visualType: 'paper_receipt_payslip',
      layoutHint: 'split',
      receiptItems: [
        { label: 'Matières premières', amount: '-6,40 €', tone: 'negative' },
        { label: 'Masse salariale', amount: '-8,20 €', tone: 'negative' },
        { label: 'Marge nette finale', amount: '1,10 €', highlight: true, tone: 'positive' },
      ],
      receiptTotalLabel: 'Résultat net',
      receiptTotalValue: '5,5 %',
      sfxKind: 'tap',
    },
    {
      id: 'b3',
      title: 'Plateformes vs salle',
      highlightWord: 'Plateformes',
      shortLabel: 'DUEL',
      screenLabel: 'COMMISSIONS',
      spokenLine: 'Chaque commande livrée coûte trente pour cent de commission avant même de payer la cuisine.',
      visualType: 'balance_scale_duel',
      layoutHint: 'fullscreen',
      leftCard: { label: 'Livraison', value: '-30 %', sub: 'Commission' },
      rightCard: { label: 'Vente directe', value: '+24 %', sub: 'Marge sauvée' },
      scaleTilt: 'left',
      sfxKind: 'whoosh',
    },
    {
      id: 'b4',
      title: 'Erreurs de carte',
      highlightWord: 'Erreurs',
      shortLabel: 'AUDIT',
      screenLabel: 'MENU',
      spokenLine: 'Une carte trop longue génère du gaspillage invisible et ralentit le service en heure de pointe.',
      visualType: 'audit_table_detector',
      layoutHint: 'fullscreen',
      auditRows: [
        { label: '32 plats au menu', detail: 'Stock immobilisé', status: 'alert', badge: 'PERTE' },
        { label: '8 plats signatures', detail: 'Rotation rapide', status: 'ok', badge: 'RENTABLE' },
        { label: 'Fournisseurs doublons', detail: 'Renégocié -12 %', status: 'removed', badge: 'CORRIGÉ' },
      ],
      sfxKind: 'tap',
    },
    {
      id: 'b5',
      title: 'Avant vs après carte',
      highlightWord: 'après',
      shortLabel: 'METHODE',
      screenLabel: 'TRANSFORMATION',
      spokenLine: 'Réduire la carte à huit plats rentables triple la vitesse en cuisine et double la marge.',
      visualType: 'before_after_morph',
      layoutHint: 'fullscreen',
      beforeBadText: 'Carte géante de 35 plats avec pertes quotidiennes.',
      afterGoodText: '8 plats maîtrisés avec coût matière sous 28 %.',
      sfxKind: 'bell',
    },
    {
      id: 'b6',
      title: 'Trois leviers immédiats',
      highlightWord: 'immédiats',
      shortLabel: 'PLAN',
      screenLabel: 'ACTIONS',
      spokenLine: 'Vérifie tes coûts matière chaque lundi et supprime les références sous trente pour cent de marge.',
      visualType: 'scrolling_checklist_spotlight',
      layoutHint: 'split',
      bullets: ['Auditer le coût matière', 'Limiter à 8 plats phares', 'Pousser le clic et collecte'],
      sfxKind: 'pop',
    },
    {
      id: 'b7',
      title: 'Abonne-toi pour suivre',
      highlightWord: 'Abonne-toi',
      shortLabel: 'FIN',
      screenLabel: 'CHAÎNE',
      spokenLine: 'Abonne-toi et active la cloche pour nos prochains décryptages concrets.',
      visualType: 'channel_end_cta',
      layoutHint: 'split',
      sfxKind: 'bell',
    },
  ];
}

test('sanitizeScriptText removes em-dashes and normalizes whitespace', () => {
  assert.equal(
    sanitizeScriptText('Un chiffre choc — personne ne le dit   ici.'),
    'Un chiffre choc, personne ne le dit ici.'
  );
});

test('parseBulkTopicsInput parses custom lines and category | theme | angle cleanly', () => {
  const raw = `
    # Commentaire ignoré
    Pourquoi l'électricité coûte 2 fois plus cher en France
    IA | Les agents IA remplacent-ils les devs juniors ? | Focus -28% d'embauches
    Business | 3 erreurs de trésorerie en food-truck
  `;
  const parsed = parseBulkTopicsInput(raw);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].category, 'Général');
  assert.equal(parsed[1].category, 'IA');
  assert.equal(parsed[1].angle, "Focus -28% d'embauches");
  assert.equal(parsed[2].category, 'Business');
});

test('resolveChannelCtaProfile never falls back to hardcoded @alex.decode demo handle', () => {
  const def = resolveChannelCtaProfile();
  assert.ok(!def.handle.includes('alex.decode'));
  assert.equal(def.handle, '@decryptage.fr');

  const custom = resolveChannelCtaProfile({ handle: 'mon.studio', brandName: 'Mon Studio' });
  assert.equal(custom.handle, '@mon.studio');
  assert.equal(custom.initial, 'M');
});

test('alignmentToWords converts character alignment into WhisperWords', () => {
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
    5
  );
  assert.equal(result.words.length, 2);
  assert.equal(result.words[0].word, 'Bonjour');
  assert.equal(result.words[1].word, 'France.');
  assert.ok(result.words[0].start < result.words[1].start);
  assert.ok(result.durationSec > result.words[1].end);
});

test('buildTimedProjectFromBeatAudios guarantees zero cumulative drift and maps extended payloads into DynamicBeat', () => {
  const beatsSpec = makeUniversalTestBeats();
  const beatWindows = [
    { from: 0, to: 3.8 },
    { from: 3.8, to: 8.6 },
    { from: 8.6, to: 14.2 },
    { from: 14.2, to: 20.1 },
    { from: 20.1, to: 25.4 },
    { from: 25.4, to: 30.8 },
    { from: 30.8, to: 35.2 },
  ];
  const words = beatsSpec.flatMap((b, bi) => {
    const win = beatWindows[bi];
    const tokens = b.spokenLine.split(/\s+/);
    const step = (win.to - win.from - 0.1) / tokens.length;
    return tokens.map((tok, ti) => ({
      id: `b${bi + 1}-${ti + 1}`,
      word: tok,
      start: Number((win.from + ti * step).toFixed(3)),
      end: Number((win.from + (ti + 0.85) * step).toFixed(3)),
      confidence: 0.99,
    }));
  });

  const timed = buildTimedProjectFromBeatAudios({
    beatsSpec,
    beatWindows,
    words,
    totalDurationSec: 35.2,
  });

  assert.equal(timed.beats.length, 7);
  assert.equal(timed.beats[0].from, 0);
  assert.equal(timed.beats[6].to, timed.durationSec);
  assert.equal(timed.beats[2].layout, 'fullscreen');
  assert.ok(timed.sfxTrack.length >= 2);

  const dummyProj = {
    id: 'proj-resto',
    slug: 'resto',
    title: 'Marges en restauration',
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
    editSpec: { beats: timed.beats, speed: 1.1 },
  } as unknown as ShortProject;

  const dynBeats = buildDynamicBeatsFromProject(dummyProj);
  assert.equal(dynBeats[1].receiptItems?.length, 3);
  assert.equal(dynBeats[3].auditRows?.length, 3);
  assert.equal(dynBeats[0].highlightWord, 'Marges');
});

test('assignBeatTimingsAndTranscript creates continuous non-overlapping beats', () => {
  const beatsSpec = makeUniversalTestBeats();
  const fullText = beatsSpec.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 36);
  const timed = assignBeatTimingsAndTranscript(beatsSpec, words, durationSec);

  assert.equal(timed.beats.length, beatsSpec.length);
  assert.equal(timed.beats[0].from, 0);
  assert.equal(timed.beats[timed.beats.length - 1].to, timed.durationSec);
  for (let i = 1; i < timed.beats.length; i++) {
    assert.equal(timed.beats[i].from, timed.beats[i - 1].to);
  }
});

test('BROLL_DATABASE has 190+ bright/high-contrast photographic assets on disk and avoids dev visuals on non-dev topics', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  assert.ok(BROLL_DATABASE.length >= 190, `Expected >= 190 B-roll entries, got ${BROLL_DATABASE.length}`);

  let pooledChecked = 0;
  for (const e of BROLL_DATABASE) {
    assert.ok(e.lighting === 'bright' || e.lighting === 'high-contrast');
    assert.ok(BROLL_DATABASE_BY_ID[e.id]);
    if (e.file) {
      const diskPath = path.join(process.cwd(), 'public', e.file.replace(/^\/+/, ''));
      assert.ok(fs.existsSync(diskPath), `Missing pooled image file on disk: ${diskPath}`);
      assert.ok(fs.statSync(diskPath).size > 15_000, `Pooled image file too small: ${diskPath}`);
      pooledChecked += 1;
    }
  }
  assert.ok(pooledChecked >= 180, `Expected >= 180 pooled JPG files on disk, got ${pooledChecked}`);

  assert.equal(isDevOrCodeTopic('Économie', 'SMIC +1,6 % et charges patronales'), false);
  assert.equal(isDevOrCodeTopic('Tech & Code', 'Serveurs MCP dans ~/.claude.json'), true);

  const restoKeys = getBrollSequenceForTopic('Business', 'Pourquoi les restaurants ferment faute de marge');
  assert.ok(!restoKeys.some((k) => k === 'tech_code' || k.startsWith('dev_')));
  assert.ok(restoKeys[0].startsWith('resto_') || restoKeys[0] === 'restaurant_kitchen');

  const smicKeys = getBrollSequenceForTopic('Économie', 'Hausse du SMIC et fiche de paie');
  assert.ok(!smicKeys.some((k) => k === 'tech_code' || k.startsWith('dev_')));

  const cooldown = new Set<string>();
  const rotated = selectBottomMediaForShort({
    beats: makeUniversalTestBeats().map((b, i) => ({
      ...b,
      from: i * 5,
      to: (i + 1) * 5,
    })),
    category: 'Restauration',
    theme: 'Marges des restaurants indépendants',
    batchCooldownIds: cooldown,
  });
  for (let i = 1; i < rotated.length; i++) {
    assert.notEqual(rotated[i].primaryId, rotated[i - 1].primaryId);
  }
  rotated.forEach((r) => r.subBrollKeys.forEach((k) => cooldown.add(k)));

  const secondShort = selectBottomMediaForShort({
    beats: makeUniversalTestBeats().map((b, i) => ({
      ...b,
      from: i * 5,
      to: (i + 1) * 5,
    })),
    category: 'Économie',
    theme: 'SMIC et fiche de paie',
    batchCooldownIds: cooldown,
  });
  const firstSet = new Set(rotated.flatMap((r) => r.subBrollKeys));
  const overlapCount = secondShort.flatMap((r) => r.subBrollKeys).filter((k) => firstSet.has(k)).length;
  assert.equal(overlapCount, 0, 'Second Short should draw fresh unused photos from the 190+ pool');
});

test('every SFX asset scheduled exists on disk via resolveSfxAssetPath', async () => {
  const { resolveSfxAssetPath } = await import('../server/batchRenderer');
  const beatsSpec = makeUniversalTestBeats();
  const timed = assignBeatTimingsAndTranscript(
    beatsSpec,
    alignmentToWords(null, beatsSpec.map((b) => b.spokenLine).join(' '), 35).words,
    35
  );
  for (const s of timed.sfxTrack) {
    const resolved = resolveSfxAssetPath(s.sound);
    assert.ok(resolved, `Missing SFX audio asset for "${s.sound}"`);
  }
});

test('computeStaggeredScheduleSlots, condenseVisualHeadline, resolveBeatLayout, trimSpokenLineForPacing work cleanly', () => {
  const slots = computeStaggeredScheduleSlots(3, '2026-11-20T10:00:00.000Z', 12);
  assert.deepEqual(slots, [
    '2026-11-20T10:00:00.000Z',
    '2026-11-20T22:00:00.000Z',
    '2026-11-21T10:00:00.000Z',
  ]);

  const condensed = condenseVisualHeadline('Pourquoi 80 % des réunions sont remplacées par des résumés.', 5, 38);
  assert.ok(condensed.split(/\s+/).length <= 5);
  assert.ok(condensed.length <= 38);
  assert.equal(condensed.endsWith('.'), false);

  const beats = makeUniversalTestBeats();
  assert.equal(resolveBeatLayout(beats[0], 0, beats.length), 'split');
  assert.equal(resolveBeatLayout(beats[2], 2, beats.length), 'fullscreen');

  const trimmed = trimSpokenLineForPacing('Un deux trois quatre cinq six sept huit neuf dix onze.', 6);
  assert.equal(trimmed.split(/\s+/).length, 6);
  assert.ok(trimmed.endsWith('.'));
});
