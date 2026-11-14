import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { GoogleGenAI, Type } from '@google/genai';
import {
  RENDERS_DIR,
  ROOT_DIR,
  STORAGE_DIR,
  TAKES_DIR,
  getProject,
} from './storageManager';
import {
  SOCIAL_PACKS_DIR,
  appendPublishLog,
  getOAuthClientCredentials,
  getRawSocialAccounts,
  getScheduledPost,
  getScheduledQueue,
  getSchedulerState,
  initSocialStorage,
  isPlatformOAuthConfigured,
  issuePublicMediaToken,
  saveRawSocialAccount,
  saveSchedulerState,
  upsertScheduledPost,
} from './socialStorage';
import {
  getTregSessionPublic,
  publishViaTregHttp,
  readTregSession,
} from './tregClient';
import {
  PLATFORM_META,
  buildTemplateSocialCopy,
  formatPublishedMarkdownLine,
  isJobDue,
  sanitizeHashtags,
  truncateForYouTubeTitle,
} from '../engine/socialCopy';
import type { ShortProject } from '../types/studio';
import type {
  HostingDiagnostics,
  PreparedMediaAssets,
  PublishRoute,
  ScheduledPostItem,
  SocialAccountSecretRecord,
  SocialCopyPack,
  SocialPlatform,
} from '../types/social';
import { probeVideo } from './ffmpegEngine';

interface PendingOAuthState {
  platform: SocialPlatform;
  codeVerifier?: string;
  redirectUri: string;
  createdAt: number;
}

const pendingOAuthStates = new Map<string, PendingOAuthState>();
let schedulerTimer: NodeJS.Timeout | null = null;
let tickInProgress = false;

export function getPublicAppBaseUrl(requestOrigin?: string): string {
  const candidates = [
    process.env.PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : '',
    process.env.RENDER_EXTERNAL_URL,
    process.env.FLY_APP_NAME ? `https://${process.env.FLY_APP_NAME}.fly.dev` : '',
    process.env.APP_URL,
  ];
  for (const raw of candidates) {
    const clean = (raw || '').trim().replace(/\/+$/, '');
    if (clean && !clean.includes('MY_APP_URL')) {
      return clean;
    }
  }
  if (requestOrigin && /^https?:\/\//i.test(requestOrigin)) {
    return requestOrigin.replace(/\/+$/, '');
  }
  const port = Number(process.env.PORT) || 3000;
  return `http://localhost:${port}`;
}

export function getOAuthCallbackUrl(
  platform: SocialPlatform,
  requestOrigin?: string
): string {
  return `${getPublicAppBaseUrl(requestOrigin)}/api/social/oauth/${platform}/callback`;
}

export function getHostingDiagnostics(requestOrigin?: string): HostingDiagnostics {
  const appUrl = getPublicAppBaseUrl(requestOrigin);
  let environment: HostingDiagnostics['environment'] = 'custom_server';
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN) {
    environment = 'railway';
  } else if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL) {
    environment = 'render';
  } else if (process.env.FLY_APP_NAME) {
    environment = 'fly';
  } else if (appUrl.includes('ais-dev-') || appUrl.includes('ais-pre-')) {
    environment = 'ai_studio_preview';
  }

  const isAlwaysOn =
    process.env.ALWAYS_ON_SERVER === 'true' ||
    environment === 'railway' ||
    environment === 'render' ||
    environment === 'fly' ||
    (environment === 'custom_server' && !appUrl.startsWith('http://localhost'));

  return {
    environment,
    isAlwaysOn,
    appUrl,
    storageDir: STORAGE_DIR,
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    cronEndpoint: `${appUrl}/api/social/cron-tick`,
  };
}

export function resolveProjectMasterMp4(
  project: ShortProject,
  version?: string
): string | null {
  const targetVer = version || project.currentVersion || 'v1';
  const verObj = (project.versions || []).find((v) => v.version === targetVer);
  const candidates: string[] = [];

  if (verObj?.outputMp4) {
    if (verObj.outputMp4.startsWith('/video/')) {
      candidates.push(path.join(ROOT_DIR, 'public', verObj.outputMp4));
    } else if (verObj.outputMp4.startsWith('/renders/')) {
      candidates.push(path.join(RENDERS_DIR, path.basename(verObj.outputMp4)));
    } else if (verObj.outputMp4.startsWith('/takes/')) {
      candidates.push(path.join(TAKES_DIR, path.basename(verObj.outputMp4)));
    }
  }
  candidates.push(path.join(RENDERS_DIR, `${project.slug}_${targetVer}.mp4`));
  candidates.push(path.join(RENDERS_DIR, `${project.slug}_${targetVer}_draft.mp4`));
  if (project.sourceVideoName) {
    candidates.push(path.join(TAKES_DIR, project.sourceVideoName));
  }
  if (project.isFlagshipReactStage) {
    candidates.push(path.join(ROOT_DIR, 'public/video/short-interdiction-15-ans.mp4'));
  }

  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).size > 1024) {
      return p;
    }
  }
  return null;
}

export function getPackDirectory(projectId: string, version: string): string {
  const safeProj = projectId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeVer = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(SOCIAL_PACKS_DIR, safeProj, safeVer);
}

