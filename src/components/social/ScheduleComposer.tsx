import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { ShortProject } from '../../types/studio';
import type {
  PreparedMediaAssets,
  SocialAccountConfig,
  SocialCopyPack,
  SocialPlatform,
} from '../../types/social';
import {
  PLATFORM_META,
  buildTemplateSocialCopy,
  computeNextSmartSlots,
  formatScheduleDualTime,
  toDatetimeLocalValue,
} from '../../engine/socialCopy';

interface ScheduleComposerProps {
  projects: ShortProject[];
  activeProject: ShortProject | null;
  accounts: SocialAccountConfig[];
  onSchedule: (payload: {
    projectId: string;
    version: string;
    platforms: SocialPlatform[];
    scheduledAt: string;
    publishNow: boolean;
    youtubeTitle: string;
    youtubeDescription: string;
    caption: string;
    tiktokCaption: string;
    hashtags: string[];
    coverTimestampSec: number;
    privacy: 'public' | 'unlisted' | 'private';
  }) => Promise<void>;
}

export const ScheduleComposer: React.FC<ScheduleComposerProps> = ({
  projects,
  activeProject,
  accounts,
  onSchedule,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProject?.id || projects[0]?.id || ''
  );

  useEffect(() => {
    if (activeProject?.id && !selectedProjectId) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject?.id, selectedProjectId]);

  const selectedProject = useMemo(
    () =>
      projects.find((p) => p.id === selectedProjectId) ||
      activeProject ||
      projects[0] ||
      null,
    [projects, selectedProjectId, activeProject]
  );

  const [selectedVersion, setSelectedVersion] = useState<string>(
    selectedProject?.currentVersion || 'v1'
  );

  useEffect(() => {
    if (selectedProject) {
      setSelectedVersion(selectedProject.currentVersion || 'v1');
    }
  }, [selectedProject?.id, selectedProject?.currentVersion]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'youtube',
    'instagram',
    'tiktok',
  ]);
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');

  const initialSlots = useMemo(() => computeNextSmartSlots(), []);
  const defaultScheduledIso = initialSlots[1]?.iso || new Date(Date.now() + 3600_000).toISOString();
  const [scheduledLocal, setScheduledLocal] = useState<string>(() =>
    toDatetimeLocalValue(defaultScheduledIso)
  );

  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [tiktokCaption, setTiktokCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [coverTimestampSec, setCoverTimestampSec] = useState<number>(1.2);
  const [pack, setPack] = useState<PreparedMediaAssets | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [preparingPack, setPreparingPack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composerMsg, setComposerMsg] = useState<string | null>(null);
  const [composerErr, setComposerErr] = useState<string | null>(null);

  // Sync template texts when switching project
  useEffect(() => {
    if (!selectedProject) return;
    const tpl = buildTemplateSocialCopy(selectedProject);
    setYoutubeTitle(tpl.youtubeTitle);
    setYoutubeDescription(tpl.youtubeDescription);
    setCaption(tpl.caption);
    setTiktokCaption(tpl.tiktokCaption);
    setHashtagsText(tpl.hashtags.join(' '));
    setCoverTimestampSec(tpl.coverTimestampSec);
    setPack(null);
  }, [selectedProject?.id]);

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleGenerateAiCopy = async () => {
    if (!selectedProject || generatingCopy) return;
    setGeneratingCopy(true);
    setComposerErr(null);
    try {
      const res = await fetch('/api/social/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });
      const data = (await res.json()) as { copy?: SocialCopyPack; error?: string };
      if (!res.ok || !data.copy) {
        throw new Error(data.error || 'Échec génération textes');
      }
      setYoutubeTitle(data.copy.youtubeTitle);
      setYoutubeDescription(data.copy.youtubeDescription);
      setCaption(data.copy.caption);
      setTiktokCaption(data.copy.tiktokCaption);
      setHashtagsText(data.copy.hashtags.join(' '));
      setCoverTimestampSec(data.copy.coverTimestampSec);
      setComposerMsg(
        data.copy.generatedBy === 'gemini'
          ? 'Titres et légendes optimisés par IA.'
          : 'Titres et légendes générés depuis le script du Short.'
      );
      setTimeout(() => setComposerMsg(null), 3000);
    } catch (err) {
      setComposerErr(err instanceof Error ? err.message : 'Erreur génération');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handlePreparePack = async () => {
    if (!selectedProject || preparingPack) return;
    setPreparingPack(true);
    setComposerErr(null);
    try {
      const res = await fetch('/api/social/prepare-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          version: selectedVersion,
          coverTimestampSec,
        }),
      });
      const data = (await res.json()) as { pack?: PreparedMediaAssets; error?: string };
      if (!res.ok || !data.pack) {
        throw new Error(data.error || 'Erreur préparation pack');
      }
      setPack(data.pack);
      setComposerMsg(
        data.pack.socialSizeMb
          ? `Pack prêt : social.mp4 (${data.pack.socialSizeMb} Mo) + cover.jpg à ${coverTimestampSec.toFixed(1)} s.`
          : 'Cover JPG générée (lancez un rendu MP4 pour inclure la vidéo).'
      );
      setTimeout(() => setComposerMsg(null), 3500);
    } catch (err) {
      setComposerErr(err instanceof Error ? err.message : 'Erreur préparation média');
    } finally {
      setPreparingPack(false);
    }
  };

  const scheduledIso = useMemo(() => {
    const parsed = new Date(scheduledLocal);
    return Number.isFinite(parsed.getTime())
      ? parsed.toISOString()
      : new Date().toISOString();
  }, [scheduledLocal]);

  const dualTime = useMemo(() => formatScheduleDualTime(scheduledIso), [scheduledIso]);

  const handleSubmit = async (publishNow: boolean) => {
    if (!selectedProject || submitting) return;
    if (selectedPlatforms.length === 0) {
      setComposerErr('Sélectionnez au moins un réseau social cible.');
      return;
    }
    setSubmitting(true);
    setComposerErr(null);
    setComposerMsg(null);
    try {
      const parsedTags = hashtagsText
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      await onSchedule({
        projectId: selectedProject.id,
        version: selectedVersion,
        platforms: selectedPlatforms,
        scheduledAt: publishNow ? new Date().toISOString() : scheduledIso,
        publishNow,
        youtubeTitle: youtubeTitle.trim() || selectedProject.title,
        youtubeDescription: youtubeDescription.trim(),
        caption: caption.trim(),
        tiktokCaption: tiktokCaption.trim() || caption.trim(),
        hashtags: parsedTags,
        coverTimestampSec,
        privacy,
      });

      setComposerMsg(
        publishNow
          ? `Publication immédiate déclenchée sur ${selectedPlatforms.length} réseau(x).`
          : `Short programmé automatiquement pour le ${dualTime.localLabel} (${selectedPlatforms.length} réseau(x)).`
      );
      setTimeout(() => setComposerMsg(null), 4000);
    } catch (err) {
      setComposerErr(err instanceof Error ? err.message : 'Erreur de programmation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedProject) {
    return (
      <section className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-6 text-center text-xs text-[#5C5F68]">
        Aucun projet Short disponible. Créez d’abord un Short depuis Veille &amp; CSV ou Studio Feedback.
      </section>
    );
  }

  return (
    <section
      aria-label="Composer et programmer une publication"
      className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E3DED3]">
        <div>
          <h2
            className="text-base font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Planifier un Short prêt à publier
          </h2>
          <p className="text-xs text-[#5C5F68]">
            Générez le pack social (MP4 ≤ 30 Mo, cover JPG, titres) puis programmez l’heure exacte.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerateAiCopy()}
          disabled={generatingCopy}
          className="h-9 px-3 rounded-xl border border-[#E3DED3] bg-white hover:border-[#258EFF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          {generatingCopy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF]" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#258EFF]" />
          )}
          Générer titres &amp; légendes
        </button>
      </div>

      {/* Project & Version + Media Pack */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
        <div>
          <label
            htmlFor="publish-project-select"
            className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
          >
            Projet Short
          </label>
          <select
            id="publish-project-select"
            value={selectedProject.id}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#E3DED3] bg-white text-xs font-bold text-[#14161B] cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="publish-version-select"
            className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
          >
            Version
          </label>
          <select
            id="publish-version-select"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#E3DED3] bg-white font-mono text-xs font-bold text-[#14161B] cursor-pointer"
          >
            {(selectedProject.versions || []).map((v) => (
              <option key={v.version} value={v.version}>
                {v.version}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Media readiness strip */}
      <div className="p-3 rounded-xl border border-[#E3DED3] bg-[#F6F5F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {pack?.coverUrl ? (
            <img
              src={`${pack.coverUrl}?t=${encodeURIComponent(pack.preparedAt)}`}
              alt="Aperçu cover"
              referrerPolicy="no-referrer"
              className="w-10 h-[70px] rounded-lg object-cover border border-[#E3DED3] shrink-0"
            />
          ) : (
            <div className="w-10 h-[70px] rounded-lg border border-dashed border-[#E3DED3] bg-white flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4 text-[#5C5F68]" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-bold text-[#14161B] flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#258EFF] shrink-0" aria-hidden="true" />
              <span className="truncate">
                {pack?.socialMp4Url
                  ? `Export social prêt · ${pack.socialSizeMb} Mo · ${pack.width}×${pack.height}`
                  : `Durée ${selectedProject.duration.toFixed(1)} s · Format 9:16`}
              </span>
            </div>
            <p className="text-[11px] text-[#5C5F68]">
              Cover extraite à{' '}
              <span className="font-mono tabular-nums">{coverTimestampSec.toFixed(1)} s</span>
              {pack?.masterSizeMb ? ` · Master ${pack.masterSizeMb} Mo` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <label htmlFor="cover-ts-input" className="text-[11px] text-[#5C5F68] whitespace-nowrap">
              Cover (s)
            </label>
            <input
              id="cover-ts-input"
              type="number"
              min={0.1}
              max={Math.max(1, selectedProject.duration - 0.2)}
              step={0.1}
              value={coverTimestampSec}
              onChange={(e) => setCoverTimestampSec(parseFloat(e.target.value) || 0.8)}
              className="w-16 h-8 px-2 rounded-lg border border-[#E3DED3] bg-white font-mono text-xs tabular-nums text-[#14161B]"
            />
          </div>

          <button
            type="button"
            onClick={() => void handlePreparePack()}
            disabled={preparingPack}
            className="h-8 px-3 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {preparingPack ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Préparer média &amp; cover
          </button>
        </div>
      </div>

      {/* Platform Targets */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold text-[#5C5F68]">
          Réseaux cibles
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) => {
            const active = selectedPlatforms.includes(p);
            const acc = accounts.find((a) => a.platform === p);
            const routeLabel =
              acc?.route === 'oauth'
                ? acc.connected
                  ? 'OAuth actif'
                  : 'OAuth (fallback manuel)'
                : acc?.route === 'treg'
                  ? acc.connected
                    ? acc.tregConnectionName
                      ? `Treg · ${acc.tregConnectionName}`
                      : 'Treg 1-Clic actif'
                    : 'Treg 1-Clic'
                  : 'Kit Manuel';

            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                aria-pressed={active}
                data-testid={`target-platform-${p}`}
                className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-[#258EFF]/8 border-[#258EFF] text-[#14161B]'
                    : 'bg-white border-[#E3DED3] text-[#5C5F68] hover:border-[#14161B]/30'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#14161B] truncate">
                    {PLATFORM_META[p].name}
                  </div>
                  <div className="text-[10px] text-[#5C5F68] truncate">
                    {routeLabel}
                  </div>
                </div>
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                    active
                      ? 'bg-[#258EFF] text-white'
                      : 'border border-[#E3DED3] bg-[#F6F5F1]'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Texts Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="yt-title-input"
                className="text-[11px] font-semibold text-[#5C5F68]"
              >
                Titre YouTube Shorts
              </label>
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  youtubeTitle.length > 60 ? 'text-[#DC2626]' : 'text-[#5C5F68]'
                }`}
              >
                {youtubeTitle.length}/60
              </span>
            </div>
            <input
              id="yt-title-input"
              type="text"
              maxLength={80}
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E3DED3] bg-white text-xs font-semibold text-[#14161B]"
            />
          </div>

          <div>
            <label
              htmlFor="ig-caption-input"
              className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
            >
              Légende Instagram Reels
            </label>
            <textarea
              id="ig-caption-input"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B] leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label
              htmlFor="tt-caption-input"
              className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
            >
              Légende TikTok
            </label>
            <textarea
              id="tt-caption-input"
              rows={3}
              value={tiktokCaption}
              onChange={(e) => setTiktokCaption(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
            <div>
              <label
                htmlFor="hashtags-input"
                className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
              >
                Hashtags (3 à 5 max)
              </label>
              <input
                id="hashtags-input"
                type="text"
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B] font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="privacy-select"
                className="block text-[11px] font-semibold text-[#5C5F68] mb-1"
              >
                Visibilité
              </label>
              <select
                id="privacy-select"
                value={privacy}
                onChange={(e) =>
                  setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')
                }
                className="w-full h-9 px-2.5 rounded-xl border border-[#E3DED3] bg-white text-xs font-semibold text-[#14161B] cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="unlisted">Non répertorié</option>
                <option value="private">Privé</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Time Picker + Presets */}
      <div className="p-3.5 rounded-xl border border-[#E3DED3] bg-[#F6F5F1] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#14161B]">
            <CalendarClock className="w-4 h-4 text-[#258EFF]" aria-hidden="true" />
            <span>Date et heure de publication automatique</span>
          </div>
          <span className="text-[11px] font-mono text-[#5C5F68] tabular-nums">
            {dualTime.localLabel} · {dualTime.utcLabel} · {dualTime.relativeLabel}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <label htmlFor="schedule-datetime-input" className="sr-only">
            Date et heure de publication
          </label>
          <input
            id="schedule-datetime-input"
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E3DED3] bg-white font-mono text-xs text-[#14161B]"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            {initialSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setScheduledLocal(toDatetimeLocalValue(slot.iso))}
                className="px-2.5 py-1.5 rounded-lg border border-[#E3DED3] bg-white hover:border-[#258EFF] text-[11px] font-semibold text-[#14161B] cursor-pointer whitespace-nowrap"
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(composerMsg || composerErr) && (
        <div
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
            composerErr
              ? 'bg-[#DC2626]/10 text-[#DC2626]'
              : 'bg-[#059669]/10 text-[#059669]'
          }`}
        >
          {composerErr || composerMsg}
        </div>
      )}

      {/* Primary Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          disabled={submitting || selectedPlatforms.length === 0}
          onClick={() => void handleSubmit(true)}
          className="h-11 px-4 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] disabled:opacity-50 text-[#14161B] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
          Publier maintenant
        </button>

        <button
          type="button"
          disabled={submitting || selectedPlatforms.length === 0}
          onClick={() => void handleSubmit(false)}
          data-testid="schedule-submit-btn"
          className="h-11 px-5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-50 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
          )}
          Programmer la publication automatique
        </button>
      </div>
    </section>
  );
};
