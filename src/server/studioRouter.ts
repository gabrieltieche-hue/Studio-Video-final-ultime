import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  COMPONENTS_DIR,
  JOBS_DIR,
  PROJECTS_DIR,
  RENDERS_DIR,
  ROOT_DIR,
  STORAGE_DIR,
  STYLES_DIR,
  TAKES_DIR,
  deleteProject,
  getAllProjects,
  getProject,
  getWorkspaceState,
  initStorage,
  resolveProjectMp4Path,
  saveProject,
  setActiveProjectAndVersion,
  withProjectMediaStatus,
} from './storageManager';
import {
  alignmentToWords,
  assignBeatTimingsAndTranscript,
  buildFallbackBatchScript,
  resolveBeatLayout,
  sanitizeScriptText,
} from '../engine/batchShortBuilder';
import { renderDynamicProjectToMp4 } from './batchRenderer';
import { synthesizeVoiceoverForProject } from './batchService';
import { triggerAutoSyncInBackground } from './syncManager';
import type { LookId } from '../data/shortSpec';
import type { BatchBeatSpec } from '../types/batch';
import {
  readTopicsCsv,
  runDeepTopicResearchAndUpdateCsv,
} from '../engine/topicResearchService';
import {
  captureMotionComponentAsset,
  downloadRemoteVideo,
  extractAudioAndTranscribe,
  generateContactSheet,
  getAvailableTakes,
  getJob,
  prepareShortMedia,
  probeVideo,
  resolveChromeExecutable,
  saveJob,
  saveUploadedVideo,
  startRenderShort,
} from './ffmpegEngine';
import {
  buildFeedbackPromptMarkdown,
  type FeedbackItem,
  type MotionComponent,
  type ShortProject,
} from '../types/studio';
import { createScheduledPostsForProject } from './socialRouter';
import {
  generateAiSocialCopy,
  inspectTregStatus,
  prepareMediaPackForProject,
  runSchedulerTick,
} from './socialPublisher';
import {
  deleteScheduledPost,
  getRawSocialAccounts,
  getScheduledQueue,
  getSchedulerState,
  toPublicAccountConfig,
} from './socialStorage';
import type { PublishRoute, SocialPlatform } from '../types/social';

export const MCP_TOOLS = [
  {
    name: 'studio_status',
    description: "Vérifier l'état du moteur de rendu, Whisper, Chromium et du stockage disque",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_source_videos',
    description: 'Lister les rushs vidéos disponibles dans storage/takes/',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'download_source_video',
    description: 'Télécharger une vidéo source publique dans storage/takes/ et la valider avec FFprobe',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        filename: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'upload_source_video',
    description: 'Importer une vidéo directement dans storage/takes/ (URL ou base64)',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        video_url: { type: 'string' },
        video_data_base64: { type: 'string' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'create_short_project',
    description: 'Créer un nouveau projet de Short (Mode A Faceless Explainer ou Mode B Split-Screen Clips)',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        mode: { type: 'string', enum: ['faceless_explainer', 'split_screen_clips'] },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube_shorts'] },
        source_video: { type: 'string' },
        duration: { type: 'number' },
      },
      required: ['slug', 'title', 'mode'],
    },
  },
  {
    name: 'transcribe_short',
    description: 'Extraire l’audio et transcrire mot-à-mot avec whisper.cpp (fail-closed sans modèle)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        language: { type: 'string', default: 'fr' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'read_short_transcript',
    description: 'Lire la transcription complète avec timecodes et coupures',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string' } },
      required: ['project_id'],
    },
  },
  {
    name: 'prepare_short',
    description: 'Détecter et couper les silences sur le rush source via FFmpeg',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        cut_silences: { type: 'boolean', default: true },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'save_edit_spec',
    description: 'Enregistrer le scénario technique de montage du projet',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        edit_spec: { type: 'object' },
      },
      required: ['project_id', 'edit_spec'],
    },
  },
  {
    name: 'write_motion_component',
    description: 'Créer ou mettre à jour une animation HTML/JS/Canvas pilotée par window.setT(t)',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
        has_alpha: { type: 'boolean', default: true },
      },
      required: ['component_name', 'code'],
    },
  },
  {
    name: 'capture_motion_component',
    description: 'Capturer un composant window.setT(t) en vidéo MP4/MOV via Chromium headless + FFmpeg',
    inputSchema: {
      type: 'object',
      properties: {
        component_name: { type: 'string' },
        resolution: { type: 'string', enum: ['540x960', '1080x960', '1080x1920'], default: '1080x1920' },
        fps: { type: 'number', default: 30 },
        duration: { type: 'number', default: 3 },
        has_alpha: { type: 'boolean', default: true },
      },
      required: ['component_name'],
    },
  },
  {
    name: 'render_short',
    description: 'Lancer un rendu vidéo FFmpeg (draft ou final 1080x1920 MP4)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        quality: { type: 'string', enum: ['draft', 'final'], default: 'draft' },
        version: { type: 'string' },
        fps: { type: 'number', default: 25 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'job_status',
    description: "Consulter l'avancement d'un job de rendu",
    inputSchema: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
  {
    name: 'get_short_outputs',
    description: 'Obtenir les fichiers livrables réels sur disque pour une version',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'make_reference_contact_sheet',
    description: 'Extraire une planche contact 4×3 de 12 images depuis le MP4 du projet',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string', default: 'current' },
        quality: { type: 'string', enum: ['draft', 'final'], default: 'final' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'save_style_profile',
    description: 'Enregistrer un profil graphique réutilisable sur disque',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        accent_color: { type: 'string' },
        font_family: { type: 'string' },
      },
      required: ['name', 'accent_color'],
    },
  },
  {
    name: 'list_projects',
    description: 'Lister tous les projets du studio',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project',
    description: 'Charger la configuration complète d’un projet',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string' } },
      required: ['project_id'],
    },
  },
  {
    name: 'get_studio_url',
    description: 'Obtenir le lien direct d’inspection vers un projet',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string' } },
      required: ['project_id'],
    },
  },
  {
    name: 'list_feedbacks',
    description: 'Lister les commentaires horodatés d’un projet',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        status: { type: 'string', enum: ['all', 'open', 'resolved'], default: 'all' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'add_feedback',
    description: 'Ajouter un commentaire ou une annotation horodatée',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        text: { type: 'string' },
        timestamp: { type: 'number' },
        timeFormatted: { type: 'string' },
        targetElement: { type: 'string' },
        type: { type: 'string', enum: ['comment', 'cut', 'idea'], default: 'comment' },
      },
      required: ['project_id', 'text'],
    },
  },
  {
    name: 'create_project_version',
    description: 'Créer une nouvelle version itérative du projet (v2, v3...)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string' },
        notes: { type: 'string' },
        duration: { type: 'number' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_version_history',
    description: 'Consulter l’historique des versions d’un projet',
    inputSchema: {
      type: 'object',
      properties: { project_id: { type: 'string' } },
      required: ['project_id'],
    },
  },
  {
    name: 'create_project_from_topic',
    description: 'Créer un projet Studio complet depuis un sujet du tableau Veille & CSV et l’activer dans le Studio et le Lecteur',
    inputSchema: {
      type: 'object',
      properties: {
        topic_id: { type: 'string' },
        slug: { type: 'string' },
        title: { type: 'string' },
        hook_text: { type: 'string' },
        category: { type: 'string' },
        mode: { type: 'string', enum: ['faceless_explainer', 'split_screen_clips'], default: 'faceless_explainer' },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube_shorts'], default: 'youtube_shorts' },
        duration: { type: 'number', default: 50 },
        set_active: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'activate_project',
    description: 'Définir le projet et la version actifs dans le Lecteur Short et le Studio Feedback',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_short_project',
    description:
      'Mettre à jour un projet Short (titre, hook, durée, transcript, motionTrack, layoutTrack, editSpec, médias) et le synchroniser sur disque',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string' },
        hook_text: { type: 'string' },
        duration: { type: 'number' },
        status: { type: 'string', enum: ['draft', 'preparing', 'rendering', 'ready'] },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube_shorts'] },
        transcript: { type: 'array' },
        motion_track: { type: 'array' },
        layout_track: { type: 'array' },
        sfx_track: { type: 'array' },
        edit_spec: { type: 'object' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'generate_short_storyboard',
    description:
      'Générer automatiquement les séquences (beats), la piste motion, la piste layout et la transcription minutée d’un projet Short',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        angle: { type: 'string' },
        sources: { type: 'string' },
        duration: { type: 'number', default: 50 },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'research_viral_topics',
    description:
      'Lancer la veille multi-thèmes France, scorer 5 candidats, choisir le thème gagnant et mettre à jour video-agent/shorts-topics.csv',
    inputSchema: {
      type: 'object',
      properties: {
        focus: { type: 'string' },
      },
    },
  },
  {
    name: 'list_social_accounts',
    description:
      'Lister l’état des comptes YouTube Shorts, Instagram Reels et TikTok (OAuth, Treg, Kit Manuel) et l’état du planificateur cron',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'generate_social_pack',
    description:
      'Préparer le pack média (social.mp4 <= 30 Mo, cover.jpg, titre YouTube, légendes IG/TikTok, hashtags) pour un projet Short',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'schedule_short_publish',
    description:
      'Programmer la publication automatique d’un Short sur YouTube Shorts, Instagram Reels et/ou TikTok à une date/heure donnée (ou immédiatement)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        version: { type: 'string' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['youtube', 'instagram', 'tiktok'] },
        },
        scheduled_at: { type: 'string', description: 'Date/heure ISO 8601 (UTC ou avec fuseau)' },
        publish_now: { type: 'boolean', default: false },
        youtube_title: { type: 'string' },
        caption: { type: 'string' },
        privacy: { type: 'string', enum: ['public', 'unlisted', 'private'], default: 'public' },
        route: { type: 'string', enum: ['oauth', 'treg', 'manual'] },
      },
      required: ['project_id', 'platforms'],
    },
  },
  {
    name: 'list_scheduled_posts',
    description: 'Lister la file de planification et l’historique des publications automatiques',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'run_publish_now',
    description: 'Déclencher immédiatement un cycle du planificateur cron pour publier les Shorts arrivés à échéance',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cancel_scheduled_post',
    description: 'Annuler et supprimer une publication planifiée de la file',
    inputSchema: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id'],
    },
  },
];

