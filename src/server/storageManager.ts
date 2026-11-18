import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ShortProject, StudioWorkspaceState } from '../types/studio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(ROOT_DIR, 'storage'));
export const TAKES_DIR = path.join(STORAGE_DIR, 'takes');
export const RENDERS_DIR = path.join(STORAGE_DIR, 'renders');
export const PROJECTS_DIR = path.join(STORAGE_DIR, 'projects');
export const COMPONENTS_DIR = path.join(STORAGE_DIR, 'components');
export const JOBS_DIR = path.join(STORAGE_DIR, 'jobs');
export const STYLES_DIR = path.join(STORAGE_DIR, 'styles');
export const MUSIC_DIR = path.join(STORAGE_DIR, 'music');
export const SFX_DIR = path.join(STORAGE_DIR, 'sfx');
export const WORKSPACE_STATE_FILE = path.join(STORAGE_DIR, 'workspace-state.json');

export const REPO_SAVED_PROJECTS_DIR = path.join(ROOT_DIR, 'data', 'saved-projects');
export const REPO_SAVED_MEDIA_DIR = path.join(ROOT_DIR, 'data', 'saved-media');
export const REPO_SAVED_VIDEOS_DIR = path.join(ROOT_DIR, 'public', 'video', 'renders');
const MAX_PORTABLE_MP4_BYTES = 48 * 1024 * 1024; // Keep under GitHub 50MB file limit

function isTempTestStorage(): boolean {
  const tmpRoot = path.resolve(os.tmpdir());
  const storageResolved = path.resolve(STORAGE_DIR);
  return storageResolved.startsWith(tmpRoot);
}

export function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function initStorage(): void {
  const dirs = [
    STORAGE_DIR,
    TAKES_DIR,
    RENDERS_DIR,
    PROJECTS_DIR,
    COMPONENTS_DIR,
    JOBS_DIR,
    STYLES_DIR,
    MUSIC_DIR,
    SFX_DIR,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function resolveProjectMp4Path(
  project: ShortProject,
  version?: string
): string | null {
  const targetVersion = version || project.currentVersion || 'v1';
  const versionObj = (project.versions || []).find((v) => v.version === targetVersion);
  const candidateRel = versionObj?.outputMp4;

  const candidates: string[] = [];
  if (candidateRel) {
    if (candidateRel.startsWith('/video/')) {
      candidates.push(path.join(ROOT_DIR, 'public', candidateRel));
    } else if (candidateRel.startsWith('/renders/')) {
      const base = path.basename(candidateRel);
      candidates.push(path.join(RENDERS_DIR, base));
      candidates.push(path.join(REPO_SAVED_VIDEOS_DIR, base));
    } else if (candidateRel.startsWith('/takes/')) {
      candidates.push(path.join(TAKES_DIR, path.basename(candidateRel)));
    }
  }

  candidates.push(path.join(RENDERS_DIR, `${project.slug}_${targetVersion}.mp4`));
  candidates.push(path.join(REPO_SAVED_VIDEOS_DIR, `${project.slug}_${targetVersion}.mp4`));
  candidates.push(path.join(RENDERS_DIR, `${project.slug}_${targetVersion}_draft.mp4`));
  if (project.isFlagshipReactStage) {
    candidates.push(path.join(ROOT_DIR, 'public/video/short-interdiction-15-ans.mp4'));
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).size >= 1024) {
        return candidate;
      }
    } catch {
      // ignore stat errors
    }
  }
  return null;
}

export function hasProjectMp4OnDisk(project: ShortProject, version?: string): boolean {
  return Boolean(resolveProjectMp4Path(project, version));
}

