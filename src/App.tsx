/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Film,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ShortStage } from './components/short/ShortStage';
import { DynamicShortStage } from './components/short/DynamicShortStage';
import { TopicResearchView } from './components/TopicResearchView';
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

  const [t, setT] = useState(0);
  const [viewMode, setViewMode] = useState<'player' | 'studio' | 'recorder' | 'research'>(() => {
    if (typeof window === 'undefined') return 'player';
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'studio') return 'studio';
    if (params.get('tab') === 'recorder') return 'recorder';
    if (params.get('tab') === 'research') return 'research';
    return 'player';
  });

  // Shared Workspace State (synchronized across Lecteur Short, Studio Feedback, Prompteur, Veille & MCP/API)
  const [projects, setProjects] = useState<ShortProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [lookId, setLookId] = useState<LookId>('papier');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [downloadingMp4, setDownloadingMp4] = useState(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [mp4ReadySizeMb, setMp4ReadySizeMb] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);

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

  const playerDuration = useMemo(() => {
    if (isFlagshipReactPlayer) return SHORT_DURATION;
    return Math.max(10, activeProject?.duration || SHORT_DURATION);
  }, [isFlagshipReactPlayer, activeProject]);

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
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

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
      window.__setShortTime = (nextT: number) => {
        const clamped = clamp(nextT, 0, SHORT_DURATION);
        tRef.current = clamped;
        setT(clamped);
      };
      window.__setShortLook = (nextLook: LookId) => {
        setLookId(nextLook);
      };
      window.__SHORT_READY = true;
      return;
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
  }, [isRenderMode, fetchVerifiedMp4BlobUrl]);

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
      if (isFlagshipReactPlayer) {
        await audioEngine.start(tRef.current, speed);
      }
      if (cancelled) return;

      let prevNow = performance.now();

      const frame = (now: number) => {
        if (cancelled) return;
        const prevT = tRef.current;
        const synced = isFlagshipReactPlayer ? audioEngine.getSyncedTime(speed) : null;
        const dt = Math.min(0.1, (now - prevNow) / 1000) * speed;
        prevNow = now;
        let nextT = synced !== null ? synced : prevT + dt;

        if (nextT >= playerDuration) {
          nextT = 0;
          if (isFlagshipReactPlayer) {
            audioEngine.seekWhilePlaying(0, speed);
          }
        }

        if (isFlagshipReactPlayer) {
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
  }, [isPlaying, speed, isRenderMode, viewMode, playerMediaSrc, isFlagshipReactPlayer, playerDuration]);

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
      } else if (isFlagshipReactPlayer) {
        if (isPlaying) {
          audioEngine.seekWhilePlaying(clamped, speed);
        } else {
          audioEngine.resetTriggersBefore(clamped);
        }
      }
    },
    [playerDuration, playerMediaSrc, isFlagshipReactPlayer, isPlaying, speed]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    tRef.current = 0;
    setT(0);
    if (playerMediaSrc && playerVideoRef.current) {
      playerVideoRef.current.pause();
      playerVideoRef.current.currentTime = 0;
    } else if (isFlagshipReactPlayer) {
      audioEngine.resetTriggersBefore(0);
    }
  }, [playerMediaSrc, isFlagshipReactPlayer]);

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

  if (isRenderMode) {
    return (
      <div id="short-render-root" className="w-[1080px] h-[1920px] overflow-hidden bg-[#F1EEE6]">
        <ShortStage t={t} look={look} showSafeZones={false} renderMode />
      </div>
    );
  }

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

  const progressPct = clamp((t / playerDuration) * 100, 0, 100);
  const displayTime = isFlagshipReactPlayer ? t / speed : t;
  const displayDuration = isFlagshipReactPlayer ? playerDuration / speed : playerDuration;

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#14161B] flex flex-col">
      {/* Compact Studio Navigation Bar */}
      <header className="w-full border-b border-[#E3DED3] bg-[#FCFBF8]">
        <div className="max-w-[1160px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <span
            className="text-xs sm:text-base font-extrabold tracking-tight text-[#14161B] whitespace-nowrap shrink-0"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Studio Short
          </span>

          <nav aria-label="Modes du studio" className="inline-flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-[#EAE7DF] rounded-xl min-w-0">
            <button
              type="button"
              onClick={() => {
                void fetchWorkspace();
                setViewMode('player');
              }}
              aria-pressed={viewMode === 'player'}
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'studio'
                  ? 'bg-[#14161B] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Feedback</span>
              <span className="hidden sm:inline">Studio Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setViewMode('recorder');
              }}
              aria-pressed={viewMode === 'recorder'}
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'research'
                  ? 'bg-[#258EFF] text-white shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" aria-hidden="true" />
              <span className="sm:hidden">Veille</span>
              <span className="hidden sm:inline">Veille &amp; CSV</span>
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
        />
      ) : viewMode === 'recorder' ? (
        <main className="flex-1">
          <StudioRecorderView activeProject={activeProject} />
        </main>
      ) : viewMode === 'research' ? (
        <main className="flex-1">
          <TopicResearchView onCreateProjectFromTopic={handleCreateProjectFromTopic} />
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-3">
          <main className="w-full max-w-[420px] flex flex-col items-center gap-2.5">
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
                  ref={playerVideoRef}
                  src={playerMediaSrc}
                  playsInline
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
            <div className="w-full flex flex-col gap-3">
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

              {downloadError && (
                <p className="text-xs text-[#DC2626] text-center">{downloadError}</p>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
