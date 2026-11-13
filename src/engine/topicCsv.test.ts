import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendSessionToCsv,
  computeCompositeViralScore,
  filterTopicRows,
  isDuplicateTheme,
  parseCsv,
  stringifyCsv,
  type NewTopicCandidate,
  type TopicCsvRow,
} from './topicCsv';

test('CSV round-trip preserves quotes, commas, newlines, and French accents', () => {
  const sample: TopicCsvRow[] = [
    {
      id: 'SH-001',
      date_creation: '2026-11-13',
      demande_session: 'REQ-INIT',
      categorie: 'Tech & Société',
      theme: 'Interdire les réseaux aux moins de 15 ans : loi censurée',
      angle_viral_fr: 'Comparaison Australie, France et design addictif',
      hook_propose: 'On a voulu interdire les réseaux avant 15 ans. Mais la loi vient d\'exploser.',
      hook_ecran: 'LIMITE D\'ÂGE -15 ANS',
      score_viral_fr: 94,
      score_actualite: 92,
      score_save_share: 91,
      tension_emotion: 'Surprise + Indignation',
      plateformes_cibles: 'TikTok · Reels · YT Shorts',
      sources: 'Conseil constitutionnel, Reuters',
      statut: 'Produit',
      slug_short: 'interdiction-reseaux-15-ans',
      raison_selection: 'Forte réactance ado + débat parental massif en France.',
    },
  ];

  const csv = stringifyCsv(sample);
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], sample[0]);
});

test('isDuplicateTheme detects exact or high-overlap themes', () => {
  const existing = ['Interdiction des réseaux sociaux avant 15 ans en France'];
  assert.equal(
    isDuplicateTheme('Interdiction des réseaux sociaux avant 15 ans', existing),
    true
  );
  assert.equal(
    isDuplicateTheme("L'IA ferme la porte aux juniors (-28 % d'embauches)", existing),
    false
  );
});

test('appendSessionToCsv picks highest non-duplicate theme as Retenu (Choix IA)', () => {
  const existing = parseCsv(
    stringifyCsv([
      {
        id: 'SH-001',
        date_creation: '2026-11-13',
        demande_session: 'REQ-01',
        categorie: 'Politique',
        theme: 'Interdiction des réseaux sociaux avant 15 ans en France',
        angle_viral_fr: 'Censure Conseil constitutionnel',
        hook_propose: 'La loi vient d\'exploser.',
        hook_ecran: 'LOI CENSURÉE',
        score_viral_fr: 92,
        score_actualite: 90,
        score_save_share: 88,
        tension_emotion: 'Surprise',
        plateformes_cibles: 'TikTok · Reels',
        sources: 'conseil-constitutionnel.fr',
        statut: 'Produit',
        slug_short: 'interdiction-reseaux-15-ans',
        raison_selection: 'Déjà produit',
      },
    ])
  );

  const candidates: NewTopicCandidate[] = [
    {
      categorie: 'Politique',
      theme: 'Interdiction des réseaux sociaux avant 15 ans en France',
      angle_viral_fr: 'Doublon',
      hook_propose: 'Doublon',
      hook_ecran: 'DOUBLON',
      score_viral_fr: 99,
      score_actualite: 99,
      score_save_share: 99,
      tension_emotion: 'Surprise',
      plateformes_cibles: 'TikTok',
      sources: 'test',
      slug_short: 'doublon',
      raison_selection: 'Ne doit pas gagner car doublon',
    },
    {
      categorie: 'IA',
      theme: "L'IA supprime 28 % des embauches de jeunes diplômés en France",
      angle_viral_fr: 'Effet silencieux sur les juniors vs seniors',
      hook_propose: "L'IA ne vire pas les seniors. Elle ferme la porte aux juniors.",
      hook_ecran: '-28 % EMBAUCHES JUNIORS',
      score_viral_fr: 96,
      score_actualite: 94,
      score_save_share: 95,
      tension_emotion: 'Alerte carrière',
      plateformes_cibles: 'TikTok · Reels · YT Shorts',
      sources: 'Banque de France, HEC',
      slug_short: 'ia-embauches-juniors-chute',
      raison_selection: 'Touche directement étudiants, devs et actifs 18-35 ans en France.',
    },
    {
      categorie: 'Conseils de vie',
      theme: 'La règle des 5 minutes contre la fatigue numérique',
      angle_viral_fr: 'Micro-habitude applicable ce soir',
      hook_propose: 'Tu passes 4 heures par jour sur ton écran sans t\'en rendre compte.',
      hook_ecran: 'RÈGLE 5 MIN',
      score_viral_fr: 82,
      score_actualite: 70,
      score_save_share: 88,
      tension_emotion: 'Prise de conscience',
      plateformes_cibles: 'Reels · TikTok',
      sources: 'We Are Social 2026',
      slug_short: 'regle-5-minutes-ecran',
      raison_selection: 'Fort taux de save mais actu plus faible.',
    },
  ];

  const res = appendSessionToCsv(existing, 'REQ-02', '2026-11-13', candidates);
  assert.equal(res.rows.length, 3);
  assert.equal(res.winner.id, 'SH-002');
  assert.equal(res.winner.statut, 'Retenu (Choix IA)');
  assert.equal(res.winner.slug_short, 'ia-embauches-juniors-chute');
  assert.ok(
    computeCompositeViralScore(res.winner) > computeCompositeViralScore(res.added[1])
  );
});

test('filterTopicRows filters by category, status, and search query', () => {
  const rows: TopicCsvRow[] = [
    {
      id: 'SH-001',
      date_creation: '2026-11-13',
      demande_session: 'REQ-01',
      categorie: 'IA',
      theme: 'Agents IA en entreprise',
      angle_viral_fr: 'Sécurité',
      hook_propose: 'Un agent IA a accès à tes mails.',
      hook_ecran: 'AGENTS IA',
      score_viral_fr: 90,
      score_actualite: 92,
      score_save_share: 89,
      tension_emotion: 'Curiosité',
      plateformes_cibles: 'TikTok',
      sources: 'solutions-numeriques.com',
      statut: 'Retenu (Choix IA)',
      slug_short: 'agents-ia-entreprise',
      raison_selection: 'Top score',
    },
    {
      id: 'SH-002',
      date_creation: '2026-11-13',
      demande_session: 'REQ-01',
      categorie: 'Business',
      theme: 'Découverts bancaires : nouvelle loi du 20 novembre',
      angle_viral_fr: 'Pouvoir d\'achat',
      hook_propose: 'Ta banque change les règles le 20 novembre.',
      hook_ecran: '20 NOVEMBRE',
      score_viral_fr: 88,
      score_actualite: 95,
      score_save_share: 94,
      tension_emotion: 'Urgence pratique',
      plateformes_cibles: 'Reels',
      sources: 'service-public.gouv.fr',
      statut: 'Candidat',
      slug_short: 'decouverts-bancaires-20-nov',
      raison_selection: 'Fort impact',
    },
  ];

  assert.equal(filterTopicRows(rows, { category: 'IA' }).length, 1);
  assert.equal(filterTopicRows(rows, { status: 'Candidat' }).length, 1);
  assert.equal(filterTopicRows(rows, { search: 'novembre' }).length, 1);
});
