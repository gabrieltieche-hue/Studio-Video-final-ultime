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

export type StoryBlueprintId =
  | 'shock_mechanism'
  | 'versus_debate'
  | 'chronology_actu'
  | 'myth_buster'
  | 'deep_dive_playbook';

export type DynamicVisualType =
  | 'hook_shatter'
  | 'hook_stat'
  | 'hook_vs_battle'
  | 'hook_myth_bust'
  | 'hook_alert_card'
  | 'counter_flip'
  | 'comparison_bars'
  | 'timeline_steps'
  | 'toggles_switch'
  | 'terminal_flow'
  | 'ledger_breakdown'
  | 'verdict_quote'
  | 'radar_pillars'
  | 'checklist_action'
  | 'key_points'
  | 'gauge'
  | 'cta_card';

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
  | 'warning';

export interface BatchBeatSpec {
  id: string;
  title: string;
  shortLabel: string;
  screenLabel: string;
  spokenLine: string;
  visualType: DynamicVisualType;
  blueprintId?: StoryBlueprintId;
  beatRole?: 'hook' | 'context' | 'mechanism' | 'rehook' | 'proof' | 'action' | 'payoff' | 'cta';
  layoutHint?: 'split' | 'fullscreen';
  brollKey?: string;
  brollCaption?: string;
  iconKind?: DynamicIconKind;
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
  hookCards?: Array<{ label: string; sub: string; iconKind?: DynamicIconKind; tone?: 'dark' | 'light' | 'accent' }>;
  subStats?: Array<{ value: string; label: string }>;
  bullets?: string[];
  steps?: string[];
  toggles?: Array<{ label: string; before: string; after: string; activeAfter: boolean }>;
  ledgerRows?: Array<{ label: string; value: string; delta?: string; highlight?: boolean }>;
  quoteText?: string;
  highlightPhrase?: string;
  quoteSource?: string;
  terminalCmd?: string;
  terminalOut?: string[];
  comparisonLeft?: { label: string; value: string; ratio: number };
  comparisonRight?: { label: string; value: string; ratio: number };
  multiplierBadge?: string;
  gaugePct?: number;
  sfxKind?: 'glass-shatter' | 'impact-boom' | 'zhhh' | 'riser' | 'pop-back' | 'thud' | 'tap' | 'pop' | 'bell';
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
  blueprintId?: StoryBlueprintId;
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
