import test from 'node:test';
import assert from 'node:assert/strict';
import type { BatchBeatSpec } from '../types/batch';
import {
  UNIVERSAL_PRIMITIVES_CATALOG,
  normalizeToUniversalPrimitive,
  validateFullShortPlan,
} from './shortPrimitivesSchema';

function buildSampleUniversalPlan(isDev: boolean): BatchBeatSpec[] {
  return [
    {
      id: 'beat-1',
      title: 'SMIC +1,6 % en France',
      highlightWord: '+1,6 %',
      shortLabel: 'HAUSSE SMIC',
      screenLabel: 'SALAIRE 2026',
      spokenLine: 'Le SMIC grimpe de 1,6 pour cent dès ce mois-ci en France.',
      visualType: 'metric_shock_hook',
      layoutHint: 'split',
      statValue: '+1,6 %',
      statLabel: 'Revalorisation légale sur la fiche de paie',
      stampWord: 'OFFICIEL',
    },
    {
      id: 'beat-2',
      title: 'Détail fiche de paie',
      highlightWord: 'paie',
      shortLabel: 'FICHE DE PAIE',
      screenLabel: 'BULLETIN NET',
      spokenLine: 'Sur le papier le brut augmente mais le net perçu avance beaucoup moins vite.',
      visualType: 'paper_receipt_payslip',
      layoutHint: 'split',
      receiptItems: [
        { label: 'Salaire brut mensuel', amount: '1 801 €', tone: 'neutral' },
        { label: 'Cotisations salariales', amount: '-375 €', tone: 'negative' },
        { label: 'Net versé en banque', amount: '1 426 €', highlight: true, tone: 'positive' },
      ],
      receiptTotalLabel: 'Gain net réel',
      receiptTotalValue: '+22 €/mois',
    },
    {
      id: 'beat-3',
      title: 'Coût employeur vs net',
      highlightWord: 'Coût',
      shortLabel: 'DUEL COÛT',
      screenLabel: 'ÉCART RÉEL',
      spokenLine: 'Entre ce que verse l’entreprise et ce qui arrive sur ton compte l’écart surprend.',
      visualType: 'balance_scale_duel',
      layoutHint: 'fullscreen',
      leftCard: { label: 'Coût entreprise', value: '2 190 €', sub: 'Avec cotisations' },
      rightCard: { label: 'Net salarié', value: '1 426 €', sub: 'Sur le compte' },
      scaleTilt: 'left',
    },
    {
      id: 'beat-4',
      title: isDev ? 'Audit CLI serveur MCP' : 'Calendrier des seuils',
      highlightWord: isDev ? 'MCP' : 'seuils',
      shortLabel: isDev ? 'TERMINAL MCP' : 'CALENDRIER',
      screenLabel: isDev ? 'DEV AUDIT' : 'ÉCHÉANCE',
      spokenLine: isDev
        ? 'Un simple fichier ~/.claude.json expose parfois des clés locales sans garde-fou.'
        : 'Chaque premier janvier le seuil d’allègement déclenche un effet de trappe sur les primes.',
      visualType: isDev ? 'terminal_chat_window' : 'countdown_calendar_stamp',
      layoutHint: 'split',
      ...(isDev
        ? {
            terminalCmd: 'cat ~/.claude.json | grep mcpServers',
            terminalOut: ['⚠ Token exposé en clair', '✓ Isoler dans .env local'],
          }
        : {
            calendarMonth: 'NOVEMBRE',
            calendarYear: '2026',
            calendarDaysMarked: [1, 15, 20],
            calendarHighlightDay: 1,
            stampWord: 'SEUIL',
          }),
    },
    {
      id: 'beat-5',
      title: 'Pourquoi le net stagne',
      highlightWord: 'stagne',
      shortLabel: 'MÉCANISME',
      screenLabel: 'CAUSE RÉELLE',
      spokenLine: 'Quand les allègements reculent plus vite que le salaire les PME freinent chaque hausse.',
      visualType: 'radial_mindmap_hub',
      layoutHint: 'fullscreen',
      mindmapCenter: 'Trappe bas salaires',
      mindmapNodes: [
        { label: 'Allègements dégressifs', detail: 'Coût marginal ×2' },
        { label: 'Primes bloquées', detail: 'Seuil 1,6 SMIC' },
        { label: 'Inflation alimentaire', detail: '+4 % cumulé' },
      ],
    },
    {
      id: 'beat-6',
      title: 'Avant vs après réforme',
      highlightWord: 'réforme',
      shortLabel: 'VERDICT',
      screenLabel: 'COMPARAISON',
      spokenLine: 'Lisser les cotisations redonne de l’air aux salaires intermédiaires sans casser l’embauche.',
      visualType: 'before_after_morph',
      layoutHint: 'fullscreen',
      beforeBadText: 'Pic de charges brutal à 1,6 SMIC qui bloque les augmentations.',
      afterGoodText: 'Sortie progressive des exonérations pour débloquer les salaires.',
    },
    {
      id: 'beat-7',
      title: 'Abonne-toi maintenant',
      highlightWord: 'Abonne-toi',
      shortLabel: 'ABONNEMENT',
      screenLabel: 'CHAÎNE',
      spokenLine: 'Abonne-toi et active la cloche pour un décryptage chiffré chaque jour.',
      visualType: 'channel_end_cta',
      layoutHint: 'split',
    },
  ];
}

