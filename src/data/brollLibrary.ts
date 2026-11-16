import aiMeetingsImg from '../assets/images/broll_ai_meetings_1794753158637.jpg';
import businessStrategyImg from '../assets/images/broll_business_strategy_1794753161377.jpg';
import economyFinanceImg from '../assets/images/broll_economy_finance_1794753160047.jpg';
import techCodeImg from '../assets/images/broll_tech_code_1794753159977.jpg';
import creatorStudioImg from '../assets/images/editorial_creator_studio_1794587431455.jpg';
import parliamentLawImg from '../assets/images/editorial_parliament_law_1794587431774.jpg';
import teenPhoneImg from '../assets/images/editorial_teen_phone_night_1794587431392.jpg';

export type BrollKey =
  | 'ai_meetings'
  | 'economy'
  | 'tech_code'
  | 'business'
  | 'parliament'
  | 'teen_phone'
  | 'studio';

export interface BrollAsset {
  key: BrollKey;
  src: string;
  defaultCaption: string;
}

export const BROLL_ASSETS: Record<BrollKey, BrollAsset> = {
  ai_meetings: {
    key: 'ai_meetings',
    src: aiMeetingsImg,
    defaultCaption: 'Réunions · Automatisation IA',
  },
  economy: {
    key: 'economy',
    src: economyFinanceImg,
    defaultCaption: 'Pouvoir d’achat · Coût réel',
  },
  tech_code: {
    key: 'tech_code',
    src: techCodeImg,
    defaultCaption: 'Outils IA · Temps réel',
  },
  business: {
    key: 'business',
    src: businessStrategyImg,
    defaultCaption: 'Performance · Décision rapide',
  },
  parliament: {
    key: 'parliament',
    src: parliamentLawImg,
    defaultCaption: 'Régulation · Cadre légal',
  },
  teen_phone: {
    key: 'teen_phone',
    src: teenPhoneImg,
    defaultCaption: 'Usage quotidien · Écrans',
  },
  studio: {
    key: 'studio',
    src: creatorStudioImg,
    defaultCaption: 'Décryptage · @alex.decode',
  },
};

export function resolveBrollAsset(
  brollKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollAsset {
  if (brollKey && brollKey in BROLL_ASSETS) {
    return BROLL_ASSETS[brollKey as BrollKey];
  }

  const hay = `${category || ''} ${theme || ''}`.toLowerCase();

  if (beatIndex >= 7) {
    return BROLL_ASSETS.studio;
  }

  if (/(réunion|meeting|visio|ia|ai|agent|llm|chatgpt|claude|résumé|productiv)/.test(hay)) {
    return beatIndex % 2 === 1 ? BROLL_ASSETS.ai_meetings : BROLL_ASSETS.tech_code;
  }
  if (/(loyer|salaire|smic|banque|crédit|économie|impôt|euro|inflation|50-30-20|budget)/.test(hay)) {
    return beatIndex % 2 === 1 ? BROLL_ASSETS.economy : BROLL_ASSETS.business;
  }
  if (/(loi|parlement|état|politique|france|décret|censure|interdiction|ue|europe)/.test(hay)) {
    return beatIndex % 2 === 1 ? BROLL_ASSETS.parliament : BROLL_ASSETS.teen_phone;
  }
  if (/(code|dev|logiciel|saas|startup|entreprise|business)/.test(hay)) {
    return beatIndex % 2 === 1 ? BROLL_ASSETS.tech_code : BROLL_ASSETS.business;
  }

  const cycle: BrollKey[] = ['business', 'tech_code', 'economy', 'ai_meetings'];
  return BROLL_ASSETS[cycle[(beatIndex - 1) % cycle.length]];
}
