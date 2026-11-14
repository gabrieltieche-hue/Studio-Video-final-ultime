import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Film,
  GitBranch,
  Instagram,
  LocateFixed,
  MessageSquarePlus,
  PanelLeftClose,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import {
  formatStudioTimecode,
  type ShortProject,
  type SourceVideo,
} from '../../types/studio';
import {
  findActiveWordIndex,
  groupTranscriptSections,
} from '../../engine/transcriptUtils';

interface StudioLeftSidebarProps {
  project: ShortProject;
  projects: ShortProject[];
  sourceVideos: SourceVideo[];
  currentTime: number;
  uploadingVideo: boolean;
  onSelectProject: (p: ShortProject) => void;
  onSelectVersion: (version: string) => void;
  onCreateNextVersion: () => void;
  onOpenNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onSelectPlatform: (platform: ShortProject['platform']) => void;
  onImportVideoFile: (file: File) => void;
  onSeek: (time: number) => void;
  onToggleCutWord: (wordId: string) => void;
  onAddCommentAtTime: (time: number, quote: string) => void;
  onTranscribeProject: () => void;
  onPrepareSilences: () => void;
  onClosePanel?: () => void;
  requestedTab?: 'transcript' | 'library';
}

export const StudioLeftSidebar: React.FC<StudioLeftSidebarProps> = ({
  project,
  projects,
  sourceVideos,
  currentTime,
  uploadingVideo,
  onSelectProject,
  onSelectVersion,
  onCreateNextVersion,
  onOpenNewProject,
  onDeleteProject,
  onSelectPlatform,
  onImportVideoFile,
  onSeek,
  onToggleCutWord,
  onAddCommentAtTime,
  onTranscribeProject,
  onPrepareSilences,
  onClosePanel,
  requestedTab,
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'library'>(requestedTab || 'transcript');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [libraryOpen, setLibraryOpen] = useState({
    projects: true,
    versions: true,
    platform: false,
    rushs: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeWordRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  const words = project.transcript || [];
  const activeWordIdx = findActiveWordIndex(words, currentTime);
  const activeWordId = activeWordIdx >= 0 ? words[activeWordIdx]?.id : null;
  const query = searchTerm.trim().toLowerCase();

  const sections = useMemo(
    () => groupTranscriptSections(words, project.motionTrack || []),
    [words, project.motionTrack]
  );

  const matchCount = useMemo(() => {
    if (!query) return 0;
    return words.filter((w) => w.word.toLowerCase().includes(query)).length;
  }, [words, query]);

  useEffect(() => {
    if (!autoFollow || !activeWordRef.current) return;
    activeWordRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeWordId, autoFollow]);

  const selectedWord =
    words.find((w) => w.id === selectedWordId) ||
    (activeWordIdx >= 0 ? words[activeWordIdx] : null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportVideoFile(file);
    e.target.value = '';
  };

  return (
    <aside
      aria-label="Script et Projets"
      className="w-full lg:w-[290px] xl:w-[310px] bg-[#FCFBF8] border-r border-[#E3DED3] flex flex-col h-full shrink-0 overflow-hidden"
    >
      {/* Sub-Tabs + Collapse Icon */}
      <div className="p-2 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center gap-1.5 shrink-0">
        <div className="flex-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'transcript'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
            Script ({words.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'library'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#059669]" aria-hidden="true" />
            Projets ({projects.length})
          </button>
        </div>
        {onClosePanel && (
          <button
            type="button"
            onClick={onClosePanel}
            title="Replier le panneau Script / Projets"
            aria-label="Replier le panneau Script"
            className="hidden lg:flex p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] cursor-pointer shrink-0"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeTab === 'library' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Projects List Accordion */}
          <div className="rounded-xl border border-[#E3DED3] bg-white/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setLibraryOpen((s) => ({ ...s, projects: !s.projects }))}
                aria-expanded={libraryOpen.projects}
                className="flex-1 flex items-center gap-1.5 text-left text-[11px] font-bold text-[#14161B] cursor-pointer"
              >
                {libraryOpen.projects ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#5C5F68]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#5C5F68]" />
                )}
                Projets Studio ({projects.length})
              </button>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#258EFF] text-white text-[11px] font-semibold hover:opacity-90 cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" />
                Nouveau
              </button>
            </div>

            {libraryOpen.projects && (
            <div className="space-y-1.5 mt-2">
              {projects.map((p) => {
                const isSelected = p.id === project.id;
                return (
                  <div
                    key={p.id}
                    className={`group p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#258EFF]/8 border-[#258EFF] text-[#14161B]'
                        : 'bg-white border-[#E3DED3] hover:border-[#258EFF]/40 text-[#14161B]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProject(p)}
                      className="min-w-0 flex-1 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          p.mode === 'faceless_explainer'
                            ? 'bg-[#258EFF]/15 text-[#258EFF]'
                            : 'bg-[#059669]/15 text-[#059669]'
                        }`}
                      >
                        {p.mode === 'faceless_explainer' ? 'A' : 'B'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{p.title}</p>
                        <p className="text-[10px] text-[#5C5F68] font-mono tabular-nums">
                          {p.currentVersion} · {(p.versions || []).length} ver. · {p.duration.toFixed(1)}s
                        </p>
                      </div>
                    </button>

                    {!p.isFlagshipReactStage && projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteProject(p.id)}
                        title={`Supprimer ${p.title}`}
                        aria-label={`Supprimer ${p.title}`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-[#DC2626]/10 text-[#DC2626] transition-opacity cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Active Project Versions Accordion */}
          <div className="rounded-xl border border-[#E3DED3] bg-white/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setLibraryOpen((s) => ({ ...s, versions: !s.versions }))}
                aria-expanded={libraryOpen.versions}
                className="flex-1 flex items-center gap-1.5 text-left text-[11px] font-bold text-[#14161B] truncate cursor-pointer"
              >
                {libraryOpen.versions ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#5C5F68] shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#5C5F68] shrink-0" />
                )}
                <span className="truncate">Versions ({(project.versions || []).length})</span>
              </button>
              <button
                type="button"
                onClick={onCreateNextVersion}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[#14161B] text-[11px] font-semibold cursor-pointer shrink-0"
              >
                <GitBranch className="w-3 h-3 text-[#258EFF]" />
                + Version
              </button>
            </div>
            {libraryOpen.versions && (
            <div className="space-y-1.5 mt-2">
              {(project.versions || []).map((ver) => {
                const isCurrent = ver.version === project.currentVersion;
                return (
                  <button
                    key={ver.version}
                    type="button"
                    onClick={() => onSelectVersion(ver.version)}
                    className={`w-full p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#14161B] text-white border-[#14161B]'
                        : 'bg-white text-[#14161B] border-[#E3DED3] hover:border-[#258EFF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold inline-flex items-center gap-1">
                        {isCurrent && <Check className="w-3 h-3 text-[#258EFF]" />}
                        {ver.version}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isCurrent ? 'text-white/75' : 'text-[#5C5F68]'
                        }`}
                      >
                        {ver.outputMp4 ? 'MP4 prêt' : ver.status} · {ver.duration.toFixed(1)}s
                      </span>
                    </div>
                    {ver.notes && (
                      <p
                        className={`text-[10px] mt-0.5 line-clamp-2 ${
                          isCurrent ? 'text-white/80' : 'text-[#5C5F68]'
                        }`}
                      >
                        {ver.notes}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {/* Target Platform Accordion (Collapsed by default) */}
          <div className="rounded-xl border border-[#E3DED3] bg-white/60 p-2.5">
            <button
              type="button"
              onClick={() => setLibraryOpen((s) => ({ ...s, platform: !s.platform }))}
              aria-expanded={libraryOpen.platform}
              className="w-full flex items-center justify-between text-[11px] font-bold text-[#14161B] cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                {libraryOpen.platform ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#5C5F68]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#5C5F68]" />
                )}
                Plateforme cible
              </span>
              <span className="text-[10px] font-mono text-[#5C5F68]">{project.platform}</span>
            </button>
            {libraryOpen.platform && (
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {(
                [
                  { id: 'youtube_shorts', label: 'Shorts', Icon: Youtube },
                  { id: 'instagram', label: 'Reels', Icon: Instagram },
                  { id: 'tiktok', label: 'TikTok', Icon: Sparkles },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectPlatform(id)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-semibold flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    project.platform === id
                      ? 'bg-[#14161B] text-white border-[#14161B]'
                      : 'bg-white text-[#5C5F68] border-[#E3DED3] hover:text-[#14161B]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Source Rushs Accordion (Collapsed by default) */}
          <div className="rounded-xl border border-[#E3DED3] bg-white/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setLibraryOpen((s) => ({ ...s, rushs: !s.rushs }))}
                aria-expanded={libraryOpen.rushs}
                className="flex-1 flex items-center gap-1.5 text-left text-[11px] font-bold text-[#14161B] cursor-pointer"
              >
                {libraryOpen.rushs ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#5C5F68]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#5C5F68]" />
                )}
                Rushs sources ({sourceVideos.length})
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingVideo}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EAE7DF] hover:bg-[#E3DED3] text-[#14161B] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                {uploadingVideo ? 'Envoi…' : 'Importer'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFile}
                className="hidden"
              />
            </div>

            {libraryOpen.rushs && (
            <div className="mt-2">
            {sourceVideos.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-[#E3DED3] bg-[#F6F5F1] text-[11px] text-[#5C5F68] text-center">
                Aucun rush importé. Ajoutez un MP4/MOV/WebM pour créer un Short Split-Screen.
              </div>
            ) : (
              <div className="space-y-1.5">
                {sourceVideos.map((v) => (
                  <div
                    key={v.id}
                    className="p-2 rounded-xl border border-[#E3DED3] bg-white flex items-center gap-2"
                  >
                    {v.thumbnailUrl ? (
                      <img
                        src={v.thumbnailUrl}
                        alt={v.name}
                        className="w-9 h-12 rounded-md object-cover bg-[#EAE7DF] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-12 rounded-md bg-[#EAE7DF] flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4 text-[#5C5F68]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-[#14161B] truncate">{v.name}</p>
                      <p className="text-[10px] font-mono text-[#5C5F68] tabular-nums">
                        {v.duration}s · {v.resolution} · {v.sizeMb} Mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Transcript Search & Auto-follow */}
          <div className="p-2.5 border-b border-[#E3DED3] space-y-2 bg-[#FCFBF8] shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#5C5F68] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Rechercher dans le script"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un mot…"
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#F6F5F1] border border-[#E3DED3] text-xs text-[#14161B] placeholder:text-[#A19F98] focus:outline-none focus:border-[#258EFF]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    aria-label="Effacer la recherche"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5C5F68] hover:text-[#14161B] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const anyOpen = sections.some((s) => !collapsedSections[s.id]);
                  const next: Record<string, boolean> = {};
                  sections.forEach((s) => {
                    next[s.id] = anyOpen;
                  });
                  setCollapsedSections(next);
                }}
                title="Tout replier / tout déplier les séquences"
                aria-label="Tout replier ou déplier les séquences"
                className="p-1.5 rounded-lg border bg-[#F6F5F1] border-[#E3DED3] text-[#5C5F68] hover:text-[#14161B] cursor-pointer shrink-0"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setAutoFollow((f) => !f)}
                aria-pressed={autoFollow}
                title="Suivre automatiquement le mot prononcé"
                aria-label="Suivi automatique du script"
                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors shrink-0 ${
                  autoFollow
                    ? 'bg-[#258EFF]/12 border-[#258EFF]/40 text-[#258EFF]'
                    : 'bg-[#F6F5F1] border-[#E3DED3] text-[#5C5F68]'
                }`}
              >
                <LocateFixed className="w-3.5 h-3.5" />
              </button>
            </div>

            {query && (
              <p className="text-[11px] font-mono text-[#5C5F68]">
                {matchCount} occurrence{matchCount > 1 ? 's' : ''} trouvée{matchCount > 1 ? 's' : ''}
              </p>
            )}

            {!project.isFlagshipReactStage && project.sourceVideoName && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onPrepareSilences}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#F6F5F1] text-[11px] font-semibold text-[#14161B] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Scissors className="w-3 h-3 text-[#059669]" />
                  Couper silences
                </button>
                <button
                  type="button"
                  onClick={onTranscribeProject}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Whisper
                </button>
              </div>
            )}
          </div>

          {/* Flowing Editorial Script grouped cleanly by Sequence/Beat */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
            {sections.length === 0 ? (
              <p className="text-xs text-[#5C5F68] text-center py-8">
                Aucun script disponible pour ce projet.
              </p>
            ) : (
              sections.map((section) => {
                const visibleWords = query
                  ? section.words.filter((w) => w.word.toLowerCase().includes(query))
                  : section.words;
                if (query && visibleWords.length === 0) return null;

                const isCollapsed = Boolean(collapsedSections[section.id]) && !query;
                return (
                  <div key={section.id} className="space-y-1.5 pb-2 border-b border-[#E3DED3]/60 last:border-b-0">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => onSeek(section.start)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#258EFF] hover:underline cursor-pointer tabular-nums text-left truncate"
                      >
                        <span>{formatStudioTimecode(section.start)}</span>
                        <span className="text-[#5C5F68] font-sans font-semibold truncate">· {section.label}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedSections((prev) => ({
                            ...prev,
                            [section.id]: !prev[section.id],
                          }))
                        }
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? `Déplier ${section.label}` : `Replier ${section.label}`}
                        className="p-0.5 rounded hover:bg-[#EAE7DF] text-[#5C5F68] cursor-pointer shrink-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {!isCollapsed && (
                    <div className="text-[13.5px] leading-[1.85] text-[#14161B] flex flex-wrap gap-x-1 gap-y-0.5">
                      {section.words.map((word) => {
                        const isActive = word.id === activeWordId;
                        const isSelected = word.id === selectedWordId;
                        const isMatch = Boolean(query && word.word.toLowerCase().includes(query));

                        return (
                          <button
                            key={word.id}
                            ref={isActive ? activeWordRef : undefined}
                            type="button"
                            onClick={() => {
                              setSelectedWordId(word.id);
                              onSeek(word.start);
                            }}
                            className={`rounded px-1 py-0 transition-colors cursor-pointer ${
                              word.isCut
                                ? 'line-through text-[#DC2626] opacity-60 bg-[#DC2626]/8'
                                : isActive
                                  ? 'bg-[#258EFF] text-white'
                                  : isSelected
                                    ? 'bg-[#258EFF]/15 text-[#14161B] underline decoration-[#258EFF]'
                                    : isMatch
                                      ? 'bg-[#F59E0B]/30 text-[#14161B]'
                                      : 'hover:bg-[#EAE7DF]'
                            }`}
                          >
                            {word.word}
                          </button>
                        );
                      })}
                    </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Contextual Word Action Bar */}
          {selectedWord && (
            <div className="px-3 py-2 border-t border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between gap-2 text-[11px] shrink-0">
              <div className="min-w-0 truncate">
                <span className="font-mono text-[10px] text-[#5C5F68] tabular-nums">
                  {formatStudioTimecode(selectedWord.start)}
                </span>{' '}
                <span className="font-bold text-[#14161B]">« {selectedWord.word} »</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onAddCommentAtTime(selectedWord.start, selectedWord.word)}
                  className="px-2 py-1 rounded-lg bg-[#258EFF] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquarePlus className="w-3 h-3" />
                  Annoter
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCutWord(selectedWord.id)}
                  className={`px-2 py-1 rounded-lg border font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    selectedWord.isCut
                      ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
                      : 'bg-white border-[#E3DED3] text-[#14161B]'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  {selectedWord.isCut ? 'Rétablir' : 'Couper'}
                </button>
                {selectedWordId && (
                  <button
                    type="button"
                    aria-label="Fermer la sélection de mot"
                    onClick={() => setSelectedWordId(null)}
                    className="p-1 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