export function prepareMediaPackForProject(
  project: ShortProject,
  options?: {
    version?: string;
    coverTimestampSec?: number;
    copy?: Partial<SocialCopyPack>;
    forceReencode?: boolean;
  }
): PreparedMediaAssets {
  initSocialStorage();
  const version = options?.version || project.currentVersion || 'v1';
  const packDir = getPackDirectory(project.id, version);
  fs.mkdirSync(packDir, { recursive: true });

  const masterPath = resolveProjectMasterMp4(project, version);
  const socialMp4Path = path.join(packDir, 'social.mp4');
  const coverPath = path.join(packDir, 'cover.jpg');
  const postMdPath = path.join(packDir, 'post.md');

  const coverTs = Math.max(
    0.1,
    Math.min(
      Math.max(1, project.duration - 0.5),
      Number(options?.coverTimestampSec ?? (project.isFlagshipReactStage ? 1.4 : 0.8))
    )
  );

  let durationSec = project.duration || 45;
  let width = 1080;
  let height = 1920;
  let masterSizeMb: number | undefined;
  let socialSizeMb: number | undefined;

  if (masterPath) {
    const stat = fs.statSync(masterPath);
    masterSizeMb = Number((stat.size / (1024 * 1024)).toFixed(2));
    const meta = probeVideo(masterPath);
    if (meta.duration > 0) durationSec = meta.duration;
    if (meta.width > 0) width = meta.width;
    if (meta.height > 0) height = meta.height;

    const needsReencode =
      options?.forceReencode ||
      !fs.existsSync(socialMp4Path) ||
      fs.statSync(socialMp4Path).mtimeMs < stat.mtimeMs;

    if (needsReencode) {
      if (masterSizeMb <= 27.5) {
        fs.copyFileSync(masterPath, socialMp4Path);
      } else {
        const targetBitrateK = Math.max(
          900,
          Math.floor((27 * 8000) / Math.max(5, durationSec) - 160)
        );
        execFileSync(
          'ffmpeg',
          [
            '-y',
            '-i',
            masterPath,
            '-c:v',
            'libx264',
            '-preset',
            'fast',
            '-b:v',
            `${targetBitrateK}k`,
            '-maxrate',
            `${targetBitrateK}k`,
            '-bufsize',
            `${targetBitrateK * 2}k`,
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '160k',
            '-movflags',
            '+faststart',
            socialMp4Path,
          ],
          { stdio: 'ignore', timeout: 120_000 }
        );
      }
    }

    if (fs.existsSync(socialMp4Path)) {
      socialSizeMb = Number(
        (fs.statSync(socialMp4Path).size / (1024 * 1024)).toFixed(2)
      );
    }

    try {
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-ss',
          coverTs.toFixed(2),
          '-i',
          masterPath,
          '-frames:v',
          '1',
          '-q:v',
          '2',
          coverPath,
        ],
        { stdio: 'ignore', timeout: 20_000 }
      );
    } catch {
      // fallback below
    }
  }

  if (!fs.existsSync(coverPath)) {
    try {
      execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=0x14161B:s=1080x1920:d=1',
          '-frames:v',
          '1',
          '-q:v',
          '3',
          coverPath,
        ],
        { stdio: 'ignore', timeout: 10_000 }
      );
    } catch {
      // ignore if ffmpeg unavailable
    }
  }

  const copyPack = {
    ...buildTemplateSocialCopy(project),
    ...(options?.copy || {}),
  };

  const postMarkdown = [
    `# Kit de publication · ${project.title} (${version})`,
    '',
    '## YouTube Title',
    copyPack.youtubeTitle,
    '',
    '## YouTube Description',
    copyPack.youtubeDescription,
    '',
    '## Instagram Reels Caption',
    copyPack.caption,
    '',
    '## TikTok Caption',
    copyPack.tiktokCaption,
    '',
    `## Cover Frame Timestamp`,
    `${coverTs.toFixed(2)}s`,
  ].join('\n');
  fs.writeFileSync(postMdPath, postMarkdown, 'utf-8');

  const safeProj = encodeURIComponent(project.id.replace(/[^a-zA-Z0-9._-]/g, '_'));
  const safeVer = encodeURIComponent(version.replace(/[^a-zA-Z0-9._-]/g, '_'));

  return {
    projectId: project.id,
    version,
    masterMp4Path: masterPath || undefined,
    masterSizeMb,
    socialMp4Path: fs.existsSync(socialMp4Path) ? socialMp4Path : undefined,
    socialMp4Url: fs.existsSync(socialMp4Path)
      ? `/api/social/packs/${safeProj}/${safeVer}/social.mp4`
      : undefined,
    socialSizeMb,
    coverPath: fs.existsSync(coverPath) ? coverPath : undefined,
    coverUrl: fs.existsSync(coverPath)
      ? `/api/social/packs/${safeProj}/${safeVer}/cover.jpg`
      : undefined,
    postMdUrl: `/api/social/packs/${safeProj}/${safeVer}/post.md`,
    durationSec,
    width,
    height,
    preparedAt: new Date().toISOString(),
  };
}

