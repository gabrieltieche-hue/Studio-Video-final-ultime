import type { LookId, MusicBedId } from '../data/shortSpec';
import type { SocialPlatform } from './social';

export type BatchSourceMode = 'csv' | 'research' | 'custom';

export type BatchItemStep =
  | 'queued'
  | 'scripting'
  | 'voiceover'
  | 'rendering'
  | 'scheduling'
  | 'done'
  | 'error'
  | 'cancelled';

/**
 * 22 universal domain-agnostic Melvynx visual primitives + end CTA.
 */
export type UniversalPrimitiveType =
  | 'metric_shock_hook'
  | 'dot_population_scale'
  | 'paper_receipt_payslip'
  | 'countdown_calendar_stamp'
  | 'balance_scale_duel'
  | 'trap_barrier_alert'
  | 'hydraulic_compressor'
  | 'scrolling_checklist_spotlight'
  | 'radial_mindmap_hub'
  | 'audit_table_detector'
  | 'profile_objection_deck'
  | 'notification_explosion_stamp'
  | 'segmented_quota_slider'
  | 'hand_drawn_marker_highlight'
  | 'before_after_morph'
  | 'animated_data_chart'
  | 'split_comparison_window'
  | 'process_pipeline'
  | 'terminal_chat_window'
  | 'rotary_control_deck'
  | 'globe_network_flow'
  | 'editorial_evidence_board'
  | 'channel_end_cta';

/**
 * Legacy type names kept strictly as TypeScript union aliases so pre-existing saved projects
 * continue loading cleanly and map automatically onto UniversalPrimitiveType at render time.
 */
export type LegacyVisualType =
  | 'massive_dot_matrix_zoom'
  | 'avatar_crowd_highlight'
  | 'confidential_vault_slam'
  | 'paywall_shock_stack'
  | 'chat_prompt_refusal_cascade'
  | 'neural_shield_abliteration'
  | 'night_shift_multi_agent_laptop'
  | 'claude_code_slash_cli'
  | 'rotary_mixing_knobs'
  | 'code_and_live_preview_split'
  | 'github_repo_star_rocket'
  | 'article_highlighter_zoom'
  | 'pixel_diff_clone_loop'
  | 'github_heatmap_and_runs'
  | 'social_feed_waterfall'
  | 'conveyor_belt_cleaner'
  | 'red_strike_live_rewrite'
  | 'ugly_to_apple_ui_morph'
  | 'retro_crt_1995_parallel'
  | 'physical_cable_app_plug'
  | 'metallic_toolbox_explode'
  | 'card_fan_explosion_10x'
  | 'ab_hook_leaderboard'
  | 'cloud_vs_offline_shield'
  | 'voice_shortcut_waveform'
  | 'hook_shatter'
  | 'hook_stat'
  | 'hook_alert'
  | 'hook_versus'
  | 'hook_question'
  | 'dot_matrix_zoom'
  | 'neural_scan'
  | 'dual_stopwatch'
  | 'rotary_console'
  | 'pixel_diff'
  | 'humanizer_belt'
  | 'headline_news'
  | 'counter_flip'
  | 'comparison_bars'
  | 'chart_curve'
  | 'source_quote'
  | 'ui_window'
  | 'timeline_steps'
  | 'toggles_switch'
  | 'terminal_flow'
  | 'key_points'
  | 'myth_vs_fact'
  | 'alert_rule'
  | 'checklist_audit'
  | 'gauge'
  | 'cta_card';

export type DynamicVisualType = UniversalPrimitiveType | LegacyVisualType;

export type BrandLogoId =
  | 'claude'
  | 'openai'
  | 'deepseek'
  | 'github'
  | 'instagram'
  | 'tiktok'
  | 'apple'
  | 'x'
  | 'google'
  | 'youtube'
  | 'chrome'
  | 'ai';

export type DynamicIconKind =
  | 'ai'
  | 'calendar'
  | 'chart'
  | 'clock'
  | 'euro'
  | 'law'
  | 'lock'
  | 'rocket'
  | 'terminal'
  | 'phone'
  | 'shield'
  | 'bank'
  | 'alert'
  | 'scale'
  | 'users';

export interface ReceiptLineItem {
  label: string;
  amount: string;
  highlight?: boolean;
  tone?: 'neutral' | 'negative' | 'positive';
}

export interface AuditTableRow {
  label: string;
  detail: string;
  status: 'alert' | 'ok' | 'removed';
  badge: string;
}

export interface ProfileCardItem {
  name: string;
  role: string;
  metric: string;
  quote: string;
}

export interface MindmapNodeItem {
  label: string;
  detail?: string;
}

export interface BatchBeatSpec {
  id: string;
  title: string;
  highlightWord?: string;
  strikeWord?: string;
  shortLabel: string;
  screenLabel: string;
  spokenLine: string;
  visualType: DynamicVisualType;
  layoutHint?: 'split' | 'fullscreen';
  brollKey?: string;
  subBrollKeys?: string[];
  subBrollUrls?: string[];
  brollCaption?: string;
  visualQuery?: string;
  iconKind?: DynamicIconKind;
  brandLogo?: BrandLogoId;
  notoIcon?: string;

