import { BROLL_POOL_MANIFEST } from '../data/brollPoolManifest';

/**
 * Universal domain-agnostic photographic B-roll catalog & semantic matcher.
 * Combines 18 canonical domain scenes + 197 verified pooled scenes = 215 unique bright photos
 * across economy, hospitality/food, real estate, law/admin, health/sport, retail, career,
 * data, tech/AI & creator studio.
 * ZERO hardcoded topic regex presets, ZERO pastel card bloat, ZERO English tag leaks.
 */

export type LegacyBrollKey =
  | 'restaurant_kitchen'
  | 'real_estate_keys'
  | 'legal_documents'
  | 'health_sport'
  | 'retail_ecommerce'
  | 'consumer_invoice'
  | 'economy'
  | 'data_analytics'
  | 'business'
  | 'parliament'
  | 'startup_team'
  | 'ai_meetings'
  | 'ai_lab'
  | 'tech_code'
  | 'focus_clockwork'
  | 'mobile_attention'
  | 'teen_phone'
  | 'studio';

export type BrollKey = string;

export interface MediaDomainDescriptor {
  key: BrollKey;
  domain: string;
  editorialTitle: string;
  keywords: string[];
  lighting: 'bright' | 'high-contrast';
  isDevOnly?: boolean;
  file?: string;
}

