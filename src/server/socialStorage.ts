import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STORAGE_DIR, initStorage } from './storageManager';
import type {
  ChannelBrandingKit,
  PublishLogEntry,
  ScheduledPostItem,
  SchedulerState,
  SocialAccountConfig,
  SocialAccountSecretRecord,
  SocialPlatform,
} from '../types/social';
import { PLATFORM_META } from '../engine/socialCopy';

export const SOCIAL_DIR = path.join(STORAGE_DIR, 'social');
export const SOCIAL_PACKS_DIR = path.join(SOCIAL_DIR, 'packs');
export const SOCIAL_ACCOUNTS_FILE = path.join(SOCIAL_DIR, 'accounts.json');
export const SOCIAL_QUEUE_FILE = path.join(SOCIAL_DIR, 'queue.json');
export const SOCIAL_LOGS_FILE = path.join(SOCIAL_DIR, 'logs.json');
export const SOCIAL_SCHEDULER_FILE = path.join(SOCIAL_DIR, 'scheduler.json');
export const SOCIAL_MEDIA_TOKENS_FILE = path.join(SOCIAL_DIR, 'media-tokens.json');
export const SOCIAL_BRANDING_FILE = path.join(SOCIAL_DIR, 'branding.json');

export function initSocialStorage(): void {
  initStorage();
  for (const dir of [SOCIAL_DIR, SOCIAL_PACKS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getOAuthClientCredentials(platform: SocialPlatform): {
  clientId: string;
  clientSecret: string;
  source: 'env' | 'custom' | 'none';
} {
  if (platform === 'youtube') {
    const envId = (
      process.env.YOUTUBE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
    ).trim();
    const envSecret = (
      process.env.YOUTUBE_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      ''
    ).trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret, source: 'env' };
    }
  } else if (platform === 'instagram') {
    const envId = (
      process.env.INSTAGRAM_CLIENT_ID ||
      process.env.META_APP_ID ||
      ''
    ).trim();
    const envSecret = (
      process.env.INSTAGRAM_CLIENT_SECRET ||
      process.env.META_APP_SECRET ||
      ''
    ).trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret, source: 'env' };
    }
  } else {
    const envId = (process.env.TIKTOK_CLIENT_KEY || '').trim();
    const envSecret = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret, source: 'env' };
    }
  }

  if (fs.existsSync(SOCIAL_ACCOUNTS_FILE)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(SOCIAL_ACCOUNTS_FILE, 'utf-8')
      ) as Partial<Record<SocialPlatform, SocialAccountSecretRecord>>;
      const rec = parsed[platform];
      if (rec?.clientId?.trim() && rec?.clientSecret?.trim()) {
        return {
          clientId: rec.clientId.trim(),
          clientSecret: rec.clientSecret.trim(),
          source: 'custom',
        };
      }
    } catch {
      // ignore malformed accounts file
    }
  }

  return { clientId: '', clientSecret: '', source: 'none' };
}

export function isPlatformOAuthConfigured(platform: SocialPlatform): boolean {
  const creds = getOAuthClientCredentials(platform);
  return Boolean(creds.clientId && creds.clientSecret);
}

function defaultAccountRecord(platform: SocialPlatform): SocialAccountSecretRecord {
  return {
    platform,
    route: isPlatformOAuthConfigured(platform) ? 'oauth' : 'manual',
    fallbackToManual: true,
    connected: false,
    defaultPrivacy: 'public',
  };
}

export function getRawSocialAccounts(): Record<SocialPlatform, SocialAccountSecretRecord> {
  initSocialStorage();
  const base: Record<SocialPlatform, SocialAccountSecretRecord> = {
    youtube: defaultAccountRecord('youtube'),
    instagram: defaultAccountRecord('instagram'),
    tiktok: defaultAccountRecord('tiktok'),
  };
  if (fs.existsSync(SOCIAL_ACCOUNTS_FILE)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(SOCIAL_ACCOUNTS_FILE, 'utf-8')
      ) as Partial<Record<SocialPlatform, SocialAccountSecretRecord>>;
      (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).forEach((platform) => {
        if (parsed[platform]) {
          base[platform] = { ...base[platform], ...parsed[platform], platform };
        }
      });
    } catch {
      // keep defaults
    }
  }
  return base;
}

