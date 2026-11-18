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
  LiveChannelProfileSnapshot,
  PreparedMediaAssets,
  ScheduledPostItem,
  SocialAccountSecretRecord,
  SocialConnectionProbeResult,
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

function isFacebookPageConnection(c: TregConnectionSummary): boolean {
  return (
    c.authorizationMethod === 'facebook-page' ||
    Boolean(c.name && c.name.startsWith('studio-instagram-page'))
  );
}

function numericConnId(c: TregConnectionSummary): number {
  const n = Number.parseInt(c.id, 10);
  return Number.isFinite(n) ? n : 0;
}

export function selectPreferredInstagramConnection(
  connections: TregConnectionSummary[],
  preferredConnId?: string
): TregConnectionSummary | undefined {
  const igConns = connections.filter((c) => c.platform === 'instagram');
  if (igConns.length === 0) return undefined;

  const sorted = [...igConns].sort((a, b) => numericConnId(b) - numericConnId(a));
  const healthyFbPages = sorted.filter(
    (c) =>
      isFacebookPageConnection(c) &&
      Boolean(c.resourceRef?.trim()) &&
      !c.setupRequired
  );
  if (preferredConnId) {
    const pinnedHealthyFb = healthyFbPages.find((c) => c.id === preferredConnId);
    if (pinnedHealthyFb) return pinnedHealthyFb;
  }
  if (healthyFbPages.length > 0) {
    return healthyFbPages[0];
  }

  if (preferredConnId) {
    const pinnedExplicit = sorted.find((c) => c.id === preferredConnId);
    if (pinnedExplicit) return pinnedExplicit;
  }

  return (
    sorted.find((c) => isFacebookPageConnection(c) && Boolean(c.resourceRef?.trim())) ||
    sorted.find((c) => isFacebookPageConnection(c)) ||
    sorted.find((c) => Boolean(c.resourceRef?.trim()) && !c.setupRequired) ||
    sorted.find((c) => Boolean(c.resourceRef?.trim())) ||
    sorted[0]
  );
}

export function selectPreferredConnection(
  connections: TregConnectionSummary[],
  platform: SocialPlatform,
  preferredConnId?: string
): TregConnectionSummary | undefined {
  if (platform === 'instagram') {
    return selectPreferredInstagramConnection(connections, preferredConnId);
  }
  const matching = connections.filter((c) => c.platform === platform);
  if (matching.length === 0) return undefined;
  const sorted = [...matching].sort((a, b) => numericConnId(b) - numericConnId(a));
  const isHealthy = (c: TregConnectionSummary) =>
    !c.setupRequired && c.health !== 'error' && c.health !== 'expired';

  if (preferredConnId) {
    const pinned = sorted.find((c) => c.id === preferredConnId);
    if (pinned && isHealthy(pinned)) {
      return pinned;
    }
  }

  return (
    sorted.find((c) => isHealthy(c) && Boolean(c.resourceRef?.trim())) ||
    sorted.find((c) => isHealthy(c)) ||
    sorted[0]
  );
}

export function buildNamedTregCallPath(
  connectionName: string | undefined,
  upstreamPath: string,
  fallbackCatalogPath: string
): string {
  const cleanName = (connectionName || '').trim();
  const cleanUpstream = upstreamPath.replace(/^\/+/, '');
  if (cleanName) {
    return `/call/${encodeURIComponent(cleanName)}/${cleanUpstream}`;
  }
  return fallbackCatalogPath;
}

export function isTregAmbiguous409Error(status: number, bodyText: string): boolean {
  if (status !== 409) return false;
  const lower = (bodyText || '').toLowerCase();
  return lower.includes('ambiguous') || lower.includes('multiple tools');
}

export function resolveInstagramPublishTarget(params: {
  conn?: TregConnectionSummary;
  account: Pick<
    SocialAccountSecretRecord,
    'igUserId' | 'tregResourceRef' | 'tregAuthorizationMethod'
  >;
}): { igUserId: string; missingFacebookPage: boolean; namedTool?: string } {
  const { conn, account } = params;
  if (conn && isFacebookPageConnection(conn)) {
    const pageScopedIgId = (conn.resourceRef || '').trim();
    if (!pageScopedIgId) {
      return {
        igUserId: '',
        missingFacebookPage: true,
        namedTool: conn.name,
      };
    }
    return {
      igUserId: pageScopedIgId,
      missingFacebookPage: false,
      namedTool: conn.name,
    };
  }

  return {
    igUserId: (conn?.resourceRef || account.igUserId || account.tregResourceRef || '').trim(),
    missingFacebookPage: false,
    namedTool: conn?.name,
  };
}

export function isNonPublicBaseUrlForMeta(baseUrl: string): boolean {
  const lower = (baseUrl || '').toLowerCase();
  return (
    !lower ||
    lower.includes('ais-dev-') ||
    lower.includes('ais-pre-') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1')
  );
}

async function discoverFacebookPageInstagramAccount(
  connId: string,
  connName: string | undefined,
  session: Pick<TregSessionRecord, 'token' | 'activeOrg'>
): Promise<{
  igUserId?: string;
  igPageId?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  setupRequired: boolean;
  setupDetail?: string;
}> {
  let setupRequired = false;
  let setupDetail: string | undefined;

  try {
    const rRes = await tregFetch(`/connections/${encodeURIComponent(connId)}/resources`, {
      session,
    });
    if (rRes.status === 200) {
      const parsed = parseJsonSafe<
        | Array<{ ref?: string; id?: string; name?: string; username?: string }>
        | {
            selected?: string;
            resources?: Array<{ ref?: string; id?: string; name?: string; username?: string }>;
            setup_required?: boolean;
            setup_detail?: string;
          }
      >(rRes.text);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.resources)
          ? parsed.resources
          : [];
      if (!Array.isArray(parsed)) {
        if (parsed?.setup_required) setupRequired = true;
        if (parsed?.setup_detail) setupDetail = parsed.setup_detail;
      }
      const first = list[0];
      const ref = (first?.ref || first?.id || (!Array.isArray(parsed) ? parsed?.selected : '') || '').trim();
      if (ref) {
        await tregFetch(`/connections/${encodeURIComponent(connId)}/resource`, {
          method: 'POST',
          session,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_ref: ref }),
        }).catch(() => undefined);
        return {
          igUserId: ref,
          name: first?.name,
          username: first?.username,
          setupRequired: false,
        };
      }
    }
  } catch {
    // fallback to /me/accounts below
  }

  if (connName) {
    try {
      const fbRes = await tregFetch(`/call/${encodeURIComponent(connName)}/me/accounts`, {
        method: 'GET',
        session,
        query: {
          fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url}',
        },
      });
      if (fbRes.status === 200) {
        const fbJson = parseJsonSafe<{
          data?: Array<{
            id?: string;
            name?: string;
            instagram_business_account?: {
              id?: string;
              username?: string;
              name?: string;
              profile_picture_url?: string;
            };
          }>;
        }>(fbRes.text);
        const pages = fbJson?.data || [];
        const withIg = pages.find((p) => p.instagram_business_account?.id);
        const ig = withIg?.instagram_business_account;
        if (ig?.id) {
          await tregFetch(`/connections/${encodeURIComponent(connId)}/resource`, {
            method: 'POST',
            session,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource_ref: ig.id }),
          }).catch(() => undefined);
          return {
            igUserId: ig.id,
            igPageId: withIg?.id,
            name: ig.name || withIg?.name,
            username: ig.username,
            avatarUrl: ig.profile_picture_url,
            setupRequired: false,
          };
        }
        setupRequired = true;
        const pageNames = pages
          .map((p) => (p.name || p.id || '').trim())
          .filter(Boolean);
        if (pageNames.length === 0) {
          setupDetail =
            "Aucune Page Facebook n'a été retournée sur le profil Facebook autorisé. Liez votre compte Instagram Pro à une Page Facebook puis reconnectez en cochant bien la Page.";
        } else {
          setupDetail = `Facebook a bien trouvé votre Page « ${pageNames.join(', ')} », mais aucun compte Instagram Professionnel n’y est encore rattaché. Dans l’app Instagram → Modifier le profil → Page, liez votre compte à « ${pageNames[0]} » puis cliquez sur « Reconnecter Page Facebook (Reels) ».`;
        }
      }
    } catch {
      // keep previous setupRequired info
    }
  }

  return {
    setupRequired: setupRequired || true,
    setupDetail:
      setupDetail ||
      "Aucune Page Facebook liée à un compte Instagram Pro n'a été retournée par Meta.",
  };
}

