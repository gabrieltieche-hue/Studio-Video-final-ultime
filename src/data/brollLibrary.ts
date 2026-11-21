import aiLabImg from '../assets/images/broll_ai_lab_1794940169988.jpg';
import aiMeetingsImg from '../assets/images/broll_ai_meetings_1794753158637.jpg';
import businessStrategyImg from '../assets/images/broll_business_strategy_1794753161377.jpg';
import consumerInvoiceImg from '../assets/images/broll_consumer_invoice_1795270418676.jpg';
import dataAnalyticsImg from '../assets/images/broll_data_analytics_1794940171313.jpg';
import economyFinanceImg from '../assets/images/broll_economy_finance_1794753160047.jpg';
import focusClockworkImg from '../assets/images/broll_focus_clockwork_1794940171295.jpg';
import healthSportImg from '../assets/images/broll_health_sport_1795270418434.jpg';
import legalDocumentsImg from '../assets/images/broll_legal_documents_1795270419822.jpg';
import mobileAttentionImg from '../assets/images/broll_mobile_attention_1794940172642.jpg';
import realEstateKeysImg from '../assets/images/broll_real_estate_keys_1795270416533.jpg';
import restaurantKitchenImg from '../assets/images/broll_restaurant_kitchen_1795270416409.jpg';
import retailEcommerceImg from '../assets/images/broll_retail_ecommerce_1795270417981.jpg';
import startupTeamImg from '../assets/images/broll_startup_team_1794940171928.jpg';
import techCodeImg from '../assets/images/broll_tech_code_1794753159977.jpg';
import creatorStudioImg from '../assets/images/editorial_creator_studio_1794587431455.jpg';
import parliamentLawImg from '../assets/images/editorial_parliament_law_1794587431774.jpg';
import teenPhoneImg from '../assets/images/editorial_teen_phone_night_1794587431392.jpg';
import { BROLL_POOL_MANIFEST } from './brollPoolManifest';
import {
  BROLL_MEDIA_BY_KEY,
  resolveCanonicalBrollKey,
  type BrollKey,
} from '../engine/brollKeys';
import { resolveBrollDatabaseEntry, type BrollDatabaseEntry } from './brollDatabase';

export type { BrollKey, BrollDatabaseEntry };

export interface BrollAsset {
  key: BrollKey;
  src: string;
  defaultCaption: string;
}

const LEGACY_BUNDLED_ASSETS: Record<string, BrollAsset> = {
  restaurant_kitchen: {
    key: 'restaurant_kitchen',
    src: restaurantKitchenImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.restaurant_kitchen?.editorialTitle || 'Restauration',
  },
  real_estate_keys: {
    key: 'real_estate_keys',
    src: realEstateKeysImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.real_estate_keys?.editorialTitle || 'Immobilier',
  },
  legal_documents: {
    key: 'legal_documents',
    src: legalDocumentsImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.legal_documents?.editorialTitle || 'Droit',
  },
  health_sport: {
    key: 'health_sport',
    src: healthSportImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.health_sport?.editorialTitle || 'Santé',
  },
  retail_ecommerce: {
    key: 'retail_ecommerce',
    src: retailEcommerceImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.retail_ecommerce?.editorialTitle || 'Commerce',
  },
  consumer_invoice: {
    key: 'consumer_invoice',
    src: consumerInvoiceImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.consumer_invoice?.editorialTitle || 'Budget',
  },
  ai_meetings: {
    key: 'ai_meetings',
    src: aiMeetingsImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.ai_meetings?.editorialTitle || 'Organisation',
  },
  economy: {
    key: 'economy',
    src: economyFinanceImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.economy?.editorialTitle || 'Économie',
  },
  tech_code: {
    key: 'tech_code',
    src: techCodeImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.tech_code?.editorialTitle || 'Systèmes',
  },
  business: {
    key: 'business',
    src: businessStrategyImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.business?.editorialTitle || 'Stratégie',
  },
  parliament: {
    key: 'parliament',
    src: parliamentLawImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.parliament?.editorialTitle || 'Institutions',
  },
  teen_phone: {
    key: 'teen_phone',
    src: teenPhoneImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.teen_phone?.editorialTitle || 'Usages',
  },
  studio: {
    key: 'studio',
    src: creatorStudioImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.studio?.editorialTitle || 'Analyse',
  },
  focus_clockwork: {
    key: 'focus_clockwork',
    src: focusClockworkImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.focus_clockwork?.editorialTitle || 'Temps',
  },
  data_analytics: {
    key: 'data_analytics',
    src: dataAnalyticsImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.data_analytics?.editorialTitle || 'Données',
  },
  mobile_attention: {
    key: 'mobile_attention',
    src: mobileAttentionImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.mobile_attention?.editorialTitle || 'Écrans',
  },
  startup_team: {
    key: 'startup_team',
    src: startupTeamImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.startup_team?.editorialTitle || 'Emploi',
  },
  ai_lab: {
    key: 'ai_lab',
    src: aiLabImg,
    defaultCaption: BROLL_MEDIA_BY_KEY.ai_lab?.editorialTitle || 'IA',
  },
};

const POOLED_ASSETS: Record<string, BrollAsset> = Object.fromEntries(
  BROLL_POOL_MANIFEST.map((p) => [
    p.id,
    {
      key: p.id,
      src: p.file,
      defaultCaption: p.title,
    },
  ])
);

export const BROLL_ASSETS: Record<BrollKey, BrollAsset> = {
  ...LEGACY_BUNDLED_ASSETS,
  ...POOLED_ASSETS,
};

export function resolveBrollAsset(
  brollKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollAsset {
  const canonical = resolveCanonicalBrollKey(brollKey, category, theme, beatIndex);
  return BROLL_ASSETS[canonical] || BROLL_ASSETS.biz_desk_minimal || BROLL_ASSETS.business;
}

export function resolveRichBrollEntry(
  brollIdOrKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollDatabaseEntry {
  return resolveBrollDatabaseEntry(brollIdOrKey, category, theme, beatIndex);
}