export async function generateAiSocialCopy(
  project: ShortProject
): Promise<SocialCopyPack> {
  const fallback = buildTemplateSocialCopy(project);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const spoken = (project.transcript || [])
      .filter((w) => !w.isCut)
      .map((w) => w.word)
      .join(' ')
      .slice(0, 1200);

    const prompt = [
      'Tu es un stratège éditorial YouTube Shorts, Instagram Reels et TikTok francophone.',
      'Génère les textes de publication natifs et humains pour ce Short vidéo, sans aucun jargon IA ni #fyp.',
      `Titre du projet : ${project.title}`,
      project.topicCategory ? `Catégorie : ${project.topicCategory}` : '',
      project.hookText ? `Hook : ${project.hookText}` : '',
      spoken ? `Transcription : ${spoken}` : '',
      `Durée : ${Math.round(project.duration)}s`,
      'Règles :',
      '- youtubeTitle : <= 58 caractères, promesse claire, sans clickbait vide.',
      '- caption (Instagram) : 1ère ligne accrocheuse (<120 chars, différente du hook mot pour mot), puis 2-3 lignes courtes sur ce que le spectateur retient, question finale pour commentaires, puis 3 à 5 hashtags pertinents.',
      '- tiktokCaption : plus direct et court que Instagram, avec 3 à 4 hashtags.',
      '- youtubeDescription : résumé clair + hashtags en fin.',
      '- coverTimestampSec : entre 0.5 et 2.5 secondes.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            youtubeTitle: { type: Type.STRING },
            youtubeDescription: { type: Type.STRING },
            caption: { type: Type.STRING },
            tiktokCaption: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            coverTimestampSec: { type: Type.NUMBER },
          },
          required: [
            'youtubeTitle',
            'youtubeDescription',
            'caption',
            'tiktokCaption',
            'hashtags',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as Partial<SocialCopyPack>;
    const hashtags = sanitizeHashtags(
      Array.isArray(parsed.hashtags) ? parsed.hashtags : fallback.hashtags,
      project.topicCategory
    );

    return {
      youtubeTitle: truncateForYouTubeTitle(
        parsed.youtubeTitle || fallback.youtubeTitle,
        60
      ),
      youtubeDescription: parsed.youtubeDescription || fallback.youtubeDescription,
      caption: parsed.caption || fallback.caption,
      tiktokCaption: parsed.tiktokCaption || fallback.tiktokCaption,
      hashtags,
      coverTimestampSec: Number.isFinite(parsed.coverTimestampSec)
        ? Math.max(0.2, Math.min(3.5, Number(parsed.coverTimestampSec)))
        : fallback.coverTimestampSec,
      generatedBy: 'gemini',
    };
  } catch {
    return fallback;
  }
}

export function inspectTregStatus(): {
  installed: boolean;
  version?: string;
  connectedPlatforms: SocialPlatform[];
  loggedIn?: boolean;
  email?: string;
  rawOutput?: string;
} {
  const pub = getTregSessionPublic();
  return {
    installed: pub.cliInstalled || pub.loggedIn,
    version: pub.cliVersion || (pub.loggedIn ? 'Cloud API' : undefined),
    connectedPlatforms: pub.connectedPlatforms,
    loggedIn: pub.loggedIn,
    email: pub.email,
  };
}

