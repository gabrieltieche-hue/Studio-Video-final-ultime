import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { LookId } from '../data/shortSpec';
import type { ShortProject } from '../types/studio';
import {
  extractThumbnail,
  generateContactSheet,
  probeVideo,
  resolveChromeExecutable,
} from './ffmpegEngine';
import { MUSIC_DIR, RENDERS_DIR, ROOT_DIR, SFX_DIR } from './storageManager';

const CHROME_SWITCHES = [
  '--headless',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--mute-audio',
  '--force-color-profile=srgb',
  '--remote-debugging-pipe',
];

export function resolveMusicAssetPath(trackName?: string): string | null {
  const clean = String(trackName || 'upbeat').trim();
  const baseMap: Record<string, string> = {
    upbeat: 'upbeat.mp3',
    groove: 'groove.mp3',
    analytical: 'analytical.mp3',
    clockwork: 'clockwork.mp3',
    chill: 'chill.mp3',
    'Bright_Corporate_Groove_8c962467.mp3': 'upbeat.mp3',
    'Seamless_Groove_56a65455.mp3': 'groove.mp3',
    'Analytical_Mood_f3863ea1.mp3': 'analytical.mp3',
    'Clockwork_Tension_33a7e6c6.mp3': 'clockwork.mp3',
    'Sleek_Chill_Underscore_3bd1f10a.mp3': 'chill.mp3',
  };
  const fileName = baseMap[clean] || (clean.endsWith('.mp3') ? path.basename(clean) : `${clean}.mp3`);
  const candidates = [
    path.join(MUSIC_DIR, fileName),
    path.join(ROOT_DIR, 'public/audio/music', fileName),
    path.join(ROOT_DIR, 'public/audio/music/upbeat.mp3'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function resolveSfxAssetPath(soundName: string): string | null {
  const clean = String(soundName || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!clean) return null;
  for (const ext of ['mp3', 'wav', 'm4a', 'ogg']) {
    const p1 = path.join(SFX_DIR, `${clean}.${ext}`);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(ROOT_DIR, 'public/audio/sfx', `${clean}.${ext}`);
    if (fs.existsSync(p2)) return p2;
  }
  return null;
}

export function probeAudioDurationSec(audioPath: string, fallback = 30): number {
  try {
    const out = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ],
      { encoding: 'utf-8', timeout: 20_000 }
    );
    const val = Number(out.trim());
    if (Number.isFinite(val) && val > 0.5) {
      return Number(val.toFixed(2));
    }
  } catch {
    // fallback below
  }
  return fallback;
}

export function applyVoiceSpeedMp3(
  rawMp3Path: string,
  targetMp3Path: string,
  speed = 1.0
): number {
  const safeSpeed = Math.max(0.75, Math.min(1.5, speed || 1.0));
  if (Math.abs(safeSpeed - 1.0) <= 0.01) {
    if (rawMp3Path !== targetMp3Path) {
      fs.copyFileSync(rawMp3Path, targetMp3Path);
    }
    return probeAudioDurationSec(targetMp3Path, 35);
  }
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      rawMp3Path,
      '-filter:a',
      `atempo=${safeSpeed.toFixed(3)}`,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      targetMp3Path,
    ],
    { stdio: 'pipe', timeout: 60_000 }
  );
  return probeAudioDurationSec(targetMp3Path, 35);
}