const CORE_LEGACY_DESCRIPTORS: MediaDomainDescriptor[] = [
  {
    key: 'consumer_invoice',
    domain: 'budget_quotidien',
    editorialTitle: 'Budget · Pouvoir d’achat',
    keywords: [
      'smic', 'salaire', 'pouvoir', 'achat', 'ticket', 'caisse', 'facture', 'prix', 'courses',
      'depense', 'mensuel', 'net', 'brut', 'euro', 'euros', 'budget', 'menage', 'consommation',
      'inflation', 'cafe', 'loyer', 'compte', 'bancaire', 'decouvert', 'credit',
    ],
    lighting: 'bright',
  },
  {
    key: 'economy',
    domain: 'economie_finance',
    editorialTitle: 'Économie · Coût réel',
    keywords: [
      'economie', 'charge', 'charges', 'patronale', 'patronales', 'cotisation', 'impot', 'taxe',
      'fiscal', 'tva', 'banque', 'agios', 'epargne', 'taux', 'interet', 'retraite', 'bilan',
      'comptabilite', 'marge', 'rentabilite', 'tresorerie', 'subvention', 'cout', 'argent',
    ],
    lighting: 'bright',
  },
  {
    key: 'parliament',
    domain: 'politique_institutions',
    editorialTitle: 'Institutions · Décision publique',
    keywords: [
      'etat', 'gouvernement', 'loi', 'decret', 'parlement', 'reforme', 'conference', 'sociale',
      'ministere', 'public', 'europe', 'bruxelles', 'norme', 'regle', 'interdiction', 'vote',
      'politique', 'syndicat', 'senat', 'assemblee', 'amende', 'obligation',
    ],
    lighting: 'bright',
  },
  {
    key: 'legal_documents',
    domain: 'droit_contrats',
    editorialTitle: 'Droit · Contrats & preuves',
    keywords: [
      'contrat', 'clause', 'juridique', 'rgpd', 'droit', 'dossier', 'signature', 'bail',
      'caution', 'litige', 'tribunal', 'inspecteur', 'attestation', 'declaration', 'code',
      'travail', 'rupture', 'preavis', 'conformite', 'audit', 'legal', 'notaire',
    ],
    lighting: 'bright',
  },
  {
    key: 'restaurant_kitchen',
    domain: 'restauration_hotellerie',
    editorialTitle: 'Restauration · Terrain & marges',
    keywords: [
      'restaurant', 'restaurants', 'bistrot', 'cuisine', 'chef', 'food', 'plat', 'menu',
      'serveur', 'service', 'table', 'denree', 'matiere', 'premiere', 'fournisseur', 'couvert',
      'hospitalite', 'boulangerie', 'cafe', 'brasserie', 'traiteur', 'independant',
    ],
    lighting: 'bright',
  },
  {
    key: 'real_estate_keys',
    domain: 'immobilier_logement',
    editorialTitle: 'Immobilier · Logement',
    keywords: [
      'immobilier', 'appartement', 'maison', 'logement', 'loyer', 'locataire', 'proprietaire',
      'dpe', 'diagnostic', 'agence', 'achat', 'notaire', 'cle', 'emprunt', 'credit',
      'hypotheque', 'renovation', 'chantier', 'surface', 'metre', 'carre',
    ],
    lighting: 'bright',
  },
  {
    key: 'retail_ecommerce',
    domain: 'commerce_retail',
    editorialTitle: 'Commerce · Vente & logistique',
    keywords: [
      'boutique', 'commerce', 'client', 'vente', 'commande', 'colis', 'livraison', 'stock',
      'paiement', 'terminal', 'carte', 'panier', 'marge', 'ecommerce', 'magasin', 'artisan',
      'atelier', 'fournisseur', 'grossiste', 'encaissement',
    ],
    lighting: 'bright',
  },
  {
    key: 'health_sport',
    domain: 'sante_sport',
    editorialTitle: 'Santé · Énergie & performance',
    keywords: [
      'sante', 'sport', 'sommeil', 'fatigue', 'cerveau', 'energie', 'rythme', 'coeur',
      'medecin', 'patient', 'corps', 'marche', 'course', 'recuperation', 'stress', 'cortisol',
      'nutrition', 'calorie', 'proteine', 'habitude', 'discipline',
    ],
    lighting: 'bright',
  },
  {
    key: 'startup_team',
    domain: 'emploi_carriere',
    editorialTitle: 'Emploi · Équipes & métiers',
    keywords: [
      'emploi', 'travail', 'junior', 'juniors', 'senior', 'seniors', 'recrutement', 'embauche',
      'offre', 'offres', 'cv', 'candidat', 'entretien', 'entreprise', 'equipe', 'manager',
      'salarie', 'diplome', 'metier', 'carriere', 'freelance', 'formation',
    ],
    lighting: 'bright',
  },
  {
    key: 'business',
    domain: 'strategie_entreprise',
    editorialTitle: 'Stratégie · Modèle économique',
    keywords: [
      'business', 'strategie', 'croissance', 'client', 'offre', 'modele', 'concurrent',
      'marche', 'revenu', 'rentable', 'investissement', 'levier', 'decision', 'direction',
      'pme', 'fondateur', 'execution', 'resultat', 'positionnement',
    ],
    lighting: 'bright',
  },
  {
    key: 'data_analytics',
    domain: 'donnees_etudes',
    editorialTitle: 'Données · Tendances mesurées',
    keywords: [
      'etude', 'chiffre', 'statistique', 'courbe', 'pour', 'cent', 'donnee', 'donnees',
      'rapport', 'insee', 'stanford', 'indice', 'mesure', 'hausse', 'baisse', 'ecart',
      'comparaison', 'projection', 'tendance', 'graphique', 'preuve',
    ],
    lighting: 'bright',
  },
  {
    key: 'ai_meetings',
    domain: 'productivite_reunions',
    editorialTitle: 'Organisation · Temps utile',
    keywords: [
      'reunion', 'reunions', 'meeting', 'calendrier', 'agenda', 'bureau', 'synthese',
      'compte', 'rendu', 'async', 'slack', 'visio', 'collaboration', 'planning', 'tache',
    ],
    lighting: 'bright',
  },
  {
    key: 'focus_clockwork',
    domain: 'temps_mecanique',
    editorialTitle: 'Temps · Mécanisme de fond',
    keywords: [
      'temps', 'minute', 'heure', 'delai', 'echeance', 'vitesse', 'urgence', 'horloge',
      'chronometre', 'mecanisme', 'engrenage', 'cycle', 'mois', 'annee', 'demain',
    ],
    lighting: 'bright',
  },
  {
    key: 'mobile_attention',
    domain: 'attention_numerique',
    editorialTitle: 'Écrans · Attention & usages',
    keywords: [
      'telephone', 'smartphone', 'notification', 'alerte', 'application', 'appli', 'reseau',
      'tiktok', 'instagram', 'youtube', 'algorithme', 'feed', 'scroll', 'attention',
    ],
    lighting: 'high-contrast',
  },
  {
    key: 'teen_phone',
    domain: 'jeunesse_ecrans',
    editorialTitle: 'Usages · Vie connectée',
    keywords: [
      'ado', 'ados', 'jeune', 'jeunes', 'mineur', 'lycee', 'college', 'soir', 'nuit',
      'ecran', 'ecrans', 'parent', 'famille', 'sommeil', 'addiction',
    ],
    lighting: 'high-contrast',
  },
  {
    key: 'ai_lab',
    domain: 'intelligence_artificielle',
    editorialTitle: 'IA · Automatisation avancée',
    keywords: [
      'ia', 'ai', 'agent', 'agents', 'modele', 'llm', 'claude', 'openai', 'gpt', 'deepseek',
      'automatisation', 'prompt', 'neurone', 'token', 'calcul', 'inference', 'copilot',
    ],
    lighting: 'high-contrast',
  },
  {
    key: 'tech_code',
    domain: 'logiciel_ingenierie',
    editorialTitle: 'Systèmes · Architecture & code',
    keywords: [
      'code', 'developpeur', 'dev', 'api', 'sdk', 'mcp', 'serveur', 'github', 'terminal',
      'cli', 'bug', 'react', 'typescript', 'python', 'deploiement', 'logiciel', 'cloud',
    ],
    lighting: 'high-contrast',
    isDevOnly: true,
  },
  {
    key: 'studio',
    domain: 'synthese_creator',
    editorialTitle: 'Analyse · Prochain épisode',
    keywords: [
      'abonne', 'cloche', 'episode', 'chaine', 'analyse', 'decryptage', 'suivre', 'suite',
    ],
    lighting: 'bright',
  },
];

