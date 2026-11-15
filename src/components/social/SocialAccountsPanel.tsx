import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Instagram,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Video,
  Youtube,
} from 'lucide-react';
import type {
  PublishRoute,
  SocialAccountConfig,
  SocialPlatform,
  TregSessionPublic,
} from '../../types/social';

interface SocialAccountsPanelProps {
  accounts: SocialAccountConfig[];
  callbacks: Record<SocialPlatform, string>;
  tregSession: TregSessionPublic;
  onUpdateAccount: (
    platform: SocialPlatform,
    patch: {
      route?: PublishRoute;
      fallbackToManual?: boolean;
      defaultPrivacy?: 'public' | 'unlisted' | 'private';
      accountName?: string;
      accountHandle?: string;
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      igUserId?: string;
      connected?: boolean;
    }
  ) => Promise<void>;
  onStartOAuth: (platform: SocialPlatform) => Promise<void>;
  onDisconnect: (platform: SocialPlatform) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
  onNotify?: (msg: string, isError?: boolean) => void;
  pendingOAuthFlow?: { platform: SocialPlatform; url: string } | null;
  onClearPendingOAuth?: () => void;
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
  tregSession,
  onUpdateAccount,
  onStartOAuth,
  onDisconnect,
  onRefreshStatus,
  onNotify,
  pendingOAuthFlow,
  onClearPendingOAuth,
}) => {
  const [expandedPlatform, setExpandedPlatform] = useState<SocialPlatform | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<SocialPlatform | null>(null);
  const [clientIdInputs, setClientIdInputs] = useState<Record<string, string>>({});
  const [clientSecretInputs, setClientSecretInputs] = useState<Record<string, string>>({});
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [handleInputs, setHandleInputs] = useState<Record<string, string>>({});
  const [igIdInput, setIgIdInput] = useState('');
  const [savingPlatform, setSavingPlatform] = useState<SocialPlatform | null>(null);

  // Treg 1-click login state
  const [tregLoginFlow, setTregLoginFlow] = useState<{
    loginId: string;
    loginUrl: string;
    pairingCode?: string;
  } | null>(null);
  const [startingTregLogin, setStartingTregLogin] = useState(false);
  const [showTregAlt, setShowTregAlt] = useState(false);
  const [tregTokenInput, setTregTokenInput] = useState('');
  const [tregEmailInput, setTregEmailInput] = useState('');
  const [tregEmailCodeInput, setTregEmailCodeInput] = useState('');
  const [tregAwaitingEmailCode, setTregAwaitingEmailCode] = useState(false);
  const [tregBusy, setTregBusy] = useState(false);

  // Treg 1-click provider OAuth state
  const [pendingProviderAuth, setPendingProviderAuth] = useState<{
    platform: SocialPlatform;
    state: string;
    consentUrl: string;
    consentNotice?: string;
  } | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<SocialPlatform | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const providerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (providerPollRef.current) clearInterval(providerPollRef.current);
    };
  }, []);

  const handleCopyCallback = async (platform: SocialPlatform, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleStartTregLogin = async () => {
    if (startingTregLogin) return;
    setStartingTregLogin(true);
    try {
      const res = await fetch('/api/social/treg/login/start', { method: 'POST' });
      const data = (await res.json()) as {
        loginId?: string;
        loginUrl?: string;
        pairingCode?: string;
        error?: string;
      };
      if (!res.ok || !data.loginId || !data.loginUrl) {
        throw new Error(data.error || 'Impossible de générer le lien de connexion Treg.');
      }
      setTregLoginFlow({
        loginId: data.loginId,
        loginUrl: data.loginUrl,
        pairingCode: data.pairingCode,
      });

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      let checks = 0;
      pollTimerRef.current = setInterval(async () => {
        checks += 1;
        if (checks > 90) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        try {
          const pRes = await fetch(
            `/api/social/treg/login/poll?login_id=${encodeURIComponent(data.loginId!)}`
          );
          const pData = (await pRes.json()) as { status?: string };
          if (pData.status === 'done') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setTregLoginFlow(null);
            onNotify?.('Session Treg connectée ! Cliquez maintenant sur un réseau pour le lier en 1 clic.');
            await onRefreshStatus();
          }
        } catch {
          // continue polling
        }
      }, 2000);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erreur connexion Treg', true);
    } finally {
      setStartingTregLogin(false);
    }
  };

  const handleTregTokenSubmit = async () => {
    if (!tregTokenInput.trim() || tregBusy) return;
    setTregBusy(true);
    try {
      const res = await fetch('/api/social/treg/login/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tregTokenInput.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Token Treg invalide');
      setTregTokenInput('');
      setShowTregAlt(false);
      onNotify?.('Token Treg enregistré et vérifié.');
      await onRefreshStatus();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erreur token Treg', true);
    } finally {
      setTregBusy(false);
    }
  };

  const handleTregEmailStart = async () => {
    if (!tregEmailInput.trim() || tregBusy) return;
    setTregBusy(true);
    try {
      const res = await fetch('/api/social/treg/login/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tregEmailInput.trim() }),
      });
      const data = (await res.json()) as {
        requiresBrowser?: boolean;
        loginId?: string;
        loginUrl?: string;
        pairingCode?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Erreur email Treg');
      if (data.requiresBrowser && data.loginUrl && data.loginId) {
        setTregLoginFlow({
          loginId: data.loginId,
          loginUrl: data.loginUrl,
          pairingCode: data.pairingCode,
        });
      } else {
        setTregAwaitingEmailCode(true);
        onNotify?.(data.message || 'Code envoyé par email.');
      }
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erreur email Treg', true);
    } finally {
      setTregBusy(false);
    }
  };

  const handleTregEmailVerify = async () => {
    if (!tregEmailInput.trim() || !tregEmailCodeInput.trim() || tregBusy) return;
    setTregBusy(true);
    try {
      const res = await fetch('/api/social/treg/login/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tregEmailInput.trim(),
          code: tregEmailCodeInput.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Code incorrect');
      setTregAwaitingEmailCode(false);
      setTregEmailCodeInput('');
      setShowTregAlt(false);
      onNotify?.('Session Treg connectée par email.');
      await onRefreshStatus();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erreur validation code', true);
    } finally {
      setTregBusy(false);
    }
  };

  const handleTregLogout = async () => {
    await fetch('/api/social/treg/logout', { method: 'POST' });
    setTregLoginFlow(null);
    setPendingProviderAuth(null);
    await onRefreshStatus();
  };

  const handleStartTregProvider = async (
    platform: SocialPlatform,
    authMethod?: 'instagram-login' | 'facebook-page'
  ) => {
    if (!tregSession.loggedIn) {
      onNotify?.('Connectez d’abord Treg en 1 clic ci-dessus, puis liez votre réseau.');
      await handleStartTregLogin();
      return;
    }
    setConnectingProvider(platform);
    try {
      const res = await fetch(`/api/social/treg/connect/${encodeURIComponent(platform)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authMethod ? { authMethod } : {}),
      });
      const data = (await res.json()) as {
        state?: string;
        consentUrl?: string;
        consentNotice?: string;
        error?: string;
      };
      if (!res.ok || !data.state || !data.consentUrl) {
        throw new Error(data.error || `Impossible de connecter ${platform} via Treg.`);
      }
      setPendingProviderAuth({
        platform,
        state: data.state,
        consentUrl: data.consentUrl,
        consentNotice: data.consentNotice,
      });

      if (providerPollRef.current) clearInterval(providerPollRef.current);
      let tries = 0;
      providerPollRef.current = setInterval(async () => {
        tries += 1;
        if (tries > 120) {
          if (providerPollRef.current) clearInterval(providerPollRef.current);
          return;
        }
        try {
          const pRes = await fetch(
            `/api/social/treg/connect/poll?state=${encodeURIComponent(data.state!)}&platform=${encodeURIComponent(platform)}`
          );
          const pData = (await pRes.json()) as { status?: string; detail?: string };
          if (pData.status === 'done') {
            if (providerPollRef.current) clearInterval(providerPollRef.current);
            setPendingProviderAuth(null);
            if (pData.detail) {
              onNotify?.(pData.detail, true);
            } else {
              onNotify?.(`Compte ${platform} connecté automatiquement via Treg !`);
            }
            await onRefreshStatus();
          } else if (pData.status === 'error') {
            if (providerPollRef.current) clearInterval(providerPollRef.current);
            setPendingProviderAuth(null);
            onNotify?.(pData.detail || `Connexion ${platform} interrompue.`, true);
          }
        } catch {
          // continue polling
        }
      }, 2000);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erreur connexion Treg', true);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleSaveManualConfig = async (platform: SocialPlatform) => {
    setSavingPlatform(platform);
    try {
      const clientId = (clientIdInputs[platform] || '').trim();
      const clientSecret = (clientSecretInputs[platform] || '').trim();
      const token = (tokenInputs[platform] || '').trim();
      const handle = (handleInputs[platform] || '').trim();
      await onUpdateAccount(platform, {
        ...(clientId ? { clientId } : {}),
        ...(clientSecret ? { clientSecret } : {}),
        ...(token ? { accessToken: token, route: 'oauth', connected: true } : {}),
        ...(handle ? { accountHandle: handle, accountName: handle } : {}),
        ...(platform === 'instagram' && igIdInput.trim()
          ? { igUserId: igIdInput.trim() }
          : {}),
      });
      setTokenInputs((prev) => ({ ...prev, [platform]: '' }));
      setClientSecretInputs((prev) => ({ ...prev, [platform]: '' }));
      onNotify?.(`Configuration ${platform} enregistrée.`);
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
            Comptes connectés &amp; Connexion Express 1-Clic
          </h2>
          <p className="text-xs text-[#5C5F68]">
            Connectez YouTube, Instagram et TikTok en un seul lien via Treg (zéro app Meta/TikTok à configurer) ou par OAuth direct.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefreshStatus()}
          aria-label="Actualiser l'état des connexions"
          className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Treg 1-Link Express Banner */}
      <div className="rounded-xl border border-[#258EFF]/25 bg-[#258EFF]/[0.04] p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#14161B]">
              <Sparkles className="w-4 h-4 text-[#258EFF]" aria-hidden="true" />
              <span>Passerelle Treg 1-Clic (YouTube · Instagram · TikTok)</span>
            </div>
            <p className="text-[11px] text-[#5C5F68]">
              {tregSession.loggedIn
                ? `Session Treg active${tregSession.email ? ` (${tregSession.email})` : ''}${tregSession.activeOrg ? ` · Équipe ${tregSession.activeOrg}` : ''} — vous pouvez lier chaque réseau ci-dessous en 1 clic.`
                : 'Un seul lien pour vous connecter avec Google, GitHub ou email — ensuite vous connectez Instagram, TikTok et YouTube sans portail développeur.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {tregSession.loggedIn ? (
              <button
                type="button"
                onClick={() => void handleTregLogout()}
                className="h-9 px-3 rounded-xl border border-[#E3DED3] bg-white hover:border-[#DC2626] hover:text-[#DC2626] text-xs font-semibold text-[#5C5F68] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Déconnecter Treg
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleStartTregLogin()}
                  disabled={startingTregLogin}
                  data-testid="treg-oneclick-login-btn"
                  className="h-9 px-3.5 rounded-xl bg-[#258EFF] hover:bg-[#14161B] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                >
                  {startingTregLogin ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  Se connecter à Treg en 1 lien
                </button>
                <button
                  type="button"
                  onClick={() => setShowTregAlt((v) => !v)}
                  className="h-9 px-3 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] cursor-pointer whitespace-nowrap"
                >
                  Email / Token
                </button>
              </>
            )}
          </div>
        </div>

        {/* Direct clickable link if popup blocked or on tablet */}
        {tregLoginFlow && (
          <div className="p-3 rounded-xl border border-[#E3DED3] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-[#14161B] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF] shrink-0" />
                <span>En attente de votre connexion dans l’onglet Treg…</span>
              </div>
              {tregLoginFlow.pairingCode && (
                <p className="text-[11px] text-[#5C5F68]">
                  Code de vérification affiché sur la page :{' '}
                  <span className="font-mono font-bold text-[#14161B]">
                    {tregLoginFlow.pairingCode}
                  </span>
                </p>
              )}
            </div>
            <a
              href={tregLoginFlow.loginUrl}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-3 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Ouvrir le lien Treg
            </a>
          </div>
        )}

        {/* Email OTP or Token fallback */}
        {showTregAlt && !tregSession.loggedIn && (
          <div className="p-3 rounded-xl border border-[#E3DED3] bg-white grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <label htmlFor="treg-email-input" className="block font-semibold text-[#5C5F68]">
                Connexion Treg par email (code à 6 chiffres)
              </label>
              <div className="flex gap-2">
                <input
                  id="treg-email-input"
                  type="email"
                  value={tregEmailInput}
                  onChange={(e) => setTregEmailInput(e.target.value)}
                  placeholder="vous@gmail.com"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs"
                />
                <button
                  type="button"
                  disabled={tregBusy}
                  onClick={() => void handleTregEmailStart()}
                  className="h-8 px-3 rounded-lg bg-[#14161B] text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  Envoyer code
                </button>
              </div>
              {tregAwaitingEmailCode && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tregEmailCodeInput}
                    onChange={(e) => setTregEmailCodeInput(e.target.value)}
                    placeholder="Code 6 chiffres"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] font-mono text-xs"
                  />
                  <button
                    type="button"
                    disabled={tregBusy}
                    onClick={() => void handleTregEmailVerify()}
                    className="h-8 px-3 rounded-lg bg-[#059669] text-white font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="treg-token-input" className="block font-semibold text-[#5C5F68]">
                Ou coller votre clé API Treg (TREG_TOKEN)
              </label>
              <div className="flex gap-2">
                <input
                  id="treg-token-input"
                  type="password"
                  value={tregTokenInput}
                  onChange={(e) => setTregTokenInput(e.target.value)}
                  placeholder="treg_..."
                  className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] font-mono text-xs"
                />
                <button
                  type="button"
                  disabled={tregBusy}
                  onClick={() => void handleTregTokenSubmit()}
                  className="h-8 px-3 rounded-lg bg-[#258EFF] text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  Connecter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending provider consent banner */}
      {pendingProviderAuth && (
        <div className="p-3 rounded-xl border border-[#258EFF]/30 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="font-bold text-[#14161B] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF] shrink-0" />
              <span>
                Finalisez l’autorisation {pendingProviderAuth.platform} dans la fenêtre ouverte…
              </span>
            </div>
            {pendingProviderAuth.consentNotice && (
              <p className="text-[11px] text-[#5C5F68]">{pendingProviderAuth.consentNotice}</p>
            )}
          </div>
          <a
            href={pendingProviderAuth.consentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-lg bg-[#258EFF] text-white font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Ouvrir le lien de connexion
          </a>
        </div>
      )}

      {/* Pending Direct OAuth banner */}
      {pendingOAuthFlow && (
        <div className="p-3 rounded-xl border border-[#14161B]/25 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="font-bold text-[#14161B] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#258EFF] shrink-0" />
              <span>
                Lien OAuth {pendingOAuthFlow.platform} prêt — ouvrez-le pour autoriser le compte :
              </span>
            </div>
            <p className="text-[11px] text-[#5C5F68] font-mono truncate">
              {pendingOAuthFlow.url}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pendingOAuthFlow.url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Autoriser dans un nouvel onglet
            </a>
            {onClearPendingOAuth && (
              <button
                type="button"
                onClick={onClearPendingOAuth}
                className="h-8 px-2.5 rounded-lg border border-[#E3DED3] text-[#5C5F68] hover:text-[#14161B] font-semibold cursor-pointer"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3 Network Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {accounts.map((acc) => {
          const isExpanded = expandedPlatform === acc.platform;
          const callbackUrl = callbacks[acc.platform] || '';
          const isTregReady = Boolean(acc.tregConnected);

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
                    <p
                      className={`text-[11px] truncate ${
                        acc.connected ? 'text-[#059669] font-semibold' : 'text-[#5C5F68]'
                      }`}
                    >
                      {acc.connected
                        ? `${acc.accountHandle || acc.accountName || 'Connecté'} · Actif`
                        : acc.route === 'manual'
                          ? 'Mode Kit Manuel prêt'
                          : acc.route === 'treg'
                            ? 'Prêt pour connexion 1-clic Treg'
                            : acc.oauthConfigured
                              ? 'OAuth configuré · À connecter'
                              : 'Clés OAuth à renseigner (ou Treg)'}
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
                <span className="block text-[11px] font-semibold text-[#5C5F68]">
                  Mécanisme de publication
                </span>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#EAE7DF] rounded-lg">
                  {(
                    [
                      { id: 'treg', label: 'Treg 1-Clic' },
                      { id: 'oauth', label: 'OAuth Direct' },
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
                      className={`py-1 px-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
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

              {acc.platform === 'instagram' && acc.route === 'treg' && (
                (() => {
                  const fbConns = tregSession.connections.filter(
                    (c) =>
                      c.platform === 'instagram' &&
                      (c.authorizationMethod === 'facebook-page' ||
                        Boolean(c.name && c.name.startsWith('studio-instagram-page')))
                  );
                  const bestFbConn =
                    fbConns.find((c) => Boolean(c.resourceRef) && !c.setupRequired) ||
                    fbConns[fbConns.length - 1];
                  const fbPageReady = Boolean(
                    bestFbConn &&
                      bestFbConn.resourceRef &&
                      !bestFbConn.setupRequired &&
                      !acc.tregSetupRequired
                  );
                  const fbPageNeedsSetup = Boolean(
                    (bestFbConn || acc.tregAuthorizationMethod === 'facebook-page') &&
                      !fbPageReady
                  );

                  if (fbPageReady) {
                    return (
                      <div className="rounded-lg border border-[#059669]/25 bg-[#059669]/[0.06] px-2.5 py-2 text-[11px] text-[#059669] font-medium">
                        Connexion Page Facebook active (ID {bestFbConn?.resourceRef}) — publication Reels autorisée par Meta.
                      </div>
                    );
                  }

                  if (fbPageNeedsSetup) {
                    return (
                      <div
                        data-testid="ig-fb-page-setup-alert"
                        className="rounded-lg border border-[#D97706]/40 bg-[#D97706]/[0.08] p-2.5 space-y-2 text-[11px]"
                      >
                        <p className="text-[#14161B] leading-snug">
                          <span className="font-bold text-[#B45309]">
                            Action requise sur Facebook / Instagram :
                          </span>{' '}
                          Facebook a autorisé les permissions, mais{' '}
                          <span className="font-semibold">0 Page Facebook</span> liée à un compte Instagram Pro n’a été retournée.
                        </p>
                        <ol className="list-decimal pl-4 space-y-0.5 text-[#5C5F68] leading-snug">
                          <li>
                            Dans l’app <span className="font-semibold text-[#14161B]">Instagram</span> →{' '}
                            <em>Modifier le profil</em> → <em>Page</em>, créez ou liez une{' '}
                            <span className="font-semibold text-[#14161B]">Page Facebook</span> gérée par votre profil Facebook.
                          </li>
                          <li>
                            Cliquez ci-dessous, puis dans Facebook (<em className="text-[#14161B]">Modifier les paramètres précédents</em>) cochez bien votre Page + <span className="font-mono">{acc.accountHandle || 'votre compte Instagram'}</span>.
                          </li>
                        </ol>
                        <button
                          type="button"
                          disabled={connectingProvider === 'instagram'}
                          onClick={() =>
                            void handleStartTregProvider('instagram', 'facebook-page')
                          }
                          data-testid="ig-treg-fb-page-btn"
                          className="w-full h-8 px-2.5 rounded-lg bg-[#D97706] hover:bg-[#14161B] text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Reconnecter Page Facebook (Reels)
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-lg border border-[#D97706]/30 bg-[#D97706]/[0.06] p-2.5 space-y-2 text-[11px]">
                      <p className="text-[#14161B] leading-snug">
                        <span className="font-bold">Requis pour publier les Reels :</span>{' '}
                        Meta bloque souvent la publication via Instagram Login (Erreur #10). Liez votre compte Pro à une Page Facebook puis autorisez ci-dessous :
                      </p>
                      <button
                        type="button"
                        disabled={connectingProvider === 'instagram'}
                        onClick={() =>
                          void handleStartTregProvider('instagram', 'facebook-page')
                        }
                        data-testid="ig-treg-fb-page-btn"
                        className="w-full h-8 px-2.5 rounded-lg bg-[#D97706] hover:bg-[#14161B] text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Connecter via Page Facebook (Reels)
                      </button>
                    </div>
                  );
                })()
              )}

              {/* Primary Connection / Config Buttons */}
              <div className="flex items-center gap-2 pt-1 mt-auto">
                {acc.route === 'treg' && (
                  <button
                    type="button"
                    disabled={connectingProvider === acc.platform}
                    onClick={() => void handleStartTregProvider(acc.platform)}
                    className={`flex-1 h-9 px-3 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                      isTregReady
                        ? 'bg-[#059669] hover:bg-[#14161B]'
                        : 'bg-[#258EFF] hover:bg-[#14161B]'
                    }`}
                  >
                    {connectingProvider === acc.platform ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {isTregReady ? 'Reconnecter (Treg)' : 'Connecter en 1 clic'}
                  </button>
                )}

                {acc.route === 'oauth' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!acc.oauthConfigured) {
                        setExpandedPlatform(acc.platform);
                        onNotify?.(
                          `Renseignez votre Client ID + Secret ${acc.label} ci-dessous (ou basculez sur « Treg 1-Clic »).`,
                          true
                        );
                        return;
                      }
                      void onStartOAuth(acc.platform);
                    }}
                    className={`flex-1 h-9 px-3 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                      acc.oauthConfigured
                        ? 'bg-[#14161B] hover:bg-[#258EFF]'
                        : 'bg-[#5C5F68] hover:bg-[#14161B]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {acc.connected
                      ? 'Reconnecter OAuth'
                      : acc.oauthConfigured
                        ? 'Connecter OAuth'
                        : 'Configurer OAuth'}
                  </button>
                )}

                {acc.route === 'manual' && (
                  <div className="flex-1 text-[11px] font-medium text-[#059669] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Kit MP4 + Cover prêt
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
                      <span>
                        URL Callback OAuth ({acc.oauthConfigured ? 'Clés prêtes' : 'Clés à saisir'})
                      </span>
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
                      Variables env : <span className="font-mono">{ENV_HINT[acc.platform]}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-[#5C5F68]">
                      Identifiants OAuth directs (sauvegardés sur le serveur)
                    </div>
                    <input
                      type="text"
                      aria-label={`Client ID ${acc.label}`}
                      value={clientIdInputs[acc.platform] ?? ''}
                      onChange={(e) =>
                        setClientIdInputs((p) => ({ ...p, [acc.platform]: e.target.value }))
                      }
                      placeholder={
                        acc.hasCustomClientCredentials
                          ? 'Client ID enregistré (saisir pour remplacer)'
                          : 'Client ID / Client Key OAuth'
                      }
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B] font-mono"
                    />
                    <input
                      type="password"
                      aria-label={`Client Secret ${acc.label}`}
                      value={clientSecretInputs[acc.platform] ?? ''}
                      onChange={(e) =>
                        setClientSecretInputs((p) => ({
                          ...p,
                          [acc.platform]: e.target.value,
                        }))
                      }
                      placeholder={
                        acc.hasCustomClientCredentials
                          ? 'Client Secret enregistré (saisir pour remplacer)'
                          : 'Client Secret OAuth'
                      }
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B] font-mono"
                    />

                    <label
                      htmlFor={`handle-${acc.platform}`}
                      className="block font-semibold text-[#5C5F68] pt-1"
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
                        value={igIdInput || acc.igUserId || ''}
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
                      placeholder="Access Token direct (optionnel)"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-xs text-[#14161B] font-mono"
                    />

                    <button
                      type="button"
                      disabled={savingPlatform === acc.platform}
                      onClick={() => void handleSaveManualConfig(acc.platform)}
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
