import React, { useRef, useState } from 'react';
import {
  Film,
  Layers,
  MessageSquare,
  Music,
  Volume2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { FeedbackItem, ShortProject } from '../../types/studio';

interface StudioMultiTrackTimelineProps {
  project: ShortProject;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSelectFeedback?: (fb: FeedbackItem) => void;
  onOpenMotionEditor: (componentId: string) => void;
}

export const StudioMultiTrackTimeline: React.FC<StudioMultiTrackTimelineProps> = ({
  project,
  currentTime,
  duration,
  onSeek,
  onSelectFeedback,
  onOpenMotionEditor,
}) => {
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const safeDuration = Math.max(1, duration || 45);

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  };

  const toPct = (t: number) => `${Math.max(0, Math.min(100, (t / safeDuration) * 100)).toFixed(2)}%`;
  const toWidthPct = (s: number, e: number) =>
    `${Math.max(1.5, Math.min(100, ((e - s) / safeDuration) * 100)).toFixed(2)}%`;

  const ticks = Array.from({ length: 9 }, (_, i) => Number(((safeDuration / 8) * i).toFixed(1)));

  return (
    <section
      aria-label="Timeline multi-pistes"
      className="bg-[#FCFBF8] border-t border-[#E3DED3] flex flex-col select-none shrink-0"
    >
      {/* Top Timeline Controls */}
      <div className="h-8 px-3 border-b border-[#E3DED3] bg-[#F6F5F1] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-[#5C5F68]">
          <span className="font-bold text-[#14161B]">Timeline Multi-Pistes</span>
          <span className="hidden sm:inline font-mono">
            {(project.motionTrack || []).length} calques motion · {(project.sfxTrack || []).length} SFX ·{' '}
            {(project.feedbacks || []).length} retours
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
            disabled={zoom <= 1}
            title="Dézoomer timeline"
            className="p-1 rounded hover:bg-[#EAE7DF] text-[#5C5F68] disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-[#5C5F68] w-8 text-center">{zoom}×</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
            disabled={zoom >= 3}
            title="Zoomer timeline"
            className="p-1 rounded hover:bg-[#EAE7DF] text-[#5C5F68] disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Track Area */}
      <div className="flex overflow-x-auto">
        {/* Track Labels */}
        <div className="w-28 sm:w-32 shrink-0 bg-[#FCFBF8] border-r border-[#E3DED3] text-[10px] font-semibold text-[#5C5F68] divide-y divide-[#E3DED3]">
          <div className="h-6 px-2.5 flex items-center justify-between bg-[#F6F5F1] text-[9px] uppercase tracking-wider">
            <span>Timecode</span>
            <MessageSquare className="w-3 h-3 text-[#258EFF]" />
          </div>
          <div className="h-7 px-2.5 flex items-center gap-1.5 text-[#14161B]">
            <Wand2 className="w-3 h-3 text-[#258EFF] shrink-0" />
            <span className="truncate">MOTION ({(project.motionTrack || []).length})</span>
          </div>
          <div className="h-7 px-2.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#059669] shrink-0" />
            <span className="truncate">LAYOUT</span>
          </div>
          <div className="h-8 px-2.5 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-[#D97706] shrink-0" />
            <span className="truncate">SFX ({(project.sfxTrack || []).length})</span>
          </div>
          <div className="h-7 px-2.5 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-[#5C5F68] shrink-0" />
            <span className="truncate">MUSIQUE</span>
          </div>
        </div>

        {/* Interactive Bars */}
        <div className="flex-1 min-w-0 overflow-x-auto bg-[#F6F5F1]">
          <div
            ref={trackRef}
            onClick={handleScrub}
            style={{ width: `${zoom * 100}%` }}
            className="relative min-w-full cursor-pointer divide-y divide-[#E3DED3]"
          >
            {/* Ruler + Feedback Pins */}
            <div className="h-6 relative bg-[#FCFBF8]">
              {ticks.map((tick) => (
                <div
                  key={tick}
                  style={{ left: toPct(tick) }}
                  className="absolute top-0 bottom-0 border-l border-[#E3DED3] pl-1 text-[9px] font-mono text-[#A19F98] flex items-center pointer-events-none"
                >
                  {tick}s
                </div>
              ))}

              {(project.feedbacks || []).map((fb) => (
                <button
                  key={fb.id}
                  type="button"
                  title={`[${fb.timeFormatted}] ${fb.text}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(fb.timestamp);
                    onSelectFeedback?.(fb);
                  }}
                  style={{ left: toPct(fb.timestamp) }}
                  className={`absolute top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-transform hover:scale-125 cursor-pointer z-20 ${
                    fb.resolved
                      ? 'bg-[#059669]'
                      : fb.type === 'cut'
                        ? 'bg-[#DC2626]'
                        : fb.type === 'idea'
                          ? 'bg-[#D97706]'
                          : 'bg-[#258EFF]'
                  }`}
                />
              ))}
            </div>

            {/* Track 1: MOTION */}
            <div className="h-7 relative bg-[#F6F5F1]">
              {(project.motionTrack || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={`${item.name} (${item.start.toFixed(1)}s → ${item.end.toFixed(1)}s) — Cliquer pour inspecter le composant`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(item.start);
                    onOpenMotionEditor(item.componentId);
                  }}
                  style={{
                    left: toPct(item.start),
                    width: toWidthPct(item.start, item.end),
                  }}
                  className="absolute top-1 bottom-1 px-1.5 rounded-md bg-[#258EFF]/15 border border-[#258EFF]/40 text-[#14161B] hover:bg-[#258EFF]/25 text-[10px] font-semibold truncate flex items-center cursor-pointer transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Track 2: LAYOUT */}
            <div className="h-7 relative bg-[#FCFBF8]/60">
              {(project.layoutTrack || []).map((lay) => (
                <div
                  key={lay.id}
                  style={{
                    left: toPct(lay.start),
                    width: toWidthPct(lay.start, lay.end),
                  }}
                  className={`absolute top-1 bottom-1 px-1.5 rounded-md border text-[10px] font-mono truncate flex items-center ${
                    lay.layout === 'split'
                      ? 'bg-[#059669]/12 border-[#059669]/35 text-[#065F46]'
                      : 'bg-[#14161B]/8 border-[#14161B]/20 text-[#14161B]'
                  }`}
                >
                  {lay.layout}
                </div>
              ))}
            </div>

            {/* Track 3: SFX */}
            <div className="h-8 relative bg-[#F6F5F1]">
              {(project.sfxTrack || []).map((sfx, idx) => (
                <button
                  key={sfx.id}
                  type="button"
                  title={`SFX ${sfx.sound} @ ${sfx.start.toFixed(2)}s`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(sfx.start);
                  }}
                  style={{ left: toPct(sfx.start) }}
                  className={`absolute ${
                    idx % 2 === 0 ? 'top-0.5' : 'bottom-0.5'
                  } -translate-x-1/2 px-1.5 h-3.5 rounded bg-[#D97706]/18 border border-[#D97706]/45 text-[#92400E] text-[8px] font-mono leading-none whitespace-nowrap flex items-center hover:bg-[#D97706] hover:text-white hover:z-20 cursor-pointer transition-colors`}
                >
                  {sfx.sound.slice(0, 5)}
                </button>
              ))}
            </div>

            {/* Track 4: MUSIC */}
            <div className="h-7 relative bg-[#FCFBF8]/60">
              {project.musicTrack?.trackName ? (
                <div className="absolute inset-y-1 left-0 right-0 mx-0.5 px-2 rounded-md bg-[#EAE7DF] border border-[#E3DED3] text-[#14161B] text-[10px] font-medium flex items-center justify-between">
                  <span className="truncate flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-[#258EFF] shrink-0" />
                    {project.musicTrack.trackName} · vol {Math.round((project.musicTrack.volume || 0.24) * 100)}%
                  </span>
                  <span className="text-[9px] font-mono text-[#5C5F68]">
                    {project.musicTrack.ducking ? 'ducking auto' : 'constant'}
                  </span>
                </div>
              ) : (
                <div className="h-full flex items-center px-2 text-[10px] text-[#A19F98]">
                  Aucune piste musicale
                </div>
              )}
            </div>

            {/* Playhead */}
            <div
              style={{ left: toPct(currentTime) }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#DC2626] pointer-events-none z-30"
            >
              <div className="w-2.5 h-2.5 -ml-[4px] -mt-0.5 rounded-full bg-[#DC2626] border border-white shadow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
