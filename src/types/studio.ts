export interface WhisperWord {
  id: string;
  word: string;
  start: number;
  end: number;
  confidence: number;
  isCut?: boolean;
}

export interface FeedbackItem {
  id: string;
  version?: string;
  timestamp: number;
  timeFormatted: string;
  quoteText?: string;
  text: string;
  author: string;
  resolved: boolean;
  resolutionNote?: string;
  targetElement?: string;
  drawingSnapshot?: string;
  createdAt: string;
  type?: 'comment' | 'cut' | 'idea';
}

export interface MotionComponent {
  id: string;
  name: string;
  code: string;
  tRange: [number, number];
  width: number;
  height: number;
  fps: number;
  hasAlpha: boolean;
  description: string;
}

export interface RenderVersion {
  version: string;
  createdAt: string;
  status: 'draft' | 'done' | 'current' | 'failed' | 'rendering';
  duration: number;
  fps: number;
  notes: string;
  platform?: string;
  outputMp4?: string;
  contactSheetUrl?: string;
  audioTrackUrl?: string;
  hasMp4?: boolean;
}

export interface StudioWorkspaceState {
  activeProjectId: string;
  activeVersion?: string;
  updatedAt: string;
}

export interface ContactSheetFrame {
  frameIndex: number;
  timestamp: number;
  timeFormatted: string;
  title: string;
  qcCheck: 'pass' | 'revise' | 'blocked';
  notes: string;
  previewUrl?: string;
}

export interface MotionTrackItem {
  id: string;
  componentId: string;
  name: string;
  start: number;
  end: number;
  type: 'chart' | 'network' | 'rocket' | 'counter' | 'typography' | 'card';
  color?: string;
}

export interface LayoutTrackItem {
  id: string;
  layout: 'split' | 'fullscreen' | 'facecam' | 'camera';
  start: number;
  end: number;
}

export interface SfxTrackItem {
  id: string;
  sound: string;
  start: number;
  volume: number;
}

export interface ScriptLine {
  id: string;
  num: string;
  text: string;
}

export interface ScriptItem {
  id: string;
  title: string;
  category: 'TO RECORD' | 'REMAKE' | 'TO EDIT' | 'YOLO';
  duration: string;
  takesCount: number;
  lines: ScriptLine[];
}

export interface ShortProject {
  id: string;
  slug: string;
  title: string;
  topicId?: string;
  topicCategory?: string;
  hookText?: string;
  mode: 'faceless_explainer' | 'split_screen_clips';
  platform: 'instagram' | 'tiktok' | 'youtube_shorts';
  status: 'draft' | 'preparing' | 'rendering' | 'ready';
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
  isFlagshipReactStage?: boolean;
  sourceVideoName?: string;
  preparedVideoName?: string;
  editSpec?: Record<string, unknown>;
  silenceAnalysis?: {
    totalSilencesRemoved: number;
    originalDuration: number;
    adjustedDuration: number;
    speechSegments: Array<{ start: number; end: number }>;
  };
  speakerVideoUrl?: string;
  audioTrackUrl?: string;
  hasMp4?: boolean;
  currentVersion: string;
  versions: RenderVersion[];
  transcript: WhisperWord[];
  motionTrack: MotionTrackItem[];
  layoutTrack: LayoutTrackItem[];
  sfxTrack: SfxTrackItem[];
  musicTrack: {
    trackName: string;
    volume: number;
    ducking: boolean;
  };
  feedbacks: FeedbackItem[];
  motionComponents: Record<string, MotionComponent>;
  contactSheet: ContactSheetFrame[];
  styleProfile: {
    name: string;
    fontFamily: string;
    accentColor: string;
    textColor: string;
    cardBg: string;
    captionsPosition: 'center_divider' | 'bottom' | 'top';
    visualBeatsTarget: number;
  };
}

export interface SourceVideo {
  id: string;
  name: string;
  duration: number;
  resolution: string;
  sizeMb: number;
  recordedAt: string;
  url?: string;
  thumbnailUrl?: string;
  path?: string;
  category?: 'Pubs' | 'Shorts' | 'Dates';
  dateFolder?: string;
}

export function formatStudioTimecode(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(2)}`;
}

export function buildFeedbackPromptMarkdown(project: ShortProject): string {
  const openFeedbacks = (project.feedbacks || []).filter((f) => !f.resolved);
  const lines: string[] = [
    `# RETOURS STUDIO VIDEO — Projet : ${project.title} (${project.slug} · ${project.currentVersion})`,
    `Format : ${project.mode === 'split_screen_clips' ? 'Mode B — Split-Screen Clips' : 'Mode A — Faceless Explainer'} | Plateforme : ${project.platform} | 1080×1920 (9:16) | Durée : ${project.duration.toFixed(1)} s`,
    '',
    `Session d'inspection vidéo (${openFeedbacks.length} retour${openFeedbacks.length > 1 ? 's' : ''} ouvert${openFeedbacks.length > 1 ? 's' : ''}) :`,
    '',
  ];

  if (openFeedbacks.length === 0) {
    lines.push('✅ Aucun retour ouvert. La vidéo est validée (PASS QC) et prête pour export.');
  } else {
    openFeedbacks.forEach((fb, idx) => {
      const kind = fb.type === 'cut' ? 'Coupe' : fb.type === 'idea' ? 'Idée' : 'Commentaire';
      lines.push(`### Retour #${idx + 1} [${fb.timeFormatted}] (${kind})`);
      if (fb.targetElement) {
        lines.push(`- **Élément ciblé** : \`${fb.targetElement}\``);
      }
      if (fb.quoteText) {
        lines.push(`- **Mot prononcé** : « ${fb.quoteText} »`);
      }
      lines.push(`- **Instruction** : ${fb.text}`);
      if (fb.drawingSnapshot) {
        lines.push('- **Annotation graphique** : [Capture annotée jointe dans le studio]');
      }
      lines.push('');
    });
    lines.push('---');
    lines.push('## Instructions techniques de mise à jour :');
    lines.push('1. Applique chaque retour dans la spec de montage ou le composant ciblé.');
    lines.push('2. Respecte les règles studio : voix Brian ≤ 1.06×, Bright Corporate Groove à -12.5 dB (0.24), bloc sous-titres unifié, halos bleus légers, zéro barre en haut.');
    lines.push(`3. Génère ensuite la version suivante (v${(project.versions?.length || 1) + 1}) et vérifie la planche QC.`);
  }

  return lines.join('\n');
}