export function buildOAuthAuthorizationUrl(
  platform: SocialPlatform,
  requestOrigin?: string
): {
  url: string;
  callbackUrl: string;
} {
  const callbackUrl = getOAuthCallbackUrl(platform, requestOrigin);
  const state = crypto.randomBytes(16).toString('hex');
  const creds = getOAuthClientCredentials(platform);

  // Cleanup expired states (> 15m)
  const now = Date.now();
  for (const [k, v] of pendingOAuthStates.entries()) {
    if (now - v.createdAt > 15 * 60 * 1000) pendingOAuthStates.delete(k);
  }

  if (platform === 'youtube') {
    if (!creds.clientId) {
      throw new Error(
        'YOUTUBE_CLIENT_ID (ou Client ID dans Config) manquant — ou utilisez la connexion 1-clic Treg.'
      );
    }
    pendingOAuthStates.set(state, {
      platform,
      redirectUri: callbackUrl,
      createdAt: now,
    });
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope:
        'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      callbackUrl,
    };
  }

  if (platform === 'instagram') {
    if (!creds.clientId) {
      throw new Error(
        'INSTAGRAM_CLIENT_ID (ou Client ID dans Config) manquant — ou utilisez la connexion 1-clic Treg.'
      );
    }
    pendingOAuthStates.set(state, {
      platform,
      redirectUri: callbackUrl,
      createdAt: now,
    });
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope:
        'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      state,
    });
    return {
      url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
      callbackUrl,
    };
  }

  if (!creds.clientId) {
    throw new Error(
      'TIKTOK_CLIENT_KEY (ou Client Key dans Config) manquant — ou utilisez la connexion 1-clic Treg.'
    );
  }
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  pendingOAuthStates.set(state, {
    platform,
    codeVerifier,
    redirectUri: callbackUrl,
    createdAt: now,
  });
  const params = new URLSearchParams({
    client_key: creds.clientId,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: callbackUrl,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return {
    url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
    callbackUrl,
  };
}

export async function handleOAuthCallback(
  platform: SocialPlatform,
  code: string,
  state?: string
): Promise<SocialAccountSecretRecord> {
  const pending = state ? pendingOAuthStates.get(state) : undefined;
  if (state) pendingOAuthStates.delete(state);
  const redirectUri = pending?.redirectUri || getOAuthCallbackUrl(platform);

  const creds = getOAuthClientCredentials(platform);

  if (platform === 'youtube') {
    const { clientId, clientSecret } = creds;
    if (!clientId || !clientSecret) {
      throw new Error('Identifiants OAuth YouTube non configurés sur le serveur.');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error_description || 'Échec échange OAuth YouTube.'
      );
    }

    let accountName = 'Chaîne YouTube';
    let accountHandle = '@youtube';
    let accountId = '';
    let avatarUrl: string | undefined;

    try {
      const chRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (chRes.ok) {
        const chJson = (await chRes.json()) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              customUrl?: string;
              thumbnails?: { default?: { url?: string } };
            };
          }>;
        };
        const ch = chJson.items?.[0];
        if (ch) {
          accountId = ch.id;
          accountName = ch.snippet?.title || accountName;
          accountHandle = ch.snippet?.customUrl || accountHandle;
          avatarUrl = ch.snippet?.thumbnails?.default?.url;
        }
      }
    } catch {
      // keep fallback channel metadata
    }

    return saveRawSocialAccount('youtube', {
      connected: true,
      route: 'oauth',
      accountName,
      accountHandle,
      accountId,
      avatarUrl,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(
        Date.now() + (tokenData.expires_in || 3600) * 1000
      ).toISOString(),
      scopes: tokenData.scope ? tokenData.scope.split(' ') : ['youtube.upload'],
      connectedAt: new Date().toISOString(),
      lastError: undefined,
    });
  }

  if (platform === 'instagram') {
    const { clientId, clientSecret } = creds;
    if (!clientId || !clientSecret) {
      throw new Error('Identifiants OAuth Instagram/Meta non configurés.');
    }

    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(
        tokenData.error?.message || 'Échec échange OAuth Instagram.'
      );
    }

    let accessToken = tokenData.access_token;
    let expiresIn = tokenData.expires_in || 3600;
    try {
      const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      longUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longUrl.searchParams.set('client_id', clientId);
      longUrl.searchParams.set('client_secret', clientSecret);
      longUrl.searchParams.set('fb_exchange_token', accessToken);
      const longRes = await fetch(longUrl.toString());
      if (longRes.ok) {
        const longJson = (await longRes.json()) as {
          access_token?: string;
          expires_in?: number;
        };
        if (longJson.access_token) {
          accessToken = longJson.access_token;
          expiresIn = longJson.expires_in || 5184000;
        }
      }
    } catch {
      // use short-lived token
    }

    let igUserId = '';
    let igPageId = '';
    let accountName = 'Compte Instagram Pro';
    let accountHandle = '@instagram';
    let avatarUrl: string | undefined;

    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(accessToken)}`
      );
      if (pagesRes.ok) {
        const pagesJson = (await pagesRes.json()) as {
          data?: Array<{
            id: string;
            name?: string;
            instagram_business_account?: {
              id: string;
              username?: string;
              name?: string;
              profile_picture_url?: string;
            };
          }>;
        };
        const pageWithIg = (pagesJson.data || []).find(
          (p) => p.instagram_business_account?.id
        );
        if (pageWithIg?.instagram_business_account) {
          igPageId = pageWithIg.id;
          igUserId = pageWithIg.instagram_business_account.id;
          accountName =
            pageWithIg.instagram_business_account.name ||
            pageWithIg.name ||
            accountName;
          accountHandle = pageWithIg.instagram_business_account.username
            ? `@${pageWithIg.instagram_business_account.username}`
            : accountHandle;
          avatarUrl = pageWithIg.instagram_business_account.profile_picture_url;
        }
      }
    } catch {
      // keep fallback metadata
    }

    return saveRawSocialAccount('instagram', {
      connected: true,
      route: 'oauth',
      accountName,
      accountHandle,
      accountId: igUserId,
      igUserId,
      igPageId,
      avatarUrl,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: ['instagram_basic', 'instagram_content_publish'],
      connectedAt: new Date().toISOString(),
      lastError: igUserId
        ? undefined
        : 'Aucune Page Facebook liée à un compte Instagram Pro détectée.',
    });
  }

  // TikTok
  const { clientId: clientKey, clientSecret } = creds;
  if (!clientKey || !clientSecret) {
    throw new Error('Identifiants OAuth TikTok non configurés.');
  }

  const bodyParams = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (pending?.codeVerifier) {
    bodyParams.set('code_verifier', pending.codeVerifier);
  }

  const ttRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams,
  });
  const ttData = (await ttRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
    error_description?: string;
  };
  if (!ttRes.ok || !ttData.access_token) {
    throw new Error(ttData.error_description || 'Échec échange OAuth TikTok.');
  }

  let accountName = 'Compte TikTok';
  let accountHandle = '@tiktok';
  let avatarUrl: string | undefined;

  try {
    const infoRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url',
      { headers: { Authorization: `Bearer ${ttData.access_token}` } }
    );
    if (infoRes.ok) {
      const infoJson = (await infoRes.json()) as {
        data?: {
          user?: {
            display_name?: string;
            username?: string;
            avatar_url?: string;
          };
        };
      };
      const u = infoJson.data?.user;
      if (u) {
        accountName = u.display_name || accountName;
        accountHandle = u.username ? `@${u.username}` : accountHandle;
        avatarUrl = u.avatar_url;
      }
    }
  } catch {
    // keep fallback
  }

  return saveRawSocialAccount('tiktok', {
    connected: true,
    route: 'oauth',
    accountName,
    accountHandle,
    accountId: ttData.open_id,
    avatarUrl,
    accessToken: ttData.access_token,
    refreshToken: ttData.refresh_token,
    tokenExpiresAt: new Date(
      Date.now() + (ttData.expires_in || 86400) * 1000
    ).toISOString(),
    scopes: ttData.scope ? ttData.scope.split(',') : ['video.publish'],
    connectedAt: new Date().toISOString(),
    lastError: undefined,
  });
}

async function refreshOAuthTokenIfNeeded(
  account: SocialAccountSecretRecord
): Promise<SocialAccountSecretRecord> {
  if (!account.accessToken) return account;
  const expiresAtMs = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : 0;
  if (!expiresAtMs || expiresAtMs - Date.now() > 120_000) {
    return account;
  }
  if (!account.refreshToken) return account;

  if (account.platform === 'youtube') {
    const { clientId, clientSecret } = getOAuthClientCredentials('youtube');
    if (!clientId || !clientSecret) return account;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (data.access_token) {
        return saveRawSocialAccount('youtube', {
          accessToken: data.access_token,
          tokenExpiresAt: new Date(
            Date.now() + (data.expires_in || 3600) * 1000
          ).toISOString(),
        });
      }
    }
  }

  if (account.platform === 'tiktok') {
    const { clientId: clientKey, clientSecret } = getOAuthClientCredentials('tiktok');
    if (!clientKey || !clientSecret) return account;

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (data.access_token) {
        return saveRawSocialAccount('tiktok', {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || account.refreshToken,
          tokenExpiresAt: new Date(
            Date.now() + (data.expires_in || 86400) * 1000
          ).toISOString(),
        });
      }
    }
  }

  return account;
}

async function publishYouTubeViaOAuth(
  job: ScheduledPostItem,
  account: SocialAccountSecretRecord,
  pack: PreparedMediaAssets
): Promise<{ publishedUrl: string; externalPostId: string }> {
  const refreshed = await refreshOAuthTokenIfNeeded(account);
  if (!refreshed.accessToken) {
    throw new Error('Compte YouTube non connecté via OAuth (token manquant).');
  }
  const videoPath = pack.masterMp4Path || pack.socialMp4Path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error(
      `Aucun fichier MP4 trouvé pour "${job.projectTitle}" (${job.version}). Lancez d'abord un rendu.`
    );
  }

  const stat = fs.statSync(videoPath);
  const metadata = {
    snippet: {
      title: truncateForYouTubeTitle(job.youtubeTitle || job.projectTitle, 60),
      description: job.youtubeDescription || job.caption,
      categoryId: '28',
    },
    status: {
      privacyStatus: job.privacy || 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(stat.size),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`YouTube init upload HTTP ${initRes.status}: ${errText.slice(0, 240)}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube API n’a pas renvoyé d’URL de session resumable.');
  }

  const buffer = fs.readFileSync(videoPath);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(buffer.byteLength),
    },
    body: buffer,
  });
  const putJson = (await putRes.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!putRes.ok || !putJson.id) {
    throw new Error(
      putJson.error?.message || `Échec upload vidéo YouTube (HTTP ${putRes.status}).`
    );
  }

  if (pack.coverPath && fs.existsSync(pack.coverPath)) {
    try {
      const thumbBuf = fs.readFileSync(pack.coverPath);
      await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(putJson.id)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
            'Content-Type': 'image/jpeg',
          },
          body: thumbBuf,
        }
      );
    } catch {
      // thumbnail upload requires verified YouTube channel; non-fatal
    }
  }

  return {
    externalPostId: putJson.id,
    publishedUrl: `https://youtube.com/shorts/${putJson.id}`,
  };
}

