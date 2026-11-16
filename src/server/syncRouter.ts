import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import {
  getProject,
  saveProject,
  withProjectMediaStatus,
} from './storageManager';
import {
  buildExportManifest,
  getLivePublicSyncStatus,
  getPublicSyncStatus,
  pullFromRailway,
  receiveImportedFile,
  resolveExportFile,
  runFullSync,
  saveSyncConfig,
  triggerRailwayDeployHook,
  verifyIncomingSyncSecret,
} from './syncManager';
import type { ShortProject } from '../types/studio';

export function createSyncRouter(): express.Router {
  const router = express.Router();

  router.get('/api/sync/status', async (req: Request, res: Response) => {
    const force = req.query.refresh === '1';
    const status = await getLivePublicSyncStatus(force);
    res.json({ status });
  });

  router.post('/api/sync/config', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        githubRepo?: string;
        githubToken?: string;
        railwayUrl?: string;
        railwayDeployHookUrl?: string;
        syncSecret?: string;
        autoSync?: boolean;
      };
      saveSyncConfig({
        ...(body.githubRepo !== undefined ? { githubRepo: body.githubRepo } : {}),
        ...(body.githubToken !== undefined ? { githubToken: body.githubToken } : {}),
        ...(body.railwayUrl !== undefined ? { railwayUrl: body.railwayUrl } : {}),
        ...(body.railwayDeployHookUrl !== undefined
          ? { railwayDeployHookUrl: body.railwayDeployHookUrl }
          : {}),
        ...(body.syncSecret !== undefined ? { syncSecret: body.syncSecret } : {}),
        ...(body.autoSync !== undefined ? { autoSync: body.autoSync } : {}),
      });
      res.json({ success: true, status: await getLivePublicSyncStatus(true) });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Configuration de synchronisation invalide.',
      });
    }
  });

  router.post('/api/sync/redeploy-railway', async (_req: Request, res: Response) => {
    try {
      const result = await triggerRailwayDeployHook();
      res.json({ success: true, ...result, status: await getLivePublicSyncStatus(true) });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Impossible de déclencher le redéploiement Railway.',
      });
    }
  });

  router.post('/api/sync/push', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        target?: 'all' | 'github' | 'railway';
        projectId?: string;
        railwayUrl?: string;
        commitMessage?: string;
      };
      const result = await runFullSync({
        target: body.target || 'all',
        projectId: body.projectId,
        railwayUrl: body.railwayUrl,
        commitMessage: body.commitMessage,
      });
      res.status(result.ok ? 200 : 207).json({
        ...result,
        status: getPublicSyncStatus(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur lors de la synchronisation.',
      });
    }
  });

  router.post('/api/sync/pull', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as { railwayUrl?: string };
      const result = await pullFromRailway(body.railwayUrl);
      res.json({
        success: true,
        ...result,
        status: await getLivePublicSyncStatus(true),
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Impossible de récupérer depuis Railway.',
      });
    }
  });

  // Receiver/Sender HTTP endpoints used between Local AI Studio and Railway
  router.get('/api/sync/export-manifest', (req: Request, res: Response) => {
    if (!verifyIncomingSyncSecret(req.header('x-sync-secret'))) {
      res.status(401).json({ error: 'Secret de synchronisation invalide.' });
      return;
    }
    res.json(buildExportManifest());
  });

  router.get('/api/sync/export-project/:id', (req: Request, res: Response) => {
    if (!verifyIncomingSyncSecret(req.header('x-sync-secret'))) {
      res.status(401).json({ error: 'Secret de synchronisation invalide.' });
      return;
    }
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable.' });
      return;
    }
    res.json({ project: withProjectMediaStatus(proj) });
  });

  router.get('/api/sync/export-file', (req: Request, res: Response) => {
    if (!verifyIncomingSyncSecret(req.header('x-sync-secret'))) {
      res.status(401).json({ error: 'Secret de synchronisation invalide.' });
      return;
    }
    try {
      const projectId = String(req.query.projectId || '');
      const kind = String(req.query.kind || '');
      const fileName = String(req.query.fileName || '');
      const filePath = resolveExportFile(projectId, kind, fileName);
      if (!filePath) {
        res.status(404).json({ error: 'Fichier média introuvable.' });
        return;
      }
      res.sendFile(filePath);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Paramètres invalides.' });
    }
  });

  router.post('/api/sync/import-project', (req: Request, res: Response) => {
    if (!verifyIncomingSyncSecret(req.header('x-sync-secret'))) {
      res.status(401).json({ error: 'Secret de synchronisation invalide.' });
      return;
    }
    const body = (req.body || {}) as { project?: ShortProject };
    if (!body.project?.id || !body.project?.slug) {
      res.status(400).json({ error: 'Projet JSON valide requis.' });
      return;
    }
    saveProject(body.project);
    res.json({ success: true, id: body.project.id });
  });

  router.post(
    '/api/sync/import-file',
    express.raw({ type: ['application/octet-stream', 'video/*', 'audio/*', 'image/*'], limit: '100mb' }),
    (req: Request, res: Response) => {
      if (!verifyIncomingSyncSecret(req.header('x-sync-secret'))) {
        res.status(401).json({ error: 'Secret de synchronisation invalide.' });
        return;
      }
      try {
        if (!Buffer.isBuffer(req.body) || req.body.byteLength === 0) {
          res.status(400).json({ error: 'Flux binaire vide.' });
          return;
        }
        const projectId = String(req.header('x-project-id') || req.query.projectId || '');
        const kind = String(req.header('x-file-kind') || req.query.kind || '');
        const fileName = String(req.header('x-file-name') || req.query.fileName || '');
        const result = receiveImportedFile({
          projectId,
          kind,
          fileName,
          data: req.body,
        });
        res.json({ success: true, ...result });
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur import fichier.' });
      }
    }
  );

  return router;
}
