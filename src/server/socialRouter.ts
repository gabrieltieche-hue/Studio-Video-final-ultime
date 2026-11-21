import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { getAllProjects, getProject } from './storageManager';
import {
  SOCIAL_PACKS_DIR,
  appendPublishLog,
  buildRailwayEnvBlock,
  deleteScheduledPost,
  getChannelBrandingKit,
  getPublishLogs,
  getRawSocialAccounts,
  getScheduledPost,
  getScheduledQueue,
  getSchedulerState,
  initSocialStorage,
  isPlatformOAuthConfigured,
  resolvePublicMediaDir,
  saveChannelBrandingKit,
  saveRawSocialAccount,
  saveSchedulerState,
  toPublicAccountConfig,
  upsertScheduledPost,
} from './socialStorage';
import {
  buildOAuthAuthorizationUrl,
  executeScheduledJob,
  generateAiSocialCopy,
  getHostingDiagnostics,
  getOAuthCallbackUrl,
  getPublicAppBaseUrl,
  handleOAuthCallback,
  inspectTregStatus,
  prepareMediaPackForProject,
  reconcilePendingJobsWithAccounts,
  runSchedulerTick,
  startSocialScheduler,
} from './socialPublisher';
import {
  clearTregSession,
  fetchLiveChannelProfiles,
  getTregSessionPublic,
  loginTregWithToken,
  pollTregBrowserLogin,
  pollTregProviderOAuth,
  probeAllSocialConnections,
  probeSocialConnection,
  pushYouTubeDescriptionDirect,
  readTregSession,
  startTregBrowserLogin,
  startTregEmailLogin,
  startTregProviderOAuth,
  syncTregConnections,
  verifyTregEmailLogin,
} from './tregClient';
import {
  readCompetitorsWatchlist,
  scanWatchlistOutliers,
} from './outliersService';
import {
  PLATFORM_META,
  buildTemplateSocialCopy,
  truncateForYouTubeTitle,
} from '../engine/socialCopy';
import type {
  PublishRoute,
  ScheduledPostItem,
  SocialPlatform,
} from '../types/social';

function isValidPlatform(val: string): val is SocialPlatform {
  return val === 'youtube' || val === 'instagram' || val === 'tiktok';
}

function resolveRequestOrigin(req: Request): string | undefined {
  const host = (req.get('x-forwarded-host') || req.get('host') || '').trim();
  if (!host) return undefined;
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  return `${proto}://${host}`;
}

