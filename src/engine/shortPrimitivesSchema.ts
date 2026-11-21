import type { BatchBeatSpec, DynamicVisualType, UniversalPrimitiveType } from '../types/batch';

export interface PrimitiveMetadata {
  id: UniversalPrimitiveType;
  label: string;
  useCase: string;
  preferLayout: 'split' | 'fullscreen';
  devOnly?: boolean;
  defaultSfx: NonNullable<BatchBeatSpec['sfxKind']>;
}

export const UNIVERSAL_PRIMITIVES_CATALOG: PrimitiveMetadata[] = [
  {
    id: 'metric_shock_hook',
    label: 'Chiffre Choc & Tampon',
    useCase: 'Hook chiffré immédiat avec grand indicateur + mot-clé bleu + tampon',
    preferLayout: 'split',
    defaultSfx: 'impact-boom',
  },
  {
    id: 'dot_population_scale',
    label: 'Matrice Population & Loupe',
    useCase: 'Proportion d’une population/échantillon (ex: 80 %, 16 %, 1 sur 5)',
    preferLayout: 'split',
    defaultSfx: 'pop',
  },
  {
    id: 'paper_receipt_payslip',
    label: 'Ticket / Fiche de Paie Papier',
    useCase: 'Décomposition ligne par ligne d’un coût, salaire, marge, facture ou budget',
    preferLayout: 'split',
    defaultSfx: 'tap',
  },
  {
    id: 'countdown_calendar_stamp',
    label: 'Calendrier & Tampon Officiel',
    useCase: 'Date clé, échéance, délai légal, cycle mensuel avec tampon animé',
    preferLayout: 'split',
    defaultSfx: 'thud',
  },
  {
    id: 'balance_scale_duel',
    label: 'Balance à Plateaux A vs B',
    useCase: 'Comparaison de poids économique, coût vs gain, offre vs demande',
    preferLayout: 'fullscreen',
    defaultSfx: 'zhhh',
  },
  {
    id: 'trap_barrier_alert',
    label: 'Barrière / Piège & Verrou',
    useCase: 'Blocage, interdiction, règle restrictive, faille ou clause cachée',
    preferLayout: 'split',
    defaultSfx: 'impact-boom',
  },
  {
    id: 'hydraulic_compressor',
    label: 'Presse Hydraulique Chiffre',
    useCase: 'Compression ou réduction drastique d’un coût, durée ou marge',
    preferLayout: 'fullscreen',
    defaultSfx: 'thud',
  },
  {
    id: 'scrolling_checklist_spotlight',
    label: 'Checklist Défilante + Aperçu',
    useCase: 'Liste numérotée de règles, erreurs ou signes avec carte spotlight',
    preferLayout: 'fullscreen',
    defaultSfx: 'tap',
  },
  {
    id: 'radial_mindmap_hub',
    label: 'Carte Mentale Radiale',
    useCase: 'Cœur du problème relié dynamiquement à 3 à 5 facteurs concrets',
    preferLayout: 'fullscreen',
    defaultSfx: 'pop',
  },
  {
    id: 'audit_table_detector',
    label: 'Tableau d’Audit & Détecteur',
    useCase: 'Scan d’éléments concrets avec alertes rouges, doublons ou validations vertes',
    preferLayout: 'fullscreen',
    defaultSfx: 'tap',
  },
  {
    id: 'profile_objection_deck',
    label: 'Cartes Profils & Cas Concrets',
    useCase: 'Profils réels impactés avec chiffre individuel et objection courte',
    preferLayout: 'split',
    defaultSfx: 'pop',
  },
  {
    id: 'notification_explosion_stamp',
    label: 'Pile Alertes x99+ & Verdict',
    useCase: 'Accumulation de messages, rappels, relances ou signaux d’alarme',
    preferLayout: 'split',
    defaultSfx: 'glass-shatter',
  },
  {
    id: 'segmented_quota_slider',
    label: 'Jauge Réel vs Prévu',
    useCase: 'Écart entre promesse théorique et réalité mesurée + barres segmentées',
    preferLayout: 'fullscreen',
    defaultSfx: 'zhhh',
  },
  {
    id: 'hand_drawn_marker_highlight',
    label: 'Extrait Surligné au Marqueur',
    useCase: 'Citation d’étude, article, loi ou rapport officiel avec surligneur animé',
    preferLayout: 'split',
    defaultSfx: 'pop',
  },
  {
    id: 'before_after_morph',
    label: 'Morphing Avant -> Après',
    useCase: 'Transformation visuelle d’une méthode archaïque/erronée vers la bonne pratique',
    preferLayout: 'fullscreen',
    defaultSfx: 'bell',
  },
  {
    id: 'animated_data_chart',
    label: 'Courbe & Données Chiffrées',
    useCase: 'Évolution temporelle réelle sur 4 à 5 jalons avec point d’inflexion',
    preferLayout: 'fullscreen',
    defaultSfx: 'zhhh',
  },
  {
    id: 'split_comparison_window',
    label: 'Comparatif Dual & Multiplicateur',
    useCase: 'Barres ou cartes comparatives avec multiplicateur ou écart net',
    preferLayout: 'fullscreen',
    defaultSfx: 'riser',
  },
  {
    id: 'process_pipeline',
    label: 'Chaîne Cause à Effet',
    useCase: 'Mécanisme concret en 3 à 4 étapes reliées étape par étape',
    preferLayout: 'split',
    defaultSfx: 'tap',
  },
  {
    id: 'terminal_chat_window',
    label: 'Terminal & Fenêtre Code/IA',
    useCase: 'Commandes CLI, API, MCP ou code live (SUJETS TECH/DEV UNIQUEMENT)',
    preferLayout: 'split',
    devOnly: true,
    defaultSfx: 'pop',
  },
  {
    id: 'rotary_control_deck',
    label: 'Console 3 Réglages / Leviers',
    useCase: 'Trois paramètres clés dosés en pourcentage ou score',
    preferLayout: 'fullscreen',
    defaultSfx: 'tap',
  },
  {
    id: 'globe_network_flow',
    label: 'Flux Réseau & Origine/Cible',
    useCase: 'Circulation de valeur, données, marchandises ou capitaux entre acteurs',
    preferLayout: 'split',
    defaultSfx: 'zhhh',
  },
  {
    id: 'editorial_evidence_board',
    label: 'Podium & Éventail de Preuves',
    useCase: '3 à 4 preuves ou scénarios classés pour ancrer le verdict',
    preferLayout: 'fullscreen',
    defaultSfx: 'riser',
  },
];

