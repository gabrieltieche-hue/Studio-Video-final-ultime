import React, { useEffect, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Grid,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Terminal,
  Wand2,
  X,
} from 'lucide-react';
import type { ShortProject, SourceVideo } from '../../types/studio';
import { buildFeedbackPromptMarkdown } from '../../types/studio';

/* ===================================================================== */
/* 1. NEW PROJECT MODAL                                                  */
/* ===================================================================== */
interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVideos: SourceVideo[];
  onCreate: (payload: {
    title: string;
    slug: string;
    mode: ShortProject['mode'];
    platform: ShortProject['platform'];
    source_video?: string;
    duration?: number;
  }) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  sourceVideos,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ShortProject['mode']>('faceless_explainer');
  const [platform, setPlatform] = useState<ShortProject['platform']>('youtube_shorts');
  const [sourceVideo, setSourceVideo] = useState('');
  const [duration, setDuration] = useState('45');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const computedSlug =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 44) || `short-${Date.now().toString().slice(-4)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Entrez un titre pour votre Short.');
      return;
    }
    if (mode === 'split_screen_clips' && !sourceVideo) {
      setError('Le mode Split-Screen requiert un rush vidéo réel importé.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        slug: computedSlug,
        mode,
        platform,
        ...(sourceVideo ? { source_video: sourceVideo } : {}),
        duration: Number(duration) || 45,
      });
      setTitle('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création projet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#E3DED3] flex items-center justify-between bg-[#F6F5F1]">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#258EFF]" />
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Nouveau Projet Short
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#14161B] mb-1">Titre du Short</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Pourquoi les agents IA remplacent le SaaS"
              className="w-full px-3 py-2 rounded-xl border border-[#E3DED3] bg-white text-[#14161B] focus:outline-none focus:border-[#258EFF]"
            />
            <p className="mt-1 text-[10px] font-mono text-[#5C5F68]">Slug : {computedSlug}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode('faceless_explainer')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                mode === 'faceless_explainer'
                  ? 'border-[#258EFF] bg-[#258EFF]/8'
                  : 'border-[#E3DED3] bg-white'
              }`}
            >
              <p className="font-bold text-[#14161B]">Mode A · Motion Paper</p>
              <p className="text-[11px] text-[#5C5F68] mt-0.5">
                Visuels animés + voix ElevenLabs + Bright Groove.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('split_screen_clips')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                mode === 'split_screen_clips'
                  ? 'border-[#059669] bg-[#059669]/8'
                  : 'border-[#E3DED3] bg-white'
              }`}
            >
              <p className="font-bold text-[#14161B]">Mode B · Split-Screen</p>
              <p className="text-[11px] text-[#5C5F68] mt-0.5">
                Rush facecam bas + calques motion haut.
              </p>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#14161B] mb-1">Plateforme</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as ShortProject['platform'])}
                className="w-full px-3 py-2 rounded-xl border border-[#E3DED3] bg-white text-[#14161B]"
              >
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="instagram">Instagram Reels</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#14161B] mb-1">Durée cible (s)</label>
              <input
                type="number"
                min={10}
                max={120}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E3DED3] bg-white text-[#14161B] font-mono"
              />
            </div>
          </div>

          {mode === 'split_screen_clips' && (
            <div>
              <label className="block font-bold text-[#14161B] mb-1">
                Rush vidéo source (storage/takes)
              </label>
              <select
                value={sourceVideo}
                onChange={(e) => setSourceVideo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E3DED3] bg-white text-[#14161B]"
              >
                <option value="">-- Sélectionner un rush --</option>
                {sourceVideos.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} ({v.duration}s · {v.resolution})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-[#DC2626] font-semibold">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E3DED3] bg-white text-[#5C5F68] font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer le projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===================================================================== */
/* 2. CONTACT SHEET QC MODAL                                             */
/* ===================================================================== */
interface ContactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ShortProject;
  onSeekAndClose: (t: number) => void;
}

export const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  isOpen,
  onClose,
  project,
  onSeekAndClose,
}) => {
  const [contactUrl, setContactUrl] = useState<string | null>(
    project.contactSheet?.[0]?.previewUrl ||
      (project.isFlagshipReactStage ? '/renders/short-interdiction-15-ans_v1_contact.jpg' : null)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    fetch(`/api/studio/projects/${encodeURIComponent(project.id)}/outputs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.files?.contactSheet) {
          setContactUrl(`${d.files.contactSheet}?t=${Date.now()}`);
        }
      })
      .catch(() => {});
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  const regenerateSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/studio/projects/${encodeURIComponent(project.id)}/contact-sheet`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: project.currentVersion, quality: 'final' }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec génération planche QC');
      setContactUrl(`${data.contactSheetUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur planche contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#258EFF]" />
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Planche de Contrôle Qualité (QC) · {project.currentVersion}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={regenerateSheet}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Extraire 12 frames FFmpeg
            </button>
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626]">
              {error}
            </div>
          )}

          {contactUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#E3DED3] bg-white shadow-sm">
              <img src={contactUrl} alt="Planche contact FFmpeg 4x3" className="w-full object-contain" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(project.contactSheet || []).map((frame) => (
              <button
                key={frame.frameIndex}
                type="button"
                onClick={() => onSeekAndClose(frame.timestamp)}
                className="p-3 rounded-xl border border-[#E3DED3] bg-white hover:border-[#258EFF] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-[#258EFF]">
                    {frame.timeFormatted}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#059669]/12 text-[#065F46] text-[9px] font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    PASS
                  </span>
                </div>
                <p className="text-xs font-bold text-[#14161B] truncate">{frame.title}</p>
                <p className="text-[10px] text-[#5C5F68] line-clamp-2 mt-0.5">{frame.notes}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================================================================== */
/* 3. MOTION EDITOR MODAL (window.setT live sandbox + real capture)      */
/* ===================================================================== */
interface MotionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ShortProject;
  initialComponentId?: string | null;
  onSaved: () => void;
}

export const MotionEditorModal: React.FC<MotionEditorModalProps> = ({
  isOpen,
  onClose,
  project,
  initialComponentId,
  onSaved,
}) => {
  const comps = Object.values(project.motionComponents || {});
  const [selectedId, setSelectedId] = useState(
    initialComponentId || comps[0]?.id || 'comp-custom'
  );
  const activeComp =
    project.motionComponents?.[selectedId] || comps[0] || {
      id: 'comp-custom',
      name: 'counter_boost',
      description: 'Compteur animé piloté par window.setT(t)',
      width: 1080,
      height: 960,
      fps: 25,
      hasAlpha: true,
      tRange: [0, 1] as [number, number],
      code: `window.setT = function(t) {\n  const badge = document.getElementById('stat-badge');\n  if (badge) badge.innerText = Math.round(t * 100) + ' %';\n};`,
    };

  const [code, setCode] = useState(activeComp.code);
  const [previewT, setPreviewT] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialComponentId && project.motionComponents?.[initialComponentId]) {
      setSelectedId(initialComponentId);
      setCode(project.motionComponents[initialComponentId].code);
    }
  }, [initialComponentId, project.motionComponents]);

  if (!isOpen) return null;

  const sandboxHtml = `<!doctype html><html><body style="margin:0;background:#F1EEE6;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#14161B">
<div id="hook-card" style="background:#FCFBF8;border:2px solid #E3DED3;border-radius:18px;padding:24px 36px;text-align:center">
  <div id="stat-badge" style="font-size:48px;font-weight:800;color:#258EFF">50 %</div>
  <div id="c"></div>
</div>
<script>${code}; if (typeof window.setT === 'function') window.setT(${previewT});</script>
</body></html>`;

  const saveComponent = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/studio/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_name: activeComp.name,
          code,
          description: activeComp.description,
          has_alpha: activeComp.hasAlpha,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur sauvegarde composant');
      setStatusMsg('Composant enregistré sur disque.');
      onSaved();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const captureComponent = async () => {
    setCapturing(true);
    setStatusMsg(null);
    try {
      await saveComponent();
      const res = await fetch(`/api/studio/components/${encodeURIComponent(activeComp.name)}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 2, fps: 25, resolution: '540x960', has_alpha: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur capture Chromium');
      setStatusMsg(`Capture réussie : ${d.framesCount} frames → ${d.videoAssetUrl}`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Erreur capture');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#258EFF]" />
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Éditeur Motion · window.setT(t)
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 flex flex-col gap-3">
            {comps.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {comps.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setCode(c.code);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      c.id === activeComp.id
                        ? 'bg-[#258EFF] text-white border-[#258EFF]'
                        : 'bg-white text-[#5C5F68] border-[#E3DED3]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full rounded-xl border border-[#E3DED3] bg-[#14161B] text-[#F1EEE6] font-mono text-xs p-3 focus:outline-none focus:border-[#258EFF]"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={saveComponent}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-bold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Enregistrer
              </button>
              <button
                type="button"
                onClick={captureComponent}
                disabled={capturing}
                className="px-3.5 py-2 rounded-xl bg-[#258EFF] hover:opacity-90 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Capturer séquence Chromium
              </button>
            </div>
            {statusMsg && <p className="text-xs font-semibold text-[#059669]">{statusMsg}</p>}
          </div>

          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="rounded-2xl border border-[#E3DED3] bg-[#F1EEE6] overflow-hidden h-[280px]">
              <iframe
                title="Sandbox window.setT"
                srcDoc={sandboxHtml}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-3 rounded-xl border border-[#E3DED3] bg-white space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#14161B]">Scrub t = {previewT.toFixed(2)}</span>
                <span className="text-[#5C5F68]">[0.00 → 1.00]</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={previewT}
                onChange={(e) => setPreviewT(parseFloat(e.target.value))}
                className="w-full accent-[#258EFF]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================================================================== */
/* 4. COPY FEEDBACK PROMPT MODAL                                         */
/* ===================================================================== */
interface CopyPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ShortProject;
}

export const CopyPromptModal: React.FC<CopyPromptModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [copied, setCopied] = useState(false);
  const [markdown, setMarkdown] = useState(() => buildFeedbackPromptMarkdown(project));

  useEffect(() => {
    if (!isOpen) return;
    setMarkdown(buildFeedbackPromptMarkdown(project));
    fetch(`/api/studio/projects/${encodeURIComponent(project.id)}/copy-prompt`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.promptMarkdown) setMarkdown(d.promptMarkdown);
      })
      .catch(() => {});
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-3.5 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#258EFF]" />
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Prompt Structuré des Retours
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <pre className="p-4 rounded-xl bg-[#14161B] text-[#F1EEE6] font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {markdown}
          </pre>
        </div>

        <div className="px-5 py-3.5 border-t border-[#E3DED3] bg-[#F6F5F1] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E3DED3] bg-white text-xs font-semibold cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-[#258EFF] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copié dans le presse-papiers !' : 'Copier le Prompt Markdown'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ===================================================================== */
/* 5. CHATGPT / MCP TOOLS HUB MODAL                                      */
/* ===================================================================== */
interface ChatGPTModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const ChatGPTModal: React.FC<ChatGPTModalProps> = ({ isOpen, onClose, projectId }) => {
  const [selectedTool, setSelectedTool] = useState('studio_status');
  const [argsJson, setArgsJson] = useState('{}');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const mcpEndpoint = `${origin}/api/mcp`;
  const openApiUrl = `${origin}/api/openapi.json`;

  const presets: Record<string, string> = {
    studio_status: '{}',
    list_projects: '{}',
    list_source_videos: '{}',
    read_short_transcript: JSON.stringify({ project_id: projectId }, null, 2),
    list_feedbacks: JSON.stringify({ project_id: projectId, status: 'all' }, null, 2),
    get_short_outputs: JSON.stringify({ project_id: projectId }, null, 2),
    make_reference_contact_sheet: JSON.stringify({ project_id: projectId, quality: 'final' }, null, 2),
  };

  const runTool = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const parsed = JSON.parse(argsJson);
      const res = await fetch('/api/studio/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: selectedTool, args: parsed }),
      });
      const data = await res.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : 'Erreur exécution');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#14161B]/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#258EFF]" />
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Connecteur MCP &amp; API ChatGPT (23 Outils Studio)
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#EAE7DF] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[#E3DED3] bg-white space-y-1">
              <p className="font-bold text-[#14161B]">Endpoint MCP JSON-RPC 2.0</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-[11px] text-[#258EFF] truncate">{mcpEndpoint}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(mcpEndpoint);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-[#EAE7DF] text-[10px] font-bold cursor-pointer shrink-0"
                >
                  {copiedUrl ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#E3DED3] bg-white space-y-1">
              <p className="font-bold text-[#14161B]">Schéma OpenAPI 3.1</p>
              <code className="text-[11px] text-[#059669] block truncate">{openApiUrl}</code>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#E3DED3] bg-[#F6F5F1] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#258EFF]" />
                <span className="font-bold text-[#14161B]">Console directe d’exécution MCP</span>
              </div>

              <select
                value={selectedTool}
                onChange={(e) => {
                  const name = e.target.value;
                  setSelectedTool(name);
                  setArgsJson(presets[name] || '{}');
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E3DED3] bg-white font-mono text-xs text-[#14161B]"
              >
                {Object.keys(presets).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={4}
              value={argsJson}
              onChange={(e) => setArgsJson(e.target.value)}
              spellCheck={false}
              className="w-full p-2.5 rounded-xl border border-[#E3DED3] bg-white font-mono text-xs text-[#14161B]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={runTool}
                disabled={running}
                className="px-4 py-2 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Exécuter l’outil serveur
              </button>
            </div>

            {output && (
              <pre className="p-3 rounded-xl bg-[#14161B] text-[#F1EEE6] font-mono text-[11px] max-h-52 overflow-auto">
                {output}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
