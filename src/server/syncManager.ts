import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ShortProject } from '../types/studio';
import {
  PROJECTS_DIR,
  RENDERS_DIR,
  REPO_SAVED_MEDIA_DIR,
  REPO_SAVED_VIDEOS_DIR,
  ROOT_DIR,
  STORAGE_DIR,
  getAllProjects,
  getProject,
  hydrateSavedProjectsFromRepo,
  mirrorProjectToRepo,
  resolveProjectMp4Path,
  saveProject,
  withProjectMediaStatus,
  writeJsonAtomic,
} from './storageManager';

const execFileAsync = promisify(execFile);

export interface SyncConfigRecord {
  githubRepo: string;
  githubToken: string;
  railwayUrl: string;
  syncSecret: string;
  autoSync: boolean;
  lastSyncAt?: string;
  lastSyncSummary?: string;
}

export interface PublicSyncStatus {
  githubRepo: string;
  githubConnected: boolean;
  githubTokenMasked: string | null;
  railwayUrl: string;
  railwayConnected: boolean;
  syncSecretConfigured: boolean;
  autoSync: boolean;
  gitBranch: string;
  hasGitRepo: boolean;
  isAlwaysOnServer: boolean;
  lastSyncAt?: string;
  lastSyncSummary?: string;
}

export interface SyncManifestFileEntry {
  kind: 'mp4' | 'voice' | 'thumb' | 'contact';
  fileName: string;
  sizeBytes: number;
}

export interface SyncManifestProjectEntry {
  id: string;
  slug: string;
  title: string;
  currentVersion: string;
  hasMp4: boolean;
  mediaFiles: SyncManifestFileEntry[];
}

function getSyncConfigPath(): string {
  const storageRoot = path.resolve(process.env.STORAGE_DIR || STORAGE_DIR);
  return path.join(storageRoot, 'sync-config.json');
}

export function normalizeGitHubRepo(input?: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const match = raw.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/i);
  if (match?.[1]) return match[1];
  const cleaned = raw.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cleaned) ? cleaned : '';
}

