import aiLabImg from '../assets/images/broll_ai_lab_1794836125445.jpg';
import aiMeetingsImg from '../assets/images/broll_ai_meetings_1794753158637.jpg';
import businessStrategyImg from '../assets/images/broll_business_strategy_1794753161377.jpg';
import dataAnalyticsImg from '../assets/images/broll_data_analytics_1794836122643.jpg';
import economyFinanceImg from '../assets/images/broll_economy_finance_1794753160047.jpg';
import focusClockworkImg from '../assets/images/broll_focus_clockwork_1794836122551.jpg';
import mobileAttentionImg from '../assets/images/broll_mobile_attention_1794836123647.jpg';
import startupTeamImg from '../assets/images/broll_startup_team_1794836123918.jpg';
import techCodeImg from '../assets/images/broll_tech_code_1794753159977.jpg';
import creatorStudioImg from '../assets/images/editorial_creator_studio_1794587431455.jpg';
import parliamentLawImg from '../assets/images/editorial_parliament_law_1794587431774.jpg';
import teenPhoneImg from '../assets/images/editorial_teen_phone_night_1794587431392.jpg';
import { getBrollSequenceForTopic, type BrollKey } from '../engine/brollKeys';

export type { BrollKey };

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
    defaultCaption: 'Systèmes · Temps réel',
  },
  business: {
    key: 'business',
    src: businessStrategyImg,
    defaultCaption: 'Stratégie · Décision rapide',
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
  focus_clockwork: {
    key: 'focus_clockwork',
    src: focusClockworkImg,
    defaultCaption: 'Temps · Cadence & Précision',
  },
  data_analytics: {
    key: 'data_analytics',
    src: dataAnalyticsImg,
    defaultCaption: 'Données · Tendances mesurées',
  },
  mobile_attention: {
    key: 'mobile_attention',
    src: mobileAttentionImg,
    defaultCaption: 'Attention · Flux continu',
  },
  startup_team: {
    key: 'startup_team',
    src: startupTeamImg,
    defaultCaption: 'Équipes · Nouvelle donne',
  },
  ai_lab: {
    key: 'ai_lab',
    src: aiLabImg,
    defaultCaption: 'Recherche · Agents autonomes',
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

  const seq = getBrollSequenceForTopic(category, theme);
  const idx = Math.max(0, beatIndex - 1);
  if (beatIndex >= 8) {
    return BROLL_ASSETS.studio;
  }
  const chosenKey = seq[idx % seq.length] || 'business';
  return BROLL_ASSETS[chosenKey];
}
