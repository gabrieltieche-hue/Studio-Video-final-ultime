import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  Film,
  Layers,
  Loader2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Square,
  XCircle,
} from 'lucide-react';
import {
  LOOK_PRESETS,
  MUSIC_BEDS,
  type LookId,
  type MusicBedId,
} from '../data/shortSpec';
import { getBlueprintLabel } from '../engine/batchShortBuilder';
import { computeCompositeViralScore, type TopicCsvRow } from '../engine/topicCsv';
import type { BatchItemStep, BatchJobRecord, BatchSourceMode } from '../types/batch';
import type { SocialPlatform } from '../types/social';

interface BatchCreateViewProps {
  onRefreshWorkspace: (preferId?: string) => Promise<void>;
  onOpenProjectInPlayer: (projectId: string) => Promise<void>;
  onOpenProjectInStudio: (projectId: string) => Promise<void>;
  onOpenPublish: () => void;
}

const STEP_LABELS: Record<BatchItemStep, string> = {
  queued: 'En file',
  scripting: 'Script IA',
  voiceover: 'Voix FR',
  rendering: 'Rendu MP4',
  scheduling: 'Planification',
  done: 'Prêt',
  error: 'Erreur',
  cancelled: 'Annulé',
};

function defaultScheduleStartLocal(): string {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const BatchCreateView: React.FC<BatchCreateViewProps> = ({
  onRefreshWorkspace,
  onOpenProjectInPlayer,
  onOpenProjectInStudio,
  onOpenPublish,
}) => {
  const [sourceMode, setSourceMode] = useState<BatchSourceMode>('csv');
  const [csvRows, setCsvRows] = useState<TopicCsvRow[]>([]);
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [showProducedCsv, setShowProducedCsv] = useState(false);

  const [researchCount, setResearchCount] = useState<number>(3);
  const [researchFocus, setResearchFocus] = useState('');
  const [customTopicsText, setCustomTopicsText] = useState(
    [
      'IA | Les agents IA remplacent-ils les juniors en 2026 ? | Focus -28% d’embauches tech',
      'Business | Pourquoi 90 % des freelances sous-facturent leur temps | Calcul coût réel',
      'Conseils de vie | La règle des 5 minutes contre la fatigue numérique',
    ].join('\n')
  );

  const [lookId, setLookId] = useState<LookId>('papier');
  const [musicTrack, setMusicTrack] = useState<MusicBedId>('upbeat');
  const [speed, setSpeed] = useState<number>(1.05);
  const [renderMp4, setRenderMp4] = useState<boolean>(true);

  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState<boolean>(false);
  const [schedulePlatforms, setSchedulePlatforms] = useState<SocialPlatform[]>(['youtube', 'instagram']);
  const [scheduleStartLocal, setScheduleStartLocal] = useState<string>(defaultScheduleStartLocal);
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState<number>(24);
  const [schedulePrivacy, setSchedulePrivacy] = useState<'public' | 'unlisted' | 'private'>('public');

  const [jobs, setJobs] = useState<BatchJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [bulkScheduling, setBulkScheduling] = useState(false);
  const [showPostScheduleBox, setShowPostScheduleBox] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCsvTopics = useCallback(async () => {
    setLoadingCsv(true);
    try {
      const res = await fetch('/api/topics-csv', { credentials: 'same-origin' });
      const data = (await res.json()) as { rows?: TopicCsvRow[] };
      const all = data.rows || [];
      setCsvRows(all);
      const available = all.filter((r) => r.statut !== 'Produit');
      if (available.length > 0) {
        const sorted = [...available].sort((a, b) => {
          if (a.statut === 'Retenu (Choix IA)' && b.statut !== 'Retenu (Choix IA)') return -1;
          if (b.statut === 'Retenu (Choix IA)' && a.statut !== 'Retenu (Choix IA)') return 1;
          return computeCompositeViralScore(b) - computeCompositeViralScore(a);
        });
        setSelectedTopicIds(sorted.slice(0, Math.min(3, sorted.length)).map((r) => r.id));
      }
    } catch {
      // ignore initial error
    } finally {
      setLoadingCsv(false);
    }
  }, []);

  const loadBatchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/batch/jobs', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs?: BatchJobRecord[] };
      const list = data.jobs || [];
      setJobs(list);
      setSelectedJobId((prev) => {
        if (prev && list.some((j) => j.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch {
      // ignore transient error
    }
  }, []);

  useEffect(() => {
    void loadCsvTopics();
    void loadBatchJobs();
  }, [loadCsvTopics, loadBatchJobs]);

  const lastCompletedRef = useRef<number>(-1);
  const hasRunningJob = useMemo(() => jobs.some((j) => j.status === 'running'), [jobs]);

  useEffect(() => {
    if (!hasRunningJob) {
      lastCompletedRef.current = -1;
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch('/api/batch/jobs', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs?: BatchJobRecord[] };
        const nextList = data.jobs || [];
        setJobs(nextList);

        const totalDone = nextList.reduce((acc, j) => acc + (j.completedCount || 0), 0);
        const stillRunning = nextList.some((j) => j.status === 'running');
        if (lastCompletedRef.current >= 0 && totalDone > lastCompletedRef.current) {
          void onRefreshWorkspace();
          void loadCsvTopics();
        }
        lastCompletedRef.current = totalDone;

        if (!stillRunning) {
          void onRefreshWorkspace();
          void loadCsvTopics();
        }
      } catch {
        // ignore transient poll
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [hasRunningJob, onRefreshWorkspace, loadCsvTopics]);

  const displayedCsvRows = useMemo(() => {
    const filtered = showProducedCsv
      ? csvRows
      : csvRows.filter((r) => r.statut !== 'Produit');
    return [...filtered].sort((a, b) => {
      if (a.statut === 'Retenu (Choix IA)' && b.statut !== 'Retenu (Choix IA)') return -1;
      if (b.statut === 'Retenu (Choix IA)' && a.statut !== 'Retenu (Choix IA)') return 1;
      return computeCompositeViralScore(b) - computeCompositeViralScore(a);
    });
  }, [csvRows, showProducedCsv]);

  const parsedCustomLines = useMemo(
    () =>
      customTopicsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#')),
    [customTopicsText]
  );

  const plannedVideoCount =
    sourceMode === 'csv'
      ? selectedTopicIds.length
      : sourceMode === 'custom'
        ? Math.min(12, parsedCustomLines.length)
        : researchCount;

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId]
  );

  const toggleTopicId = (id: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 10)
    );
  };

  const selectTopN = (n: number) => {
    setSelectedTopicIds(displayedCsvRows.slice(0, n).map((r) => r.id));
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setSchedulePlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleStartBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (starting || plannedVideoCount === 0) return;
    setStarting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const startAtIso = Number.isFinite(Date.parse(scheduleStartLocal))
        ? new Date(scheduleStartLocal).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString();

      const res = await fetch('/api/batch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          sourceMode,
          topicIds: sourceMode === 'csv' ? selectedTopicIds : undefined,
          customTopics: sourceMode === 'custom' ? parsedCustomLines : undefined,
          count: sourceMode === 'research' ? researchCount : plannedVideoCount,
          focus: sourceMode === 'research' ? researchFocus.trim() || undefined : undefined,
          lookId,
          musicTrack,
          speed,
          renderMp4,
          autoSchedule: autoScheduleEnabled
            ? {
                enabled: true,
                platforms: schedulePlatforms,
                startAtIso,
                intervalHours: scheduleIntervalHours,
                privacy: schedulePrivacy,
              }
            : undefined,
        }),
      });
      const data = (await res.json()) as { job?: BatchJobRecord; error?: string };
      if (!res.ok || !data.job) {
        throw new Error(data.error || 'Impossible de lancer le lot.');
      }

      setJobs((prev) => [data.job!, ...prev.filter((j) => j.id !== data.job!.id)]);
      setSelectedJobId(data.job.id);
      setSuccessMsg(`Lot lancé : ${data.job.totalCount} vidéo(s) en file de production.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lancement du lot.');
    } finally {
      setStarting(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/batch/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        await loadBatchJobs();
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleBulkScheduleExisting = async (jobId: string) => {
    if (bulkScheduling || schedulePlatforms.length === 0) return;
    setBulkScheduling(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const startAtIso = Number.isFinite(Date.parse(scheduleStartLocal))
        ? new Date(scheduleStartLocal).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString();

      const res = await fetch(`/api/batch/jobs/${encodeURIComponent(jobId)}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          platforms: schedulePlatforms,
          startAtIso,
          intervalHours: scheduleIntervalHours,
          privacy: schedulePrivacy,
        }),
      });
      const data = (await res.json()) as {
        batch?: BatchJobRecord;
        scheduledJobsCount?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de programmer ce lot.');
      }
      if (data.batch) {
        setJobs((prev) => prev.map((j) => (j.id === data.batch!.id ? data.batch! : j)));
      }
      setShowPostScheduleBox(false);
      setSuccessMsg(
        `${data.scheduledJobsCount || 0} publication(s) programmée(s) automatiquement dans l’onglet Publication.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur programmation en masse.');
    } finally {
      setBulkScheduling(false);
    }
  };

  const overallPct = activeJob
    ? Math.round(
        activeJob.items.reduce((sum, it) => sum + (it.progress || 0), 0) /
          Math.max(1, activeJob.items.length)
      )
    : 0;

  return (
    <section
      data-testid="batch-create-view"
      className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 py-5 space-y-5"
    >
      {/* Header Banner */}
      <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#258EFF] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            USINE À SHORTS · PRODUCTION EN SÉRIE
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Création de vidéos en masse
          </h1>
          <p className="text-sm text-[#5C5F68] max-w-2xl leading-relaxed">
            Générez plusieurs Shorts complets en un clic : script cinétique en 8 séquences,
            B-Roll &amp; motion design, voix off Brian FR (≤ 1.06×), rendu MP4 1080×1920 et planification échelonnée.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2">
            <div className="text-[11px] text-[#5C5F68]">Lots lancés</div>
            <div className="text-base font-extrabold text-[#14161B]">{jobs.length}</div>
          </div>
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2">
            <div className="text-[11px] text-[#5C5F68]">Sujets prêts</div>
            <div className="text-base font-extrabold text-[#258EFF]">
              {csvRows.filter((r) => r.statut !== 'Produit').length}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-xs font-semibold text-[#B91C1C]"
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="rounded-xl border border-[#059669]/30 bg-[#059669]/8 px-4 py-3 text-xs font-semibold text-[#047857] flex flex-wrap items-center justify-between gap-2"
        >
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={onOpenPublish}
            className="underline font-bold cursor-pointer"
          >
            Voir la file Publication →
          </button>
        </div>
      )}

      {/* Main 2-Column Builder & Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Batch Configurator */}
        <form
          onSubmit={handleStartBatch}
          className="lg:col-span-5 bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 space-y-5 shadow-xs"
        >
          {/* Source Selector */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#5C5F68]">
              1 · Source des sujets
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#EAE7DF] rounded-xl">
              <button
                type="button"
                data-testid="batch-source-csv"
                onClick={() => setSourceMode('csv')}
                aria-pressed={sourceMode === 'csv'}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  sourceMode === 'csv'
                    ? 'bg-[#FCFBF8] text-[#14161B] shadow-xs'
                    : 'text-[#5C5F68] hover:text-[#14161B]'
                }`}
              >
                Veille CSV
              </button>
              <button
                type="button"
                data-testid="batch-source-research"
                onClick={() => setSourceMode('research')}
                aria-pressed={sourceMode === 'research'}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  sourceMode === 'research'
                    ? 'bg-[#258EFF] text-white shadow-xs'
                    : 'text-[#5C5F68] hover:text-[#14161B]'
                }`}
              >
                Recherche IA
              </button>
              <button
                type="button"
                data-testid="batch-source-custom"
                onClick={() => setSourceMode('custom')}
                aria-pressed={sourceMode === 'custom'}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  sourceMode === 'custom'
                    ? 'bg-[#14161B] text-white shadow-xs'
                    : 'text-[#5C5F68] hover:text-[#14161B]'
                }`}
              >
                Liste libre
              </button>
            </div>
          </div>

          {/* Source Content */}
          {sourceMode === 'csv' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectTopN(3)}
                    className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white hover:border-[#258EFF] text-[11px] font-semibold text-[#14161B] cursor-pointer"
                  >
                    Top 3
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTopN(5)}
                    className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white hover:border-[#258EFF] text-[11px] font-semibold text-[#14161B] cursor-pointer"
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTopicIds([])}
                    className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white text-[11px] font-medium text-[#5C5F68] hover:text-[#14161B] cursor-pointer"
                  >
                    Aucun
                  </button>
                </div>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5C5F68] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProducedCsv}
                    onChange={(e) => setShowProducedCsv(e.target.checked)}
                    className="accent-[#258EFF]"
                  />
                  Inclure déjà produits
                </label>
              </div>

              {loadingCsv ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#5C5F68]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement des sujets…
                </div>
              ) : displayedCsvRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E3DED3] p-4 text-center text-xs text-[#5C5F68]">
                  Tous les sujets CSV ont déjà été produits. Passez en mode{' '}
                  <button
                    type="button"
                    onClick={() => setSourceMode('research')}
                    className="text-[#258EFF] font-bold underline cursor-pointer"
                  >
                    Recherche IA
                  </button>{' '}
                  ou{' '}
                  <button
                    type="button"
                    onClick={() => setSourceMode('custom')}
                    className="text-[#14161B] font-bold underline cursor-pointer"
                  >
                    Liste libre
                  </button>
                  .
                </div>
              ) : (
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {displayedCsvRows.map((row) => {
                    const checked = selectedTopicIds.includes(row.id);
                    const score = computeCompositeViralScore(row);
                    return (
                      <label
                        key={row.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                          checked
                            ? 'border-[#258EFF] bg-[#258EFF]/5'
                            : 'border-[#E3DED3] bg-white hover:border-[#14161B]/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopicId(row.id)}
                          className="mt-0.5 accent-[#258EFF] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="font-bold text-[#5C5F68]">
                              {row.id} · {row.categorie}
                            </span>
                            <span className="font-extrabold text-[#258EFF] tabular-nums">
                              {score}/100
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[#14161B] leading-snug mt-0.5">
                            {row.theme}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {sourceMode === 'research' && (
            <div className="space-y-3 bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#14161B]">
                  Nombre de vidéos à générer automatiquement
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2, 3, 5, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setResearchCount(n)}
                      aria-pressed={researchCount === n}
                      className={`py-2 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-colors ${
                        researchCount === n
                          ? 'bg-[#258EFF] text-white border-[#258EFF]'
                          : 'bg-white text-[#14161B] border-[#E3DED3]'
                      }`}
                    >
                      {n} Shorts
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="batch-research-focus" className="text-xs font-semibold text-[#14161B]">
                  Thématique ou angle cible (optionnel)
                </label>
                <input
                  id="batch-research-focus"
                  type="text"
                  value={researchFocus}
                  onChange={(e) => setResearchFocus(e.target.value)}
                  placeholder="Ex. : IA générative, pouvoir d'achat, productivité devs…"
                  className="w-full h-10 px-3 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B] focus:outline-2 focus:outline-[#258EFF]"
                />
              </div>
            </div>
          )}

          {sourceMode === 'custom' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="batch-custom-topics" className="text-xs font-semibold text-[#14161B]">
                  1 sujet par ligne (format libre ou <code className="font-mono text-[11px]">Catégorie | Sujet | Angle</code>)
                </label>
                <span className="text-[11px] font-mono font-bold text-[#258EFF] tabular-nums">
                  {parsedCustomLines.length} sujet(s)
                </span>
              </div>
              <textarea
                id="batch-custom-topics"
                data-testid="batch-custom-textarea"
                rows={5}
                value={customTopicsText}
                onChange={(e) => setCustomTopicsText(e.target.value)}
                placeholder="Ex. : IA | Pourquoi les développeurs utilisent 3 agents IA en parallèle"
                className="w-full p-3 rounded-xl border border-[#E3DED3] bg-white text-xs text-[#14161B] leading-relaxed focus:outline-2 focus:outline-[#258EFF]"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCustomTopicsText(
                      [
                        'IA | 3 outils IA gratuits qui remplacent un studio entier | Démo chiffrée',
                        'Tech & Société | Pourquoi les batteries solides arrivent enfin en 2026',
                        'Business | Comment les micro-SaaS atteignent 10k/mois sans équipe',
                      ].join('\n')
                    )
                  }
                  className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white text-[11px] font-medium text-[#5C5F68] hover:text-[#14161B] cursor-pointer"
                >
                  Modèle Tech / SaaS (3)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomTopicsText(
                      [
                        'Actualité | Livret A vs ETF en 2026 : le vrai calcul après inflation',
                        'Politique | Ce qui change vraiment sur ta fiche de paie en janvier',
                      ].join('\n')
                    )
                  }
                  className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white text-[11px] font-medium text-[#5C5F68] hover:text-[#14161B] cursor-pointer"
                >
                  Modèle Éco / Actu (2)
                </button>
              </div>
            </div>
          )}

          {/* Style, Voice & Audio Settings */}
          <div className="space-y-3 pt-2 border-t border-[#E3DED3]">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#5C5F68]">
              2 · Direction artistique &amp; Audio
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(LOOK_PRESETS) as LookId[]).map((id) => {
                const preset = LOOK_PRESETS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLookId(id)}
                    aria-pressed={lookId === id}
                    className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      lookId === id
                        ? 'border-[#258EFF] bg-[#258EFF]/8'
                        : 'border-[#E3DED3] bg-white hover:border-[#14161B]/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: preset.paper }}
                      />
                      <span className="text-[11px] font-bold text-[#14161B] truncate">
                        {preset.label.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="batch-music-select" className="text-[11px] font-semibold text-[#5C5F68]">
                  Musique de fond
                </label>
                <select
                  id="batch-music-select"
                  value={musicTrack}
                  onChange={(e) => setMusicTrack(e.target.value as MusicBedId)}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white text-xs font-medium text-[#14161B] cursor-pointer"
                >
                  {MUSIC_BEDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="batch-speed-select" className="text-[11px] font-semibold text-[#5C5F68]">
                  Rythme voix FR
                </label>
                <select
                  id="batch-speed-select"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E3DED3] bg-white text-xs font-mono font-semibold text-[#14161B] cursor-pointer"
                >
                  <option value={1.0}>1.00× (Posé)</option>
                  <option value={1.05}>1.05× (Recommandé · Brian)</option>
                  <option value={1.06}>1.06× (Max studio)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#E3DED3] bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={renderMp4}
                onChange={(e) => setRenderMp4(e.target.checked)}
                className="accent-[#258EFF]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#14161B]">
                  Exporter chaque vidéo en MP4 1080×1920
                </div>
                <div className="text-[11px] text-[#5C5F68]">
                  Rendu vidéo animé + voix ElevenLabs + musique mixée (-14 LUFS)
                </div>
              </div>
            </label>
          </div>

          {/* Optional Auto-Schedule */}
          <div className="space-y-3 pt-2 border-t border-[#E3DED3]">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#5C5F68]">
                3 · Planification automatique
              </span>
              <input
                type="checkbox"
                checked={autoScheduleEnabled}
                onChange={(e) => setAutoScheduleEnabled(e.target.checked)}
                className="accent-[#059669] w-4 h-4"
              />
            </label>

            {autoScheduleEnabled && (
              <div className="space-y-2.5 bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3">
                <div className="flex flex-wrap gap-1.5">
                  {(['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) => {
                    const active = schedulePlatforms.includes(p);
                    const label = p === 'youtube' ? 'YouTube Shorts' : p === 'instagram' ? 'Instagram Reels' : 'TikTok';
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-pressed={active}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          active
                            ? 'bg-[#059669] text-white border-[#059669]'
                            : 'bg-white text-[#5C5F68] border-[#E3DED3]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="batch-start-at" className="text-[11px] font-semibold text-[#5C5F68]">
                      1ère publication
                    </label>
                    <input
                      id="batch-start-at"
                      type="datetime-local"
                      value={scheduleStartLocal}
                      onChange={(e) => setScheduleStartLocal(e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="batch-interval" className="text-[11px] font-semibold text-[#5C5F68]">
                      Cadence entre vidéos
                    </label>
                    <select
                      id="batch-interval"
                      value={scheduleIntervalHours}
                      onChange={(e) => setScheduleIntervalHours(Number(e.target.value))}
                      className="w-full h-9 px-2 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B]"
                    >
                      <option value={6}>Toutes les 6 heures</option>
                      <option value={12}>Toutes les 12 heures</option>
                      <option value={24}>1 vidéo / jour (24h)</option>
                      <option value={48}>Tous les 2 jours (48h)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="batch-privacy" className="text-[11px] font-semibold text-[#5C5F68]">
                    Visibilité YouTube / TikTok
                  </label>
                  <select
                    id="batch-privacy"
                    value={schedulePrivacy}
                    onChange={(e) =>
                      setSchedulePrivacy(e.target.value as 'public' | 'unlisted' | 'private')
                    }
                    className="w-full h-9 px-2 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B]"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Non répertorié</option>
                    <option value="private">Privé / Brouillon</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            data-testid="launch-batch-btn"
            disabled={starting || plannedVideoCount === 0}
            className="w-full py-3.5 px-5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-55 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lancement du lot en cours…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Lancer la création de {plannedVideoCount} vidéo{plannedVideoCount > 1 ? 's' : ''}
              </>
            )}
          </button>
        </form>

        {/* Right Column: Live Batch Monitor & Generated Outputs */}
        <div className="lg:col-span-7 space-y-4">
          {!activeJob ? (
            <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-11 h-11 rounded-2xl bg-[#F1EEE6] border border-[#E3DED3] flex items-center justify-center mx-auto text-[#258EFF]">
                <Layers className="w-5 h-5" />
              </div>
              <h2
                className="text-lg font-extrabold text-[#14161B]"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                Prêt pour votre première série de Shorts
              </h2>
              <p className="text-xs text-[#5C5F68] max-w-md mx-auto leading-relaxed">
                Sélectionnez vos sujets à gauche (Veille CSV, Recherche IA ou Liste libre), puis
                lancez la production automatisée. Chaque Short apparaîtra ici en temps réel avec
                son lecteur et son fichier MP4.
              </p>
            </div>
          ) : (
            <div
              data-testid="active-batch-panel"
              className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 space-y-4 shadow-xs"
            >
              {/* Batch Header & Progress */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        activeJob.status === 'running'
                          ? 'bg-[#258EFF] text-white'
                          : activeJob.status === 'completed'
                            ? 'bg-[#059669] text-white'
                            : activeJob.status === 'failed'
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-[#14161B] text-white'
                      }`}
                    >
                      {activeJob.status === 'running'
                        ? 'En production'
                        : activeJob.status === 'completed'
                          ? 'Lot terminé'
                          : activeJob.status === 'partial'
                            ? 'Partiel'
                            : activeJob.status === 'cancelled'
                              ? 'Annulé'
                              : 'Échec'}
                    </span>
                    <span className="text-xs font-mono text-[#5C5F68] truncate">
                      {activeJob.id}
                    </span>
                  </div>
                  <h2
                    className="text-base sm:text-lg font-extrabold text-[#14161B] mt-1"
                    style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                  >
                    {activeJob.currentStepLabel}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {activeJob.status === 'running' ? (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancelJob(activeJob.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DC2626]/40 bg-white hover:bg-[#DC2626]/5 text-xs font-bold text-[#DC2626] cursor-pointer"
                    >
                      <Square className="w-3 h-3" />
                      Annuler le reste
                    </button>
                  ) : (
                    activeJob.completedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPostScheduleBox((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:opacity-90 text-xs font-bold text-white cursor-pointer"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        Programmer le lot ({activeJob.completedCount})
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Overall Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[#5C5F68] tabular-nums">
                  <span>
                    {activeJob.completedCount}/{activeJob.totalCount} vidéos terminées
                    {activeJob.failedCount > 0 ? ` · ${activeJob.failedCount} erreur(s)` : ''}
                  </span>
                  <span className="font-bold text-[#14161B]">{overallPct} %</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EAE7DF] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#258EFF] transition-all duration-300"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>

              {/* Optional Post-Batch Bulk Scheduler */}
              {showPostScheduleBox && activeJob.status !== 'running' && (
                <div className="rounded-xl border border-[#059669]/30 bg-[#059669]/5 p-3.5 space-y-3">
                  <div className="text-xs font-bold text-[#14161B]">
                    Programmer les {activeJob.completedCount} vidéo(s) terminées avec décalage automatique
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) => {
                      const active = schedulePlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatform(p)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                            active
                              ? 'bg-[#059669] text-white border-[#059669]'
                              : 'bg-white text-[#5C5F68] border-[#E3DED3]'
                          }`}
                        >
                          {p === 'youtube' ? 'YouTube' : p === 'instagram' ? 'Instagram' : 'TikTok'}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <input
                      type="datetime-local"
                      value={scheduleStartLocal}
                      onChange={(e) => setScheduleStartLocal(e.target.value)}
                      className="h-9 px-2 rounded-lg border border-[#E3DED3] bg-white text-xs"
                    />
                    <select
                      value={scheduleIntervalHours}
                      onChange={(e) => setScheduleIntervalHours(Number(e.target.value))}
                      className="h-9 px-2 rounded-lg border border-[#E3DED3] bg-white text-xs"
                    >
                      <option value={6}>Toutes les 6h</option>
                      <option value={12}>Toutes les 12h</option>
                      <option value={24}>Toutes les 24h</option>
                      <option value={48}>Tous les 2 jours</option>
                    </select>
                    <button
                      type="button"
                      disabled={bulkScheduling || schedulePlatforms.length === 0}
                      onClick={() => void handleBulkScheduleExisting(activeJob.id)}
                      className="h-9 px-3 rounded-lg bg-[#059669] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {bulkScheduling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Confirmer le planning
                    </button>
                  </div>
                </div>
              )}

              {/* Per-Video Items Queue */}
              <div className="space-y-2.5">
                {activeJob.items.map((item) => {
                  const isWorking =
                    item.step === 'scripting' ||
                    item.step === 'voiceover' ||
                    item.step === 'rendering' ||
                    item.step === 'scheduling';
                  return (
                    <div
                      key={`${activeJob.id}-${item.index}`}
                      data-testid={`batch-item-${item.index}`}
                      className="rounded-xl border border-[#E3DED3] bg-white p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                            <span className="font-bold text-[#14161B]">
                              #{item.index}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#F6F5F1] border border-[#E3DED3] font-semibold text-[#5C5F68]">
                              {item.category}
                            </span>
                            {item.blueprintId && (
                              <span className="font-semibold text-[#258EFF]">
                                · {getBlueprintLabel(item.blueprintId)}
                              </span>
                            )}
                            {item.duration && (
                              <span className="text-[#5C5F68] tabular-nums">
                                · {item.duration.toFixed(1)} s
                              </span>
                            )}
                            {item.beatsCount && (
                              <span className="text-[#5C5F68] tabular-nums">
                                · {item.beatsCount} séq.
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-[#14161B] mt-1 leading-snug">
                            {item.theme}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-mono font-bold">
                          {isWorking && <Loader2 className="w-3.5 h-3.5 text-[#258EFF] animate-spin" />}
                          {item.step === 'done' && <CheckCircle2 className="w-4 h-4 text-[#059669]" />}
                          {item.step === 'error' && <XCircle className="w-4 h-4 text-[#DC2626]" />}
                          <span
                            className={
                              item.step === 'done'
                                ? 'text-[#059669]'
                                : item.step === 'error'
                                  ? 'text-[#DC2626]'
                                  : isWorking
                                    ? 'text-[#258EFF]'
                                    : 'text-[#5C5F68]'
                            }
                          >
                            {STEP_LABELS[item.step]}
                            {isWorking ? ` · ${item.progress}%` : ''}
                          </span>
                        </div>
                      </div>

                      {item.error && (
                        <div className="text-xs text-[#B91C1C] bg-[#DC2626]/5 rounded-lg px-2.5 py-1.5">
                          {item.error}
                        </div>
                      )}

                      {item.step === 'done' && item.projectId && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1EEE6]">
                          <div className="text-[11px] font-mono text-[#5C5F68]">
                            {item.scheduledAt
                              ? `Programmé (${item.scheduledCount} réseau(x)) · ${new Date(
                                  item.scheduledAt
                                ).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : `Projet prêt · ${item.projectSlug}`}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void onOpenProjectInPlayer(item.projectId!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Lire
                            </button>
                            <button
                              type="button"
                              onClick={() => void onOpenProjectInStudio(item.projectId!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] hover:border-[#258EFF] text-[#14161B] text-[11px] font-semibold cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              Studio
                            </button>
                            {item.outputMp4Url && (
                              <a
                                href={`/api/studio/projects/${encodeURIComponent(
                                  item.projectId
                                )}/download?version=${encodeURIComponent(item.version || 'v1')}`}
                                download={`${item.projectSlug || 'short'}-hd.mp4`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#258EFF]/40 bg-[#258EFF]/8 hover:bg-[#258EFF] hover:text-white text-[#258EFF] text-[11px] font-bold transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                MP4 HD
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Batch History */}
          {jobs.length > 1 && (
            <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#5C5F68]">
                Historique des lots ({jobs.length})
              </div>
              <div className="space-y-1.5">
                {jobs.map((j) => {
                  const selected = j.id === activeJob?.id;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => setSelectedJobId(j.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-left text-xs cursor-pointer transition-colors ${
                        selected
                          ? 'border-[#258EFF] bg-[#258EFF]/6'
                          : 'border-[#E3DED3] bg-white hover:border-[#14161B]/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Film className="w-3.5 h-3.5 text-[#5C5F68] shrink-0" />
                        <span className="font-bold text-[#14161B] truncate">
                          {j.totalCount} vidéo{j.totalCount > 1 ? 's' : ''} · {j.sourceMode.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#5C5F68] tabular-nums shrink-0">
                        {j.completedCount}/{j.totalCount} ·{' '}
                        {new Date(j.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
