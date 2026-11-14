import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Copy,
  FileText,
  Film,
  GitBranch,
  Grid,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Wand2,
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
  ChatGPTModal,
  ContactSheetModal,
  CopyPromptModal,
  MotionEditorModal,
  NewProjectModal,
} from './StudioModals';

export const StudioWorkspace: React.FC = () => {
  const [projects, setProjects] = useState<ShortProject[]>([]);
  const [activeProject, setActiveProject] = useState<ShortProject | null>(null);
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [isMuted, setIsMuted] = useState(false);
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Inspection / annotation context
  const [selectedTargetElement, setSelectedTargetElement] = useState<string | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [renderingJobMsg, setRenderingJobMsg] = useState<string | null>(null);

  // Modals & Responsive mobile tab
  const [mobilePane, setMobilePane] = useState<'left' | 'stage' | 'right'>('stage');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [showMotionEditor, setShowMotionEditor] = useState(false);
  const [editorComponentId, setEditorComponentId] = useState<string | null>(null);
  const [showCopyPrompt, setShowCopyPrompt] = useState(false);
  const [showChatGPT, setShowChatGPT] = useState(false);

  const loadWorkspaceData = useCallback(async (preferId?: string) => {
    try {
      const [projRes, vidRes] = await Promise.all([
        fetch('/api/studio/projects'),
        fetch('/api/studio/videos'),
      ]);
      const projData = (await projRes.json()) as { projects?: ShortProject[] };
      const vidData = (await vidRes.json()) as { videos?: SourceVideo[] };

      const list = projData.projects || [];
      setProjects(list);
      setSourceVideos(vidData.videos || []);

      const targetId =
        preferId ||
        new URLSearchParams(window.location.search).get('project') ||
        'proj-interdiction-15-ans';
      const chosen =
        list.find((p) => p.id === targetId || p.slug === targetId) || list[0] || null;
      setActiveProject(chosen);
    } catch {
      setErrorBanner('Impossible de charger les projets du Studio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    audioEngine.setOptions({
      musicEnabled: !isMuted,
      sfxEnabled: !isMuted,
      voiceEnabled: !isMuted,
    });
  }, [isMuted]);

  const activeDuration = activeProject?.duration || SHORT_DURATION;
  const isReactFlagship = Boolean(activeProject?.isFlagshipReactStage);

  // Playback engine
  useEffect(() => {
    if (!isPlaying || !activeProject) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (isReactFlagship) audioEngine.stop();
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (isReactFlagship) {
        await audioEngine.start(timeRef.current, playbackSpeed);
      }
      if (cancelled) return;

      let prevNow = performance.now();
      const frame = (now: number) => {
        if (cancelled) return;
        const prevT = timeRef.current;
        const dt = Math.min(0.1, (now - prevNow) / 1000) * playbackSpeed;
        prevNow = now;
        const synced = isReactFlagship ? audioEngine.getSyncedTime(playbackSpeed) : null;
        let nextT = synced !== null ? synced : prevT + dt;
        if (nextT >= activeDuration) {
          nextT = 0;
          if (isReactFlagship) audioEngine.seekWhilePlaying(0, playbackSpeed);
        }
        if (isReactFlagship) audioEngine.tick(prevT, nextT);
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
      if (isReactFlagship) audioEngine.stop();
    };
  }, [isPlaying, activeProject, isReactFlagship, playbackSpeed, activeDuration]);

  const handleSeek = useCallback(
    (nextT: number) => {
      const clamped = clamp(nextT, 0, activeDuration);
      timeRef.current = clamped;
      setCurrentTime(clamped);
      if (isReactFlagship) {
        if (isPlaying) audioEngine.seekWhilePlaying(clamped, playbackSpeed);
        else audioEngine.resetTriggersBefore(clamped);
      }
    },
    [activeDuration, isReactFlagship, isPlaying, playbackSpeed]
  );

  const handleSelectProject = (p: ShortProject) => {
    setIsPlaying(false);
    setCurrentTime(0);
    timeRef.current = 0;
    setActiveProject(p);
    setSelectedTargetElement(null);
    setPendingSnapshot(null);
  };

  const refreshProject = async (id: string) => {
    const res = await fetch(`/api/studio/projects/${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { project: ShortProject };
    setActiveProject(data.project);
    setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
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
    await refreshProject(activeProject.id);
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
    await refreshProject(activeProject.id);
  };

  const handleDeleteFeedback = async (fId: string) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/feedbacks/${encodeURIComponent(fId)}`,
      { method: 'DELETE' }
    );
    await refreshProject(activeProject.id);
  };

  const handleToggleCutWord = async (wordId: string) => {
    if (!activeProject) return;
    await fetch(
      `/api/studio/projects/${encodeURIComponent(activeProject.id)}/words/${encodeURIComponent(wordId)}/cut`,
      { method: 'PATCH' }
    );
    await refreshProject(activeProject.id);
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
    await loadWorkspaceData(data.projectId);
  };

  const handleDeleteProject = async (id: string) => {
    await fetch(`/api/studio/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadWorkspaceData();
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
    await refreshProject(activeProject.id);
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
      await loadWorkspaceData(activeProject?.id);
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
    await refreshProject(activeProject.id);
    setStatusBanner(`Nouvelle itération v${nextNum} créée.`);
    setTimeout(() => setStatusBanner(null), 2500);
  };

  const handleRunRender = async (quality: 'draft' | 'final') => {
    if (!activeProject) return;
    if (activeProject.isFlagshipReactStage) {
      setStatusBanner(
        'Le Short principal est déjà compilé en MP4 1080×1920 dans Lecteur Short (téléchargement instantané).'
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
          await refreshProject(activeProject.id);
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
    await refreshProject(activeProject.id);
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
    await refreshProject(activeProject.id);
    setStatusBanner(`Transcription terminée (${data.wordsCount} mots).`);
  };

  if (loading || !activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-xs text-[#5C5F68] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#258EFF]" />
        Chargement de l’atelier de feedback…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#F6F5F1] overflow-hidden">
      {/* Studio Sub-Toolbar */}
      <div className="px-3 sm:px-5 py-2 border-b border-[#E3DED3] bg-[#FCFBF8] flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#059669] shrink-0" />
          <h1
            className="text-sm sm:text-base font-extrabold text-[#14161B] truncate"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            {activeProject.title}
          </h1>
          <span className="px-2 py-0.5 rounded-md bg-[#EAE7DF] font-mono text-[11px] font-bold text-[#14161B]">
            {activeProject.currentVersion}
          </span>
          <button
            type="button"
            onClick={handleCreateNextVersion}
            title="Créer l'itération suivante (v2, v3…)"
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#5C5F68] hover:text-[#14161B] cursor-pointer"
          >
            <GitBranch className="w-3 h-3" />
            + Version
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowNewProject(true)}
            className="px-2.5 py-1.5 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#258EFF]" />
            <span className="hidden md:inline">Nouveau Short</span>
          </button>

          <button
            type="button"
            onClick={() => setShowContactSheet(true)}
            className="px-2.5 py-1.5 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5 text-[#059669]" />
            Planche QC
          </button>

          <button
            type="button"
            onClick={() => {
              setEditorComponentId(null);
              setShowMotionEditor(true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#258EFF]" />
            <span className="hidden sm:inline">Motion</span>
          </button>

          {!activeProject.isFlagshipReactStage && (
            <button
              type="button"
              onClick={() => handleRunRender('final')}
              className="px-2.5 py-1.5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              Rendu MP4
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowChatGPT(true)}
            className="px-2.5 py-1.5 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-[#5C5F68]" />
            MCP
          </button>

          <button
            type="button"
            onClick={() => setShowCopyPrompt(true)}
            className="px-3 py-1.5 rounded-xl bg-[#258EFF] hover:opacity-90 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Copier Prompt IA
          </button>
        </div>
      </div>

      {/* Inline Notifications */}
      {(statusBanner || errorBanner || renderingJobMsg) && (
        <div
          className={`px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b ${
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

      {/* 3-Pane Studio Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={`${
            mobilePane === 'left' ? 'flex flex-1' : 'hidden lg:flex'
          } min-h-0 overflow-hidden`}
        >
          <StudioLeftSidebar
            project={activeProject}
            projects={projects}
            sourceVideos={sourceVideos}
            currentTime={currentTime}
            uploadingVideo={uploadingVideo}
            onSelectProject={handleSelectProject}
            onOpenNewProject={() => setShowNewProject(true)}
            onDeleteProject={handleDeleteProject}
            onSelectPlatform={handleSelectPlatform}
            onImportVideoFile={handleImportVideoFile}
            onSeek={handleSeek}
            onToggleCutWord={handleToggleCutWord}
            onAddCommentAtTime={(time, word) => {
              setIsPlaying(false);
              handleSeek(time);
              setSelectedTargetElement(`Mot « ${word} »`);
              setMobilePane('right');
            }}
            onTranscribeProject={handleTranscribeProject}
            onPrepareSilences={handlePrepareSilences}
          />
        </div>

        {/* Center Stage + Playback + Multi-Track Timeline */}
        <div
          className={`${
            mobilePane === 'stage' ? 'flex' : 'hidden lg:flex'
          } flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}
        >
          <StudioPlayer916
            project={activeProject}
            currentTime={currentTime}
            isPlaying={isPlaying}
            isMuted={isMuted}
            playbackSpeed={playbackSpeed}
            selectedTargetElement={selectedTargetElement}
            onSelectTargetElement={(el) => {
              setSelectedTargetElement(el);
              setMobilePane('right');
            }}
            onSaveSnapshot={(url) => {
              setPendingSnapshot(url);
              setMobilePane('right');
            }}
            onSyncTimeFromVideo={(t) => {
              timeRef.current = t;
              setCurrentTime(t);
            }}
          />

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
          />

          <StudioMultiTrackTimeline
            project={activeProject}
            currentTime={currentTime}
            duration={activeDuration}
            onSeek={handleSeek}
            onSelectFeedback={() => setMobilePane('right')}
            onOpenMotionEditor={(compId) => {
              setEditorComponentId(compId);
              setShowMotionEditor(true);
            }}
          />
        </div>

        {/* Right Sidebar (Feedbacks) */}
        <div
          className={`${
            mobilePane === 'right' ? 'flex flex-1' : 'hidden lg:flex'
          } min-h-0 overflow-hidden`}
        >
          <StudioRightSidebar
            project={activeProject}
            currentTime={currentTime}
            selectedTargetElement={selectedTargetElement}
            pendingSnapshot={pendingSnapshot}
            onClearTargetElement={() => setSelectedTargetElement(null)}
            onClearSnapshot={() => setPendingSnapshot(null)}
            onSeek={handleSeek}
            onAddFeedback={handleAddFeedback}
            onToggleResolveFeedback={handleToggleResolveFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onCopyPrompt={() => setShowCopyPrompt(true)}
            onOpenChatGPT={() => setShowChatGPT(true)}
          />
        </div>
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
        onSaved={() => void refreshProject(activeProject.id)}
      />

      <CopyPromptModal
        isOpen={showCopyPrompt}
        onClose={() => setShowCopyPrompt(false)}
        project={activeProject}
      />

      <ChatGPTModal
        isOpen={showChatGPT}
        onClose={() => setShowChatGPT(false)}
        projectId={activeProject.id}
      />
    </div>
  );
};
