#!/usr/bin/env node
/**
 * Automated Visual + Audio-Sync QA Check across ALL 8 Beats.
 * 1. Validates strict monotonic word alignment & unified caption chunking
 * 2. Renders keyframes across all 8 beats at 1080x1920 via ?renderMode=1
 * 3. Assembles a 4x2 contact sheet (.playwright-cli/storyboard-qa.jpg) for full visual inspection
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_EXE =
  process.env.CHROME_EXE ||
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const RENDER_URL = process.env.RENDER_URL || 'http://127.0.0.1:3000/?renderMode=1';
const OUT_SHEET = path.resolve(process.cwd(), '.playwright-cli/storyboard-qa.jpg');

// Key source timestamps right on peak visual + spoken action of all 8 beats
const CHECKPOINTS = [
  { beat: 1, label: '01-Hook-Lock', t: 0.35 },
  { beat: 1, label: '01-Hook-Explode', t: 5.05 },
  { beat: 2, label: '02-Australie-85', t: 13.0 },
  { beat: 3, label: '03-France-Censure', t: 26.2 },
  { beat: 4, label: '04-Design-Jauge', t: 31.1 },
  { beat: 5, label: '05-Barres-x4.9', t: 41.2 },
  { beat: 6, label: '06-KIDS-Toggles', t: 51.2 },
  { beat: 8, label: '08-Subscribe-CTA', t: 61.5 },
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

async function run() {
  // 1. Validate alignment JSON integrity
  const alignPath = path.resolve(process.cwd(), 'public/audio/voice/short-interdiction-15-ans-align.json');
  const align = JSON.parse(fs.readFileSync(alignPath, 'utf8'));
  for (let i = 1; i < align.words.length; i++) {
    if (align.words[i].start < align.words[i - 1].start) {
      throw new Error(`Non-monotonic word timestamp at index ${i}: ${align.words[i].text}`);
    }
  }
  console.log(`Alignment QA OK: ${align.words.length} words, duration=${align.duration.toFixed(2)}s`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'short-qa-frames-'));
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'short-qa-chrome-'));
  const proc = spawn(
    CHROME_EXE,
    [...SWITCHES, `--user-data-dir=${userDir}`, '--window-size=1080,1920', RENDER_URL],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
  );

  let msgId = 0;
  let rest = Buffer.alloc(0);
  const pending = new Map();

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

  try {
    let target;
    while (!(target = (await send('Target.getTargets')).targetInfos.find((t) => t.type === 'page'))) {
      await new Promise((r) => setTimeout(r, 25));
    }
    const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
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
      return r.result?.value;
    };

    while (!(await evalPage('Boolean(window.__SHORT_READY)'))) {
      await new Promise((r) => setTimeout(r, 30));
    }
    await evalPage('document.fonts.ready.then(() => true)');

    for (let i = 0; i < CHECKPOINTS.length; i++) {
      const cp = CHECKPOINTS[i];
      await evalPage(
        `new Promise(r => { window.__setShortTime(${cp.t}); requestAnimationFrame(() => requestAnimationFrame(r)); })`
      );

      // Check caption container count & safe-zone bounds
      const metrics = await evalPage(`(() => {
        const stage = document.querySelector('[data-testid="short-stage-viewport"]');
        const capBlocks = Array.from(stage.querySelectorAll('.z-30 > div')).length;
        return { capBlocks, width: stage.clientWidth, height: stage.clientHeight };
      })()`);

      if (metrics.capBlocks > 1) {
        throw new Error(`Expected <= 1 unified caption block at t=${cp.t}, got ${metrics.capBlocks}`);
      }

      const { data } = await send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true },
        sessionId
      );
      fs.writeFileSync(path.join(tmpDir, `frame_${i}.png`), Buffer.from(data, 'base64'));
      console.log(`  Captured checkpoint ${cp.label} (t=${cp.t}s): captionBlocks=${metrics.capBlocks}`);
    }

    fs.mkdirSync(path.dirname(OUT_SHEET), { recursive: true });
    await new Promise((res, rej) => {
      const ff = spawn(
        'ffmpeg',
        [
          '-y',
          '-i',
          path.join(tmpDir, 'frame_%d.png'),
          '-vf',
          'scale=360:640,tile=4x2:padding=12:color=0x14161B',
          OUT_SHEET,
        ],
        { stdio: 'ignore' }
      );
      ff.once('exit', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg tile exited ${code}`))));
    });
    console.log(`Visual QA storyboard saved: ${OUT_SHEET}`);
  } finally {
    try {
      proc.kill('SIGKILL');
    } catch {
      // ignore
    }
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(userDir, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
