import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildFeedbackPromptMarkdown, formatStudioTimecode, type ShortProject } from '../types/studio';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-short-test-'));
process.env.STORAGE_DIR = path.join(tempRoot, 'storage');
process.env.WHISPER_MODEL_PATH = '';

const storage = await import('./storageManager');
const engine = await import('./ffmpegEngine');
storage.initStorage();

const ffmpegAvailable = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

test('formatStudioTimecode formats mm:ss.cc accurately', () => {
  assert.equal(formatStudioTimecode(0), '00:00.00');
  assert.equal(formatStudioTimecode(6.24), '00:06.24');
  assert.equal(formatStudioTimecode(65.5), '01:05.50');
});

test('buildFeedbackPromptMarkdown lists only open feedbacks with metadata', () => {
  const proj: ShortProject = {
    id: 'proj-prompt-test',
    slug: 'prompt-test',
    title: 'Short Test',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'ready',
    duration: 53.8,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [{ version: 'v1', createdAt: '2026-11-14T00:00:00Z', status: 'done', duration: 53.8, fps: 25, notes: 'ok' }],
    transcript: [],
    motionTrack: [],
    layoutTrack: [],
    sfxTrack: [],
    musicTrack: { trackName: 'Bright_Corporate_Groove_8c962467.mp3', volume: 0.24, ducking: true },
    feedbacks: [
      {
        id: 'fb-1',
        timestamp: 12.5,
        timeFormatted: '00:12.50',
        text: 'Rapprocher le compteur de 85 % vers le haut',
        targetElement: 'Motion Top Card',
        quoteText: '85 %',
        author: 'Créateur',
        resolved: false,
        type: 'comment',
        createdAt: '2026-11-14T00:00:00Z',
      },
      {
        id: 'fb-2',
        timestamp: 3.2,
        timeFormatted: '00:03.20',
        text: 'Ancien retour résolu',
        author: 'Créateur',
        resolved: true,
        type: 'cut',
        createdAt: '2026-11-14T00:00:00Z',
      },
    ],
    motionComponents: {},
    contactSheet: [],
    styleProfile: {
      name: 'Papier signature',
      fontFamily: 'Bricolage Grotesque',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 8,
    },
  };

  const md = buildFeedbackPromptMarkdown(proj);
  assert.match(md, /1 retour ouvert/);
  assert.match(md, /00:12\.50/);
  assert.match(md, /Motion Top Card/);
  assert.doesNotMatch(md, /Ancien retour résolu/);
});

test('storageManager persists, reloads, and deletes projects on disk', () => {
  const proj: ShortProject = {
    id: 'proj-disk-test',
    slug: 'disk-test',
    title: 'Disk Persistence',
    mode: 'split_screen_clips',
    platform: 'instagram',
    status: 'draft',
    duration: 42,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [{ version: 'v1', createdAt: '2026-11-14T00:00:00Z', status: 'draft', duration: 42, fps: 25, notes: 'draft' }],
    transcript: [{ id: 'w-1', word: 'Bonjour', start: 0.1, end: 0.5, confidence: 0.99 }],
    motionTrack: [],
    layoutTrack: [],
    sfxTrack: [],
    musicTrack: { trackName: '', volume: 0.24, ducking: true },
    feedbacks: [],
    motionComponents: {},
    contactSheet: [],
    styleProfile: {
      name: 'Papier signature',
      fontFamily: 'Bricolage Grotesque',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 8,
    },
  };

  storage.saveProject(proj);
  const reloaded = storage.getProject('disk-test');
  assert.ok(reloaded);
  assert.equal(reloaded?.transcript.length, 1);
  assert.equal(reloaded?.title, 'Disk Persistence');

  const deleted = storage.deleteProject('proj-disk-test');
  assert.equal(deleted, true);
  assert.equal(storage.getProject('proj-disk-test'), null);
});

test('workspace state persists active project and switches versions cleanly', () => {
  const proj: ShortProject = {
    id: 'proj-ws-test',
    slug: 'ws-test',
    title: 'Workspace Sync Test',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'draft',
    duration: 45,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    currentVersion: 'v1',
    versions: [
      { version: 'v2', createdAt: '2026-11-14T01:00:00Z', status: 'draft', duration: 48, fps: 25, notes: 'v2 iter' },
      { version: 'v1', createdAt: '2026-11-14T00:00:00Z', status: 'draft', duration: 45, fps: 25, notes: 'v1 init' },
    ],
    transcript: [],
    motionTrack: [],
    layoutTrack: [],
    sfxTrack: [],
    musicTrack: { trackName: '', volume: 0.24, ducking: true },
    feedbacks: [],
    motionComponents: {},
    contactSheet: [],
    styleProfile: {
      name: 'Papier signature',
      fontFamily: 'Bricolage Grotesque',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 4,
    },
  };

  storage.saveProject(proj);
  const resV2 = storage.setActiveProjectAndVersion('proj-ws-test', 'v2');
  assert.equal(resV2.state.activeProjectId, 'proj-ws-test');
  assert.equal(resV2.state.activeVersion, 'v2');
  assert.equal(resV2.project.currentVersion, 'v2');
  assert.equal(resV2.project.duration, 48);

  const ws = storage.getWorkspaceState();
  assert.equal(ws.activeProjectId, 'proj-ws-test');
  assert.equal(ws.activeVersion, 'v2');

  storage.deleteProject('proj-ws-test');
});

