export type BrollKey =
  | 'ai_meetings'
  | 'economy'
  | 'tech_code'
  | 'business'
  | 'parliament'
  | 'teen_phone'
  | 'studio'
  | 'focus_clockwork'
  | 'data_analytics'
  | 'mobile_attention'
  | 'startup_team'
  | 'ai_lab';

export const ALL_BROLL_KEYS: BrollKey[] = [
  'ai_meetings',
  'economy',
  'tech_code',
  'business',
  'parliament',
  'teen_phone',
  'studio',
  'focus_clockwork',
  'data_analytics',
  'mobile_attention',
  'startup_team',
  'ai_lab',
];

export function isDevOrCodeTopic(category?: string, theme?: string): boolean {
  const hay = `${category || ''} ${theme || ''}`.toLowerCase();
  return /\b(code|dev|développeur|developer|logiciel|terminal|cli|github|api|python|typescript|javascript|docker|bash|script|programmation)\b/.test(
    hay
  );
}

export function getBrollSequenceForTopic(category?: string, theme?: string): BrollKey[] {
  const hay = `${category || ''} ${theme || ''}`.toLowerCase();

  if (/(réunion|meeting|visio|résumé|agenda|calendrier|bureau|management)/.test(hay)) {
    return ['ai_meetings', 'focus_clockwork', 'startup_team', 'data_analytics', 'ai_lab', 'studio'];
  }
  if (/(loyer|salaire|smic|banque|crédit|économie|impôt|euro|inflation|50-30-20|budget|etf|livret)/.test(hay)) {
    return ['economy', 'data_analytics', 'business', 'focus_clockwork', 'startup_team', 'studio'];
  }
  if (/(loi|parlement|état|politique|france|décret|censure|interdiction|ue|europe|réseau|écran|ado)/.test(hay)) {
    return ['parliament', 'mobile_attention', 'teen_phone', 'data_analytics', 'focus_clockwork', 'studio'];
  }
  if (isDevOrCodeTopic(category, theme)) {
    return ['tech_code', 'ai_lab', 'startup_team', 'data_analytics', 'focus_clockwork', 'studio'];
  }
  if (/(ia|ai|agent|llm|chatgpt|claude|gemini|productiv|temps|freelance)/.test(hay)) {
    return ['ai_lab', 'focus_clockwork', 'startup_team', 'data_analytics', 'tech_code', 'studio'];
  }

  return ['business', 'data_analytics', 'startup_team', 'focus_clockwork', 'ai_lab', 'studio'];
}