async function publishInstagramViaOAuth(
  job: ScheduledPostItem,
  account: SocialAccountSecretRecord,
  pack: PreparedMediaAssets
): Promise<{ publishedUrl: string; externalPostId: string }> {
  if (!account.accessToken || !account.igUserId) {
    throw new Error(
      'Compte Instagram Pro non connecté via OAuth (igUserId ou token manquant).'
    );
  }
  if (!pack.socialMp4Path || !fs.existsSync(pack.socialMp4Path)) {
    throw new Error('Fichier social.mp4 introuvable pour Instagram Reels.');
  }

  const packDir = path.dirname(pack.socialMp4Path);
  const mediaToken = issuePublicMediaToken(packDir, 12);
  const baseUrl = getPublicAppBaseUrl();
  const videoUrl = `${baseUrl}/api/social/public-media/${mediaToken}/social.mp4`;
  const coverUrl = pack.coverPath
    ? `${baseUrl}/api/social/public-media/${mediaToken}/cover.jpg`
    : undefined;

  const containerParams = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: job.caption,
    access_token: account.accessToken,
  });
  if (coverUrl) {
    containerParams.set('cover_url', coverUrl);
  }

  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(account.igUserId)}/media`,
    {
      method: 'POST',
      body: containerParams,
    }
  );
  const createJson = (await createRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!createRes.ok || !createJson.id) {
    throw new Error(
      createJson.error?.message || 'Erreur création conteneur Instagram Reels.'
    );
  }

  const creationId = createJson.id;
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(creationId)}?fields=status_code,status&access_token=${encodeURIComponent(account.accessToken)}`
    );
    const statusJson = (await statusRes.json()) as {
      status_code?: string;
      status?: string;
    };
    if (statusJson.status_code === 'FINISHED') break;
    if (statusJson.status_code === 'ERROR') {
      throw new Error(`Instagram traitement vidéo échoué: ${statusJson.status || 'ERROR'}`);
    }
  }

  const pubRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(account.igUserId)}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: account.accessToken,
      }),
    }
  );
  const pubJson = (await pubRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!pubRes.ok || !pubJson.id) {
    throw new Error(pubJson.error?.message || 'Échec publication Instagram Reels.');
  }

  let permalink = `https://www.instagram.com/reel/${pubJson.id}/`;
  try {
    const linkRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pubJson.id)}?fields=permalink&access_token=${encodeURIComponent(account.accessToken)}`
    );
    if (linkRes.ok) {
      const linkJson = (await linkRes.json()) as { permalink?: string };
      if (linkJson.permalink) permalink = linkJson.permalink;
    }
  } catch {
    // fallback permalink
  }

  return {
    externalPostId: pubJson.id,
    publishedUrl: permalink,
  };
}

async function publishTikTokViaOAuth(
  job: ScheduledPostItem,
  account: SocialAccountSecretRecord,
  pack: PreparedMediaAssets
): Promise<{ publishedUrl: string; externalPostId: string; inboxOnly?: boolean }> {
  const refreshed = await refreshOAuthTokenIfNeeded(account);
  if (!refreshed.accessToken) {
    throw new Error('Compte TikTok non connecté via OAuth.');
  }
  const videoPath = pack.socialMp4Path || pack.masterMp4Path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Fichier MP4 introuvable pour TikTok.');
  }
  const buffer = fs.readFileSync(videoPath);
  const size = buffer.byteLength;

  const creatorRes = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({}),
    }
  );
  const creatorJson = (await creatorRes.json().catch(() => ({}))) as {
    data?: { privacy_level_options?: string[] };
  };
  const privacyOptions = creatorJson.data?.privacy_level_options || ['SELF_ONLY'];
  const privacyLevel =
    job.privacy === 'public' && privacyOptions.includes('PUBLIC_TO_EVERYONE')
      ? 'PUBLIC_TO_EVERYONE'
      : privacyOptions.includes('MUTUAL_FOLLOW_FRIENDS')
        ? 'MUTUAL_FOLLOW_FRIENDS'
        : privacyOptions[0] || 'SELF_ONLY';

  let initEndpoint = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
  let isInbox = false;
  let initRes = await fetch(initEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshed.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: (job.tiktokCaption || job.caption).slice(0, 2200),
        privacy_level: privacyLevel,
        video_cover_timestamp_ms: Math.round((job.coverTimestampSec || 1) * 1000),
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });
  let initJson = (await initRes.json().catch(() => ({}))) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };

  if (
    initJson.error?.code === 'unaudited_client_can_only_post_to_private_accounts' ||
    !initRes.ok
  ) {
    initEndpoint = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
    isInbox = true;
    initRes = await fetch(initEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: size,
          chunk_size: size,
          total_chunk_count: 1,
        },
      }),
    });
    initJson = (await initRes.json().catch(() => ({}))) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    };
  }

  if (!initRes.ok || !initJson.data?.upload_url || !initJson.data?.publish_id) {
    throw new Error(
      initJson.error?.message || `Échec init TikTok (${initJson.error?.code || initRes.status}).`
    );
  }

  const putRes = await fetch(initJson.data.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${size - 1}/${size}`,
    },
    body: buffer,
  });
  if (!putRes.ok) {
    throw new Error(`Upload TikTok échoué (HTTP ${putRes.status}).`);
  }

  return {
    externalPostId: initJson.data.publish_id,
    publishedUrl: isInbox
      ? 'https://www.tiktok.com/creator-center/content'
      : `https://www.tiktok.com/${refreshed.accountHandle || ''}`,
    inboxOnly: isInbox,
  };
}

