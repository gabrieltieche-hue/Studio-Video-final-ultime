import React, { useRef, useState } from 'react';
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
  Youtube,
} from 'lucide-react';
import type { ShortProject, SourceVideo } from '../../types/studio';

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
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'library'>('transcript');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeWordIdx = (project.transcript || []).findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  const filteredWords = (project.transcript || []).filter((w) =>
    !searchTerm.trim() ? true : w.word.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportVideoFile(file);
    e.target.value = '';
  };

  return (
    <aside className="w-full lg:w-[320px] bg-[#FCFBF8] border-r border-[#E3DED3] flex flex-col h-full shrink-0 overflow-hidden">
      {/* Sub-Tabs: Transcription | Projets & Médias */}
      <div className="p-2 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'transcript'
              ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
              : 'text-[#5C5F68] hover:text-[#14161B]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#258EFF]" />
          Script ({(project.transcript || []).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'library'
              ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm border border-[#E3DED3]'
              : 'text-[#5C5F68] hover:text-[#14161B]'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-[#059669]" />
          Projets ({projects.length})
        </button>
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
                          {p.currentVersion} · {p.duration.toFixed(1)}s · {(p.feedbacks || []).length} retours
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
          {/* Transcript Toolbar */}
          <div className="p-2.5 border-b border-[#E3DED3] space-y-2 bg-[#FCFBF8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5C5F68] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un mot du script…"
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

          {/* Interactive Word Chips */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredWords.length === 0 ? (
              <p className="text-xs text-[#5C5F68] text-center py-8">
                Aucun mot disponible pour ce projet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 leading-relaxed">
                {filteredWords.map((word) => {
                  const idx = (project.transcript || []).findIndex((w) => w.id === word.id);
                  const isActive = idx === activeWordIdx;
                  return (
                    <span
                      key={word.id}
                      className={`group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-all border ${
                        word.isCut
                          ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626] line-through opacity-65'
                          : isActive
                            ? 'bg-[#258EFF] border-[#258EFF] text-white font-bold shadow-sm'
                            : 'bg-white border-[#E3DED3] text-[#14161B] hover:border-[#258EFF]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSeek(word.start)}
                        title={`Aller à ${word.start.toFixed(2)}s`}
                        className="cursor-pointer"
                      >
                        {word.word}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddCommentAtTime(word.start, word.word)}
                        title="Annoter ce mot"
                        className="opacity-0 group-hover:opacity-100 text-[10px] hover:scale-110 transition-opacity cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleCutWord(word.id)}
                        title={word.isCut ? 'Rétablir ce mot' : 'Couper ce mot au montage'}
                        className="opacity-0 group-hover:opacity-100 text-[10px] hover:scale-110 transition-opacity cursor-pointer"
                      >
                        <Scissors className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
