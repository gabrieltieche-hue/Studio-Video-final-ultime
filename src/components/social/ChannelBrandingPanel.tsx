import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Instagram,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Video,
  Youtube,
} from 'lucide-react';
import type {
  ChannelBrandingKit,
  LiveChannelProfileSnapshot,
  SocialPlatform,
} from '../../types/social';

interface ChannelBrandingPanelProps {
  onNotify?: (msg: string, isError?: boolean) => void;
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  youtube: 'YouTube Shorts',
  instagram: 'Instagram Reels',
  tiktok: 'TikTok',
};

const PLATFORM_ICONS: Record<SocialPlatform, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />,
  instagram: <Instagram className="w-4 h-4 text-[#D97706]" aria-hidden="true" />,
  tiktok: <Video className="w-4 h-4 text-[#14161B]" aria-hidden="true" />,
};

export const ChannelBrandingPanel: React.FC<ChannelBrandingPanelProps> = ({
  onNotify,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [pushingYt, setPushingYt] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [kit, setKit] = useState<ChannelBrandingKit | null>(null);
  const [liveProfiles, setLiveProfiles] = useState<LiveChannelProfileSnapshot[]>([]);

  const loadBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/branding', { credentials: 'same-origin' });
      if (res.ok) {
        const data = (await res.json()) as {
          kit?: ChannelBrandingKit;
          liveProfiles?: LiveChannelProfileSnapshot[];
        };
        if (data.kit) setKit(data.kit);
        if (data.liveProfiles) setLiveProfiles(data.liveProfiles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  const copyText = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
      onNotify?.(`${label} copié dans le presse-papiers.`);
    } catch {
      onNotify?.('Copie bloquée par le navigateur — sélectionnez le texte manuellement.', true);
    }
  };

  const handleSave = async () => {
    if (!kit || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/social/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kit),
      });
      const data = (await res.json()) as { kit?: ChannelBrandingKit };
      if (res.ok && data.kit) {
        setKit(data.kit);
        onNotify?.('Kit d’identité de chaîne sauvegardé.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestAi = async () => {
    if (suggesting) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/social/branding/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        kit?: ChannelBrandingKit;
        generatedBy?: string;
      };
      if (res.ok && data.kit) {
        setKit(data.kit);
        onNotify?.(
          data.generatedBy === 'gemini'
            ? 'Nom, handle et bios adaptés à vos Shorts avec Gemini.'
            : 'Propositions de branding chargées.'
        );
      }
    } finally {
      setSuggesting(false);
    }
  };

  const handlePushYouTubeDescription = async () => {
    if (pushingYt) return;
    setPushingYt(true);
    try {
      const res = await fetch('/api/social/branding/apply-youtube', {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        onNotify?.(data.error || 'Impossible de pousser sur YouTube.', true);
        return;
      }
      onNotify?.('Description YouTube mise à jour directement via API.');
      await loadBranding();
    } finally {
      setPushingYt(false);
    }
  };

  return (
    <section
      aria-label="Branding et profils des chaînes"
      className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3DED3]">
        <div>
          <h2
            className="text-base font-extrabold tracking-tight text-[#14161B] flex items-center gap-2"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            <Palette className="w-4 h-4 text-[#258EFF]" aria-hidden="true" />
            Branding des chaînes (Nom, Bio &amp; Photo de profil prêts à appliquer)
          </h2>
          <p className="text-xs text-[#5C5F68]">
            Instagram, TikTok et YouTube bloquent le renommage/avatar via API tierce : tout est généré sur-mesure ici avec téléchargement et copie en 1 clic.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => void handleSuggestAi()}
            disabled={suggesting || loading}
            className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:border-[#258EFF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {suggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#258EFF]" aria-hidden="true" />
            )}
            Adapter via IA
          </button>
          <button
            type="button"
            onClick={() => void loadBranding()}
            disabled={loading}
            aria-label="Actualiser les profils détectés"
            className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {expanded ? 'Réduire' : 'Ouvrir'}
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {expanded && kit && (
        <div className="space-y-4">
          {/* Row 1: Visual Brand Assets (Avatar + YouTube Banner) + Core Handle/Name */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Generated Avatar + Banner */}
            <div className="lg:col-span-5 bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-bold text-[#14161B]">
                Visuels créés pour vos 3 chaînes
              </div>
              <div className="flex items-start gap-3">
                <div className="space-y-1.5 shrink-0">
                  <img
                    src={kit.avatarUrl}
                    alt="Avatar de chaîne proposé"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#14161B]/15 bg-white"
                  />
                  <a
                    href={kit.avatarUrl}
                    download="avatar-alex-decode.jpg"
                    className="h-7 px-2.5 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    Photo profil
                  </a>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <img
                    src={kit.bannerUrl}
                    alt="Bannière YouTube proposée"
                    className="w-full h-20 rounded-lg object-cover border border-[#E3DED3] bg-white"
                  />
                  <a
                    href={kit.bannerUrl}
                    download="banner-youtube-alex-decode.jpg"
                    className="h-7 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[#14161B] text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    Bannière YouTube (16:9)
                  </a>
                </div>
              </div>
            </div>

            {/* Unified Name, Handle, Tagline */}
            <div className="lg:col-span-7 bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label
                    htmlFor="brand-name-input"
                    className="block text-[11px] font-semibold text-[#5C5F68]"
                  >
                    Nom de chaîne unifié
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="brand-name-input"
                      type="text"
                      value={kit.brandName}
                      onChange={(e) => setKit({ ...kit, brandName: e.target.value })}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white text-xs font-semibold text-[#14161B]"
                    />
                    <button
                      type="button"
                      onClick={() => void copyText('name', kit.brandName, 'Nom de chaîne')}
                      className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'name' ? (
                        <Check className="w-3 h-3 text-[#059669]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copier
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="brand-handle-input"
                    className="block text-[11px] font-semibold text-[#5C5F68]"
                  >
                    Identifiant @handle suggéré
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="brand-handle-input"
                      type="text"
                      value={kit.handle}
                      onChange={(e) => setKit({ ...kit, handle: e.target.value })}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white text-xs font-mono text-[#14161B]"
                    />
                    <button
                      type="button"
                      onClick={() => void copyText('handle', kit.handle, 'Handle')}
                      className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'handle' ? (
                        <Check className="w-3 h-3 text-[#059669]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copier
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-[#5C5F68]">
                  Modifiez librement puis enregistrez votre kit pour le garder sur le volume serveur.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: 3 Platform Profile Cards (Detected Live vs Target Bio + Direct Edit Link) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {(['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((platform) => {
              const live = liveProfiles.find((p) => p.platform === platform);
              const bioValue =
                platform === 'youtube'
                  ? kit.youtubeDescription
                  : platform === 'instagram'
                    ? kit.instagramBio
                    : kit.tiktokBio;
              const maxChars = platform === 'youtube' ? 1000 : platform === 'instagram' ? 150 : 80;
              const bioFieldLabel =
                platform === 'youtube'
                  ? 'Description YouTube'
                  : platform === 'instagram'
                    ? 'Bio Instagram'
                    : 'Bio TikTok';

              return (
                <article
                  key={platform}
                  className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E3DED3] flex items-center justify-center shrink-0">
                        {PLATFORM_ICONS[platform]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#14161B] truncate">
                          {PLATFORM_LABELS[platform]}
                        </div>
                        <div className="text-[11px] text-[#5C5F68] truncate">
                          {live?.liveHandle || live?.liveName
                            ? `Actuel : ${live.liveHandle || ''} ${live.liveName ? `(${live.liveName})` : ''}`.trim()
                            : live?.connected
                              ? 'Compte connecté'
                              : 'En attente de lecture profil'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void copyText(`bio-${platform}`, bioValue, bioFieldLabel)}
                      className="h-7 px-2.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === `bio-${platform}` ? (
                        <Check className="w-3 h-3 text-[#059669]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copier
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#5C5F68]">
                      <label htmlFor={`bio-input-${platform}`} className="font-semibold">
                        {bioFieldLabel}
                      </label>
                      <span className="font-mono tabular-nums">
                        {bioValue.length}/{maxChars}
                      </span>
                    </div>
                    <textarea
                      id={`bio-input-${platform}`}
                      rows={platform === 'youtube' ? 4 : 3}
                      maxLength={maxChars}
                      value={bioValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (platform === 'youtube') {
                          setKit({ ...kit, youtubeDescription: val });
                        } else if (platform === 'instagram') {
                          setKit({ ...kit, instagramBio: val });
                        } else {
                          setKit({ ...kit, tiktokBio: val });
                        }
                      }}
                      className="w-full p-2 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B] leading-relaxed resize-none"
                    />
                  </div>

                  {live?.apiNote && (
                    <p className="text-[11px] text-[#5C5F68] leading-snug">{live.apiNote}</p>
                  )}

                  <div className="flex items-center gap-2 pt-0.5 mt-auto flex-wrap">
                    {platform === 'youtube' && live?.canAutoUpdateViaApi && (
                      <button
                        type="button"
                        onClick={() => void handlePushYouTubeDescription()}
                        disabled={pushingYt}
                        className="h-8 px-3 rounded-lg bg-[#258EFF] hover:bg-[#14161B] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        {pushingYt && <Loader2 className="w-3 h-3 animate-spin" />}
                        Pousser description
                      </button>
                    )}
                    <a
                      href={
                        live?.editProfileUrl ||
                        (platform === 'youtube'
                          ? 'https://studio.youtube.com/channel/UC/editing/details'
                          : platform === 'instagram'
                            ? 'https://www.instagram.com/accounts/edit/'
                            : 'https://www.tiktok.com/')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      {platform === 'youtube'
                        ? 'Ouvrir YouTube Studio'
                        : platform === 'instagram'
                          ? 'Modifier sur Instagram'
                          : 'Modifier sur TikTok'}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