function recordPublishedMarkdown(job: ScheduledPostItem): void {
  const editDir = path.join(ROOT_DIR, 'video-agent/edits', job.projectSlug);
  const targetFile = fs.existsSync(editDir)
    ? path.join(editDir, 'published.md')
    : path.join(getPackDirectory(job.projectId, job.version), 'published.md');

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const line = formatPublishedMarkdownLine({
    publishedAt: job.publishedAt || new Date().toISOString(),
    platform: job.platform,
    route: job.route,
    publishedUrl: job.publishedUrl,
    version: job.version,
  });
  const header = fs.existsSync(targetFile)
    ? ''
    : `# Publications · ${job.projectTitle}\n\n`;
  fs.appendFileSync(targetFile, `${header}${line}\n`, 'utf-8');
}

async function publishViaTregCli(
  job: ScheduledPostItem,
  pack: PreparedMediaAssets
): Promise<{ publishedUrl: string; externalPostId: string }> {
  const tregStatus = inspectTregStatus();
  if (!tregStatus.installed) {
    throw new Error('CLI Treg non installée sur ce serveur.');
  }
  if (!tregStatus.connectedPlatforms.includes(job.platform)) {
    throw new Error(`Plateforme ${job.platform} non connectée dans Treg.`);
  }

  const videoPath = pack.socialMp4Path || pack.masterMp4Path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Fichier MP4 introuvable pour publication Treg.');
  }

  if (job.platform === 'youtube') {
    const out = execFileSync(
      'treg',
      [
        'call',
        'youtube.youtube.video.upload',
        '--json',
        JSON.stringify({
          snippet: {
            title: job.youtubeTitle,
            description: job.youtubeDescription,
          },
          status: {
            privacyStatus: job.privacy || 'public',
            selfDeclaredMadeForKids: false,
          },
        }),
      ],
      { encoding: 'utf-8', timeout: 30_000 }
    );
    return {
      externalPostId: `treg-yt-${Date.now()}`,
      publishedUrl: out.trim().startsWith('http')
        ? out.trim()
        : 'https://studio.youtube.com',
    };
  }

  throw new Error(
    `Publication Treg automatisée prête pour ${job.platform} (vérifier les paramètres treg catalog).`
  );
}

