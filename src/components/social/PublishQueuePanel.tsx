import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileArchive,
  History,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react';
import type {
  PublishLogEntry,
  ScheduledPostItem,
  ScheduledPostStatus,
} from '../../types/social';
import {
  PLATFORM_META,
  formatScheduleDualTime,
} from '../../engine/socialCopy';

interface PublishQueuePanelProps {
  queue: ScheduledPostItem[];
  logs: PublishLogEntry[];
  onPublishNow: (jobId: string) => Promise<void>;
  onCancelJob: (jobId: string) => Promise<void>;
  onOpenManualKit: (job: ScheduledPostItem) => void;
}

const STATUS_LABEL: Record<ScheduledPostStatus, string> = {
  scheduled: 'Programmé',
  preparing: 'Préparation média',
  publishing: 'Publication',
  awaiting_manual: 'Kit Manuel prêt',
  published: 'Publié',
  failed: 'Échec',
  cancelled: 'Annulé',
};

const STATUS_STYLE: Record<ScheduledPostStatus, string> = {
  scheduled: 'text-[#258EFF]',
  preparing: 'text-[#D97706]',
  publishing: 'text-[#258EFF]',
  awaiting_manual: 'text-[#D97706]',
  published: 'text-[#059669]',
  failed: 'text-[#DC2626]',
  cancelled: 'text-[#5C5F68]',
};

export const PublishQueuePanel: React.FC<PublishQueuePanelProps> = ({
  queue,
  logs,
  onPublishNow,
  onCancelJob,
  onOpenManualKit,
}) => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'manual' | 'published' | 'failed'>('all');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const counts = useMemo(() => {
    return {
      all: queue.length,
      scheduled: queue.filter((j) =>
        ['scheduled', 'preparing', 'publishing'].includes(j.status)
      ).length,
      manual: queue.filter((j) => j.status === 'awaiting_manual').length,
      published: queue.filter((j) => j.status === 'published').length,
      failed: queue.filter((j) => j.status === 'failed').length,
    };
  }, [queue]);

  const filtered = useMemo(() => {
    return queue.filter((j) => {
      if (filter === 'scheduled') {
        return ['scheduled', 'preparing', 'publishing'].includes(j.status);
      }
      if (filter === 'manual') return j.status === 'awaiting_manual';
      if (filter === 'published') return j.status === 'published';
      if (filter === 'failed') return j.status === 'failed';
      return true;
    });
  }, [queue, filter]);

  const handleRun = async (id: string) => {
    setRunningId(id);
    try {
      await onPublishNow(id);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <section
      aria-label="File de planification et historique"
      className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3DED3]">
        <div>
          <h2
            className="text-base font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            File de planification &amp; Publications automatiques
          </h2>
          <p className="text-xs text-[#5C5F68]">
            Sauvegardée sur le serveur · exécutée automatiquement à l’échéance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogs((s) => !s)}
          aria-expanded={showLogs}
          className="h-8 px-3 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <History className="w-3.5 h-3.5 text-[#5C5F68]" aria-hidden="true" />
          Journal cron ({logs.length})
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EAE7DF] overflow-x-auto">
        {(
          [
            { id: 'all', label: `Tous (${counts.all})` },
            { id: 'scheduled', label: `Programmés (${counts.scheduled})` },
            { id: 'manual', label: `À finaliser (${counts.manual})` },
            { id: 'published', label: `Publiés (${counts.published})` },
            { id: 'failed', label: `Échecs (${counts.failed})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#FCFBF8] text-[#14161B] shadow-xs'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[#E3DED3] bg-white text-center space-y-1.5">
          <Clock className="w-6 h-6 text-[#258EFF] mx-auto opacity-80" aria-hidden="true" />
          <p className="text-xs font-bold text-[#14161B]">
            Aucune publication dans cette vue
          </p>
          <p className="text-[11px] text-[#5C5F68]">
            Sélectionnez un Short ci-dessus, choisissez vos réseaux et programmez une date/heure pour démarrer l’automatisation.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E3DED3] border border-[#E3DED3] rounded-xl bg-white overflow-hidden">
          {filtered.map((job) => {
            const dual = formatScheduleDualTime(job.scheduledAt);
            const isBusy = runningId === job.id;

            return (
              <article
                key={job.id}
                data-testid={`queue-item-${job.id}`}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F6F5F1]/60 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#14161B] truncate max-w-[260px]">
                      {job.projectTitle}
                    </span>
                    <span className="text-[11px] text-[#5C5F68] font-mono">
                      · {job.version} · {PLATFORM_META[job.platform].name} · {job.route}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#5C5F68] tabular-nums flex-wrap">
                    <span className={`font-bold inline-flex items-center gap-1 ${STATUS_STYLE[job.status]}`}>
                      {job.status === 'published' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : job.status === 'failed' ? (
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {STATUS_LABEL[job.status]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{dual.localLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[10px]">{dual.relativeLabel}</span>
                  </div>

                  {(job.errorMessage || job.notes) && (
                    <p
                      className={`text-[11px] leading-snug ${
                        job.errorMessage ? 'text-[#DC2626]' : 'text-[#5C5F68]'
                      }`}
                    >
                      {job.errorMessage || job.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {job.publishedUrl && (
                    <a
                      href={job.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-2.5 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#059669] text-[11px] font-semibold text-[#059669] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      Voir le post
                    </a>
                  )}

                  {(job.status === 'awaiting_manual' || job.route === 'manual') &&
                    job.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => onOpenManualKit(job)}
                        className="h-8 px-2.5 rounded-lg bg-[#D97706] hover:opacity-90 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <FileArchive className="w-3 h-3" aria-hidden="true" />
                        Kit Manuel
                      </button>
                    )}

                  {['scheduled', 'failed'].includes(job.status) && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRun(job.id)}
                      className="h-8 px-2.5 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" aria-hidden="true" />
                      )}
                      Exécuter
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void onCancelJob(job.id)}
                    aria-label={`Supprimer la publication ${job.projectTitle} sur ${PLATFORM_META[job.platform].name}`}
                    className="h-8 w-8 rounded-lg border border-[#E3DED3] bg-white hover:border-[#DC2626] hover:text-[#DC2626] text-[#5C5F68] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cron Execution Logs */}
      {showLogs && (
        <div className="rounded-xl border border-[#E3DED3] bg-[#F6F5F1] p-3 space-y-2">
          <h3 className="text-xs font-bold text-[#14161B]">
            Historique du planificateur serveur
          </h3>
          {logs.length === 0 ? (
            <p className="text-[11px] text-[#5C5F68]">Aucun événement enregistré pour l’instant.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-[#14161B] tabular-nums"
                >
                  <span className="text-[#5C5F68] shrink-0">
                    {log.timestamp.slice(11, 19)}
                  </span>
                  <span
                    className={`shrink-0 font-bold ${
                      log.level === 'success'
                        ? 'text-[#059669]'
                        : log.level === 'error'
                          ? 'text-[#DC2626]'
                          : log.level === 'warn'
                            ? 'text-[#D97706]'
                            : 'text-[#258EFF]'
                    }`}
                  >
                    [{log.platform}]
                  </span>
                  <span className="min-w-0 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
