import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  appendSessionToCsv,
  parseCsv,
  stringifyCsv,
  type NewTopicCandidate,
  type TopicCategory,
  type TopicCsvRow,
  type TopicStatus,
} from './topicCsv';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ResearchSessionResult {
  sessionId: string;
  date: string;
  winner: TopicCsvRow;
  added: TopicCsvRow[];
  rows: TopicCsvRow[];
  groundingSources: GroundingSource[];
  researchBriefs: Array<{ pillar: string; summary: string }>;
}

export function getCsvFilePath(rootDir: string): string {
  return path.resolve(rootDir, 'video-agent/shorts-topics.csv');
}

export function readTopicsCsv(rootDir: string): { rows: TopicCsvRow[]; rawCsv: string } {
  const csvPath = getCsvFilePath(rootDir);
  if (!fs.existsSync(csvPath)) {
    const empty = stringifyCsv([]);
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, empty, 'utf-8');
    return { rows: [], rawCsv: empty };
  }
  const rawCsv = fs.readFileSync(csvPath, 'utf-8');
  return { rows: parseCsv(rawCsv), rawCsv };
}

export function writeTopicsCsv(rootDir: string, rows: TopicCsvRow[]): string {
  const csvPath = getCsvFilePath(rootDir);
  const content = stringifyCsv(rows);
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const tmpPath = `${csvPath}.tmp`;
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, csvPath);
  return content;
}

