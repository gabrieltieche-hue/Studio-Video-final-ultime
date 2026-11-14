import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, X } from 'lucide-react';
import type { ScheduledPostItem } from '../../types/social';
import { PLATFORM_META } from '../../engine/socialCopy';

interface ManualKitModalProps {
  job: ScheduledPostItem | null;
  onClose: () => void;
  onConfirmPublished: (jobId: string, publishedUrl: string) => Promise<void>;
}

export const ManualKitModal: React.FC<ManualKitModalProps> = ({
  job,
  onClose,
  onConfirmPublished,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!job) return null;

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmPublished(job.id, publishedUrl.trim());
      setPublishedUrl('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const mainText =
    job.platform === 'tiktok' ? job.tiktokCaption || job.caption : job.caption;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Kit de publication manuel pour ${PLATFORM_META[job.platform].name}`}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E3DED3]">
          <div>
            <p className="text-xs font-mono font-semibold text-[#258EFF]">
              KIT PRÊT À POSTER · {PLATFORM_META[job.platform].name.toUpperCase()}
            </p>
            <h3
              className="text-lg font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {job.projectTitle} ({job.version})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le kit de publication"
            className="p-1.5 rounded-lg hover:bg-[#EAE7DF] text-[#5C5F68] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Assets */}
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 items-center">
          <div className="w-[100px] sm:w-[120px] aspect-[9/16] rounded-xl overflow-hidden border border-[#E3DED3] bg-[#EAE7DF] mx-auto">
            {job.coverUrl ? (
              <img
                src={job.coverUrl}
                alt={`Cover ${job.projectTitle}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          <div className="space-y-2.5">
            <p className="text-xs text-[#5C5F68] leading-relaxed">
              {job.notes ||
                'Le MP4 optimisé et la couverture JPG ont été préparés automatiquement sur le serveur.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {job.socialMp4Url && (
                <a
                  href={job.socialMp4Url}
                  download={`${job.projectSlug}-${job.version}-social.mp4`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Télécharger MP4 social
                </a>
              )}
              {job.coverUrl && (
                <a
                  href={job.coverUrl}
                  download={`${job.projectSlug}-${job.version}-cover.jpg`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[#14161B] text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Cover JPG
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Copyable Texts */}
        <div className="space-y-3">
          {job.platform === 'youtube' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#14161B]">
                <span>Titre YouTube Shorts</span>
                <button
                  type="button"
                  onClick={() => void copyText('yt-title', job.youtubeTitle)}
                  className="inline-flex items-center gap-1 text-[#258EFF] cursor-pointer"
                >
                  {copiedKey === 'yt-title' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B]">
                {job.youtubeTitle}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#14161B]">
              <span>
                {job.platform === 'youtube' ? 'Description YouTube' : 'Légende prête à coller'}
              </span>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    'caption',
                    job.platform === 'youtube' ? job.youtubeDescription : mainText
                  )
                }
                className="inline-flex items-center gap-1 text-[#258EFF] cursor-pointer"
              >
                {copiedKey === 'caption' ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copier
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B] whitespace-pre-wrap font-sans leading-relaxed">
              {job.platform === 'youtube' ? job.youtubeDescription : mainText}
            </pre>
          </div>
        </div>

        {/* Confirm Publication Form */}
        <form
          onSubmit={handleConfirm}
          className="pt-3 border-t border-[#E3DED3] space-y-2.5"
        >
          <label
            htmlFor="manual-published-url"
            className="block text-xs font-bold text-[#14161B]"
          >
            Marquer comme publié (lien public optionnel)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="manual-published-url"
              type="url"
              value={publishedUrl}
              onChange={(e) => setPublishedUrl(e.target.value)}
              placeholder="https://youtube.com/shorts/... ou https://instagram.com/reel/..."
              className="flex-1 h-10 px-3 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 rounded-xl bg-[#059669] hover:opacity-90 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              {submitting ? 'Validation…' : 'Confirmer publication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
