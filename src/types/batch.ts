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

export type DynamicVisualType =
  | 'hook_shatter'
  | 'hook_stat'
  | 'counter_flip'
  | 'comparison_bars'
  | 'timeline_steps'
  | 'toggles_switch'
  | 'terminal_flow'
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
  | 'phone';

export interface BatchBeatSpec {
  id: string;
  title: string;
  shortLabel: string;
  screenLabel: string;
  spokenLine: string;
  visualType: DynamicVisualType;
  layoutHint?: 'split' | 'fullscreen';
  brollKey?: string;
  brollCaption?: string;
  iconKind?: DynamicIconKind;
  stampWord?: string;
  statValue?: string;
  statLabel?: string;
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
