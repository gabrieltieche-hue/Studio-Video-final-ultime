import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Table2,
  TrendingUp,
} from 'lucide-react';
import {
  computeCompositeViralScore,
  filterTopicRows,
  TOPIC_CATEGORIES,
  type TopicCsvRow,
  type TopicStatus,
} from '../engine/topicCsv';

interface GroundingSource {
  title: string;
  uri: string;
}

interface ResearchBrief {
  pillar: string;
  summary: string;
}

const STATUS_BADGE: Record<TopicStatus, string> = {
  'Retenu (Choix IA)': 'bg-[#258EFF] text-white border-[#258EFF]',
  Produit: 'bg-[#14161B] text-white border-[#14161B]',
  Candidat: 'bg-[#F1EEE6] text-[#5C5F68] border-[#E3DED3]',
};

interface TopicResearchViewProps {
  onCreateProjectFromTopic?: (row: TopicCsvRow) => Promise<void>;
  onOpenBatch?: () => void;
}

export const TopicResearchView: React.FC<TopicResearchViewProps> = ({
  onCreateProjectFromTopic,
  onOpenBatch,
}) => {
  const [rows, setRows] = useState<TopicCsvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusInput, setFocusInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [researchBriefs, setResearchBriefs] = useState<ResearchBrief[]>([]);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);
  const [openSpotlight, setOpenSpotlight] = useState(true);
  const [openBriefs, setOpenBriefs] = useState(true);
  const [openTable, setOpenTable] = useState(true);

  const handleLaunchShort = async (row: TopicCsvRow) => {
    if (!onCreateProjectFromTopic || creatingProjectId) return;
    setCreatingProjectId(row.id);
    setError(null);
    try {
      await onCreateProjectFromTopic(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création projet Studio.');
    } finally {
      setCreatingProjectId(null);
    }
  };

  const loadCsv = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/topics-csv', { credentials: 'same-origin' });
      const data = (await res.json()) as { rows?: TopicCsvRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de charger le tableau CSV.');
      }
      setRows(data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement CSV.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCsv();
  }, [loadCsv]);

  const handleRunResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (researching) return;
    setResearching(true);
    setError(null);
    try {
      const res = await fetch('/api/topics/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ focus: focusInput.trim() || undefined }),
      });
      const data = (await res.json()) as {
        rows?: TopicCsvRow[];
        winner?: TopicCsvRow;
        sessionId?: string;
        groundingSources?: GroundingSource[];
        researchBriefs?: ResearchBrief[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la recherche multi-thèmes.');
      }
      if (data.rows) setRows(data.rows);
      setGroundingSources(data.groundingSources ?? []);
      setResearchBriefs(data.researchBriefs ?? []);
      setLastSessionId(data.sessionId ?? null);
      setFocusInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche.');
    } finally {
      setResearching(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: TopicStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ statut: nextStatus }),
      });
      const data = (await res.json()) as { rows?: TopicCsvRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de modifier le statut.');
      }
      if (data.rows) setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour.');
    } finally {
      setUpdatingId(null);
    }
  };

  const latestWinner = useMemo(() => {
    const chosen = rows.filter((r) => r.statut === 'Retenu (Choix IA)');
    if (chosen.length > 0) return chosen[chosen.length - 1];
    return rows.length > 0 ? rows[rows.length - 1] : null;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return [...filterTopicRows(rows, {
      category: categoryFilter,
      status: statusFilter,
      search: searchQuery,
    })].reverse();
  }, [rows, categoryFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const sessions = new Set(rows.map((r) => r.demande_session).filter(Boolean));
    const chosenCount = rows.filter((r) => r.statut === 'Retenu (Choix IA)').length;
    const producedCount = rows.filter((r) => r.statut === 'Produit').length;
    return {
      total: rows.length,
      sessions: sessions.size,
      chosenCount,
      producedCount,
    };
  }, [rows]);

  return (
    <section className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Header & Step 0 Action Panel */}
      <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#258EFF]">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              ÉTAPE 0 OBLIGATOIRE · VEILLE FRANCE &amp; TABLEAU CSV
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Recherche de sujets viraux &amp; Sélection autonome
            </h1>
            <p className="text-sm text-[#5C5F68] max-w-2xl leading-relaxed">
              À chaque demande de création de Short, le système scanne l&apos;actualité France, l&apos;IA, le business,
              la politique et les conseils de vie, choisit le thème au plus fort potentiel viral sur TikTok / Reels / YT Shorts,
              et met à jour <code className="font-mono text-xs bg-[#F1EEE6] px-1.5 py-0.5 rounded">video-agent/shorts-topics.csv</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenBatch && (
              <button
                type="button"
                onClick={onOpenBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#258EFF] hover:opacity-90 text-xs font-bold text-white transition-opacity whitespace-nowrap cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                Créer en masse
              </button>
            )}
            <a
              href="/api/topics-csv?format=csv"
              download="shorts-topics.csv"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E3DED3] bg-white text-xs font-semibold text-[#14161B] hover:border-[#14161B] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Exporter .csv
            </a>
          </div>
        </div>

        {/* Trigger Form */}
        <form onSubmit={handleRunResearch} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="flex-1">
            <label htmlFor="topic-focus-input" className="sr-only">
              Orientation optionnelle de recherche (laisser vide pour choix 100 % autonome)
            </label>
            <input
              id="topic-focus-input"
              type="text"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              placeholder="Laisser vide pour choix 100 % autonome (ou préciser une piste : ex. pouvoir d'achat, IA devs...)"
              className="w-full h-11 px-4 rounded-xl border border-[#E3DED3] bg-white text-sm text-[#14161B] placeholder:text-[#A19F98] focus:outline-2 focus:outline-[#258EFF]"
            />
          </div>
          <button
            type="submit"
            disabled={researching}
            className="h-11 px-5 rounded-xl bg-[#14161B] hover:bg-[#258EFF] disabled:opacity-65 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {researching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Recherche multi-thèmes en cours…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Créer un Short · Rechercher &amp; Choisir
              </>
            )}
          </button>
        </form>

        {/* Compact Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-[#5C5F68]">Sujets analysés (CSV)</div>
            <div className="text-lg font-extrabold font-mono text-[#14161B] tabular-nums mt-0.5">
              {stats.total}
            </div>
          </div>
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-[#5C5F68]">Sessions de veille</div>
            <div className="text-lg font-extrabold font-mono text-[#14161B] tabular-nums mt-0.5">
              {stats.sessions}
            </div>
          </div>
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-[#5C5F68]">Thèmes retenus</div>
            <div className="text-lg font-extrabold font-mono text-[#258EFF] tabular-nums mt-0.5">
              {stats.chosenCount}
            </div>
          </div>
          <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-[#5C5F68]">Shorts produits</div>
            <div className="text-lg font-extrabold font-mono text-[#14161B] tabular-nums mt-0.5">
              {stats.producedCount}
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-xs font-medium text-[#B91C1C]"
          >
            {error}
          </div>
        )}
      </div>

      {/* Chosen Theme Spotlight */}
      {latestWinner && (
        <div className="bg-[#FCFBF8] border-2 border-[#258EFF] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="toggle-spotlight-section"
                onClick={() => setOpenSpotlight((o) => !o)}
                aria-expanded={openSpotlight}
                title={openSpotlight ? 'Replier les détails du thème retenu' : 'Déplier les détails du thème retenu'}
                className="w-7 h-7 rounded-lg border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] flex items-center justify-center text-[#14161B] cursor-pointer shrink-0"
              >
                {openSpotlight ? (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-[#258EFF] text-white text-xs font-bold">
                {lastSessionId === latestWinner.demande_session
                  ? `Nouveau choix autonome · ${latestWinner.demande_session}`
                  : `Thème retenu · ${latestWinner.id}`}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#F1EEE6] text-[#14161B] text-xs font-semibold">
                {latestWinner.categorie}
              </span>
              <span className="text-xs font-mono text-[#5C5F68]">
                /{latestWinner.slug_short}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
              <span className="font-bold text-[#258EFF]">
                Score global : {computeCompositeViralScore(latestWinner)}/100
              </span>
              <span className="text-[#5C5F68] hidden sm:inline">
                Viral {latestWinner.score_viral_fr} · Actu {latestWinner.score_actualite} · Saves {latestWinner.score_save_share}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                className="text-xl sm:text-2xl font-extrabold text-[#14161B] leading-snug"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                {latestWinner.theme}
              </h2>
              {openSpotlight && (
                <p className="text-sm text-[#5C5F68] mt-1.5 leading-relaxed">
                  {latestWinner.angle_viral_fr}
                </p>
              )}
            </div>
            {!openSpotlight && onCreateProjectFromTopic && (
              <button
                type="button"
                disabled={creatingProjectId === latestWinner.id}
                onClick={() => void handleLaunchShort(latestWinner)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#258EFF] hover:opacity-90 disabled:opacity-60 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                Créer Short → Studio
              </button>
            )}
          </div>

          {openSpotlight && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5">
                  <div className="text-[11px] font-mono font-semibold text-[#5C5F68] uppercase">
                    Hook parlé (0–3 s)
                  </div>
                  <p className="text-sm font-semibold text-[#14161B] mt-1">
                    « {latestWinner.hook_propose} »
                  </p>
                </div>
                <div className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5">
                  <div className="text-[11px] font-mono font-semibold text-[#5C5F68] uppercase">
                    Hook écran &amp; Raison du choix
                  </div>
                  <p className="text-xs font-mono font-bold text-[#258EFF] mt-1">
                    {latestWinner.hook_ecran}
                  </p>
                  <p className="text-xs text-[#5C5F68] mt-1 leading-relaxed">
                    {latestWinner.raison_selection}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#5C5F68]">
                <div>
                  <span className="font-semibold text-[#14161B]">Sources :</span> {latestWinner.sources}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onCreateProjectFromTopic && (
                    <button
                      type="button"
                      data-testid="spotlight-create-short-btn"
                      disabled={creatingProjectId === latestWinner.id}
                      onClick={() => void handleLaunchShort(latestWinner)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#258EFF] hover:opacity-90 disabled:opacity-60 text-white text-xs font-bold cursor-pointer transition-opacity"
                    >
                      {creatingProjectId === latestWinner.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Film className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      Créer Short → Studio
                    </button>
                  )}
                  {latestWinner.statut !== 'Produit' && (
                    <button
                      type="button"
                      disabled={updatingId === latestWinner.id}
                      onClick={() => handleStatusChange(latestWinner.id, 'Produit')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Marquer ce Short comme Produit
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grounding Links & Briefs from latest live search */}
      {(groundingSources.length > 0 || researchBriefs.length > 0) && (
        <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 space-y-4">
          <button
            type="button"
            onClick={() => setOpenBriefs((o) => !o)}
            aria-expanded={openBriefs}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <h3
              className="text-base font-bold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Synthèse de recherche web en direct ({lastSessionId})
            </h3>
            {openBriefs ? (
              <ChevronDown className="w-4 h-4 text-[#5C5F68]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#5C5F68]" />
            )}
          </button>
          {openBriefs && researchBriefs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {researchBriefs.map((b) => (
                <div
                  key={b.pillar}
                  className="bg-[#F6F5F1] border border-[#E3DED3] rounded-xl p-3.5 space-y-1.5"
                >
                  <div className="text-xs font-bold text-[#14161B]">{b.pillar}</div>
                  <p className="text-xs text-[#5C5F68] line-clamp-5 leading-relaxed">
                    {b.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
          {openBriefs && groundingSources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groundingSources.map((src) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-white text-[11px] font-medium text-[#14161B] hover:border-[#258EFF] hover:text-[#258EFF] transition-colors"
                >
                  <span className="truncate max-w-[200px]">{src.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CSV Table Section */}
      <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <button
            type="button"
            data-testid="toggle-csv-table-section"
            onClick={() => setOpenTable((o) => !o)}
            aria-expanded={openTable}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <span className="w-7 h-7 rounded-lg border border-[#E3DED3] bg-white group-hover:bg-[#EAE7DF] flex items-center justify-center text-[#14161B] shrink-0">
              {openTable ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
            <Table2 className="w-4 h-4 text-[#258EFF]" aria-hidden="true" />
            <h2
              className="text-lg font-bold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Tableau CSV · Historique des recherches &amp; sujets ({filteredRows.length})
            </h2>
          </button>

          {openTable && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-[#5C5F68] absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <label htmlFor="csv-search-input" className="sr-only">
                  Filtrer les sujets du tableau CSV
                </label>
                <input
                  id="csv-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer un mot-clé..."
                  className="h-9 pl-8 pr-3 rounded-lg border border-[#E3DED3] bg-white text-xs text-[#14161B] focus:outline-2 focus:outline-[#258EFF]"
                />
              </div>

              <label htmlFor="csv-status-select" className="sr-only">
                Filtrer par statut
              </label>
              <select
                id="csv-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#E3DED3] bg-white text-xs font-medium text-[#14161B] cursor-pointer"
              >
                <option value="Tous">Tous statuts</option>
                <option value="Retenu (Choix IA)">Retenu (Choix IA)</option>
                <option value="Produit">Produit</option>
                <option value="Candidat">Candidat</option>
              </select>
            </div>
          )}
        </div>

        {openTable && (
          <>

        {/* Category filter bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['Toutes', ...TOPIC_CATEGORIES].map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#14161B] text-white border-[#14161B]'
                    : 'bg-white text-[#5C5F68] border-[#E3DED3] hover:text-[#14161B]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-[#5C5F68]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Chargement de video-agent/shorts-topics.csv…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#5C5F68]">
            Aucun sujet ne correspond à ces filtres.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-[#E3DED3] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F1EEE6] text-[#5C5F68] font-mono uppercase text-[11px] border-b border-[#E3DED3]">
                    <th className="py-2.5 px-3">ID / Date</th>
                    <th className="py-2.5 px-3">Catégorie</th>
                    <th className="py-2.5 px-3">Thème &amp; Hook</th>
                    <th className="py-2.5 px-3 text-right">Score FR</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3DED3] bg-white">
                  {filteredRows.map((row) => {
                    const composite = computeCompositeViralScore(row);
                    return (
                      <tr key={row.id} className="hover:bg-[#FCFBF8] align-top">
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <div className="font-bold text-[#14161B]">{row.id}</div>
                          <div className="text-[11px] text-[#5C5F68]">{row.date_creation}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#F6F5F1] border border-[#E3DED3] font-semibold text-[#14161B]">
                            {row.categorie}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[420px]">
                          <div className="font-bold text-[#14161B] text-xs leading-snug">
                            {row.theme}
                          </div>
                          <div className="text-[#5C5F68] mt-1 leading-snug">
                            Hook : « {row.hook_propose} »
                          </div>
                          <div className="text-[11px] text-[#A19F98] mt-1">
                            {row.sources}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="text-sm font-extrabold text-[#258EFF]">
                            {composite}
                          </div>
                          <div className="text-[10px] text-[#5C5F68]">
                            V:{row.score_viral_fr} S:{row.score_save_share}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                              STATUS_BADGE[row.statut]
                            }`}
                          >
                            {row.statut}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {onCreateProjectFromTopic && (
                              <button
                                type="button"
                                disabled={creatingProjectId === row.id}
                                onClick={() => void handleLaunchShort(row)}
                                className="px-2.5 py-1 rounded-lg bg-[#258EFF] hover:opacity-90 disabled:opacity-60 text-[11px] font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                              >
                                {creatingProjectId === row.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Film className="w-3 h-3" />
                                )}
                                Créer Short
                              </button>
                            )}
                            {row.statut === 'Candidat' ? (
                              <button
                                type="button"
                                disabled={updatingId === row.id}
                                onClick={() =>
                                  handleStatusChange(row.id, 'Retenu (Choix IA)')
                                }
                                className="px-2.5 py-1 rounded-lg border border-[#E3DED3] hover:border-[#258EFF] text-[11px] font-semibold text-[#14161B] cursor-pointer"
                              >
                                Retenir
                              </button>
                            ) : row.statut === 'Retenu (Choix IA)' ? (
                              <button
                                type="button"
                                disabled={updatingId === row.id}
                                onClick={() => handleStatusChange(row.id, 'Produit')}
                                className="px-2.5 py-1 rounded-lg bg-[#14161B] hover:bg-[#258EFF] text-[11px] font-semibold text-white cursor-pointer"
                              >
                                Marquer Produit
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-[#5C5F68]">
                                ✓ Publié
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredRows.map((row) => {
                const composite = computeCompositeViralScore(row);
                return (
                  <div
                    key={row.id}
                    className="bg-white border border-[#E3DED3] rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#5C5F68]">
                        {row.id} · {row.categorie}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          STATUS_BADGE[row.statut]
                        }`}
                      >
                        {row.statut}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#14161B] leading-snug">
                      {row.theme}
                    </div>
                    <div className="text-xs text-[#5C5F68]">
                      « {row.hook_propose} »
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
                      <span className="font-bold text-[#258EFF]">
                        Score : {composite}/100
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onCreateProjectFromTopic && (
                          <button
                            type="button"
                            disabled={creatingProjectId === row.id}
                            onClick={() => void handleLaunchShort(row)}
                            className="px-2.5 py-1 rounded-lg bg-[#258EFF] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Film className="w-3 h-3" />
                            Créer Short
                          </button>
                        )}
                        {row.statut !== 'Produit' && (
                          <button
                            type="button"
                            disabled={updatingId === row.id}
                            onClick={() =>
                              handleStatusChange(
                                row.id,
                                row.statut === 'Candidat'
                                  ? 'Retenu (Choix IA)'
                                  : 'Produit'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-[#E3DED3] bg-[#F6F5F1] text-[11px] font-semibold text-[#14161B]"
                          >
                            {row.statut === 'Candidat' ? 'Retenir' : 'Marquer Produit'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
          </>
        )}
      </div>
    </section>
  );
};
