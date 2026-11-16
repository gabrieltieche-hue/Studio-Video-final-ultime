/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Check,
  Cloud,
  Download,
  Film,
  Layers,
  Loader2,
  Music,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ShortStage } from './components/short/ShortStage';
import { DynamicShortStage } from './components/short/DynamicShortStage';
import { BatchCreateView } from './components/BatchCreateView';
import { TopicResearchView } from './components/TopicResearchView';
import { SocialPublishView } from './components/SocialPublishView';
import { StudioWorkspace } from './components/studio/StudioWorkspace';
import { StudioRecorderView } from './components/studio/StudioRecorderView';
import {
  BEATS,
  DEFAULT_PLAYBACK_SPEED,
  LOOK_PRESETS,
  LookId,
  SHORT_DURATION,
} from './data/shortSpec';
import { audioEngine } from './engine/audioEngine';
import { clamp, formatClock } from './engine/math';
import { buildDynamicBeatsFromProject } from './engine/transcriptUtils';
import type { TopicCsvRow } from './engine/topicCsv';
import type { ShortProject, SourceVideo } from './types/studio';

declare global {
  interface Window {
    __setShortTime?: (nextT: number) => void;
    __setShortLook?: (nextLook: LookId) => void;
    __SHORT_READY?: boolean;
  }
}