export async function syncTregConnections(): Promise<TregConnectionSummary[]> {
  const session = readTregSession();
  if (!session?.token) return [];

  const res = await tregFetch('/connections', { session });
  if (res.status !== 200) {
    return session.connections || [];
  }

  type RawConn = {
    id?: string | number;
    provider?: string;
    service?: string;
    name?: string;
    status?: string;
    health?: string;
    health_detail?: string;
    authorization_method?: string;
    resource_ref?: string;
  };

  const parsed = parseJsonSafe<RawConn[] | { connections?: RawConn[] }>(res.text);

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.connections)
      ? parsed.connections
      : [];

  const mapped: TregConnectionSummary[] = list.map((c) => {
    const provider = String(c.provider || c.service || '');
    const health = c.health || c.status || 'active';
    return {
      id: String(c.id ?? ''),
      provider,
      platform: mapProviderToPlatform(provider),
      name: c.name || undefined,
      status: c.status || c.health || 'active',
      health,
      healthDetail: c.health_detail || undefined,
      setupRequired: health === 'setup_required',
      authorizationMethod: c.authorization_method || undefined,
      resourceRef: c.resource_ref || undefined,
    };
  });

  // For Instagram Facebook Page connections missing resourceRef, probe /resources + /me/accounts live
  const preferredIg = selectPreferredInstagramConnection(mapped);
  let discoveredPageMeta:
    | {
        igUserId?: string;
        igPageId?: string;
        name?: string;
        username?: string;
        avatarUrl?: string;
      }
    | undefined;
  if (preferredIg && isFacebookPageConnection(preferredIg) && !preferredIg.resourceRef) {
    const probe = await discoverFacebookPageInstagramAccount(
      preferredIg.id,
      preferredIg.name,
      session
    );
    if (probe.igUserId) {
      preferredIg.resourceRef = probe.igUserId;
      preferredIg.setupRequired = false;
      preferredIg.health = 'ok';
      preferredIg.healthDetail = undefined;
      discoveredPageMeta = probe;
    } else {
      preferredIg.setupRequired = true;
      preferredIg.health = 'setup_required';
      preferredIg.healthDetail = probe.setupDetail || preferredIg.healthDetail;
    }
  }

  saveTregSession({ ...session, connections: mapped });

  // Sync discovered connections into accounts.json cleanly (prefer newest healthy & facebook-page for Instagram)
  const rawAccounts = getRawSocialAccounts();
  for (const platform of ['youtube', 'instagram', 'tiktok'] as SocialPlatform[]) {
    const existingAcc = rawAccounts[platform];
    // Respect explicit selection when tregConnectionName is already persisted; otherwise pick newest healthy
    const preferredId = existingAcc.tregConnectionName
      ? existingAcc.tregConnectionId
      : undefined;
    const conn = selectPreferredConnection(mapped, platform, preferredId);
    if (!conn) continue;

    const isIgFbPage = platform === 'instagram' && isFacebookPageConnection(conn);
    const patch: Partial<SocialAccountSecretRecord> = {
      tregConnectionId: conn.id,
      tregConnectionName: conn.name,
      tregResourceRef: conn.resourceRef || (isIgFbPage ? undefined : existingAcc.tregResourceRef),
      tregAuthorizationMethod: conn.authorizationMethod || existingAcc.tregAuthorizationMethod,
      tregSetupRequired: Boolean(conn.setupRequired || (isIgFbPage && !conn.resourceRef)),
      tregSetupDetail:
        conn.setupRequired || (isIgFbPage && !conn.resourceRef)
          ? conn.healthDetail ||
            "Aucune Page Facebook liée à un compte Instagram Pro n'a été retournée par Meta."
          : undefined,
    };
    if (platform === 'instagram') {
      if (conn.resourceRef && /^\d+$/.test(conn.resourceRef)) {
        patch.igUserId = conn.resourceRef;
      }
      if (discoveredPageMeta?.igPageId) patch.igPageId = discoveredPageMeta.igPageId;
      if (discoveredPageMeta?.username) {
        patch.accountHandle = `@${discoveredPageMeta.username.replace(/^@/, '')}`;
      }
      if (discoveredPageMeta?.avatarUrl) patch.avatarUrl = discoveredPageMeta.avatarUrl;
    }
    if (
      !existingAcc.connected ||
      existingAcc.route === 'manual' ||
      (existingAcc.route === 'oauth' && !existingAcc.accessToken)
    ) {
      patch.route = 'treg';
      patch.connected = true;
      patch.accountName =
        discoveredPageMeta?.name || conn.name || existingAcc.accountName || `Treg (${conn.provider})`;
      patch.connectedAt = existingAcc.connectedAt || new Date().toISOString();
      patch.lastError = undefined;
    } else if (existingAcc.route === 'treg') {
      patch.accountName = discoveredPageMeta?.name || existingAcc.accountName || conn.name;
      patch.lastError = undefined;
    }
    saveRawSocialAccount(platform, patch);
  }

  return mapped;
}

