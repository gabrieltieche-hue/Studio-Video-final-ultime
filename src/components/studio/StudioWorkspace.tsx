import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  Columns2,
  Copy,
  Eye,
  FileText,
  Film,
  FolderOpen,
  GitBranch,
  Grid,
  Layers,
  Loader2,
  MessageSquare,
  Monitor,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Sparkles,
  Wand2,
  Wrench,
} from 'lucide-react';
import { audioEngine } from '../../engine/audioEngine';
import { clamp } from '../../engine/math';
import { DEFAULT_PLAYBACK_SPEED, SHORT_DURATION } from '../../data/shortSpec';
import {
  formatStudioTimecode,
  type ShortProject,
  type SourceVideo,
} from '../../types/studio';
import { StudioLeftSidebar } from './StudioLeftSidebar';
import { StudioPlayer916 } from './StudioPlayer916';
import { StudioPlaybackControls } from './StudioPlaybackControls';
import { StudioMultiTrackTimeline } from './StudioMultiTrackTimeline';
import { StudioRightSidebar } from './StudioRightSidebar';
import {
  ContactSheetModal,
  CopyPromptModal,
  MotionEditorModal,
  NewProjectModal,
} from './StudioModals';

interface StudioWorkspaceProps {
  projects: ShortProject[];
  activeProject: ShortProject | null;
  sourceVideos: SourceVideo[];
  loading: boolean;
  onActivateProject: (projectId: string, version?: string) => Promise<void>;
  onRefreshWorkspace: (preferId?: string) => Promise<void>;
  onRefreshProject: (projectId: string) => Promise<void>;
  onOpenPublish?: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  projects,
  activeProject,
  sourceVideos,
  loading,
  onActivateProject,
  onRefreshWorkspace,
  onRefreshProject,
  onOpenPublish,
}) => {
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Collapsible panels on desktop (clean default: Video 9:16 + Chat Feedback)
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'transcript' | 'library'>('transcript');
  const [showVideoPanel, setShowVideoPanel] = useState(true);
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [isMuted, setIsMuted] = useState(false);
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  // Inspection / annotation context
  const [selectedTargetElement, setSelectedTargetElement] = useState<string | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const [drawingResetSignal, setDrawingResetSignal] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [renderingJobMsg, setRenderingJobMsg] = useState<string | null>(null);

  // Modals & Responsive mobile tab
  const [mobilePane, setMobilePane] = useState<'left' | 'stage' | 'right'>('stage');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [showMotionEditor, setShowMotionEditor] = useState(false);
  const [editorComponentId, setEditorComponentId] = useState<string | null>(null);
  const [showCopyPrompt, setShowCopyPrompt] = useState(false);

  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    timeRef.current = 0;
    setSelectedTargetElement(null);
    setPendingSnapshot(null);
  }, [activeProject?.id, activeProject?.currentVersion]);

  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    window.addEventListener('mousedown', onOutsideClick);
    return () => window.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    audioEngine.setOptions({
      musicEnabled: !isMuted,
      sfxEnabled: !isMuted,
      voiceEnabled: !isMuted,
    });
  }, [isMuted]);

  const activeDuration = activeProject?.duration || SHORT_DURATION;
  const activeVersionObj = (activeProject?.versions || []).find(
    (v) => v.version === activeProject?.currentVersion
  );
  const isReactFlagship =
    Boolean(activeProject?.isFlagshipReactStage) &&
    (!activeVersionObj?.outputMp4 ||
      activeVersionObj.outputMp4 === '/video/short-interdiction-15-ans.mp4');
  const hasDynamicWebAudio = !isReactFlagship && !activeVersionObj?.outputMp4 && Boolean(activeProject?.audioTrackUrl);
  const useWebAudio = isReactFlagship || hasDynamicWebAudio;
  const activeAudioSpeed = isReactFlagship ? playbackSpeed : 1.0;

  useEffect(() => {
    if (!activeProject) return;
    if (isReactFlagship) {
      void audioEngine.setProjectAudio({});
    } else if (activeProject.audioTrackUrl) {
      const bed = (activeProject.musicTrack?.trackName || 'upbeat') as 'upbeat' | 'groove' | 'analytical' | 'clockwork' | 'chill';
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
  }, [activeProject, isReactFlagship]);

  // Playback engine
  useEffect(() => {
    if (!isPlaying || !activeProject) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (useWebAudio) audioEngine.stop();
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (useWebAudio) {
        await audioEngine.start(timeRef.current, activeAudioSpeed);
      }
      if (cancelled) return;

      let prevNow = performance.now();
      const frame = (now: number) => {
        if (cancelled) return;
        const prevT = timeRef.current;
        const dt = Math.min(0.1, (now - prevNow) / 1000) * activeAudioSpeed;
        prevNow = now;
        const synced = useWebAudio ? audioEngine.getSyncedTime(activeAudioSpeed) : null;
        let nextT = synced !== null ? synced : prevT + dt;
        if (nextT >= activeDuration) {
          nextT = 0;
          if (useWebAudio) audioEngine.seekWhilePlaying(0, activeAudioSpeed);
        }
        if (useWebAudio) audioEngine.tick(prevT, nextT);
        timeRef.current = nextT;
        setCurrentTime(nextT);
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    };

    void run();
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (useWebAudio) audioEngine.stop();
    };
  }, [isPlaying, activeProject, useWebAudio, activeAudioSpeed, activeDuration]);

  const handleSeek = useCallback(
    (nextT: number) => {
      const clamped = clamp(nextT, 0, activeDuration);
      timeRef.current = clamped;
      setCurrentTime(clamped);
      if (useWebAudio) {
        if (isPlaying) audioEngine.seekWhilePlaying(clamped, activeAudioSpeed);
        else audioEngine.resetTriggersBefore(clamped);
      }
    },
    [activeDuration, useWebAudio, isPlaying, activeAudioSpeed]
  );

  const handleSelectProject = async (p: ShortProject) => {
    setIsPlaying(false);
    await onActivateProject(p.id);
  };

  const handleSelectVersion = async (version: string) => {
    if (!activeProject) return;
    setIsPlaying(false);
    await onActivateProject(activeProject.id, version);
    setStatusBanner(`Version ${version} activée dans le Studio et le Lecteur.`);
    setTimeout(() => setStatusBanner(null), 2500);
  };

  const handleAddFeedback = async (
    text: string,
    type: 'comment' | 'cut' | 'idea'
  ) => {
    if (!activeProject) return;
    setErrorBanner(null);
    const activeWord = (activeProject.transcript || []).find(
      (w) => currentTime >= w.start && currentTime <= w.end
    );
    const res = await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/feedbacks`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Number(currentTime.toFixed(2)),
          timeFormatted: formatStudioTimecode(currentTime),
          quoteText: activeWord?.word,
          text,
          targetElement: selectedTargetElement || undefined,
          drawingSnapshot: pendingSnapshot || undefined,
          type,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Erreur enregistrement du feedback.');
      return;
    }
    setSelectedTargetElement(null);
    setPendingSnapshot(null);
    setDrawingResetSignal((s) => s + 1);
    await onRefreshProject(activeProject.id);
    setStatusBanner(`Feedback ajouté au timecode ${formatStudioTimecode(currentTime)}`);
    setTimeout(() => setStatusBanner(null), 2500);
  };

  const handleToggleResolveFeedback = async (fId: string, resolved: boolean) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/feedbacks/${encodeURIComponent(fId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      }
    );
    await onRefreshProject(activeProject.id);
  };

  const handleDeleteFeedback = async (fId: string) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/feedbacks/${encodeURIComponent(fId)}`,
      { method: 'DELETE' }
    );
    await onRefreshProject(activeProject.id);
  };

  const handleToggleCutWord = async (wordId: string) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/words/${encodeURIComponent(wordId)}/cut`,
      { method: 'PATCH' }
    );
    await onRefreshProject(activeProject.id);
  };

  const handleCreateProject = async (payload: {
    title: string;
    slug: string;
    mode: ShortProject['mode'];
    platform: ShortProject['platform'];
    source_video?: string;
    duration?: number;
  }) => {
    const res = await fetch('/api/studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Création impossible');
    await onActivateProject(data.projectId);
    setStatusBanner(`Projet « ${payload.title} » créé et activé.`);
    setTimeout(() => setStatusBanner(null), 3000);
  };

  const handleDeleteProject = async (id: string) => {
    await fetch(`/api/studio/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onRefreshWorkspace();
  };

  const handleSelectPlatform = async (platform: ShortProject['platform']) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/platform`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      }
    );
    await onRefreshProject(activeProject.id);
  };

  const handleImportVideoFile = async (file: File) => {
    setUploadingVideo(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/studio/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': file.name,
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec import vidéo');
      await onRefreshWorkspace(activeProject?.id);
      setStatusBanner(`Rush importé : ${data.video.name}`);
      setTimeout(() => setStatusBanner(null), 3000);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Erreur upload vidéo');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateNextVersion = async () => {
    if (!activeProject) return;
    const nextNum = (activeProject.versions || []).length + 1;
    const res = await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/versions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: `v${nextNum}`,
          notes: `Itération v${nextNum} créée pour appliquer les feedbacks ouverts.`,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Impossible de créer la version');
      return;
    }
    await onActivateProject(activeProject.id, `v${nextNum}`);
    setStatusBanner(`Nouvelle itération v${nextNum} créée et activée.`);
    setTimeout(() => setStatusBanner(null), 2500);
  };

  const handleRunRender = async (quality: 'draft' | 'final') => {
    if (!activeProject) return;
    if (activeProject.isFlagshipReactStage) {
      setStatusBanner(
        'Le Short principal est déjà compilé en MP4 1080×1920 dans Lecteur Short.'
      );
      setTimeout(() => setStatusBanner(null), 4000);
      return;
    }
    setRenderingJobMsg(`Lancement du rendu ${quality} FFmpeg…`);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${encodeURIComponent(activeProject.id)}/render`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quality, fps: 25 }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rendu impossible');
      const jobId = data.jobId as string;

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const jr = await fetch(`/api/studio/jobs/${encodeURIComponent(jobId)}`);
        const jd = await jr.json();
        if (jd.status === 'completed') {
          setRenderingJobMsg(null);
          setStatusBanner(`Rendu ${jd.version} terminé (${jd.outputMp4})`);
          await onRefreshProject(activeProject.id);
          return;
        }
        if (jd.status === 'failed') {
          throw new Error(jd.error || 'FFmpeg a échoué');
        }
        setRenderingJobMsg(`Rendu ${quality} FFmpeg en cours (${jd.progress || 10}%)…`);
      }
      setRenderingJobMsg(null);
    } catch (err) {
      setRenderingJobMsg(null);
      setErrorBanner(err instanceof Error ? err.message : 'Erreur rendu');
    }
  };

  const handlePrepareSilences = async () => {
    if (!activeProject) return;
    setErrorBanner(null);
    const res = await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/prepare`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Impossible de préparer les silences');
      return;
    }
    await onRefreshProject(activeProject.id);
    setStatusBanner(`Silences retirés : ${data.totalSilencesRemoved || 0}s`);
  };

  const handleTranscribeProject = async () => {
    if (!activeProject) return;
    setErrorBanner(null);
    const res = await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/transcribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'fr' }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Transcription Whisper indisponible');
      return;
    }
    await onRefreshProject(activeProject.id);
    setStatusBanner(`Transcription terminée (${data.wordsCount} mots).`);
  };

  const handleToggleLeftTab = (tab: 'transcript' | 'library') => {
    if (showScriptPanel && leftSidebarTab === tab) {
      setShowScriptPanel(false);
    } else {
      setLeftSidebarTab(tab);
      setShowScriptPanel(true);
    }
  };

  const handleFocusVideoChat = () => {
    setShowScriptPanel(false);
    setShowTimelinePanel(false);
    setShowVideoPanel(true);
    setShowFeedbackPanel(true);
  };

  const handleSaveSnapshot = useCallback((url: string | null) => {
    setPendingSnapshot(url);
    if (url) {
      setShowFeedbackPanel(true);
    }
  }, []);

  if (loading || !activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-xs text-[#5C5F68] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#258EFF]" />
        Chargement de l’atelier de feedback…
      </div>
    );
  }

  const openFeedbacksCount = (activeProject.feedbacks || []).filter((f) => !f.resolved).length;
  const isVideoChatMode =
    !showScriptPanel && !showTimelinePanel && showVideoPanel && showFeedbackPanel;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#F6F5F1] overflow-hidden">
      {/* Clean Studio Sub-Toolbar (Project + Version | Panel Toggles | Tools + Copy Prompt) */}
      <div className="px-3 sm:px-5 py-2 border-b border-[#E3DED3] bg-[#FCFBF8] flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Left: Project & Version Selector */}
        <div className="flex items-center gap-1.5 min-w-0">
          <label htmlFor="studio-project-select" className="sr-only">
            Projet actif
          </label>
          <select
            id="studio-project-select"
            value={activeProject.id}
            onChange={(e) => {
              const target = projects.find((p) => p.id === e.target.value);
              if (target) void handleSelectProject(target);
            }}
            className="max-w-[190px] sm:max-w-[240px] h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white text-xs font-bold text-[#14161B] truncate cursor-pointer focus:outline-none focus:border-[#258EFF]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <label htmlFor="studio-version-select" className="sr-only">
            Version active
          </label>
          <select
            id="studio-version-select"
            value={activeProject.currentVersion}
            onChange={(e) => void handleSelectVersion(e.target.value)}
            className="h-8 px-2 rounded-lg border border-[#E3DED3] bg-[#EAE7DF] font-mono text-[11px] font-bold text-[#14161B] cursor-pointer focus:outline-none focus:border-[#258EFF]"
          >
            {(activeProject.versions || []).map((v) => (
              <option key={v.version} value={v.version}>
                {v.version}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCreateNextVersion}
            title="Créer la version suivante (v2, v3…)"
            aria-label="Créer la version suivante"
            className="h-8 px-2 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#5C5F68] hover:text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <GitBranch className="w-3 h-3" aria-hidden="true" />
            <span className="hidden sm:inline">+ Version</span>
          </button>
        </div>

        {/* Center (Desktop): Collapsible Panel Toggles */}
        <div
          role="group"
          data-testid="panel-toggles-bar"
          aria-label="Panneaux visibles"
          className="hidden lg:inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#EAE7DF]"
        >
          <button
            type="button"
            data-testid="toggle-script-panel"
            onClick={() => handleToggleLeftTab('transcript')}
            aria-pressed={showScriptPanel && leftSidebarTab === 'transcript'}
            title="Afficher ou masquer le script"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showScriptPanel && leftSidebarTab === 'transcript'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
            Script
          </button>

          <button
            type="button"
            data-testid="toggle-projects-panel"
            onClick={() => handleToggleLeftTab('library')}
            aria-pressed={showScriptPanel && leftSidebarTab === 'library'}
            title="Afficher ou masquer la bibliothèque de projets et versions"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showScriptPanel && leftSidebarTab === 'library'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#D97706]" aria-hidden="true" />
            Projets
          </button>

          <button
            type="button"
            data-testid="toggle-video-panel"
            onClick={() => setShowVideoPanel((s) => !s)}
            aria-pressed={showVideoPanel}
            title="Afficher ou masquer l'aperçu vidéo 9:16"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showVideoPanel
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-[#14161B]" aria-hidden="true" />
            Vidéo
          </button>

          <button
            type="button"
            data-testid="toggle-timeline-panel"
            onClick={() => setShowTimelinePanel((s) => !s)}
            aria-pressed={showTimelinePanel}
            title="Afficher ou masquer la timeline multi-pistes"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showTimelinePanel
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#059669]" aria-hidden="true" />
            Timeline
          </button>

          <button
            type="button"
            data-testid="toggle-feedback-panel"
            onClick={() => setShowFeedbackPanel((s) => !s)}
            aria-pressed={showFeedbackPanel}
            title="Afficher ou masquer le chat feedback"
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showFeedbackPanel
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
            Chat ({openFeedbacksCount})
          </button>

          <button
            type="button"
            data-testid="preset-video-chat"
            onClick={handleFocusVideoChat}
            aria-pressed={isVideoChatMode}
            title="Mode épuré : Vidéo 9:16 + Chat Feedback uniquement"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              isVideoChatMode
                ? 'bg-[#14161B] text-white shadow-sm'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
            Vidéo + Chat
          </button>
        </div>

        {/* Right: Advanced Tools Dropdown + Primary CTA */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowNewProject(true)}
            className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
            <span className="hidden sm:inline">Nouveau Short</span>
          </button>

          <div ref={toolsMenuRef} className="relative">
            <button
              type="button"
              data-testid="studio-tools-menu-btn"
              onClick={() => setShowToolsMenu((o) => !o)}
              aria-expanded={showToolsMenu}
              className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5 text-[#5C5F68]" aria-hidden="true" />
              <span>Outils</span>
              <ChevronDown className="w-3 h-3 text-[#5C5F68]" aria-hidden="true" />
            </button>

            {showToolsMenu && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[#E3DED3] bg-[#FCFBF8] shadow-xl py-1.5 z-50 text-xs"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowContactSheet(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F6F5F1] flex items-center gap-2 font-medium text-[#14161B] cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5 text-[#059669]" />
                  Planche QC (12 frames)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setEditorComponentId(null);
                    setShowMotionEditor(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F6F5F1] flex items-center gap-2 font-medium text-[#14161B] cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#258EFF]" />
                  Éditeur Motion (window.setT)
                </button>
                {!activeProject.isFlagshipReactStage && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowToolsMenu(false);
                      void handleRunRender('final');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#F6F5F1] flex items-center gap-2 font-medium text-[#14161B] cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-[#14161B]" />
                    Lancer rendu MP4 FFmpeg
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCopyPrompt(true)}
            className="h-8 px-3 rounded-lg bg-[#258EFF] hover:opacity-90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Copier Prompt IA</span>
            <span className="sm:hidden">Prompt</span>
          </button>

          {onOpenPublish && (
            <button
              type="button"
              onClick={onOpenPublish}
              className="h-8 px-2.5 rounded-lg bg-[#059669] hover:opacity-90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Publier</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Notifications */}
      {(statusBanner || errorBanner || renderingJobMsg) && (
        <div
          className={`px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b shrink-0 ${
            errorBanner
              ? 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
              : 'bg-[#258EFF]/10 border-[#258EFF]/20 text-[#14161B]'
          }`}
        >
          {renderingJobMsg && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF]" />}
          <Sparkles className="w-3.5 h-3.5 text-[#258EFF]" />
          <span>{errorBanner || renderingJobMsg || statusBanner}</span>
        </div>
      )}

      {/* Workspace Body (Desktop: collapsible 3-pane + clickable edge rails, Mobile: bottom switcher) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Collapsed Left Edge Icon Rail (Desktop only) */}
        {!showScriptPanel && (
          <div
            data-testid="collapsed-left-rail"
            className="hidden lg:flex flex-col items-center py-2.5 px-1 gap-2 w-10 border-r border-[#E3DED3] bg-[#FCFBF8] shrink-0"
          >
            <button
              type="button"
              data-testid="rail-open-script"
              onClick={() => {
                setLeftSidebarTab('transcript');
                setShowScriptPanel(true);
              }}
              title="Déplier le Script & Transcript"
              aria-label="Déplier le Script"
              className="w-8 h-8 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] hover:border-[#258EFF] text-[#258EFF] flex items-center justify-center cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="rail-open-projects"
              onClick={() => {
                setLeftSidebarTab('library');
                setShowScriptPanel(true);
              }}
              title="Déplier Projets & Versions"
              aria-label="Déplier Projets et Versions"
              className="w-8 h-8 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] hover:border-[#D97706] text-[#D97706] flex items-center justify-center cursor-pointer transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowScriptPanel(true)}
              title="Déplier le panneau gauche"
              aria-label="Déplier le panneau gauche"
              className="mt-auto w-8 h-8 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] flex items-center justify-center cursor-pointer transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Left Sidebar (Script & Projets) */}
        <div
          className={`${
            mobilePane === 'left' ? 'flex flex-1' : 'hidden'
          } ${showScriptPanel ? 'lg:flex' : 'lg:hidden'} min-h-0 overflow-hidden`}
        >
          <StudioLeftSidebar
            project={activeProject}
            projects={projects}
            sourceVideos={sourceVideos}
            currentTime={currentTime}
            uploadingVideo={uploadingVideo}
            requestedTab={leftSidebarTab}
            onSelectProject={(p) => void handleSelectProject(p)}
            onSelectVersion={(v) => void handleSelectVersion(v)}
            onCreateNextVersion={() => void handleCreateNextVersion()}
            onOpenNewProject={() => setShowNewProject(true)}
            onDeleteProject={(id) => void handleDeleteProject(id)}
            onSelectPlatform={(pl) => void handleSelectPlatform(pl)}
            onImportVideoFile={(f) => void handleImportVideoFile(f)}
            onSeek={handleSeek}
            onToggleCutWord={(wid) => void handleToggleCutWord(wid)}
            onAddCommentAtTime={(time, word) => {
              setIsPlaying(false);
              handleSeek(time);
              setSelectedTargetElement(`Mot « ${word} »`);
              setShowFeedbackPanel(true);
              setMobilePane('right');
            }}
            onTranscribeProject={() => void handleTranscribeProject()}
            onPrepareSilences={() => void handlePrepareSilences()}
            onClosePanel={() => setShowScriptPanel(false)}
          />
        </div>

        {/* Center Stage + Playback + Collapsible Multi-Track Timeline */}
        <div
          className={`${
            mobilePane === 'stage' ? 'flex' : 'hidden lg:flex'
          } flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}
        >
          {showVideoPanel ? (
            <StudioPlayer916
              project={activeProject}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isMuted={isMuted}
              playbackSpeed={playbackSpeed}
              selectedTargetElement={selectedTargetElement}
              drawingResetSignal={drawingResetSignal}
              onSelectTargetElement={(el) => {
                setSelectedTargetElement(el);
                setShowFeedbackPanel(true);
                setMobilePane('right');
              }}
              onSaveSnapshot={handleSaveSnapshot}
              onSyncTimeFromVideo={(t) => {
                timeRef.current = t;
                setCurrentTime(t);
              }}
            />
          ) : (
            <div
              data-testid="video-collapsed-bar"
              className="flex-1 min-h-[120px] bg-[#ECEAE4] flex flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <div className="text-xs font-semibold text-[#5C5F68]">
                Aperçu vidéo 9:16 replié ({activeProject.title} · {activeProject.currentVersion})
              </div>
              <button
                type="button"
                data-testid="expand-video-btn"
                onClick={() => setShowVideoPanel(true)}
                className="px-3.5 py-2 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Afficher l’aperçu 9:16
              </button>
            </div>
          )}

          <StudioPlaybackControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            currentTime={currentTime}
            duration={activeDuration}
            onSeek={handleSeek}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={(sp) => {
              setPlaybackSpeed(sp);
              audioEngine.setSpeed(sp);
            }}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            videoOpen={showVideoPanel}
            onToggleVideo={() => setShowVideoPanel((s) => !s)}
            timelineOpen={showTimelinePanel}
            onToggleTimeline={() => setShowTimelinePanel((s) => !s)}
          />

          {showTimelinePanel && (
            <StudioMultiTrackTimeline
              project={activeProject}
              currentTime={currentTime}
              duration={activeDuration}
              onSeek={handleSeek}
              onSelectFeedback={() => {
                setShowFeedbackPanel(true);
                setMobilePane('right');
              }}
              onOpenMotionEditor={(compId) => {
                setEditorComponentId(compId);
                setShowMotionEditor(true);
              }}
              onClose={() => setShowTimelinePanel(false)}
            />
          )}
        </div>

        {/* Right Sidebar (Chat Feedback) */}
        <div
          className={`${
            mobilePane === 'right' ? 'flex flex-1' : 'hidden'
          } ${showFeedbackPanel ? 'lg:flex' : 'lg:hidden'} min-h-0 overflow-hidden`}
        >
          <StudioRightSidebar
            project={activeProject}
            currentTime={currentTime}
            selectedTargetElement={selectedTargetElement}
            pendingSnapshot={pendingSnapshot}
            onClearTargetElement={() => setSelectedTargetElement(null)}
            onClearSnapshot={() => {
              setPendingSnapshot(null);
              setDrawingResetSignal((s) => s + 1);
            }}
            onSeek={handleSeek}
            onAddFeedback={handleAddFeedback}
            onToggleResolveFeedback={handleToggleResolveFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onClosePanel={() => setShowFeedbackPanel(false)}
          />
        </div>

        {/* Collapsed Right Edge Icon Rail (Desktop only) */}
        {!showFeedbackPanel && (
          <div
            data-testid="collapsed-right-rail"
            className="hidden lg:flex flex-col items-center py-2.5 px-1 gap-2 w-10 border-l border-[#E3DED3] bg-[#FCFBF8] shrink-0"
          >
            <button
              type="button"
              data-testid="rail-open-feedback"
              onClick={() => setShowFeedbackPanel(true)}
              title="Déplier le Chat Feedback"
              aria-label="Déplier le Chat Feedback"
              className="relative w-8 h-8 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] hover:border-[#258EFF] text-[#258EFF] flex items-center justify-center cursor-pointer transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {openFeedbacksCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#258EFF] text-white text-[9px] font-bold flex items-center justify-center">
                  {openFeedbacksCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowFeedbackPanel(true)}
              title="Déplier le panneau droit"
              aria-label="Déplier le panneau droit"
              className="mt-auto w-8 h-8 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] flex items-center justify-center cursor-pointer transition-colors"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Pane Switcher (< lg) */}
      <div className="lg:hidden border-t border-[#E3DED3] bg-[#FCFBF8] px-3 py-1.5 grid grid-cols-3 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePane('left')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
            mobilePane === 'left' ? 'bg-[#14161B] text-white' : 'text-[#5C5F68]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Script
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('stage')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
            mobilePane === 'stage' ? 'bg-[#258EFF] text-white' : 'text-[#5C5F68]'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Aperçu 9:16
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('right')}
          className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
            mobilePane === 'right' ? 'bg-[#14161B] text-white' : 'text-[#5C5F68]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Feedbacks ({(activeProject.feedbacks || []).length})
        </button>
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        sourceVideos={sourceVideos}
        onCreate={handleCreateProject}
      />

      <ContactSheetModal
        isOpen={showContactSheet}
        onClose={() => setShowContactSheet(false)}
        project={activeProject}
        onSeekAndClose={(t) => {
          setShowContactSheet(false);
          handleSeek(t);
        }}
      />

      <MotionEditorModal
        isOpen={showMotionEditor}
        onClose={() => setShowMotionEditor(false)}
        project={activeProject}
        initialComponentId={editorComponentId}
        onSaved={() => void onRefreshProject(activeProject.id)}
      />

      <CopyPromptModal
        isOpen={showCopyPrompt}
        onClose={() => setShowCopyPrompt(false)}
        project={activeProject}
      />
    </div>
  );
};