export function saveRawSocialAccount(
  platform: SocialPlatform,
  patch: Partial<SocialAccountSecretRecord>
): SocialAccountSecretRecord {
  const all = getRawSocialAccounts();
  all[platform] = {
    ...all[platform],
    ...patch,
    platform,
  };
  fs.writeFileSync(SOCIAL_ACCOUNTS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  return all[platform];
}

export function toPublicAccountConfig(
  rec: SocialAccountSecretRecord,
  tregConnectedPlatforms: Set<SocialPlatform> = new Set()
): SocialAccountConfig {
  const tregOk = tregConnectedPlatforms.has(rec.platform);
  return {
    platform: rec.platform,
    label: PLATFORM_META[rec.platform].name,
    connected: Boolean(rec.connected || (rec.route === 'treg' && tregOk)),
    route: rec.route,
    fallbackToManual: rec.fallbackToManual,
    accountName: rec.accountName,
    accountHandle: rec.accountHandle,
    accountId: rec.accountId,
    avatarUrl: rec.avatarUrl,
    scopes: rec.scopes,
    oauthConfigured: isPlatformOAuthConfigured(rec.platform),
    hasCustomClientCredentials: Boolean(rec.clientId && rec.clientSecret),
    tregConnected: tregOk,
    tregConnectionId: rec.tregConnectionId,
    igUserId: rec.igUserId,
    tokenExpiresAt: rec.tokenExpiresAt,
    connectedAt: rec.connectedAt,
    lastError: rec.lastError,
    defaultPrivacy: rec.defaultPrivacy || 'public',
  };
}

export function getScheduledQueue(): ScheduledPostItem[] {
  initSocialStorage();
  if (!fs.existsSync(SOCIAL_QUEUE_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(SOCIAL_QUEUE_FILE, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as ScheduledPostItem[]) : [];
  } catch {
    return [];
  }
}

export function saveScheduledQueue(items: ScheduledPostItem[]): void {
  initSocialStorage();
  fs.writeFileSync(SOCIAL_QUEUE_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function upsertScheduledPost(item: ScheduledPostItem): ScheduledPostItem {
  const queue = getScheduledQueue();
  const idx = queue.findIndex((q) => q.id === item.id);
  const nextItem = { ...item, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    queue[idx] = nextItem;
  } else {
    queue.unshift(nextItem);
  }
  saveScheduledQueue(queue);
  return nextItem;
}

export function getScheduledPost(id: string): ScheduledPostItem | null {
  return getScheduledQueue().find((q) => q.id === id) || null;
}

export function deleteScheduledPost(id: string): boolean {
  const queue = getScheduledQueue();
  const next = queue.filter((q) => q.id !== id);
  if (next.length === queue.length) return false;
  saveScheduledQueue(next);
  return true;
}

export function getPublishLogs(limit = 80): PublishLogEntry[] {
  initSocialStorage();
  if (!fs.existsSync(SOCIAL_LOGS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(SOCIAL_LOGS_FILE, 'utf-8'));
    const arr = Array.isArray(parsed) ? (parsed as PublishLogEntry[]) : [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
}

export function appendPublishLog(entry: Omit<PublishLogEntry, 'id' | 'timestamp'>): PublishLogEntry {
  initSocialStorage();
  const logs = getPublishLogs(200);
  const full: PublishLogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(full);
  fs.writeFileSync(SOCIAL_LOGS_FILE, JSON.stringify(logs.slice(0, 200), null, 2), 'utf-8');
  return full;
}

export function getSchedulerState(): SchedulerState {
  initSocialStorage();
  const defaults: SchedulerState = {
    enabled: true,
    intervalSeconds: 15,
    running: false,
    totalTicks: 0,
    totalPublished: 0,
  };
  if (!fs.existsSync(SOCIAL_SCHEDULER_FILE)) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SOCIAL_SCHEDULER_FILE, 'utf-8')) as Partial<SchedulerState>;
    return {
      ...defaults,
      ...parsed,
      running: false,
    };
  } catch {
    return defaults;
  }
}

export function saveSchedulerState(patch: Partial<SchedulerState>): SchedulerState {
  const current = getSchedulerState();
  const next: SchedulerState = {
    ...current,
    ...patch,
  };
  fs.writeFileSync(SOCIAL_SCHEDULER_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

interface MediaTokenRecord {
  token: string;
  dirPath: string;
  expiresAt: number;
}

export function issuePublicMediaToken(dirPath: string, ttlHours = 24): string {
  initSocialStorage();
  let tokens: Record<string, MediaTokenRecord> = {};
  if (fs.existsSync(SOCIAL_MEDIA_TOKENS_FILE)) {
    try {
      tokens = JSON.parse(fs.readFileSync(SOCIAL_MEDIA_TOKENS_FILE, 'utf-8')) as Record<
        string,
        MediaTokenRecord
      >;
    } catch {
      tokens = {};
    }
  }
  const now = Date.now();
  for (const [k, v] of Object.entries(tokens)) {
    if (v.expiresAt < now) delete tokens[k];
  }
  const token = crypto.randomBytes(18).toString('hex');
  tokens[token] = {
    token,
    dirPath,
    expiresAt: now + ttlHours * 3600 * 1000,
  };
  fs.writeFileSync(SOCIAL_MEDIA_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  return token;
}

export function resolvePublicMediaDir(token: string): string | null {
  if (!/^[a-f0-9]{20,64}$/.test(token)) return null;
  if (!fs.existsSync(SOCIAL_MEDIA_TOKENS_FILE)) return null;
  try {
    const tokens = JSON.parse(fs.readFileSync(SOCIAL_MEDIA_TOKENS_FILE, 'utf-8')) as Record<
      string,
      MediaTokenRecord
    >;
    const rec = tokens[token];
    if (!rec || rec.expiresAt < Date.now()) return null;
    return rec.dirPath;
  } catch {
    return null;
  }
}

export function getDefaultBrandingKit(): ChannelBrandingKit {
  return {
    brandName: 'Alex Décode',
    handle: '@alex.decode',
    tagline: 'Tech, IA & Décryptages · 1 Short clair par jour',
    youtubeDescription:
      'Décryptages Tech, IA, lois numériques et écrans en moins de 60 secondes.\n\nChaque semaine, un sujet d’actualité décortiqué avec chiffres sourcés et visuels clairs — sans jargon ni sensationnalisme.\n\nAbonne-toi et active la cloche pour ne rater aucun épisode.\nChaîne sœur : @alex.decode',
    instagramBio:
      'Décryptages Tech, IA & Société en 60s ⚡\nCe que les algorithmes ne te montrent pas.\n👇 Dernier épisode',
    tiktokBio: 'Tech, IA & Décryptages en 60s ⚡ Le numérique sans jargon.',
    avatarUrl: '/brand/avatar-alex-decode.jpg',
    bannerUrl: '/brand/banner-youtube-alex-decode.jpg',
    updatedAt: new Date().toISOString(),
  };
}

export function getChannelBrandingKit(): ChannelBrandingKit {
  initSocialStorage();
  const defaults = getDefaultBrandingKit();
  if (!fs.existsSync(SOCIAL_BRANDING_FILE)) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(SOCIAL_BRANDING_FILE, 'utf-8')
    ) as Partial<ChannelBrandingKit>;
    return {
      ...defaults,
      ...parsed,
      tiktokBio: (parsed.tiktokBio || defaults.tiktokBio).slice(0, 80),
      instagramBio: (parsed.instagramBio || defaults.instagramBio).slice(0, 150),
      youtubeDescription: (parsed.youtubeDescription || defaults.youtubeDescription).slice(0, 1000),
    };
  } catch {
    return defaults;
  }
}

export function saveChannelBrandingKit(
  patch: Partial<ChannelBrandingKit>
): ChannelBrandingKit {
  const current = getChannelBrandingKit();
  const next: ChannelBrandingKit = {
    ...current,
    ...(typeof patch.brandName === 'string' && patch.brandName.trim()
      ? { brandName: patch.brandName.trim().slice(0, 50) }
      : {}),
    ...(typeof patch.handle === 'string' && patch.handle.trim()
      ? {
          handle: patch.handle.trim().startsWith('@')
            ? patch.handle.trim().slice(0, 35)
            : `@${patch.handle.trim().slice(0, 34)}`,
        }
      : {}),
    ...(typeof patch.tagline === 'string'
      ? { tagline: patch.tagline.trim().slice(0, 120) }
      : {}),
    ...(typeof patch.youtubeDescription === 'string'
      ? { youtubeDescription: patch.youtubeDescription.trim().slice(0, 1000) }
      : {}),
    ...(typeof patch.instagramBio === 'string'
      ? { instagramBio: patch.instagramBio.trim().slice(0, 150) }
      : {}),
    ...(typeof patch.tiktokBio === 'string'
      ? { tiktokBio: patch.tiktokBio.trim().slice(0, 80) }
      : {}),
    ...(typeof patch.avatarUrl === 'string' && patch.avatarUrl.trim()
      ? { avatarUrl: patch.avatarUrl.trim() }
      : {}),
    ...(typeof patch.bannerUrl === 'string' && patch.bannerUrl.trim()
      ? { bannerUrl: patch.bannerUrl.trim() }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SOCIAL_BRANDING_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function buildRailwayEnvBlock(params: {
  tregToken?: string;
  tregOrg?: string;
  includeTregToken?: boolean;
  cronSecret?: string;
  elevenLabsConfigured?: boolean;
  geminiConfigured?: boolean;
}): string {
  const lines = [
    'NODE_ENV=production',
    'PORT=3000',
    'STORAGE_DIR=/app/storage',
    'ALWAYS_ON_SERVER=true',
    '',
    '# Clés IA (à copier depuis votre panneau Secrets AI Studio / ElevenLabs)',
    `ELEVENLABS_API_KEY=${params.elevenLabsConfigured ? '<COLLEZ_VOTRE_CLE_ELEVENLABS_ICI>' : '<VOTRE_CLE_ELEVENLABS>'}`,
    `GEMINI_API_KEY=${params.geminiConfigured ? '<COLLEZ_VOTRE_CLE_GEMINI_ICI>' : '<VOTRE_CLE_GEMINI>'}`,
    '',
    '# Session Treg (YouTube + Instagram + TikTok déjà connectés)',
  ];

  if (params.includeTregToken && params.tregToken) {
    lines.push(`TREG_TOKEN=${params.tregToken}`);
  } else {
    lines.push('TREG_TOKEN=<COCHEZ_INCLURE_SESSION_OU_CONNECTEZ_SUR_RAILWAY>');
  }
  lines.push(`TREG_ORG=${params.tregOrg || ''}`);

  if (params.cronSecret) {
    lines.push('', `CRON_SECRET=${params.cronSecret}`);
  }
  return lines.join('\n');
}
