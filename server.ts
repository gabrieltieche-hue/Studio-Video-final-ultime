import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer as createViteServer } from 'vite';
import {
  readTopicsCsv,
  runDeepTopicResearchAndUpdateCsv,
  updateTopicStatus,
} from './src/engine/topicResearchService';
import type { TopicStatus } from './src/engine/topicCsv';
import {
  RENDERS_DIR,
  STORAGE_DIR,
  TAKES_DIR,
  hydrateSavedProjectsFromRepo,
  initStorage,
} from './src/server/storageManager';
import { seedFlagshipProjectIfMissing } from './src/server/seedFlagshipProject';
import { createStudioRouter } from './src/server/studioRouter';
import { createSocialRouter } from './src/server/socialRouter';
import { createBatchRouter } from './src/server/batchRouter';
import { createSyncRouter } from './src/server/syncRouter';
import { startSocialScheduler } from './src/server/socialPublisher';
import { readTregSession, syncTregConnections } from './src/server/tregClient';

dotenv.config();

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefixed = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

const PORT = Number(readCliArg('--port') || process.env.PORT) || 3000;
const HOST = readCliArg('--host') || '0.0.0.0';

const DEFAULT_FREE_VOICE_ID = 'nPczCjzI2devNBz1zQrb'; // Brian — Deep, Resonant and Comforting (Free Plan premade API)

function resolveVoiceId(candidate?: string): string {
  const cleaned = typeof candidate === 'string' ? candidate.trim() : '';
  return /^[A-Za-z0-9]{15,32}$/.test(cleaned) ? cleaned : DEFAULT_FREE_VOICE_ID;
}

const MP4_PATH = path.resolve(__dirname, 'public/video/short-interdiction-15-ans.mp4');
let activeRenderPromise: Promise<void> | null = null;

async function ensureRenderedMp4(): Promise<string> {
  if (fs.existsSync(MP4_PATH) && fs.statSync(MP4_PATH).size > 500_000) {
    return MP4_PATH;
  }
  if (!activeRenderPromise) {
    activeRenderPromise = execFileAsync(
      process.execPath,
      [path.resolve(__dirname, 'scripts/render-mp4.mjs')],
      {
        cwd: __dirname,
        env: { ...process.env, RENDER_URL: `http://127.0.0.1:${PORT}/?renderMode=1` },
        timeout: 240_000,
      }
    )
      .then(() => undefined)
      .finally(() => {
        activeRenderPromise = null;
      });
  }
  await activeRenderPromise;
  return MP4_PATH;
}

async function startServer() {
  initStorage();
  seedFlagshipProjectIfMissing();
  hydrateSavedProjectsFromRepo();

  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/takes', express.static(TAKES_DIR));
  app.use('/renders', express.static(RENDERS_DIR));
  app.use('/storage', express.static(STORAGE_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      version: 'studio-sync-v3',
      uptimeSec: Math.round(process.uptime()),
      storageDir: STORAGE_DIR,
      elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(createStudioRouter());
  app.use(createSocialRouter());
  app.use(createBatchRouter(PORT));
  app.use(createSyncRouter());

  // Read or download the live CSV table of researched & produced Shorts (video-agent/shorts-topics.csv)
  app.get('/api/topics-csv', (req, res) => {
    try {
      const { rows, rawCsv } = readTopicsCsv(__dirname);
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shorts-topics.csv"');
        res.setHeader('Cache-Control', 'no-store');
        res.send(`\uFEFF${rawCsv}`);
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json({ rows, rawCsv });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur de lecture du tableau CSV.',
      });
    }
  });

  // Step 0: Deep multi-pillar research + autonomous viral theme selection + CSV append
  app.post('/api/topics/research', async (req, res) => {
    try {
      const { focus } = (req.body || {}) as { focus?: string };
      const result = await runDeepTopicResearchAndUpdateCsv(__dirname, focus);
      res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la recherche multi-thèmes.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });

  // Update a topic status inside video-agent/shorts-topics.csv
  app.patch('/api/topics/:id/status', (req, res) => {
    try {
      const { statut } = (req.body || {}) as { statut?: TopicStatus };
      if (!statut || !['Produit', 'Retenu (Choix IA)', 'Candidat'].includes(statut)) {
        res.status(400).json({ error: 'Statut CSV invalide.' });
        return;
      }
      const rows = updateTopicStatus(__dirname, req.params.id, statut);
      res.json({ rows });
    } catch (err) {
      res.status(404).json({
        error: err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.',
      });
    }
  });

  // Server-side ElevenLabs TTS proxy (keeps ELEVENLABS_API_KEY strictly on backend)
  app.post('/api/tts', async (req, res) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'ELEVENLABS_API_KEY non configurée sur le serveur.' });
      return;
    }

    const { text, voiceId } = req.body as { text?: string; voiceId?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Texte requis pour la synthèse vocale.' });
      return;
    }

    const requestedVoice = resolveVoiceId(voiceId || process.env.ELEVENLABS_VOICE_ID);
    const callTts = (vId: string) =>
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}/with-timestamps`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 1200),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.42,
            similarity_boost: 0.78,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      });

    try {
      let activeVoice = requestedVoice;
      let upstream = await callTts(activeVoice);

      // Automatic fallback to Free Plan premade voice if a custom/paid voice ID fails with 402/404
      if ((upstream.status === 402 || upstream.status === 404) && activeVoice !== DEFAULT_FREE_VOICE_ID) {
        activeVoice = DEFAULT_FREE_VOICE_ID;
        upstream = await callTts(activeVoice);
      }

      if (!upstream.ok) {
        const errText = await upstream.text();
        res.status(upstream.status).json({ error: errText });
        return;
      }

      const data = await upstream.json();
      res.json({
        audioBase64: data.audio_base64,
        alignment: data.normalized_alignment || data.alignment,
        voiceId: activeVoice,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur ElevenLabs' });
    }
  });

  // Check MP4 availability
  app.get('/api/download-mp4/status', (_req, res) => {
    const exists = fs.existsSync(MP4_PATH) && fs.statSync(MP4_PATH).size > 500_000;
    const size = exists ? fs.statSync(MP4_PATH).size : 0;
    res.json({ ready: exists, sizeBytes: size });
  });

  // High-quality 1080x1920 MP4 download endpoint (pre-rendered on disk, instant browser download)
  app.get('/api/download-mp4', async (_req, res) => {
    try {
      const mp4File = await ensureRenderedMp4();
      const stat = fs.statSync(mp4File);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Content-Disposition', 'attachment; filename="short-interdiction-15-ans-hd.mp4"');
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(mp4File).pipe(res);
    } catch (err) {
      res.status(500).send(err instanceof Error ? err.message : 'Erreur de rendu MP4');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const viteReady = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    viteReady.catch((err) => {
      console.error('Vite dev server initialization error:', err);
    });
    app.use((req, res, next) => {
      viteReady
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));
    app.use('/video', express.static(path.resolve(__dirname, 'public/video')));
    app.use('/audio', express.static(path.resolve(__dirname, 'public/audio')));
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Studio Short server running on http://localhost:${PORT}`);
    if (readTregSession()?.token) {
      void syncTregConnections().catch(() => {
        // non-fatal startup sync
      });
    }
    startSocialScheduler();
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
