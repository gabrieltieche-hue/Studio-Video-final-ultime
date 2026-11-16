import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getLivePublicSyncStatus,
  pushAllProjectsToRailway,
  readSyncConfig,
  saveSyncConfig,
  triggerRailwayDeployHook,
} from '../src/server/syncManager';
import { ROOT_DIR, getAllProjects, mirrorProjectToRepo } from '../src/server/storageManager';

async function main() {
  const commitMessage =
    process.argv.slice(2).join(' ').trim() ||
    `chore: sync studio work (${new Date().toISOString().slice(0, 16)}Z)`;

  // 1. Verify TypeScript + production build before pushing
  console.log('1/4 · Verification TypeScript & build...');
  execFileSync('npm', ['run', 'lint'], { cwd: ROOT_DIR, stdio: 'inherit' });
  execFileSync('npm', ['run', 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });

  // 2. Mirror persisted projects cleanly
  for (const p of getAllProjects()) {
    mirrorProjectToRepo(p);
  }

  // 3. Stage tracked & safe project files (never secrets, storage/, or bun.lock)
  const cfg = readSyncConfig();
  if (!cfg.githubRepo || !cfg.githubToken) {
    throw new Error(
      'GitHub non configure : renseignez githubRepo et githubToken dans storage/sync-config.json ou GITHUB_TOKEN.'
    );
  }

  console.log(`2/4 · Commit & push vers ${cfg.githubRepo} (main)...`);
  const safePaths = [
    'AGENTS.md',
    'CLAUDE.md',
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
    '.dockerignore',
    '.env.example',
    'metadata.json',
  ].filter((rel) => fs.existsSync(path.join(ROOT_DIR, rel)));

  const cleanRemoteUrl = `https://github.com/${cfg.githubRepo}.git`;
  const askPassPath = path.join(
    os.tmpdir(),
    `git-askpass-${process.pid}-${Date.now()}.sh`
  );
  fs.writeFileSync(
    askPassPath,
    '#!/bin/sh\ncase "$1" in\n  *Username*|*username*) printf "%s\\n" "x-access-token" ;;\n  *) printf "%s\\n" "$STUDIO_GIT_PAT" ;;\nesac\n',
    { mode: 0o700 }
  );
  const gitAuthEnv = {
    ...process.env,
    GIT_ASKPASS: askPassPath,
    GIT_TERMINAL_PROMPT: '0',
    STUDIO_GIT_PAT: cfg.githubToken,
  };

  try {
    spawnSync('git', ['config', '--global', '--add', 'safe.directory', ROOT_DIR], {
      cwd: ROOT_DIR,
    });
    const hasValidHead =
      fs.existsSync(path.join(ROOT_DIR, '.git')) &&
      spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: ROOT_DIR }).status === 0;
    if (!hasValidHead) {
      console.log('Re-attachement du depot Git local a origin/main...');
      if (!fs.existsSync(path.join(ROOT_DIR, '.git'))) {
        execFileSync('git', ['init', '-b', 'main'], { cwd: ROOT_DIR, stdio: 'inherit' });
      }
      const hasOrigin =
        spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT_DIR }).status === 0;
      if (hasOrigin) {
        execFileSync('git', ['remote', 'set-url', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
      } else {
        execFileSync('git', ['remote', 'add', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
      }
      execFileSync('git', ['fetch', 'origin', 'main', '--depth=1'], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: gitAuthEnv,
      });
      execFileSync('git', ['reset', '--mixed', 'origin/main'], { cwd: ROOT_DIR });
    } else {
      const remoteCheck = spawnSync('git', ['remote', 'get-url', 'origin'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
      });
      if (remoteCheck.status !== 0) {
        execFileSync('git', ['remote', 'add', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
      } else if (remoteCheck.stdout.trim() !== cleanRemoteUrl) {
        execFileSync('git', ['remote', 'set-url', 'origin', cleanRemoteUrl], { cwd: ROOT_DIR });
      }
    }

    if (safePaths.length > 0) {
      execFileSync('git', ['add', '--', ...safePaths], { cwd: ROOT_DIR, stdio: 'inherit' });
    }

    const diffCheck = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT_DIR });
    if (diffCheck.status !== 0) {
      const userName = spawnSync('git', ['config', 'user.name'], { cwd: ROOT_DIR, encoding: 'utf-8' });
      const userEmail = spawnSync('git', ['config', 'user.email'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
      });
      if (!userName.stdout?.trim()) {
        execFileSync('git', ['config', 'user.name', 'Studio Short Bot'], { cwd: ROOT_DIR });
      }
      if (!userEmail.stdout?.trim()) {
        execFileSync(
          'git',
          ['config', 'user.email', 'studio-short@users.noreply.github.com'],
          { cwd: ROOT_DIR }
        );
      }
      execFileSync('git', ['commit', '-m', commitMessage], { cwd: ROOT_DIR, stdio: 'inherit' });
    } else {
      console.log('Aucun nouveau changement a committer ; push de HEAD:main...');
    }

    execFileSync('git', ['push', 'origin', 'HEAD:main'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: gitAuthEnv,
    });
  } finally {
    fs.rmSync(askPassPath, { force: true });
  }

  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  }).trim();
  console.log(`GitHub a jour : ${cfg.githubRepo}@${sha}`);

  // 4. Update & verify Railway
  console.log('3/4 · Mise a jour Railway...');
  if (cfg.railwayDeployHookUrl) {
    await triggerRailwayDeployHook(cfg.railwayDeployHookUrl);
    console.log('Deploy Hook Railway declenche.');
  } else {
    console.log(
      'Aucun Deploy Hook Railway configure ; Railway doit redeployer automatiquement depuis GitHub main.'
    );
  }

  console.log('4/4 · Verification du serveur Railway...');
  const status = await getLivePublicSyncStatus(true);
  if (!cfg.railwayUrl) {
    console.log('Aucune URL Railway configuree.');
    return;
  }

  if (status.railwaySyncReady) {
    const pushRes = await pushAllProjectsToRailway(cfg.railwayUrl);
    saveSyncConfig({
      lastSyncAt: new Date().toISOString(),
      lastSyncSummary: `GitHub ${cfg.githubRepo} (${sha}) · Railway (${pushRes.projectsSynced} projet(s), ${pushRes.filesUploaded} fichier(s))`,
    });
    console.log(
      `Railway synchronise (${pushRes.projectsSynced} projet(s), ${pushRes.filesUploaded} fichier(s), version=${status.railwayVersion || 'ok'}).`
    );
  } else {
    console.warn(
      `ATTENTION : GitHub (${sha}) est pousse, mais Railway (${cfg.railwayUrl}) repond encore en version "${status.railwayVersion || 'inconnue'}" sans /api/sync/*. Verifiez le redeploiement Railway (ou configurez RAILWAY_DEPLOY_HOOK_URL).`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
