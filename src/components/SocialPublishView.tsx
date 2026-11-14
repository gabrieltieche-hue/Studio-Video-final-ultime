import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import type { ShortProject } from '../types/studio';
import type {
  PublishLogEntry,
  PublishRoute,
  ScheduledPostItem,
  SchedulerState,
  SocialAccountConfig,
  SocialPlatform,
} from '../types/social';
import { SocialAccountsPanel } from './social/SocialAccountsPanel';
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
  const [treg, setTreg] = useState<{
    installed: boolean;
    version?: string;
    connectedPlatforms: SocialPlatform[];
  }>({ installed: false, connectedPlatforms: [] });
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
          treg?: {
            installed: boolean;
            version?: string;
            connectedPlatforms: SocialPlatform[];
          };
          scheduler?: SchedulerState;
        };
        if (sData.accounts) setAccounts(sData.accounts);
        if (sData.callbacks) setCallbacks(sData.callbacks);
        if (sData.treg) setTreg(sData.treg);
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
        setBanner(`Compte ${event.data.platform || ''} connecté via OAuth.`);
        setErrorBanner(null);
        void loadAll(true);
        setTimeout(() => setBanner(null), 4000);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
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
      accessToken?: string;
      igUserId?: string;
      connected?: boolean;
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
    const popup = window.open(data.url, `oauth_${platform}`, 'width=600,height=720');
    if (!popup) {
      setErrorBanner(
        'Popup bloquée par le navigateur : autorisez les fenêtres contextuelles pour finaliser OAuth.'
      );
    }
  };

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
        onPublishNow={handlePublishJobNow}
        onCancelJob={handleCancelJob}
        onOpenManualKit={(job) => setKitJob(job)}
      />

      {/* Social Connections */}
      <SocialAccountsPanel
        accounts={accounts}
        callbacks={callbacks}
        treg={treg}
        onUpdateAccount={handleUpdateAccount}
        onStartOAuth={handleStartOAuth}
        onDisconnect={handleDisconnect}
        onRefreshStatus={() => loadAll(true)}
      />

      <ManualKitModal
        job={kitJob}
        onClose={() => setKitJob(null)}
        onConfirmPublished={handleConfirmManual}
      />
    </section>
  );
};
