import express, { type Request, type Response } from 'express';
import type { LookId, MusicBedId } from '../data/shortSpec';
import type { BatchAutoScheduleConfig, StartBatchRequest } from '../types/batch';
import type { SocialPlatform } from '../types/social';
import {
  bulkScheduleBatchJob,
  cancelBatchJob,
  getBatchJob,
  listBatchJobs,
  startBatchJob,
} from './batchService';

export function createBatchRouter(port: number): express.Router {
  const router = express.Router();

  router.get('/api/batch/jobs', (_req: Request, res: Response) => {
    res.json({ jobs: listBatchJobs() });
  });

  router.get('/api/batch/jobs/:id', (req: Request, res: Response) => {
    const job = getBatchJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Lot introuvable.' });
      return;
    }
    res.json({ job });
  });

  router.post('/api/batch/start', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Partial<StartBatchRequest>;
      const sourceMode =
        body.sourceMode === 'csv' || body.sourceMode === 'research' || body.sourceMode === 'custom'
          ? body.sourceMode
          : 'custom';
      const lookId: LookId =
        body.lookId === 'pop' || body.lookId === 'poster' ? body.lookId : 'papier';
      const musicTrack: MusicBedId = (
        ['upbeat', 'groove', 'analytical', 'clockwork', 'chill'] as MusicBedId[]
      ).includes(body.musicTrack as MusicBedId)
        ? (body.musicTrack as MusicBedId)
        : 'upbeat';

      const job = await startBatchJob(
        {
          sourceMode,
          topicIds: Array.isArray(body.topicIds) ? body.topicIds.map(String) : undefined,
          customTopics: Array.isArray(body.customTopics) ? body.customTopics.map(String) : undefined,
          count: Number(body.count) || 3,
          focus: typeof body.focus === 'string' ? body.focus : undefined,
          lookId,
          musicTrack,
          speed: Number(body.speed) || 1.06,
          renderMp4: body.renderMp4 !== false,
          autoSchedule: body.autoSchedule,
        },
        port
      );

      res.json({ job });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Impossible de démarrer le lot de vidéos.',
      });
    }
  });

  router.post('/api/batch/jobs/:id/cancel', (req: Request, res: Response) => {
    try {
      const job = cancelBatchJob(req.params.id);
      res.json({ job });
    } catch (err) {
      res.status(404).json({
        error: err instanceof Error ? err.message : 'Lot introuvable.',
      });
    }
  });

  router.post('/api/batch/jobs/:id/schedule', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Partial<BatchAutoScheduleConfig>;
      const validPlatforms = (Array.isArray(body.platforms) ? body.platforms : []).filter(
        (p): p is SocialPlatform => p === 'youtube' || p === 'instagram' || p === 'tiktok'
      );
      if (validPlatforms.length === 0) {
        res.status(400).json({ error: 'Sélectionnez au moins un réseau social.' });
        return;
      }

      const result = await bulkScheduleBatchJob(req.params.id, {
        platforms: validPlatforms,
        startAtIso:
          typeof body.startAtIso === 'string' && body.startAtIso
            ? body.startAtIso
            : new Date(Date.now() + 3600 * 1000).toISOString(),
        intervalHours: Number(body.intervalHours) || 24,
        privacy:
          body.privacy === 'unlisted' || body.privacy === 'private' ? body.privacy : 'public',
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur de planification du lot.',
      });
    }
  });

  return router;
}
