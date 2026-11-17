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

/**
 * Returns true only for genuine software-engineering / coding / CLI / developer-tool topics
 * so banking, law, HR, and lifestyle Shorts never display bash terminals.
 */
export function isDevOrCodeTopic(category?: string, theme?: string): boolean {
  const hay = `${category || ''} ${theme || ''}`.toLowerCase();
  return /\b(code|coder|dev|développeur|developer|programming|cli|terminal|bash|api|sdk|python|typescript|javascript|github|copilot|cursor|ide)\b/.test(
    hay
  );
}

/**
 * Selects a diverse 5-asset B-roll sequence from all 12 library images matched to the topic domain.
 */
export function getBrollSequenceForTopic(category?: string, theme?: string): BrollKey[] {
  const hay = `${category || ''} ${theme || ''}`.toLowerCase();

  if (/\b(banque|découvert|découverts|crédit|agios|impôt|impôts|pouvoir d'achat|smic|salaire|inflation|budget)\b/.test(hay)) {
    return ['economy', 'data_analytics', 'parliament', 'business', 'focus_clockwork'];
  }

  if (/\b(loi|parlement|décret|interdiction|censure|politique|réforme|état)\b/.test(hay)) {
    return ['parliament', 'teen_phone', 'data_analytics', 'economy', 'mobile_attention'];
  }

  if (/\b(réunion|réunions|meeting|résumé|résumés|visio|slack)\b/.test(hay)) {
    return ['ai_meetings', 'focus_clockwork', 'startup_team', 'data_analytics', 'business'];
  }

  if (/\b(feed|vidéo|vidéos|tiktok|instagram|scroll|attention|fatigue|5 minutes|écran|écrans|ado|ados|jeunes)\b/.test(hay)) {
    return ['mobile_attention', 'teen_phone', 'focus_clockwork', 'studio', 'data_analytics'];
  }

  if (/\b(junior|juniors|senior|seniors|embauche|embauches|emploi|recrutement|carrière|freelance|entreprise|entreprises|agent|agents|économies|coûts?)\b/.test(hay)) {
    return ['startup_team', 'ai_lab', 'data_analytics', 'business', 'economy'];
  }

  if (isDevOrCodeTopic(category, theme) || /\b(ia|ai|llm|modèle|algorithme|tech)\b/.test(hay)) {
    return ['ai_lab', 'tech_code', 'data_analytics', 'startup_team', 'focus_clockwork'];
  }

  return ['business', 'data_analytics', 'focus_clockwork', 'economy', 'startup_team'];
}