export function updateTopicStatus(
  rootDir: string,
  id: string,
  statut: TopicStatus
): TopicCsvRow[] {
  const { rows } = readTopicsCsv(rootDir);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Error(`Sujet introuvable dans le CSV : ${id}`);
  }
  const updated = rows.map((r) => (r.id === id ? { ...r, statut } : r));
  writeTopicsCsv(rootDir, updated);
  return updated;
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY manquante ou non configurée. Configurez-la dans Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildNextSessionId(existingRows: TopicCsvRow[], dateIso: string): string {
  const prefix = `REQ-${dateIso}-`;
  let maxSeq = 0;
  for (const r of existingRows) {
    if (r.demande_session.startsWith(prefix)) {
      const n = parseInt(r.demande_session.slice(prefix.length), 10);
      if (Number.isFinite(n)) maxSeq = Math.max(maxSeq, n);
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`;
}

async function runGroundedPillarSearch(
  ai: GoogleGenAI,
  pillar: string,
  queryPrompt: string
): Promise<{ pillar: string; summary: string; sources: GroundingSource[] }> {
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: queryPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: string; title?: string } }).web;
    if (web?.uri) {
      sources.push({
        title: web.title || web.uri,
        uri: web.uri,
      });
    }
  }

  return {
    pillar,
    summary: (response.text ?? '').trim(),
    sources,
  };
}

export async function runDeepTopicResearchAndUpdateCsv(
  rootDir: string,
  userFocus?: string
): Promise<ResearchSessionResult> {
  const ai = createGeminiClient();
  const { rows: existingRows } = readTopicsCsv(rootDir);
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);
  const sessionId = buildNextSessionId(existingRows, dateIso);
  const existingThemesList = existingRows.map((r) => `- ${r.theme}`).join('\n');
  const focusClause = userFocus?.trim()
    ? `Contrainte ou piste complémentaire demandée par le créateur : "${userFocus.trim()}".`
    : 'Aucune contrainte imposée : choisis librement le sujet au potentiel viral maximal en France.';

  // Pass 1: Parallel deep web searches across French social pillars
  const pillarQueries = [
    {
      pillar: 'Actualité & Politique France',
      prompt: `Nous sommes le ${dateIso}. Fais une recherche approfondie sur l'actualité chaude en France cette semaine : décisions politiques, lois, réformes pouvoir d'achat, débats économiques ou faits de société marquants qui font réagir les Français sur TikTok, Instagram Reels et YouTube Shorts. Donne des chiffres précis, dates exactes et faits vérifiables.`,
    },
    {
      pillar: 'IA & Business / Tech',
      prompt: `Nous sommes le ${dateIso}. Fais une recherche approfondie sur les nouveautés Intelligence Artificielle, emploi, tech et business en France et en Europe cette semaine : études chiffrées, outils IA viraux, impacts concrets sur les développeurs, freelances, salariés ou entreprises, régulations IA.`,
    },
    {
      pillar: 'Conseils de vie & Tendances Réseaux FR',
      prompt: `Nous sommes le ${dateIso}. Recherche les sujets "conseils de vie", productivité, psychologie, finances personnelles et habitudes numériques qui percent le plus actuellement sur TikTok France, Instagram Reels et YouTube Shorts (fort taux d'enregistrements et de partages, sujets contre-intuitifs ou pratiques).`,
    },
  ];

  const researchResults = await Promise.all(
    pillarQueries.map((q) => runGroundedPillarSearch(ai, q.pillar, q.prompt))
  );

  const dedupSourcesMap = new Map<string, GroundingSource>();
  for (const res of researchResults) {
    for (const s of res.sources) {
      if (!dedupSourcesMap.has(s.uri)) {
        dedupSourcesMap.set(s.uri, s);
      }
    }
  }
  const groundingSources = Array.from(dedupSourcesMap.values()).slice(0, 15);
  const researchContext = researchResults
    .map(
      (r) =>
        `### ${r.pillar}\n${r.summary}\nSources repérées : ${r.sources
          .slice(0, 5)
          .map((s) => `${s.title} (${s.uri})`)
          .join(' | ')}`
    )
    .join('\n\n');

  // Pass 2: Structured scoring & candidate generation across 5 categories
  const synthesisResponse = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `Tu es le stratège éditorial d'une chaîne française de Shorts viraux style @melvynxdev (ton direct, analytique, zéro blabla, faits chiffrés, 45-55s).`,
      `Date du jour : ${dateIso}. ${focusClause}`,
      `Voici les thèmes DÉJÀ présents dans notre fichier CSV (INTERDIT de les répéter ou de proposer un doublon proche) :\n${existingThemesList || '(aucun)'}`,
      `Voici le dossier de recherche web temps réel collecté à l'instant :\n${researchContext}`,
      `À partir de ces recherches réelles, propose exactement 5 candidats de Shorts à très fort potentiel viral en France, un par catégorie parmi : "Actualité", "IA", "Business", "Politique", "Conseils de vie".`,
      `Règles strictes :`,
      `- Zéro tiret cadratin (pas de —), zéro blabla type "dans cette vidéo".`,
      `- Chaque hook_propose doit faire moins de 18 mots et créer un contraste immédiat ou une rupture chiffrée.`,
      `- Chaque hook_ecran doit faire 2 à 5 mots en majuscules percutantes.`,
      `- Note honnêtement score_viral_fr, score_actualite et score_save_share (entre 65 et 98) pour que le meilleur sujet objectif se démarque nettement.`,
      `- Cite uniquement des sources issues des recherches ci-dessus dans le champ sources.`,
    ].join('\n\n'),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            categorie: {
              type: Type.STRING,
              description:
                'Une catégorie parmi Actualité, IA, Business, Politique, Conseils de vie',
            },
            theme: {
              type: Type.STRING,
              description: 'Titre concis du sujet de Short (max 95 caractères)',
            },
            angle_viral_fr: {
              type: Type.STRING,
              description: 'Angle narratif précis et contre-intuitif pour le public FR',
            },
            hook_propose: {
              type: Type.STRING,
              description: 'Phrase d ouverture parlée (max 18 mots, percutante)',
            },
            hook_ecran: {
              type: Type.STRING,
              description: 'Texte affiché à l écran à t=0 (2 à 5 mots max)',
            },
            score_viral_fr: {
              type: Type.INTEGER,
              description: 'Potentiel viral réseaux sociaux FR sur 100',
            },
            score_actualite: {
              type: Type.INTEGER,
              description: 'Fraîcheur actualité sur 100',
            },
            score_save_share: {
              type: Type.INTEGER,
              description: 'Potentiel d enregistrement et partage sur 100',
            },
            tension_emotion: {
              type: Type.STRING,
              description: 'Émotion dominante (ex: Surprise + Alerte pouvoir d achat)',
            },
            plateformes_cibles: {
              type: Type.STRING,
              description: 'Ex: TikTok · Reels · YT Shorts',
            },
            sources: {
              type: Type.STRING,
              description: 'Sources vérifiées séparées par ·',
            },
            slug_short: {
              type: Type.STRING,
              description: 'Slug kebab-case ASCII sans accent',
            },
            raison_selection: {
              type: Type.STRING,
              description: 'Justification stratégique du potentiel viral en France',
            },
          },
          required: [
            'categorie',
            'theme',
            'angle_viral_fr',
            'hook_propose',
            'hook_ecran',
            'score_viral_fr',
            'score_actualite',
            'score_save_share',
            'tension_emotion',
            'plateformes_cibles',
            'sources',
            'slug_short',
            'raison_selection',
          ],
        },
      },
    },
  });

  const rawJson = (synthesisResponse.text ?? '[]').trim();
  const parsed = JSON.parse(rawJson) as Array<
    Omit<NewTopicCandidate, 'categorie'> & { categorie: string }
  >;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('La synthèse Gemini n’a renvoyé aucun sujet exploitable.');
  }

  const normalizedCandidates: NewTopicCandidate[] = parsed.map((item) => ({
    ...item,
    categorie: item.categorie as TopicCategory,
  }));

  const { rows, winner, added } = appendSessionToCsv(
    existingRows,
    sessionId,
    dateIso,
    normalizedCandidates
  );

  writeTopicsCsv(rootDir, rows);

  return {
    sessionId,
    date: dateIso,
    winner,
    added,
    rows,
    groundingSources,
    researchBriefs: researchResults.map((r) => ({
      pillar: r.pillar,
      summary: r.summary,
    })),
  };
}
