import {
  BROLL_MEDIA_DESCRIPTORS,
  resolveCanonicalBrollKey,
  type BrollKey,
} from '../engine/brollKeys';

export type BrollCategory =
  | 'economy_finance'
  | 'law_policy'
  | 'work_career'
  | 'business_saas'
  | 'tech_code'
  | 'ai_agents'
  | 'science_data'
  | 'mobile_attention'
  | 'productivity_time'
  | 'health_focus'
  | 'creator_media';

export interface BrollDatabaseEntry {
  id: BrollKey;
  category: BrollCategory;
  editorialTitle: string;
  lighting: 'bright' | 'high-contrast';
  keywords: string[];
  file?: string;
}

function mapDomainToCategory(domain: string): BrollCategory {
  if (
    domain === 'economie_finance' ||
    domain === 'budget_quotidien' ||
    domain === 'immobilier_logement' ||
    domain === 'economy' ||
    domain === 'consumer_invoice' ||
    domain === 'real_estate_keys'
  ) {
    return 'economy_finance';
  }
  if (
    domain === 'politique_institutions' ||
    domain === 'droit_contrats' ||
    domain === 'parliament' ||
    domain === 'legal_documents'
  ) {
    return 'law_policy';
  }
  if (
    domain === 'emploi_carriere' ||
    domain === 'productivite_reunions' ||
    domain === 'startup_team' ||
    domain === 'ai_meetings'
  ) {
    return 'work_career';
  }
  if (
    domain === 'restauration_hotellerie' ||
    domain === 'commerce_retail' ||
    domain === 'strategie_entreprise' ||
    domain === 'restaurant_kitchen' ||
    domain === 'retail_ecommerce' ||
    domain === 'business'
  ) {
    return 'business_saas';
  }
  if (domain === 'logiciel_ingenierie' || domain === 'tech_code') return 'tech_code';
  if (domain === 'intelligence_artificielle' || domain === 'ai_lab') return 'ai_agents';
  if (domain === 'donnees_etudes' || domain === 'data_analytics') return 'science_data';
  if (
    domain === 'attention_numerique' ||
    domain === 'jeunesse_ecrans' ||
    domain === 'mobile_attention' ||
    domain === 'teen_phone'
  ) {
    return 'mobile_attention';
  }
  if (domain === 'sante_sport' || domain === 'health_sport') return 'health_focus';
  if (domain === 'synthese_creator' || domain === 'studio') return 'creator_media';
  return 'productivity_time';
}

export const BROLL_DATABASE: BrollDatabaseEntry[] = BROLL_MEDIA_DESCRIPTORS.map((d) => ({
  id: d.key,
  category: mapDomainToCategory(d.domain || d.key),
  editorialTitle: d.editorialTitle,
  lighting: d.lighting,
  keywords: d.keywords,
  file: d.file,
}));

export const BROLL_DATABASE_BY_ID: Record<string, BrollDatabaseEntry> = Object.fromEntries(
  BROLL_DATABASE.map((e) => [e.id, e])
);

export function resolveBrollDatabaseEntry(
  idOrKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollDatabaseEntry {
  const canonical = resolveCanonicalBrollKey(idOrKey, category, theme, beatIndex);
  return BROLL_DATABASE_BY_ID[canonical] || BROLL_DATABASE[0];
}
