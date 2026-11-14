import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  SOCIAL_DIR,
  getRawSocialAccounts,
  initSocialStorage,
  issuePublicMediaToken,
  saveRawSocialAccount,
} from './socialStorage';
import { truncateForYouTubeTitle } from '../engine/socialCopy';
import type {
  PreparedMediaAssets,
  ScheduledPostItem,
  SocialAccountSecretRecord,
  SocialPlatform,
  TregConnectionSummary,
  TregSessionPublic,
} from '../types/social';

export const TREG_BASE_URL = (process.env.TREG_URL || 'https://treg.to')
  .trim()
  .replace(/\/+$/, '');
export const TREG_SESSION_FILE = path.join(SOCIAL_DIR, 'treg-session.json');

export interface TregSessionRecord {
  token: string;
  email?: string;
  activeOrg?: string;
  isIdentity?: boolean;
  connections?: TregConnectionSummary[];
  updatedAt: string;
}

function getCliConfigPath(): string {
  return path.join(os.homedir(), '.treg', 'config.json');
}

export function readTregSession(): TregSessionRecord | null {
  initSocialStorage();
  const envToken = (process.env.TREG_TOKEN || '').trim();
  const envOrg = (process.env.TREG_ORG || '').trim() || undefined;

  if (fs.existsSync(TREG_SESSION_FILE)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(TREG_SESSION_FILE, 'utf-8')
      ) as Partial<TregSessionRecord>;
      if (parsed.token) {
        return {
          token: envToken || parsed.token,
          email: parsed.email,
          activeOrg: envOrg || parsed.activeOrg,
          isIdentity: parsed.isIdentity,
          connections: Array.isArray(parsed.connections) ? parsed.connections : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // fallback below
    }
  }

  if (envToken) {
    return {
      token: envToken,
      activeOrg: envOrg,
      updatedAt: new Date().toISOString(),
    };
  }

  // Fallback to local ~/.treg/config.json if user logged in via CLI
  const cliFile = getCliConfigPath();
  if (fs.existsSync(cliFile)) {
    try {
      const cliCfg = JSON.parse(fs.readFileSync(cliFile, 'utf-8')) as {
        token?: string;
        email?: string;
        active_org?: string;
        identity?: boolean;
      };
      if (cliCfg.token) {
        return {
          token: cliCfg.token,
          email: cliCfg.email,
          activeOrg: cliCfg.active_org,
          isIdentity: cliCfg.identity,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function saveTregSession(session: TregSessionRecord): TregSessionRecord {
  initSocialStorage();
  const next: TregSessionRecord = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(TREG_SESSION_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function clearTregSession(): void {
  initSocialStorage();
  if (fs.existsSync(TREG_SESSION_FILE)) {
    fs.unlinkSync(TREG_SESSION_FILE);
  }
}

function buildTregHeaders(
  session: Pick<TregSessionRecord, 'token' | 'activeOrg'> | null,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Studio-Short-Agent/1.0',
    'X-Treg-Client': 'studio-short',
    'X-Treg-Key-Protocol': '1',
    ...(extra || {}),
  };
  if (session?.token) {
    headers['X-Treg-Token'] = session.token;
    if (session.activeOrg) {
      headers['X-Treg-Org'] = session.activeOrg;
    }
  }
  return headers;
}

async function tregFetch(
  apiPath: string,
  options: {
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: string | Buffer;
    headers?: Record<string, string>;
    session?: Pick<TregSessionRecord, 'token' | 'activeOrg'> | null;
    redirect?: 'manual' | 'follow';
  } = {}
): Promise<{ status: number; headers: Headers; text: string }> {
  const url = new URL(`${TREG_BASE_URL}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const doSend = async (useBase64Body: boolean) => {
    const headers = buildTregHeaders(options.session ?? null, options.headers);
    let bodyToSend = options.body;
    if (useBase64Body && options.body) {
      const buf = Buffer.isBuffer(options.body)
        ? options.body
        : Buffer.from(options.body, 'utf-8');
      bodyToSend = buf.toString('base64');
      headers['X-Treg-Body-Encoding'] = 'base64';
    }
    const res = await fetch(url.toString(), {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers,
      body: bodyToSend as BodyInit | undefined,
      redirect: options.redirect || 'follow',
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  };

  const first = await doSend(false);
  const ct = (first.headers.get('content-type') || '').toLowerCase();
  if (first.status === 403 && options.body && ct.includes('html')) {
    return doSend(true);
  }
  return first;
}

function parseJsonSafe<T = Record<string, unknown>>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function detectCliInstalled(): { installed: boolean; version?: string } {
  const pathEnv = `${process.env.PATH || ''}:${path.join(os.homedir(), '.local/bin')}`;
  try {
    const ver = spawnSync('treg', ['--version'], {
      encoding: 'utf-8',
      timeout: 3000,
      env: { ...process.env, PATH: pathEnv },
    });
    if (ver.status === 0) {
      return { installed: true, version: (ver.stdout || '').trim() };
    }
  } catch {
    // ignore
  }
  return { installed: false };
}

function mapProviderToPlatform(providerRaw: string): SocialPlatform | undefined {
  const p = providerRaw.toLowerCase();
  if (p === 'youtube' || p.includes('youtube')) return 'youtube';
  if (p === 'instagram' || p.includes('instagram')) return 'instagram';
  if (p === 'tiktok' || p.includes('tiktok')) return 'tiktok';
  return undefined;
}

export async function finalizeTregSessionFromToken(
  token: string,
  hintEmail?: string,
  hintOrg?: string
): Promise<TregSessionRecord> {
  const baseSession: TregSessionRecord = {
    token,
    email: hintEmail,
    activeOrg: hintOrg,
    isIdentity: true,
    updatedAt: new Date().toISOString(),
  };

  // Resolve email if missing
  if (!baseSession.email) {
    try {
      const meRes = await tregFetch('/auth/me', { session: baseSession });
      if (meRes.status === 200) {
        const me = parseJsonSafe<{ email?: string }>(meRes.text);
        if (me?.email) baseSession.email = me.email;
      }
    } catch {
      // best effort
    }
  }

  // Pick active org from /orgs
  try {
    const orgsRes = await tregFetch('/orgs', { session: baseSession });
    if (orgsRes.status === 200) {
      const orgs = parseJsonSafe<Array<{ slug?: string; active?: boolean }>>(orgsRes.text);
      if (Array.isArray(orgs) && orgs.length > 0) {
        const chosen =
          orgs.find((o) => o.active) ||
          orgs.find((o) => o.slug === baseSession.activeOrg) ||
          orgs[0];
        if (chosen?.slug) {
          baseSession.activeOrg = chosen.slug;
        }
      }
    }
  } catch {
    // best effort
  }

  // Pin token to active org's Default key so it works identically across servers/containers
  if (baseSession.activeOrg) {
    try {
      const pinRes = await tregFetch('/auth/cli-token', {
        session: baseSession,
        headers: { 'X-Treg-Org': baseSession.activeOrg },
      });
      if (pinRes.status === 200) {
        const pinJson = parseJsonSafe<{
          token?: string;
          org?: string;
          default_key_state?: string;
        }>(pinRes.text);
        if (
          pinJson?.token &&
          pinJson.org === baseSession.activeOrg &&
          (!pinJson.default_key_state || pinJson.default_key_state === 'active')
        ) {
          baseSession.token = pinJson.token;
          baseSession.isIdentity = false;
        }
      }
    } catch {
      // keep identity token
    }
  }

  const saved = saveTregSession(baseSession);
  await syncTregConnections().catch(() => []);
  return readTregSession() || saved;
}

export async function startTregBrowserLogin(): Promise<{
  loginId: string;
  pairingCode?: string;
  loginUrl: string;
}> {
  const startRes = await tregFetch('/auth/cli/start', { method: 'POST' });
  const data = parseJsonSafe<{ login_id?: string; code?: string }>(startRes.text);
  const loginId =
    data?.login_id ||
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const pairingCode = data?.code || undefined;
  let loginUrl = `${TREG_BASE_URL}/login?cli=${encodeURIComponent(loginId)}`;
  if (pairingCode) {
    loginUrl += `#code=${encodeURIComponent(pairingCode)}`;
  }
  return { loginId, pairingCode, loginUrl };
}

export async function pollTregBrowserLogin(loginId: string): Promise<{
  status: 'pending' | 'done';
  session?: TregSessionPublic;
}> {
  const pollRes = await tregFetch('/auth/cli/poll', {
    query: { login_id: loginId },
  });
  const data = parseJsonSafe<{
    token?: string;
    email?: string;
    active_org?: string;
  }>(pollRes.text);
  if (!data?.token) {
    return { status: 'pending' };
  }
  await finalizeTregSessionFromToken(data.token, data.email, data.active_org);
  return {
    status: 'done',
    session: getTregSessionPublic(),
  };
}

export async function loginTregWithToken(rawToken: string): Promise<TregSessionPublic> {
  const token = rawToken.trim();
  if (!token) {
    throw new Error('Token Treg requis.');
  }
  const probe = await tregFetch('/auth/me', {
    session: { token },
  });
  if (probe.status === 401) {
    throw new Error('Token Treg refusé (401). Générez un nouveau token sur treg.to.');
  }
  if (probe.status >= 400) {
    throw new Error(`Erreur vérification token Treg (HTTP ${probe.status}).`);
  }
  const me = parseJsonSafe<{ email?: string }>(probe.text);
  await finalizeTregSessionFromToken(token, me?.email);
  return getTregSessionPublic();
}

export async function startTregEmailLogin(email: string): Promise<{
  requiresBrowser?: boolean;
  loginUrl?: string;
  pairingCode?: string;
  loginId?: string;
  devCode?: string;
  message: string;
}> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Adresse email invalide.');
  }
  const startRes = await tregFetch('/auth/email/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail }),
  });
  if (
    startRes.status === 400 &&
    startRes.headers.get('x-treg-captcha') === 'required'
  ) {
    const browserStart = await startTregBrowserLogin();
    return {
      requiresBrowser: true,
      ...browserStart,
      message:
        'Ce registre demande une validation navigateur : ouvrez le lien ci-dessous pour vous connecter en 1 clic.',
    };
  }
  if (startRes.status >= 400) {
    const errObj = parseJsonSafe<{ detail?: string; error?: string }>(startRes.text);
    throw new Error(errObj?.detail || errObj?.error || `Erreur Treg (${startRes.status})`);
  }
  const data = parseJsonSafe<{ dev_code?: string }>(startRes.text);
  return {
    devCode: data?.dev_code,
    message: `Code à 6 chiffres envoyé à ${cleanEmail}.`,
  };
}

export async function verifyTregEmailLogin(
  email: string,
  code: string
): Promise<TregSessionPublic> {
  const verifyRes = await tregFetch('/auth/email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });
  if (verifyRes.status >= 400) {
    const errObj = parseJsonSafe<{ detail?: string; error?: string }>(verifyRes.text);
    throw new Error(errObj?.detail || errObj?.error || `Code invalide (${verifyRes.status}).`);
  }
  const data = parseJsonSafe<{ token?: string; email?: string }>(verifyRes.text);
  if (!data?.token) {
    throw new Error('Réponse Treg incomplète (token absent).');
  }
  await finalizeTregSessionFromToken(data.token, data.email || email.trim());
  return getTregSessionPublic();
}

export async function syncTregConnections(): Promise<TregConnectionSummary[]> {
  const session = readTregSession();
  if (!session?.token) return [];

  const res = await tregFetch('/connections', { session });
  if (res.status !== 200) {
    return session.connections || [];
  }

  const parsed = parseJsonSafe<
    | Array<{
        id?: string | number;
        provider?: string;
        service?: string;
        name?: string;
        status?: string;
        health?: string;
        resource_ref?: string;
      }>
    | {
        connections?: Array<{
          id?: string | number;
          provider?: string;
          service?: string;
          name?: string;
          status?: string;
          health?: string;
          resource_ref?: string;
        }>;
      }
  >(res.text);

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.connections)
      ? parsed.connections
      : [];

  const mapped: TregConnectionSummary[] = list.map((c) => {
    const provider = String(c.provider || c.service || '');
    return {
      id: String(c.id ?? ''),
      provider,
      platform: mapProviderToPlatform(provider),
      name: c.name || undefined,
      status: c.status || c.health || 'active',
      resourceRef: c.resource_ref || undefined,
    };
  });

  saveTregSession({ ...session, connections: mapped });

  // Sync discovered connections into accounts.json cleanly
  const rawAccounts = getRawSocialAccounts();
  for (const conn of mapped) {
    if (!conn.platform) continue;
    const acc = rawAccounts[conn.platform];
    const patch: Partial<SocialAccountSecretRecord> = {
      tregConnectionId: conn.id,
      tregResourceRef: conn.resourceRef || acc.tregResourceRef,
    };
    if (conn.platform === 'instagram' && conn.resourceRef && /^\d+$/.test(conn.resourceRef)) {
      patch.igUserId = conn.resourceRef;
    }
    if (!acc.connected) {
      patch.route = 'treg';
      patch.connected = true;
      patch.accountName = conn.name || acc.accountName || `Treg (${conn.provider})`;
      patch.connectedAt = acc.connectedAt || new Date().toISOString();
      patch.lastError = undefined;
    } else if (acc.route === 'treg') {
      patch.accountName = conn.name || acc.accountName;
      patch.lastError = undefined;
    }
    saveRawSocialAccount(conn.platform, patch);
  }

  return mapped;
}

export async function startTregProviderOAuth(platform: SocialPlatform): Promise<{
  state: string;
  consentUrl: string;
  redirectUri?: string;
  consentNotice?: string;
}> {
  const session = readTregSession();
  if (!session?.token) {
    throw new Error(
      'Connectez d’abord votre session Treg en 1 clic avant de lier un réseau.'
    );
  }

  const capability = platform === 'instagram' ? 'manage' : 'post';
  const res = await tregFetch('/oauth/start', {
    method: 'POST',
    session,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: platform,
      capability,
      name: `studio-${platform}`,
    }),
  });
  const data = parseJsonSafe<{
    state?: string;
    consent_url?: string;
    redirect_uri?: string;
    connect_guidance?: string;
    detail?: string;
    error?: string;
  }>(res.text);

  if (res.status !== 200 || !data?.consent_url || !data?.state) {
    throw new Error(
      data?.detail ||
        data?.error ||
        `Impossible de démarrer la connexion Treg pour ${platform} (HTTP ${res.status}).`
    );
  }

  return {
    state: data.state,
    consentUrl: data.consent_url,
    redirectUri: data.redirect_uri,
    consentNotice: data.connect_guidance,
  };
}

export async function pollTregProviderOAuth(
  state: string,
  platform: SocialPlatform
): Promise<{
  status: 'pending' | 'done' | 'error';
  detail?: string;
  connections?: TregConnectionSummary[];
}> {
  const session = readTregSession();
  if (!session?.token) {
    return { status: 'error', detail: 'Session Treg expirée.' };
  }

  const res = await tregFetch(`/oauth/status/${encodeURIComponent(state)}`, {
    session,
  });
  const data = parseJsonSafe<{
    status?: string;
    secret_id?: string | number;
    name?: string;
    detail?: string;
  }>(res.text);

  if (data?.status === 'error') {
    return { status: 'error', detail: data.detail || 'Autorisation refusée ou expirée.' };
  }
  if (data?.status !== 'done') {
    return { status: 'pending' };
  }

  const connections = await syncTregConnections();
  const match =
    connections.find((c) => c.id === String(data.secret_id)) ||
    connections.find((c) => c.platform === platform);

  // Discover resources (e.g. IG Business Account ID or YouTube Channel)
  if (match?.id) {
    try {
      const rRes = await tregFetch(`/connections/${encodeURIComponent(match.id)}/resources`, {
        session,
      });
      if (rRes.status === 200) {
        const rList = parseJsonSafe<
          Array<{ ref?: string; id?: string; name?: string; username?: string }>
        >(rRes.text);
        if (Array.isArray(rList) && rList.length > 0) {
          const first = rList[0];
          const resourceRef = first.ref || first.id;
          if (resourceRef) {
            await tregFetch(`/connections/${encodeURIComponent(match.id)}/resource`, {
              method: 'POST',
              session,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource_ref: resourceRef }),
            });
            saveRawSocialAccount(platform, {
              tregResourceRef: resourceRef,
              ...(platform === 'instagram' ? { igUserId: resourceRef } : {}),
              ...(first.name ? { accountName: first.name } : {}),
              ...(first.username ? { accountHandle: `@${first.username.replace(/^@/, '')}` } : {}),
            });
          }
        }
      }
    } catch {
      // resource discovery is optional
    }
  }

  saveRawSocialAccount(platform, {
    route: 'treg',
    connected: true,
    tregConnectionId: match?.id || String(data.secret_id || ''),
    accountName: data?.name || match?.name || `Treg · ${platform}`,
    connectedAt: new Date().toISOString(),
    lastError: undefined,
  });

  return { status: 'done', connections: await syncTregConnections() };
}