function launchRenderChrome(chromeExe: string, url: string) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-chrome-'));
  const proc = spawn(
    chromeExe,
    [...CHROME_SWITCHES, `--user-data-dir=${userDir}`, '--window-size=1080,1920', url],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
  );

  let msgId = 0;
  let rest = Buffer.alloc(0);
  let closed = false;
  const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void; timer: NodeJS.Timeout }>();
  let errBuf = '';

  const rejectAllPending = (reason: string) => {
    closed = true;
    for (const [id, q] of pending.entries()) {
      clearTimeout(q.timer);
      q.rej(new Error(reason));
      pending.delete(id);
    }
  };

  proc.stderr?.on('data', (d) => {
    errBuf = (errBuf + d).slice(-2000);
  });

  proc.once('error', (err) => {
    rejectAllPending(`Erreur lancement Chromium: ${err.message}`);
  });

  proc.once('exit', (code, signal) => {
    rejectAllPending(`Chromium arrêté prématurément (code ${code ?? 'null'}, signal ${signal ?? 'none'}) ${errBuf}`.trim());
  });

  proc.stdio[4]!.on('data', (chunk: Buffer) => {
    let buf = Buffer.concat([rest, chunk]);
    let idx: number;
    while ((idx = buf.indexOf(0)) >= 0) {
      const m = JSON.parse(buf.subarray(0, idx).toString('utf8'));
      buf = buf.subarray(idx + 1);
      if (m.id && pending.has(m.id)) {
        const q = pending.get(m.id)!;
        clearTimeout(q.timer);
        pending.delete(m.id);
        if (m.error) q.rej(new Error(m.error.message));
        else q.res(m.result);
      }
    }
    rest = buf;
  });

  const send = <T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ) =>
    new Promise<T>((res, rej) => {
      if (closed || proc.killed) {
        rej(new Error('Session Chromium fermée.'));
        return;
      }
      const id = ++msgId;
      const timer = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          rej(new Error(`Délai CDP dépassé pour ${method}`));
        }
      }, 25_000);
      pending.set(id, { res: res as (v: unknown) => void, rej, timer });
      try {
        (proc.stdio[3] as NodeJS.WritableStream).write(
          JSON.stringify({ id, method, params, sessionId }) + '\0'
        );
      } catch (err) {
        clearTimeout(timer);
        pending.delete(id);
        rej(err instanceof Error ? err : new Error(String(err)));
      }
    });

  const attachWorker = async (targetId: string) => {
    const { sessionId } = await send<{ sessionId: string }>('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await send('Page.enable', {}, sessionId);
    await send(
      'Emulation.setDeviceMetricsOverride',
      { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false },
      sessionId
    );

    const evalPage = async (expr: string) => {
      const r = await send<{
        result?: { value?: unknown };
        exceptionDetails?: { text?: string; exception?: { description?: string } };
      }>(
        'Runtime.evaluate',
        { expression: expr, awaitPromise: true, returnByValue: true },
        sessionId
      );
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      }
      return r.result?.value;
    };

    const startMs = Date.now();
    while (!(await evalPage('Boolean(window.__SHORT_READY)'))) {
      if (Date.now() - startMs > 30_000) {
        throw new Error(`Délai initialisation Chromium dépassé (${errBuf})`);
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    await evalPage('document.fonts.ready.then(() => true)');

    return async (timeSec: number) => {
      await evalPage(
        `new Promise(r => { window.__setShortTime(${timeSec.toFixed(4)}); requestAnimationFrame(r); })`
      );
      const { data } = await send<{ data: string }>(
        'Page.captureScreenshot',
        { format: 'jpeg', quality: 88, optimizeForSpeed: true, fromSurface: true },
        sessionId
      );
      return Buffer.from(data, 'base64');
    };
  };

  const close = async () => {
    try {
      proc.kill('SIGKILL');
    } catch {
      // ignore
    }
    await fs.promises.rm(userDir, { recursive: true, force: true }).catch(() => {});
  };

  return { send, attachWorker, close, getErr: () => errBuf };
}

function renderChunkToMp4(
  captureFrame: (timeSec: number) => Promise<Buffer>,
  startFrame: number,
  endFrame: number,
  totalFrames: number,
  fps: number,
  durationSec: number,
  outFile: string,
  onFrameRendered?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-f',
        'image2pipe',
        '-vcodec',
        'mjpeg',
        '-framerate',
        String(fps),
        '-i',
        'pipe:0',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        outFile,
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] }
    );

    let ffErr = '';
    ff.stderr.on('data', (d) => {
      ffErr = (ffErr + d).slice(-1000);
    });
    ff.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg worker a échoué (code ${code}): ${ffErr}`));
    });

    (async () => {
      try {
        for (let i = startFrame; i < endFrame; i++) {
          const t = Math.min(durationSec - 0.01, i / fps);
          const jpg = await captureFrame(t);
          if (!ff.stdin.write(jpg)) {
            await new Promise<void>((r) => ff.stdin.once('drain', () => r()));
          }
          onFrameRendered?.();
          if (i >= totalFrames) break;
        }
        ff.stdin.end();
      } catch (err) {
        try {
          ff.kill('SIGKILL');
        } catch {
          // ignore
        }
        reject(err);
      }
    })();
  });
}

export async function renderDynamicProjectToMp4(params: {
  project: ShortProject;
  version: string;
  lookId: LookId;
  port: number;
  voiceMp3Path?: string;
  onProgress?: (pct: number) => void;
}): Promise<{
  outputMp4Path: string;
  outputMp4Url: string;
  thumbnailUrl: string;
  contactSheetUrl: string;
  duration: number;
  sizeMb: number;
}> {
  const chromeExe = resolveChromeExecutable();
  if (!chromeExe) {
    throw new Error('Chromium headless introuvable sur le serveur pour le rendu MP4.');
  }

  fs.mkdirSync(RENDERS_DIR, { recursive: true });
  const durationSec = Math.max(8, Math.min(180, params.project.duration || 40));
  const fps = 25;
  const totalFrames = Math.max(25, Math.round(durationSec * fps));
  const workersCount = 2;

  const outFileName = `${params.project.slug}_${params.version}.mp4`;
  const outputMp4Path = path.join(RENDERS_DIR, outFileName);
  const thumbFileName = `${params.project.slug}_${params.version}_thumb.jpg`;
  const outThumb = path.join(RENDERS_DIR, thumbFileName);
  const contactFileName = `${params.project.slug}_${params.version}_contact.jpg`;
  const outContact = path.join(RENDERS_DIR, contactFileName);

  const renderUrl = `http://127.0.0.1:${params.port}/?renderMode=1&project=${encodeURIComponent(
    params.project.id
  )}&look=${encodeURIComponent(params.lookId)}`;

  const tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-render-'));
  const tmpVideo = path.join(tmpWorkDir, 'video.mp4');
  const tmpAudio = path.join(tmpWorkDir, 'audio.m4a');
  const tmpConcatList = path.join(tmpWorkDir, 'concat.txt');
  const tmpFinal = path.join(tmpWorkDir, 'final.mp4');
  const chunkFiles = Array.from({ length: workersCount }, (_, i) =>
    path.join(tmpWorkDir, `chunk${i}.mp4`)
  );

  let renderedFrames = 0;
  const notifyFrame = () => {
    renderedFrames += 1;
    if (params.onProgress && renderedFrames % 12 === 0) {
      params.onProgress(Math.min(82, Math.round((renderedFrames / totalFrames) * 82)));
    }
  };

  try {
    const chrome = launchRenderChrome(chromeExe, renderUrl);
    try {
      const startMs = Date.now();
      let initialTarget: { targetId: string; type: string } | undefined;
      while (!initialTarget) {
        const res = await chrome.send<{ targetInfos: Array<{ targetId: string; type: string }> }>(
          'Target.getTargets'
        );
        initialTarget = res.targetInfos.find((t) => t.type === 'page');
        if (!initialTarget) {
          if (Date.now() - startMs > 20_000) {
            throw new Error(`Délai ouverture Chromium dépassé: ${chrome.getErr()}`);
          }
          await new Promise((r) => setTimeout(r, 30));
        }
      }

      const targetIds = [initialTarget.targetId];
      for (let w = 1; w < workersCount; w++) {
        const { targetId } = await chrome.send<{ targetId: string }>('Target.createTarget', {
          url: renderUrl,
        });
        targetIds.push(targetId);
      }

      const workers = await Promise.all(targetIds.map((tid) => chrome.attachWorker(tid)));
      const chunkSize = Math.ceil(totalFrames / workersCount);

      await Promise.all(
        workers.map((captureFn, w) => {
          const s = w * chunkSize;
          const e = Math.min(totalFrames, (w + 1) * chunkSize);
          return renderChunkToMp4(
            captureFn,
            s,
            e,
            totalFrames,
            fps,
            durationSec,
            chunkFiles[w],
            notifyFrame
          );
        })
      );
    } finally {
      await chrome.close();
    }

    params.onProgress?.(85);

    fs.writeFileSync(
      tmpConcatList,
      chunkFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'),
      'utf-8'
    );

    execFileSync(
      'ffmpeg',
      ['-y', '-f', 'concat', '-safe', '0', '-i', tmpConcatList, '-c', 'copy', tmpVideo],
      { stdio: 'pipe', timeout: 120_000 }
    );

    params.onProgress?.(90);

    // Audio Mix: Voiceover MP3 (if available) + Music bed + SFX + loudnorm
    const audioInputs: string[] = [];
    const filterParts: string[] = [];
    const mixLabels: string[] = [];
    let inputIdx = 0;

    const hasVoice = Boolean(params.voiceMp3Path && fs.existsSync(params.voiceMp3Path));
    if (hasVoice && params.voiceMp3Path) {
      audioInputs.push('-i', params.voiceMp3Path);
      filterParts.push(
        `[${inputIdx}:a]atrim=0:${durationSec.toFixed(3)},asetpts=PTS-STARTPTS,apad=whole_dur=${durationSec.toFixed(3)}[voice]`
      );
      mixLabels.push('[voice]');
      inputIdx += 1;
    }

    const musicPath = resolveMusicAssetPath(params.project.musicTrack?.trackName);
    if (musicPath) {
      audioInputs.push('-stream_loop', '-1', '-i', musicPath);
      const musicVol = hasVoice ? 0.24 : 0.36;
      const fadeOutStart = Math.max(0.5, durationSec - 1.2).toFixed(2);
      filterParts.push(
        `[${inputIdx}:a]atrim=0:${durationSec.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeOutStart}:d=1.2,volume=${musicVol}[music]`
      );
      mixLabels.push('[music]');
      inputIdx += 1;
    }

    if (mixLabels.length === 0) {
      audioInputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
      filterParts.push(`[${inputIdx}:a]atrim=0:${durationSec.toFixed(3)}[silence]`);
      mixLabels.push('[silence]');
      inputIdx += 1;
    }

    for (let sIdx = 0; sIdx < (params.project.sfxTrack || []).length; sIdx++) {
      const s = params.project.sfxTrack[sIdx];
      const sfxPath = resolveSfxAssetPath(s.sound);
      if (!sfxPath) continue;
      const delayMs = Math.max(0, Math.round((Number(s.start) || 0) * 1000));
      audioInputs.push('-i', sfxPath);
      const label = `sfx${sIdx}`;
      filterParts.push(
        `[${inputIdx}:a]volume=${(s.volume || 0.35).toFixed(2)},adelay=${delayMs}|${delayMs},apad=whole_dur=${durationSec.toFixed(3)}[${label}]`
      );
      mixLabels.push(`[${label}]`);
      inputIdx += 1;
    }

    filterParts.push(
      `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[outa]`
    );

    execFileSync(
      'ffmpeg',
      [
        '-y',
        ...audioInputs,
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[outa]',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '44100',
        tmpAudio,
      ],
      { stdio: 'pipe', timeout: 120_000 }
    );

    params.onProgress?.(95);

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        tmpVideo,
        '-i',
        tmpAudio,
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        '-shortest',
        '-movflags',
        '+faststart',
        tmpFinal,
      ],
      { stdio: 'pipe', timeout: 120_000 }
    );

    const stagingOut = `${outputMp4Path}.staging.mp4`;
    fs.copyFileSync(tmpFinal, stagingOut);
    fs.renameSync(stagingOut, outputMp4Path);

    const meta = probeVideo(outputMp4Path);
    extractThumbnail(outputMp4Path, outThumb, Math.min(1.2, meta.duration / 3));
    generateContactSheet(outputMp4Path, outContact, meta.duration);

    params.onProgress?.(100);

    return {
      outputMp4Path,
      outputMp4Url: `/renders/${outFileName}`,
      thumbnailUrl: `/renders/${thumbFileName}`,
      contactSheetUrl: `/renders/${contactFileName}`,
      duration: meta.duration,
      sizeMb: meta.sizeMb,
    };
  } finally {
    await fs.promises.rm(tmpWorkDir, { recursive: true, force: true }).catch(() => {});
  }
}
