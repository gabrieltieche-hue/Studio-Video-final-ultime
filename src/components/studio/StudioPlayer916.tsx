import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Eraser,
  Eye,
  Film,
  MousePointer,
  PenTool,
  Shield,
  Target,
} from 'lucide-react';
import { ShortStage } from '../short/ShortStage';
import { LOOK_PRESETS } from '../../data/shortSpec';
import type { ShortProject } from '../../types/studio';

interface StudioPlayer916Props {
  project: ShortProject;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  playbackSpeed: number;
  timelineOpen?: boolean;
  selectedTargetElement: string | null;
  onSelectTargetElement: (el: string) => void;
  onSaveSnapshot: (dataUrl: string) => void;
  onSyncTimeFromVideo?: (t: number) => void;
}

const PEN_COLORS = [
  { id: '#258EFF', label: 'Bleu' },
  { id: '#DC2626', label: 'Rouge' },
  { id: '#D97706', label: 'Ambre' },
  { id: '#14161B', label: 'Encre' },
];

export const StudioPlayer916: React.FC<StudioPlayer916Props> = ({
  project,
  currentTime,
  isPlaying,
  isMuted,
  playbackSpeed,
  timelineOpen = false,
  selectedTargetElement,
  onSelectTargetElement,
  onSaveSnapshot,
  onSyncTimeFromVideo,
}) => {
  const [tool, setTool] = useState<'normal' | 'inspect' | 'draw'>('normal');
  const [penColor, setPenColor] = useState('#258EFF');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const drawingRef = useRef(false);

  // Pick MP4 corresponding to active version first, fallback to latest version with MP4 or speakerVideoUrl
  const activeVersionObj = (project.versions || []).find(
    (v) => v.version === project.currentVersion
  );
  const fallbackVersionWithMp4 = (project.versions || []).find((v) => v.outputMp4);
  const mediaSrc =
    activeVersionObj?.outputMp4 ||
    fallbackVersionWithMp4?.outputMp4 ||
    project.speakerVideoUrl ||
    undefined;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || project.isFlagshipReactStage) return;
    vid.muted = isMuted;
    vid.playbackRate = playbackSpeed;
    if (isPlaying && vid.paused) {
      void vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [isPlaying, isMuted, playbackSpeed, project.isFlagshipReactStage, mediaSrc]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || project.isFlagshipReactStage) return;
    if (Math.abs(vid.currentTime - currentTime) > 0.35) {
      vid.currentTime = currentTime;
    }
  }, [currentTime, project.isFlagshipReactStage]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw' || !canvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool !== 'draw' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setSnapshotSaved(false);
  };

  const attachDrawingSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSnapshot(dataUrl);
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 2500);
  };

  const inspectZones = [
    {
      id: 'Motion Top Card',
      label: 'Carte Motion Supérieure',
      cls: 'top-[10%] left-[8%] right-[8%] h-[34%]',
    },
    {
      id: 'Captions Zone',
      label: 'Bloc Sous-titres Unifié',
      cls: 'top-[47%] left-[10%] right-[10%] h-[13%]',
    },
    {
      id: 'B-Roll / Bottom Media',
      label: 'Zone B-Roll / Preuve',
      cls: 'top-[62%] left-[8%] right-[8%] h-[30%]',
    },
  ];

  // Height-driven responsive sizing so BOTH toolbar and entire 9:16 stage never clip on 1280x720 or 1440x900
  const stageMaxHeightClass = timelineOpen
    ? 'h-[310px] sm:h-[min(42vh,360px)]'
    : 'h-[360px] sm:h-[min(62vh,520px)]';

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-3 py-2 sm:py-3 bg-[#F6F5F1] overflow-y-auto min-h-0">
      {/* Compact Inspection & Drawing Toolbar (always visible, never clipped) */}
      <div className="mb-2 flex flex-col items-center gap-1.5 shrink-0 max-w-full">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FCFBF8] border border-[#E3DED3] shadow-sm flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setTool('normal')}
            aria-pressed={tool === 'normal'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
              tool === 'normal' ? 'bg-[#14161B] text-white' : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <MousePointer className="w-3 h-3" />
            Normal
          </button>

          <button
            type="button"
            onClick={() => setTool('inspect')}
            aria-pressed={tool === 'inspect'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
              tool === 'inspect' ? 'bg-[#258EFF] text-white' : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Target className="w-3 h-3" />
            Inspecter
          </button>

          <button
            type="button"
            onClick={() => setTool('draw')}
            aria-pressed={tool === 'draw'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
              tool === 'draw' ? 'bg-[#258EFF] text-white shadow-sm' : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <PenTool className="w-3 h-3" />
            Dessiner
          </button>

          <div className="w-px h-4 bg-[#E3DED3] mx-0.5" />

          <button
            type="button"
            onClick={() => setShowSafeZones((s) => !s)}
            aria-pressed={showSafeZones}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
              showSafeZones
                ? 'bg-[#059669]/15 text-[#065F46]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Shield className="w-3 h-3" />
            Safe Zones
          </button>
        </div>

        {/* Dedicated Drawing Sub-bar (immediately visible as soon as Dessiner is selected) */}
        {tool === 'draw' && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FCFBF8] border border-[#258EFF]/40 shadow-sm text-[11px] flex-wrap justify-center">
            <span className="text-[#5C5F68] font-medium hidden sm:inline">
              Tracez sur la vidéo :
            </span>
            <div className="inline-flex items-center gap-1" role="group" aria-label="Couleur du stylo">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={`Couleur ${c.label}`}
                  onClick={() => setPenColor(c.id)}
                  className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform ${
                    penColor === c.id ? 'border-[#14161B] scale-115' : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: c.id }}
                />
              ))}
            </div>
            <div className="w-px h-3.5 bg-[#E3DED3]" />
            <button
              type="button"
              onClick={clearDrawing}
              disabled={!hasStroke}
              className="px-2 py-0.5 rounded-lg text-[#5C5F68] hover:text-[#DC2626] disabled:opacity-40 inline-flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eraser className="w-3 h-3" />
              Effacer
            </button>
            <button
              type="button"
              onClick={attachDrawingSnapshot}
              disabled={!hasStroke}
              className="px-2.5 py-0.5 rounded-lg bg-[#059669] hover:opacity-90 disabled:opacity-40 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              {snapshotSaved ? 'Croquis joint !' : 'Joindre au feedback'}
            </button>
          </div>
        )}
      </div>

      {/* 9:16 Stage Frame — height-constrained to never clip vertically */}
      <div
        className={`relative ${stageMaxHeightClass} aspect-[9/16] rounded-[20px] overflow-hidden border border-[#E3DED3] shadow-lg bg-[#F1EEE6] shrink-0 my-auto`}
      >
        {project.isFlagshipReactStage ? (
          <ShortStage
            t={currentTime}
            look={LOOK_PRESETS.papier}
            showSafeZones={showSafeZones}
          />
        ) : mediaSrc ? (
          <video
            ref={videoRef}
            src={mediaSrc}
            playsInline
            onTimeUpdate={(e) => onSyncTimeFromVideo?.(e.currentTarget.currentTime)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center gap-2 text-[#5C5F68]">
            <Film className="w-8 h-8 text-[#258EFF]" />
            <p className="text-xs font-bold text-[#14161B]">{project.title}</p>
            <p className="text-[11px] leading-relaxed">
              Projet {project.currentVersion} ({project.mode === 'faceless_explainer' ? 'Motion Paper' : 'Split-Screen'}).
              {project.hookText ? ` Hook : « ${project.hookText} »` : ' Prêt pour rendu FFmpeg ou import vidéo.'}
            </p>
          </div>
        )}

        {/* Safe Zone Overlay (for video projects without ShortStage built-in safezones) */}
        {showSafeZones && !project.isFlagshipReactStage && (
          <div className="absolute inset-0 pointer-events-none border-[14px] border-[#059669]/20 z-20">
            <div className="absolute top-3 left-3 px-1.5 py-0.5 rounded bg-[#059669] text-white text-[9px] font-mono">
              SAFE 9:16
            </div>
          </div>
        )}

        {/* Inspect Hit Zones Overlay */}
        {tool === 'inspect' && (
          <div className="absolute inset-0 z-30">
            {inspectZones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => onSelectTargetElement(zone.id)}
                className={`absolute ${zone.cls} rounded-xl border-2 border-dashed transition-all cursor-crosshair flex items-end p-2 ${
                  selectedTargetElement === zone.id || hoveredZone === zone.id
                    ? 'border-[#258EFF] bg-[#258EFF]/15'
                    : 'border-[#14161B]/30 bg-transparent'
                }`}
              >
                <span className="px-2 py-0.5 rounded bg-[#14161B] text-white text-[9px] font-bold flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5 text-[#258EFF]" />
                  {zone.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Freehand Drawing Overlay Canvas */}
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`absolute inset-0 w-full h-full z-40 touch-none ${
            tool === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
          }`}
        />
      </div>
    </div>
  );
};