export function getTregSessionPublic(): TregSessionPublic {
  const session = readTregSession();
  const cli = detectCliInstalled();
  const connections = session?.connections || [];
  const connectedPlatforms = Array.from(
    new Set(
      connections
        .map((c) => c.platform)
        .filter((p): p is SocialPlatform => Boolean(p))
    )
  );

  // Also inspect local CLI output if installed and no cached connections yet
  if (cli.installed && connectedPlatforms.length === 0) {
    try {
      const pathEnv = `${process.env.PATH || ''}:${path.join(os.homedir(), '.local/bin')}`;
      const ls = spawnSync('treg', ['connections', 'ls'], {
        encoding: 'utf-8',
        timeout: 4000,
        env: { ...process.env, PATH: pathEnv },
      });
      const out = `${ls.stdout || ''}\n${ls.stderr || ''}`.toLowerCase();
      if (out.includes('youtube')) connectedPlatforms.push('youtube');
      if (out.includes('instagram')) connectedPlatforms.push('instagram');
      if (out.includes('tiktok')) connectedPlatforms.push('tiktok');
    } catch {
      // ignore
    }
  }

  return {
    loggedIn: Boolean(session?.token),
    email: session?.email,
    activeOrg: session?.activeOrg,
    cliInstalled: cli.installed,
    cliVersion: cli.version,
    connectedPlatforms,
    connections,
  };
}

