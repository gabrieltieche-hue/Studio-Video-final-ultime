import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeSlug } from '../engine/topicCsv';
import { STORAGE_DIR } from './storageManager';

export const BROLL_CACHE_DIR = path.join(STORAGE_DIR, 'broll-cache');

function ensureCacheDir() {
  if (!fs.existsSync(BROLL_CACHE_DIR)) {
    fs.mkdirSync(BROLL_CACHE_DIR, { recursive: true });
  }
}

function isBrightSharpImage(rawPath: string, outJpegPath: string): boolean {
  try {
    const probeOut = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', rawPath],
      { encoding: 'utf-8', timeout: 8_000 }
    );
    const parsed = JSON.parse(probeOut) as { streams?: Array<{ width?: number; height?: number }> };
    const s = parsed.streams?.[0];
    if (!s || (s.width || 0) < 640 || (s.height || 0) < 400) return false;

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-i',
        rawPath,
        '-vf',
        "scale='min(1080,iw)':-2:flags=lanczos,eq=contrast=1.04:saturation=1.05",
        '-q:v',
        '3',
        outJpegPath,
      ],
      { timeout: 12_000 }
    );

    const statsOut = execFileSync(
      'ffmpeg',
      ['-v', 'info', '-i', outJpegPath, '-vf', 'signalstats,metadata=mode=print:file=-', '-f', 'null', '-'],
      { encoding: 'utf-8', timeout: 12_000 }
    );
    const yavg = Number(statsOut.match(/lavfi\.signalstats\.YAVG=([\d.]+)/)?.[1] ?? 120);
    const ymin = Number(statsOut.match(/lavfi\.signalstats\.YMIN=([\d.]+)/)?.[1] ?? 0);
    const ymax = Number(statsOut.match(/lavfi\.signalstats\.YMAX=([\d.]+)/)?.[1] ?? 255);
    return yavg >= 62 && yavg <= 232 && ymax - ymin >= 70;
  } catch {
    return false;
  }
}

/**
 * Searches Openverse / Wikimedia Commons for a bespoke visualQuery, validates resolution +
 * brightness/contrast via FFmpeg signalstats, caches it locally in storage/broll-cache/,
 * and returns its `/broll-cache/<slug>.jpg` URL (or null if network/quality check fails).
 */
export async function resolveAndCacheVisualQuery(
  visualQuery?: string,
  excludeHashes?: Set<string>
): Promise<string | null> {
  const clean = String(visualQuery || '').trim();
  if (clean.length < 3) return null;

  ensureCacheDir();
  const slug = normalizeSlug(clean).slice(0, 56) || `q-${Date.now()}`;
  const targetFile = path.join(BROLL_CACHE_DIR, `${slug}.jpg`);
  const publicUrl = `/broll-cache/${slug}.jpg`;

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 20_000) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(targetFile)).digest('hex');
    if (!excludeHashes?.has(h)) {
      excludeHashes?.add(h);
      return publicUrl;
    }
  }

  const candidateUrls: string[] = [];
  try {
    const ov = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(clean)}&page_size=8&size=large,medium`,
      { headers: { 'User-Agent': 'StudioShortBrollCache/1.0' }, signal: AbortSignal.timeout(5_000) }
    );
    if (ov.ok) {
      const data = (await ov.json()) as {
        results?: Array<{ url?: string; width?: number; height?: number; title?: string }>;
      };
      for (const r of data.results || []) {
        if (!r.url || /\.(svg|gif|webp)(\?|$)/i.test(r.url)) continue;
        if ((r.width || 0) >= 680 && (r.height || 0) >= 420) {
          candidateUrls.push(r.url);
        }
      }
    }
  } catch {
    // non-fatal, fall through to Wikimedia or local pool
  }

  if (candidateUrls.length < 2) {
    try {
      const wm = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          clean
        )}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1080&format=json`,
        { headers: { 'User-Agent': 'StudioShortBrollCache/1.0' }, signal: AbortSignal.timeout(5_000) }
      );
      if (wm.ok) {
        const data = (await wm.json()) as {
          query?: { pages?: Record<string, { imageinfo?: Array<{ mime?: string; width?: number; height?: number; thumburl?: string; url?: string }> }> };
        };
        for (const p of Object.values(data.query?.pages || {})) {
          const info = p.imageinfo?.[0];
          if (!info || (info.mime !== 'image/jpeg' && info.mime !== 'image/png')) continue;
          if ((info.width || 0) < 680 || (info.height || 0) < 420) continue;
          const u = info.thumburl || info.url;
          if (u) candidateUrls.push(u);
        }
      }
    } catch {
      // non-fatal
    }
  }

  if (candidateUrls.length === 0) return null;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'broll-cache-'));
  try {
    for (const u of candidateUrls.slice(0, 5)) {
      const rawTmp = path.join(tmpDir, 'raw');
      const normTmp = path.join(tmpDir, 'norm.jpg');
      try {
        const resp = await fetch(u, {
          headers: { 'User-Agent': 'StudioShortBrollCache/1.0' },
          signal: AbortSignal.timeout(6_000),
        });
        if (!resp.ok) continue;
        const ct = resp.headers.get('content-type') || '';
        if (!ct.startsWith('image/') || ct.includes('svg')) continue;
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length < 18_000 || buf.length > 12_000_000) continue;
        fs.writeFileSync(rawTmp, buf);
        if (!isBrightSharpImage(rawTmp, normTmp)) continue;

        const hash = crypto.createHash('sha256').update(fs.readFileSync(normTmp)).digest('hex');
        if (excludeHashes?.has(hash)) continue;
        excludeHashes?.add(hash);

        fs.copyFileSync(normTmp, targetFile);
        return publicUrl;
      } catch {
        // try next candidate
      } finally {
        fs.rmSync(rawTmp, { force: true });
        fs.rmSync(normTmp, { force: true });
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return null;
}