export function buildStructuredShortAssets(params: {
  title: string;
  hookText: string;
  angle?: string;
  category?: string;
  sources?: string;
  hookScreen?: string;
  duration: number;
  mode: ShortProject['mode'];
}) {
  const targetDuration = Math.max(20, Math.min(180, params.duration || 45));
  const fallback = buildFallbackBatchScript({
    theme: params.title,
    category: params.category || 'Tech & Société',
    angle: params.angle,
    hookHint: params.hookText,
    sources: params.sources,
  });

  if (params.hookScreen?.trim() && fallback.beats[0]) {
    fallback.beats[0].screenLabel = sanitizeScriptText(params.hookScreen).toUpperCase().slice(0, 32);
  }

  const fullText = fallback.beats.map((b) => b.spokenLine).join(' ');
  const { words, durationSec } = alignmentToWords(null, fullText, 1.05, targetDuration);
  const timed = assignBeatTimingsAndTranscript(fallback.beats, words, durationSec);

  const forcedMode: 'split' | null =
    params.mode === 'split_screen_clips' ? 'split' : null;

  const layoutTrack = timed.beats.map((beat, idx) => ({
    id: `layout-${beat.id}`,
    layout: forcedMode || resolveBeatLayout(beat, idx, timed.beats.length),
    start: beat.from,
    end: beat.to,
  }));

  const normalizedBeats = timed.beats.map((beat, idx) => ({
    ...beat,
    layout: layoutTrack[idx]?.layout || beat.layout,
  }));

  return {
    hookText: fallback.hookText,
    duration: timed.durationSec,
    beats: normalizedBeats,
    motionTrack: timed.motionTrack,
    transcript: words,
    sfxTrack: timed.sfxTrack,
    layoutTrack,
  };
}