export const UNIVERSAL_PRIMITIVE_IDS = new Set<UniversalPrimitiveType>(
  UNIVERSAL_PRIMITIVES_CATALOG.map((p) => p.id)
);

export const PRIMITIVE_META_MAP: Record<UniversalPrimitiveType, PrimitiveMetadata> = Object.fromEntries(
  UNIVERSAL_PRIMITIVES_CATALOG.map((p) => [p.id, p])
) as Record<UniversalPrimitiveType, PrimitiveMetadata>;

const LEGACY_TO_UNIVERSAL: Record<string, UniversalPrimitiveType> = {
  massive_dot_matrix_zoom: 'dot_population_scale',
  dot_matrix_zoom: 'dot_population_scale',
  avatar_crowd_highlight: 'profile_objection_deck',
  confidential_vault_slam: 'trap_barrier_alert',
  alert_rule: 'trap_barrier_alert',
  paywall_shock_stack: 'notification_explosion_stamp',
  hook_alert: 'trap_barrier_alert',
  hook_stat: 'metric_shock_hook',
  hook_shatter: 'metric_shock_hook',
  hook_question: 'metric_shock_hook',
  hook_versus: 'balance_scale_duel',
  counter_flip: 'metric_shock_hook',
  chat_prompt_refusal_cascade: 'notification_explosion_stamp',
  neural_shield_abliteration: 'hydraulic_compressor',
  neural_scan: 'hydraulic_compressor',
  night_shift_multi_agent_laptop: 'radial_mindmap_hub',
  claude_code_slash_cli: 'terminal_chat_window',
  code_and_live_preview_split: 'terminal_chat_window',
  terminal_flow: 'terminal_chat_window',
  rotary_mixing_knobs: 'rotary_control_deck',
  rotary_console: 'rotary_control_deck',
  github_repo_star_rocket: 'animated_data_chart',
  chart_curve: 'animated_data_chart',
  article_highlighter_zoom: 'hand_drawn_marker_highlight',
  headline_news: 'hand_drawn_marker_highlight',
  source_quote: 'hand_drawn_marker_highlight',
  pixel_diff_clone_loop: 'before_after_morph',
  pixel_diff: 'before_after_morph',
  ugly_to_apple_ui_morph: 'before_after_morph',
  red_strike_live_rewrite: 'before_after_morph',
  github_heatmap_and_runs: 'countdown_calendar_stamp',
  social_feed_waterfall: 'scrolling_checklist_spotlight',
  conveyor_belt_cleaner: 'audit_table_detector',
  humanizer_belt: 'audit_table_detector',
  checklist_audit: 'audit_table_detector',
  retro_crt_1995_parallel: 'split_comparison_window',
  comparison_bars: 'split_comparison_window',
  myth_vs_fact: 'split_comparison_window',
  physical_cable_app_plug: 'process_pipeline',
  timeline_steps: 'process_pipeline',
  metallic_toolbox_explode: 'radial_mindmap_hub',
  key_points: 'scrolling_checklist_spotlight',
  card_fan_explosion_10x: 'editorial_evidence_board',
  ab_hook_leaderboard: 'editorial_evidence_board',
  cloud_vs_offline_shield: 'balance_scale_duel',
  voice_shortcut_waveform: 'segmented_quota_slider',
  dual_stopwatch: 'segmented_quota_slider',
  gauge: 'segmented_quota_slider',
  ui_window: 'paper_receipt_payslip',
  toggles_switch: 'rotary_control_deck',
  cta_card: 'channel_end_cta',
};