  // Parameterized payloads for the 22 universal primitives
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
  dateBadge?: string;
  sourceLabel?: string;
  quoteText?: string;
  quoteHighlight?: string;
  uiUrl?: string;
  uiActionLabel?: string;
  chartUnit?: string;
  chartPoints?: Array<{ label: string; value: number; highlight?: boolean }>;
  leftCard?: { label: string; value: string; sub: string };
  rightCard?: { label: string; value: string; sub: string };
  subStats?: Array<{ value: string; label: string }>;
  bullets?: string[];
  steps?: string[];
  toggles?: Array<{ label: string; before: string; after: string; activeAfter: boolean }>;
  terminalCmd?: string;
  terminalOut?: string[];
  comparisonLeft?: { label: string; value: string; ratio: number };
  comparisonRight?: { label: string; value: string; ratio: number };
  multiplierBadge?: string;
  gaugePct?: number;
  matrixHighlightPct?: number;
  matrixTotalDots?: number;
  matrixCalloutLabel?: string;
  dialKnobs?: Array<{ label: string; value: number; unit?: string; active?: boolean }>;
  diffBeforeLines?: string[];
  diffAfterLines?: string[];
  diffScore?: number;
  newsPublication?: string;
  newsHeadline?: string;
  newsHighlightPhrase?: string;
  newsYears?: [string, string];
  neuralLayers?: string[];
  neuralEquation?: string;
  codeLines?: string[];
  repoName?: string;
  repoStars?: string;
  authorName?: string;
  slashCommands?: string[];
  heatCells?: number[];
  hookVariantsList?: Array<{ hook: string; retention: string }>;
  fanCards?: Array<{ tag: string; metric: string; label: string }>;
  toolboxTools?: string[];
  cableAppLabel?: string;
  crtYear?: string;
  crtMetric?: string;
  beforeBadText?: string;
  afterGoodText?: string;

  // Extended clean typed payloads for tactile Melvynx metaphors
  receiptItems?: ReceiptLineItem[];
  receiptTotalLabel?: string;
  receiptTotalValue?: string;
  calendarMonth?: string;
  calendarYear?: string;
  calendarDaysMarked?: number[];
  calendarHighlightDay?: number;
  calendarNote?: string;
  scaleTilt?: 'left' | 'right' | 'balanced';
  barrierBadge?: string;
  barrierRuleText?: string;
  compressorFrom?: string;
  compressorTo?: string;
  compressorUnitLabel?: string;
  mindmapCenter?: string;
  mindmapNodes?: MindmapNodeItem[];
  auditRows?: AuditTableRow[];
  profileCards?: ProfileCardItem[];
  notifCount?: string;
  notifItems?: Array<{ sender: string; message: string; time?: string }>;
  quotaActualLabel?: string;
  quotaPlannedLabel?: string;
  quotaBars?: Array<{ label: string; pct: number }>;
  globeOrigin?: string;
  globeDestinations?: Array<{ label: string; value: string }>;

  sfxKind?:
    | 'glass-shatter'
    | 'impact-boom'
    | 'zhhh'
    | 'whoosh'
    | 'riser'
    | 'pop-back'
    | 'thud'
    | 'stamp'
    | 'tap'
    | 'click'
    | 'tick'
    | 'pop'
    | 'bell';
}

export interface ParsedCustomTopic {
  category: string;
  theme: string;
  angle: string;
}

export interface BatchAutoScheduleConfig {
  enabled: boolean;
  platforms: SocialPlatform[];
  startAtIso: string;
  intervalHours: number;
  privacy: 'public' | 'unlisted' | 'private';
}

export interface StartBatchRequest {
  sourceMode: BatchSourceMode;
  topicIds?: string[];
  customTopics?: string[];
  count?: number;
  focus?: string;
  lookId: LookId;
  musicTrack: MusicBedId;
  speed: number;
  renderMp4: boolean;
  autoSchedule?: BatchAutoScheduleConfig;
}

export interface BatchJobItem {
  index: number;
  topicId?: string;
  category: string;
  theme: string;
  angle?: string;
  hookHint?: string;
  sources?: string;
  step: BatchItemStep;
  progress: number;
  projectId?: string;
  projectSlug?: string;
  version?: string;
  duration?: number;
  beatsCount?: number;
  outputMp4Url?: string;
  thumbnailUrl?: string;
  scheduledCount?: number;
  scheduledAt?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BatchJobRecord {
  id: string;
  status: 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';
  sourceMode: BatchSourceMode;
  lookId: LookId;
  musicTrack: MusicBedId;
  speed: number;
  renderMp4: boolean;
  autoSchedule?: BatchAutoScheduleConfig;
  currentStepLabel: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  items: BatchJobItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
