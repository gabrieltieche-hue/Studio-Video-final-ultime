import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatStudioTimecode } from '../../types/studio';

interface StudioPlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  timelineOpen?: boolean;
  onToggleTimeline?: () => void;
  videoOpen?: boolean;
  onToggleVideo?: () => void;
}

export const StudioPlaybackControls: React.FC<StudioPlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  isMuted,
  onToggleMute,
  timelineOpen = false,
  onToggleTimeline,
  videoOpen = true,
  onToggleVideo,
}) => {
  const speeds = [0.5, 1.0, 1.06, 1.25, 1.5];

  return (
    <div className="h-11 bg-[#FCFBF8] border-t border-[#E3DED3] px-3 sm:px-4 flex items-center justify-between gap-2 select-none shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-mono font-bold text-[#14161B] tabular-nums">
          {formatStudioTimecode(currentTime)}
        </span>
        <span className="text-[11px] font-mono text-[#A19F98] tabular-nums hidden sm:inline">
          / {formatStudioTimecode(duration)}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => onSeek(0)}
          title="Début (00:00)"
          aria-label="Revenir au début"
          className="p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSeek(Math.max(0, currentTime - 0.5))}
          title="Reculer 0.5 s"
          aria-label="Reculer 0.5 seconde"
          className="p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}
          className="w-9 h-9 rounded-xl bg-[#14161B] hover:bg-[#258EFF] text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => onSeek(Math.min(duration, currentTime + 0.5))}
          title="Avancer 0.5 s"
          aria-label="Avancer 0.5 seconde"
          className="p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onSeek(duration)}
          title="Fin"
          aria-label="Aller à la fin"
          className="p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden md:flex items-center bg-[#EAE7DF] p-0.5 rounded-lg">
          {speeds.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => onChangeSpeed(sp)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                Math.abs(playbackSpeed - sp) < 0.01
                  ? 'bg-[#FCFBF8] text-[#14161B] shadow-sm'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
              }`}
            >
              {sp}×
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="p-1.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] hover:bg-[#EAE7DF] transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-[#DC2626]" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {onToggleVideo && (
          <button
            type="button"
            onClick={onToggleVideo}
            aria-pressed={videoOpen}
            title={videoOpen ? 'Masquer la vidéo 9:16' : 'Afficher la vidéo 9:16'}
            aria-label={videoOpen ? 'Masquer la vidéo 9:16' : 'Afficher la vidéo 9:16'}
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              videoOpen
                ? 'bg-white text-[#14161B] border-[#E3DED3] hover:bg-[#EAE7DF]'
                : 'bg-[#14161B] text-white border-[#14161B]'
            }`}
          >
            {videoOpen ? (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">{videoOpen ? 'Masquer vidéo' : 'Afficher vidéo'}</span>
          </button>
        )}

        {onToggleTimeline && (
          <button
            type="button"
            onClick={onToggleTimeline}
            aria-pressed={timelineOpen}
            title={timelineOpen ? 'Masquer la timeline' : 'Afficher la timeline'}
            aria-label={timelineOpen ? 'Masquer la timeline' : 'Afficher la timeline'}
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              timelineOpen
                ? 'bg-[#14161B] text-white border-[#14161B]'
                : 'bg-white text-[#5C5F68] border-[#E3DED3] hover:text-[#14161B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        )}
      </div>
    </div>
  );
};