export async function startTregProviderOAuth(
  platform: SocialPlatform,
  options?: { authMethod?: 'instagram-login' | 'facebook-page' }
): Promise<{
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

  const useFbPage = platform === 'instagram' && options?.authMethod === 'facebook-page';
  const capability = useFbPage
    ? 'page-tools'
    : platform === 'instagram'
      ? 'manage'
      : 'post';
  const connName = useFbPage ? 'studio-instagram-page' : `studio-${platform}`;

  const res = await tregFetch('/oauth/start', {
    method: 'POST',
    session,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: platform,
      capability,
      name: connName,
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
    selectPreferredConnection(connections, platform);

  let setupWarningDetail: string | undefined;

  // Discover resources (e.g. IG Business Account ID or YouTube Channel)
  if (match?.id) {
    if (platform === 'instagram' && isFacebookPageConnection(match)) {
      const fbProbe = await discoverFacebookPageInstagramAccount(match.id, match.name, session);
      if (fbProbe.igUserId) {
        saveRawSocialAccount('instagram', {
          igUserId: fbProbe.igUserId,
          igPageId: fbProbe.igPageId,
          tregResourceRef: fbProbe.igUserId,
          tregSetupRequired: false,
          tregSetupDetail: undefined,
          ...(fbProbe.name ? { accountName: fbProbe.name } : {}),
          ...(fbProbe.username ? { accountHandle: `@${fbProbe.username.replace(/^@/, '')}` } : {}),
          ...(fbProbe.avatarUrl ? { avatarUrl: fbProbe.avatarUrl } : {}),
        });
      } else {
        setupWarningDetail = fbProbe.setupDetail;
        saveRawSocialAccount('instagram', {
          tregResourceRef: undefined,
          tregSetupRequired: true,
          tregSetupDetail: fbProbe.setupDetail,
        });
      }
    } else {
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
              }).catch(() => undefined);
              saveRawSocialAccount(platform, {
                tregResourceRef: resourceRef,
                tregSetupRequired: false,
                tregSetupDetail: undefined,
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
  }

  saveRawSocialAccount(platform, {
    route: 'treg',
    connected: true,
    tregConnectionId: match?.id || String(data.secret_id || ''),
    tregConnectionName: match?.name || data?.name,
    tregAuthorizationMethod: match?.authorizationMethod,
    tregSetupRequired: Boolean(setupWarningDetail || match?.setupRequired),
    tregSetupDetail: setupWarningDetail || match?.healthDetail,
    accountName: match?.name || data?.name || `Treg · ${platform}`,
    connectedAt: new Date().toISOString(),
    lastError: undefined,
  });

  return {
    status: 'done',
    detail: setupWarningDetail,
    connections: await syncTregConnections(),
  };
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

function orderCandidateConnections(
  connections: TregConnectionSummary[],
  platform: SocialPlatform,
  preferredConnId?: string,
  preferredConnName?: string
): TregConnectionSummary[] {
  const matching = connections.filter((c) => c.platform === platform && Boolean(c.name?.trim()));
  if (matching.length === 0) return [];
  const preferred =
    selectPreferredConnection(connections, platform, preferredConnId) ||
    (preferredConnName
      ? matching.find((c) => c.name === preferredConnName)
      : undefined);

  const rest = matching
    .filter((c) => c.id !== preferred?.id)
    .sort((a, b) => numericConnId(b) - numericConnId(a));

  const healthyRest = rest.filter(
    (c) => !c.setupRequired && c.health !== 'error' && c.health !== 'expired'
  );
  const otherRest = rest.filter((c) => !healthyRest.includes(c));
  return [preferred, ...healthyRest, ...otherRest].filter(
    (c): c is TregConnectionSummary => Boolean(c)
  );
}

export async function callTregWithNamedFallback(params: {
  platform: SocialPlatform;
  account: Pick<SocialAccountSecretRecord, 'tregConnectionId' | 'tregConnectionName'>;
  session: TregSessionRecord;
  upstreamPath: string;
  fallbackCatalogPath: string;
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: string | Buffer;
  skipPersistUsedConnection?: boolean;
}): Promise<{
  status: number;
  headers: Headers;
  text: string;
  usedConnection?: TregConnectionSummary;
}> {
  let conns = params.session.connections?.length
    ? params.session.connections
    : await syncTregConnections();
  let candidates = orderCandidateConnections(
    conns,
    params.platform,
    params.account.tregConnectionId,
    params.account.tregConnectionName
  );

  // If account had tregConnectionName cached even before connections array populated
  const fallbackNamed = params.account.tregConnectionName?.trim();
  const triedPaths = new Set<string>();
  let lastRes: { status: number; headers: Headers; text: string } | null = null;
  let lastConn: TregConnectionSummary | undefined;

  const invoke = async (apiPath: string) =>
    tregFetch(apiPath, {
      method: params.method,
      query: params.query,
      headers: params.headers,
      body: params.body,
      session: params.session,
    });

  // 1. Try known named connections in priority order
  for (const conn of candidates) {
    const apiPath = buildNamedTregCallPath(
      conn.name,
      params.upstreamPath,
      params.fallbackCatalogPath
    );
    if (triedPaths.has(apiPath)) continue;
    triedPaths.add(apiPath);
    const res = await invoke(apiPath);
    lastRes = res;
    lastConn = conn;
    if (res.status < 400) {
      if (
        !params.skipPersistUsedConnection &&
        (conn.id !== params.account.tregConnectionId ||
          conn.name !== params.account.tregConnectionName)
      ) {
        saveRawSocialAccount(params.platform, {
          tregConnectionId: conn.id,
          tregConnectionName: conn.name,
        });
      }
      return { ...res, usedConnection: conn };
    }
    // Retry next connection only on Treg tool ambiguity or auth/permission failure
    if (
      !isTregAmbiguous409Error(res.status, res.text) &&
      res.status !== 401 &&
      res.status !== 403 &&
      res.status !== 404
    ) {
      return { ...res, usedConnection: conn };
    }
  }

  // 2. If account stored a tregConnectionName not in candidates, try it
  if (fallbackNamed) {
    const directPath = buildNamedTregCallPath(
      fallbackNamed,
      params.upstreamPath,
      params.fallbackCatalogPath
    );
    if (!triedPaths.has(directPath)) {
      triedPaths.add(directPath);
      const res = await invoke(directPath);
      lastRes = res;
      if (res.status < 400) {
        return { ...res, usedConnection: lastConn };
      }
    }
  }

  // 3. Fallback to generic catalog path ONLY if no named candidate existed or returned 404
  if (candidates.length === 0 && !triedPaths.has(params.fallbackCatalogPath)) {
    const catalogRes = await invoke(params.fallbackCatalogPath);
    lastRes = catalogRes;
    if (catalogRes.status < 400) {
      return { ...catalogRes };
    }
    // Dynamic recovery: if Treg returns 409 ambiguous, refresh /connections live and retry named tools!
    if (isTregAmbiguous409Error(catalogRes.status, catalogRes.text)) {
      conns = await syncTregConnections();
      candidates = orderCandidateConnections(
        conns,
        params.platform,
        params.account.tregConnectionId,
        params.account.tregConnectionName
      );
      for (const conn of candidates) {
        const apiPath = buildNamedTregCallPath(
          conn.name,
          params.upstreamPath,
          params.fallbackCatalogPath
        );
        if (triedPaths.has(apiPath)) continue;
        triedPaths.add(apiPath);
        const retryRes = await invoke(apiPath);
        lastRes = retryRes;
        lastConn = conn;
        if (retryRes.status < 400) {
          if (!params.skipPersistUsedConnection) {
            saveRawSocialAccount(params.platform, {
              tregConnectionId: conn.id,
              tregConnectionName: conn.name,
            });
          }
          return { ...retryRes, usedConnection: conn };
        }
      }
    }
  }

  return {
    ...(lastRes || {
      status: 502,
      headers: new Headers(),
      text: `Aucune connexion Treg active disponible pour ${params.platform}.`,
    }),
    usedConnection: lastConn,
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

    const initRes = await callTregWithNamedFallback({
      platform: 'youtube',
      account,
      session,
      upstreamPath: 'upload/youtube/v3/videos',
      fallbackCatalogPath: '/call/youtube.youtube.video.upload',
      method: 'POST',
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
        `Treg YouTube init HTTP ${initRes.status}: ${initRes.text.slice(0, 260)}`
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
        const thumbPath = buildNamedTregCallPath(
          initRes.usedConnection?.name || account.tregConnectionName,
          'upload/youtube/v3/thumbnails/set',
          '/call/youtube.youtube.video.thumbnail.set'
        );
        await tregFetch(thumbPath, {
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

    if (isNonPublicBaseUrlForMeta(publicBaseUrl)) {
      throw new Error(
        `Instagram Reels exige une URL HTTPS publique sans écran de connexion Google (ex: Railway) pour télécharger la vidéo. L'aperçu actuel (${publicBaseUrl}) bloque Meta : ouvrez et publiez depuis votre URL Railway.`
      );
    }

    let conns = session.connections?.length ? session.connections : await syncTregConnections();
    let preferredIgConn = selectPreferredInstagramConnection(conns, account.tregConnectionId);

    if (
      !preferredIgConn ||
      (isFacebookPageConnection(preferredIgConn) && !preferredIgConn.resourceRef)
    ) {
      conns = await syncTregConnections();
      preferredIgConn = selectPreferredInstagramConnection(conns, account.tregConnectionId);
    }

    const target = resolveInstagramPublishTarget({
      conn: preferredIgConn,
      account,
    });
    let igUserId = target.igUserId;

    if (target.missingFacebookPage) {
      const detail =
        preferredIgConn?.healthDetail ||
        account.tregSetupDetail ||
        `Page Facebook non liée à un compte Instagram Professionnel sur "${preferredIgConn?.name || 'studio-instagram-page'}".`;
      throw new Error(detail);
    }

    if (!igUserId && preferredIgConn?.id) {
      const rRes = await tregFetch(`/connections/${encodeURIComponent(preferredIgConn.id)}/resources`, {
        session,
      });
      const rList = parseJsonSafe<Array<{ ref?: string; id?: string }>>(rRes.text);
      igUserId = rList?.[0]?.ref || rList?.[0]?.id || '';
    }
    if (!igUserId) {
      throw new Error(
        'ID Instagram Pro manquant : sélectionnez votre compte Instagram ou renseignez son IG User ID dans Config.'
      );
    }

    const mediaToken = issuePublicMediaToken(path.dirname(pack.socialMp4Path), 12);
    const videoUrl = `${publicBaseUrl}/api/social/public-media/${mediaToken}/social.mp4`;
    const thumbOffsetMs = Math.max(0, Math.round((job.coverTimestampSec || 1.4) * 1000));

    // Use explicit named tool path when multiple IG connections exist (e.g. studio-instagram-page-2)
    const namedTool = target.namedTool;
    const createPath = namedTool
      ? `/call/${encodeURIComponent(namedTool)}/${encodeURIComponent(igUserId)}/media`
      : '/call/instagram.instagram.media.container.create';

    const createRes = await tregFetch(createPath, {
      method: 'POST',
      session,
      query: {
        ...(namedTool ? {} : { ig_user_id: igUserId }),
        media_type: 'REELS',
        video_url: videoUrl,
        caption: job.caption,
        thumb_offset: thumbOffsetMs,
      },
    });
    const createJson = parseJsonSafe<{
      id?: string;
      error?: { message?: string; code?: number } | string;
    }>(createRes.text);

    if (createRes.status >= 400 || !createJson?.id) {
      const errMsgObj =
        typeof createJson?.error === 'object' ? createJson.error : undefined;
      const rawMsg = errMsgObj?.message || createRes.text.slice(0, 220);
      if (createJson?.error === 'response_redacted' || rawMsg.includes('response_redacted')) {
        throw new Error(
          `Réponse Meta (HTTP ${createRes.status}) masquée par Treg sur "${namedTool || 'studio-instagram'}". Vérifiez que votre compte Instagram Pro est bien lié à une Page Facebook cochée dans « Reconnecter Page Facebook (Reels) ».`
        );
      }
      if (
        errMsgObj?.code === 10 ||
        rawMsg.toLowerCase().includes('does not have permission')
      ) {
        throw new Error(
          `Permission Meta (#10) refusée sur "${namedTool || 'studio-instagram'}" (${preferredIgConn?.authorizationMethod || 'instagram-login'}). Meta bloque souvent la publication Reels via Instagram Login : liez votre compte Instagram Pro à votre Page Facebook puis cliquez sur « Reconnecter Page Facebook (Reels) », ou utilisez OAuth Direct Meta.`
        );
      }
      throw new Error(
        errMsgObj?.message ||
          `Treg Instagram container HTTP ${createRes.status}: ${createRes.text.slice(0, 220)}`
      );
    }

    const creationId = createJson.id;
    const statusPath = namedTool
      ? `/call/${encodeURIComponent(namedTool)}/${encodeURIComponent(creationId)}`
      : '/call/instagram.instagram.media.container.status';

    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await tregFetch(statusPath, {
        method: 'GET',
        session,
        query: {
          ...(namedTool ? {} : { ig_container_id: creationId }),
          fields: 'status_code,status',
        },
      });
      const st = parseJsonSafe<{ status_code?: string; status?: string }>(statusRes.text);
      if (st?.status_code === 'FINISHED') break;
      if (st?.status_code === 'ERROR' || st?.status_code === 'EXPIRED') {
        throw new Error(`Instagram traitement vidéo échoué: ${st.status || st.status_code}`);
      }
    }

    const publishPath = namedTool
      ? `/call/${encodeURIComponent(namedTool)}/${encodeURIComponent(igUserId)}/media_publish`
      : '/call/instagram.instagram.post.publish';

    const pubRes = await tregFetch(publishPath, {
      method: 'POST',
      session,
      query: {
        ...(namedTool ? {} : { ig_user_id: igUserId }),
        creation_id: creationId,
      },
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

    let permalink = `https://www.instagram.com/reel/${pubJson.id}/`;
    try {
      if (namedTool) {
        const linkRes = await tregFetch(
          `/call/${encodeURIComponent(namedTool)}/${encodeURIComponent(pubJson.id)}`,
          {
            method: 'GET',
            session,
            query: { fields: 'permalink' },
          }
        );
        const linkJson = parseJsonSafe<{ permalink?: string }>(linkRes.text);
        if (linkJson?.permalink) permalink = linkJson.permalink;
      }
    } catch {
      // keep default reel url
    }

    return {
      externalPostId: pubJson.id,
      publishedUrl: permalink,
    };
  }

  // TikTok via Treg (409-proof named tool calls + dynamic creator_info privacy resolution)
  const videoPath = pack.socialMp4Path || pack.masterMp4Path;
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error('Fichier MP4 introuvable pour TikTok via Treg.');
  }
  const buffer = fs.readFileSync(videoPath);
  const size = buffer.byteLength;

  let privacyOptions: string[] = ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'];
  let creatorUsername = account.accountHandle;
  try {
    const creatorRes = await callTregWithNamedFallback({
      platform: 'tiktok',
      account,
      session,
      upstreamPath: 'v2/post/publish/creator_info/query/',
      fallbackCatalogPath: '/call/tiktok.tiktok.creator.info.query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (creatorRes.status < 400) {
      const creatorJson = parseJsonSafe<{
        data?: {
          privacy_level_options?: string[];
          creator_username?: string;
        };
      }>(creatorRes.text);
      if (Array.isArray(creatorJson?.data?.privacy_level_options) && creatorJson.data.privacy_level_options.length > 0) {
        privacyOptions = creatorJson.data.privacy_level_options;
      }
      if (creatorJson?.data?.creator_username) {
        creatorUsername = `@${creatorJson.data.creator_username.replace(/^@/, '')}`;
      }
    }
  } catch {
    // keep default privacy options
  }

  const privacyLevel =
    job.privacy === 'private' && privacyOptions.includes('SELF_ONLY')
      ? 'SELF_ONLY'
      : privacyOptions.includes('PUBLIC_TO_EVERYONE')
        ? 'PUBLIC_TO_EVERYONE'
        : privacyOptions.includes('MUTUAL_FOLLOW_FRIENDS')
          ? 'MUTUAL_FOLLOW_FRIENDS'
          : privacyOptions[0] || 'SELF_ONLY';

  let isInbox = false;
  let initRes = await callTregWithNamedFallback({
    platform: 'tiktok',
    account,
    session,
    upstreamPath: 'v2/post/publish/video/init/',
    fallbackCatalogPath: '/call/tiktok.tiktok.video.publish.init',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_info: {
        title: (job.tiktokCaption || job.caption).slice(0, 2200),
        privacy_level: privacyLevel,
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
    initRes = await callTregWithNamedFallback({
      platform: 'tiktok',
      account,
      session,
      upstreamPath: 'v2/post/publish/inbox/video/init/',
      fallbackCatalogPath: '/call/tiktok.tiktok.video.inbox.init',
      method: 'POST',
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
      : `https://www.tiktok.com/${creatorUsername || ''}`,
    inboxOnly: isInbox,
  };
}

export async function fetchLiveChannelProfiles(): Promise<LiveChannelProfileSnapshot[]> {
  const session = readTregSession();
  const rawAccounts = getRawSocialAccounts();
  const snapshots: LiveChannelProfileSnapshot[] = [];

  // 1. YouTube
  const ytAcc = rawAccounts.youtube;
  let ytSnapshot: LiveChannelProfileSnapshot = {
    platform: 'youtube',
    connected: Boolean(ytAcc.connected || session?.connections?.some((c) => c.platform === 'youtube')),
    liveName: ytAcc.accountName,
    liveHandle: ytAcc.accountHandle,
    liveAvatarUrl: ytAcc.avatarUrl,
    canAutoUpdateViaApi: Boolean(ytAcc.route === 'oauth' && ytAcc.accessToken),
    apiNote:
      ytAcc.route === 'oauth' && ytAcc.accessToken
        ? 'Description modifiable en 1 clic via OAuth Direct. Le nom, @handle et photo se modifient sur YouTube Studio.'
        : 'Nom, description, @handle et photo se modifient sur YouTube Studio (Google bloque le renommage via API).',
    editProfileUrl: 'https://studio.youtube.com/channel/UC/editing/details',
  };
  if (ytAcc.route === 'oauth' && ytAcc.accessToken) {
    try {
      const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings,statistics&mine=true',
        { headers: { Authorization: `Bearer ${ytAcc.accessToken}` } }
      );
      if (ytRes.ok) {
        const ytData = (await ytRes.json()) as {
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
              customUrl?: string;
              description?: string;
              thumbnails?: { default?: { url?: string } };
            };
            statistics?: { subscriberCount?: string; videoCount?: string };
          }>;
        };
        const ch = ytData.items?.[0];
        if (ch?.snippet) {
          ytSnapshot = {
            ...ytSnapshot,
            connected: true,
            liveName: ch.snippet.title || ytSnapshot.liveName,
            liveHandle: ch.snippet.customUrl || ytSnapshot.liveHandle,
            liveBio: ch.snippet.description || ytSnapshot.liveBio,
            liveAvatarUrl: ch.snippet.thumbnails?.default?.url || ytSnapshot.liveAvatarUrl,
            followersCount: ch.statistics?.subscriberCount
              ? Number(ch.statistics.subscriberCount)
              : undefined,
            mediaCount: ch.statistics?.videoCount ? Number(ch.statistics.videoCount) : undefined,
            editProfileUrl: ch.id
              ? `https://studio.youtube.com/channel/${ch.id}/editing/details`
              : ytSnapshot.editProfileUrl,
          };
        }
      }
    } catch {
      // ignore read failure
    }
  } else if (session?.token && ytSnapshot.connected) {
    try {
      const ytRes = await callTregWithNamedFallback({
        platform: 'youtube',
        account: ytAcc,
        session,
        upstreamPath: 'youtube/v3/channels',
        fallbackCatalogPath: '/call/youtube.youtube.channel.profile',
        method: 'GET',
        query: { part: 'snippet,statistics', mine: true },
      });
      if (ytRes.status === 200) {
        const ytData = parseJsonSafe<{
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
              customUrl?: string;
              description?: string;
              thumbnails?: { default?: { url?: string } };
            };
            statistics?: { subscriberCount?: string; videoCount?: string };
          }>;
        }>(ytRes.text);
        const ch = ytData?.items?.[0];
        if (ch?.snippet) {
          const handle = ch.snippet.customUrl
            ? `@${ch.snippet.customUrl.replace(/^@/, '')}`
            : ytSnapshot.liveHandle;
          ytSnapshot = {
            ...ytSnapshot,
            liveName: ch.snippet.title || ytSnapshot.liveName,
            liveHandle: handle,
            liveBio: ch.snippet.description,
            liveAvatarUrl: ch.snippet.thumbnails?.default?.url,
            followersCount: ch.statistics?.subscriberCount
              ? Number(ch.statistics.subscriberCount)
              : undefined,
            mediaCount: ch.statistics?.videoCount ? Number(ch.statistics.videoCount) : undefined,
            editProfileUrl: ch.id
              ? `https://studio.youtube.com/channel/${ch.id}/editing/details`
              : ytSnapshot.editProfileUrl,
          };
          saveRawSocialAccount('youtube', {
            ...(ch.snippet.title ? { accountName: ch.snippet.title } : {}),
            ...(handle ? { accountHandle: handle } : {}),
            ...(ch.id ? { accountId: ch.id } : {}),
            ...(ch.snippet.thumbnails?.default?.url
              ? { avatarUrl: ch.snippet.thumbnails.default.url }
              : {}),
          });
        }
      }
    } catch {
      // quota or read-only fallback
    }
  }
  snapshots.push(ytSnapshot);

  // 2. Instagram
  const igAcc = rawAccounts.instagram;
  const igUserId = igAcc.igUserId || igAcc.tregResourceRef;
  let igSnapshot: LiveChannelProfileSnapshot = {
    platform: 'instagram',
    connected: Boolean(
      igAcc.connected || session?.connections?.some((c) => c.platform === 'instagram')
    ),
    liveName: igAcc.accountName,
    liveHandle: igAcc.accountHandle,
    liveAvatarUrl: igAcc.avatarUrl,
    canAutoUpdateViaApi: false,
    apiNote:
      'Meta interdit le changement de pseudo, bio et photo de profil par API — utilisez les boutons Copier/Télécharger puis collez dans Modifier le profil.',
    editProfileUrl: 'https://www.instagram.com/accounts/edit/',
  };
  if (session?.token && igSnapshot.connected) {
    try {
      const igPath = igUserId ? `${encodeURIComponent(igUserId)}` : 'me';
      const igRes = await callTregWithNamedFallback({
        platform: 'instagram',
        account: igAcc,
        session,
        upstreamPath: igPath,
        fallbackCatalogPath: '/call/instagram.instagram.user.profile',
        method: 'GET',
        query: {
          ...(igUserId ? {} : { ig_user_id: igUserId }),
          fields: 'id,username,name,biography,profile_picture_url,followers_count,media_count',
        },
      });
      if (igRes.status === 200) {
        const igData = parseJsonSafe<{
          username?: string;
          name?: string;
          biography?: string;
          profile_picture_url?: string;
          followers_count?: number;
          media_count?: number;
        }>(igRes.text);
        if (igData?.username || igData?.name) {
          const handle = igData.username
            ? `@${igData.username.replace(/^@/, '')}`
            : igSnapshot.liveHandle;
          igSnapshot = {
            ...igSnapshot,
            connected: true,
            liveName: igData.name || igSnapshot.liveName,
            liveHandle: handle,
            liveBio: igData.biography,
            liveAvatarUrl: igData.profile_picture_url || igSnapshot.liveAvatarUrl,
            followersCount: igData.followers_count,
            mediaCount: igData.media_count,
          };
          saveRawSocialAccount('instagram', {
            ...(igData.name ? { accountName: igData.name } : {}),
            ...(handle ? { accountHandle: handle } : {}),
            ...(igData.profile_picture_url ? { avatarUrl: igData.profile_picture_url } : {}),
          });
        }
      }
    } catch {
      // keep cached metadata
    }
  }
  snapshots.push(igSnapshot);

  // 3. TikTok
  const ttAcc = rawAccounts.tiktok;
  let ttSnapshot: LiveChannelProfileSnapshot = {
    platform: 'tiktok',
    connected: Boolean(ttAcc.connected || session?.connections?.some((c) => c.platform === 'tiktok')),
    liveName: ttAcc.accountName,
    liveHandle: ttAcc.accountHandle,
    liveAvatarUrl: ttAcc.avatarUrl,
    canAutoUpdateViaApi: false,
    apiNote:
      'TikTok interdit la modification du nom, @handle, bio et avatar par API — utilisez les boutons Copier/Télécharger puis collez dans Modifier le profil.',
    editProfileUrl: 'https://www.tiktok.com/',
  };
  if (ttAcc.route === 'oauth' && ttAcc.accessToken) {
    try {
      const ttRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url',
        { headers: { Authorization: `Bearer ${ttAcc.accessToken}` } }
      );
      if (ttRes.ok) {
        const ttJson = (await ttRes.json()) as {
          data?: { user?: { display_name?: string; username?: string; avatar_url?: string } };
        };
        const u = ttJson.data?.user;
        if (u) {
          const handle = u.username ? `@${u.username.replace(/^@/, '')}` : ttSnapshot.liveHandle;
          ttSnapshot = {
            ...ttSnapshot,
            liveName: u.display_name || ttSnapshot.liveName,
            liveHandle: handle,
            liveAvatarUrl: u.avatar_url || ttSnapshot.liveAvatarUrl,
          };
        }
      }
    } catch {
      // ignore
    }
  } else if (session?.token && ttSnapshot.connected) {
    try {
      const ttRes = await callTregWithNamedFallback({
        platform: 'tiktok',
        account: ttAcc,
        session,
        upstreamPath: 'v2/user/info/',
        fallbackCatalogPath: '/call/tiktok.tiktok.user.info',
        method: 'GET',
        query: { fields: 'open_id,display_name,username,avatar_url' },
      });
      if (ttRes.status === 200) {
        const ttJson = parseJsonSafe<{
          data?: { user?: { open_id?: string; display_name?: string; username?: string; avatar_url?: string } };
        }>(ttRes.text);
        const u = ttJson?.data?.user;
        if (u) {
          const handle = u.username ? `@${u.username.replace(/^@/, '')}` : ttSnapshot.liveHandle;
          ttSnapshot = {
            ...ttSnapshot,
            connected: true,
            liveName: u.display_name || ttSnapshot.liveName,
            liveHandle: handle,
            liveAvatarUrl: u.avatar_url || ttSnapshot.liveAvatarUrl,
            ...(u.username ? { editProfileUrl: `https://www.tiktok.com/@${u.username.replace(/^@/, '')}` } : {}),
          };
          saveRawSocialAccount('tiktok', {
            ...(u.display_name ? { accountName: u.display_name } : {}),
            ...(handle ? { accountHandle: handle } : {}),
            ...(u.avatar_url ? { avatarUrl: u.avatar_url } : {}),
          });
        }
      }
    } catch {
      // keep cached metadata
    }
  }
  snapshots.push(ttSnapshot);

  return snapshots;
}

export async function probeSocialConnection(
  platform: SocialPlatform,
  publicBaseUrl?: string
): Promise<SocialConnectionProbeResult> {
  const checkedAt = new Date().toISOString();
  const session = readTregSession();
  if (session?.token) {
    await syncTregConnections().catch(() => []);
  }
  const rawAccounts = getRawSocialAccounts();
  const acc = rawAccounts[platform];

  if (acc.route === 'manual') {
    return {
      platform,
      ok: true,
      route: 'manual',
      detail: 'Mode Kit Manuel prêt (MP4 ≤ 30 Mo + cover JPG + légende).',
      checkedAt,
    };
  }

  if (acc.route === 'oauth') {
    if (!acc.accessToken) {
      return {
        platform,
        ok: false,
        route: 'oauth',
        detail: `OAuth Direct sélectionné mais aucun token connecté pour ${platform}.`,
        checkedAt,
      };
    }
    try {
      if (platform === 'youtube') {
        const r = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${acc.accessToken}` } }
        );
        const j = (await r.json().catch(() => ({}))) as {
          items?: Array<{ id?: string; snippet?: { title?: string; customUrl?: string } }>;
          error?: { message?: string };
        };
        const ch = j.items?.[0];
        if (!r.ok || !ch) {
          throw new Error(j.error?.message || `HTTP ${r.status}`);
        }
        const handle = ch.snippet?.customUrl ? `@${ch.snippet.customUrl.replace(/^@/, '')}` : acc.accountHandle;
        saveRawSocialAccount('youtube', {
          accountName: ch.snippet?.title || acc.accountName,
          accountHandle: handle,
          accountId: ch.id,
          lastError: undefined,
        });
        return {
          platform,
          ok: true,
          route: 'oauth',
          accountName: ch.snippet?.title,
          accountHandle: handle,
          detail: `OAuth OK · Chaîne « ${ch.snippet?.title || ch.id} » prête à publier.`,
          checkedAt,
        };
      }
      if (platform === 'instagram') {
        if (!acc.igUserId) {
          throw new Error('igUserId manquant sur le compte Instagram OAuth.');
        }
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(acc.igUserId)}?fields=id,username,name&access_token=${encodeURIComponent(acc.accessToken)}`
        );
        const j = (await r.json().catch(() => ({}))) as {
          id?: string;
          username?: string;
          name?: string;
          error?: { message?: string };
        };
        if (!r.ok || !j.id) {
          throw new Error(j.error?.message || `HTTP ${r.status}`);
        }
        const handle = j.username ? `@${j.username.replace(/^@/, '')}` : acc.accountHandle;
        saveRawSocialAccount('instagram', {
          accountName: j.name || acc.accountName,
          accountHandle: handle,
          lastError: undefined,
        });
        return {
          platform,
          ok: true,
          route: 'oauth',
          accountName: j.name,
          accountHandle: handle,
          detail: `OAuth OK · Compte ${handle || j.id} prêt à publier.`,
          warning:
            publicBaseUrl && isNonPublicBaseUrlForMeta(publicBaseUrl)
              ? 'Aperçu AI Studio détecté : pour publier un Reel sur Instagram, utilisez votre URL publique Railway.'
              : undefined,
          checkedAt,
        };
      }
      const r = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username',
        { headers: { Authorization: `Bearer ${acc.accessToken}` } }
      );
      const j = (await r.json().catch(() => ({}))) as {
        data?: { user?: { display_name?: string; username?: string } };
        error?: { message?: string };
      };
      const u = j.data?.user;
      if (!r.ok || !u) {
        throw new Error(j.error?.message || `HTTP ${r.status}`);
      }
      const handle = u.username ? `@${u.username.replace(/^@/, '')}` : acc.accountHandle;
      saveRawSocialAccount('tiktok', {
        accountName: u.display_name || acc.accountName,
        accountHandle: handle,
        lastError: undefined,
      });
      return {
        platform,
        ok: true,
        route: 'oauth',
        accountName: u.display_name,
        accountHandle: handle,
        detail: `OAuth OK · Compte ${handle || u.display_name} prêt.`,
        checkedAt,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur OAuth';
      saveRawSocialAccount(platform, { lastError: msg });
      return { platform, ok: false, route: 'oauth', detail: msg, checkedAt };
    }
  }

  // Treg 1-Clic probe
  if (!session?.token) {
    return {
      platform,
      ok: false,
      route: 'treg',
      detail: 'Session Treg non connectée.',
      checkedAt,
    };
  }

  if (platform === 'youtube') {
    const res = await callTregWithNamedFallback({
      platform: 'youtube',
      account: acc,
      session,
      upstreamPath: 'youtube/v3/channels',
      fallbackCatalogPath: '/call/youtube.youtube.channel.profile',
      method: 'GET',
      query: { part: 'snippet,statistics', mine: true },
    });
    const parsed = parseJsonSafe<{
      items?: Array<{ id?: string; snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } }>;
      detail?: string;
      error?: { message?: string };
    }>(res.text);
    const ch = parsed?.items?.[0];
    if (res.status < 400 && ch?.id) {
      const handle = ch.snippet?.customUrl ? `@${ch.snippet.customUrl.replace(/^@/, '')}` : undefined;
      saveRawSocialAccount('youtube', {
        connected: true,
        accountName: ch.snippet?.title || res.usedConnection?.name || acc.accountName,
        ...(handle ? { accountHandle: handle } : {}),
        accountId: ch.id,
        ...(ch.snippet?.thumbnails?.default?.url ? { avatarUrl: ch.snippet.thumbnails.default.url } : {}),
        ...(res.usedConnection
          ? {
              tregConnectionId: res.usedConnection.id,
              tregConnectionName: res.usedConnection.name,
            }
          : {}),
        lastError: undefined,
      });
      return {
        platform: 'youtube',
        ok: true,
        route: 'treg',
        connectionId: res.usedConnection?.id || acc.tregConnectionId,
        connectionName: res.usedConnection?.name || acc.tregConnectionName,
        accountName: ch.snippet?.title,
        accountHandle: handle,
        detail: `Connecté (${res.usedConnection?.name || acc.tregConnectionName || 'treg'}) · Chaîne « ${ch.snippet?.title || ch.id} » prête à publier.`,
        checkedAt,
      };
    }
    const errMsg =
      parsed?.error?.message ||
      parsed?.detail ||
      `Échec test YouTube (HTTP ${res.status}): ${res.text.slice(0, 180)}`;
    saveRawSocialAccount('youtube', { lastError: errMsg });
    return {
      platform: 'youtube',
      ok: false,
      route: 'treg',
      connectionId: res.usedConnection?.id || acc.tregConnectionId,
      connectionName: res.usedConnection?.name || acc.tregConnectionName,
      detail: errMsg,
      checkedAt,
    };
  }

  if (platform === 'instagram') {
    const conns = readTregSession()?.connections || [];
    const preferredIgConn = selectPreferredInstagramConnection(conns, acc.tregConnectionId);
    const target = resolveInstagramPublishTarget({ conn: preferredIgConn, account: acc });

    if (target.missingFacebookPage && preferredIgConn?.id) {
      const fbProbe = await discoverFacebookPageInstagramAccount(
        preferredIgConn.id,
        preferredIgConn.name,
        session
      );
      if (fbProbe.igUserId) {
        const handle = fbProbe.username ? `@${fbProbe.username.replace(/^@/, '')}` : undefined;
        saveRawSocialAccount('instagram', {
          connected: true,
          igUserId: fbProbe.igUserId,
          igPageId: fbProbe.igPageId,
          tregConnectionId: preferredIgConn.id,
          tregConnectionName: preferredIgConn.name,
          tregResourceRef: fbProbe.igUserId,
          tregSetupRequired: false,
          tregSetupDetail: undefined,
          ...(fbProbe.name ? { accountName: fbProbe.name } : {}),
          ...(handle ? { accountHandle: handle } : {}),
          ...(fbProbe.avatarUrl ? { avatarUrl: fbProbe.avatarUrl } : {}),
          lastError: undefined,
        });
        return {
          platform: 'instagram',
          ok: true,
          route: 'treg',
          connectionId: preferredIgConn.id,
          connectionName: preferredIgConn.name,
          accountName: fbProbe.name,
          accountHandle: handle,
          detail: `Page Facebook reliée (${preferredIgConn.name}) · Compte ${handle || fbProbe.igUserId} prêt.`,
          warning:
            publicBaseUrl && isNonPublicBaseUrlForMeta(publicBaseUrl)
              ? 'Note : Meta bloque les vidéos hébergées sur l’aperçu AI Studio ; la publication Instagram Reels automatique passe depuis votre URL Railway.'
              : undefined,
          checkedAt,
        };
      }
      saveRawSocialAccount('instagram', {
        tregConnectionId: preferredIgConn.id,
        tregConnectionName: preferredIgConn.name,
        tregSetupRequired: true,
        tregSetupDetail: fbProbe.setupDetail,
      });
      return {
        platform: 'instagram',
        ok: false,
        route: 'treg',
        connectionId: preferredIgConn.id,
        connectionName: preferredIgConn.name,
        detail: fbProbe.setupDetail || 'Page Facebook non liée à un compte Instagram Pro.',
        checkedAt,
      };
    }

    if (!target.igUserId) {
      return {
        platform: 'instagram',
        ok: false,
        route: 'treg',
        connectionId: preferredIgConn?.id || acc.tregConnectionId,
        connectionName: preferredIgConn?.name || acc.tregConnectionName,
        detail: 'Aucun IG User ID trouvé sur cette connexion Instagram.',
        checkedAt,
      };
    }

    const res = await tregFetch(
      buildNamedTregCallPath(
        target.namedTool,
        `${encodeURIComponent(target.igUserId)}`,
        '/call/instagram.instagram.user.profile'
      ),
      {
        method: 'GET',
        session,
        query: {
          ...(target.namedTool ? {} : { ig_user_id: target.igUserId }),
          fields: 'id,username,name,profile_picture_url',
        },
      }
    );
    const j = parseJsonSafe<{
      id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      error?: { message?: string };
    }>(res.text);
    if (res.status < 400 && (j?.id || j?.username)) {
      const handle = j.username ? `@${j.username.replace(/^@/, '')}` : acc.accountHandle;
      saveRawSocialAccount('instagram', {
        connected: true,
        tregConnectionId: preferredIgConn?.id || acc.tregConnectionId,
        tregConnectionName: target.namedTool || acc.tregConnectionName,
        tregSetupRequired: false,
        tregSetupDetail: undefined,
        ...(j.name ? { accountName: j.name } : {}),
        ...(handle ? { accountHandle: handle } : {}),
        ...(j.profile_picture_url ? { avatarUrl: j.profile_picture_url } : {}),
        lastError: undefined,
      });
      return {
        platform: 'instagram',
        ok: true,
        route: 'treg',
        connectionId: preferredIgConn?.id,
        connectionName: target.namedTool,
        accountName: j.name,
        accountHandle: handle,
        detail: `Connecté (${target.namedTool || 'treg'}) · Compte ${handle || j.id} actif.${preferredIgConn?.authorizationMethod === 'instagram-login' ? ' (Mode Instagram Login : certains comptes exigent la liaison Page Facebook pour Reels).' : ''}`,
        warning:
          publicBaseUrl && isNonPublicBaseUrlForMeta(publicBaseUrl)
            ? 'Note : Meta bloque l’aperçu AI Studio ; déclenchez la publication Instagram Reels depuis votre URL Railway.'
            : undefined,
        checkedAt,
      };
    }
    const errMsg = j?.error?.message || `HTTP ${res.status}: ${res.text.slice(0, 180)}`;
    saveRawSocialAccount('instagram', { lastError: errMsg });
    return {
      platform: 'instagram',
      ok: false,
      route: 'treg',
      connectionId: preferredIgConn?.id,
      connectionName: target.namedTool,
      detail: errMsg,
      checkedAt,
    };
  }

  // TikTok probe via Treg
  const userRes = await callTregWithNamedFallback({
    platform: 'tiktok',
    account: acc,
    session,
    upstreamPath: 'v2/user/info/',
    fallbackCatalogPath: '/call/tiktok.tiktok.user.info',
    method: 'GET',
    query: { fields: 'open_id,display_name,username,avatar_url' },
  });
  const userJson = parseJsonSafe<{
    data?: { user?: { open_id?: string; display_name?: string; username?: string; avatar_url?: string } };
    error?: { code?: string; message?: string };
    detail?: string;
  }>(userRes.text);
  const u = userJson?.data?.user;

  let privacyList = '';
  try {
    const crRes = await callTregWithNamedFallback({
      platform: 'tiktok',
      account: acc,
      session,
      upstreamPath: 'v2/post/publish/creator_info/query/',
      fallbackCatalogPath: '/call/tiktok.tiktok.creator.info.query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const crJson = parseJsonSafe<{
      data?: { privacy_level_options?: string[] };
    }>(crRes.text);
    if (crJson?.data?.privacy_level_options?.length) {
      privacyList = crJson.data.privacy_level_options.join(', ');
    }
  } catch {
    // ignore optional creator_info error
  }

  if (userRes.status < 400 && u) {
    const handle = u.username ? `@${u.username.replace(/^@/, '')}` : undefined;
    saveRawSocialAccount('tiktok', {
      connected: true,
      accountName: u.display_name || resNameFallback(userRes.usedConnection?.name, acc.accountName),
      ...(handle ? { accountHandle: handle } : {}),
      ...(u.open_id ? { accountId: u.open_id } : {}),
      ...(u.avatar_url ? { avatarUrl: u.avatar_url } : {}),
      ...(userRes.usedConnection
        ? {
            tregConnectionId: userRes.usedConnection.id,
            tregConnectionName: userRes.usedConnection.name,
          }
        : {}),
      lastError: undefined,
    });
    return {
      platform: 'tiktok',
      ok: true,
      route: 'treg',
      connectionId: userRes.usedConnection?.id || acc.tregConnectionId,
      connectionName: userRes.usedConnection?.name || acc.tregConnectionName,
      accountName: u.display_name,
      accountHandle: handle,
      detail: `Connecté (${userRes.usedConnection?.name || acc.tregConnectionName || 'treg'}) · ${handle || u.display_name} prêt à publier${privacyList ? ` (${privacyList})` : ''}.`,
      checkedAt,
    };
  }

  const ttErr =
    userJson?.error?.message ||
    userJson?.detail ||
    `Échec test TikTok (HTTP ${userRes.status}): ${userRes.text.slice(0, 180)}`;
  saveRawSocialAccount('tiktok', { lastError: ttErr });
  return {
    platform: 'tiktok',
    ok: false,
    route: 'treg',
    connectionId: userRes.usedConnection?.id || acc.tregConnectionId,
    connectionName: userRes.usedConnection?.name || acc.tregConnectionName,
    detail: ttErr,
    checkedAt,
  };
}

function resNameFallback(a?: string, b?: string): string {
  return a || b || 'TikTok';
}

export async function probeAllSocialConnections(
  publicBaseUrl?: string
): Promise<SocialConnectionProbeResult[]> {
  const results: SocialConnectionProbeResult[] = [];
  for (const p of ['youtube', 'instagram', 'tiktok'] as SocialPlatform[]) {
    results.push(await probeSocialConnection(p, publicBaseUrl));
  }
  return results;
}

export async function pushYouTubeDescriptionDirect(description: string): Promise<{
  channelId: string;
  description: string;
}> {
  const raw = getRawSocialAccounts();
  const yt = raw.youtube;
  if (yt.route !== 'oauth' || !yt.accessToken) {
    throw new Error(
      'YouTube OAuth Direct requis pour modifier la description automatiquement via API (basculez YouTube sur OAuth Direct et connectez la chaîne, ou copiez-collez dans YouTube Studio).'
    );
  }
  const getRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&mine=true',
    { headers: { Authorization: `Bearer ${yt.accessToken}` } }
  );
  const getData = (await getRes.json().catch(() => ({}))) as {
    items?: Array<{
      id?: string;
      brandingSettings?: { channel?: Record<string, unknown> };
    }>;
    error?: { message?: string };
  };
  const ch = getData.items?.[0];
  if (!getRes.ok || !ch?.id) {
    throw new Error(getData.error?.message || 'Impossible de lire la chaîne YouTube.');
  }

  const putRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=brandingSettings',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${yt.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: ch.id,
        brandingSettings: {
          ...ch.brandingSettings,
          channel: {
            ...(ch.brandingSettings?.channel || {}),
            description: description.slice(0, 1000),
          },
        },
      }),
    }
  );
  const putData = (await putRes.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  if (!putRes.ok) {
    throw new Error(putData.error?.message || `Échec mise à jour YouTube (HTTP ${putRes.status}).`);
  }
  return { channelId: ch.id, description: description.slice(0, 1000) };
}

