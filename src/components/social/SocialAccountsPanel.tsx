import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Instagram,
  KeyRound,
  Link2,
  Power,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Video,
  Youtube,
} from 'lucide-react';
import type {
  PublishRoute,
  SocialAccountConfig,
  SocialPlatform,
} from '../../types/social';

interface SocialAccountsPanelProps {
  accounts: SocialAccountConfig[];
  callbacks: Record<SocialPlatform, string>;
  treg: {
    installed: boolean;
    version?: string;
    connectedPlatforms: SocialPlatform[];
  };
  onUpdateAccount: (
    platform: SocialPlatform,
    patch: {
      route?: PublishRoute;
      fallbackToManual?: boolean;
      defaultPrivacy?: 'public' | 'unlisted' | 'private';
      accountName?: string;
      accountHandle?: string;
      accessToken?: string;
      igUserId?: string;
      connected?: boolean;
    }
  ) => Promise<void>;
  onStartOAuth: (platform: SocialPlatform) => Promise<void>;
  onDisconnect: (platform: SocialPlatform) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
}

const PLATFORM_ICON: Record<SocialPlatform, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />,
  instagram: <Instagram className="w-4 h-4 text-[#D97706]" aria-hidden="true" />,
  tiktok: <Video className="w-4 h-4 text-[#14161B]" aria-hidden="true" />,
};

const ENV_HINT: Record<SocialPlatform, string> = {
  youtube: 'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET',
  instagram: 'INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET',
  tiktok: 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET',
};