export function withProjectMediaStatus(project: ShortProject): ShortProject {
  const versions = (project.versions || []).map((v) => {
    const mp4Path = resolveProjectMp4Path(project, v.version);
    const hasMp4 = Boolean(mp4Path);
    let outputMp4 = v.outputMp4;
    if (mp4Path && !outputMp4) {
      if (mp4Path.startsWith(path.join(ROOT_DIR, 'public', 'video'))) {
        outputMp4 = `/video/${path.relative(path.join(ROOT_DIR, 'public', 'video'), mp4Path).replace(/\\/g, '/')}`;
      } else {
        outputMp4 = `/renders/${path.basename(mp4Path)}`;
      }
    }
    return {
      ...v,
      outputMp4,
      hasMp4,
    };
  });

  const activeVer = versions.find((v) => v.version === project.currentVersion);
  const currentHasMp4 =
    Boolean(activeVer?.hasMp4) || hasProjectMp4OnDisk(project, project.currentVersion);

  let currentHasVoice = Boolean(project.isFlagshipReactStage);
  if (!currentHasVoice && project.audioTrackUrl) {
    const baseName = path.basename(project.audioTrackUrl);
    const candidates = [
      path.join(PROJECTS_DIR, project.id, baseName),
      path.join(REPO_SAVED_MEDIA_DIR, project.id, baseName),
      path.join(ROOT_DIR, 'public', project.audioTrackUrl.replace(/^\/+/, '')),
    ];
    currentHasVoice = candidates.some((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).size >= 1024;
      } catch {
        return false;
      }
    });
  }

  return {
    ...project,
    versions,
    hasMp4: currentHasMp4,
    hasVoice: currentHasVoice,
  };
}

export interface MirrorRepoOptions {
  repoProjectsDir?: string;
  repoMediaDir?: string;
  repoVideosDir?: string;
  force?: boolean;
}

export function mirrorProjectToRepo(
  project: ShortProject,
  opts: MirrorRepoOptions = {}
): void {
  if (!opts.force && isTempTestStorage()) return;

  const projectsDir = opts.repoProjectsDir || REPO_SAVED_PROJECTS_DIR;
  const mediaDir = opts.repoMediaDir || REPO_SAVED_MEDIA_DIR;
  const videosDir = opts.repoVideosDir || REPO_SAVED_VIDEOS_DIR;

  fs.mkdirSync(projectsDir, { recursive: true });
  const enriched = withProjectMediaStatus(project);
  writeJsonAtomic(path.join(projectsDir, `${project.id}.json`), enriched);

  const projStorageDir = path.join(PROJECTS_DIR, project.id);
  const targetMediaDir = path.join(mediaDir, project.id);

  // Mirror voice MP3 files and render thumbnails/contact sheets
  if (fs.existsSync(projStorageDir)) {
    const entries = fs.readdirSync(projStorageDir);
    for (const name of entries) {
      if (name.endsWith('.mp3') && !name.startsWith('raw-')) {
        fs.mkdirSync(targetMediaDir, { recursive: true });
        const src = path.join(projStorageDir, name);
        const dst = path.join(targetMediaDir, name);
        if (fs.statSync(src).size <= 15 * 1024 * 1024) {
          fs.copyFileSync(src, dst);
        }
      }
    }
  }

  if (fs.existsSync(RENDERS_DIR)) {
    const renderFiles = fs.readdirSync(RENDERS_DIR);
    for (const file of renderFiles) {
      if (!file.startsWith(`${project.slug}_`)) continue;
      const src = path.join(RENDERS_DIR, file);
      if (!fs.statSync(src).isFile()) continue;

      if (file.endsWith('_thumb.jpg') || file.endsWith('_contact.jpg')) {
        fs.mkdirSync(targetMediaDir, { recursive: true });
        fs.copyFileSync(src, path.join(targetMediaDir, file));
      } else if (
        file.endsWith('.mp4') &&
        !file.endsWith('_draft.mp4') &&
        fs.statSync(src).size <= MAX_PORTABLE_MP4_BYTES
      ) {
        fs.mkdirSync(videosDir, { recursive: true });
        fs.copyFileSync(src, path.join(videosDir, file));
      }
    }
  }
}

