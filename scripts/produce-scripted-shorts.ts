#!/usr/bin/env node
/**
 * Rend des Shorts 1080x1920 à partir de scripts écrits à la main.
 *
 * Contrairement au lot /api/batch/start, aucun appel Gemini n'est fait : le
 * fichier JSON d'entrée contient déjà les 8 beats, le studio ne s'occupe que de
 * la voix, du timing, de la musique et du rendu MP4.
 *
 * Usage :
 *   npx tsx scripts/produce-scripted-shorts.ts <scripts.json> [--port 3000]
 */
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import type { BatchBeatSpec } from '../src/types/batch';
import { LOOK_PRESETS, type LookId } from '../src/data/shortSpec';
import {
  assignBeatTimingsAndTranscript,
  sanitizeScriptText,
} from '../src/engine/batchShortBuilder';
import { normalizeSlug } from '../src/engine/topicCsv';
import type { ShortProject } from '../src/types/studio';
import {
  PROJECTS_DIR,
  getAllProjects,
  initStorage,
  saveProject,
} from '../src/server/storageManager';
import { synthesizeVoiceoverUnified } from '../src/server/voiceEngineService';
import { renderDynamicProjectToMp4 } from '../src/server/batchRenderer';

interface ScriptedShort {
  topicId?: string;
  category: string;
  theme: string;
  hookText: string;
  youtubeTitle: string;
  caption: string;
  hashtags: string[];
  sources?: string;
  beats: BatchBeatSpec[];
}

interface InputFile {
  lookId?: LookId;
  musicTrack?: string;
  speed?: number;
  shorts: ScriptedShort[];
}

function readPort(): number {
  const idx = process.argv.indexOf('--port');
  if (idx !== -1 && process.argv[idx + 1]) return Number(process.argv[idx + 1]) || 3000;
  return Number(process.env.PORT) || 3000;
}

function uniqueIds(baseTitle: string): { id: string; slug: string } {
  const existing = getAllProjects();
  const slugs = new Set(existing.map((p) => p.slug));
  const ids = new Set(existing.map((p) => p.id));
  const base = (normalizeSlug(baseTitle).slice(0, 40) || `short-${Date.now()}`).replace(/-+$/, '');
  let slug = base;
  let n = 2;
  while (slugs.has(slug) || ids.has(`proj-${slug}`)) {
    slug = `${base.slice(0, 35)}-${n}`;
    n += 1;
  }
  return { id: `proj-${slug}`, slug };
}

async function produceOne(short: ScriptedShort, cfg: Required<Pick<InputFile, 'lookId' | 'musicTrack' | 'speed'>>, port: number) {
  const lookPreset = LOOK_PRESETS[cfg.lookId] || LOOK_PRESETS.papier;
  const beats = short.beats.map((b, i) => ({
    ...b,
    id: b.id || `beat-${i + 1}`,
    spokenLine: sanitizeScriptText(b.spokenLine),
  }));
  const fullSpokenText = beats.map((b) => b.spokenLine).join(' ');
  const { id: projectId, slug } = uniqueIds(short.theme);
  const projectDir = path.join(PROJECTS_DIR, projectId);
  fs.mkdirSync(projectDir, { recursive: true });

  console.log(`\n=== ${short.theme}\n    ${beats.length} beats · ${fullSpokenText.split(/\s+/).length} mots`);
  console.log('    1/3 voix...');
  const voice = await synthesizeVoiceoverUnified({
    projectDir,
    fullText: fullSpokenText,
    speed: cfg.speed,
  });
  console.log(`        voix=${voice.providerUsed} durée=${voice.durationSec.toFixed(2)}s`);

  const timed = assignBeatTimingsAndTranscript(beats, voice.words, voice.durationSec);
  const project: ShortProject = {
    id: projectId,
    slug,
    title: sanitizeScriptText(short.theme),
    topicId: short.topicId,
    topicCategory: short.category,
    hookText: short.hookText,
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'rendering',
    duration: timed.durationSec,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    audioTrackUrl: voice.audioTrackUrl,
    voiceProvider: voice.providerUsed,
    currentVersion: 'v1',
    versions: [
      {
        version: 'v1',
        createdAt: new Date().toISOString(),
        status: 'rendering',
        duration: timed.durationSec,
        fps: 25,
        notes: `Script écrit main · Look ${lookPreset.label}`,
        audioTrackUrl: voice.audioTrackUrl,
      },
    ],
    transcript: voice.words,
    motionTrack: timed.motionTrack,
    layoutTrack: timed.beats.map((b) => ({
      id: `layout-${b.id}`,
      layout: b.layout,
      start: b.from,
      end: b.to,
    })),
    sfxTrack: timed.sfxTrack,
    musicTrack: { trackName: cfg.musicTrack, volume: 0.24, ducking: true },
    feedbacks: [],
    motionComponents: {},
    contactSheet: [],
    editSpec: {
      lookId: cfg.lookId,
      speed: cfg.speed,
      hookText: short.hookText,
      sources: short.sources || '',
      youtubeTitle: short.youtubeTitle,
      caption: short.caption,
      hashtags: short.hashtags,
      beats: timed.beats,
    },
    styleProfile: {
      name: lookPreset.label,
      fontFamily: lookPreset.fontDisplay.replace(/['"]/g, '').split(',')[0] || 'Bricolage Grotesque',
      accentColor: lookPreset.accent,
      textColor: lookPreset.ink,
      cardBg: lookPreset.sheet,
      captionsPosition: 'bottom',
      visualBeatsTarget: timed.beats.length,
    },
  };
  saveProject(project);

  console.log('    2/3 rendu MP4 1080x1920...');
  const rendered = await renderDynamicProjectToMp4({
    project,
    version: 'v1',
    lookId: cfg.lookId,
    port,
    voiceMp3Path: voice.voiceMp3Path,
    onProgress: (pct) => {
      if (pct % 20 === 0) console.log(`        ${pct}%`);
    },
  });

  project.status = 'ready';
  project.duration = rendered.duration;
  project.versions[0] = {
    ...project.versions[0],
    status: 'done',
    duration: rendered.duration,
    outputMp4: rendered.outputMp4Url,
    contactSheetUrl: rendered.contactSheetUrl,
  };
  saveProject(project);
  console.log(`    3/3 prêt : ${rendered.outputMp4Url}`);
  return { project, rendered };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/produce-scripted-shorts.ts <scripts.json> [--port 3000]');
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as InputFile;
  if (!Array.isArray(input.shorts) || input.shorts.length === 0) {
    throw new Error('Aucun short dans le fichier.');
  }
  const cfg = {
    lookId: (input.lookId || 'papier') as LookId,
    musicTrack: input.musicTrack || 'upbeat',
    speed: Number(input.speed) || 1.06,
  };
  const port = readPort();
  initStorage();

  for (const short of input.shorts) {
    await produceOne(short, cfg, port);
  }
  console.log('\nTerminé.');
}

main().catch((err) => {
  console.error('Échec :', err instanceof Error ? err.message : err);
  process.exit(1);
});