export async function executeScheduledJob(jobId: string): Promise<ScheduledPostItem> {
  const job = getScheduledPost(jobId);
  if (!job) {
    throw new Error(`Job "${jobId}" introuvable.`);
  }
  const project = getProject(job.projectId);
  if (!project) {
    const failed = upsertScheduledPost({
      ...job,
      status: 'failed',
      errorMessage: `Projet "${job.projectId}" introuvable.`,
      lastAttemptAt: new Date().toISOString(),
    });
    return failed;
  }

  let current = upsertScheduledPost({
    ...job,
    status: 'preparing',
    lastAttemptAt: new Date().toISOString(),
    errorMessage: undefined,
  });

  const pack = prepareMediaPackForProject(project, {
    version: current.version,
    coverTimestampSec: current.coverTimestampSec,
    copy: {
      youtubeTitle: current.youtubeTitle,
      youtubeDescription: current.youtubeDescription,
      caption: current.caption,
      tiktokCaption: current.tiktokCaption,
      hashtags: current.hashtags,
      coverTimestampSec: current.coverTimestampSec,
      generatedBy: 'template',
    },
  });

  current = upsertScheduledPost({
    ...current,
    status: 'publishing',
    socialMp4Url: pack.socialMp4Url,
    coverUrl: pack.coverUrl,
    attempts: current.attempts + 1,
  });

  const accounts = getRawSocialAccounts();
  const account = accounts[current.platform];
  const effectiveRoute: PublishRoute = current.route || account.route || 'manual';

  const switchToManualKit = (reason: string): ScheduledPostItem => {
    const updated = upsertScheduledPost({
      ...current,
      status: 'awaiting_manual',
      route: 'manual',
      notes: reason,
      errorMessage: undefined,
    });
    appendPublishLog({
      jobId: updated.id,
      projectTitle: updated.projectTitle,
      platform: updated.platform,
      route: 'manual',
      level: 'warn',
      message: `${PLATFORM_META[updated.platform].name} basculé en Kit Manuel prêt à poster : ${reason}`,
    });
    return updated;
  };

  if (effectiveRoute === 'manual') {
    return switchToManualKit(
      'Kit média (social.mp4, cover.jpg, légende) préparé automatiquement pour publication manuelle.'
    );
  }

  if (effectiveRoute === 'treg') {
    try {
      const tregSession = readTregSession();
      const result = tregSession?.token
        ? await publishViaTregHttp(current, account, pack, getPublicAppBaseUrl())
        : await publishViaTregCli(current, pack);

      const inboxNote =
        'inboxOnly' in result && result.inboxOnly
          ? 'Envoyé dans votre boîte de réception TikTok via Treg (prêt à publier en 1 tap).'
          : current.notes;

      const published = upsertScheduledPost({
        ...current,
        status: 'published',
        publishedAt: new Date().toISOString(),
        publishedUrl: result.publishedUrl,
        externalPostId: result.externalPostId,
        notes: inboxNote,
        errorMessage: undefined,
      });
      recordPublishedMarkdown(published);
      appendPublishLog({
        jobId: published.id,
        projectTitle: published.projectTitle,
        platform: published.platform,
        route: 'treg',
        level: 'success',
        message: `Publié via Treg sur ${PLATFORM_META[published.platform].name} (${result.publishedUrl}).`,
      });
      return published;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur Treg';
      if (current.fallbackToManual || account.fallbackToManual) {
        return switchToManualKit(`Fallback après indisponibilité Treg (${msg}).`);
      }
      const failed = upsertScheduledPost({
        ...current,
        status: 'failed',
        errorMessage: msg,
      });
      appendPublishLog({
        jobId: failed.id,
        projectTitle: failed.projectTitle,
        platform: failed.platform,
        route: 'treg',
        level: 'error',
        message: msg,
      });
      return failed;
    }
  }

  // OAuth Direct Route
  try {
    if (!account.connected || !account.accessToken) {
      const tregSession = readTregSession();
      const treg = inspectTregStatus();
      if (
        (tregSession?.token && treg.connectedPlatforms.includes(current.platform)) ||
        (treg.installed && treg.connectedPlatforms.includes(current.platform))
      ) {
        const tregResult = tregSession?.token
          ? await publishViaTregHttp(current, account, pack, getPublicAppBaseUrl())
          : await publishViaTregCli(current, pack);
        const published = upsertScheduledPost({
          ...current,
          status: 'published',
          route: 'treg',
          publishedAt: new Date().toISOString(),
          publishedUrl: tregResult.publishedUrl,
          externalPostId: tregResult.externalPostId,
        });
        recordPublishedMarkdown(published);
        return published;
      }
      if (current.fallbackToManual || account.fallbackToManual) {
        const oauthConfigured = isPlatformOAuthConfigured(current.platform);
        return switchToManualKit(
          oauthConfigured
            ? 'Compte OAuth non encore connecté — kit prêt à publier généré.'
            : 'Variables OAuth non configurées sur le serveur — kit prêt à publier généré.'
        );
      }
      throw new Error(
        `Compte ${PLATFORM_META[current.platform].name} non connecté en OAuth.`
      );
    }

    let result: { publishedUrl: string; externalPostId: string; inboxOnly?: boolean };
    if (current.platform === 'youtube') {
      result = await publishYouTubeViaOAuth(current, account, pack);
    } else if (current.platform === 'instagram') {
      result = await publishInstagramViaOAuth(current, account, pack);
    } else {
      result = await publishTikTokViaOAuth(current, account, pack);
    }

    const published = upsertScheduledPost({
      ...current,
      status: 'published',
      publishedAt: new Date().toISOString(),
      publishedUrl: result.publishedUrl,
      externalPostId: result.externalPostId,
      notes: result.inboxOnly
        ? 'Envoyé dans votre boîte de réception TikTok (app non auditée).'
        : current.notes,
      errorMessage: undefined,
    });
    recordPublishedMarkdown(published);
    appendPublishLog({
      jobId: published.id,
      projectTitle: published.projectTitle,
      platform: published.platform,
      route: 'oauth',
      level: 'success',
      message: `Publié automatiquement via OAuth sur ${PLATFORM_META[published.platform].name} : ${result.publishedUrl}`,
    });
    return published;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur publication OAuth';
    if (current.attempts < current.maxAttempts) {
      const retryAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      const retrying = upsertScheduledPost({
        ...current,
        status: 'scheduled',
        scheduledAt: retryAt,
        errorMessage: `Nouvelle tentative prévue (${current.attempts}/${current.maxAttempts}) : ${msg}`,
      });
      appendPublishLog({
        jobId: retrying.id,
        projectTitle: retrying.projectTitle,
        platform: retrying.platform,
        route: 'oauth',
        level: 'warn',
        message: `Tentative ${current.attempts} échouée, reprogrammée dans 2 min : ${msg}`,
      });
      return retrying;
    }
    if (current.fallbackToManual || account.fallbackToManual) {
      return switchToManualKit(`Échec OAuth (${msg}) — basculé en Kit Manuel.`);
    }
    const failed = upsertScheduledPost({
      ...current,
      status: 'failed',
      errorMessage: msg,
    });
    appendPublishLog({
      jobId: failed.id,
      projectTitle: failed.projectTitle,
      platform: failed.platform,
      route: 'oauth',
      level: 'error',
      message: msg,
    });
    return failed;
  }
}