/**
 * Maps any current or legacy visualType cleanly onto one of the 22 universal primitives or CTA.
 */
export function normalizeToUniversalPrimitive(vt: DynamicVisualType | string): UniversalPrimitiveType {
  if (vt === 'channel_end_cta') return 'channel_end_cta';
  if (UNIVERSAL_PRIMITIVE_IDS.has(vt as UniversalPrimitiveType)) {
    return vt as UniversalPrimitiveType;
  }
  return LEGACY_TO_UNIVERSAL[vt] || 'metric_shock_hook';
}

const BANNED_LEAK_RE =
  /offres juniors depuis 2023|profils seniors 32%|ancien formulaire brut|interface apple grade|gratuit\s*\/\s*rapide\s*\/\s*local|décroche ton poste 2026|junior_hiring_freeze|stanford_study|open_source_boom|mcp_connector|truth_filter|@alex\.decode|banque de francehec/i;

const BANNED_CLICHE_RE =
  /\u2014|\bdans cette vidéo\b|\bbonjour à tous\b|\bsalut à tous\b|\brévolutionnaire\b|\bincontournable\b|\bplongeons dans\b|\bau cœur de\b/i;

export interface ShortPlanValidationResult {
  valid: boolean;
  errors: string[];
}

function hasUsableText(v: unknown, minLen = 2): boolean {
  return typeof v === 'string' && v.trim().length >= minLen;
}

/**
 * Strictly validates that a beat contains real domain-specific payloads for its chosen primitive,
 * zero leaked placeholder strings, zero em-dashes, and zero truncated ellipsis labels.
 */