export default function App() {
  const isRenderMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('renderMode') === '1';

  const renderParams = useMemo(() => {
    if (typeof window === 'undefined') return { projectId: '', look: 'papier' as LookId };
    const p = new URLSearchParams(window.location.search);
    const l = p.get('look');
    const validLook: LookId = l === 'pop' || l === 'poster' ? l : 'papier';
    return { projectId: p.get('project') || '', look: validLook };
  }, []);

  const [t, setT] = useState(0);
  const [renderProject, setRenderProject] = useState<ShortProject | null>(null);
  const [viewMode, setViewMode] = useState<
    'player' | 'studio' | 'recorder' | 'research' | 'batch' | 'publish'
  >(() => {
    if (typeof window === 'undefined') return 'player';
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'studio') return 'studio';
    if (params.get('tab') === 'recorder') return 'recorder';
    if (params.get('tab') === 'research') return 'research';
    if (params.get('tab') === 'batch') return 'batch';
    if (params.get('tab') === 'publish') return 'publish';
    return 'player';
  });

  // Shared Workspace State (synchronized across Lecteur Short, Studio Feedback, Prompteur, Veille & MCP/API)
  const [projects, setProjects] = useState<ShortProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [lookId, setLookId] = useState<LookId>(renderParams.look);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [downloadingMp4, setDownloadingMp4] = useState(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [mp4ReadySizeMb, setMp4ReadySizeMb] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const [renderingProjectId, setRenderingProjectId] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<{
    githubRepo: string;
    githubConnected: boolean;
    githubTokenMasked: string | null;
    railwayUrl: string;
    railwayConnected: boolean;
    railwayReachable: boolean;
    railwaySyncReady: boolean;
    railwayVersion?: string;
    railwayDeployHookConfigured: boolean;
    autoSync: boolean;
    lastSyncAt?: string;
    lastSyncSummary?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [railwayInput, setRailwayInput] = useState<string>(() => {
    try {
      return window.localStorage.getItem('studio_short_railway_url') || '';
    } catch {
      return '';
    }
  });
  const [railwayHookInput, setRailwayHookInput] = useState('');
  const [githubRepoInput, setGithubRepoInput] = useState('');
  const [githubTokenInput, setGithubTokenInput] = useState('');

  const tRef = useRef(0);
  const lastRafRef = useRef<number | null>(null);
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);
  const mp4BlobUrlRef = useRef<string | null>(null);
  const mp4FetchPromiseRef = useRef<Promise<string> | null>(null);
  const urlQuerySyncedRef = useRef(false);
  const look = LOOK_PRESETS[lookId];

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const activeProject = useMemo(
    () =>
      projects.find((p) => p.id === activeProjectId) ||
      projects[0] ||
      null,
    [projects, activeProjectId]
  );

  const activeVersionObj = useMemo(
    () =>
      (activeProject?.versions || []).find(
        (v) => v.version === activeProject?.currentVersion
      ),
    [activeProject]
  );

  const isFlagshipReactPlayer = useMemo(() => {
    if (!activeProject) return true;
    return (
      Boolean(activeProject.isFlagshipReactStage) &&
      (!activeVersionObj?.outputMp4 ||
        activeVersionObj.outputMp4 === '/video/short-interdiction-15-ans.mp4')
    );
  }, [activeProject, activeVersionObj]);

  const playerMediaSrc = useMemo(() => {
    if (!activeProject || isFlagshipReactPlayer) return undefined;
    return activeVersionObj?.outputMp4 || activeProject.speakerVideoUrl || undefined;
  }, [activeProject, activeVersionObj, isFlagshipReactPlayer]);

  const hasDynamicWebAudio = useMemo(
    () => !isFlagshipReactPlayer && !playerMediaSrc && Boolean(activeProject?.audioTrackUrl),
    [isFlagshipReactPlayer, playerMediaSrc, activeProject]
  );

  const useWebAudioLoop = isFlagshipReactPlayer || hasDynamicWebAudio;
  const effectiveAudioSpeed = isFlagshipReactPlayer ? speed : 1.0;

  const playerDuration = useMemo(() => {
    if (isFlagshipReactPlayer) return SHORT_DURATION;
    return Math.max(8, activeProject?.duration || SHORT_DURATION);
  }, [isFlagshipReactPlayer, activeProject]);

  const fetchSyncStatus = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/sync/status?refresh=1' : '/api/sync/status';
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as { status?: typeof syncStatus };
      if (data.status) {
        setSyncStatus(data.status);
        if (data.status.railwayUrl) {
          setRailwayInput(data.status.railwayUrl);
        }
        if (data.status.githubRepo) {
          setGithubRepoInput(data.status.githubRepo);
        }
      }
    } catch {
      // ignore transient status poll
    }
  }, []);

  const fetchWorkspace = useCallback(async (preferId?: string) => {
    try {
      const [wsRes, vRes] = await Promise.all([
        fetch('/api/studio/workspace', { credentials: 'same-origin' }),
        fetch('/api/studio/videos', { credentials: 'same-origin' }),
      ]);
      const wsData = (await wsRes.json()) as {
        activeProjectId?: string;
        projects?: ShortProject[];
      };
      const vData = (await vRes.json()) as { videos?: SourceVideo[] };

      const list = wsData.projects || [];
      setProjects(list);
      setSourceVideos(vData.videos || []);

      if (preferId && list.some((p) => p.id === preferId)) {
        setActiveProjectId(preferId);
      } else if (wsData.activeProjectId && list.some((p) => p.id === wsData.activeProjectId)) {
        setActiveProjectId(wsData.activeProjectId);
      } else if (list[0]) {
        setActiveProjectId(list[0].id);
      }
      void fetchSyncStatus();
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [fetchSyncStatus]);

  const refreshProject = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { project?: ShortProject };
      if (!data.project) return;
      setProjects((prev) =>
        prev.map((p) => (p.id === data.project!.id ? data.project! : p))
      );
    } catch {
      // ignore transient poll error
    }
  }, []);

  const handleActivateProject = useCallback(
    async (projectId: string, version?: string) => {
      setIsPlaying(false);
      tRef.current = 0;
      setT(0);
      setDownloadError(null);
      const res = await fetch('/api/studio/workspace/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ projectId, version }),
      });
      const data = (await res.json()) as { project?: ShortProject };
      if (res.ok && data.project) {
        setActiveProjectId(data.project.id);
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === data.project!.id);
          return exists
            ? prev.map((p) => (p.id === data.project!.id ? data.project! : p))
            : [data.project!, ...prev];
        });
      }
    },
    []
  );

  const handleCreateProjectFromTopic = useCallback(
    async (row: TopicCsvRow) => {
      const res = await fetch('/api/studio/projects/from-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          topic_id: row.id,
          set_active: true,
        }),
      });
      const data = (await res.json()) as { projectId?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Création du projet impossible.');
      }
      await fetchWorkspace(data.projectId);
      setIsPlaying(false);
      setT(0);
      tRef.current = 0;
      setViewMode('studio');
    },
    [fetchWorkspace]
  );

  // Initial load + URL query (?project=...&version=...) activation
  useEffect(() => {
    if (isRenderMode) return;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const qProj = params.get('project');
      const qVer = params.get('version') || undefined;
      if (qProj && !urlQuerySyncedRef.current) {
        urlQuerySyncedRef.current = true;
        try {
          await fetch('/api/studio/workspace/active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ projectId: qProj, version: qVer }),
          });
        } catch {
          // fallback to workspace fetch
        }
      }
      await fetchWorkspace(qProj || undefined);
    };
    void init();
  }, [isRenderMode, fetchWorkspace]);

  // Keep workspace synced if an external MCP/API tool creates or switches projects while the tab is open
  useEffect(() => {
    if (isRenderMode) return;
    const onFocus = () => {
      void fetchWorkspace();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isRenderMode, fetchWorkspace]);

  const fetchVerifiedMp4BlobUrl = useCallback(async (): Promise<string> => {
    if (mp4BlobUrlRef.current) return mp4BlobUrlRef.current;
    if (mp4FetchPromiseRef.current) return mp4FetchPromiseRef.current;

    mp4FetchPromiseRef.current = (async () => {
      const res = await fetch('/api/download-mp4', { credentials: 'same-origin' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('video/mp4')) {
        throw new Error('Le serveur vidéo redémarre — réessayez dans 2 secondes.');
      }

      const contentLength = Number(res.headers.get('content-length') || 0);
      let combined: Uint8Array;
      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            if (contentLength > 0) {
              setDownloadPct(Math.min(99, Math.round((received / contentLength) * 100)));
            }
          }
        }
        combined = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) {
          combined.set(c, offset);
          offset += c.byteLength;
        }
      } else {
        combined = new Uint8Array(await res.arrayBuffer());
      }

      const isFtypMp4 =
        combined.byteLength > 200_000 &&
        combined[4] === 0x66 &&
        combined[5] === 0x74 &&
        combined[6] === 0x79 &&
        combined[7] === 0x70;
      if (!isFtypMp4) {
        throw new Error('Réponse vidéo invalide (page HTML interceptée). Réessayez.');
      }
      setMp4ReadySizeMb((combined.byteLength / (1024 * 1024)).toFixed(1));
      setDownloadPct(100);
      const blobUrl = URL.createObjectURL(
        new Blob(
          [
            combined.buffer.slice(
              combined.byteOffset,
              combined.byteOffset + combined.byteLength
            ) as ArrayBuffer,
          ],
          { type: 'video/mp4' }
        )
      );
      mp4BlobUrlRef.current = blobUrl;
      return blobUrl;
    })().finally(() => {
      mp4FetchPromiseRef.current = null;
    });

    return mp4FetchPromiseRef.current;
  }, []);

  useEffect(() => {
    if (isRenderMode) {
      let cancelled = false;
      const targetProjId = renderParams.projectId;
      const bindTimeSetter = (maxDuration: number) => {
        window.__setShortTime = (nextT: number) => {
          const clamped = clamp(nextT, 0, Math.max(1, maxDuration));
          tRef.current = clamped;
          setT(clamped);
        };
        window.__setShortLook = (nextLook: LookId) => {
          setLookId(nextLook);
        };
      };

      if (targetProjId && targetProjId !== 'proj-interdiction-15-ans') {
        bindTimeSetter(120);
        fetch(`/api/studio/projects/${encodeURIComponent(targetProjId)}`, {
          credentials: 'same-origin',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { project?: ShortProject } | null) => {
            if (cancelled) return;
            if (data?.project) {
              setRenderProject(data.project);
              bindTimeSetter(data.project.duration || SHORT_DURATION);
            }
            window.__SHORT_READY = true;
          })
          .catch(() => {
            if (!cancelled) window.__SHORT_READY = true;
          });
      } else {
        bindTimeSetter(SHORT_DURATION);
        window.__SHORT_READY = true;
      }

      return () => {
        cancelled = true;
      };
    }
    void audioEngine.preload();
    fetch('/api/download-mp4/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((st: { ready?: boolean; sizeBytes?: number } | null) => {
        if (st?.ready && st.sizeBytes) {
          setMp4ReadySizeMb((st.sizeBytes / (1024 * 1024)).toFixed(1));
          void fetchVerifiedMp4BlobUrl().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      if (mp4BlobUrlRef.current) {
        URL.revokeObjectURL(mp4BlobUrlRef.current);
        mp4BlobUrlRef.current = null;
      }
    };
  }, [isRenderMode, renderParams.projectId, fetchVerifiedMp4BlobUrl]);

  useEffect(() => {
    if (isRenderMode || !activeProject) return;
    if (isFlagshipReactPlayer) {
      void audioEngine.setProjectAudio({});
    } else if (activeProject.audioTrackUrl) {
      const bed = (activeProject.musicTrack?.trackName || 'upbeat') as
        | 'upbeat'
        | 'groove'
        | 'analytical'
        | 'clockwork'
        | 'chill';
      const sfxEvents = (activeProject.sfxTrack || []).map((s) => ({
        at: s.start,
        kind: s.sound as 'impact-boom' | 'zhhh' | 'riser' | 'pop-back',
        gain: s.volume,
      }));
      void audioEngine.setProjectAudio({
        voiceUrl: activeProject.audioTrackUrl,
        musicBed: bed,
        sfxEvents,
      });
    }
  }, [isRenderMode, activeProject, isFlagshipReactPlayer]);

  useEffect(() => {
    audioEngine.setOptions({ musicEnabled, sfxEnabled, voiceEnabled });
  }, [musicEnabled, sfxEnabled, voiceEnabled]);

  // Video element playback sync when active project has an MP4 source
  useEffect(() => {
    const vid = playerVideoRef.current;
    if (!vid || !playerMediaSrc || viewMode !== 'player') return;
    vid.muted = isVideoMuted;
    if (isPlaying && vid.paused) {
      void vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [isPlaying, isVideoMuted, playerMediaSrc, viewMode]);

  // Flagship WebAudio or DynamicShortStage RAF loop
  useEffect(() => {
    if (!isPlaying || isRenderMode || viewMode !== 'player' || playerMediaSrc) {
      if (lastRafRef.current !== null) cancelAnimationFrame(lastRafRef.current);
      lastRafRef.current = null;
      audioEngine.stop();
      return;
    }

    let cancelled = false;

    const runLoop = async () => {
      if (useWebAudioLoop) {
        await audioEngine.start(tRef.current, effectiveAudioSpeed);
      }
      if (cancelled) return;

      let prevNow = performance.now();

      const frame = (now: number) => {
        if (cancelled) return;
        const prevT = tRef.current;
        const synced = useWebAudioLoop ? audioEngine.getSyncedTime(effectiveAudioSpeed) : null;
        const dt = Math.min(0.1, (now - prevNow) / 1000) * effectiveAudioSpeed;
        prevNow = now;
        let nextT = synced !== null ? synced : prevT + dt;

        if (nextT >= playerDuration) {
          nextT = 0;
          if (useWebAudioLoop) {
            audioEngine.seekWhilePlaying(0, effectiveAudioSpeed);
          }
        }

        if (useWebAudioLoop) {
          audioEngine.tick(prevT, nextT);
        }
        tRef.current = nextT;
        setT(nextT);
        lastRafRef.current = requestAnimationFrame(frame);
      };

      lastRafRef.current = requestAnimationFrame(frame);
    };

    void runLoop();

    return () => {
      cancelled = true;
      if (lastRafRef.current !== null) cancelAnimationFrame(lastRafRef.current);
      audioEngine.stop();
    };
  }, [isPlaying, effectiveAudioSpeed, isRenderMode, viewMode, playerMediaSrc, useWebAudioLoop, playerDuration]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleSeek = useCallback(
    (nextT: number) => {
      const clamped = clamp(nextT, 0, playerDuration);
      tRef.current = clamped;
      setT(clamped);
      if (playerMediaSrc && playerVideoRef.current) {
        playerVideoRef.current.currentTime = clamped;
      } else if (useWebAudioLoop) {
        if (isPlaying) {
          audioEngine.seekWhilePlaying(clamped, effectiveAudioSpeed);
        } else {
          audioEngine.resetTriggersBefore(clamped);
        }
      }
    },
    [playerDuration, playerMediaSrc, useWebAudioLoop, isPlaying, effectiveAudioSpeed]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    tRef.current = 0;
    setT(0);
    if (playerMediaSrc && playerVideoRef.current) {
      playerVideoRef.current.pause();
      playerVideoRef.current.currentTime = 0;
    } else if (useWebAudioLoop) {
      audioEngine.resetTriggersBefore(0);
    }
  }, [playerMediaSrc, useWebAudioLoop]);

  const triggerBlobSave = useCallback((blobUrl: string, filename = 'short-interdiction-15-ans-hd.mp4') => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadDone(true);
    setTimeout(() => setDownloadDone(false), 3500);
  }, []);

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return;
    setDownloadError(null);

    if (!isFlagshipReactPlayer && activeProject) {
      setDownloadingMp4(true);
      try {
        const res = await fetch(
          `/api/studio/projects/${encodeURIComponent(activeProject.id)}/download?version=${encodeURIComponent(activeProject.currentVersion)}`,
          { credentials: 'same-origin' }
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { error?: string }).error ||
              'Aucun rendu MP4 pour cette version — lancez un rendu FFmpeg depuis Studio Feedback → Outils.'
          );
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        triggerBlobSave(url, `${activeProject.slug}-${activeProject.currentVersion}-hd.mp4`);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : 'Erreur export MP4');
      } finally {
        setDownloadingMp4(false);
      }
      return;
    }

    if (mp4BlobUrlRef.current) {
      triggerBlobSave(mp4BlobUrlRef.current);
      return;
    }

    setDownloadingMp4(true);
    try {
      const blobUrl = await fetchVerifiedMp4BlobUrl();
      triggerBlobSave(blobUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Erreur export MP4');
    } finally {
      setDownloadingMp4(false);
    }
  }, [downloadingMp4, isFlagshipReactPlayer, activeProject, fetchVerifiedMp4BlobUrl, triggerBlobSave]);

  const handleRenderProjectMp4 = useCallback(
    async (projectId: string) => {
      if (renderingProjectId) return;
      setRenderingProjectId(projectId);
      setDownloadError(null);
      try {
        const res = await fetch(
          `/api/studio/projects/${encodeURIComponent(projectId)}/render-now`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ lookId }),
          }
        );
        const data = (await res.json()) as { project?: ShortProject; error?: string };
        if (!res.ok || !data.project) {
          throw new Error(data.error || 'Échec génération MP4.');
        }
        await fetchWorkspace(projectId);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : 'Erreur génération MP4');
      } finally {
        setRenderingProjectId(null);
      }
    },
    [renderingProjectId, lookId, fetchWorkspace]
  );

  const handleDownloadSpecificProject = useCallback(
    async (proj: ShortProject) => {
      if (proj.isFlagshipReactStage && (!proj.versions?.[0]?.outputMp4 || proj.versions[0].outputMp4 === '/video/short-interdiction-15-ans.mp4')) {
        await handleActivateProject(proj.id);
        await handleDownloadMp4();
        return;
      }
      setDownloadError(null);
      try {
        const res = await fetch(
          `/api/studio/projects/${encodeURIComponent(proj.id)}/download?version=${encodeURIComponent(proj.currentVersion)}`,
          { credentials: 'same-origin' }
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as { error?: string }).error || 'MP4 indisponible.');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        triggerBlobSave(url, `${proj.slug}-${proj.currentVersion}-hd.mp4`);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : 'Erreur export MP4');
      }
    },
    [handleActivateProject, handleDownloadMp4, triggerBlobSave]
  );

  const handleSyncAllNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncErr(null);
    setSyncMsg(null);
    try {
      const cleanRailway = railwayInput.trim();
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          target: 'all',
          ...(cleanRailway ? { railwayUrl: cleanRailway } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        summary?: string;
        errors?: string[];
        error?: string;
        railwayNeedsRedeploy?: boolean;
        railwayDeployTriggered?: boolean;
        status?: typeof syncStatus;
      };
      if (data.status) setSyncStatus(data.status);
      if (!res.ok && data.error) {
        throw new Error(data.error);
      }
      if (data.summary && (!data.errors || data.errors.length === 0 || data.railwayNeedsRedeploy)) {
        setSyncMsg(
          data.railwayDeployTriggered
            ? `${data.summary} · Redéploiement Railway déclenché automatiquement.`
            : data.summary
        );
      }
      if (data.errors && data.errors.length > 0 && !data.railwayNeedsRedeploy) {
        setSyncErr(data.errors.join(' · '));
      } else if (data.railwayNeedsRedeploy && !data.railwayDeployTriggered) {
        setSyncErr(
          'GitHub est à jour, mais votre service Railway tourne encore sur une ancienne version. Sur Railway : Settings → Source → gabrieltieche-hue/Studio-Video-final-ultime (main) → Deployments → Redeploy.'
        );
      }
      await fetchWorkspace();
    } catch (err) {
      setSyncErr(err instanceof Error ? err.message : 'Erreur synchronisation');
    } finally {
      setSyncing(false);
    }
  }, [syncing, railwayInput, fetchWorkspace]);

  const handleCheckRailwayNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncErr(null);
    setSyncMsg(null);
    try {
      await fetchSyncStatus(true);
      const res = await fetch('/api/sync/status?refresh=1', { credentials: 'same-origin' });
      const data = (await res.json()) as { status?: typeof syncStatus };
      if (data.status) {
        setSyncStatus(data.status);
        if (data.status.railwaySyncReady) {
          setSyncMsg('Railway est en ligne sur la dernière version et prêt pour la synchronisation directe.');
        } else if (data.status.railwayReachable) {
          setSyncErr(
            `Railway répond encore en version ${data.status.railwayVersion || 'antérieure'}. Vérifiez sur Railway que le dépôt source est bien gabrieltieche-hue/Studio-Video-final-ultime (main) puis cliquez Redeploy.`
          );
        } else {
          setSyncErr('Serveur Railway injoignable pour le moment.');
        }
      }
    } catch (err) {
      setSyncErr(err instanceof Error ? err.message : 'Impossible de vérifier Railway');
    } finally {
      setSyncing(false);
    }
  }, [syncing, fetchSyncStatus]);

  const handlePullRailway = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncErr(null);
    setSyncMsg(null);
    try {
      const cleanRailway = railwayInput.trim();
      const res = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...(cleanRailway ? { railwayUrl: cleanRailway } : {}),
        }),
      });
      const data = (await res.json()) as {
        pulledProjects?: number;
        pulledFiles?: number;
        error?: string;
        status?: typeof syncStatus;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Récupération Railway impossible.');
      }
      if (data.status) setSyncStatus(data.status);
      setSyncMsg(
        `Récupéré depuis Railway : ${data.pulledProjects || 0} projet(s), ${data.pulledFiles || 0} fichier(s).`
      );
      await fetchWorkspace();
    } catch (err) {
      setSyncErr(err instanceof Error ? err.message : 'Erreur import Railway');
    } finally {
      setSyncing(false);
    }
  }, [syncing, railwayInput, fetchWorkspace]);

  const handleSaveSyncSettings = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSyncErr(null);
      setSyncMsg(null);
      try {
        const cleanRailway = railwayInput.trim();
        try {
          window.localStorage.setItem('studio_short_railway_url', cleanRailway);
        } catch {
          // ignore localStorage error
        }
        const payload: Record<string, unknown> = {
          railwayUrl: cleanRailway,
          githubRepo: githubRepoInput.trim(),
        };
        if (githubTokenInput.trim()) {
          payload.githubToken = githubTokenInput.trim();
        }
        if (railwayHookInput.trim()) {
          payload.railwayDeployHookUrl = railwayHookInput.trim();
        }
        const res = await fetch('/api/sync/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { status?: typeof syncStatus; error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Configuration invalide.');
        }
        if (data.status) setSyncStatus(data.status);
        setGithubTokenInput('');
        setRailwayHookInput('');
        setShowSyncSettings(false);
        setSyncMsg('Configuration enregistrée.');
      } catch (err) {
        setSyncErr(err instanceof Error ? err.message : 'Erreur configuration sync');
      }
    },
    [railwayInput, githubRepoInput, githubTokenInput, railwayHookInput]
  );

  // Keyboard shortcuts (Space: play/pause, Left/Right: scrub 1s)
  useEffect(() => {
    if (isRenderMode || viewMode !== 'player') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(tRef.current + 1.0);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(tRef.current - 1.0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRenderMode, viewMode, handleTogglePlay, handleSeek]);

  const dynamicBeats = useMemo(
    () => (activeProject ? buildDynamicBeatsFromProject(activeProject) : []),
    [activeProject]
  );

  const activeBeatLabel = useMemo(() => {
    if (isFlagshipReactPlayer) {
      const b = BEATS.find((item) => t >= item.from && t < item.to) || BEATS[BEATS.length - 1];
      return `Beat ${b.index}/${BEATS.length} (${b.shortLabel})`;
    }
    if (dynamicBeats.length > 0) {
      const b =
        dynamicBeats.find((item) => t >= item.from && t < item.to) ||
        dynamicBeats[dynamicBeats.length - 1];
      return `Beat ${b.index}/${dynamicBeats.length} (${b.title})`;
    }
    return activeProject?.currentVersion || 'v1';
  }, [isFlagshipReactPlayer, dynamicBeats, t, activeProject]);

  if (isRenderMode) {
    return (
      <div id="short-render-root" className="w-[1080px] h-[1920px] overflow-hidden bg-[#F1EEE6]">
        {renderProject ? (
          <DynamicShortStage
            project={renderProject}
            t={t}
            look={look}
            showSafeZones={false}
            renderMode
          />
        ) : (
          <ShortStage t={t} look={look} showSafeZones={false} renderMode />
        )}
      </div>
    );
  }

  const progressPct = clamp((t / playerDuration) * 100, 0, 100);
  const displayTime = isFlagshipReactPlayer ? t / speed : t;
  const displayDuration = isFlagshipReactPlayer ? playerDuration / speed : playerDuration;

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#14161B] flex flex-col">
      {/* Compact Studio Navigation Bar */}
      <header className="w-full border-b border-[#E3DED3] bg-[#FCFBF8]">
        <div className="max-w-[1160px] mx-auto px-2.5 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-4">
          <span
            className="text-xs sm:text-base font-extrabold tracking-tight text-[#14161B] whitespace-nowrap shrink-0"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            <span className="sm:hidden">Short</span>
            <span className="hidden sm:inline">Studio Short</span>
          </span>

          <nav aria-label="Modes du studio" className="inline-flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-[#EAE7DF] rounded-xl min-w-0 max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                void fetchWorkspace();
                setViewMode('player');
              }}
              aria-pressed={viewMode === 'player'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'player'
                  ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Lecteur</span>
              <span className="hidden sm:inline">Lecteur Short</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                void fetchWorkspace();
                setViewMode('studio');
              }}
              aria-pressed={viewMode === 'studio'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'studio'
                  ? 'bg-[#14161B] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Studio</span>
              <span className="hidden sm:inline">Studio Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setViewMode('recorder');
              }}
              aria-pressed={viewMode === 'recorder'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'recorder'
                  ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span>Prompteur</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setViewMode('research');
              }}
              aria-pressed={viewMode === 'research'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'research'
                  ? 'bg-[#258EFF] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Veille</span>
              <span className="hidden sm:inline">Veille &amp; CSV</span>
            </button>

            <button
              type="button"
              data-testid="nav-batch-tab"
              onClick={() => {
                setIsPlaying(false);
                setViewMode('batch');
              }}
              aria-pressed={viewMode === 'batch'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'batch'
                  ? 'bg-[#258EFF] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Masse</span>
              <span className="hidden sm:inline">En masse</span>
            </button>

            <button
              type="button"
              data-testid="nav-publish-tab"
              onClick={() => {
                setIsPlaying(false);
                void fetchWorkspace();
                setViewMode('publish');
              }}
              aria-pressed={viewMode === 'publish'}
              className={`inline-flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'publish'
                  ? 'bg-[#059669] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <CalendarClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Publier</span>
              <span className="hidden sm:inline">Publication</span>
            </button>
          </nav>
        </div>
      </header>

      {viewMode === 'studio' ? (
        <StudioWorkspace
          projects={projects}
          activeProject={activeProject}
          sourceVideos={sourceVideos}
          loading={workspaceLoading}
          onActivateProject={handleActivateProject}
          onRefreshWorkspace={fetchWorkspace}
          onRefreshProject={refreshProject}
          onOpenPublish={() => {
            setIsPlaying(false);
            setViewMode('publish');
          }}
        />
      ) : viewMode === 'recorder' ? (
        <main className="flex-1">
          <StudioRecorderView activeProject={activeProject} />
        </main>
      ) : viewMode === 'research' ? (
        <main className="flex-1">
          <TopicResearchView
            onCreateProjectFromTopic={handleCreateProjectFromTopic}
            onOpenBatch={() => {
              setIsPlaying(false);
              setViewMode('batch');
            }}
          />
        </main>
      ) : viewMode === 'batch' ? (
        <main className="flex-1">
          <BatchCreateView
            onRefreshWorkspace={fetchWorkspace}
            onOpenProjectInPlayer={async (projId) => {
              await fetchWorkspace(projId);
              await handleActivateProject(projId);
              setViewMode('player');
            }}
            onOpenProjectInStudio={async (projId) => {
              await fetchWorkspace(projId);
              await handleActivateProject(projId);
              setViewMode('studio');
            }}
            onOpenPublish={() => {
              setIsPlaying(false);
              void fetchWorkspace();
              setViewMode('publish');
            }}
          />
        </main>
      ) : viewMode === 'publish' ? (
        <main className="flex-1">
          <SocialPublishView projects={projects} activeProject={activeProject} />
        </main>
      ) : (
        <div className="flex-1 w-full max-w-[1140px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Active Short Player */}
            <main className="lg:col-span-5 w-full max-w-[400px] mx-auto flex flex-col items-center gap-2.5">
              {/* Project & Version Switcher in Lecteur Short */}
              {projects.length > 0 && activeProject && (
                <div className="w-full flex items-center gap-1.5 px-1">
                  <label htmlFor="player-project-select" className="sr-only">
                    Projet actif dans le lecteur
                  </label>
                  <select
                    id="player-project-select"
                    value={activeProject.id}
                    onChange={(e) => void handleActivateProject(e.target.value)}
                    className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] text-xs font-bold text-[#14161B] truncate cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="player-version-select" className="sr-only">
                    Version active dans le lecteur
                  </label>
                  <select
                    id="player-version-select"
                    value={activeProject.currentVersion}
                    onChange={(e) =>
                      void handleActivateProject(activeProject.id, e.target.value)
                    }
                    className="h-8 px-2 rounded-lg border border-[#E3DED3] bg-[#EAE7DF] font-mono text-[11px] font-bold text-[#14161B] cursor-pointer shrink-0"
                  >
                    {(activeProject.versions || []).map((v) => (
                      <option key={v.version} value={v.version}>
                        {v.version}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Minimal Title Line */}
              <div className="w-full flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <h1
                    className="text-base sm:text-lg font-extrabold tracking-tight text-[#14161B] truncate"
                    style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                  >
                    {activeProject?.title || 'Interdire les réseaux avant 15 ans'}
                  </h1>
                  <p className="text-xs text-[#5C5F68] tabular-nums truncate">
                    1080×1920 · {displayDuration.toFixed(1)} s · {activeBeatLabel}
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#5C5F68] tabular-nums shrink-0">
                  {activeProject?.currentVersion || 'v1'}
                </span>
              </div>

              {/* 9:16 Short Stage / Rendered Video */}
              <div className="w-[276px] sm:w-[300px] aspect-[9/16] mx-auto rounded-[20px] overflow-hidden border border-[#E3DED3] bg-[#F1EEE6] shadow-sm">
                {playerMediaSrc ? (
                  <video
                    key={playerMediaSrc}
                    ref={playerVideoRef}
                    src={playerMediaSrc}
                    poster={
                      activeVersionObj?.contactSheetUrl?.endsWith('_contact.jpg')
                        ? activeVersionObj.contactSheetUrl.replace('_contact.jpg', '_thumb.jpg')
                        : undefined
                    }
                    preload="auto"
                    playsInline
                    onLoadedMetadata={(e) => {
                      if (e.currentTarget.currentTime === 0) {
                        e.currentTarget.currentTime = 0.04;
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const next = e.currentTarget.currentTime;
                      tRef.current = next;
                      setT(next);
                    }}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-cover"
                  />
                ) : isFlagshipReactPlayer ? (
                  <ShortStage t={t} look={look} showSafeZones={false} />
                ) : activeProject ? (
                  <DynamicShortStage
                    project={activeProject}
                    t={t}
                    look={look}
                    showSafeZones={false}
                  />
                ) : null}
              </div>

              {/* Transport Bar */}
              <div className="w-full bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-3 flex items-center gap-2.5 shadow-sm">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? 'Mettre en pause' : 'Lire le Short'}
                  className="w-11 h-11 rounded-xl bg-[#14161B] text-white flex items-center justify-center hover:bg-[#258EFF] transition-colors cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Revenir à 0.0 s"
                  className="w-10 h-11 rounded-xl border border-[#E3DED3] bg-white text-[#14161B] flex items-center justify-center hover:bg-[#F6F5F1] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0 flex flex-col gap-1 px-1">
                  <label htmlFor="short-scrubber" className="sr-only">
                    Position dans la timeline
                  </label>
                  <input
                    id="short-scrubber"
                    type="range"
                    min={0}
                    max={playerDuration}
                    step={0.05}
                    value={t}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full cursor-pointer accent-[#258EFF]"
                    style={{
                      background: `linear-gradient(to right, #258EFF ${progressPct}%, #E3DED3 ${progressPct}%)`,
                    }}
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#5C5F68] tabular-nums">
                    <span>{formatClock(displayTime)}</span>
                    <span>{formatClock(displayDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Audio Switches (Flagship WebAudio) or Look Switcher (Dynamic Preview) + MP4 Export */}
              <div className="w-full flex flex-col gap-2.5">
                {isFlagshipReactPlayer ? (
                  <div className="w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setVoiceEnabled((v) => !v)}
                        aria-pressed={voiceEnabled}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          voiceEnabled
                            ? 'bg-[#258EFF] text-white border-[#258EFF]'
                            : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                        }`}
                      >
                        {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        Voix FR
                      </button>

                      <button
                        type="button"
                        onClick={() => setMusicEnabled((v) => !v)}
                        aria-pressed={musicEnabled}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          musicEnabled
                            ? 'bg-[#14161B] text-white border-[#14161B]'
                            : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                        }`}
                      >
                        <Music className="w-3.5 h-3.5" />
                        Bright Groove
                      </button>

                      <button
                        type="button"
                        onClick={() => setSfxEnabled((v) => !v)}
                        aria-pressed={sfxEnabled}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          sfxEnabled
                            ? 'bg-[#14161B] text-white border-[#14161B]'
                            : 'bg-[#FCFBF8] text-[#5C5F68] border-[#E3DED3]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        SFX
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between gap-2">
                    {playerMediaSrc ? (
                      <button
                        type="button"
                        onClick={() => setIsVideoMuted((m) => !m)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] text-xs font-medium text-[#14161B] cursor-pointer"
                      >
                        {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {isVideoMuted ? 'Audio coupé' : 'Audio vidéo'}
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#EAE7DF]">
                        {(Object.keys(LOOK_PRESETS) as LookId[]).map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setLookId(id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                              lookId === id ? 'bg-[#FCFBF8] text-[#14161B] shadow-xs' : 'text-[#5C5F68]'
                            }`}
                          >
                            {LOOK_PRESETS[id].label}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setViewMode('studio');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#258EFF] text-xs font-semibold text-[#14161B] cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#258EFF]" />
                      Annoter dans Studio
                    </button>
                  </div>
                )}

                {!isFlagshipReactPlayer && activeProject && activeProject.hasMp4 === false && !playerMediaSrc ? (
                  <button
                    type="button"
                    onClick={() => void handleRenderProjectMp4(activeProject.id)}
                    disabled={renderingProjectId === activeProject.id}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#258EFF] hover:bg-[#14161B] disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {renderingProjectId === activeProject.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Génération MP4 HD en cours…
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        Générer MP4 HD (1080×1920)
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadMp4}
                    disabled={downloadingMp4}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-70 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {downloadingMp4 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Téléchargement MP4 HD{downloadPct !== null ? ` (${downloadPct} %)` : '…'}
                      </>
                    ) : downloadDone ? (
                      <>
                        <Check className="w-4 h-4" />
                        MP4 haute qualité téléchargé
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Télécharger MP4 HD (1080×1920
                        {isFlagshipReactPlayer && mp4ReadySizeMb ? ` · ${mp4ReadySizeMb} Mo` : ''})
                      </>
                    )}
                  </button>
                )}

                {downloadError && (
                  <p className="text-xs text-[#DC2626] text-center">{downloadError}</p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setViewMode('publish');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#258EFF] text-[#14161B] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-[#059669]" aria-hidden="true" />
                  Programmer sur YouTube / Reels / TikTok
                </button>
              </div>
            </main>

            {/* Right Column: Saved Videos Shelf & 3-Way Synchronization */}
            <aside className="lg:col-span-7 space-y-4">
              {/* Saved Videos Library */}
              <section
                data-testid="saved-videos-shelf"
                aria-label="Mes vidéos sauvegardées"
                className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className="text-base sm:text-lg font-extrabold tracking-tight text-[#14161B]"
                      style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                    >
                      Mes vidéos sauvegardées
                    </h2>
                    <p className="text-xs text-[#5C5F68]">
                      {projects.length} Short(s) enregistré(s) · prêts à lire, télécharger ou publier
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setViewMode('batch');
                    }}
                    className="h-8 px-3 rounded-lg bg-[#258EFF] hover:bg-[#14161B] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    + En masse
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#E3DED3] text-center text-xs text-[#5C5F68]">
                    Aucune vidéo sauvegardée pour l’instant. Lancez une création en masse pour générer vos premiers Shorts.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {projects.map((proj) => {
                      const isActive = proj.id === activeProject?.id;
                      const verObj = (proj.versions || []).find(
                        (v) => v.version === proj.currentVersion
                      );
                      const mp4Ready = Boolean(
                        proj.hasMp4 || verObj?.hasMp4 || proj.isFlagshipReactStage
                      );
                      const thumbUrl = verObj?.contactSheetUrl?.endsWith('_contact.jpg')
                        ? verObj.contactSheetUrl.replace('_contact.jpg', '_thumb.jpg')
                        : undefined;
                      const isRenderingThis = renderingProjectId === proj.id;

                      return (
                        <div
                          key={proj.id}
                          data-testid={`saved-video-card-${proj.id}`}
                          className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'border-[#258EFF] bg-[#258EFF]/[0.04]'
                              : 'border-[#E3DED3] bg-white hover:border-[#14161B]/25'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-[70px] rounded-lg border border-[#E3DED3] bg-[#F1EEE6] overflow-hidden shrink-0 flex items-center justify-center">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={proj.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Film className="w-4 h-4 text-[#258EFF]" aria-hidden="true" />
                              )}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    mp4Ready
                                      ? 'bg-[#059669]/12 text-[#047857]'
                                      : 'bg-[#D97706]/12 text-[#B45309]'
                                  }`}
                                >
                                  {mp4Ready ? 'MP4 prêt' : 'MP4 à générer'}
                                </span>
                                <span className="text-[11px] font-mono text-[#5C5F68] tabular-nums">
                                  {proj.currentVersion} · {proj.duration.toFixed(1)} s
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm font-bold text-[#14161B] truncate">
                                {proj.title}
                              </div>
                              <div className="text-[11px] text-[#5C5F68] truncate">
                                {proj.topicCategory || 'Short'} · 1080×1920
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => void handleActivateProject(proj.id)}
                              className={`h-8 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                isActive
                                  ? 'bg-[#14161B] text-white'
                                  : 'border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#258EFF] text-[#14161B]'
                              }`}
                            >
                              <Play className="w-3 h-3" aria-hidden="true" />
                              Lire
                            </button>

                            {mp4Ready ? (
                              <button
                                type="button"
                                onClick={() => void handleDownloadSpecificProject(proj)}
                                className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#258EFF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Download className="w-3 h-3" aria-hidden="true" />
                                MP4
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={Boolean(renderingProjectId)}
                                onClick={() => void handleRenderProjectMp4(proj.id)}
                                className="h-8 px-2.5 rounded-lg bg-[#258EFF] hover:bg-[#14161B] disabled:opacity-60 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                {isRenderingThis ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Film className="w-3 h-3" aria-hidden="true" />
                                )}
                                Générer MP4
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                await handleActivateProject(proj.id);
                                setViewMode('studio');
                              }}
                              className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#14161B] text-[11px] font-semibold text-[#5C5F68] hover:text-[#14161B] cursor-pointer whitespace-nowrap"
                            >
                              Studio
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Unified 3-Way Synchronization Panel */}
              <section
                data-testid="sync-panel"
                aria-label="Synchronisation GitHub et Railway"
                className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#14161B]">
                      <Cloud className="w-4 h-4 text-[#258EFF] shrink-0" aria-hidden="true" />
                      <span>Synchronisation Studio · GitHub · Railway</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold max-w-full truncate ${
                          syncStatus?.githubConnected
                            ? 'bg-[#059669]/12 text-[#047857]'
                            : 'bg-[#EAE7DF] text-[#5C5F68]'
                        }`}
                      >
                        GitHub :{' '}
                        {syncStatus?.githubConnected
                          ? syncStatus.githubRepo || 'Connecté'
                          : 'À configurer'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                          !syncStatus?.railwayUrl
                            ? 'bg-[#EAE7DF] text-[#5C5F68]'
                            : syncStatus.railwaySyncReady
                              ? 'bg-[#059669]/12 text-[#047857]'
                              : syncStatus.railwayReachable
                                ? 'bg-[#D97706]/12 text-[#B45309]'
                                : 'bg-[#DC2626]/10 text-[#DC2626]'
                        }`}
                      >
                        Railway :{' '}
                        {!syncStatus?.railwayUrl
                          ? 'Optionnel'
                          : syncStatus.railwaySyncReady
                            ? 'Synchronisable'
                            : syncStatus.railwayReachable
                              ? `Redéploiement requis (${syncStatus.railwayVersion || 'ancien'})`
                              : 'Hors ligne'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowSyncSettings((v) => !v)}
                      aria-expanded={showSyncSettings}
                      className="h-9 px-3 rounded-xl border border-[#E3DED3] bg-white hover:border-[#14161B] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Configurer
                    </button>

                    {syncStatus?.railwayUrl && !syncStatus.railwaySyncReady && (
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={() => void handleCheckRailwayNow()}
                        className="h-9 px-3 rounded-xl border border-[#D97706]/40 bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] text-xs font-semibold text-[#92400E] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Revérifier Railway
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="sync-now-btn"
                      disabled={syncing}
                      onClick={() => void handleSyncAllNow()}
                      className="h-9 px-3.5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      {syncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      Synchroniser tout
                    </button>
                  </div>
                </div>

                {syncStatus?.railwayUrl && syncStatus.railwayReachable && !syncStatus.railwaySyncReady && !syncErr && (
                  <p className="text-[11px] text-[#92400E] bg-[#FEF3C7]/60 border border-[#D97706]/25 rounded-xl px-3 py-2">
                    GitHub <span className="font-mono font-semibold">{syncStatus.githubRepo || 'main'}</span> est à jour, mais Railway exécute encore la build <span className="font-mono">{syncStatus.railwayVersion || 'antérieure'}</span>. Sur Railway → Service → <span className="font-semibold">Settings → Source ({syncStatus.githubRepo || 'Studio-Video-final-ultime'} / main) → Deployments → Redeploy</span>, puis cliquez sur <span className="font-semibold">Revérifier Railway</span>.
                  </p>
                )}

                {syncStatus?.lastSyncSummary && !syncMsg && !syncErr && (
                  <p className="text-[11px] text-[#5C5F68] truncate">
                    Dernière synchro : {syncStatus.lastSyncSummary}
                  </p>
                )}

                {syncMsg && (
                  <div
                    role="status"
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#059669]/10 text-[#047857]"
                  >
                    {syncMsg}
                  </div>
                )}

                {syncErr && (
                  <div
                    role="status"
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#D97706]/12 text-[#92400E] border border-[#D97706]/25"
                  >
                    {syncErr}
                  </div>
                )}

                {showSyncSettings && (
                  <form
                    onSubmit={handleSaveSyncSettings}
                    className="pt-3 border-t border-[#E3DED3] space-y-2.5 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label
                          htmlFor="sync-railway-url"
                          className="block text-[11px] font-semibold text-[#5C5F68]"
                        >
                          URL publique Railway (pour envoi direct des vidéos)
                        </label>
                        <input
                          id="sync-railway-url"
                          type="url"
                          value={railwayInput}
                          onChange={(e) => setRailwayInput(e.target.value)}
                          placeholder="https://studio-video-....up.railway.app"
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white font-mono text-[11px] text-[#14161B]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="sync-github-repo"
                          className="block text-[11px] font-semibold text-[#5C5F68]"
                        >
                          Dépôt GitHub (proprietaire/repo)
                        </label>
                        <input
                          id="sync-github-repo"
                          type="text"
                          value={githubRepoInput}
                          onChange={(e) => setGithubRepoInput(e.target.value)}
                          placeholder="gabrieltieche-hue/Studio-Video-final-ultime"
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white font-mono text-[11px] text-[#14161B]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label
                          htmlFor="sync-github-token"
                          className="block text-[11px] font-semibold text-[#5C5F68]"
                        >
                          Token GitHub (PAT · laissé masqué, laissez vide pour conserver)
                        </label>
                        <input
                          id="sync-github-token"
                          type="password"
                          value={githubTokenInput}
                          onChange={(e) => setGithubTokenInput(e.target.value)}
                          placeholder={
                            syncStatus?.githubTokenMasked
                              ? `Actuel : ${syncStatus.githubTokenMasked}`
                              : 'github_pat_...'
                          }
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white font-mono text-[11px] text-[#14161B]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="sync-railway-hook"
                          className="block text-[11px] font-semibold text-[#5C5F68]"
                        >
                          Railway Deploy Hook (optionnel · redéploiement auto)
                        </label>
                        <input
                          id="sync-railway-hook"
                          type="password"
                          value={railwayHookInput}
                          onChange={(e) => setRailwayHookInput(e.target.value)}
                          placeholder={
                            syncStatus?.railwayDeployHookConfigured
                              ? 'Deploy Hook enregistré (laisser vide pour conserver)'
                              : 'https://backboard.railway.com/deploy/...'
                          }
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white font-mono text-[11px] text-[#14161B]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={syncing || !railwayInput.trim()}
                        onClick={() => void handlePullRailway()}
                        className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:border-[#258EFF] disabled:opacity-50 text-[11px] font-semibold text-[#14161B] cursor-pointer"
                      >
                        Importer depuis Railway
                      </button>

                      <button
                        type="submit"
                        className="h-8 px-4 rounded-lg bg-[#258EFF] hover:bg-[#14161B] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
