import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Image as ImageIcon,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Scissors,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { FeedbackItem, ShortProject } from '../../types/studio';
import { formatStudioTimecode } from '../../types/studio';

interface StudioRightSidebarProps {
  project: ShortProject;
  currentTime: number;
  selectedTargetElement: string | null;
  pendingSnapshot: string | null;
  onClearTargetElement: () => void;
  onClearSnapshot: () => void;
  onSeek: (time: number) => void;
  onAddFeedback: (text: string, type: 'comment' | 'cut' | 'idea') => void;
  onToggleResolveFeedback: (feedbackId: string, nextResolved: boolean) => void;
  onDeleteFeedback: (feedbackId: string) => void;
  onCopyPrompt: () => void;
  onOpenChatGPT: () => void;
}

export const StudioRightSidebar: React.FC<StudioRightSidebarProps> = ({
  project,
  currentTime,
  selectedTargetElement,
  pendingSnapshot,
  onClearTargetElement,
  onClearSnapshot,
  onSeek,
  onAddFeedback,
  onToggleResolveFeedback,
  onDeleteFeedback,
  onCopyPrompt,
  onOpenChatGPT,
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [inputType, setInputType] = useState<'comment' | 'cut' | 'idea'>('comment');
  const [text, setText] = useState('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const feedbacks = project.feedbacks || [];
  const openCount = feedbacks.filter((f) => !f.resolved).length;
  const resolvedCount = feedbacks.filter((f) => f.resolved).length;

  const filtered = feedbacks.filter((f) => {
    if (filter === 'open') return !f.resolved;
    if (filter === 'resolved') return f.resolved;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddFeedback(text.trim(), inputType);
    setText('');
  };

  return (
    <aside className="w-full lg:w-[330px] bg-[#FCFBF8] border-l border-[#E3DED3] flex flex-col h-full shrink-0 overflow-hidden">
      {/* Header & Filter Tabs */}
      <div className="px-3.5 py-2.5 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-[#14161B]">Feedbacks</span>
          {openCount > 0 && <span className="w-2 h-2 rounded-full bg-[#258EFF]" />}
        </div>

        <div className="inline-flex items-center gap-0.5 bg-[#EAE7DF] p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filter === 'all' ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm' : 'text-[#5C5F68]'
            }`}
          >
            Tous {feedbacks.length}
          </button>
          <button
            type="button"
            onClick={() => setFilter('open')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filter === 'open' ? 'bg-[#FCFBF8] text-[#258EFF] shadow-sm' : 'text-[#5C5F68]'
            }`}
          >
            Ouverts {openCount}
          </button>
          <button
            type="button"
            onClick={() => setFilter('resolved')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
              filter === 'resolved' ? 'bg-[#FCFBF8] text-[#059669] shadow-sm' : 'text-[#5C5F68]'
            }`}
          >
            Résolus {resolvedCount}
          </button>
        </div>
      </div>

      {/* Prompt Agent Action Banner */}
      <div className="px-3 py-2 border-b border-[#E3DED3] bg-[#FCFBF8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[#258EFF] shrink-0" />
          <span className="text-[11px] font-medium text-[#5C5F68] truncate">
            {openCount} retour{openCount > 1 ? 's' : ''} à appliquer
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onCopyPrompt}
            className="px-2 py-1 rounded-lg bg-[#258EFF]/12 hover:bg-[#258EFF]/20 text-[#258EFF] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Copy className="w-3 h-3" />
            Prompt IA
          </button>
          <button
            type="button"
            onClick={onOpenChatGPT}
            className="px-2 py-1 rounded-lg bg-[#EAE7DF] hover:bg-[#E3DED3] text-[#14161B] text-[10px] font-bold cursor-pointer transition-colors"
          >
            MCP
          </button>
        </div>
      </div>

      {/* Feedback Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#F6F5F1]/60">
        {filtered.length === 0 ? (
          <div className="p-5 rounded-2xl border border-dashed border-[#E3DED3] bg-[#FCFBF8] text-center space-y-1.5">
            <MessageSquare className="w-6 h-6 text-[#258EFF] mx-auto opacity-80" />
            <p className="text-xs font-bold text-[#14161B]">Aucun retour affiché</p>
            <p className="text-[11px] text-[#5C5F68] leading-relaxed">
              Mettez la vidéo en pause, inspectez ou dessinez sur l’aperçu 9:16, puis ajoutez un retour ci-dessous.
            </p>
          </div>
        ) : (
          filtered.map((fb: FeedbackItem) => (
            <article
              key={fb.id}
              onClick={() => onSeek(fb.timestamp)}
              className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                fb.resolved
                  ? 'bg-[#FCFBF8]/60 border-[#E3DED3] opacity-70'
                  : 'bg-[#FCFBF8] border-[#E3DED3] hover:border-[#258EFF] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#14161B] text-white font-mono text-[10px] font-bold">
                    <Clock className="w-2.5 h-2.5" />
                    {fb.timeFormatted}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      fb.type === 'cut'
                        ? 'bg-[#DC2626]/12 text-[#DC2626]'
                        : fb.type === 'idea'
                          ? 'bg-[#D97706]/12 text-[#D97706]'
                          : 'bg-[#258EFF]/12 text-[#258EFF]'
                    }`}
                  >
                    {fb.type === 'cut' ? 'Coupe' : fb.type === 'idea' ? 'Idée' : 'Note'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleResolveFeedback(fb.id, !fb.resolved);
                    }}
                    title={fb.resolved ? 'Rouvrir ce retour' : 'Marquer comme résolu'}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      fb.resolved
                        ? 'bg-[#059669]/15 text-[#059669]'
                        : 'hover:bg-[#EAE7DF] text-[#5C5F68]'
                    }`}
                  >
                    {fb.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFeedback(fb.id);
                    }}
                    title="Supprimer ce retour"
                    className="p-1 rounded-md hover:bg-[#DC2626]/12 text-[#5C5F68] hover:text-[#DC2626] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {fb.targetElement && (
                <p className="text-[10px] font-mono text-[#258EFF] mb-1 truncate">
                  Cible : {fb.targetElement}
                </p>
              )}

              {fb.quoteText && (
                <p className="text-[11px] italic text-[#5C5F68] mb-1 border-l-2 border-[#E3DED3] pl-2">
                  « {fb.quoteText} »
                </p>
              )}

              <p
                className={`text-xs text-[#14161B] leading-snug ${
                  fb.resolved ? 'line-through text-[#5C5F68]' : ''
                }`}
              >
                {fb.text}
              </p>

              {fb.drawingSnapshot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImg(fb.drawingSnapshot || null);
                  }}
                  className="mt-2 w-full rounded-lg overflow-hidden border border-[#E3DED3] bg-[#F1EEE6] block cursor-pointer"
                >
                  <img
                    src={fb.drawingSnapshot}
                    alt="Annotation visuelle"
                    className="w-full max-h-28 object-contain"
                  />
                </button>
              )}
            </article>
          ))
        )}
      </div>

      {/* Add Feedback Composer */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#E3DED3] bg-[#FCFBF8] space-y-2">
        {(selectedTargetElement || pendingSnapshot) && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTargetElement && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#258EFF]/12 text-[#258EFF] text-[10px] font-mono">
                {selectedTargetElement}
                <button
                  type="button"
                  onClick={onClearTargetElement}
                  className="hover:text-[#14161B] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {pendingSnapshot && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#059669]/12 text-[#059669] text-[10px] font-semibold">
                <ImageIcon className="w-3 h-3" />
                Croquis joint
                <button
                  type="button"
                  onClick={onClearSnapshot}
                  className="hover:text-[#14161B] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="inline-flex items-center gap-1 bg-[#EAE7DF] p-0.5 rounded-lg">
            {(
              [
                { id: 'comment', label: 'Commentaire', Icon: MessageSquare },
                { id: 'cut', label: 'Coupe', Icon: Scissors },
                { id: 'idea', label: 'Idée', Icon: Lightbulb },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setInputType(id)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                  inputType === id ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm' : 'text-[#5C5F68]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono font-bold text-[#258EFF]">
            [{formatStudioTimecode(currentTime)}]
          </span>
        </div>

        <div className="flex gap-1.5">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Décrivez la modification à ce timecode…"
            className="flex-1 resize-none rounded-xl border border-[#E3DED3] bg-[#F6F5F1] px-2.5 py-2 text-xs text-[#14161B] placeholder:text-[#A19F98] focus:outline-none focus:border-[#258EFF]"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Envoyer le feedback"
            className="px-3 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Drawing Snapshot Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-[#14161B]/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-3 max-w-md w-full shadow-2xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#14161B]">Annotation visuelle</span>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={lightboxImg} alt="Annotation zoomée" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </aside>
  );
};