export function validateBeatPayload(
  beat: BatchBeatSpec,
  index: number,
  totalBeats: number,
  options: { isDevTopic: boolean }
): string[] {
  const errors: string[] = [];
  const label = `Beat ${index + 1} (${beat.visualType})`;

  if (!hasUsableText(beat.spokenLine, 12)) {
    errors.push(`${label}: spokenLine manquante ou trop courte`);
  }
  if (!hasUsableText(beat.title, 3)) {
    errors.push(`${label}: title manquant`);
  }
  if (typeof beat.title === 'string' && /\.\.\.|…$/.test(beat.title.trim())) {
    errors.push(`${label}: title tronqué avec ellipse ("${beat.title}")`);
  }

  const combinedText = JSON.stringify(beat);
  if (BANNED_LEAK_RE.test(combinedText)) {
    errors.push(`${label}: contient un texte interdit ou résidu de démo`);
  }
  if (BANNED_CLICHE_RE.test(beat.spokenLine || '')) {
    errors.push(`${label}: spokenLine contient un cliché IA ou tiret cadratin`);
  }

  const vt = beat.visualType as UniversalPrimitiveType;
  const isLast = index === totalBeats - 1;

  if (isLast) {
    if (vt !== 'channel_end_cta') {
      errors.push(`${label}: le dernier beat doit utiliser visualType="channel_end_cta"`);
    }
    if (/commentaire|commente\b/i.test(beat.spokenLine || '')) {
      errors.push(`${label}: le CTA ne doit pas demander de commentaire`);
    }
    return errors;
  }

  if (!UNIVERSAL_PRIMITIVE_IDS.has(vt)) {
    errors.push(`${label}: visualType "${beat.visualType}" inconnu (doit faire partie des 22 primitives universelles)`);
    return errors;
  }

  if (vt === 'terminal_chat_window' && !options.isDevTopic) {
    errors.push(`${label}: terminal_chat_window interdit sur un sujet non tech/dev`);
  }

  // Strict payload presence validation per primitive
  switch (vt) {
    case 'metric_shock_hook':
      if (!hasUsableText(beat.statValue, 1) || !hasUsableText(beat.statLabel, 3)) {
        errors.push(`${label}: statValue et statLabel requis`);
      }
      break;
    case 'dot_population_scale':
      if (typeof beat.matrixHighlightPct !== 'number' || !hasUsableText(beat.matrixCalloutLabel, 3)) {
        errors.push(`${label}: matrixHighlightPct et matrixCalloutLabel requis`);
      }
      break;
    case 'paper_receipt_payslip':
      if (!Array.isArray(beat.receiptItems) || beat.receiptItems.length < 3) {
        errors.push(`${label}: au moins 3 receiptItems requis`);
      }
      break;
    case 'countdown_calendar_stamp':
      if (!hasUsableText(beat.calendarMonth, 2) || !hasUsableText(beat.stampWord, 2)) {
        errors.push(`${label}: calendarMonth et stampWord requis`);
      }
      break;
    case 'balance_scale_duel':
      if (!beat.leftCard?.label || !beat.rightCard?.label) {
        errors.push(`${label}: leftCard et rightCard requis`);
      }
      break;
    case 'trap_barrier_alert':
      if (!hasUsableText(beat.barrierBadge, 2) || !hasUsableText(beat.barrierRuleText, 4)) {
        errors.push(`${label}: barrierBadge et barrierRuleText requis`);
      }
      break;
    case 'hydraulic_compressor':
      if (!hasUsableText(beat.compressorFrom, 1) || !hasUsableText(beat.compressorTo, 1)) {
        errors.push(`${label}: compressorFrom et compressorTo requis`);
      }
      break;
    case 'scrolling_checklist_spotlight':
      if (!Array.isArray(beat.bullets) || beat.bullets.length < 3) {
        errors.push(`${label}: au moins 3 bullets requis`);
      }
      break;
    case 'radial_mindmap_hub':
      if (!hasUsableText(beat.mindmapCenter, 2) || !Array.isArray(beat.mindmapNodes) || beat.mindmapNodes.length < 3) {
        errors.push(`${label}: mindmapCenter et >= 3 mindmapNodes requis`);
      }
      break;
    case 'audit_table_detector':
      if (!Array.isArray(beat.auditRows) || beat.auditRows.length < 3) {
        errors.push(`${label}: au moins 3 auditRows requis`);
      }
      break;
    case 'profile_objection_deck':
      if (!Array.isArray(beat.profileCards) || beat.profileCards.length < 2) {
        errors.push(`${label}: au moins 2 profileCards requis`);
      }
      break;
    case 'notification_explosion_stamp':
      if (!Array.isArray(beat.notifItems) || beat.notifItems.length < 2 || !hasUsableText(beat.stampWord, 2)) {
        errors.push(`${label}: notifItems (>=2) et stampWord requis`);
      }
      break;
    case 'segmented_quota_slider':
      if (!hasUsableText(beat.quotaActualLabel, 2) || !hasUsableText(beat.quotaPlannedLabel, 2) || typeof beat.gaugePct !== 'number') {
        errors.push(`${label}: quotaActualLabel, quotaPlannedLabel et gaugePct requis`);
      }
      break;
    case 'hand_drawn_marker_highlight':
      if (!hasUsableText(beat.quoteText, 8) || !hasUsableText(beat.quoteHighlight, 2)) {
        errors.push(`${label}: quoteText et quoteHighlight requis`);
      }
      break;
    case 'before_after_morph':
      if (!hasUsableText(beat.beforeBadText, 4) || !hasUsableText(beat.afterGoodText, 4)) {
        errors.push(`${label}: beforeBadText et afterGoodText requis`);
      }
      break;
    case 'animated_data_chart':
      if (!Array.isArray(beat.chartPoints) || beat.chartPoints.length < 3) {
        errors.push(`${label}: au moins 3 chartPoints requis`);
      }
      break;
    case 'split_comparison_window':
      if (!beat.comparisonLeft?.label || !beat.comparisonRight?.label) {
        errors.push(`${label}: comparisonLeft et comparisonRight requis`);
      }
      break;
    case 'process_pipeline':
      if (!Array.isArray(beat.steps) || beat.steps.length < 3) {
        errors.push(`${label}: au moins 3 steps requis`);
      }
      break;
    case 'terminal_chat_window':
      if (!hasUsableText(beat.terminalCmd, 2) || !Array.isArray(beat.terminalOut) || beat.terminalOut.length < 2) {
        errors.push(`${label}: terminalCmd et terminalOut requis`);
      }
      break;
    case 'rotary_control_deck':
      if (!Array.isArray(beat.dialKnobs) || beat.dialKnobs.length < 3) {
        errors.push(`${label}: 3 dialKnobs requis`);
      }
      break;
    case 'globe_network_flow':
      if (!hasUsableText(beat.globeOrigin, 2) || !Array.isArray(beat.globeDestinations) || beat.globeDestinations.length < 2) {
        errors.push(`${label}: globeOrigin et globeDestinations (>=2) requis`);
      }
      break;
    case 'editorial_evidence_board':
      if (!Array.isArray(beat.fanCards) || beat.fanCards.length < 3) {
        errors.push(`${label}: au moins 3 fanCards requis`);
      }
      break;
  }

  return errors;
}