export async function createScheduledPostsForProject(params: {
  projectId: string;
  version?: string;
  platforms: SocialPlatform[];
  scheduledAt?: string;
  publishNow?: boolean;
  timezone?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  caption?: string;
  tiktokCaption?: string;
  hashtags?: string[];
  coverTimestampSec?: number;
  privacy?: 'public' | 'unlisted' | 'private';
  routeOverride?: PublishRoute;
  fallbackToManual?: boolean;
}): Promise<{
  jobs: ScheduledPostItem[];
  pack: ReturnType<typeof prepareMediaPackForProject>;
  executedImmediately: boolean;
}> {
  const project = getProject(params.projectId);
  if (!project) {
    throw new Error(`Projet "${params.projectId}" introuvable.`);
  }
  const platforms = params.platforms.filter(isValidPlatform);
  if (platforms.length === 0) {
    throw new Error('Sélectionnez au moins un réseau social (youtube, instagram, tiktok).');
  }

  const version = params.version || project.currentVersion || 'v1';
  const defaultCopy = buildTemplateSocialCopy(project);
  const coverTimestampSec = Number.isFinite(params.coverTimestampSec)
    ? Number(params.coverTimestampSec)
    : defaultCopy.coverTimestampSec;

  const pack = prepareMediaPackForProject(project, {
    version,
    coverTimestampSec,
    copy: {
      youtubeTitle: params.youtubeTitle || defaultCopy.youtubeTitle,
      youtubeDescription: params.youtubeDescription || defaultCopy.youtubeDescription,
      caption: params.caption || defaultCopy.caption,
      tiktokCaption: params.tiktokCaption || defaultCopy.tiktokCaption,
      hashtags: params.hashtags || defaultCopy.hashtags,
      coverTimestampSec,
      generatedBy: 'template',
    },
  });

  const nowIso = new Date().toISOString();
  const scheduledIso = params.publishNow
    ? nowIso
    : params.scheduledAt && Number.isFinite(Date.parse(params.scheduledAt))
      ? new Date(params.scheduledAt).toISOString()
      : nowIso;

  const accounts = getRawSocialAccounts();
  const createdJobs: ScheduledPostItem[] = [];

  for (const platform of platforms) {
    const account = accounts[platform];
    const route = params.routeOverride || account.route || 'manual';
    const fallbackToManual =
      typeof params.fallbackToManual === 'boolean'
        ? params.fallbackToManual
        : account.fallbackToManual;

    const job: ScheduledPostItem = {
      id: `pub-${Date.now()}-${platform}-${Math.random().toString(16).slice(2, 6)}`,
      projectId: project.id,
      projectSlug: project.slug,
      projectTitle: project.title,
      version,
      platform,
      route,
      intendedRoute: route !== 'manual' ? route : undefined,
      routeLocked: Boolean(params.routeOverride),
      fallbackToManual,
      status: 'scheduled',
      scheduledAt: scheduledIso,
      timezone: params.timezone || 'Europe/Paris',
      youtubeTitle: truncateForYouTubeTitle(
        params.youtubeTitle || defaultCopy.youtubeTitle,
        60
      ),
      youtubeDescription: params.youtubeDescription || defaultCopy.youtubeDescription,
      caption: params.caption || defaultCopy.caption,
      tiktokCaption: params.tiktokCaption || params.caption || defaultCopy.tiktokCaption,
      hashtags: params.hashtags?.length ? params.hashtags : defaultCopy.hashtags,
      coverTimestampSec,
      privacy: params.privacy || account.defaultPrivacy || 'public',
      socialMp4Url: pack.socialMp4Url,
      coverUrl: pack.coverUrl,
      attempts: 0,
      maxAttempts: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const saved = upsertScheduledPost(job);
    appendPublishLog({
      jobId: saved.id,
      projectTitle: saved.projectTitle,
      platform: saved.platform,
      route: saved.route,
      level: 'info',
      message: params.publishNow
        ? `Publication immédiate lancée sur ${PLATFORM_META[platform].name} (${route}).`
        : `Programmé pour ${scheduledIso} sur ${PLATFORM_META[platform].name} (${route}).`,
    });
    createdJobs.push(saved);
  }

  let executedImmediately = false;
  if (params.publishNow || Date.parse(scheduledIso) <= Date.now()) {
    executedImmediately = true;
    const updatedJobs: ScheduledPostItem[] = [];
    for (const j of createdJobs) {
      const done = await executeScheduledJob(j.id);
      updatedJobs.push(done);
    }
    return { jobs: updatedJobs, pack, executedImmediately };
  }

  return { jobs: createdJobs, pack, executedImmediately };
}

export function createSocialRouter(): express.Router {
  const router = express.Router();
  initSocialStorage();

  // Status, environment diagnostics, callback URLs, scheduler state
  router.get('/api/social/status', (req: Request, res: Response) => {
    reconcilePendingJobsWithAccounts();
    const reqOrigin = resolveRequestOrigin(req);
    const appUrl = getPublicAppBaseUrl(reqOrigin);
    const tregSession = getTregSessionPublic();
    const treg = inspectTregStatus();
    const tregSet = new Set(treg.connectedPlatforms);
    const rawAccounts = getRawSocialAccounts();
    const accounts = (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) =>
      toPublicAccountConfig(rawAccounts[p], tregSet)
    );
    const scheduler = getSchedulerState();
    const hosting = getHostingDiagnostics(reqOrigin);
    const callbacks = {
      youtube: getOAuthCallbackUrl('youtube', reqOrigin),
      instagram: getOAuthCallbackUrl('instagram', reqOrigin),
      tiktok: getOAuthCallbackUrl('tiktok', reqOrigin),
    };
    res.json({
      appUrl,
      callbacks,
      oauthConfigured: {
        youtube: isPlatformOAuthConfigured('youtube'),
        instagram: isPlatformOAuthConfigured('instagram'),
        tiktok: isPlatformOAuthConfigured('tiktok'),
      },
      treg,
      tregSession,
      hosting,
      scheduler,
      accounts,
    });
  });

  // External cron wakeup endpoint (for GitHub Actions / cron-job.org / Cloud Scheduler)
  const handleCronTick = async (req: Request, res: Response) => {
    const expectedSecret = (process.env.CRON_SECRET || '').trim();
    if (expectedSecret) {
      const authHeader = (req.get('authorization') || '').trim();
      const bearer = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
      const querySecret = typeof req.query.secret === 'string' ? req.query.secret.trim() : '';
      if (bearer !== expectedSecret && querySecret !== expectedSecret) {
        res.status(401).json({ error: 'CRON_SECRET invalide.' });
        return;
      }
    }
    try {
      const summary = await runSchedulerTick({ force: false });
      res.json({
        ok: true,
        summary,
        scheduler: getSchedulerState(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur cron-tick',
      });
    }
  };
  router.get('/api/social/cron-tick', handleCronTick);
  router.post('/api/social/cron-tick', handleCronTick);

  router.post('/api/social/scheduler/toggle', (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      enabled?: boolean;
      intervalSeconds?: number;
    };
    const next = saveSchedulerState({
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
      ...(typeof body.intervalSeconds === 'number' && body.intervalSeconds >= 5
        ? { intervalSeconds: Math.min(300, Math.round(body.intervalSeconds)) }
        : {}),
    });
    startSocialScheduler();
    res.json({ success: true, scheduler: getSchedulerState() || next });
  });

  router.post('/api/social/scheduler/run-now', async (_req: Request, res: Response) => {
    try {
      const summary = await runSchedulerTick({ force: true });
      res.json({
        success: true,
        summary,
        scheduler: getSchedulerState(),
        queue: getScheduledQueue(),
        logs: getPublishLogs(50),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur exécution cron',
      });
    }
  });

  // Accounts list & settings
  router.get('/api/social/accounts', (_req: Request, res: Response) => {
    const treg = inspectTregStatus();
    const tregSet = new Set(treg.connectedPlatforms);
    const raw = getRawSocialAccounts();
    const accounts = (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) =>
      toPublicAccountConfig(raw[p], tregSet)
    );
    res.json({ accounts, treg });
  });

  router.patch('/api/social/accounts/:platform', (req: Request, res: Response) => {
    const platform = req.params.platform;
    if (!isValidPlatform(platform)) {
      res.status(400).json({ error: 'Plateforme invalide.' });
      return;
    }
    const body = (req.body || {}) as {
      route?: PublishRoute;
      fallbackToManual?: boolean;
      defaultPrivacy?: 'public' | 'unlisted' | 'private';
      accountName?: string;
      accountHandle?: string;
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      igUserId?: string;
      connected?: boolean;
      tregConnectionId?: string;
      tregConnectionName?: string;
    };

    const patch: Record<string, unknown> = {};
    if (body.route && ['oauth', 'treg', 'manual'].includes(body.route)) {
      patch.route = body.route;
      if (body.route === 'treg' || body.route === 'manual') {
        patch.lastError = undefined;
      }
    }
    if (typeof body.fallbackToManual === 'boolean') {
      patch.fallbackToManual = body.fallbackToManual;
    }
    if (
      body.defaultPrivacy &&
      ['public', 'unlisted', 'private'].includes(body.defaultPrivacy)
    ) {
      patch.defaultPrivacy = body.defaultPrivacy;
    }
    if (typeof body.accountName === 'string') {
      patch.accountName = body.accountName.trim();
    }
    if (typeof body.accountHandle === 'string') {
      patch.accountHandle = body.accountHandle.trim();
    }
    if (typeof body.igUserId === 'string') {
      patch.igUserId = body.igUserId.trim();
    }
    if (typeof body.tregConnectionId === 'string' && body.tregConnectionId.trim()) {
      const selectedId = body.tregConnectionId.trim();
      const sessionConns = readTregSession()?.connections || [];
      const matched = sessionConns.find(
        (c) => c.id === selectedId && c.platform === platform
      );
      patch.tregConnectionId = selectedId;
      patch.tregConnectionName = matched?.name || body.tregConnectionName?.trim();
      patch.route = 'treg';
      patch.connected = true;
      patch.lastError = undefined;
      if (matched) {
        patch.tregAuthorizationMethod = matched.authorizationMethod;
        patch.tregSetupRequired = Boolean(matched.setupRequired);
        patch.tregSetupDetail = matched.setupRequired ? matched.healthDetail : undefined;
        if (matched.resourceRef) {
          patch.tregResourceRef = matched.resourceRef;
          if (platform === 'instagram' && /^\d+$/.test(matched.resourceRef)) {
            patch.igUserId = matched.resourceRef;
          }
        }
        if (matched.name) {
          patch.accountName = matched.name;
        }
      }
    } else if (typeof body.tregConnectionName === 'string' && body.tregConnectionName.trim()) {
      patch.tregConnectionName = body.tregConnectionName.trim();
    }
    if (typeof body.clientId === 'string' && body.clientId.trim()) {
      patch.clientId = body.clientId.trim();
      if (!body.route) patch.route = 'oauth';
    }
    if (typeof body.clientSecret === 'string' && body.clientSecret.trim()) {
      patch.clientSecret = body.clientSecret.trim();
      if (!body.route) patch.route = 'oauth';
    }
    if (typeof body.accessToken === 'string' && body.accessToken.trim()) {
      patch.accessToken = body.accessToken.trim();
      patch.connected = true;
      patch.connectedAt = new Date().toISOString();
      patch.lastError = undefined;
    } else if (typeof body.connected === 'boolean') {
      patch.connected = body.connected;
      if (body.connected) {
        patch.connectedAt = new Date().toISOString();
        patch.lastError = undefined;
      }
    }

    const updated = saveRawSocialAccount(platform, patch);
    reconcilePendingJobsWithAccounts([platform]);
    const treg = inspectTregStatus();
    res.json({
      success: true,
      account: toPublicAccountConfig(updated, new Set(treg.connectedPlatforms)),
    });
  });

  router.post(
    '/api/social/accounts/:platform/test',
    async (req: Request, res: Response) => {
      const platform = req.params.platform;
      if (!isValidPlatform(platform)) {
        res.status(400).json({ error: 'Plateforme invalide.' });
        return;
      }
      try {
        const publicBase = getPublicAppBaseUrl(resolveRequestOrigin(req));
        const result = await probeSocialConnection(platform, publicBase);
        const treg = inspectTregStatus();
        const raw = getRawSocialAccounts();
        res.json({
          success: result.ok,
          result,
          account: toPublicAccountConfig(raw[platform], new Set(treg.connectedPlatforms)),
          tregSession: getTregSessionPublic(),
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Erreur test connexion',
        });
      }
    }
  );

  router.post('/api/social/test-connections', async (req: Request, res: Response) => {
    try {
      const publicBase = getPublicAppBaseUrl(resolveRequestOrigin(req));
      const results = await probeAllSocialConnections(publicBase);
      reconcilePendingJobsWithAccounts();
      const treg = inspectTregStatus();
      const tregSet = new Set(treg.connectedPlatforms);
      const raw = getRawSocialAccounts();
      const accounts = (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) =>
        toPublicAccountConfig(raw[p], tregSet)
      );
      res.json({
        success: results.every((r) => r.ok),
        results,
        accounts,
        tregSession: getTregSessionPublic(),
        queue: getScheduledQueue(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur test global connexions',
      });
    }
  });

  router.post(
    '/api/social/accounts/:platform/disconnect',
    (req: Request, res: Response) => {
      const platform = req.params.platform;
      if (!isValidPlatform(platform)) {
        res.status(400).json({ error: 'Plateforme invalide.' });
        return;
      }
      const updated = saveRawSocialAccount(platform, {
        connected: false,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiresAt: undefined,
        accountName: undefined,
        accountHandle: undefined,
        accountId: undefined,
        avatarUrl: undefined,
        igUserId: undefined,
        igPageId: undefined,
        tregConnectionId: undefined,
        tregConnectionName: undefined,
        tregAuthorizationMethod: undefined,
        tregSetupRequired: undefined,
        tregSetupDetail: undefined,
        tregResourceRef: undefined,
        lastError: undefined,
      });
      res.json({ success: true, account: toPublicAccountConfig(updated) });
    }
  );

  // OAuth popup URL + callback (AI Studio iframe-compatible)
  router.get('/api/social/oauth/:platform/url', (req: Request, res: Response) => {
    const platform = req.params.platform;
    if (!isValidPlatform(platform)) {
      res.status(400).json({ error: 'Plateforme invalide.' });
      return;
    }
    const reqOrigin = resolveRequestOrigin(req);
    try {
      const result = buildOAuthAuthorizationUrl(platform, reqOrigin);
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'OAuth non configuré',
        callbackUrl: getOAuthCallbackUrl(platform, reqOrigin),
      });
    }
  });

  const handleOAuthCallbackRoute = async (req: Request, res: Response) => {
    const platform = req.params.platform;
    if (!isValidPlatform(platform)) {
      res.status(400).send('Plateforme invalide.');
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const oauthErr =
      typeof req.query.error_description === 'string'
        ? req.query.error_description
        : typeof req.query.error === 'string'
          ? req.query.error
          : '';

    if (oauthErr || !code) {
      const msg = oauthErr || 'Code OAuth absent.';
      saveRawSocialAccount(platform, { lastError: msg });
      res.send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;background:#F6F5F1;color:#14161B">
        <p><strong>Connexion ${platform} interrompue :</strong> ${msg.replace(/[<>&]/g, '')}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', platform: ${JSON.stringify(platform)}, error: ${JSON.stringify(msg)} }, '*');
            setTimeout(() => window.close(), 1200);
          }
        </script>
      </body></html>`);
      return;
    }

    try {
      await handleOAuthCallback(platform, code, state);
      res.send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;background:#F6F5F1;color:#14161B">
        <p><strong>Compte ${PLATFORM_META[platform].name} connecté.</strong> Cette fenêtre va se fermer automatiquement…</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: ${JSON.stringify(platform)} }, '*');
            window.close();
          } else {
            window.location.href = '/?tab=publish';
          }
        </script>
      </body></html>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur OAuth';
      saveRawSocialAccount(platform, { lastError: msg });
      res.status(500).send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;background:#F6F5F1;color:#14161B">
        <p><strong>Erreur OAuth ${platform} :</strong> ${msg.replace(/[<>&]/g, '')}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', platform: ${JSON.stringify(platform)}, error: ${JSON.stringify(msg)} }, '*');
          }
        </script>
      </body></html>`);
    }
  };

  router.get(
    [
      '/api/social/oauth/:platform/callback',
      '/api/social/oauth/:platform/callback/',
    ],
    handleOAuthCallbackRoute
  );

  router.get('/api/social/treg/status', (_req: Request, res: Response) => {
    res.json({
      ...inspectTregStatus(),
      session: getTregSessionPublic(),
    });
  });

  router.post('/api/social/treg/login/start', async (_req: Request, res: Response) => {
    try {
      const started = await startTregBrowserLogin();
      res.json(started);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Impossible de joindre treg.to',
      });
    }
  });

  router.get('/api/social/treg/login/poll', async (req: Request, res: Response) => {
    const loginId = typeof req.query.login_id === 'string' ? req.query.login_id.trim() : '';
    if (!loginId) {
      res.status(400).json({ error: 'login_id requis.' });
      return;
    }
    try {
      const result = await pollTregBrowserLogin(loginId);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur polling login Treg',
      });
    }
  });

  router.post('/api/social/treg/login/token', async (req: Request, res: Response) => {
    const { token } = (req.body || {}) as { token?: string };
    try {
      const session = await loginTregWithToken(String(token || ''));
      res.json({ success: true, session });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Token Treg invalide',
      });
    }
  });

  router.post('/api/social/treg/login/email', async (req: Request, res: Response) => {
    const { email } = (req.body || {}) as { email?: string };
    try {
      const result = await startTregEmailLogin(String(email || ''));
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur envoi code Treg',
      });
    }
  });

  router.post(
    '/api/social/treg/login/email/verify',
    async (req: Request, res: Response) => {
      const { email, code } = (req.body || {}) as { email?: string; code?: string };
      try {
        const session = await verifyTregEmailLogin(String(email || ''), String(code || ''));
        res.json({ success: true, session });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Code invalide',
        });
      }
    }
  );

  // Channel Branding Kit & Live Profile Diagnostics
  router.get('/api/social/branding', async (_req: Request, res: Response) => {
    try {
      const kit = getChannelBrandingKit();
      const liveProfiles = await fetchLiveChannelProfiles();
      res.json({ kit, liveProfiles });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur lecture branding chaînes',
      });
    }
  });

  router.patch('/api/social/branding', (req: Request, res: Response) => {
    const kit = saveChannelBrandingKit(req.body || {});
    res.json({ success: true, kit });
  });

  router.post('/api/social/branding/suggest', async (req: Request, res: Response) => {
    const body = (req.body || {}) as { focus?: string };
    const current = getChannelBrandingKit();
    const projects = getAllProjects();
    const sampleTitles = projects
      .slice(0, 5)
      .map((p) => p.title)
      .join(' | ');
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      res.json({ kit: current, generatedBy: 'template' });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tu es directeur de marque pour un créateur vidéo francophone de Shorts / Reels / TikTok.
Sujets actuels des vidéos : ${sampleTitles || 'Décryptages Tech, IA & Société'}.
Précision utilisateur éventuelle : ${body.focus || 'Même style percutant, visuel papier éditorial, clair et sourcé.'}

Propose un branding unifié cohérent en français en JSON strict avec exactement ces clés :
- brandName (court, mémorable, <= 24 caractères, ex: "Alex Décode")
- handle (format "@nom.court", <= 20 caractères)
- tagline (<= 80 caractères)
- youtubeDescription (3 paragraphes propres, SEO français, <= 700 caractères)
- instagramBio (3 lignes courtes avec 1 emoji discret max, STRICTEMENT <= 145 caractères)
- tiktokBio (1 phrase percutante, STRICTEMENT <= 78 caractères)`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}') as Partial<{
        brandName: string;
        handle: string;
        tagline: string;
        youtubeDescription: string;
        instagramBio: string;
        tiktokBio: string;
      }>;
      const saved = saveChannelBrandingKit(parsed);
      res.json({ kit: saved, generatedBy: 'gemini' });
    } catch {
      res.json({ kit: current, generatedBy: 'template' });
    }
  });

  router.post('/api/social/branding/apply-youtube', async (_req: Request, res: Response) => {
    try {
      const kit = getChannelBrandingKit();
      const updated = await pushYouTubeDescriptionDirect(kit.youtubeDescription);
      res.json({ success: true, ...updated });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Mise à jour YouTube impossible.',
      });
    }
  });

  router.post('/api/social/deploy/railway-env', (req: Request, res: Response) => {
    const body = (req.body || {}) as { includeTregSession?: boolean };
    const session = readTregSession();
    const envBlock = buildRailwayEnvBlock({
      tregToken: session?.token,
      tregOrg: session?.activeOrg,
      includeTregToken: Boolean(body.includeTregSession),
      cronSecret: process.env.CRON_SECRET,
      elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
    res.json({
      envBlock,
      hasTregSession: Boolean(session?.token),
      tregOrg: session?.activeOrg || null,
    });
  });

  router.post('/api/social/treg/logout', (_req: Request, res: Response) => {
    clearTregSession();
    res.json({ success: true, session: getTregSessionPublic() });
  });

  router.post('/api/social/treg/sync', async (_req: Request, res: Response) => {
    try {
      await syncTregConnections();
      reconcilePendingJobsWithAccounts();
      res.json({ success: true, session: getTregSessionPublic() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur synchronisation Treg',
      });
    }
  });

  router.post('/api/social/treg/connect/:platform', async (req: Request, res: Response) => {
    const platform = req.params.platform;
    if (!isValidPlatform(platform)) {
      res.status(400).json({ error: 'Plateforme invalide.' });
      return;
    }
    const body = (req.body || {}) as { authMethod?: 'instagram-login' | 'facebook-page' };
    try {
      const started = await startTregProviderOAuth(platform, {
        authMethod:
          body.authMethod === 'facebook-page' || body.authMethod === 'instagram-login'
            ? body.authMethod
            : undefined,
      });
      res.json(started);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur connexion Treg',
      });
    }
  });

  router.get('/api/social/treg/connect/poll', async (req: Request, res: Response) => {
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const platform = typeof req.query.platform === 'string' ? req.query.platform.trim() : '';
    if (!state || !isValidPlatform(platform)) {
      res.status(400).json({ error: 'Paramètres state/platform invalides.' });
      return;
    }
    try {
      const result = await pollTregProviderOAuth(state, platform);
      if (result.status === 'done') {
        reconcilePendingJobsWithAccounts([platform]);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({
        status: 'error',
        detail: err instanceof Error ? err.message : 'Erreur polling Treg OAuth',
      });
    }
  });

  // Copy & Media Pack Preparation
  router.post('/api/social/generate-copy', async (req: Request, res: Response) => {
    try {
      const { projectId } = (req.body || {}) as { projectId?: string };
      const project = getProject(String(projectId || ''));
      if (!project) {
        res.status(404).json({ error: 'Projet introuvable.' });
        return;
      }
      const copy = await generateAiSocialCopy(project);
      res.json({ copy });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur génération textes',
      });
    }
  });

  router.post('/api/social/prepare-pack', (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        projectId?: string;
        version?: string;
        coverTimestampSec?: number;
        forceReencode?: boolean;
      };
      const project = getProject(String(body.projectId || ''));
      if (!project) {
        res.status(404).json({ error: 'Projet introuvable.' });
        return;
      }
      const pack = prepareMediaPackForProject(project, {
        version: body.version,
        coverTimestampSec: body.coverTimestampSec,
        forceReencode: body.forceReencode,
      });
      res.json({ pack });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur préparation pack',
      });
    }
  });

  // Serve prepared pack assets (preview / download)
  router.get(
    '/api/social/packs/:projectId/:version/:filename',
    (req: Request, res: Response) => {
      const safeProj = path.basename(req.params.projectId);
      const safeVer = path.basename(req.params.version);
      const safeFile = path.basename(req.params.filename);
      if (!['social.mp4', 'cover.jpg', 'post.md', 'published.md'].includes(safeFile)) {
        res.status(404).send('Fichier non autorisé');
        return;
      }
      const filePath = path.join(
        SOCIAL_PACKS_DIR,
        safeProj,
        safeVer,
        safeFile
      );
      if (!fs.existsSync(filePath)) {
        res.status(404).send('Asset introuvable');
        return;
      }
      res.sendFile(filePath);
    }
  );

  // Public temporary media endpoint for Instagram Graph API container ingestion
  router.get(
    '/api/social/public-media/:token/:filename',
    (req: Request, res: Response) => {
      const dirPath = resolvePublicMediaDir(req.params.token);
      const safeFile = path.basename(req.params.filename);
      if (!dirPath || !['social.mp4', 'cover.jpg'].includes(safeFile)) {
        res.status(404).send('Média expiré ou introuvable');
        return;
      }
      const fullPath = path.join(dirPath, safeFile);
      if (!fs.existsSync(fullPath)) {
        res.status(404).send('Fichier manquant');
        return;
      }
      res.sendFile(fullPath);
    }
  );

  // Queue & Schedule CRUD
  router.get('/api/social/queue', (_req: Request, res: Response) => {
    res.json({
      queue: getScheduledQueue(),
      logs: getPublishLogs(60),
      scheduler: getSchedulerState(),
    });
  });

  router.post('/api/social/schedule', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        projectId?: string;
        version?: string;
        platforms?: SocialPlatform[];
        scheduledAt?: string;
        publishNow?: boolean;
        timezone?: string;
        youtubeTitle?: string;
        youtubeDescription?: string;
        caption?: string;
        tiktokCaption?: string;
        hashtags?: string[];
        coverTimestampSec?: number;
        privacy?: 'public' | 'unlisted' | 'private';
        routeOverride?: PublishRoute;
        fallbackToManual?: boolean;
      };
      const result = await createScheduledPostsForProject({
        projectId: String(body.projectId || ''),
        version: body.version,
        platforms: Array.isArray(body.platforms) ? body.platforms : [],
        scheduledAt: body.scheduledAt,
        publishNow: body.publishNow,
        timezone: body.timezone,
        youtubeTitle: body.youtubeTitle,
        youtubeDescription: body.youtubeDescription,
        caption: body.caption,
        tiktokCaption: body.tiktokCaption,
        hashtags: body.hashtags,
        coverTimestampSec: body.coverTimestampSec,
        privacy: body.privacy,
        routeOverride: body.routeOverride,
        fallbackToManual: body.fallbackToManual,
      });
      res.json({
        success: true,
        ...result,
        queue: getScheduledQueue(),
        logs: getPublishLogs(60),
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur programmation',
      });
    }
  });

  router.patch('/api/social/queue/:id', (req: Request, res: Response) => {
    const existing = getScheduledPost(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Publication planifiée introuvable.' });
      return;
    }
    const body = (req.body || {}) as {
      status?: ScheduledPostItem['status'];
      scheduledAt?: string;
      publishedUrl?: string;
      route?: PublishRoute;
      youtubeTitle?: string;
      caption?: string;
      tiktokCaption?: string;
      notes?: string;
    };

    const next: ScheduledPostItem = {
      ...existing,
      ...(body.status ? { status: body.status } : {}),
      ...(body.scheduledAt && Number.isFinite(Date.parse(body.scheduledAt))
        ? { scheduledAt: new Date(body.scheduledAt).toISOString(), status: body.status || 'scheduled' }
        : {}),
      ...(typeof body.publishedUrl === 'string'
        ? { publishedUrl: body.publishedUrl.trim() || undefined }
        : {}),
      ...(body.route && ['oauth', 'treg', 'manual'].includes(body.route)
        ? { route: body.route }
        : {}),
      ...(typeof body.youtubeTitle === 'string'
        ? { youtubeTitle: truncateForYouTubeTitle(body.youtubeTitle, 60) }
        : {}),
      ...(typeof body.caption === 'string' ? { caption: body.caption } : {}),
      ...(typeof body.tiktokCaption === 'string'
        ? { tiktokCaption: body.tiktokCaption }
        : {}),
      ...(typeof body.notes === 'string' ? { notes: body.notes } : {}),
    };

    if (body.status === 'published' && !existing.publishedAt) {
      next.publishedAt = new Date().toISOString();
      next.errorMessage = undefined;
      if (!body.notes) {
        next.notes = next.publishedUrl
          ? `Publié manuellement (${next.publishedUrl})`
          : 'Publié manuellement et validé.';
      }
      appendPublishLog({
        jobId: next.id,
        projectTitle: next.projectTitle,
        platform: next.platform,
        route: next.route,
        level: 'success',
        message: `Publication manuelle confirmée sur ${PLATFORM_META[next.platform].name}${next.publishedUrl ? ` (${next.publishedUrl})` : ''}.`,
      });
    }

    const saved = upsertScheduledPost(next);
    res.json({ success: true, job: saved, queue: getScheduledQueue() });
  });

  router.post('/api/social/queue/retry-all', async (_req: Request, res: Response) => {
    try {
      reconcilePendingJobsWithAccounts();
      const queue = getScheduledQueue();
      const recoverable = queue.filter(
        (j) => j.status === 'failed' || j.status === 'awaiting_manual'
      );
      const results: ScheduledPostItem[] = [];
      for (const job of recoverable) {
        results.push(await executeScheduledJob(job.id, { isManualRetry: true }));
      }
      res.json({
        success: true,
        retriedCount: results.length,
        publishedCount: results.filter((r) => r.status === 'published').length,
        queue: getScheduledQueue(),
        logs: getPublishLogs(60),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Échec relance groupée',
      });
    }
  });

  router.post(
    '/api/social/queue/:id/publish-now',
    async (req: Request, res: Response) => {
      try {
        const updated = await executeScheduledJob(req.params.id, { isManualRetry: true });
        res.json({
          success: true,
          job: updated,
          queue: getScheduledQueue(),
          logs: getPublishLogs(60),
        });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Échec exécution',
        });
      }
    }
  );

  router.delete('/api/social/queue/:id', (req: Request, res: Response) => {
    const ok = deleteScheduledPost(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Élément introuvable.' });
      return;
    }
    res.json({ success: true, queue: getScheduledQueue() });
  });

  // Treg + Watchlist Outliers Discovery
  router.get('/api/outliers/watchlist', (_req: Request, res: Response) => {
    const watchlist = readCompetitorsWatchlist();
    res.json({
      watchlist,
      tregLoggedIn: Boolean(readTregSession()?.token),
    });
  });

  router.post('/api/outliers/scan', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as { handle?: string; focus?: string };
      const result = await scanWatchlistOutliers({
        handle: body.handle,
        focus: body.focus,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur scan Outliers',
      });
    }
  });

  return router;
}