export async function publishViaTregHttp(
  job: ScheduledPostItem,
  account: SocialAccountSecretRecord,
  pack: PreparedMediaAssets,
  publicBaseUrl: string
): Promise<{ publishedUrl: string; externalPostId: string; inboxOnly?: boolean }> {
  const session = readTregSession();
  if (!session?.token) {
    throw new Error(
      'Session Treg absente : cliquez sur « Se connecter à Treg (1 clic) » dans Comptes connectés.'
    );
  }

  if (job.platform === 'youtube') {
    const videoPath = pack.masterMp4Path || pack.socialMp4Path;
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Fichier MP4 introuvable pour upload YouTube via Treg.');
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

    const initRes = await tregFetch('/call/youtube.youtube.video.upload', {
      method: 'POST',
      session,
      query: {
        part: 'id,snippet,status',
        uploadType: 'resumable',
      },
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(stat.size),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    });

    const uploadUrl = initRes.headers.get('location');
    if (initRes.status >= 400 || !uploadUrl) {
      throw new Error(
        `Treg YouTube init HTTP ${initRes.status}: ${initRes.text.slice(0, 220)}`
      );
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
        putJson.error?.message || `Upload binaire YouTube échoué (HTTP ${putRes.status}).`
      );
    }

    if (pack.coverPath && fs.existsSync(pack.coverPath)) {
      try {
        await tregFetch('/call/youtube.youtube.video.thumbnail.set', {
          method: 'POST',
          session,
          query: { videoId: putJson.id, uploadType: 'media' },
          headers: { 'Content-Type': 'image/jpeg' },
          body: fs.readFileSync(pack.coverPath),
        });
      } catch {
        // custom thumbnail requires verified channel; non-fatal
      }
    }

    return {
      externalPostId: putJson.id,
      publishedUrl: `https://youtube.com/shorts/${putJson.id}`,
    };
  }

  if (job.platform === 'instagram') {
    if (!pack.socialMp4Path || !fs.existsSync(pack.socialMp4Path)) {
      throw new Error('Fichier social.mp4 introuvable pour Instagram Reels.');
    }
    let igUserId = (account.igUserId || account.tregResourceRef || '').trim();
    if (!igUserId) {
      const conns = await syncTregConnections();
      const igConn = conns.find((c) => c.platform === 'instagram');
      if (igConn?.resourceRef) igUserId = igConn.resourceRef;
      else if (igConn?.id) {
        const rRes = await tregFetch(`/connections/${encodeURIComponent(igConn.id)}/resources`, {
          session,
        });
        const rList = parseJsonSafe<Array<{ ref?: string; id?: string }>>(rRes.text);
        igUserId = rList?.[0]?.ref || rList?.[0]?.id || '';
      }
    }
    if (!igUserId) {
      throw new Error(
        'ID Instagram Pro manquant : sélectionnez votre compte Instagram ou renseignez son IG User ID dans Config.'
      );
    }

    const mediaToken = issuePublicMediaToken(path.dirname(pack.socialMp4Path), 12);
    const videoUrl = `${publicBaseUrl}/api/social/public-media/${mediaToken}/social.mp4`;
    const coverUrl = pack.coverPath
      ? `${publicBaseUrl}/api/social/public-media/${mediaToken}/cover.jpg`
      : undefined;

    const createRes = await tregFetch('/call/instagram.instagram.media.container.create', {
      method: 'POST',
      session,
      query: {
        ig_user_id: igUserId,
        media_type: 'REELS',
        video_url: videoUrl,
        caption: job.caption,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      },
    });
    const createJson = parseJsonSafe<{ id?: string; error?: { message?: string } }>(
      createRes.text
    );
    if (createRes.status >= 400 || !createJson?.id) {
      throw new Error(
        createJson?.error?.message ||
          `Treg Instagram container HTTP ${createRes.status}: ${createRes.text.slice(0, 220)}`
      );
    }

    const creationId = createJson.id;
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await tregFetch('/call/instagram.instagram.media.container.status', {
        method: 'GET',
        session,
        query: { ig_container_id: creationId, fields: 'status_code,status' },
      });
      const st = parseJsonSafe<{ status_code?: string; status?: string }>(statusRes.text);
      if (st?.status_code === 'FINISHED') break;
      if (st?.status_code === 'ERROR') {
        throw new Error(`Instagram traitement vidéo échoué: ${st.status || 'ERROR'}`);
      }
    }

    const pubRes = await tregFetch('/call/instagram.instagram.post.create', {
      method: 'POST',
      session,
      query: { ig_user_id: igUserId, creation_id: creationId },
    });
    const pubJson = parseJsonSafe<{ id?: string; error?: { message?: string } }>(
      pubRes.text
    );
    if (pubRes.status >= 400 || !pubJson?.id) {
      throw new Error(
        pubJson?.error?.message ||
          `Treg Instagram publish HTTP ${pubRes.status}: ${pubRes.text.slice(0, 220)}`
      );
    }

    return {
      externalPostId: pubJson.id,
      publishedUrl: `https://www.instagram.com/reel/${pubJson.id}/`,
    };
  }

  // TikTok via Treg
  const videoPath = pack.socialMp4Path || pack.masterMp4Path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Fichier MP4 introuvable pour TikTok via Treg.');
  }
  const buffer = fs.readFileSync(videoPath);
  const size = buffer.byteLength;

  let isInbox = false;
  let initRes = await tregFetch('/call/tiktok.tiktok.video.publish.init', {
    method: 'POST',
    session,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_info: {
        title: (job.tiktokCaption || job.caption).slice(0, 2200),
        privacy_level: job.privacy === 'private' ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
        video_cover_timestamp_ms: Math.round((job.coverTimestampSec || 1) * 1000),
        is_aigc: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });
  let initJson = parseJsonSafe<{
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  }>(initRes.text);

  if (
    initRes.status >= 400 ||
    initJson?.error?.code === 'unaudited_client_can_only_post_to_private_accounts' ||
    !initJson?.data?.upload_url
  ) {
    isInbox = true;
    initRes = await tregFetch('/call/tiktok.tiktok.video.inbox.init', {
      method: 'POST',
      session,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: size,
          chunk_size: size,
          total_chunk_count: 1,
        },
      }),
    });
    initJson = parseJsonSafe<{
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    }>(initRes.text);
  }

  if (initRes.status >= 400 || !initJson?.data?.upload_url || !initJson?.data?.publish_id) {
    throw new Error(
      initJson?.error?.message ||
        `Treg TikTok init HTTP ${initRes.status}: ${initRes.text.slice(0, 220)}`
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
      : `https://www.tiktok.com/${account.accountHandle || ''}`,
    inboxOnly: isInbox,
  };
}