/**
 * Validates a full generated Short plan:
 * - 7 or 8 beats ending on channel_end_cta
 * - ZERO duplicate visualType across beats 1..N-1
 * - Both split and fullscreen layouts represented (re-hook mid-short)
 * - Valid payloads for every beat, total spoken length in sweet spot (~80–155 words)
 */
export function validateFullShortPlan(
  plan: { hookText?: string; hookVariants?: string[]; beats?: BatchBeatSpec[] },
  options: { isDevTopic: boolean }
): ShortPlanValidationResult {
  const errors: string[] = [];
  const beats = Array.isArray(plan.beats) ? plan.beats : [];

  if (beats.length < 7 || beats.length > 8) {
    errors.push(`Le plan doit contenir 7 ou 8 beats (reçu: ${beats.length})`);
    return { valid: false, errors };
  }

  const totalWords = beats
    .map((b) => String(b.spokenLine || '').split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);

  if (totalWords < 75 || totalWords > 165) {
    errors.push(`Longueur orale hors cible (${totalWords} mots, cible 85-150 mots)`);
  }

  const seenPrimitives = new Set<string>();
  let fullscreenCount = 0;
  let splitCount = 0;

  beats.forEach((beat, idx) => {
    const beatErrors = validateBeatPayload(beat, idx, beats.length, options);
    errors.push(...beatErrors);

    if (idx < beats.length - 1) {
      if (seenPrimitives.has(beat.visualType)) {
        errors.push(`Doublon interdit de primitive "${beat.visualType}" au beat ${idx + 1}`);
      }
      seenPrimitives.add(beat.visualType);
    }

    if (beat.layoutHint === 'fullscreen') fullscreenCount += 1;
    else splitCount += 1;
  });

  if (fullscreenCount < 1 || splitCount < 2) {
    errors.push(
      `Variété géométrique insuffisante (${splitCount} split, ${fullscreenCount} fullscreen — au moins 1 fullscreen et 2 split requis)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
