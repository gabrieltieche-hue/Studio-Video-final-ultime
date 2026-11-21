import {
  BROLL_DATABASE,
  BROLL_DATABASE_BY_ID,
  type BrollCategory,
  type BrollDatabaseEntry,
} from '../data/brollDatabase';

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

const LEGACY_BROLL_TO_RICH_ID: Record<BrollKey, string> = {
  ai_meetings: 'work_async_memo_replace',
  economy: 'econ_inflation_basket',
  tech_code: 'code_split_preview_window',
  business: 'biz_saas_mrr_rocket',
  parliament: 'law_parliament_vote_pillar',
  teen_phone: 'mob_teen_night_scroll',
  studio: 'crt_camera_creator_studio',
  focus_clockwork: 'prod_timer_stopwatch_dash',
  data_analytics: 'sci_bar_chart_surge',
  mobile_attention: 'mob_attention_hook_2s',
  startup_team: 'work_team_alignment_circle',
  ai_lab: 'ai_neural_shield_cut',
};

/**
 * Returns true only for genuine software-engineering / coding / CLI / developer-tool topics
 * so banking, law, HR, and lifestyle Shorts never display bash terminals.
 */
export function isDevOrCodeTopic(category?: string, theme?: string): boolean {
  const hay = `${category || ''} ${theme || ''}`.toLowerCase();
  return /\b(code|coder|dev|développeur|developer|programming|cli|terminal|bash|api|sdk|python|typescript|javascript|github|copilot|cursor|ide|claude code|mcp)\b/.test(
    hay
  );
}

/**
 * Legacy 5-asset B-roll sequence preserved for backward compatibility.
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

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function inferPreferredCategories(category?: string, theme?: string, spokenLine?: string): BrollCategory[] {
  const hay = normalizeToken(`${category || ''} ${theme || ''} ${spokenLine || ''}`);
  const cats: BrollCategory[] = [];
  if (/(banque|decouvert|agios|euro|2000|13 \$|salaire|prix|budget|epargne|impot)/.test(hay)) {
    cats.push('finance_money', 'economy_macro');
  }
  if (/(code|cli|github|terminal|mcp|api|sdk|skill\.md|pixel|diff|bug|react|frontend)/.test(hay)) {
    cats.push('tech_code', 'ai_agents');
  }
  if (/(ia|ai|claude|deepseek|gpt|llm|agent|neural|abliteration|prompt)/.test(hay)) {
    cats.push('ai_agents', 'security_privacy');
  }
  if (/(loi|parlement|decret|age|interdit|amende|europe|regulation|censure)/.test(hay)) {
    cats.push('law_policy', 'security_privacy');
  }
  if (/(junior|senior|embauche|cv|reunion|meeting|carriere|travail|entreprise)/.test(hay)) {
    cats.push('work_career', 'business_saas');
  }
  if (/(feed|tiktok|instagram|scroll|attention|ecran|ado|fatigue|5 minutes)/.test(hay)) {
    cats.push('mobile_attention', 'health_focus');
  }
  if (/(1995|retro|crt|cable|console|clavier|souris|hardware)/.test(hay)) {
    cats.push('hardware_retro', 'productivity_time');
  }
  if (/(hook|ab|roi|marge|conversion|saas|paywall|abonnement)/.test(hay)) {
    cats.push('business_saas', 'creator_media');
  }
  if (/(chiffre|courbe|stat|donnee|etude|stanford|pour cent|%)/.test(hay)) {
    cats.push('science_data');
  }
  if (cats.length === 0) {
    cats.push('science_data', 'business_saas', 'productivity_time');
  }
  return cats;
}

/**
 * Matches a spoken line against the 225-entry semantic B-roll database with strict
 * anti-repetition (excludeIds, excludeSubCategories) and cross-batch cooldown.
 */