export function normalizeRailwayUrl(input?: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function maskSecretToken(token?: string): string | null {
  const t = String(token || '').trim();
  if (!t) return null;
  if (t.length <= 10) return '••••••';
  return `${t.slice(0, 6)}••••${t.slice(-4)}`;
}

export function readSyncConfig(): SyncConfigRecord {
  let stored: Partial<SyncConfigRecord> = {};
  const cfgPath = getSyncConfigPath();
  if (fs.existsSync(cfgPath)) {
    try {
      stored = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as Partial<SyncConfigRecord>;
    } catch {
      stored = {};
    }
  }

  const githubRepo =
    normalizeGitHubRepo(stored.githubRepo) ||
    normalizeGitHubRepo(process.env.GITHUB_REPO);
  const githubToken = (stored.githubToken || process.env.GITHUB_TOKEN || '').trim();
  const railwayUrl =
    normalizeRailwayUrl(stored.railwayUrl) ||
    normalizeRailwayUrl(process.env.RAILWAY_STUDIO_URL);
  const syncSecret = (stored.syncSecret || process.env.SYNC_SECRET || '').trim();

  return {
    githubRepo,
    githubToken,
    railwayUrl,
    syncSecret,
    autoSync: stored.autoSync !== undefined ? Boolean(stored.autoSync) : true,
    lastSyncAt: stored.lastSyncAt,
    lastSyncSummary: stored.lastSyncSummary,
  };
}

export function saveSyncConfig(patch: Partial<SyncConfigRecord>): SyncConfigRecord {
  const current = readSyncConfig();
  const next: SyncConfigRecord = {
    githubRepo:
      patch.githubRepo !== undefined
        ? normalizeGitHubRepo(patch.githubRepo)
        : current.githubRepo,
    githubToken:
      patch.githubToken !== undefined
        ? String(patch.githubToken).trim()
        : current.githubToken,
    railwayUrl:
      patch.railwayUrl !== undefined
        ? normalizeRailwayUrl(patch.railwayUrl)
        : current.railwayUrl,
    syncSecret:
      patch.syncSecret !== undefined
        ? String(patch.syncSecret).trim()
        : current.syncSecret,
    autoSync: patch.autoSync !== undefined ? Boolean(patch.autoSync) : current.autoSync,
    lastSyncAt: patch.lastSyncAt ?? current.lastSyncAt,
    lastSyncSummary: patch.lastSyncSummary ?? current.lastSyncSummary,
  };

  if (patch.railwayUrl !== undefined && patch.railwayUrl.trim() && !next.railwayUrl) {
    throw new Error('URL Railway invalide (doit commencer par https:// ou http://).');
  }
  if (patch.githubRepo !== undefined && patch.githubRepo.trim() && !next.githubRepo) {
    throw new Error('Dépôt GitHub invalide (format attendu : proprietaire/repo).');
  }

  writeJsonAtomic(getSyncConfigPath(), next);
  return next;
}

export function getPublicSyncStatus(): PublicSyncStatus {
  const cfg = readSyncConfig();
  const hasGitRepo = fs.existsSync(path.join(ROOT_DIR, '.git'));
  let gitBranch = 'main';
  if (hasGitRepo) {
    const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    if (res.status === 0 && res.stdout.trim()) {
      gitBranch = res.stdout.trim();
    }
  }

  const isAlwaysOnServer = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.ALWAYS_ON_SERVER === 'true'
  );

  return {
    githubRepo: cfg.githubRepo,
    githubConnected: Boolean(cfg.githubRepo && cfg.githubToken),
    githubTokenMasked: maskSecretToken(cfg.githubToken),
    railwayUrl: cfg.railwayUrl,
    railwayConnected: Boolean(cfg.railwayUrl),
    syncSecretConfigured: Boolean(cfg.syncSecret),
    autoSync: cfg.autoSync,
    gitBranch,
    hasGitRepo,
    isAlwaysOnServer,
    lastSyncAt: cfg.lastSyncAt,
    lastSyncSummary: cfg.lastSyncSummary,
  };
}

export function verifyIncomingSyncSecret(provided?: string | null): boolean {
  const cfg = readSyncConfig();
  if (!cfg.syncSecret) return true;
  return Boolean(provided && provided.trim() === cfg.syncSecret);
}

export function sanitizeSafeFilename(name: string): string {
  const base = path.basename(String(name || '')).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || base === '.' || base === '..') {
    throw new Error('Nom de fichier invalide.');
  }
  return base;
}

export function listProjectMediaFiles(project: ShortProject): Array<{
  kind: 'mp4' | 'voice' | 'thumb' | 'contact';
  fileName: string;
  fullPath: string;
  sizeBytes: number;
}> {
  const found: Array<{
    kind: 'mp4' | 'voice' | 'thumb' | 'contact';
    fileName: string;
    fullPath: string;
    sizeBytes: number;
  }> = [];
  const seen = new Set<string>();

  const mp4Path = resolveProjectMp4Path(project, project.currentVersion);
  if (mp4Path && fs.existsSync(mp4Path) && !project.isFlagshipReactStage) {
    const fileName = path.basename(mp4Path);
    found.push({
      kind: 'mp4',
      fileName,
      fullPath: mp4Path,
      sizeBytes: fs.statSync(mp4Path).size,
    });
    seen.add(`mp4:${fileName}`);
  }

  const projDirs = [
    path.join(PROJECTS_DIR, project.id),
    path.join(REPO_SAVED_MEDIA_DIR, project.id),
  ];
  for (const dir of projDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.mp3') && !file.startsWith('raw-')) {
        const key = `voice:${file}`;
        if (seen.has(key)) continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile()) {
          found.push({
            kind: 'voice',
            fileName: file,
            fullPath,
            sizeBytes: fs.statSync(fullPath).size,
          });
          seen.add(key);
        }
      }
    }
  }

  const imageDirs = [RENDERS_DIR, path.join(REPO_SAVED_MEDIA_DIR, project.id)];
  for (const dir of imageDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.startsWith(`${project.slug}_`)) continue;
      if (file.endsWith('_thumb.jpg')) {
        const key = `thumb:${file}`;
        if (seen.has(key)) continue;
        const fullPath = path.join(dir, file);
        found.push({
          kind: 'thumb',
          fileName: file,
          fullPath,
          sizeBytes: fs.statSync(fullPath).size,
        });
        seen.add(key);
      } else if (file.endsWith('_contact.jpg')) {
        const key = `contact:${file}`;
        if (seen.has(key)) continue;
        const fullPath = path.join(dir, file);
        found.push({
          kind: 'contact',
          fileName: file,
          fullPath,
          sizeBytes: fs.statSync(fullPath).size,
        });
        seen.add(key);
      }
    }
  }

  return found;
}