test('detectAndRemoveSilences does not collapse a completely silent track', { skip: !ffmpegAvailable }, () => {
  const silentMp4 = path.join(storage.TAKES_DIR, 'silent-test.mp4');
  fs.mkdirSync(storage.TAKES_DIR, { recursive: true });
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=0xF1EEE6:s=320x568:r=24:d=3',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100:duration=3',
      '-shortest',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      silentMp4,
    ],
    { stdio: 'ignore', timeout: 60_000 }
  );

  const analysis = engine.detectAndRemoveSilences(silentMp4);
  assert.equal(analysis.totalSilencesRemoved, 0);
  assert.ok(analysis.adjustedDuration >= 2.8);
});

test('mirrorProjectToRepo and hydrateSavedProjectsFromRepo restore projects, media, and MP4 disk status cleanly', () => {
  const repoProjectsDir = path.join(tempRoot, 'repo-data', 'saved-projects');
  const repoMediaDir = path.join(tempRoot, 'repo-data', 'saved-media');
  const repoVideosDir = path.join(tempRoot, 'repo-public', 'video', 'renders');

  const proj: ShortProject = {
    id: 'proj-mirror-test',
    slug: 'mirror-test',
    title: 'Mirror Persistence Test',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'ready',
    duration: 32,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    audioTrackUrl: '/storage/projects/proj-mirror-test/voice_v1.mp3',
    currentVersion: 'v1',
    versions: [
      {
        version: 'v1',
        createdAt: '2026-11-16T00:00:00Z',
        status: 'done',
        duration: 32,
        fps: 25,
        notes: 'v1 ok',
        outputMp4: '/renders/mirror-test_v1.mp4',
        contactSheetUrl: '/renders/mirror-test_v1_contact.jpg',
      },
    ],
    transcript: [{ id: 'w-1', word: 'Test', start: 0.1, end: 0.4, confidence: 0.99 }],
    motionTrack: [],
    layoutTrack: [],
    sfxTrack: [],
    musicTrack: { trackName: 'upbeat', volume: 0.24, ducking: true },
    feedbacks: [],
    motionComponents: {},
    contactSheet: [],
    styleProfile: {
      name: 'Papier signature',
      fontFamily: 'Bricolage Grotesque',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 8,
    },
  };

  storage.saveProject(proj, { skipMirror: true });
  const projDir = path.join(storage.PROJECTS_DIR, proj.id);
  fs.writeFileSync(path.join(projDir, 'voice_v1.mp3'), Buffer.alloc(2048, 1));
  fs.writeFileSync(path.join(storage.RENDERS_DIR, 'mirror-test_v1_thumb.jpg'), Buffer.alloc(2048, 2));
  const renderedMp4 = path.join(storage.RENDERS_DIR, 'mirror-test_v1.mp4');
  fs.writeFileSync(renderedMp4, Buffer.alloc(4096, 3));

  const enrichedBefore = storage.withProjectMediaStatus(proj);
  assert.equal(enrichedBefore.hasMp4, true);
  assert.equal(enrichedBefore.versions[0].hasMp4, true);

  storage.mirrorProjectToRepo(proj, {
    repoProjectsDir,
    repoMediaDir,
    repoVideosDir,
    force: true,
  });

  assert.ok(fs.existsSync(path.join(repoProjectsDir, `${proj.id}.json`)));
  assert.ok(fs.existsSync(path.join(repoMediaDir, proj.id, 'voice_v1.mp3')));
  assert.ok(fs.existsSync(path.join(repoMediaDir, proj.id, 'mirror-test_v1_thumb.jpg')));
  assert.ok(fs.existsSync(path.join(repoVideosDir, 'mirror-test_v1.mp4')));

  // Simulate wiped local storage container and verify startup hydration restores everything
  fs.rmSync(projDir, { recursive: true, force: true });
  fs.rmSync(renderedMp4, { force: true });
  fs.rmSync(path.join(storage.RENDERS_DIR, 'mirror-test_v1_thumb.jpg'), { force: true });
  assert.equal(storage.getProject(proj.id), null);

  const hydrated = storage.hydrateSavedProjectsFromRepo({
    repoProjectsDir,
    repoMediaDir,
    repoVideosDir,
  });
  assert.equal(hydrated.restoredProjects, 1);
  assert.ok(hydrated.restoredMedia >= 3);

  const restored = storage.getProject(proj.id);
  assert.ok(restored);
  assert.equal(storage.withProjectMediaStatus(restored!).hasMp4, true);
  assert.ok(fs.existsSync(path.join(projDir, 'voice_v1.mp3')));
  assert.ok(fs.existsSync(renderedMp4));

  storage.deleteProject(proj.id);
});

