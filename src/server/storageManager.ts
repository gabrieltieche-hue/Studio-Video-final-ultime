import fs from 'node:fs';
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

export function saveProject(project: ShortProject): void {
  initStorage();
  const projectDir = path.join(PROJECTS_DIR, project.id);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2), 'utf-8');
  if (project.transcript) {
    fs.writeFileSync(path.join(projectDir, 'transcript.json'), JSON.stringify(project.transcript, null, 2), 'utf-8');
  }
  if (project.feedbacks) {
    fs.writeFileSync(path.join(projectDir, 'feedbacks.json'), JSON.stringify(project.feedbacks, null, 2), 'utf-8');
  }
  if (project.versions) {
    fs.writeFileSync(path.join(projectDir, 'versions.json'), JSON.stringify(project.versions, null, 2), 'utf-8');
  }
  if (project.motionComponents) {
    fs.writeFileSync(
      path.join(projectDir, 'components.json'),
      JSON.stringify(project.motionComponents, null, 2),
      'utf-8'
    );
  }
  if (project.editSpec) {
    fs.writeFileSync(path.join(projectDir, 'spec.json'), JSON.stringify(project.editSpec, null, 2), 'utf-8');
  }
  if (project.silenceAnalysis) {
    fs.writeFileSync(
      path.join(projectDir, 'silence-analysis.json'),
      JSON.stringify(project.silenceAnalysis, null, 2),
      'utf-8'
    );
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
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
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
  fs.writeFileSync(WORKSPACE_STATE_FILE, JSON.stringify(next, null, 2), 'utf-8');
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
