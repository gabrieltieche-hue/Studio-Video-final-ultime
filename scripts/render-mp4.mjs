#!/usr/bin/env node
/**
 * Deterministic 1080x1920 High-Quality MP4 Renderer + Audio Mixer
 * Uses 3 parallel headless Chromium CDP pages in one Chrome process @ 25 fps
 * driven by window.__setShortTime(t), muxed with Brian warm FR Voiceover (atempo=1.06)
 * + Bright Corporate Groove (upbeat.mp3, volume=0.28) + SFX hits (-14 LUFS).
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_EXE =
  process.env.CHROME_EXE ||
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const RENDER_URL = process.env.RENDER_URL || 'http://127.0.0.1:3000/?renderMode=1';
const OUT_MP4 = path.resolve(process.cwd(), 'public/video/short-interdiction-15-ans.mp4');

const SOURCE_DURATION = 57.0;
const SPEED = 1.06;
const OUTPUT_DURATION = SOURCE_DURATION / SPEED; // ~53.77s
const FPS = 25;
const TOTAL_FRAMES = Math.round(OUTPUT_DURATION * FPS); // ~1344 frames
const WORKERS = 3;

const SFX_LIST = [
  { at: 3.44, file: 'public/audio/sfx/glass-shatter.mp3', gain: 0.52 },
  { at: 3.44, file: 'public/audio/sfx/impact-boom.mp3', gain: 0.42 },
  { at: 23.38, file: 'public/audio/sfx/zhhh.mp3', gain: 0.38 },
  { at: 33.9, file: 'public/audio/sfx/riser.mp3', gain: 0.28 },
  { at: 34.63, file: 'public/audio/sfx/impact-boom.mp3', gain: 0.4 },
  { at: 53.5, file: 'public/audio/sfx/pop-back.mp3', gain: 0.4 },
];

const SWITCHES = [
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

function launchChrome(url) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'short-mp4-chrome-'));
  const proc = spawn(
    CHROME_EXE,
    [...SWITCHES, `--user-data-dir=${userDir}`, '--window-size=1080,1920', url],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
  );

  let msgId = 0;
  let rest = Buffer.alloc(0);
  const pending = new Map();
  let errBuf = '';

  proc.stderr.on('data', (d) => {
    errBuf = (errBuf + d).slice(-2000);
  });

  proc.stdio[4].on('data', (chunk) => {
    let buf = Buffer.concat([rest, chunk]);
    let idx;
    while ((idx = buf.indexOf(0)) >= 0) {
      const m = JSON.parse(buf.subarray(0, idx).toString('utf8'));
      buf = buf.subarray(idx + 1);
      if (m.id && pending.has(m.id)) {
        const q = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) q.rej(new Error(m.error.message));
        else q.res(m.result);
      }
    }
    rest = buf;
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      proc.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
    });

  const attachWorker = async (targetId) => {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send(
      'Emulation.setDeviceMetricsOverride',
      { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false },
      sessionId
    );

    const evalPage = async (expr) => {
      const r = await send(
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
      if (Date.now() - startMs > 25000) throw new Error(`Short worker init timeout: ${errBuf}`);
      await new Promise((r) => setTimeout(r, 30));
    }
    await evalPage('document.fonts.ready.then(() => true)');

    return async (sourceTime) => {
      await evalPage(
        `new Promise(r => { window.__setShortTime(${sourceTime.toFixed(4)}); requestAnimationFrame(r); })`
      );
      const { data } = await send(
        'Page.captureScreenshot',
        { format: 'jpeg', quality: 90, optimizeForSpeed: true, fromSurface: true },
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

function renderVideoChunk(captureFrame, startFrame, endFrame, outFile, workerIdx) {
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
        String(FPS),
        '-i',
        'pipe:0',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
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
      else reject(new Error(`Worker ${workerIdx} ffmpeg exited ${code}: ${ffErr}`));
    });

    (async () => {
      try {
        for (let i = startFrame; i < endFrame; i++) {
          const sourceT = Math.min(SOURCE_DURATION - 0.01, (i / FPS) * SPEED);
          const jpg = await captureFrame(sourceT);
          if (!ff.stdin.write(jpg)) {
            await new Promise((r) => ff.stdin.once('drain', r));
          }
          if (i % 150 === 0) {
            console.log(`  [worker ${workerIdx}] frame ${i}/${TOTAL_FRAMES} (t=${sourceT.toFixed(2)}s)`);
          }
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

async function run() {
  const outDir = path.dirname(OUT_MP4);
  fs.mkdirSync(outDir, { recursive: true });
  const tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'short-mp4-work-'));

  const tmpVideo = path.join(tmpWorkDir, 'video.mp4');
  const tmpAudio = path.join(tmpWorkDir, 'audio.m4a');
  const tmpConcatList = path.join(tmpWorkDir, 'concat.txt');
  const tmpFinal = path.join(tmpWorkDir, 'final.mp4');
  const chunkFiles = Array.from({ length: WORKERS }, (_, i) => path.join(tmpWorkDir, `chunk${i}.mp4`));

  console.log(
    `Rendering ${TOTAL_FRAMES} frames (${OUTPUT_DURATION.toFixed(2)}s @ ${FPS}fps, 1080x1920) across ${WORKERS} parallel Chromium pages...`
  );

  const chrome = launchChrome(RENDER_URL);
  try {
    const startMs = Date.now();
    let initialTarget;
    while (
      !(initialTarget = (await chrome.send('Target.getTargets')).targetInfos.find((t) => t.type === 'page'))
    ) {
      if (Date.now() - startMs > 20000) throw new Error(`Chrome page timeout: ${chrome.getErr()}`);
      await new Promise((r) => setTimeout(r, 25));
    }

    const targetIds = [initialTarget.targetId];
    for (let w = 1; w < WORKERS; w++) {
      const { targetId } = await chrome.send('Target.createTarget', { url: RENDER_URL });
      targetIds.push(targetId);
    }

    const workers = await Promise.all(targetIds.map((tid) => chrome.attachWorker(tid)));

    const chunkSize = Math.ceil(TOTAL_FRAMES / WORKERS);
    await Promise.all(
      workers.map((captureFn, w) => {
        const s = w * chunkSize;
        const e = Math.min(TOTAL_FRAMES, (w + 1) * chunkSize);
        return renderVideoChunk(captureFn, s, e, chunkFiles[w], w);
      })
    );
  } finally {
    await chrome.close();
  }

  // Concat video chunks seamlessly
  fs.writeFileSync(
    tmpConcatList,
    chunkFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n')
  );

  await new Promise((res, rej) => {
    const ff = spawn(
      'ffmpeg',
      ['-y', '-f', 'concat', '-safe', '0', '-i', tmpConcatList, '-c', 'copy', tmpVideo],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let err = '';
    ff.stderr.on('data', (d) => (err = (err + d).slice(-800)));
    ff.once('exit', (code) => (code === 0 ? res() : rej(new Error(`concat failed (${code}): ${err}`))));
  });

  // Mix Voiceover (atempo=1.20) + Bright Corporate Groove (upbeat.mp3) + SFX -> -14 LUFS AAC
  console.log('Mixing ElevenLabs FR Voiceover + Bright Corporate Groove (upbeat.mp3) + SFX...');
  const inputs = [
    '-i',
    path.resolve(process.cwd(), 'public/audio/voice/short-interdiction-15-ans-fr.mp3'),
    '-stream_loop',
    '-1',
    '-i',
    path.resolve(process.cwd(), 'public/audio/music/upbeat.mp3'),
  ];

  const validSfx = SFX_LIST.filter((s) => fs.existsSync(path.resolve(process.cwd(), s.file)));
  for (const s of validSfx) {
    inputs.push('-i', path.resolve(process.cwd(), s.file));
  }

  const filterParts = [
    `[0:a]atempo=${SPEED},apad=whole_dur=${OUTPUT_DURATION.toFixed(3)}[voice]`,
    `[1:a]atrim=0:${OUTPUT_DURATION.toFixed(3)},afade=t=out:st=${(OUTPUT_DURATION - 1.2).toFixed(2)}:d=1.2,volume=0.24[music]`,
  ];

  const mixInputs = ['[voice]', '[music]'];
  validSfx.forEach((s, idx) => {
    const delayMs = Math.round((s.at / SPEED) * 1000);
    const label = `sfx${idx}`;
    filterParts.push(
      `[${idx + 2}:a]volume=${s.gain},adelay=${delayMs}|${delayMs},apad=whole_dur=${OUTPUT_DURATION.toFixed(3)}[${label}]`
    );
    mixInputs.push(`[${label}]`);
  });

  filterParts.push(
    `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[outa]`
  );

  await new Promise((res, rej) => {
    const ffAudio = spawn(
      'ffmpeg',
      [
        '-y',
        ...inputs,
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
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let audioErr = '';
    ffAudio.stderr.on('data', (d) => (audioErr = (audioErr + d).slice(-1200)));
    ffAudio.once('exit', (code) =>
      code === 0 ? res() : rej(new Error(`ffmpeg audio failed (${code}): ${audioErr}`))
    );
  });

  // Final H.264 + AAC mux with faststart
  await new Promise((res, rej) => {
    const ffMux = spawn(
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
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let muxErr = '';
    ffMux.stderr.on('data', (d) => (muxErr = (muxErr + d).slice(-800)));
    ffMux.once('exit', (code) =>
      code === 0 ? res() : rej(new Error(`ffmpeg mux failed (${code}): ${muxErr}`))
    );
  });

  const stagingOut = `${OUT_MP4}.staging.mp4`;
  await fs.promises.copyFile(tmpFinal, stagingOut);
  await fs.promises.rename(stagingOut, OUT_MP4);
  await fs.promises.rm(tmpWorkDir, { recursive: true, force: true }).catch(() => {});

  const stat = fs.statSync(OUT_MP4);
  console.log(`Rendered MP4 ready: ${OUT_MP4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