const POOLED_DESCRIPTORS: MediaDomainDescriptor[] = BROLL_POOL_MANIFEST.map((p) => ({
  key: p.id,
  domain: p.domain,
  editorialTitle: p.title,
  keywords: p.keywords,
  lighting: p.lighting,
  isDevOnly: p.isDevOnly,
  file: p.file,
}));

// Combined 215+ bright/high-contrast photographic scenes (pooled concrete scenes prioritized in tie-breaks)
export const BROLL_MEDIA_DESCRIPTORS: MediaDomainDescriptor[] = [
  ...POOLED_DESCRIPTORS,
  ...CORE_LEGACY_DESCRIPTORS,
];

export const BROLL_MEDIA_BY_KEY: Record<string, MediaDomainDescriptor> = Object.fromEntries(
  BROLL_MEDIA_DESCRIPTORS.map((d) => [d.key, d])
);

const LEGACY_KEY_MAP: Record<string, LegacyBrollKey> = {
  ai_meetings: 'ai_meetings',
  economy: 'economy',
  tech_code: 'tech_code',
  business: 'business',
  parliament: 'parliament',
  teen_phone: 'teen_phone',
  studio: 'studio',
  focus_clockwork: 'focus_clockwork',
  data_analytics: 'data_analytics',
  mobile_attention: 'mobile_attention',
  startup_team: 'startup_team',
  ai_lab: 'ai_lab',
  restaurant_kitchen: 'restaurant_kitchen',
  real_estate_keys: 'real_estate_keys',
  legal_documents: 'legal_documents',
  health_sport: 'health_sport',
  retail_ecommerce: 'retail_ecommerce',
  consumer_invoice: 'consumer_invoice',
};

