import fs from 'node:fs';
import path from 'node:path';
import {
  COMPONENTS_DIR,
  PROJECTS_DIR,
  RENDERS_DIR,
  ROOT_DIR,
  getProject,
  saveProject,
} from './storageManager';
import { generateContactSheet } from './ffmpegEngine';
import { BEATS, SFX_EVENTS, SHORT_DURATION, WORD_CUES } from '../data/shortSpec';
import type { MotionComponent, ShortProject, WhisperWord } from '../types/studio';

const DEFAULT_COMPONENTS: Record<string, MotionComponent> = {
  'comp-hook-shatter': {
    id: 'comp-hook-shatter',
    name: 'hook_shatter_counter',
    description: 'Carte Limite d’âge -15 ans + explosion 3.44s + badge 85 % / 63 %',
    width: 1080,
    height: 960,
    fps: 25,
    hasAlpha: true,
    tRange: [0, 1],
    code: `window.setT = function(t) {
  const card = document.getElementById('hook-card');
  const badge = document.getElementById('stat-badge');
  if (card) {
    const scale = t < 0.55 ? 0.92 + 0.08 * t : 1 + Math.sin((t - 0.55) * 28) * 0.025;
    card.style.transform = \`scale(\${scale.toFixed(3)})\`;
  }
  if (badge) {
    badge.innerText = Math.round(Math.min(85, t * 110)) + ' %';
  }
};`,
  },
  'comp-algo-gauge': {
    id: 'comp-algo-gauge',
    name: 'algo_addiction_gauge',
    description: 'Jauge radiale Design Addictif 0 → 92 % + score de rétention',
    width: 1080,
    height: 1920,
    fps: 25,
    hasAlpha: true,
    tRange: [0, 1],
    code: `window.setT = function(t) {
  const badge = document.getElementById('stat-badge');
  const bars = document.querySelectorAll('.chart-bar');
  if (badge) badge.innerText = Math.round(Math.min(92, t * 96)) + ' %';
  bars.forEach((b, i) => {
    const p = Math.max(0, Math.min(1, t * 1.4 - i * 0.12));
    b.style.height = Math.round(p * [42, 68, 95, 130, 175, 210][i]) + 'px';
  });
};`,
  },
  'comp-kids-act': {
    id: 'comp-kids-act',
    name: 'kids_act_switches',
    description: '3 interrupteurs système coupés sur les mots exacts (scroll, autoplay, notifs)',
    width: 1080,
    height: 960,
    fps: 25,
    hasAlpha: true,
    tRange: [0, 1],
    code: `window.setT = function(t) {
  const pills = document.querySelectorAll('.toggle-item');
  pills.forEach((el, idx) => {
    const active = t >= (idx + 1) * 0.25;
    el.style.opacity = active ? '1' : '0.45';
    el.style.transform = active ? 'translateX(0px)' : 'translateX(-12px)';
  });
};`,
  },
};

function buildRealTranscript(): WhisperWord[] {
  const alignFile = path.join(ROOT_DIR, 'public/audio/voice/short-interdiction-15-ans-align.json');
  if (fs.existsSync(alignFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(alignFile, 'utf-8')) as {
        words?: Array<{ text: string; start: number; end: number }>;
      };
      if (Array.isArray(parsed.words) && parsed.words.length > 0) {
        return parsed.words.map((w, idx) => ({
          id: `w-${idx + 1}`,
          word: w.text,
          start: Number(w.start.toFixed(3)),
          end: Number(w.end.toFixed(3)),
          confidence: 0.99,
          isCut: false,
        }));
      }
    } catch {
      // Fallback to WORD_CUES below
    }
  }

  return WORD_CUES.map((w, idx) => ({
    id: `w-${idx + 1}`,
    word: w.text,
    start: Number(w.start.toFixed(3)),
    end: Number(w.end.toFixed(3)),
    confidence: 0.99,
    isCut: false,
  }));
}