export function hydrateSavedProjectsFromRepo(
  opts: MirrorRepoOptions = {}
): { restoredProjects: number; restoredMedia: number } {
  const projectsDir = opts.repoProjectsDir || REPO_SAVED_PROJECTS_DIR;
  const mediaDir = opts.repoMediaDir || REPO_SAVED_MEDIA_DIR;
  const videosDir = opts.repoVideosDir || REPO_SAVED_VIDEOS_DIR;

  initStorage();
  let restoredProjects = 0;
  let restoredMedia = 0;

  if (fs.existsSync(projectsDir)) {
    const jsonFiles = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.json'));
    for (const file of jsonFiles) {
      try {
        const snapshot = JSON.parse(
          fs.readFileSync(path.join(projectsDir, file), 'utf-8')
        ) as ShortProject;
        if (!snapshot?.id) continue;

        const targetDir = path.join(PROJECTS_DIR, snapshot.id);
        const targetProjectFile = path.join(targetDir, 'project.json');
        if (!fs.existsSync(targetProjectFile)) {
          fs.mkdirSync(targetDir, { recursive: true });
          writeJsonAtomic(targetProjectFile, snapshot);
          if (snapshot.transcript) {
            writeJsonAtomic(path.join(targetDir, 'transcript.json'), snapshot.transcript);
          }
          if (snapshot.feedbacks) {
            writeJsonAtomic(path.join(targetDir, 'feedbacks.json'), snapshot.feedbacks);
          }
          if (snapshot.versions) {
            writeJsonAtomic(path.join(targetDir, 'versions.json'), snapshot.versions);
          }
          if (snapshot.motionComponents) {
            writeJsonAtomic(path.join(targetDir, 'components.json'), snapshot.motionComponents);
          }
          if (snapshot.editSpec) {
            writeJsonAtomic(path.join(targetDir, 'spec.json'), snapshot.editSpec);
          }
          restoredProjects += 1;
        }

        // Restore saved lightweight media (voice MP3, thumbs, contact sheets) if missing locally
        const sourceMediaDir = path.join(mediaDir, snapshot.id);
        if (fs.existsSync(sourceMediaDir)) {
          const mFiles = fs.readdirSync(sourceMediaDir);
          for (const m of mFiles) {
            const src = path.join(sourceMediaDir, m);
            if (!fs.statSync(src).isFile()) continue;
            if (m.endsWith('.mp3')) {
              fs.mkdirSync(targetDir, { recursive: true });
              const dst = path.join(targetDir, m);
              if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
                restoredMedia += 1;
              }
            } else if (m.endsWith('.jpg') || m.endsWith('.png')) {
              const dst = path.join(RENDERS_DIR, m);
              if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
                restoredMedia += 1;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Hydration error for ${file}:`, err);
      }
    }
  }

  // Restore portable rendered MP4s into RENDERS_DIR if absent locally
  if (fs.existsSync(videosDir)) {
    const mp4Files = fs.readdirSync(videosDir).filter((f) => f.endsWith('.mp4'));
    for (const f of mp4Files) {
      const src = path.join(videosDir, f);
      const dst = path.join(RENDERS_DIR, f);
      try {
        if (fs.statSync(src).isFile() && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
          restoredMedia += 1;
        }
      } catch {
        // non-fatal copy error
      }
    }
  }

  return { restoredProjects, restoredMedia };
}

export function saveProject(project: ShortProject, opts: { skipMirror?: boolean } = {}): void {
  initStorage();
  const projectDir = path.join(PROJECTS_DIR, project.id);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  writeJsonAtomic(path.join(projectDir, 'project.json'), project);
  if (project.transcript) {
    writeJsonAtomic(path.join(projectDir, 'transcript.json'), project.transcript);
  }
  if (project.feedbacks) {
    writeJsonAtomic(path.join(projectDir, 'feedbacks.json'), project.feedbacks);
  }
  if (project.versions) {
    writeJsonAtomic(path.join(projectDir, 'versions.json'), project.versions);
  }
  if (project.motionComponents) {
    writeJsonAtomic(path.join(projectDir, 'components.json'), project.motionComponents);
  }
  if (project.editSpec) {
    writeJsonAtomic(path.join(projectDir, 'spec.json'), project.editSpec);
  }
  if (project.silenceAnalysis) {
    writeJsonAtomic(path.join(projectDir, 'silence-analysis.json'), project.silenceAnalysis);
  }
  if (!opts.skipMirror) {
    mirrorProjectToRepo(project);
  }
}

export function getAllProjects(): ShortProject[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: ShortProject[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pFile = path.join(PROJECTS_DIR, entry.name, 'project.json');
    if (!fs.existsSync(pFile)) continue;
    try {
      const p = JSON.parse(fs.readFileSync(pFile, 'utf-8')) as ShortProject;
      const fbFile = path.join(PROJECTS_DIR, entry.name, 'feedbacks.json');
      if (fs.existsSync(fbFile)) {
        p.feedbacks = JSON.parse(fs.readFileSync(fbFile, 'utf-8'));
      }
      const vFile = path.join(PROJECTS_DIR, entry.name, 'versions.json');
      if (fs.existsSync(vFile)) {
        p.versions = JSON.parse(fs.readFileSync(vFile, 'utf-8'));
      }
      const specFile = path.join(PROJECTS_DIR, entry.name, 'spec.json');
      if (fs.existsSync(specFile)) {
        p.editSpec = JSON.parse(fs.readFileSync(specFile, 'utf-8'));
      }
      const silenceFile = path.join(PROJECTS_DIR, entry.name, 'silence-analysis.json');
      if (fs.existsSync(silenceFile)) {
        p.silenceAnalysis = JSON.parse(fs.readFileSync(silenceFile, 'utf-8'));
      }
      const tFile = path.join(PROJECTS_DIR, entry.name, 'transcript.json');
      if (fs.existsSync(tFile)) {
        p.transcript = JSON.parse(fs.readFileSync(tFile, 'utf-8'));
      }
      projects.push(p);
    } catch (err) {
      console.error(`Error loading project ${entry.name}:`, err);
    }
  }
  return projects;
}

export function getProject(idOrSlug: string): ShortProject | null {
  const all = getAllProjects();
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

export function deleteProject(idOrSlug: string): boolean {
  const p = getProject(idOrSlug);
  if (!p) return false;
  const projectDir = path.join(PROJECTS_DIR, p.id);
  let removed = false;
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
    removed = true;
  }

  if (!isTempTestStorage()) {
    const repoJson = path.join(REPO_SAVED_PROJECTS_DIR, `${p.id}.json`);
    if (fs.existsSync(repoJson)) fs.rmSync(repoJson, { force: true });

    const repoMedia = path.join(REPO_SAVED_MEDIA_DIR, p.id);
    if (fs.existsSync(repoMedia)) fs.rmSync(repoMedia, { recursive: true, force: true });

    if (fs.existsSync(REPO_SAVED_VIDEOS_DIR)) {
      for (const f of fs.readdirSync(REPO_SAVED_VIDEOS_DIR)) {
        if (f.startsWith(`${p.slug}_`) && f.endsWith('.mp4')) {
          fs.rmSync(path.join(REPO_SAVED_VIDEOS_DIR, f), { force: true });
        }
      }
    }
  }

  if (removed) {
    const state = getWorkspaceState();
    if (state.activeProjectId === p.id) {
      const remaining = getAllProjects();
      if (remaining[0]) {
        saveWorkspaceState({
          activeProjectId: remaining[0].id,
          activeVersion: remaining[0].currentVersion,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return true;
  }
  return false;
}

export function getWorkspaceState(): StudioWorkspaceState {
  initStorage();
  const projects = getAllProjects();
  const fallbackProject =
    projects.find((p) => p.id === 'proj-interdiction-15-ans') || projects[0] || null;
  if (fs.existsSync(WORKSPACE_STATE_FILE)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(WORKSPACE_STATE_FILE, 'utf-8')
      ) as StudioWorkspaceState;
      const found = projects.find(
        (p) => p.id === parsed.activeProjectId || p.slug === parsed.activeProjectId
      );
      if (found) {
        return {
          activeProjectId: found.id,
          activeVersion: parsed.activeVersion || found.currentVersion,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // fall through to default
    }
  }
  return {
    activeProjectId: fallbackProject?.id || 'proj-interdiction-15-ans',
    activeVersion: fallbackProject?.currentVersion || 'v1',
    updatedAt: new Date().toISOString(),
  };
}

export function saveWorkspaceState(state: StudioWorkspaceState): StudioWorkspaceState {
  initStorage();
  const next: StudioWorkspaceState = {
    activeProjectId: state.activeProjectId,
    activeVersion: state.activeVersion,
    updatedAt: state.updatedAt || new Date().toISOString(),
  };
  writeJsonAtomic(WORKSPACE_STATE_FILE, next);
  return next;
}

export function setActiveProjectAndVersion(
  projectIdOrSlug: string,
  version?: string
): { project: ShortProject; state: StudioWorkspaceState } {
  const proj = getProject(projectIdOrSlug);
  if (!proj) {
    throw new Error(`Projet "${projectIdOrSlug}" introuvable.`);
  }
  let targetVersion = proj.currentVersion;
  if (version) {
    const matched = (proj.versions || []).find((v) => v.version === version);
    if (!matched) {
      throw new Error(`Version "${version}" introuvable sur le projet "${proj.title}".`);
    }
    proj.currentVersion = matched.version;
    if (matched.duration > 0) proj.duration = matched.duration;
    saveProject(proj);
    targetVersion = matched.version;
  }
  const state = saveWorkspaceState({
    activeProjectId: proj.id,
    activeVersion: targetVersion,
    updatedAt: new Date().toISOString(),
  });
  return { project: proj, state };
}