export async function executeToolCall(
  toolName: string,
  rawArgs: Record<string, unknown> = {}
): Promise<unknown> {
  initStorage();
  const args = rawArgs || {};

  switch (toolName) {
    case 'studio_status': {
      const checkBinary = (cmd: string) => {
        try {
          return spawnSync(cmd, ['-version'], { stdio: 'ignore' }).status === 0;
        } catch {
          return false;
        }
      };
      const projects = getAllProjects();
      const takes = getAvailableTakes();
      const modelPath = process.env.WHISPER_MODEL_PATH || '';
      const whisperModelPresent = Boolean(modelPath && fs.existsSync(modelPath));
      const pendingJobs = fs.existsSync(JOBS_DIR)
        ? fs.readdirSync(JOBS_DIR).filter((file) => file.endsWith('.json')).length
        : 0;

      return {
        status: 'ready',
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        capabilities: {
          ffmpeg: checkBinary('ffmpeg'),
          ffprobe: checkBinary('ffprobe'),
          chromiumHeadless: Boolean(resolveChromeExecutable()),
          whisperCli: checkBinary(process.env.WHISPER_CLI_PATH || 'whisper-cli'),
          whisperModel: whisperModelPresent,
          modelPathConfigured: Boolean(modelPath),
          motionCapture: true,
        },
        counts: {
          projects: projects.length,
          sourceVideos: takes.length,
          renderJobs: pendingJobs,
        },
        storage: {
          root: STORAGE_DIR,
          takes: TAKES_DIR,
          renders: RENDERS_DIR,
          projects: PROJECTS_DIR,
        },
      };
    }

    case 'list_source_videos': {
      const takes = getAvailableTakes();
      return { count: takes.length, directory: 'storage/takes', videos: takes };
    }

    case 'download_source_video': {
      const vid = await downloadRemoteVideo(
        String(args.url || ''),
        args.filename ? String(args.filename) : undefined
      );
      return {
        success: true,
        message: `Vidéo "${vid.name}" téléchargée (${vid.sizeMb} Mo, ${vid.duration}s, ${vid.resolution}).`,
        video: vid,
      };
    }

    case 'upload_source_video': {
      const filename = String(args.filename || `rush-${Date.now()}.mp4`);
      if (args.video_data_base64 || args.base64) {
        const video = saveUploadedVideo(
          filename,
          String(args.video_data_base64 || args.base64)
        );
        return {
          success: true,
          video,
          message: `Vidéo enregistrée et validée par FFprobe : ${video.name}.`,
        };
      }
      if (args.video_url) {
        const video = await downloadRemoteVideo(String(args.video_url), filename);
        return {
          success: true,
          video,
          message: `Vidéo téléchargée et validée par FFprobe : ${video.name}.`,
        };
      }
      throw new Error('Fournissez video_data_base64 ou video_url.');
    }

    case 'create_short_project': {
      const mode = (args.mode as ShortProject['mode']) || 'faceless_explainer';
      if (!['faceless_explainer', 'split_screen_clips'].includes(mode)) {
        throw new Error('Mode de production invalide.');
      }
      const slug = String(args.slug || `short-${Date.now()}`);
      if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(slug)) {
        throw new Error('Slug invalide (minuscules, chiffres et tirets, 2 à 49 caractères).');
      }
      if (getProject(slug)) throw new Error(`Un projet avec le slug "${slug}" existe déjà.`);
      const takes = getAvailableTakes();
      const source = args.source_video
        ? takes.find((video) => video.name === String(args.source_video))
        : undefined;
      if (args.source_video && !source) {
        throw new Error(`Vidéo source introuvable dans takes/: ${args.source_video}`);
      }
      if (mode === 'split_screen_clips' && !source) {
        throw new Error('Le mode split-screen nécessite un rush réel présent dans takes/.');
      }

      const duration = Number(args.duration) || source?.duration || 45;
      if (!Number.isFinite(duration) || duration < 1 || duration > 180) {
        throw new Error('Durée de projet invalide (1 à 180 secondes).');
      }
      const fps = Number(args.fps) || 25;
      const now = new Date().toISOString();
      const newProj: ShortProject = {
        id: `proj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        slug,
        title: String(args.title || 'Nouveau Short').slice(0, 160),
        mode,
        platform: (args.platform as ShortProject['platform']) || 'youtube_shorts',
        status: 'draft',
        duration,
        fps,
        resolution: { width: 1080, height: 1920 },
        ...(source ? { sourceVideoName: source.name, speakerVideoUrl: source.url } : {}),
        currentVersion: 'v1',
        versions: [
          {
            version: 'v1',
            createdAt: now,
            status: 'draft',
            duration,
            fps,
            notes: 'Projet initialisé en brouillon éditorial.',
          },
        ],
        transcript: [],
        motionTrack: [],
        layoutTrack: [
          {
            id: 'layout-main',
            layout: mode === 'split_screen_clips' ? 'split' : 'fullscreen',
            start: 0,
            end: duration,
          },
        ],
        sfxTrack: [],
        musicTrack: {
          trackName: 'Bright_Corporate_Groove_8c962467.mp3',
          volume: 0.24,
          ducking: true,
        },
        feedbacks: [],
        motionComponents: {},
        contactSheet: [],
        styleProfile: {
          name: 'Papier signature',
          fontFamily: '"Bricolage Grotesque", sans-serif',
          accentColor: '#258EFF',
          textColor: '#14161B',
          cardBg: '#FCFBF8',
          captionsPosition: 'bottom',
          visualBeatsTarget: 8,
        },
      };
      saveProject(newProj);
      return {
        success: true,
        projectId: newProj.id,
        project: newProj,
        message: `Projet "${newProj.title}" créé en brouillon.`,
      };
    }

    case 'transcribe_short': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const sourceName = proj.preparedVideoName || proj.sourceVideoName;
      if (!sourceName) throw new Error('Aucune vidéo source n’est associée au projet.');
      const source = getAvailableTakes().find((video) => video.name === sourceName);
      if (!source?.path) throw new Error(`Fichier source absent du stockage: ${sourceName}`);
      const words = await extractAudioAndTranscribe(
        proj,
        source.path,
        String(args.language || 'fr')
      );
      if (!words.length) throw new Error('Whisper n’a retourné aucun mot horodaté.');
      proj.transcript = words;
      saveProject(proj);
      const jobId = `transcribe-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const now = new Date().toISOString();
      saveJob({
        id: jobId,
        projectId: proj.id,
        slug: proj.slug,
        version: proj.currentVersion,
        status: 'completed',
        progress: 100,
        outputMp4: '',
        thumbnailUrl: '',
        contactSheetUrl: '',
        duration: proj.duration,
        startedAt: now,
        completedAt: now,
        log: `Whisper exécuté sur ${sourceName}: ${words.length} mots horodatés.`,
      });
      return {
        jobId,
        status: 'completed',
        wordsCount: words.length,
        language: String(args.language || 'fr'),
        message: `Transcription exécutée par whisper.cpp : ${words.length} mots horodatés.`,
      };
    }

    case 'read_short_transcript': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const activeWords = (proj.transcript || []).filter((w) => !w.isCut);
      return {
        projectId: proj.id,
        totalWords: (proj.transcript || []).length,
        activeWordsCount: activeWords.length,
        cutWordsCount: (proj.transcript || []).length - activeWords.length,
        fullText: activeWords.map((w) => w.word).join(' '),
        words: proj.transcript || [],
      };
    }

    case 'prepare_short': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const sourceName = proj.sourceVideoName;
      if (!sourceName) throw new Error('Aucun rush source à préparer pour ce projet.');
      const source = getAvailableTakes().find((v) => v.name === sourceName);
      if (!source?.path) throw new Error(`Rush source introuvable: ${sourceName}`);
      const analysis = prepareShortMedia(proj, source.path);
      saveProject(proj);
      return { success: true, projectId: proj.id, ...analysis };
    }

    case 'save_edit_spec': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      proj.editSpec = (args.edit_spec as Record<string, unknown>) || {};
      saveProject(proj);
      return { success: true, projectId: proj.id, editSpec: proj.editSpec };
    }

    case 'write_motion_component': {
      const componentName = String(args.component_name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      if (!componentName) throw new Error('Nom de composant invalide.');
      const code = String(args.code || '');
      if (!code.includes('window.setT')) {
        throw new Error('Le code doit définir window.setT = function(t) { ... }.');
      }
      const id = `comp-${componentName}`;
      const comp: MotionComponent = {
        id,
        name: componentName,
        code,
        description: String(args.description || 'Composant animé'),
        width: 1080,
        height: 960,
        fps: 25,
        hasAlpha: args.has_alpha !== false,
        tRange: [0, 1],
      };
      const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><style>
body { margin:0; background:transparent; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; color:#14161B; }
</style></head><body>
<div id="hook-card"><div id="stat-badge" style="font-size:72px;font-weight:800;color:#258EFF">0 %</div><div id="c"></div></div>
<script>${code}</script></body></html>`;
      fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(COMPONENTS_DIR, `${componentName}.html`), html, 'utf-8');
      const all = getAllProjects();
      all.forEach((project) => {
        project.motionComponents[id] = comp;
        saveProject(project);
      });
      return {
        success: true,
        componentId: id,
        name: comp.name,
        htmlPath: `storage/components/${componentName}.html`,
        message: 'Composant HTML enregistré sur disque.',
      };
    }

    case 'capture_motion_component': {
      const name = String(args.component_name || '');
      const duration = Number(args.duration) || 3;
      const fps = Number(args.fps) || 25;
      const res =
        args.resolution === '540x960' || args.resolution === '1080x960' ? args.resolution : '1080x1920';
      const alpha = args.has_alpha !== false;
      const asset = await captureMotionComponentAsset(name, duration, fps, res, alpha);
      return {
        success: true,
        component: name,
        framesCount: asset.framesCount,
        videoAssetUrl: asset.mp4Url,
        previewUrl: asset.pngUrl,
        sizeBytes: asset.sizeBytes,
        message: `Capture Chromium headless : ${asset.framesCount} frames rendues via window.setT(t).`,
      };
    }

    case 'render_short': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const nextNum = (proj.versions || []).length + 1;
      const nextV = String(args.version || `v${nextNum}`);
      const splitLayout =
        proj.mode === 'split_screen_clips' &&
        (proj.layoutTrack || []).some((item) => item.layout === 'split');
      for (const item of proj.motionTrack || []) {
        const component = proj.motionComponents?.[item.componentId];
        if (!component) throw new Error(`Composant manquant: ${item.componentId}`);
        const dur = Math.max(0.5, Math.min(20, Number(item.end) - Number(item.start)));
        await captureMotionComponentAsset(
          component.name,
          dur,
          Math.min(30, component.fps || 25),
          splitLayout ? '1080x960' : '1080x1920',
          Boolean(component.hasAlpha)
        );
      }
      const job = startRenderShort(proj, nextV, {
        quality: args.quality ? String(args.quality) : 'draft',
        fps: Number(args.fps) || 25,
      });
      return {
        success: true,
        jobId: job.id,
        projectId: proj.id,
        version: nextV,
        status: job.status,
        progress: job.progress,
        outputMp4: job.outputMp4,
      };
    }

    case 'job_status': {
      const job = getJob(String(args.job_id || ''));
      if (!job) throw new Error(`Tâche inconnue: ${args.job_id}`);
      return job;
    }

    case 'get_short_outputs': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const version = String(args.version || proj.currentVersion);
      if (proj.isFlagshipReactStage) {
        const mp4Path = path.join(ROOT_DIR, 'public/video/short-interdiction-15-ans.mp4');
        const exists = fs.existsSync(mp4Path);
        const contactName = 'short-interdiction-15-ans_v1_contact.jpg';
        return {
          projectId: proj.id,
          slug: proj.slug,
          version,
          status: exists ? 'final' : 'draft-only',
          files: {
            mp4: exists ? '/video/short-interdiction-15-ans.mp4' : null,
            contactSheet: fs.existsSync(path.join(RENDERS_DIR, contactName))
              ? `/renders/${contactName}`
              : null,
          },
          metadata: exists ? probeVideo(mp4Path) : null,
        };
      }

      const finalName = `${proj.slug}_${version}.mp4`;
      const draftName = `${proj.slug}_${version}_draft.mp4`;
      const finalPath = path.join(RENDERS_DIR, finalName);
      const draftPath = path.join(RENDERS_DIR, draftName);
      const exists = fs.existsSync(finalPath) && fs.statSync(finalPath).size >= 1024;
      const draftExists = fs.existsSync(draftPath) && fs.statSync(draftPath).size >= 1024;
      if (!exists && !draftExists) {
        throw new Error(`Aucun MP4 réel trouvé pour ${version}. Lancez d’abord render_short.`);
      }
      const selectedPath = exists ? finalPath : draftPath;
      const metadata = probeVideo(selectedPath);
      const contactName = exists
        ? `${proj.slug}_${version}_contact.jpg`
        : `${proj.slug}_${version}_draft_contact.jpg`;
      return {
        projectId: proj.id,
        slug: proj.slug,
        version,
        status: exists ? 'final' : 'draft-only',
        files: {
          mp4: exists ? `/renders/${finalName}` : null,
          draftMp4: draftExists ? `/renders/${draftName}` : null,
          contactSheet: fs.existsSync(path.join(RENDERS_DIR, contactName))
            ? `/renders/${contactName}`
            : null,
        },
        metadata,
      };
    }

    case 'make_reference_contact_sheet': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const version =
        args.version && args.version !== 'current' ? String(args.version) : proj.currentVersion;
      if (proj.isFlagshipReactStage) {
        const flagshipMp4 = path.join(ROOT_DIR, 'public/video/short-interdiction-15-ans.mp4');
        if (!fs.existsSync(flagshipMp4)) {
          throw new Error('MP4 principal introuvable pour générer la planche QC.');
        }
        const contactName = `short-interdiction-15-ans_${version}_contact.jpg`;
        const outputPath = path.join(RENDERS_DIR, contactName);
        fs.mkdirSync(RENDERS_DIR, { recursive: true });
        const ok = generateContactSheet(flagshipMp4, outputPath, probeVideo(flagshipMp4).duration);
        if (!ok) throw new Error('Échec de génération de la planche QC.');
        return {
          success: true,
          projectId: proj.id,
          version,
          contactSheetUrl: `/renders/${contactName}`,
          outputBytes: fs.statSync(outputPath).size,
        };
      }

      const quality = args.quality === 'final' ? 'final' : 'draft';
      const renderTag = quality === 'draft' ? `${version}_draft` : version;
      const mp4Path = path.join(RENDERS_DIR, `${proj.slug}_${renderTag}.mp4`);
      if (!fs.existsSync(mp4Path)) {
        throw new Error(`Le MP4 ${renderTag} n’existe pas encore.`);
      }
      const outputPath = path.join(RENDERS_DIR, `${proj.slug}_${renderTag}_contact.jpg`);
      const ok = generateContactSheet(mp4Path, outputPath, probeVideo(mp4Path).duration);
      if (!ok) throw new Error('FFmpeg n’a pas produit de planche contact.');
      return {
        success: true,
        projectId: proj.id,
        version,
        contactSheetUrl: `/renders/${path.basename(outputPath)}`,
        outputBytes: fs.statSync(outputPath).size,
      };
    }

    case 'save_style_profile': {
      fs.mkdirSync(STYLES_DIR, { recursive: true });
      const cleanName = String(args.name || 'style').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      fs.writeFileSync(path.join(STYLES_DIR, `${cleanName}.json`), JSON.stringify(args, null, 2), 'utf-8');
      return { success: true, style: args, message: `Profil "${cleanName}" enregistré.` };
    }

    case 'list_projects': {
      const all = getAllProjects();
      return {
        projects: all.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          currentVersion: p.currentVersion,
          mode: p.mode,
          platform: p.platform,
          duration: p.duration,
          feedbacksCount: (p.feedbacks || []).length,
          openFeedbacksCount: (p.feedbacks || []).filter((f) => !f.resolved).length,
          versionsCount: (p.versions || []).length,
        })),
      };
    }

    case 'get_project': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      return { project: proj };
    }

    case 'get_studio_url': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const projectPath = `/?tab=studio&project=${encodeURIComponent(proj.id)}`;
      return { projectId: proj.id, slug: proj.slug, relativeUrl: projectPath };
    }

    case 'list_feedbacks': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const allFeedbacks = proj.feedbacks || [];
      const filter = args.status || 'all';
      const filtered = allFeedbacks.filter((f) =>
        filter === 'open' ? !f.resolved : filter === 'resolved' ? f.resolved : true
      );
      return {
        projectId: proj.id,
        version: proj.currentVersion,
        total: allFeedbacks.length,
        openCount: allFeedbacks.filter((f) => !f.resolved).length,
        feedbacks: filtered,
      };
    }

    case 'add_feedback': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const time = Math.max(0, Number(args.timestamp) || 0);
      const formatted =
        typeof args.timeFormatted === 'string' && args.timeFormatted
          ? args.timeFormatted
          : `00:${time < 10 ? '0' : ''}${time.toFixed(2)}`;
      const newFb: FeedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        version: proj.currentVersion,
        timestamp: time,
        timeFormatted: formatted,
        text: String(args.text || '').trim(),
        author: String(args.author || 'Utilisateur'),
        resolved: false,
        targetElement: args.targetElement ? String(args.targetElement) : undefined,
        drawingSnapshot: args.drawingSnapshot ? String(args.drawingSnapshot) : undefined,
        type: ['comment', 'cut', 'idea'].includes(String(args.type))
          ? (args.type as FeedbackItem['type'])
          : 'comment',
        createdAt: new Date().toISOString(),
      };
      if (!proj.feedbacks) proj.feedbacks = [];
      proj.feedbacks.unshift(newFb);
      saveProject(proj);
      return { success: true, feedback: newFb };
    }

    case 'create_project_version': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const nextNum = (proj.versions || []).length + 1;
      const versionStr = String(args.version || `v${nextNum}`);
      if (!/^v[0-9]{1,3}$/.test(versionStr)) throw new Error('Le nom de version doit être v1, v2, v3…');
      if ((proj.versions || []).some((item) => item.version === versionStr)) {
        throw new Error(`La version "${versionStr}" existe déjà.`);
      }
      const newVersion = {
        version: versionStr,
        createdAt: new Date().toISOString(),
        status: args.outputMp4 ? ('done' as const) : ('draft' as const),
        duration: Number(args.duration) || proj.duration,
        fps: Number(args.fps) || proj.fps,
        notes: String(args.notes || `Itération ${versionStr} créée depuis le Studio.`),
        ...(typeof args.outputMp4 === 'string' && args.outputMp4 ? { outputMp4: args.outputMp4 } : {}),
        ...(typeof args.contactSheetUrl === 'string' && args.contactSheetUrl
          ? { contactSheetUrl: args.contactSheetUrl }
          : {}),
      };
      proj.versions.unshift(newVersion);
      proj.currentVersion = versionStr;
      if (newVersion.duration > 0) proj.duration = newVersion.duration;
      proj.status = args.outputMp4 ? 'ready' : 'draft';
      saveProject(proj);
      if (args.setActive !== false) {
        setActiveProjectAndVersion(proj.id, versionStr);
      }
      return {
        success: true,
        projectId: proj.id,
        currentVersion: versionStr,
        versions: proj.versions,
      };
    }

    case 'get_version_history': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      return {
        projectId: proj.id,
        slug: proj.slug,
        currentVersion: proj.currentVersion,
        versions: proj.versions,
      };
    }

    case 'create_project_from_topic': {
      const topicId = args.topic_id ? String(args.topic_id) : undefined;
      let topicRow: ReturnType<typeof readTopicsCsv>['rows'][number] | undefined;
      if (topicId) {
        const { rows } = readTopicsCsv(ROOT_DIR);
        topicRow = rows.find((r) => r.id === topicId);
        if (!topicRow) throw new Error(`Sujet CSV "${topicId}" introuvable.`);
      }
      const rawTitle = String(args.title || topicRow?.theme || 'Nouveau Short');
      const baseSlug = String(
        args.slug ||
          topicRow?.slug_short ||
          rawTitle
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
      )
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 44);
      let slug = baseSlug || `short-${Date.now().toString().slice(-4)}`;
      if (getProject(slug)) {
        slug = `${slug.slice(0, 38)}-${Date.now().toString().slice(-4)}`;
      }
      const mode = (args.mode as ShortProject['mode']) || 'faceless_explainer';
      const duration = Math.max(15, Math.min(180, Number(args.duration) || 50));
      const hookText = String(args.hook_text || topicRow?.hook_propose || '');
      const category = String(args.category || topicRow?.categorie || '');
      const generated = buildStructuredShortAssets({
        title: rawTitle.slice(0, 160),
        hookText,
        angle: args.angle ? String(args.angle) : topicRow?.angle_viral_fr,
        category,
        sources: args.sources ? String(args.sources) : topicRow?.sources,
        hookScreen: topicRow?.hook_ecran,
        duration,
        mode,
      });

      const now = new Date().toISOString();
      const newProj: ShortProject = {
        id: `proj-${slug}`,
        slug,
        title: rawTitle.slice(0, 160),
        ...(topicRow?.id || topicId ? { topicId: topicRow?.id || topicId } : {}),
        ...(category ? { topicCategory: category } : {}),
        ...(hookText || generated.hookText ? { hookText: hookText || generated.hookText } : {}),
        mode,
        platform: (args.platform as ShortProject['platform']) || 'youtube_shorts',
        status: 'draft',
        duration: generated.duration,
        fps: 25,
        resolution: { width: 1080, height: 1920 },
        currentVersion: 'v1',
        versions: [
          {
            version: 'v1',
            createdAt: now,
            status: 'draft',
            duration: generated.duration,
            fps: 25,
            notes: topicRow
              ? `Créé depuis la veille CSV (${topicRow.id} · ${topicRow.categorie}).`
              : 'Projet créé depuis le Studio.',
          },
        ],
        editSpec: {
          sourceTopicId: topicRow?.id || topicId || null,
          sources: topicRow?.sources || args.sources || null,
          beats: generated.beats,
        },
        transcript: generated.transcript,
        motionTrack: generated.motionTrack,
        layoutTrack: generated.layoutTrack,
        sfxTrack: generated.sfxTrack,
        musicTrack: {
          trackName: 'Bright_Corporate_Groove_8c962467.mp3',
          volume: 0.24,
          ducking: true,
        },
        feedbacks: [],
        motionComponents: {},
        contactSheet: [],
        styleProfile: {
          name: 'Papier signature',
          fontFamily: '"Bricolage Grotesque", sans-serif',
          accentColor: '#258EFF',
          textColor: '#14161B',
          cardBg: '#FCFBF8',
          captionsPosition: 'bottom',
          visualBeatsTarget: generated.beats.length,
        },
      };
      saveProject(newProj);
      if (args.set_active !== false) {
        setActiveProjectAndVersion(newProj.id, 'v1');
      }
      return {
        success: true,
        projectId: newProj.id,
        studioUrl: `/?tab=studio&project=${encodeURIComponent(newProj.id)}`,
        playerUrl: `/?project=${encodeURIComponent(newProj.id)}`,
        project: newProj,
        message: `Projet "${newProj.title}" créé et activé (${newProj.currentVersion}).`,
      };
    }

    case 'activate_project': {
      const { project, state } = setActiveProjectAndVersion(
        String(args.project_id || ''),
        args.version ? String(args.version) : undefined
      );
      return {
        success: true,
        projectId: project.id,
        activeVersion: state.activeVersion,
        studioUrl: `/?tab=studio&project=${encodeURIComponent(project.id)}&version=${encodeURIComponent(state.activeVersion || project.currentVersion)}`,
        playerUrl: `/?project=${encodeURIComponent(project.id)}&version=${encodeURIComponent(state.activeVersion || project.currentVersion)}`,
        project: withProjectMediaStatus(project),
      };
    }

    case 'update_short_project': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      if (typeof args.title === 'string' && args.title.trim()) {
        proj.title = args.title.trim().slice(0, 160);
      }
      if (typeof args.hook_text === 'string') {
        proj.hookText = args.hook_text.trim();
      }
      if (typeof args.duration === 'number' && Number.isFinite(args.duration) && args.duration >= 5 && args.duration <= 180) {
        proj.duration = args.duration;
      }
      if (typeof args.status === 'string' && ['draft', 'preparing', 'rendering', 'ready'].includes(args.status)) {
        proj.status = args.status as ShortProject['status'];
      }
      if (typeof args.platform === 'string' && ['instagram', 'tiktok', 'youtube_shorts'].includes(args.platform)) {
        proj.platform = args.platform as ShortProject['platform'];
      }
      if (Array.isArray(args.transcript)) {
        proj.transcript = args.transcript as ShortProject['transcript'];
      }
      if (Array.isArray(args.motion_track)) {
        proj.motionTrack = args.motion_track as ShortProject['motionTrack'];
      }
      if (Array.isArray(args.layout_track)) {
        proj.layoutTrack = args.layout_track as ShortProject['layoutTrack'];
      }
      if (Array.isArray(args.sfx_track)) {
        proj.sfxTrack = args.sfx_track as ShortProject['sfxTrack'];
      }
      if (args.edit_spec && typeof args.edit_spec === 'object') {
        proj.editSpec = { ...(proj.editSpec || {}), ...(args.edit_spec as Record<string, unknown>) };
      }
      if (typeof args.speakerVideoUrl === 'string') {
        proj.speakerVideoUrl = args.speakerVideoUrl;
      }
      if (typeof args.audioTrackUrl === 'string') {
        proj.audioTrackUrl = args.audioTrackUrl;
      }
      saveProject(proj);
      return { success: true, project: proj };
    }

    case 'generate_short_storyboard': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const duration = Math.max(15, Math.min(180, Number(args.duration) || proj.duration || 50));
      const generated = buildStructuredShortAssets({
        title: proj.title,
        hookText: proj.hookText || '',
        angle: args.angle ? String(args.angle) : undefined,
        category: proj.topicCategory,
        sources: args.sources ? String(args.sources) : undefined,
        duration,
        mode: proj.mode,
      });
      proj.duration = generated.duration;
      proj.editSpec = { ...(proj.editSpec || {}), beats: generated.beats };
      proj.motionTrack = generated.motionTrack;
      proj.layoutTrack = generated.layoutTrack;
      proj.sfxTrack = generated.sfxTrack;
      if (!proj.transcript || proj.transcript.length < 10) {
        proj.transcript = generated.transcript;
      }
      saveProject(proj);
      return {
        success: true,
        projectId: proj.id,
        beatsCount: generated.beats.length,
        wordsCount: proj.transcript.length,
        project: proj,
      };
    }

    case 'research_viral_topics': {
      const focus = typeof args.focus === 'string' ? args.focus : undefined;
      return await runDeepTopicResearchAndUpdateCsv(ROOT_DIR, focus);
    }

    case 'list_social_accounts': {
      const treg = inspectTregStatus();
      const tregSet = new Set(treg.connectedPlatforms);
      const raw = getRawSocialAccounts();
      return {
        accounts: (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]).map((p) =>
          toPublicAccountConfig(raw[p], tregSet)
        ),
        treg,
        scheduler: getSchedulerState(),
      };
    }

    case 'generate_social_pack': {
      const proj = getProject(String(args.project_id || ''));
      if (!proj) throw new Error(`Projet "${args.project_id}" introuvable.`);
      const copy = await generateAiSocialCopy(proj);
      const pack = prepareMediaPackForProject(proj, {
        version: args.version ? String(args.version) : proj.currentVersion,
        coverTimestampSec: copy.coverTimestampSec,
        copy,
      });
      return { success: true, projectId: proj.id, copy, pack };
    }

    case 'schedule_short_publish': {
      const platforms = Array.isArray(args.platforms)
        ? (args.platforms.map(String) as SocialPlatform[])
        : [];
      return await createScheduledPostsForProject({
        projectId: String(args.project_id || ''),
        version: args.version ? String(args.version) : undefined,
        platforms,
        scheduledAt: args.scheduled_at ? String(args.scheduled_at) : undefined,
        publishNow: Boolean(args.publish_now),
        youtubeTitle: args.youtube_title ? String(args.youtube_title) : undefined,
        caption: args.caption ? String(args.caption) : undefined,
        privacy:
          args.privacy === 'unlisted' || args.privacy === 'private'
            ? args.privacy
            : 'public',
        routeOverride:
          args.route === 'oauth' || args.route === 'treg' || args.route === 'manual'
            ? (args.route as PublishRoute)
            : undefined,
      });
    }

    case 'list_scheduled_posts': {
      return {
        queue: getScheduledQueue(),
        scheduler: getSchedulerState(),
      };
    }

    case 'run_publish_now': {
      const summary = await runSchedulerTick({ force: true });
      return {
        success: true,
        summary,
        queue: getScheduledQueue(),
      };
    }

    case 'cancel_scheduled_post': {
      const ok = deleteScheduledPost(String(args.job_id || ''));
      if (!ok) throw new Error(`Job "${args.job_id}" introuvable.`);
      return { success: true, deletedJobId: String(args.job_id) };
    }

    default:
      throw new Error(`Outil inconnu : ${toolName}`);
  }
}

export function createStudioRouter(): express.Router {
  const router = express.Router();

  router.get('/healthz', (_req: Request, res: Response) => res.json({ status: 'ok' }));

  router.get('/api/studio/status', async (_req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('studio_status'));
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur statut studio' });
    }
  });

  router.get('/api/studio/videos', async (_req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('list_source_videos'));
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur lecture rushs' });
    }
  });

  router.post('/api/studio/videos/download', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('download_source_video', req.body || {}));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur téléchargement' });
    }
  });

  router.post(
    '/api/studio/videos/upload',
    express.raw({ type: ['application/octet-stream', 'video/*'], limit: '250mb' }),
    (req: Request, res: Response) => {
      try {
        if (Buffer.isBuffer(req.body)) {
          const rawName = String(req.header('x-file-name') || req.query.filename || `take-${Date.now()}.mp4`);
          const video = saveUploadedVideo(rawName, req.body);
          res.json({ success: true, video });
          return;
        }
        const { filename, base64 } = (req.body || {}) as { filename?: string; base64?: string };
        if (!filename || !base64) {
          res.status(400).json({ error: 'Fichier ou contenu base64 requis.' });
          return;
        }
        const video = saveUploadedVideo(filename, base64);
        res.json({ success: true, video });
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur import vidéo' });
      }
    }
  );

  router.get('/api/studio/workspace', (_req: Request, res: Response) => {
    const state = getWorkspaceState();
    const projects = getAllProjects().map((p) => withProjectMediaStatus(p));
    const activeProject =
      projects.find((p) => p.id === state.activeProjectId) || projects[0] || null;
    res.json({
      activeProjectId: state.activeProjectId,
      activeVersion: state.activeVersion,
      activeProject,
      updatedAt: state.updatedAt,
      projects,
    });
  });

  router.post('/api/studio/workspace/active', async (req: Request, res: Response) => {
    try {
      const { projectId, version } = (req.body || {}) as {
        projectId?: string;
        version?: string;
      };
      res.json(
        await executeToolCall('activate_project', {
          project_id: projectId,
          version,
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Activation impossible' });
    }
  });

  router.get('/api/studio/projects', (_req: Request, res: Response) => {
    res.json({ projects: getAllProjects().map((p) => withProjectMediaStatus(p)) });
  });

  router.post('/api/studio/projects/from-topic', async (req: Request, res: Response) => {
    try {
      const result = await executeToolCall('create_project_from_topic', req.body || {});
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur création projet depuis veille',
      });
    }
  });

  router.post('/api/studio/projects', async (req: Request, res: Response) => {
    try {
      const result = await executeToolCall('create_short_project', req.body || {});
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur création projet' });
    }
  });

  router.get('/api/studio/projects/:id', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    res.json({ project: withProjectMediaStatus(proj) });
  });

  router.patch('/api/studio/projects/:id', async (req: Request, res: Response) => {
    try {
      const result = await executeToolCall('update_short_project', {
        project_id: req.params.id,
        ...(req.body || {}),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur mise à jour projet' });
    }
  });

  router.post('/api/studio/projects/:id/generate-storyboard', async (req: Request, res: Response) => {
    try {
      const result = await executeToolCall('generate_short_storyboard', {
        project_id: req.params.id,
        ...(req.body || {}),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur génération storyboard' });
    }
  });

  router.delete('/api/studio/projects/:id', (req: Request, res: Response) => {
    const ok = deleteProject(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    res.json({ success: true });
  });

  router.patch('/api/studio/projects/:id/platform', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const { platform } = (req.body || {}) as { platform?: ShortProject['platform'] };
    if (!platform || !['instagram', 'tiktok', 'youtube_shorts'].includes(platform)) {
      res.status(400).json({ error: 'Plateforme invalide' });
      return;
    }
    proj.platform = platform;
    saveProject(proj);
    res.json({ success: true, project: proj });
  });

  router.get('/api/studio/projects/:id/feedbacks', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    res.json({ feedbacks: proj.feedbacks || [] });
  });

  router.post('/api/studio/projects/:id/feedbacks', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const { timestamp, timeFormatted, quoteText, text, targetElement, drawingSnapshot, type } =
      (req.body || {}) as {
        timestamp?: number;
        timeFormatted?: string;
        quoteText?: string;
        text?: string;
        targetElement?: string;
        drawingSnapshot?: string;
        type?: FeedbackItem['type'];
      };

    if (typeof text !== 'string' || !text.trim() || text.length > 3000) {
      res.status(400).json({ error: 'Le commentaire doit contenir entre 1 et 3000 caractères.' });
      return;
    }

    const safeTimestamp = Number(timestamp);
    const newFeedback: FeedbackItem = {
      id: `fb-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      version: proj.currentVersion,
      timestamp: Number.isFinite(safeTimestamp) && safeTimestamp >= 0 ? safeTimestamp : 0,
      timeFormatted: typeof timeFormatted === 'string' ? timeFormatted.slice(0, 20) : '00:00.00',
      quoteText: typeof quoteText === 'string' ? quoteText.slice(0, 500) : undefined,
      text: text.trim(),
      author: 'Créateur',
      resolved: false,
      targetElement: typeof targetElement === 'string' ? targetElement.slice(0, 300) : undefined,
      drawingSnapshot:
        typeof drawingSnapshot === 'string' && drawingSnapshot.length <= 2_000_000
          ? drawingSnapshot
          : undefined,
      createdAt: new Date().toISOString(),
      type: type && ['comment', 'cut', 'idea'].includes(type) ? type : 'comment',
    };

    if (!proj.feedbacks) proj.feedbacks = [];
    proj.feedbacks.unshift(newFeedback);
    saveProject(proj);
    res.json({ success: true, feedback: newFeedback });
  });

  router.patch('/api/studio/projects/:id/feedbacks/:fId', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const fb = proj.feedbacks.find((f) => f.id === req.params.fId);
    if (!fb) {
      res.status(404).json({ error: 'Feedback introuvable' });
      return;
    }
    if (typeof req.body?.resolved === 'boolean') {
      fb.resolved = req.body.resolved;
    }
    if (typeof req.body?.text === 'string' && req.body.text.trim()) {
      fb.text = req.body.text.trim();
    }
    saveProject(proj);
    res.json({ success: true, feedback: fb });
  });

  router.delete('/api/studio/projects/:id/feedbacks/:fId', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    proj.feedbacks = proj.feedbacks.filter((f) => f.id !== req.params.fId);
    saveProject(proj);
    res.json({ success: true });
  });

  router.patch('/api/studio/projects/:id/words/:wId/cut', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const word = proj.transcript.find((w) => w.id === req.params.wId);
    if (!word) {
      res.status(404).json({ error: 'Mot introuvable' });
      return;
    }
    word.isCut = !word.isCut;
    saveProject(proj);
    res.json({ success: true, word });
  });

  router.get('/api/studio/projects/:id/copy-prompt', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const promptMarkdown = buildFeedbackPromptMarkdown(proj);
    res.json({
      projectId: proj.id,
      slug: proj.slug,
      version: proj.currentVersion,
      openFeedbacksCount: (proj.feedbacks || []).filter((f) => !f.resolved).length,
      promptMarkdown,
    });
  });

  router.get('/api/studio/projects/:id/versions', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('get_version_history', { project_id: req.params.id }));
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur versions' });
    }
  });

  router.post('/api/studio/projects/:id/versions', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('create_project_version', {
          project_id: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur création version' });
    }
  });

  router.patch('/api/studio/projects/:id/versions/:version', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const ver = (proj.versions || []).find((v) => v.version === req.params.version);
    if (!ver) {
      res.status(404).json({ error: `Version ${req.params.version} introuvable` });
      return;
    }
    const body = (req.body || {}) as {
      activate?: boolean;
      notes?: string;
      status?: 'draft' | 'done' | 'current' | 'failed' | 'rendering';
      outputMp4?: string;
      contactSheetUrl?: string;
      duration?: number;
    };
    if (typeof body.notes === 'string') ver.notes = body.notes;
    if (body.status) ver.status = body.status;
    if (typeof body.outputMp4 === 'string') ver.outputMp4 = body.outputMp4;
    if (typeof body.contactSheetUrl === 'string') ver.contactSheetUrl = body.contactSheetUrl;
    if (typeof body.duration === 'number' && body.duration > 0) ver.duration = body.duration;
    if (body.activate !== false) {
      proj.currentVersion = ver.version;
      if (ver.duration > 0) proj.duration = ver.duration;
      saveProject(proj);
      setActiveProjectAndVersion(proj.id, ver.version);
    } else {
      saveProject(proj);
    }
    res.json({ success: true, project: proj, version: ver });
  });

  router.get('/api/studio/projects/:id/download', (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    const targetVersion =
      typeof req.query.version === 'string' && req.query.version
        ? req.query.version
        : proj.currentVersion;
    const foundPath = resolveProjectMp4Path(proj, targetVersion);
    if (!foundPath) {
      res.status(404).json({
        error: `Aucun MP4 rendu disponible pour ${proj.title} (${targetVersion}).`,
      });
      return;
    }
    const stat = fs.statSync(foundPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${proj.slug}-${targetVersion}-hd.mp4"`
    );
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(foundPath).pipe(res);
  });

  router.post('/api/studio/projects/:id/render-now', async (req: Request, res: Response) => {
    const proj = getProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Projet introuvable' });
      return;
    }
    try {
      const body = (req.body || {}) as { version?: string; lookId?: LookId };
      const targetVersion = body.version || proj.currentVersion || 'v1';
      const lookId: LookId =
        body.lookId === 'pop' || body.lookId === 'poster'
          ? body.lookId
          : ((proj.editSpec?.lookId as LookId) || 'papier');

      const projectDir = path.join(PROJECTS_DIR, proj.id);
      fs.mkdirSync(projectDir, { recursive: true });

      let voiceMp3Path: string | undefined;
      if (proj.audioTrackUrl) {
        const candidateVoice = path.join(projectDir, path.basename(proj.audioTrackUrl));
        if (fs.existsSync(candidateVoice)) {
          voiceMp3Path = candidateVoice;
        }
      }

      const rawBeats = Array.isArray(proj.editSpec?.beats)
        ? (proj.editSpec.beats as BatchBeatSpec[])
        : [];
      if (!voiceMp3Path && rawBeats.length > 0) {
        const spokenText = rawBeats
          .map((b) => sanitizeScriptText(b.spokenLine || ''))
          .filter(Boolean)
          .join(' ');
        if (spokenText) {
          const speed = Math.min(1.06, Math.max(0.95, Number(proj.editSpec?.speed) || 1.05));
          const voice = await synthesizeVoiceoverForProject({
            projectDir,
            fullText: spokenText,
            speed,
            voiceFilename: `voice_${targetVersion}.mp3`,
          });
          voiceMp3Path = voice.voiceMp3Path;
          if (voice.audioTrackUrl) {
            proj.audioTrackUrl = voice.audioTrackUrl;
          }
          const timed = assignBeatTimingsAndTranscript(rawBeats, voice.words, voice.durationSec);
          proj.duration = timed.durationSec;
          proj.transcript = voice.words;
          proj.motionTrack = timed.motionTrack;
          proj.sfxTrack = timed.sfxTrack;
          proj.layoutTrack = timed.beats.map((b, bIdx) => ({
            id: `layout-${b.id}`,
            layout: resolveBeatLayout(b, bIdx, timed.beats.length),
            start: b.from,
            end: b.to,
          }));
          proj.editSpec = { ...(proj.editSpec || {}), beats: timed.beats };
          saveProject(proj, { skipMirror: true });
        }
      }

      const port = Number(process.env.PORT) || 3000;
      const rendered = await renderDynamicProjectToMp4({
        project: proj,
        version: targetVersion,
        lookId,
        port,
        voiceMp3Path,
      });

      proj.status = 'ready';
      proj.duration = rendered.duration;
      proj.hasMp4 = true;
      const vIdx = (proj.versions || []).findIndex((v) => v.version === targetVersion);
      if (vIdx >= 0) {
        proj.versions[vIdx] = {
          ...proj.versions[vIdx],
          status: 'done',
          duration: rendered.duration,
          outputMp4: rendered.outputMp4Url,
          contactSheetUrl: rendered.contactSheetUrl,
          hasMp4: true,
        };
      }
      saveProject(proj);
      triggerAutoSyncInBackground(proj.id);

      res.json({
        success: true,
        project: withProjectMediaStatus(proj),
        outputMp4Url: rendered.outputMp4Url,
        contactSheetUrl: rendered.contactSheetUrl,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur lors du rendu MP4 du Short.',
      });
    }
  });

  router.post('/api/studio/projects/:id/transcribe', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('transcribe_short', {
          project_id: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur transcription' });
    }
  });

  router.get('/api/studio/projects/:id/transcript', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('read_short_transcript', { project_id: req.params.id }));
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur transcript' });
    }
  });

  router.post('/api/studio/projects/:id/prepare', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('prepare_short', {
          project_id: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur préparation' });
    }
  });

  router.post('/api/studio/projects/:id/spec', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('save_edit_spec', {
          project_id: req.params.id,
          edit_spec: req.body,
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur spec' });
    }
  });

  router.post('/api/studio/components', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('write_motion_component', req.body || {}));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur composant' });
    }
  });

  router.post('/api/studio/components/:id/capture', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('capture_motion_component', {
          component_name: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur capture' });
    }
  });

  router.post('/api/studio/projects/:id/render', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('render_short', {
          project_id: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur rendu' });
    }
  });

  router.get('/api/studio/jobs/:id', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('job_status', { job_id: req.params.id }));
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Job introuvable' });
    }
  });

  router.get('/api/studio/projects/:id/outputs', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('get_short_outputs', {
          project_id: req.params.id,
          version: typeof req.query.version === 'string' ? req.query.version : undefined,
        })
      );
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Outputs introuvables' });
    }
  });

  router.post('/api/studio/projects/:id/contact-sheet', async (req: Request, res: Response) => {
    try {
      res.json(
        await executeToolCall('make_reference_contact_sheet', {
          project_id: req.params.id,
          ...(req.body || {}),
        })
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur planche contact' });
    }
  });

  router.post('/api/studio/styles', async (req: Request, res: Response) => {
    try {
      res.json(await executeToolCall('save_style_profile', req.body || {}));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur style' });
    }
  });

  router.post('/api/studio/execute-tool', async (req: Request, res: Response) => {
    const { toolName, args } = (req.body || {}) as {
      toolName?: string;
      args?: Record<string, unknown>;
    };
    try {
      const result = await executeToolCall(String(toolName || ''), args || {});
      res.json({ success: true, result });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err instanceof Error ? err.message : 'Erreur outil',
      });
    }
  });

  // MCP JSON-RPC 2.0 endpoint
  router.post(['/api/mcp', '/mcp'], async (req: Request, res: Response) => {
    const { id, method, params } = (req.body || {}) as {
      id?: string | number | null;
      method?: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };

    if (method === 'initialize') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: true }, resources: { subscribe: false, listChanged: false } },
          serverInfo: { name: 'studio-short-feedback', version: '2.0.0' },
        },
      });
      return;
    }

    if (method === 'notifications/initialized') {
      res.status(200).send();
      return;
    }

    if (method === 'tools/list') {
      res.json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
      return;
    }

    if (method === 'tools/call') {
      try {
        const output = await executeToolCall(String(params?.name || ''), params?.arguments || {});
        res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] },
        });
      } catch (err) {
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `ERREUR : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
              },
            ],
            isError: true,
          },
        });
      }
      return;
    }

    if (method === 'ping') {
      res.json({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Méthode non implémentée: ${method}` },
    });
  });

  router.get(['/api/mcp/sse', '/mcp/sse', '/sse'], (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const sessionId = `mcp-session-${Date.now()}`;
    res.write(`event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`);
    req.on('close', () => {
      // client disconnected
    });
  });

  router.post(['/api/mcp/messages', '/mcp/messages', '/messages'], (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // OpenAPI 3.1 Specification for Custom GPT / Remote Agents
  router.get(['/api/openapi.json', '/openapi.json', '/.well-known/openapi.json'], (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol =
      req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const serverUrl = `${protocol}://${host}`;
    res.json({
      openapi: '3.1.0',
      info: {
        title: 'Studio Short — API Feedback & Montage Vidéo',
        description:
          'API REST & MCP pour gérer les projets Shorts, retours horodatés, versions, composants animés window.setT(t), planches QC et rendus FFmpeg.',
        version: '2.0.0',
      },
      servers: [{ url: serverUrl, description: 'Serveur Studio' }],
      paths: {
        '/api/studio/status': {
          get: {
            operationId: 'studio_status',
            summary: "Vérifier l'état du studio",
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/studio/projects': {
          get: {
            operationId: 'list_projects',
            summary: 'Lister les projets Shorts',
            responses: { '200': { description: 'OK' } },
          },
          post: {
            operationId: 'create_short_project',
            summary: 'Créer un nouveau projet Short',
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/studio/projects/{id}': {
          get: {
            operationId: 'get_project',
            summary: "Charger les détails complets d'un projet",
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/studio/projects/{id}/feedbacks': {
          get: {
            operationId: 'list_feedbacks',
            summary: 'Lister les retours horodatés du projet',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
          post: {
            operationId: 'add_feedback',
            summary: 'Ajouter un retour horodaté',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/studio/projects/{id}/contact-sheet': {
          post: {
            operationId: 'make_reference_contact_sheet',
            summary: 'Générer une planche contact QC 12 images',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
        },
        '/api/studio/projects/{id}/render': {
          post: {
            operationId: 'render_short',
            summary: 'Lancer un rendu vidéo FFmpeg',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });
  });

  return router;
}