export function buildExportManifest(): { projects: SyncManifestProjectEntry[] } {
  const all = getAllProjects().map((p) => withProjectMediaStatus(p));
  return {
    projects: all.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      currentVersion: p.currentVersion,
      hasMp4: Boolean(p.hasMp4),
      mediaFiles: listProjectMediaFiles(p).map((f) => ({
        kind: f.kind,
        fileName: f.fileName,
        sizeBytes: f.sizeBytes,
      })),
    })),
  };
}

export function resolveExportFile(
  projectId: string,
  kind: string,
  fileName: string
): string | null {
  const safeId = sanitizeSafeFilename(projectId);
  const safeName = sanitizeSafeFilename(fileName);
  const candidates: string[] = [];

  if (kind === 'mp4' && safeName.endsWith('.mp4')) {
    candidates.push(path.join(RENDERS_DIR, safeName));
    candidates.push(path.join(REPO_SAVED_VIDEOS_DIR, safeName));
  } else if (kind === 'voice' && safeName.endsWith('.mp3')) {
    candidates.push(path.join(PROJECTS_DIR, safeId, safeName));
    candidates.push(path.join(REPO_SAVED_MEDIA_DIR, safeId, safeName));
  } else if ((kind === 'thumb' || kind === 'contact') && safeName.endsWith('.jpg')) {
    candidates.push(path.join(RENDERS_DIR, safeName));
    candidates.push(path.join(REPO_SAVED_MEDIA_DIR, safeId, safeName));
  }

  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

export function receiveImportedFile(params: {
  projectId: string;
  kind: string;
  fileName: string;
  data: Buffer;
}): { savedPath: string; sizeBytes: number } {
  const safeId = sanitizeSafeFilename(params.projectId);
  const safeName = sanitizeSafeFilename(params.fileName);

  let targetPath: string;
  if (params.kind === 'mp4' && safeName.endsWith('.mp4')) {
    fs.mkdirSync(RENDERS_DIR, { recursive: true });
    targetPath = path.join(RENDERS_DIR, safeName);
  } else if (params.kind === 'voice' && safeName.endsWith('.mp3')) {
    const pDir = path.join(PROJECTS_DIR, safeId);
    fs.mkdirSync(pDir, { recursive: true });
    targetPath = path.join(pDir, safeName);
  } else if ((params.kind === 'thumb' || params.kind === 'contact') && safeName.endsWith('.jpg')) {
    fs.mkdirSync(RENDERS_DIR, { recursive: true });
    targetPath = path.join(RENDERS_DIR, safeName);
  } else {
    throw new Error(`Type ou extension de fichier non autorisé (${params.kind}/${safeName}).`);
  }

  const tmp = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, params.data);
  fs.renameSync(tmp, targetPath);

  const proj = getProject(safeId);
  if (proj) {
    mirrorProjectToRepo(proj);
  }

  return { savedPath: targetPath, sizeBytes: params.data.byteLength };
}