export const SocialAccountsPanel: React.FC<SocialAccountsPanelProps> = ({
  accounts,
  callbacks,
  treg,
  onUpdateAccount,
  onStartOAuth,
  onDisconnect,
  onRefreshStatus,
}) => {
  const [expandedPlatform, setExpandedPlatform] = useState<SocialPlatform | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<SocialPlatform | null>(null);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [handleInputs, setHandleInputs] = useState<Record<string, string>>({});
  const [igIdInput, setIgIdInput] = useState('');
  const [savingPlatform, setSavingPlatform] = useState<SocialPlatform | null>(null);

  const handleCopyCallback = async (platform: SocialPlatform, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleSaveManualToken = async (platform: SocialPlatform) => {
    setSavingPlatform(platform);
    try {
      const token = (tokenInputs[platform] || '').trim();
      const handle = (handleInputs[platform] || '').trim();
      await onUpdateAccount(platform, {
        ...(token ? { accessToken: token, route: 'oauth', connected: true } : {}),
        ...(handle ? { accountHandle: handle, accountName: handle } : {}),
        ...(platform === 'instagram' && igIdInput.trim()
          ? { igUserId: igIdInput.trim() }
          : {}),
      });
      setTokenInputs((prev) => ({ ...prev, [platform]: '' }));
    } finally {
      setSavingPlatform(null);
    }
  };

  return (
    <section
      aria-label="Comptes réseaux sociaux et méthodes de publication"
      className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E3DED3]">
        <div>
          <h2
            className="text-base font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Comptes connectés &amp; Routes de publication
          </h2>
          <p className="text-xs text-[#5C5F68]">
            OAuth direct par réseau avec bascule automatique vers Treg CLI ou Kit Manuel.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#5C5F68] shrink-0">
          <Terminal className="w-3.5 h-3.5 text-[#14161B]" aria-hidden="true" />
          <span>
            {treg.installed
              ? `Treg ${treg.version || 'actif'} · ${treg.connectedPlatforms.length} connecté(s)`
              : 'Treg CLI absent · Fallback Kit Manuel prêt'}
          </span>
          <button
            type="button"
            onClick={() => void onRefreshStatus()}
            aria-label="Actualiser l'état des connexions"
            className="p-1.5 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[#14161B] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {accounts.map((acc) => {
          const isExpanded = expandedPlatform === acc.platform;
          const callbackUrl = callbacks[acc.platform] || '';

          return (
            <article
              key={acc.platform}
              data-testid={`social-account-card-${acc.platform}`}
              className="rounded-xl border border-[#E3DED3] bg-white p-3.5 flex flex-col gap-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F6F5F1] border border-[#E3DED3] flex items-center justify-center shrink-0">
                    {PLATFORM_ICON[acc.platform]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#14161B] truncate">
                      {acc.label}
                    </h3>
                    <p className="text-[11px] text-[#5C5F68] truncate">
                      {acc.connected
                        ? `${acc.accountHandle || acc.accountName || 'Connecté'} · Actif`
                        : acc.route === 'manual'
                          ? 'Mode Kit Manuel prêt'
                          : 'Non connecté'}
                    </p>
                  </div>
                </div>

                {acc.connected ? (
                  <button
                    type="button"
                    onClick={() => void onDisconnect(acc.platform)}
                    aria-label={`Déconnecter ${acc.label}`}
                    className="px-2 py-1 rounded-lg border border-[#E3DED3] hover:border-[#DC2626] hover:text-[#DC2626] text-[11px] font-semibold text-[#5C5F68] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Déconnecter
                  </button>
                ) : null}
              </div>

              {/* Route selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`route-${acc.platform}`}
                  className="block text-[11px] font-semibold text-[#5C5F68]"
                >
                  Mécanisme de publication
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#EAE7DF] rounded-lg">
                  {(
                    [
                      { id: 'oauth', label: 'OAuth' },
                      { id: 'treg', label: 'Treg' },
                      { id: 'manual', label: 'Manuel' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        void onUpdateAccount(acc.platform, { route: opt.id })
                      }
                      aria-pressed={acc.route === opt.id}
                      className={`py-1 px-2 rounded-md text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        acc.route === opt.id
                          ? 'bg-[#FCFBF8] text-[#14161B] shadow-xs'
                          : 'text-[#5C5F68] hover:text-[#14161B]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fallback checkbox */}
              <label className="flex items-center justify-between gap-2 text-[11px] text-[#5C5F68] cursor-pointer">
                <span>Fallback Kit Manuel si indisponible</span>
                <input
                  type="checkbox"
                  checked={acc.fallbackToManual}
                  onChange={(e) =>
                    void onUpdateAccount(acc.platform, {
                      fallbackToManual: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-[#258EFF] cursor-pointer"
                />
              </label>

              {acc.lastError && (
                <p className="text-[11px] text-[#DC2626] leading-snug">
                  {acc.lastError}
                </p>
              )}

              {/* Primary Connection / Config Buttons */}
              <div className="flex items-center gap-2 pt-1 mt-auto">
                {acc.route === 'oauth' && (
                  <button
                    type="button"
                    onClick={() => void onStartOAuth(acc.platform)}
                    disabled={!acc.oauthConfigured}
                    className="flex-1 h-9 px-3 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-45 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {acc.connected ? 'Reconnecter OAuth' : 'Connecter OAuth'}
                  </button>
                )}

                {acc.route === 'treg' && (
                  <div className="flex-1 text-[11px] font-medium text-[#5C5F68] flex items-center gap-1.5">
                    <Power
                      className={`w-3.5 h-3.5 ${
                        acc.tregConnected ? 'text-[#059669]' : 'text-[#D97706]'
                      }`}
                      aria-hidden="true"
                    />
                    {acc.tregConnected
                      ? 'Connecté via Treg'
                      : 'Exécutez treg connections connect'}
                  </div>
                )}

                {acc.route === 'manual' && (
                  <div className="flex-1 text-[11px] font-medium text-[#059669] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Kit MP4 + Cover + Texte prêt
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setExpandedPlatform(isExpanded ? null : acc.platform)
                  }
                  aria-expanded={isExpanded}
                  className="h-9 px-2.5 rounded-xl border border-[#E3DED3] bg-[#F6F5F1] hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <KeyRound className="w-3 h-3" aria-hidden="true" />
                  Config
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Expandable OAuth & Token Config */}
              {isExpanded && (
                <div className="pt-2.5 border-t border-[#E3DED3] space-y-2.5 text-[11px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[#5C5F68] font-semibold">
                      <span>URL Callback OAuth ({acc.oauthConfigured ? 'Clés détectées' : 'Clés à définir'})</span>
                      <button
                        type="button"
                        onClick={() => void handleCopyCallback(acc.platform, callbackUrl)}
                        className="inline-flex items-center gap-1 text-[#258EFF] hover:underline cursor-pointer"
                      >
                        {copiedPlatform === acc.platform ? (
                          <>
                            <Check className="w-3 h-3" /> Copié
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copier
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block p-2 rounded-lg bg-[#F6F5F1] border border-[#E3DED3] font-mono text-[10px] text-[#14161B] break-all">
                      {callbackUrl}
                    </code>
                    <p className="text-[10px] text-[#5C5F68]">
                      Secrets requis : <span className="font-mono">{ENV_HINT[acc.platform]}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`handle-${acc.platform}`}
                      className="block font-semibold text-[#5C5F68]"
                    >
                      Nom / Handle du compte (optionnel)
                    </label>
                    <input
                      id={`handle-${acc.platform}`}
                      type="text"
                      value={handleInputs[acc.platform] ?? acc.accountHandle ?? ''}
                      onChange={(e) =>
                        setHandleInputs((p) => ({ ...p, [acc.platform]: e.target.value }))
                      }
                      placeholder="@moncompte"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B]"
                    />

                    {acc.platform === 'instagram' && (
                      <input
                        type="text"
                        aria-label="Instagram Business User ID"
                        value={igIdInput}
                        onChange={(e) => setIgIdInput(e.target.value)}
                        placeholder="IG User ID (ex: 178414...)"
                        className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B] font-mono"
                      />
                    )}

                    <input
                      type="password"
                      aria-label={`Token d'accès OAuth ${acc.label}`}
                      value={tokenInputs[acc.platform] || ''}
                      onChange={(e) =>
                        setTokenInputs((p) => ({ ...p, [acc.platform]: e.target.value }))
                      }
                      placeholder="Coller un Access Token OAuth (optionnel)"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B] font-mono"
                    />

                    <button
                      type="button"
                      disabled={savingPlatform === acc.platform}
                      onClick={() => void handleSaveManualToken(acc.platform)}
                      className="w-full h-8 rounded-lg bg-[#258EFF] hover:opacity-90 text-white font-semibold text-xs cursor-pointer"
                    >
                      {savingPlatform === acc.platform
                        ? 'Enregistrement…'
                        : 'Enregistrer la configuration'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
