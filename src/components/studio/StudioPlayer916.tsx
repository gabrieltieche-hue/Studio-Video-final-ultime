import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Eraser,
  Eye,
  Film,
  MousePointer,
  PenTool,
  Shield,
  Target,
  Undo2,
} from 'lucide-react';
import { ShortStage } from '../short/ShortStage';
import { DynamicShortStage } from '../short/DynamicShortStage';
import { LOOK_PRESETS } from '../../data/shortSpec';
import type { ShortProject } from '../../types/studio';

interface StudioPlayer916Props {
  project: ShortProject;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  playbackSpeed: number;
  selectedTargetElement: string | null;
  drawingResetSignal?: number;
  onSelectTargetElement: (el: string) => void;
  onSaveSnapshot: (dataUrl: string | null) => void;
  onSyncTimeFromVideo?: (t: number) => void;
}

interface StrokePath {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
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
  selectedTargetElement,
  drawingResetSignal = 0,
  onSelectTargetElement,
  onSaveSnapshot,
  onSyncTimeFromVideo,
}) => {
  const [tool, setTool] = useState<'normal' | 'inspect' | 'draw'>('normal');
  const [penColor, setPenColor] = useState('#258EFF');
  const [penWidth, setPenWidth] = useState<4 | 8>(4);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  const stageSlotRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 280,
    height: 498,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<StrokePath[]>([]);
  const activeStrokeRef = useRef<StrokePath | null>(null);
  const onSaveSnapshotRef = useRef(onSaveSnapshot);
  useEffect(() => {
    onSaveSnapshotRef.current = onSaveSnapshot;
  }, [onSaveSnapshot]);

  // Pick MP4 corresponding to active version first, fallback to latest version with MP4 or speakerVideoUrl
  const activeVersionObj = (project.versions || []).find(
    (v) => v.version === project.currentVersion
  );
  const mediaSrc = !project.isFlagshipReactStage
    ? activeVersionObj?.outputMp4 || project.speakerVideoUrl || undefined
    : activeVersionObj?.outputMp4 &&
        activeVersionObj.version !== 'v1' &&
        activeVersionObj.outputMp4 !== '/video/short-interdiction-15-ans.mp4'
      ? activeVersionObj.outputMp4
      : undefined;

  // Measure available viewport box and compute exact 9:16 dimensions so stage NEVER clips or overflows
  useEffect(() => {
    const el = stageSlotRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(160, rect.width - 8);
      const availH = Math.max(240, rect.height - 8);
      const maxWidthByHeight = availH * (9 / 16);
      const w = Math.floor(Math.min(availW, maxWidthByHeight, 420));
      const h = Math.floor((w * 16) / 9);
      setStageSize({ width: w, height: h });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [tool]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !mediaSrc) return;
    vid.muted = isMuted;
    vid.playbackRate = playbackSpeed;
    if (isPlaying && vid.paused) {
      void vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [isPlaying, isMuted, playbackSpeed, mediaSrc]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !mediaSrc) return;
    if (Math.abs(vid.currentTime - currentTime) > 0.35) {
      vid.currentTime = currentTime;
    }
  }, [currentTime, mediaSrc]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const allStrokes = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current;

    for (const st of allStrokes) {
      if (st.points.length === 0) continue;
      ctx.strokeStyle = st.color;
      ctx.lineWidth = st.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(st.points[0].x, st.points[0].y);
      if (st.points.length === 1) {
        ctx.lineTo(st.points[0].x + 0.5, st.points[0].y + 0.5);
      } else {
        for (let i = 1; i < st.points.length; i++) {
          ctx.lineTo(st.points[i].x, st.points[i].y);
        }
      }
      ctx.stroke();
    }
  }, []);

  const clearDrawing = useCallback(
    (notifyParent = true) => {
      strokesRef.current = [];
      activeStrokeRef.current = null;
      drawingRef.current = false;
      setStrokeCount(0);
      setSnapshotSaved(false);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.width;
      }
      redrawCanvas();
      if (notifyParent) onSaveSnapshotRef.current(null);
    },
    [redrawCanvas]
  );

  // Reset drawing canvas when parent clears/submits feedback or switches project
  useEffect(() => {
    if (drawingResetSignal > 0) {
      clearDrawing(false);
    }
  }, [drawingResetSignal, clearDrawing]);

  useEffect(() => {
    clearDrawing(false);
  }, [project.id, clearDrawing]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw' || !canvasRef.current) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointerId is inactive (e.g. synthetic pointer event)
    }
    const pos = getPointerPos(e);
    activeStrokeRef.current = {
      color: penColor,
      width: penWidth,
      points: [pos],
    };
    drawingRef.current = true;
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool !== 'draw' || !activeStrokeRef.current) return;
    const pos = getPointerPos(e);
    activeStrokeRef.current.points.push(pos);
    redrawCanvas();
  };

  const finishStroke = () => {
    if (!drawingRef.current || !activeStrokeRef.current) return;
    strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    activeStrokeRef.current = null;
    drawingRef.current = false;
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();

    // Auto-sync live snapshot so user never loses drawing if they type & send feedback right away
    if (canvasRef.current && strokesRef.current.length > 0) {
      onSaveSnapshotRef.current(canvasRef.current.toDataURL('image/png'));
      setSnapshotSaved(true);
    }
  };

  const undoLastStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
    if (strokesRef.current.length === 0) {
      setSnapshotSaved(false);
      onSaveSnapshotRef.current(null);
    } else if (canvasRef.current) {
      onSaveSnapshotRef.current(canvasRef.current.toDataURL('image/png'));
    }
  };

  const attachDrawingSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSnapshotRef.current(dataUrl);
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

  return (
    <div className="flex-1 flex flex-col items-center px-3 py-2 bg-[#F6F5F1] min-h-0 overflow-hidden">
      {/* Compact Always-Visible Player Toolbar */}
      <div className="mb-2 flex flex-col items-center gap-1.5 shrink-0 max-w-full">
        <div
          role="toolbar"
          aria-label="Outils d'aperçu et d'annotation"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FCFBF8] border border-[#E3DED3] shadow-sm flex-wrap justify-center"
        >
          <button
            type="button"
            onClick={() => setTool('normal')}
            aria-pressed={tool === 'normal'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              tool === 'normal' ? 'bg-[#14161B] text-white' : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <MousePointer className="w-3 h-3" aria-hidden="true" />
            Normal
          </button>

          <button
            type="button"
            onClick={() => setTool('inspect')}
            aria-pressed={tool === 'inspect'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              tool === 'inspect' ? 'bg-[#258EFF] text-white' : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Target className="w-3 h-3" aria-hidden="true" />
            Inspecter
          </button>

          <button
            type="button"
            data-testid="toggle-draw-tool"
            onClick={() => setTool((prev) => (prev === 'draw' ? 'normal' : 'draw'))}
            aria-pressed={tool === 'draw'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              tool === 'draw'
                ? 'bg-[#258EFF] text-white shadow-sm'
                : strokeCount > 0
                  ? 'bg-[#258EFF]/12 text-[#258EFF] hover:bg-[#258EFF]/20'
                  : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <PenTool className="w-3 h-3" aria-hidden="true" />
            Dessiner{strokeCount > 0 ? ` (${strokeCount})` : ''}
          </button>

          <div className="hidden sm:block w-px h-4 bg-[#E3DED3] mx-0.5" />

          <button
            type="button"
            onClick={() => setShowSafeZones((s) => !s)}
            aria-pressed={showSafeZones}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              showSafeZones
                ? 'bg-[#059669]/15 text-[#065F46]'
                : 'text-[#5C5F68] hover:text-[#14161B]'
            }`}
          >
            <Shield className="w-3 h-3" aria-hidden="true" />
            Safe Zones
          </button>
        </div>

        {/* Drawing Sub-bar (immediately visible when Dessiner is active) */}
        {tool === 'draw' && (
          <div
            data-testid="drawing-toolbar"
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FCFBF8] border border-[#258EFF]/50 shadow-sm text-[11px] flex-wrap justify-center"
          >
            <div className="inline-flex items-center gap-1.5" role="group" aria-label="Couleur du stylo">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={`Couleur ${c.label}`}
                  aria-pressed={penColor === c.id}
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
              onClick={() => setPenWidth((w) => (w === 4 ? 8 : 4))}
              title="Changer l'épaisseur du trait"
              className="px-2 py-0.5 rounded-lg border border-[#E3DED3] bg-white text-[10px] font-mono font-semibold text-[#14161B] cursor-pointer"
            >
              {penWidth === 4 ? 'Trait fin' : 'Trait épais'}
            </button>

            <button
              type="button"
              onClick={undoLastStroke}
              disabled={strokeCount === 0}
              aria-label="Annuler le dernier trait"
              className="px-1.5 py-0.5 rounded-lg text-[#5C5F68] hover:text-[#14161B] disabled:opacity-40 inline-flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              Annuler
            </button>

            <button
              type="button"
              onClick={() => clearDrawing(true)}
              disabled={strokeCount === 0}
              className="px-1.5 py-0.5 rounded-lg text-[#5C5F68] hover:text-[#DC2626] disabled:opacity-40 inline-flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Eraser className="w-3 h-3" />
              Effacer
            </button>

            <button
              type="button"
              onClick={attachDrawingSnapshot}
              disabled={strokeCount === 0}
              className="px-2.5 py-0.5 rounded-lg bg-[#059669] hover:opacity-90 disabled:opacity-40 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              {snapshotSaved ? 'Croquis prêt' : 'Joindre'}
            </button>
          </div>
        )}
      </div>

      {/* Measured 9:16 Stage Slot — mathematically guaranteed never to clip or overflow */}
      <div
        ref={stageSlotRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
      >
        <div
          style={{ width: `${stageSize.width}px`, height: `${stageSize.height}px` }}
          className={`relative rounded-[20px] overflow-hidden border shadow-lg bg-[#F1EEE6] shrink-0 transition-shadow ${
            tool === 'draw' ? 'border-[#258EFF] ring-2 ring-[#258EFF]/30' : 'border-[#E3DED3]'
          }`}
        >
          {mediaSrc ? (
            <video
              ref={videoRef}
              src={mediaSrc}
              playsInline
              onTimeUpdate={(e) => onSyncTimeFromVideo?.(e.currentTarget.currentTime)}
              className="w-full h-full object-cover"
            />
          ) : project.isFlagshipReactStage ? (
            <ShortStage
              t={currentTime}
              look={LOOK_PRESETS.papier}
              showSafeZones={showSafeZones}
            />
          ) : (
            <DynamicShortStage
              project={project}
              t={currentTime}
              look={LOOK_PRESETS.papier}
              showSafeZones={showSafeZones}
            />
          )}

          {/* Safe Zone Overlay for rendered MP4 videos */}
          {showSafeZones && mediaSrc && (
            <div className="absolute inset-0 pointer-events-none border-[12px] border-[#059669]/20 z-20">
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

          {/* Mode hint pill while drawing and canvas is still empty */}
          {tool === 'draw' && strokeCount === 0 && (
            <div className="absolute top-2.5 inset-x-0 flex justify-center pointer-events-none z-30">
              <span className="px-2.5 py-1 rounded-lg bg-[#14161B]/80 text-white text-[10px] font-semibold backdrop-blur-xs">
                Tracez directement sur la vidéo
              </span>
            </div>
          )}

          {/* Freehand Drawing Overlay Canvas */}
          <canvas
            ref={canvasRef}
            data-testid="studio-drawing-canvas"
            width={540}
            height={960}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            className={`absolute inset-0 w-full h-full z-40 touch-none ${
              tool === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
            }`}
          />

          {/* Empty fallback notice if MP4 failed */}
          {!mediaSrc && !project.isFlagshipReactStage && (project.transcript || []).length === 0 && !project.hookText && (
            <div className="absolute bottom-3 inset-x-3 pointer-events-none flex justify-center z-20">
              <span className="px-2.5 py-1 rounded-lg bg-[#FCFBF8]/90 border border-[#E3DED3] text-[10px] font-medium text-[#5C5F68] inline-flex items-center gap-1">
                <Film className="w-3 h-3 text-[#258EFF]" />
                Aperçu dynamique · {project.currentVersion}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