export async function pushProjectToRailway(
  projectId: string,
  overrideUrl?: string
): Promise<{ railwayUrl: string; uploadedFiles: string[] }> {
  const cfg = readSyncConfig();
  const railwayUrl = normalizeRailwayUrl(overrideUrl) || cfg.railwayUrl;
  if (!railwayUrl) {
    throw new Error('URL Railway non configurée.');
  }

  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Projet "${projectId}" introuvable.`);
  }

  const headersBase: Record<string, string> = {};
  if (cfg.syncSecret) headersBase['x-sync-secret'] = cfg.syncSecret;

  const projRes = await fetch(`${railwayUrl}/api/sync/import-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersBase,
    },
    body: JSON.stringify({ project }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!projRes.ok) {
    const errText = await projRes.text().catch(() => '');
    throw new Error(
      `Échec envoi métadonnées vers Railway (${projRes.status}): ${errText.slice(0, 180)}`
    );
  }

  const mediaFiles = listProjectMediaFiles(project);
  const uploadedFiles: string[] = [];

  for (const mf of mediaFiles) {
    const buf = fs.readFileSync(mf.fullPath);
    const fileRes = await fetch(`${railwayUrl}/api/sync/import-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-project-id': project.id,
        'x-file-kind': mf.kind,
        'x-file-name': mf.fileName,
        ...headersBase,
      },
      body: buf,
      signal: AbortSignal.timeout(120_000),
    });
    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '');
      throw new Error(
        `Échec upload ${mf.fileName} vers Railway (${fileRes.status}): ${errText.slice(0, 180)}`
      );
    }
    uploadedFiles.push(mf.fileName);
  }

  return { railwayUrl, uploadedFiles };
}

export async function pushAllProjectsToRailway(
  overrideUrl?: string,
  onlyProjectId?: string
): Promise<{ railwayUrl: string; projectsSynced: number; filesUploaded: number }> {
  const cfg = readSyncConfig();
  const railwayUrl = normalizeRailwayUrl(overrideUrl) || cfg.railwayUrl;
  if (!railwayUrl) {
    throw new Error('URL Railway non configurée.');
  }

  const projects = onlyProjectId
    ? [getProject(onlyProjectId)].filter((p): p is ShortProject => Boolean(p))
    : getAllProjects();

  let filesUploaded = 0;
  for (const proj of projects) {
    const r = await pushProjectToRailway(proj.id, railwayUrl);
    filesUploaded += r.uploadedFiles.length;
  }

  return {
    railwayUrl,
    projectsSynced: projects.length,
    filesUploaded,
  };
}

export async function pullFromRailway(
  overrideUrl?: string
): Promise<{ railwayUrl: string; pulledProjects: number; pulledFiles: number }> {
  const cfg = readSyncConfig();
  const railwayUrl = normalizeRailwayUrl(overrideUrl) || cfg.railwayUrl;
  if (!railwayUrl) {
    throw new Error('URL Railway non configurée.');
  }

  const headersBase: Record<string, string> = {};
  if (cfg.syncSecret) headersBase['x-sync-secret'] = cfg.syncSecret;

  const manifestRes = await fetch(`${railwayUrl}/api/sync/export-manifest`, {
    headers: headersBase,
    signal: AbortSignal.timeout(20_000),
  });
  if (!manifestRes.ok) {
    throw new Error(`Impossible de contacter Railway (${manifestRes.status}).`);
  }
  const manifest = (await manifestRes.json()) as { projects?: SyncManifestProjectEntry[] };
  const remoteProjects = manifest.projects || [];

  let pulledProjects = 0;
  let pulledFiles = 0;

  for (const remote of remoteProjects) {
    const localExisting = getProject(remote.id);
    if (!localExisting) {
      const pRes = await fetch(
        `${railwayUrl}/api/sync/export-project/${encodeURIComponent(remote.id)}`,
        { headers: headersBase, signal: AbortSignal.timeout(20_000) }
      );
      if (pRes.ok) {
        const pData = (await pRes.json()) as { project?: ShortProject };
        if (pData.project) {
          saveProject(pData.project);
          pulledProjects += 1;
        }
      }
    }

    for (const mf of remote.mediaFiles || []) {
      const alreadyLocal = resolveExportFile(remote.id, mf.kind, mf.fileName);
      if (alreadyLocal) continue;

      const fRes = await fetch(
        `${railwayUrl}/api/sync/export-file?projectId=${encodeURIComponent(remote.id)}&kind=${encodeURIComponent(mf.kind)}&fileName=${encodeURIComponent(mf.fileName)}`,
        { headers: headersBase, signal: AbortSignal.timeout(120_000) }
      );
      if (fRes.ok) {
        const buf = Buffer.from(await fRes.arrayBuffer());
        receiveImportedFile({
          projectId: remote.id,
          kind: mf.kind,
          fileName: mf.fileName,
          data: buf,
        });
        pulledFiles += 1;
      }
    }
  }

  return { railwayUrl, pulledProjects, pulledFiles };
}

export async function pushWorkspaceToGitHub(commitMessage?: string): Promise<{
  repo: string;
  committed: boolean;
  pushed: boolean;
  commitSha?: string;
}> {
  const cfg = readSyncConfig();
  if (!cfg.githubRepo || !cfg.githubToken) {
    throw new Error('Dépôt ou token GitHub non configuré.');
  }
  if (!fs.existsSync(path.join(ROOT_DIR, '.git'))) {
    throw new Error('Dépôt Git non initialisé dans ce workspace.');
  }

  // Ensure every project is mirrored cleanly before staging
  for (const p of getAllProjects()) {
    mirrorProjectToRepo(p);
  }

  const safePaths = [
    'src',
    'data/saved-projects',
    'data/saved-media',
    'public/video/renders',
    'public/audio',
    'video-agent',
    'scripts',
    'deploy',
    'server.ts',
    'Dockerfile',
    'railway.json',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    '.gitignore',
    '.env.example',
    'metadata.json',
  ].filter((rel) => fs.existsSync(path.join(ROOT_DIR, rel)));

  if (safePaths.length > 0) {
    await execFileAsync('git', ['add', '--', ...safePaths], { cwd: ROOT_DIR });
  }

  const diffCheck = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT_DIR });
  let committed = false;
  if (diffCheck.status !== 0) {
    const userName = spawnSync('git', ['config', 'user.name'], { cwd: ROOT_DIR, encoding: 'utf-8' });
    const userEmail = spawnSync('git', ['config', 'user.email'], { cwd: ROOT_DIR, encoding: 'utf-8' });
    if (!userName.stdout?.trim()) {
      await execFileAsync('git', ['config', 'user.name', 'Studio Short Bot'], { cwd: ROOT_DIR });
    }
    if (!userEmail.stdout?.trim()) {
      await execFileAsync('git', ['config', 'user.email', 'studio-short@users.noreply.github.com'], {
        cwd: ROOT_DIR,
      });
    }
    const msg =
      commitMessage?.trim() ||
      `Sync Studio Short (${getAllProjects().length} projets · ${new Date().toISOString().slice(0, 16)}Z)`;
    await execFileAsync('git', ['commit', '-m', msg], { cwd: ROOT_DIR });
    committed = true;
  }

  const cleanRemoteUrl = `https://github.com/${cfg.githubRepo}.git`;
  const remoteCheck = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  });
  if (remoteCheck.status !== 0) {
    await execFileAsync('git', ['remote', 'add', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
  } else if (remoteCheck.stdout.trim() !== cleanRemoteUrl) {
    await execFileAsync('git', ['remote', 'set-url', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
  }

  // Ephemeral GIT_ASKPASS script in os.tmpdir(), deleted immediately in finally{}
  const askPassPath = path.join(
    os.tmpdir(),
    `git-askpass-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sh`
  );
  const askPassScript = `#!/bin/sh
case "$1" in
  *Username*|*username*) printf '%s\\n' "x-access-token" ;;
  *) printf '%s\\n' "$STUDIO_GIT_PAT" ;;
esac
`;
  fs.writeFileSync(askPassPath, askPassScript, { mode: 0o700 });

  try {
    await execFileAsync('git', ['push', 'origin', 'HEAD:main'], {
      cwd: ROOT_DIR,
      timeout: 120_000,
      env: {
        ...process.env,
        GIT_ASKPASS: askPassPath,
        GIT_TERMINAL_PROMPT: '0',
        STUDIO_GIT_PAT: cfg.githubToken,
      },
    });
  } finally {
    fs.rmSync(askPassPath, { force: true });
  }

  const shaRes = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT_DIR, encoding: 'utf-8' });
  const commitSha = shaRes.status === 0 ? shaRes.stdout.trim() : undefined;

  return {
    repo: cfg.githubRepo,
    committed,
    pushed: true,
    commitSha,
  };
}

export async function runFullSync(opts: {
  target?: 'all' | 'github' | 'railway';
  projectId?: string;
  railwayUrl?: string;
  commitMessage?: string;
} = {}): Promise<{
  ok: boolean;
  github?: { repo: string; committed: boolean; pushed: boolean; commitSha?: string };
  railway?: { railwayUrl: string; projectsSynced: number; filesUploaded: number };
  summary: string;
  errors: string[];
}> {
  const target = opts.target || 'all';
  const cfg = readSyncConfig();
  hydrateSavedProjectsFromRepo();
  for (const p of getAllProjects()) {
    mirrorProjectToRepo(p);
  }

  const errors: string[] = [];
  let githubResult:
    | { repo: string; committed: boolean; pushed: boolean; commitSha?: string }
    | undefined;
  let railwayResult:
    | { railwayUrl: string; projectsSynced: number; filesUploaded: number }
    | undefined;

  if ((target === 'all' || target === 'railway') && (opts.railwayUrl || cfg.railwayUrl)) {
    try {
      railwayResult = await pushAllProjectsToRailway(opts.railwayUrl, opts.projectId);
    } catch (err) {
      errors.push(`Railway: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }

  if ((target === 'all' || target === 'github') && cfg.githubRepo && cfg.githubToken) {
    try {
      githubResult = await pushWorkspaceToGitHub(opts.commitMessage);
    } catch (err) {
      errors.push(`GitHub: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }

  const parts: string[] = [];
  if (railwayResult) {
    parts.push(
      `Railway (${railwayResult.projectsSynced} projet(s), ${railwayResult.filesUploaded} fichier(s))`
    );
  }
  if (githubResult) {
    parts.push(
      `GitHub ${githubResult.repo}${githubResult.commitSha ? ` (${githubResult.commitSha.slice(0, 7)})` : ''}`
    );
  }
  if (parts.length === 0 && errors.length === 0) {
    parts.push('Projets sauvegardés dans le dépôt local');
  }

  const summary =
    errors.length > 0 ? `${parts.join(' · ')} — Erreurs : ${errors.join(' | ')}` : parts.join(' · ');

  saveSyncConfig({
    lastSyncAt: new Date().toISOString(),
    lastSyncSummary: summary,
  });

  return {
    ok: errors.length === 0,
    github: githubResult,
    railway: railwayResult,
    summary,
    errors,
  };
}

export function triggerAutoSyncInBackground(projectId?: string): void {
  const cfg = readSyncConfig();
  if (!cfg.autoSync) return;
  if (!cfg.railwayUrl) return;
  void pushAllProjectsToRailway(cfg.railwayUrl, projectId).catch((err) => {
    console.warn('Background Railway sync failed (non-fatal):', err instanceof Error ? err.message : err);
  });
}
