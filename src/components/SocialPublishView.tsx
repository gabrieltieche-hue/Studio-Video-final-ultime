import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Server,
} from 'lucide-react';
import type { ShortProject } from '../types/studio';
import type {
  HostingDiagnostics,
  PublishLogEntry,
  PublishRoute,
  ScheduledPostItem,
  SchedulerState,
  SocialAccountConfig,
  SocialConnectionProbeResult,
  SocialPlatform,
  TregSessionPublic,
} from '../types/social';
import { SocialAccountsPanel } from './social/SocialAccountsPanel';
import { ChannelBrandingPanel } from './social/ChannelBrandingPanel';
import { ScheduleComposer } from './social/ScheduleComposer';
import { PublishQueuePanel } from './social/PublishQueuePanel';
import { ManualKitModal } from './social/ManualKitModal';

interface SocialPublishViewProps {
  projects: ShortProject[];
  activeProject: ShortProject | null;
}

export const SocialPublishView: React.FC<SocialPublishViewProps> = ({
  projects,
  activeProject,
}) => {
  const [accounts, setAccounts] = useState<SocialAccountConfig[]>([]);
  const [callbacks, setCallbacks] = useState<Record<SocialPlatform, string>>({
    youtube: '',
    instagram: '',
    tiktok: '',
  });
  const [tregSession, setTregSession] = useState<TregSessionPublic>({
    loggedIn: false,
    cliInstalled: false,
    connectedPlatforms: [],
    connections: [],
  });
  const [hosting, setHosting] = useState<HostingDiagnostics | null>(null);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [railwayUrlInput, setRailwayUrlInput] = useState<string>(() => {
    try {
      return window.localStorage.getItem('studio_short_railway_url') || '';
    } catch {
      return '';
    }
  });
  const [includeTregInRailway, setIncludeTregInRailway] = useState(true);
  const [railwayEnvBlock, setRailwayEnvBlock] = useState('');
  const [copiedRailwayEnv, setCopiedRailwayEnv] = useState(false);
  const [scheduler, setScheduler] = useState<SchedulerState>({
    enabled: true,
    intervalSeconds: 15,
    running: false,
    totalTicks: 0,
    totalPublished: 0,
  });
  const [queue, setQueue] = useState<ScheduledPostItem[]>([]);
  const [logs, setLogs] = useState<PublishLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTick, setRunningTick] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [kitJob, setKitJob] = useState<ScheduledPostItem | null>(null);
  const [testResults, setTestResults] = useState<
    Partial<Record<SocialPlatform, SocialConnectionProbeResult>>
  >({});
  const [testingPlatform, setTestingPlatform] = useState<SocialPlatform | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [pendingOAuthFlow, setPendingOAuthFlow] = useState<{
    platform: SocialPlatform;
    url: string;
  } | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statusRes, queueRes] = await Promise.all([
        fetch('/api/social/status', { credentials: 'same-origin' }),
        fetch('/api/social/queue', { credentials: 'same-origin' }),
      ]);
      if (statusRes.ok) {
        const sData = (await statusRes.json()) as {
          accounts?: SocialAccountConfig[];
          callbacks?: Record<SocialPlatform, string>;
          tregSession?: TregSessionPublic;
          hosting?: HostingDiagnostics;
          scheduler?: SchedulerState;
        };
        if (sData.accounts) setAccounts(sData.accounts);
        if (sData.callbacks) setCallbacks(sData.callbacks);
        if (sData.tregSession) setTregSession(sData.tregSession);
        if (sData.hosting) setHosting(sData.hosting);
        if (sData.scheduler) setScheduler(sData.scheduler);
      }
      if (queueRes.ok) {
        const qData = (await queueRes.json()) as {
          queue?: ScheduledPostItem[];
          logs?: PublishLogEntry[];
          scheduler?: SchedulerState;
        };
        if (qData.queue) setQueue(qData.queue);
        if (qData.logs) setLogs(qData.logs);
        if (qData.scheduler) setScheduler(qData.scheduler);
      }
    } catch (err) {
      if (!silent) {
        setErrorBanner(
          err instanceof Error ? err.message : 'Erreur chargement publication'
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchRailwayEnv = useCallback(async (includeSession: boolean) => {
    try {
      const res = await fetch('/api/social/deploy/railway-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeTregSession: includeSession }),
      });
      if (res.ok) {
        const data = (await res.json()) as { envBlock?: string };
        if (data.envBlock) setRailwayEnvBlock(data.envBlock);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (showDeployGuide) {
      void fetchRailwayEnv(includeTregInRailway);
    }
  }, [showDeployGuide, includeTregInRailway, fetchRailwayEnv]);

  useEffect(() => {
    if (!railwayUrlInput && hosting?.syncedRailwayUrl) {
      setRailwayUrlInput(hosting.syncedRailwayUrl);
    }
  }, [hosting?.syncedRailwayUrl, railwayUrlInput]);

  useEffect(() => {
    void loadAll(false);
    const timer = setInterval(() => {
      void loadAll(true);
    }, 10_000);
    return () => clearInterval(timer);
  }, [loadAll]);

  // Listen for OAuth popup completion messages
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setPendingOAuthFlow(null);
        setBanner(`Compte ${event.data.platform || ''} connecté via OAuth.`);
        setErrorBanner(null);
        void loadAll(true);
        setTimeout(() => setBanner(null), 4000);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setPendingOAuthFlow(null);
        setErrorBanner(event.data.error || 'Échec connexion OAuth.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadAll]);

  const handleToggleScheduler = async () => {
    setErrorBanner(null);
    const res = await fetch('/api/social/scheduler/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !scheduler.enabled }),
    });
    const data = (await res.json()) as { scheduler?: SchedulerState; error?: string };
    if (!res.ok) {
      setErrorBanner(data.error || 'Impossible de modifier le planificateur.');
      return;
    }
    if (data.scheduler) setScheduler(data.scheduler);
  };

  const handleRunCronNow = async () => {
    if (runningTick) return;
    setRunningTick(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/social/scheduler/run-now', { method: 'POST' });
      const data = (await res.json()) as {
        summary?: {
          processed: number;
          published: number;
          awaitingManual: number;
          failed: number;
        };
        queue?: ScheduledPostItem[];
        logs?: PublishLogEntry[];
        scheduler?: SchedulerState;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Échec exécution cron');
      if (data.queue) setQueue(data.queue);
      if (data.logs) setLogs(data.logs);
      if (data.scheduler) setScheduler(data.scheduler);
      const s = data.summary;
      setBanner(
        s && s.processed > 0
          ? `Cycle cron exécuté : ${s.processed} traité(s) (${s.published} publié(s), ${s.awaitingManual} kit manuel, ${s.failed} échec).`
          : 'Cycle cron exécuté : aucune publication arrivée à échéance.'
      );
      setTimeout(() => setBanner(null), 4000);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Erreur cron');
    } finally {
      setRunningTick(false);
    }
  };

  const handleUpdateAccount = async (
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
      tregConnectionId?: string;
      tregConnectionName?: string;
    }
  ) => {
    setErrorBanner(null);
    const res = await fetch(`/api/social/accounts/${encodeURIComponent(platform)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { account?: SocialAccountConfig; error?: string };
    if (!res.ok) {
      setErrorBanner(data.error || 'Erreur mise à jour compte');
      return;
    }
    if (data.account) {
      setAccounts((prev) =>
        prev.map((a) => (a.platform === platform ? data.account! : a))
      );
    }
    if (patch.tregConnectionId || patch.route) {
      void loadAll(true);
    }
  };

  const handleTestPlatform = async (platform: SocialPlatform) => {
    if (testingPlatform || testingAll) return;
    setTestingPlatform(platform);
    setErrorBanner(null);
    try {
      const res = await fetch(
        `/api/social/accounts/${encodeURIComponent(platform)}/test`,
        { method: 'POST' }
      );
      const data = (await res.json()) as {
        success?: boolean;
        result?: SocialConnectionProbeResult;
        account?: SocialAccountConfig;
        tregSession?: TregSessionPublic;
        error?: string;
      };
      if (!res.ok || !data.result) {
        throw new Error(data.error || `Test ${platform} impossible.`);
      }
      setTestResults((prev) => ({ ...prev, [platform]: data.result! }));
      if (data.account) {
        setAccounts((prev) =>
          prev.map((a) => (a.platform === platform ? data.account! : a))
        );
      }
      if (data.tregSession) setTregSession(data.tregSession);
      if (data.result.ok) {
        setBanner(
          data.result.warning
            ? `${data.result.detail} (${data.result.warning})`
            : data.result.detail
        );
      } else {
        setErrorBanner(data.result.detail);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Erreur test connexion');
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleTestAll = async () => {
    if (testingAll || testingPlatform) return;
    setTestingAll(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/social/test-connections', { method: 'POST' });
      const data = (await res.json()) as {
        results?: SocialConnectionProbeResult[];
        accounts?: SocialAccountConfig[];
        tregSession?: TregSessionPublic;
        queue?: ScheduledPostItem[];
        error?: string;
      };
      if (!res.ok || !data.results) {
        throw new Error(data.error || 'Diagnostic global impossible.');
      }
      const nextMap: Partial<Record<SocialPlatform, SocialConnectionProbeResult>> = {};
      for (const r of data.results) {
        nextMap[r.platform] = r;
      }
      setTestResults(nextMap);
      if (data.accounts) setAccounts(data.accounts);
      if (data.tregSession) setTregSession(data.tregSession);
      if (data.queue) setQueue(data.queue);
      const okCount = data.results.filter((r) => r.ok).length;
      setBanner(
        `Diagnostic terminé : ${okCount}/${data.results.length} réseau(x) prêts pour la publication automatique.`
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Erreur diagnostic');
    } finally {
      setTestingAll(false);
    }
  };

  const handleRetryAllQueue = async () => {
    if (retryingAll) return;
    setRetryingAll(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/social/queue/retry-all', { method: 'POST' });
      const data = (await res.json()) as {
        retriedCount?: number;
        publishedCount?: number;
        queue?: ScheduledPostItem[];
        logs?: PublishLogEntry[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Relance groupée impossible.');
      }
      if (data.queue) setQueue(data.queue);
      if (data.logs) setLogs(data.logs);
      await loadAll(true);
      setBanner(
        data.retriedCount
          ? `Relance terminée : ${data.publishedCount || 0}/${data.retriedCount} publication(s) envoyée(s).`
          : 'Aucune publication récupérable dans la file.'
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Erreur relance file');
    } finally {
      setRetryingAll(false);
    }
  };

  const handleNotify = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setBanner(null);
    } else {
      setBanner(msg);
      setErrorBanner(null);
      setTimeout(() => setBanner(null), 4500);
    }
  };

  const handleStartOAuth = async (platform: SocialPlatform) => {
    setErrorBanner(null);
    const res = await fetch(`/api/social/oauth/${encodeURIComponent(platform)}/url`, {
      credentials: 'same-origin',
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setErrorBanner(data.error || 'Impossible de générer l’URL OAuth.');
      return;
    }
    setPendingOAuthFlow({ platform, url: data.url });
  };

  useEffect(() => {
    if (!pendingOAuthFlow) return;
    const match = accounts.find((a) => a.platform === pendingOAuthFlow.platform);
    if (match?.connected) {
      setBanner(`Compte ${match.label} connecté via OAuth.`);
      setPendingOAuthFlow(null);
      return;
    }
    const timer = setInterval(() => {
      void loadAll(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [pendingOAuthFlow, accounts, loadAll]);

  const handleDisconnect = async (platform: SocialPlatform) => {
    await fetch(`/api/social/accounts/${encodeURIComponent(platform)}/disconnect`, {
      method: 'POST',
    });
    await loadAll(true);
  };

  const handleSchedule = async (payload: {
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
  }) => {
    setErrorBanner(null);
    const res = await fetch('/api/social/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      queue?: ScheduledPostItem[];
      logs?: PublishLogEntry[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'Échec de la programmation');
    }
    if (data.queue) setQueue(data.queue);
    if (data.logs) setLogs(data.logs);
  };

  const handlePublishJobNow = async (jobId: string) => {
    setErrorBanner(null);
    const res = await fetch(
      `/api/social/queue/${encodeURIComponent(jobId)}/publish-now`,
      { method: 'POST' }
    );
    const data = (await res.json()) as {
      queue?: ScheduledPostItem[];
      logs?: PublishLogEntry[];
      error?: string;
    };
    if (!res.ok) {
      setErrorBanner(data.error || 'Échec publication immédiate');
      return;
    }
    if (data.queue) setQueue(data.queue);
    if (data.logs) setLogs(data.logs);
    await loadAll(true);
  };

  const handleCancelJob = async (jobId: string) => {
    const res = await fetch(`/api/social/queue/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
    });
    const data = (await res.json()) as { queue?: ScheduledPostItem[] };
    if (res.ok && data.queue) setQueue(data.queue);
  };

  const handleConfirmManual = async (jobId: string, publishedUrl: string) => {
    const res = await fetch(`/api/social/queue/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'published',
        publishedUrl,
      }),
    });
    const data = (await res.json()) as { queue?: ScheduledPostItem[] };
    if (res.ok && data.queue) {
      setQueue(data.queue);
      await loadAll(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-xs text-[#5C5F68] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#258EFF]" />
        Chargement du système de publication automatique…
      </div>
    );
  }

  return (
    <section className="w-full max-w-[1220px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Top Scheduler Header */}
      <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#258EFF]">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
            PLANIFICATEUR SERVEUR INTÉGRÉ · PUBLICATION AUTOMATIQUE
          </div>
          <h1
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Réseaux sociaux, programmation &amp; envoi automatique
          </h1>
          <p className="text-xs text-[#5C5F68] tabular-nums">
            Cycle cron toutes les {scheduler.intervalSeconds} s · {scheduler.totalTicks} vérifications ·{' '}
            {scheduler.totalPublished} publication(s) automatique(s)
            {scheduler.lastTickAt
              ? ` · Dernier tick ${scheduler.lastTickAt.slice(11, 19)} UTC`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => void handleToggleScheduler()}
            aria-pressed={scheduler.enabled}
            data-testid="scheduler-toggle-btn"
            className={`h-10 px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              scheduler.enabled
                ? 'bg-[#059669]/10 border-[#059669]/30 text-[#059669]'
                : 'bg-[#F6F5F1] border-[#E3DED3] text-[#5C5F68]'
            }`}
          >
            {scheduler.enabled ? (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                Cron actif
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                Cron en pause
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleRunCronNow()}
            disabled={runningTick}
            data-testid="run-cron-now-btn"
            className="h-10 px-4 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {runningTick ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Exécuter le cycle cron
          </button>
        </div>
      </div>

      {/* Calm Publication Readiness & Optional 24/7 Automation Drawer */}
      {hosting && (
        <div className="rounded-2xl border border-[#E3DED3] bg-[#FCFBF8] p-3.5 space-y-2.5 text-xs shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2.5">
              <Server
                className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                  hosting.isAlwaysOn ? 'text-[#059669]' : 'text-[#258EFF]'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="font-bold text-[#14161B]">
                  {hosting.isAlwaysOn
                    ? 'Prêt à publier 24h/24 · Publication autonome active'
                    : 'Prêt à publier · Synchronisé avec votre studio 24h/24'}
                </div>
                <p className="text-[11px] text-[#5C5F68]">
                  {hosting.isAlwaysOn
                    ? 'Les vidéos synchronisées et vos publications planifiées tournent en continu, même appareil éteint.'
                    : 'Programmez vos Shorts ici normalement. La synchronisation GitHub et Railway garde vos vidéos accessibles partout.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
              {!hosting.isAlwaysOn && /^https?:\/\//i.test(railwayUrlInput.trim()) && (
                <a
                  href={`${railwayUrlInput.trim().replace(/\/+$/, '')}/?tab=publish`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg bg-[#258EFF] hover:bg-[#14161B] text-[11px] font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  Ouvrir Railway
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowDeployGuide((v) => !v)}
                aria-expanded={showDeployGuide}
                className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-[11px] font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                Automatisation 24h/24 (Optionnel)
                {showDeployGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {showDeployGuide && (
            <div className="pt-3 border-t border-[#E3DED3] space-y-3 text-[11px] text-[#14161B]">
              {!hosting.isAlwaysOn && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label
                    htmlFor="railway-shortcut-input"
                    className="text-[11px] font-semibold text-[#14161B] whitespace-nowrap"
                  >
                    URL de votre serveur Railway :
                  </label>
                  <input
                    id="railway-shortcut-input"
                    type="url"
                    value={railwayUrlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRailwayUrlInput(val);
                      try {
                        window.localStorage.setItem('studio_short_railway_url', val);
                      } catch {
                        // ignore storage error
                      }
                    }}
                    placeholder="https://votre-app.up.railway.app"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-white font-mono text-[11px] text-[#14161B]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-[#E3DED3] space-y-1.5">
                  <div className="font-bold">1. Déployer le dépôt sur Railway</div>
                  <p className="text-[#5C5F68]">
                    Dans Railway → <span className="font-semibold">Deploy from GitHub repo</span>{' '}
                    → choisissez <span className="font-mono">Studio-Video-final-ultime</span>. Le{' '}
                    <span className="font-mono">Dockerfile</span> installe Node 22, Chromium et FFmpeg.
                  </p>
                  <a
                    href="https://railway.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 px-2.5 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    Ouvrir Railway
                  </a>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E3DED3] space-y-1">
                  <div className="font-bold">2. Volume /app/storage + Domaine</div>
                  <p className="text-[#5C5F68]">
                    Sur le service Railway : <span className="font-semibold">Attach Volume</span>{' '}
                    sur <span className="font-mono">/app/storage</span>, puis{' '}
                    <span className="font-semibold">Settings → Networking → Generate Domain</span>.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E3DED3] space-y-1">
                  <div className="font-bold">3. Synchronisation directe</div>
                  <p className="text-[#5C5F68]">
                    Une fois l&apos;URL Railway enregistrée dans le bloc Synchroniser de l&apos;accueil,
                    vos nouveaux Shorts et MP4 sont envoyés en 1 clic.
                  </p>
                </div>
              </div>

              {/* Turnkey Railway Raw Editor Copy Block */}
              <div className="p-3 rounded-xl bg-white border border-[#E3DED3] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs text-[#14161B]">
                      Variables Railway prêtes à coller (Variables → Raw Editor)
                    </div>
                    <p className="text-[11px] text-[#5C5F68]">
                      Incluez votre session Treg actuelle pour que YouTube, Instagram et TikTok soient prêts dès le démarrage.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#14161B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTregInRailway}
                        onChange={(e) => setIncludeTregInRailway(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#258EFF] cursor-pointer"
                      />
                      Inclure ma session Treg
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!railwayEnvBlock) return;
                        try {
                          await navigator.clipboard.writeText(railwayEnvBlock);
                          setCopiedRailwayEnv(true);
                          setTimeout(() => setCopiedRailwayEnv(false), 2000);
                          handleNotify('Variables Railway copiées.');
                        } catch {
                          handleNotify('Sélectionnez le bloc ci-dessous et copiez manuellement.', true);
                        }
                      }}
                      className="h-8 px-3 rounded-lg bg-[#258EFF] hover:bg-[#14161B] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      {copiedRailwayEnv ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      Copier pour Railway
                    </button>
                  </div>
                </div>
                {railwayEnvBlock && (
                  <pre className="p-2.5 rounded-lg bg-[#F6F5F1] border border-[#E3DED3] font-mono text-[10px] text-[#14161B] overflow-x-auto whitespace-pre-wrap break-all">
                    {railwayEnvBlock}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(banner || errorBanner) && (
        <div
          role="status"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold ${
            errorBanner
              ? 'bg-[#DC2626]/10 border-[#DC2626]/25 text-[#DC2626]'
              : 'bg-[#059669]/10 border-[#059669]/25 text-[#059669]'
          }`}
        >
          {errorBanner || banner}
        </div>
      )}

      {/* Social Connections */}
      <SocialAccountsPanel
        accounts={accounts}
        callbacks={callbacks}
        tregSession={tregSession}
        hosting={hosting}
        testResults={testResults}
        testingPlatform={testingPlatform}
        testingAll={testingAll}
        onTestPlatform={handleTestPlatform}
        onTestAll={handleTestAll}
        onUpdateAccount={handleUpdateAccount}
        onStartOAuth={handleStartOAuth}
        onDisconnect={handleDisconnect}
        onRefreshStatus={async () => {
          await fetch('/api/social/treg/sync', { method: 'POST' }).catch(() => undefined);
          await loadAll(true);
        }}
        onNotify={handleNotify}
        pendingOAuthFlow={pendingOAuthFlow}
        onClearPendingOAuth={() => setPendingOAuthFlow(null)}
      />

      {/* Channel Branding Kit */}
      <ChannelBrandingPanel onNotify={handleNotify} />

      {/* Composer + Queue */}
      <ScheduleComposer
        projects={projects}
        activeProject={activeProject}
        accounts={accounts}
        onSchedule={handleSchedule}
      />

      <PublishQueuePanel
        queue={queue}
        logs={logs}
        accounts={accounts}
        retryingAll={retryingAll}
        onRetryAll={handleRetryAllQueue}
        onPublishNow={handlePublishJobNow}
        onCancelJob={handleCancelJob}
        onOpenManualKit={(job) => setKitJob(job)}
      />

      <ManualKitModal
        job={kitJob}
        onClose={() => setKitJob(null)}
        onConfirmPublished={handleConfirmManual}
      />
    </section>
  );
};
