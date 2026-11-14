import React, { useMemo, useRef, useState } from 'react';
import {
  FileText,
  Film,
  Instagram,
  MessageSquarePlus,
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
  type WhisperWord,
} from '../../types/studio';

interface StudioLeftSidebarProps {
  project: ShortProject;
  projects: ShortProject[];
  sourceVideos: SourceVideo[];
  currentTime: number;
  uploadingVideo: boolean;
  onSelectProject: (p: ShortProject) => void;
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
}

interface TranscriptSection {
  id: string;
  label: string;
  start: number;
  words: WhisperWord[];
}

export const StudioLeftSidebar: React.FC<StudioLeftSidebarProps> = ({
  project,
  projects,
  sourceVideos,
  currentTime,
  uploadingVideo,
  onSelectProject,
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
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'library'>('transcript');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const words = project.transcript || [];
  const activeWordIdx = words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);

  const query = searchTerm.trim().toLowerCase();

  // Group words into flowing editorial paragraphs by Beat / Track segment (or ~24-word paragraphs)
  const sections: TranscriptSection[] = useMemo(() => {
    if (words.length === 0) return [];
    const beats = [...(project.motionTrack || [])].sort((a, b) => a.start - b.start);

    if (beats.length > 0) {
      const grouped: TranscriptSection[] = beats.map((b, idx) => ({
        id: b.id,
        label: b.name || `Séquence ${idx + 1}`,
        start: b.start,
        words: [],
      }));
      words.forEach((w) => {
        const matchIdx = beats.findIndex((b) => w.start >= b.start && w.start < b.end);
        const targetIdx =
          matchIdx >= 0
            ? matchIdx
            : beats.reduce((best, b, i) => (w.start >= b.start ? i : best), 0);
        grouped[targetIdx]?.words.push(w);
      });
      return grouped.filter((g) => g.words.length > 0);
    }

    const out: TranscriptSection[] = [];
    for (let i = 0; i < words.length; i += 24) {
      const slice = words.slice(i, i + 24);
      out.push({
        id: `sec-${i}`,
        label: `Passage ${out.length + 1}`,
        start: slice[0].start,
        words: slice,
      });
    }
    return out;
  }, [words, project.motionTrack]);

  const selectedWord =
    words.find((w) => w.id === selectedWordId) ||
    (activeWordIdx >= 0 ? words[activeWordIdx] : null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportVideoFile(file);
    e.target.value = '';
  };

  return (
    <aside className="w-full lg:w-[290px] xl:w-[310px] bg-[#FCFBF8] border-r border-[#E3DED3] flex flex-col h-full shrink-0 overflow-hidden">
      {/* Sub-Tabs + Collapse Icon */}
      <div className="p-2 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#258EFF]" />
            Script ({words.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#059669]" />
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
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeTab === 'library' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Projects List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5F68]">
                Projets Studio
              </h2>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#258EFF] text-white text-[11px] font-semibold hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Nouveau
              </button>
            </div>

            <div className="space-y-1.5">
              {projects.map((p) => {
                const isSelected = p.id === project.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className={`group p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#258EFF]/8 border-[#258EFF] text-[#14161B]'
                        : 'bg-white border-[#E3DED3] hover:border-[#258EFF]/40 text-[#14161B]'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
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
                        <p className="text-[10px] text-[#5C5F68] font-mono">
                          {p.currentVersion} ({(p.versions || []).length} ver.) · {p.duration.toFixed(1)}s
                        </p>
                      </div>
                    </div>

                    {!p.isFlagshipReactStage && projects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(p.id);
                        }}
                        title="Supprimer le projet"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#DC2626]/10 text-[#DC2626] transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target Platform */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5F68] mb-2">
              Plateforme Cible
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
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
          </div>

          {/* Source Rushs Upload & Inventory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5F68]">
                Rushs sources ({sourceVideos.length})
              </h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingVideo}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EAE7DF] hover:bg-[#E3DED3] text-[#14161B] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                {uploadingVideo ? 'Envoi…' : 'Importer MP4'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFile}
                className="hidden"
              />
            </div>

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
                      <p className="text-[10px] font-mono text-[#5C5F68]">
                        {v.duration}s · {v.resolution} · {v.sizeMb} Mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Transcript Search & Audio Prep */}
          <div className="p-2.5 border-b border-[#E3DED3] space-y-2 bg-[#FCFBF8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5C5F68] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans le script…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F6F5F1] border border-[#E3DED3] text-xs text-[#14161B] placeholder:text-[#A19F98] focus:outline-none focus:border-[#258EFF]"
              />
            </div>

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

          {/* Flowing Editorial Script grouped cleanly by Sequence/Beat (zero per-word tiles) */}
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

                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => onSeek(section.start)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#258EFF] hover:underline cursor-pointer"
                    >
                      <span>{formatStudioTimecode(section.start)}</span>
                      <span className="text-[#5C5F68]">· {section.label}</span>
                    </button>

                    <p className="text-[13px] leading-[1.85] text-[#14161B] font-normal">
                      {section.words.map((word) => {
                        const globalIdx = words.findIndex((w) => w.id === word.id);
                        const isActive = globalIdx === activeWordIdx;
                        const isSelected = word.id === selectedWordId;
                        const isMatch = query && word.word.toLowerCase().includes(query);

                        return (
                          <React.Fragment key={word.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWordId(word.id);
                                onSeek(word.start);
                              }}
                              className={`inline text-left rounded px-0.5 py-0 transition-colors cursor-pointer ${
                                word.isCut
                                  ? 'line-through text-[#DC2626] opacity-60 bg-[#DC2626]/8'
                                  : isActive
                                    ? 'bg-[#258EFF] text-white font-semibold'
                                    : isSelected
                                      ? 'bg-[#258EFF]/15 text-[#14161B] font-semibold underline decoration-[#258EFF]'
                                      : isMatch
                                        ? 'bg-[#F59E0B]/25 text-[#14161B] font-semibold'
                                        : 'hover:bg-[#EAE7DF]'
                              }`}
                            >
                              {word.word}
                            </button>{' '}
                          </React.Fragment>
                        );
                      })}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Contextual Word Action Bar (keeps text clean while giving instant Annotate & Cut) */}
          {selectedWord && (
            <div className="px-3 py-2 border-t border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between gap-2 text-[11px] shrink-0">
              <div className="min-w-0 truncate">
                <span className="font-mono text-[10px] text-[#5C5F68]">
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
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