export async function runSchedulerTick(options?: {
  force?: boolean;
}): Promise<{ processed: number; published: number; awaitingManual: number; failed: number }> {
  if (tickInProgress) {
    return { processed: 0, published: 0, awaitingManual: 0, failed: 0 };
  }
  const state = getSchedulerState();
  if (!state.enabled && !options?.force) {
    return { processed: 0, published: 0, awaitingManual: 0, failed: 0 };
  }

  tickInProgress = true;
  const nowMs = Date.now();
  let processed = 0;
  let published = 0;
  let awaitingManual = 0;
  let failed = 0;

  try {
    saveSchedulerState({ running: true, lastTickAt: new Date(nowMs).toISOString() });
    const queue = getScheduledQueue();
    const dueJobs = queue.filter((j) => isJobDue(j, nowMs));

    for (const job of dueJobs) {
      processed += 1;
      const res = await executeScheduledJob(job.id);
      if (res.status === 'published') published += 1;
      else if (res.status === 'awaiting_manual') awaitingManual += 1;
      else if (res.status === 'failed') failed += 1;
    }

    const updatedState = getSchedulerState();
    saveSchedulerState({
      running: false,
      lastTickAt: new Date().toISOString(),
      nextTickAt: updatedState.enabled
        ? new Date(Date.now() + updatedState.intervalSeconds * 1000).toISOString()
        : undefined,
      totalTicks: (updatedState.totalTicks || 0) + 1,
      totalPublished: (updatedState.totalPublished || 0) + published,
    });
  } finally {
    tickInProgress = false;
  }

  return { processed, published, awaitingManual, failed };
}

export function startSocialScheduler(): void {
  initSocialStorage();
  const state = getSchedulerState();
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  const intervalMs = Math.max(5, Math.min(300, state.intervalSeconds || 15)) * 1000;
  saveSchedulerState({
    nextTickAt: state.enabled
      ? new Date(Date.now() + intervalMs).toISOString()
      : undefined,
  });
  schedulerTimer = setInterval(() => {
    void runSchedulerTick().catch((err) => {
      console.error('[SocialScheduler] Tick error:', err);
    });
  }, intervalMs);
}

export function stopSocialScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