test('UNIVERSAL_PRIMITIVES_CATALOG defines 22 domain-agnostic primitives', () => {
  assert.equal(UNIVERSAL_PRIMITIVES_CATALOG.length, 22);
  assert.equal(normalizeToUniversalPrimitive('hook_shatter'), 'metric_shock_hook');
  assert.equal(normalizeToUniversalPrimitive('cta_card'), 'channel_end_cta');
});

test('validateFullShortPlan validates a complete multi-primitive plan cleanly', () => {
  const econBeats = buildSampleUniversalPlan(false);
  const res = validateFullShortPlan({ beats: econBeats }, { isDevTopic: false });
  assert.equal(res.valid, true, `Unexpected validation errors: ${res.errors.join('; ')}`);

  const devBeats = buildSampleUniversalPlan(true);
  const devRes = validateFullShortPlan({ beats: devBeats }, { isDevTopic: true });
  assert.equal(devRes.valid, true, `Unexpected dev validation errors: ${devRes.errors.join('; ')}`);
});

test('validateFullShortPlan blocks terminal_chat_window on non-dev topics, duplicates, leaks and missing payloads', () => {
  const nonDevUsingTerminal = buildSampleUniversalPlan(true);
  const terminalRes = validateFullShortPlan({ beats: nonDevUsingTerminal }, { isDevTopic: false });
  assert.equal(terminalRes.valid, false);
  assert.ok(terminalRes.errors.some((e) => e.includes('terminal_chat_window')));

  const duplicateBeats = buildSampleUniversalPlan(false);
  duplicateBeats[1].visualType = 'metric_shock_hook';
  duplicateBeats[1].statValue = '10 %';
  duplicateBeats[1].statLabel = 'Doublon volontaire';
  const dupRes = validateFullShortPlan({ beats: duplicateBeats }, { isDevTopic: false });
  assert.equal(dupRes.valid, false);
  assert.ok(dupRes.errors.some((e) => e.includes('Doublon')));

  const leakedBeats = buildSampleUniversalPlan(false);
  leakedBeats[0].statLabel = 'Offres juniors depuis 2023';
  const leakRes = validateFullShortPlan({ beats: leakedBeats }, { isDevTopic: false });
  assert.equal(leakRes.valid, false);
  assert.ok(leakRes.errors.some((e) => e.includes('interdit')));
});