function normalizeToken(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * True ONLY for explicit software-engineering / CLI / API / dev-tools topics.
 */
export function isDevOrCodeTopic(category?: string, theme?: string): boolean {
  const hay = normalizeToken(`${category || ''} ${theme || ''}`);
  return /\b(code|coder|dev|developpeur|developer|programming|cli|terminal|bash|api|sdk|python|typescript|javascript|github|copilot|cursor|ide|claude code|mcp|serveur mcp|serveurs mcp)\b/.test(
    hay
  );
}

/**
 * Resolves any current pooled key, legacy key, or old prefix onto a valid photographic BrollKey.
 */
export function resolveCanonicalBrollKey(
  rawKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollKey {
  if (rawKey && rawKey in BROLL_MEDIA_BY_KEY) {
    return rawKey;
  }
  if (rawKey && rawKey in LEGACY_KEY_MAP) {
    return LEGACY_KEY_MAP[rawKey];
  }
  if (rawKey) {
    const k = rawKey.toLowerCase();
    if (k.startsWith('econ_') || k.startsWith('fin_')) return 'economy';
    if (k.startsWith('law_') || k.startsWith('sec_')) return k.includes('gdpr') || k.includes('contract') ? 'legal_documents' : 'parliament';
    if (k.startsWith('work_')) return 'startup_team';
    if (k.startsWith('mob_')) return 'mobile_attention';
    if (k.startsWith('crt_')) return 'studio';
    if (k.startsWith('prod_')) return 'focus_clockwork';
    if (k.startsWith('sci_')) return 'data_analytics';
    if (k.startsWith('ai_')) return 'ai_lab';
    if (k.startsWith('code_')) return 'tech_code';
    if (k.startsWith('biz_')) return 'business';
    if (k.startsWith('health_')) return 'health_sport';
  }
  const seq = getBrollSequenceForTopic(category, theme);
  return seq[(Math.max(0, beatIndex - 1)) % seq.length] || 'biz_desk_minimal';
}

/**
 * Pure domain-agnostic semantic scorer across all 215+ bright editorial photographs.
 */
function scoreMediaDescriptor(
  desc: MediaDomainDescriptor,
  spokenText: string,
  topicText: string,
  isDev: boolean
): number {
  if (desc.isDevOnly && !isDev) return -999;

  const lineNorm = normalizeToken(spokenText);
  const topicNorm = normalizeToken(topicText);
  const lineTokens = lineNorm.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  const topicTokens = topicNorm.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

  const lineWords = new Set([...lineTokens, ...lineTokens.map((w) => w.replace(/s$/, ''))]);
  const topicWords = new Set([...topicTokens, ...topicTokens.map((w) => w.replace(/s$/, ''))]);

  let score = desc.file ? 2 : 0; // Slightly prefer concrete 197-pool scene photos in tie-breaks
  for (const kw of desc.keywords) {
    const kwNorm = normalizeToken(kw);
    const kwStem = kwNorm.replace(/s$/, '');
    if (lineWords.has(kwNorm) || lineWords.has(kwStem)) score += 16;
    else if (kwNorm.length >= 4 && lineNorm.includes(kwNorm)) score += 10;

    if (topicWords.has(kwNorm) || topicWords.has(kwStem)) score += 7;
    else if (kwNorm.length >= 4 && topicNorm.includes(kwNorm)) score += 4;
  }

  return score;
}

/**
 * Builds an ordered list of top photographic B-roll keys matching any topic cleanly.
 */
export function getBrollSequenceForTopic(category?: string, theme?: string): BrollKey[] {
  const isDev = isDevOrCodeTopic(category, theme);
  const primaryText = theme || category || '';
  const secondaryText = category || '';
  const ranked = BROLL_MEDIA_DESCRIPTORS
    .filter((d) => d.domain !== 'synthese_creator' && (!d.isDevOnly || isDev))
    .map((d) => ({
      key: d.key,
      score: scoreMediaDescriptor(d, primaryText, secondaryText, isDev),
    }))
    .sort((a, b) => b.score - a.score);

  const nonZero = ranked.filter((r) => r.score > 2).map((r) => r.key);
  const fallbacks: BrollKey[] = isDev
    ? ['dev_server_rack', 'ai_robotics_lab', 'data_dual_monitors', 'work_coworking_bright', 'biz_desk_minimal', 'time_watch_gears']
    : ['biz_desk_minimal', 'data_bar_chart', 'budget_cash_receipt', 'econ_balance_sheet', 'work_coworking_bright', 'time_watch_gears'];

  const merged: BrollKey[] = [];
  for (const k of [...nonZero, ...fallbacks]) {
    if (!merged.includes(k)) merged.push(k);
    if (merged.length >= 16) break;
  }
  return merged;
}

/**
 * Picks primary + sub-beat full-bleed photographic media keys across the 215+ scene pool,
 * strictly driven by sentence semantics, rotating visuals on longer beats, and avoiding repeats
 * both within the same Short AND across recent Shorts in a batch.
 */
export function selectBottomMediaForShort(params: {
  beats: Array<{ spokenLine: string; title?: string; brollKey?: string; visualQuery?: string }>;
  category?: string;
  theme?: string;
  batchCooldownIds?: Set<string>;
  estimatedDurationSec?: number;
}): Array<{ primaryId: BrollKey; subBrollKeys: BrollKey[]; caption: string }> {
  const isDev = isDevOrCodeTopic(params.category, params.theme);
  const topicText = `${params.category || ''} ${params.theme || ''}`;
  const usedInShort = new Set<BrollKey>();
  let lastPicked: BrollKey | null = null;

  const pickBestKey = (textForBeat: string, preferredKey?: string, isLastBeat = false): BrollKey => {
    if (isLastBeat) {
      const studioCandidates = BROLL_MEDIA_DESCRIPTORS.filter(
        (d) => d.domain === 'synthese_creator' && d.key !== lastPicked && !usedInShort.has(d.key)
      );
      const bestStudio =
        studioCandidates.find((d) => !params.batchCooldownIds?.has(d.key)) ||
        studioCandidates[0];
      if (bestStudio) {
        usedInShort.add(bestStudio.key);
        lastPicked = bestStudio.key;
        return bestStudio.key;
      }
    }

    if (preferredKey && preferredKey in BROLL_MEDIA_BY_KEY) {
      const desc = BROLL_MEDIA_BY_KEY[preferredKey];
      if (
        (!desc.isDevOnly || isDev) &&
        preferredKey !== lastPicked &&
        !usedInShort.has(preferredKey) &&
        !params.batchCooldownIds?.has(preferredKey)
      ) {
        usedInShort.add(preferredKey);
        lastPicked = preferredKey;
        return preferredKey;
      }
    }

    const candidates = BROLL_MEDIA_DESCRIPTORS.filter((d) => {
      if (d.isDevOnly && !isDev) return false;
      if (d.domain === 'synthese_creator' && !isLastBeat) return false;
      return d.key !== lastPicked;
    });

    let best = candidates[0]?.key || 'biz_desk_minimal';
    let bestScore = -Infinity;

    for (const cand of candidates) {
      let sc = scoreMediaDescriptor(cand, textForBeat, topicText, isDev);
      if (usedInShort.has(cand.key)) sc -= 150; // Strict prohibition against repeating same photo inside one Short
      if (params.batchCooldownIds?.has(cand.key)) sc -= 100; // Draw fresh unused photos across multi-Short batches
      if (sc > bestScore) {
        bestScore = sc;
        best = cand.key;
      }
    }

    usedInShort.add(best);
    lastPicked = best;
    return best;
  };

  const estBeatSec =
    params.estimatedDurationSec && params.beats.length > 0
      ? params.estimatedDurationSec / params.beats.length
      : 5.2;

  return params.beats.map((beat, idx) => {
    const isLast = idx === params.beats.length - 1;
    const lineText = `${beat.title || ''} ${beat.visualQuery || ''} ${beat.spokenLine}`;
    const primary = pickBestKey(lineText, beat.brollKey, isLast);
    const subKeys: BrollKey[] = [primary];

    const words = beat.spokenLine.split(/\s+/).filter(Boolean);
    if (!isLast && (estBeatSec >= 3.6 || words.length >= 10)) {
      const mid = Math.floor(words.length / 2);
      const secondHalf = `${beat.visualQuery || ''} ${words.slice(mid).join(' ')}`;
      const secondary = pickBestKey(secondHalf, undefined, false);
      if (secondary !== primary) {
        subKeys.push(secondary);
      }
    }

    return {
      primaryId: primary,
      subBrollKeys: subKeys,
      caption: BROLL_MEDIA_BY_KEY[primary]?.editorialTitle || 'Décryptage',
    };
  });
}

// Clean alias preserved for callers migrating from old name
export const selectBottomIllustrationsForShort = selectBottomMediaForShort;