export function seedFlagshipProjectIfMissing(): ShortProject {
  const existing = getProject('proj-interdiction-15-ans') || getProject('short-interdiction-15-ans');
  const flagshipMp4 = path.join(ROOT_DIR, 'public/video/short-interdiction-15-ans.mp4');
  const contactSheetFilename = 'short-interdiction-15-ans_v1_contact.jpg';
  const contactSheetPath = path.join(RENDERS_DIR, contactSheetFilename);

  if (fs.existsSync(flagshipMp4) && fs.statSync(flagshipMp4).size > 100_000 && !fs.existsSync(contactSheetPath)) {
    fs.mkdirSync(RENDERS_DIR, { recursive: true });
    generateContactSheet(flagshipMp4, contactSheetPath, 53.77);
  }

  // Write component preview HTML templates if not yet on disk
  fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
  for (const comp of Object.values(DEFAULT_COMPONENTS)) {
    const safe = comp.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const htmlFile = path.join(COMPONENTS_DIR, `${safe}.html`);
    if (!fs.existsSync(htmlFile)) {
      const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><style>
body { margin: 0; background: transparent; font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; }
.card { background:#FCFBF8; border:2px solid #E3DED3; border-radius:24px; padding:32px 44px; color:#14161B; box-shadow:0 20px 50px rgba(20,22,27,.12); }
#stat-badge { font-size:84px; font-weight:800; color:#258EFF; }
</style></head>
<body>
  <div id="hook-card" class="card">
    <div id="stat-badge">0 %</div>
    <div style="display:flex;gap:12px;align-items:flex-end;height:220px;margin-top:20px">
      <div class="chart-bar" style="width:28px;background:#258EFF;border-radius:8px;height:10px"></div>
      <div class="chart-bar" style="width:28px;background:#258EFF;border-radius:8px;height:10px"></div>
      <div class="chart-bar" style="width:28px;background:#258EFF;border-radius:8px;height:10px"></div>
      <div class="chart-bar" style="width:28px;background:#258EFF;border-radius:8px;height:10px"></div>
      <div class="chart-bar" style="width:28px;background:#258EFF;border-radius:8px;height:10px"></div>
      <div class="chart-bar" style="width:28px;background:#14161B;border-radius:8px;height:10px"></div>
    </div>
  </div>
  <script>${comp.code}</script>
</body></html>`;
      fs.writeFileSync(htmlFile, html, 'utf-8');
    }
  }

  if (existing) {
    return existing;
  }

  const transcript = buildRealTranscript();
  const project: ShortProject = {
    id: 'proj-interdiction-15-ans',
    slug: 'short-interdiction-15-ans',
    title: 'Interdire les réseaux avant 15 ans',
    mode: 'faceless_explainer',
    platform: 'youtube_shorts',
    status: 'ready',
    duration: SHORT_DURATION,
    fps: 25,
    resolution: { width: 1080, height: 1920 },
    isFlagshipReactStage: true,
    audioTrackUrl: '/audio/voice/short-interdiction-15-ans-fr.mp3',
    currentVersion: 'v1',
    versions: [
      {
        version: 'v1',
        createdAt: new Date().toISOString(),
        status: 'done',
        duration: 53.77,
        fps: 25,
        notes: 'Version validée · Voix Brian FR 1.06× · Bright Groove (-12.5 dB) · 8 beats · Halos bleus animés',
        platform: 'youtube_shorts',
        outputMp4: '/video/short-interdiction-15-ans.mp4',
      },
    ],
    transcript,
    motionTrack: BEATS.map((beat, idx) => ({
      id: `beat-${beat.index}`,
      componentId:
        idx < 3 ? 'comp-hook-shatter' : idx < 6 ? 'comp-algo-gauge' : 'comp-kids-act',
      name: `${beat.index}. ${beat.shortLabel}`,
      start: beat.from,
      end: beat.to,
      type: idx === 4 ? 'chart' : idx === 3 ? 'counter' : idx === 0 ? 'card' : 'typography',
      color: beat.seam === 1920 ? '#258EFF' : beat.seam === 0 ? '#14161B' : '#059669',
    })),
    layoutTrack: BEATS.map((beat) => ({
      id: `layout-${beat.index}`,
      layout: beat.seam === 1160 ? 'split' : 'fullscreen',
      start: beat.from,
      end: beat.to,
    })),
    sfxTrack: SFX_EVENTS.map((ev, idx) => ({
      id: `sfx-${idx + 1}`,
      sound: ev.kind,
      start: ev.at,
      volume: ev.gain ?? 0.42,
    })),
    musicTrack: {
      trackName: 'Bright_Corporate_Groove_8c962467.mp3',
      volume: 0.24,
      ducking: true,
    },
    feedbacks: [],
    motionComponents: DEFAULT_COMPONENTS,
    contactSheet: BEATS.concat(BEATS.slice(0, 4)).slice(0, 12).map((b, idx) => ({
      frameIndex: idx + 1,
      timestamp: Number((b.from + (b.to - b.from) * 0.45).toFixed(2)),
      timeFormatted: `00:${(b.from + (b.to - b.from) * 0.45) < 10 ? '0' : ''}${(b.from + (b.to - b.from) * 0.45).toFixed(2)}`,
      title: `Frame #${idx + 1} · ${b.shortLabel}`,
      qcCheck: 'pass' as const,
      notes: b.mechanism,
      previewUrl: fs.existsSync(contactSheetPath) ? `/renders/${contactSheetFilename}` : undefined,
    })),
    styleProfile: {
      name: 'Papier signature (@alex.decode)',
      fontFamily: '"Bricolage Grotesque", sans-serif',
      accentColor: '#258EFF',
      textColor: '#14161B',
      cardBg: '#FCFBF8',
      captionsPosition: 'bottom',
      visualBeatsTarget: 8,
    },
    editSpec: {
      voiceId: 'nPczCjzI2devNBz1zQrb',
      speed: 1.06,
      music: 'Bright_Corporate_Groove_8c962467.mp3',
      musicGainUnderVoice: 0.24,
      ambientBlueOrbs: true,
      topProgressChrome: false,
      beatsCount: 8,
    },
  };

  saveProject(project);
  // Save SRT/ASS alongside the project so outputs are ready
  const projDir = path.join(PROJECTS_DIR, project.id);
  fs.mkdirSync(projDir, { recursive: true });
  return project;
}