export function matchBottomIllustrationForLine(params: {
  spokenLine: string;
  category?: string;
  theme?: string;
  excludeIds?: Set<string>;
  excludeSubCategories?: Set<string>;
  batchCooldownIds?: Set<string>;
  preferFormat?: BrollDatabaseEntry['format'];
}): BrollDatabaseEntry {
  const tokens = normalizeToken(params.spokenLine)
    .split(/[^a-z0-9/.$%+-]+/)
    .filter((w) => w.length >= 2);
  const fullNorm = normalizeToken(params.spokenLine);
  const preferredCats = inferPreferredCategories(params.category, params.theme, params.spokenLine);
  const isDev = isDevOrCodeTopic(params.category, params.theme);

  const candidates = BROLL_DATABASE.filter((entry) => {
    if (params.excludeIds?.has(entry.id)) return false;
    if (params.excludeSubCategories?.has(entry.subCategory)) return false;
    if (!isDev && entry.category === 'tech_code' && !/(code|app|interface|site|ecran|outil)/.test(fullNorm)) {
      return false;
    }
    return true;
  });

  const pool = candidates.length > 0 ? candidates : BROLL_DATABASE.filter((e) => !params.excludeIds?.has(e.id));
  const finalPool = pool.length > 0 ? pool : BROLL_DATABASE;

  let best = finalPool[0];
  let bestScore = -Infinity;

  for (const entry of finalPool) {
    let score = 0;

    for (const tag of entry.metaphor_tags) {
      const tagNorm = normalizeToken(tag);
      if (fullNorm.includes(tagNorm)) {
        score += tagNorm.length >= 4 ? 14 : 9;
      } else if (tokens.some((t) => tagNorm.startsWith(t) && t.length >= 4)) {
        score += 6;
      }
    }

    const subjNorm = normalizeToken(entry.concrete_subject);
    for (const tok of tokens) {
      if (tok.length >= 4 && subjNorm.includes(tok)) {
        score += 4;
      }
    }

    const catIdx = preferredCats.indexOf(entry.category);
    if (catIdx === 0) score += 8;
    else if (catIdx > 0) score += 4;

    if (params.preferFormat && entry.format === params.preferFormat) {
      score += 3;
    }

    if (params.batchCooldownIds?.has(entry.id)) {
      score -= 10;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
}

/**
 * Picks primary + sub-beat bottom illustrations for a full Short so the bottom visual rotates
 * every ~2.5-3.8 seconds without ever repeating an asset ID or subCategory within the same video.
 */
export function selectBottomIllustrationsForShort(params: {
  beats: Array<{ spokenLine: string; title?: string; brollKey?: string }>;
  category?: string;
  theme?: string;
  batchCooldownIds?: Set<string>;
  estimatedDurationSec?: number;
}): Array<{ primaryId: string; subBrollKeys: string[]; caption: string }> {
  const usedIds = new Set<string>();
  const usedSubCategories = new Set<string>();
  const formats: Array<BrollDatabaseEntry['format']> = [
    'editorial_3d_vector',
    'macro_bright',
    'human_expressive',
    'kinetic_broll',
  ];

  const estBeatSec =
    params.estimatedDurationSec && params.beats.length > 0
      ? params.estimatedDurationSec / params.beats.length
      : 5.2;

  return params.beats.map((beat, idx) => {
    const isLast = idx === params.beats.length - 1;
    if (isLast && !usedIds.has('crt_camera_creator_studio')) {
      const studioEntry = BROLL_DATABASE_BY_ID['crt_camera_creator_studio'];
      if (studioEntry) {
        usedIds.add(studioEntry.id);
        usedSubCategories.add(studioEntry.subCategory);
        return {
          primaryId: studioEntry.id,
          subBrollKeys: [studioEntry.id],
          caption: studioEntry.caption,
        };
      }
    }

    const primary = matchBottomIllustrationForLine({
      spokenLine: `${beat.title || ''} ${beat.spokenLine}`,
      category: params.category,
      theme: params.theme,
      excludeIds: usedIds,
      excludeSubCategories: usedSubCategories,
      batchCooldownIds: params.batchCooldownIds,
      preferFormat: formats[idx % formats.length],
    });
    usedIds.add(primary.id);
    usedSubCategories.add(primary.subCategory);

    // Split beats > ~3.6s across 2 distinct bottom illustrations for strict 2.5-3.8s visual rotation
    const subKeys = [primary.id];
    const words = beat.spokenLine.split(/\s+/).filter(Boolean);
    if (estBeatSec >= 3.6 || words.length >= 10) {
      const midPoint = Math.floor(words.length / 2);
      const secondHalf = words.slice(midPoint).join(' ') || beat.spokenLine;
      const secondary = matchBottomIllustrationForLine({
        spokenLine: secondHalf,
        category: params.category,
        theme: params.theme,
        excludeIds: usedIds,
        excludeSubCategories: usedSubCategories,
        batchCooldownIds: params.batchCooldownIds,
        preferFormat: formats[(idx + 2) % formats.length],
      });
      usedIds.add(secondary.id);
      usedSubCategories.add(secondary.subCategory);
      subKeys.push(secondary.id);
    }

    return {
      primaryId: primary.id,
      subBrollKeys: subKeys,
      caption: primary.caption,
    };
  });
}

export function resolveBrollDatabaseId(
  brollIdOrKey?: string,
  category?: string,
  theme?: string,
  beatIndex = 1
): BrollDatabaseEntry {
  if (brollIdOrKey && BROLL_DATABASE_BY_ID[brollIdOrKey]) {
    return BROLL_DATABASE_BY_ID[brollIdOrKey];
  }
  if (brollIdOrKey && brollIdOrKey in LEGACY_BROLL_TO_RICH_ID) {
    const mappedId = LEGACY_BROLL_TO_RICH_ID[brollIdOrKey as BrollKey];
    if (BROLL_DATABASE_BY_ID[mappedId]) return BROLL_DATABASE_BY_ID[mappedId];
  }
  const seq = getBrollSequenceForTopic(category, theme);
  const key = seq[Math.max(0, beatIndex - 1) % seq.length] || 'business';
  const fallbackId = LEGACY_BROLL_TO_RICH_ID[key] || 'biz_saas_mrr_rocket';
  return BROLL_DATABASE_BY_ID[fallbackId] || BROLL_DATABASE[0];
}
