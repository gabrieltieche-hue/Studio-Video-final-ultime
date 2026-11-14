export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export type PublishRoute = 'oauth' | 'treg' | 'manual';

export type ScheduledPostStatus =
  | 'scheduled'
  | 'preparing'
  | 'publishing'
  | 'awaiting_manual'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface SocialAccountConfig {
  platform: SocialPlatform;
  label: string;
  connected: boolean;
  route: PublishRoute;
  fallbackToManual: boolean;
  accountName?: string;
  accountHandle?: string;
  accountId?: string;
  avatarUrl?: string;
  scopes?: string[];
  oauthConfigured: boolean;
  hasCustomClientCredentials?: boolean;
  tregConnected?: boolean;
  tregConnectionId?: string;
  igUserId?: string;
  tokenExpiresAt?: string;
  connectedAt?: string;
  lastError?: string;
  defaultPrivacy: 'public' | 'unlisted' | 'private';
}

export interface SocialAccountSecretRecord {
  platform: SocialPlatform;
  route: PublishRoute;
  fallbackToManual: boolean;
  connected: boolean;
  accountName?: string;
  accountHandle?: string;
  accountId?: string;
  avatarUrl?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  igPageId?: string;
  igUserId?: string;
  tregConnectionId?: string;
  tregResourceRef?: string;
  connectedAt?: string;
  lastError?: string;
  defaultPrivacy: 'public' | 'unlisted' | 'private';
}

export interface TregConnectionSummary {
  id: string;
  provider: string;
  platform?: SocialPlatform;
  name?: string;
  status?: string;
  resourceRef?: string;
}

export interface TregSessionPublic {
  loggedIn: boolean;
  email?: string;
  activeOrg?: string;
  cliInstalled: boolean;
  cliVersion?: string;
  connectedPlatforms: SocialPlatform[];
  connections: TregConnectionSummary[];
}

export interface HostingDiagnostics {
  environment: 'ai_studio_preview' | 'railway' | 'render' | 'fly' | 'custom_server';
  isAlwaysOn: boolean;
  appUrl: string;
  storageDir: string;
  elevenLabsConfigured: boolean;
  cronEndpoint: string;
}

export interface ChannelBrandingKit {
  brandName: string;
  handle: string;
  tagline: string;
  youtubeDescription: string;
  instagramBio: string;
  tiktokBio: string;
  avatarUrl: string;
  bannerUrl: string;
  updatedAt: string;
}

export interface LiveChannelProfileSnapshot {
  platform: SocialPlatform;
  connected: boolean;
  liveName?: string;
  liveHandle?: string;
  liveBio?: string;
  liveAvatarUrl?: string;
  followersCount?: number;
  mediaCount?: number;
  canAutoUpdateViaApi: boolean;
  apiNote: string;
  editProfileUrl: string;
}

export interface SocialCopyPack {
  youtubeTitle: string;
  youtubeDescription: string;
  caption: string;
  tiktokCaption: string;
  hashtags: string[];
  coverTimestampSec: number;
  generatedBy: 'gemini' | 'template';
}

export interface PreparedMediaAssets {
  projectId: string;
  version: string;
  masterMp4Path?: string;
  masterSizeMb?: number;
  socialMp4Url?: string;
  socialMp4Path?: string;
  socialSizeMb?: number;
  coverUrl?: string;
  coverPath?: string;
  postMdUrl?: string;
  durationSec: number;
  width: number;
  height: number;
  preparedAt: string;
}

export interface ScheduledPostItem {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  version: string;
  platform: SocialPlatform;
  route: PublishRoute;
  fallbackToManual: boolean;
  status: ScheduledPostStatus;
  scheduledAt: string; // ISO UTC
  timezone: string;
  youtubeTitle: string;
  youtubeDescription: string;
  caption: string;
  tiktokCaption: string;
  hashtags: string[];
  coverTimestampSec: number;
  privacy: 'public' | 'unlisted' | 'private';
  socialMp4Url?: string;
  coverUrl?: string;
  publishedUrl?: string;
  externalPostId?: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  publishedAt?: string;
  errorMessage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishLogEntry {
  id: string;
  jobId: string;
  projectTitle: string;
  platform: SocialPlatform;
  route: PublishRoute;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface SchedulerState {
  enabled: boolean;
  intervalSeconds: number;
  running: boolean;
  lastTickAt?: string;
  nextTickAt?: string;
  totalTicks: number;
  totalPublished: number;
}
