import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LookPreset } from '../../data/shortSpec';
import {
  buildSemanticCaptionChunks,
  getActiveCaptionChunk,
  getLayoutSeam,
  seg,
  type WordCue,
} from '../../engine/math';
import { buildDynamicBeatsFromProject } from '../../engine/transcriptUtils';
import type { ShortProject } from '../../types/studio';
import { FullBleedBottomStage } from './FullBleedBottomStage';
import { UniversalMelvynxScene } from './MelvynxPrimitives';
import { ShortCaptionOverlay } from './ShortCaptions';

interface DynamicShortStageProps {
  project: ShortProject;
  t: number;
  look: LookPreset;
  showSafeZones: boolean;
  renderMode?: boolean;
}

/**
 * Deterministic 1080×1920 Short motion stage driven purely by playback timestamp `t`.
 * Upper stage: Warm paper graph grid + universal @melvynx.dev primitives.
 * Lower stage (when layout === 'split'): 100% full-bleed bright photography with Ken Burns motion.
 * Subtitles: Two-layer outlined chunks locked inside safe zones with zero phrase collisions.
 */
export const DynamicShortStage: React.FC<DynamicShortStageProps> = ({
  project,
  t,
  look,
  showSafeZones,
  renderMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(renderMode ? 1 : 0.32);

  useEffect(() => {
    if (renderMode) {
      setScale(1);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / 1080);
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [renderMode]);

  const beats = useMemo(() => buildDynamicBeatsFromProject(project), [project]);
  const activeBeat =
    beats.find((b) => t >= b.from && t < b.to) || beats[beats.length - 1];

  const layoutKeys = useMemo<Array<[number, number]>>(
    () =>
      beats.map((b) => [
        b.from,
        b.layout === 'fullscreen' ? 1920 : 1140,
      ]),
    [beats]
  );

  const seam = getLayoutSeam(t, layoutKeys, 0.22);

  const wordCues: WordCue[] = useMemo(
    () =>
      (project.transcript || [])
        .filter((w) => !w.isCut)
        .map((w) => ({
          text: w.word,
          start: w.start,
          end: w.end,
          emph: false,
        })),
    [project.transcript]
  );

  const chunks = useMemo(
    () => buildSemanticCaptionChunks(wordCues, { maxWords: 4, maxChars: 24 }),
    [wordCues]
  );
  const activeChunk = getActiveCaptionChunk(t, chunks, []);

  const beatLocalT = Math.max(0, t - activeBeat.from);
  const beatSpan = Math.max(0.5, activeBeat.to - activeBeat.from);
  const gridShiftY = (t * 22) % 28;
  const gridShiftX = Math.sin(t * 0.34) * 14;
  const cutFlash = 1 - seg(beatLocalT, 0, 0.22);

  // Upper motion stage comfortably respects top 220px & leaves generous bottom buffer above captions in both split and fullscreen
  const stageTop = 210;
  const stageHeight =
    seam >= 1650 ? 1040 : seam > 300 ? Math.max(580, seam - 320) : 1000;

  return (
    <div
      ref={containerRef}
      data-testid="dynamic-short-stage"
      data-active-primitive={activeBeat.visualType || 'metric_shock_hook'}
      data-active-layout={activeBeat.layout}
      className={
        renderMode
          ? 'relative w-[1080px] h-[1920px] overflow-hidden bg-[#F8F7F3] select-none'
          : 'relative w-full h-full aspect-[9/16] rounded-[20px] overflow-hidden border border-[#E5E4DE] bg-[#F8F7F3] select-none'
      }
    >
      <div
        style={{
          width: '1080px',
          height: '1920px',
          transform: renderMode ? undefined : `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: look.id === 'papier' ? '#F8F7F3' : look.paper,
        }}
        className="relative overflow-hidden"
      >
        {/* Paper Grain */}
        {look.grain && (
          <div className="absolute inset-0 paper-grain opacity-75 pointer-events-none" />
        )}

        {/* Warm Graph-Paper Grid (28px #E5E4DE) + Soft Ambient Spotlight */}
        {seam > 200 && (
          <div
            className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none"
            style={{ height: `${seam.toFixed(1)}px` }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #E5E4DE 1px, transparent 1px), linear-gradient(to bottom, #E5E4DE 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                backgroundPosition: `${gridShiftX.toFixed(1)}px ${gridShiftY.toFixed(1)}px`,
              }}
            />

            <div
              className="absolute w-[820px] h-[820px] rounded-full blur-[42px]"
              style={{
                left: `${(130 + Math.sin(t * 0.42) * 160).toFixed(1)}px`,
                top: `${(seam * 0.25 - 120 + Math.cos(t * 0.34) * 120).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(0,122,255,0.13) 0%, rgba(96,165,250,0.05) 45%, rgba(0,122,255,0) 72%)',
              }}
            />

            {/* Beat Transition Kinetic Light Sweep */}
            {cutFlash > 0.02 && (
              <div
                className="absolute inset-y-0 w-[260px]"
                style={{
                  left: `${(-260 + (1 - cutFlash) * 1400).toFixed(1)}px`,
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0), rgba(0,122,255,0.15), rgba(255,255,255,0))',
                  transform: 'skewX(-18deg)',
                  opacity: cutFlash,
                }}
              />
            )}
          </div>
        )}

        {/* Lower 100% Full-Bleed Bright Photography Panel (Split mode) */}
        {seam < 1918 && (
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden"
            style={{
              zIndex: 10,
              top: `${seam.toFixed(1)}px`,
              borderTopLeftRadius: seam > 20 ? '36px' : '0px',
              borderTopRightRadius: seam > 20 ? '36px' : '0px',
              boxShadow: seam > 20 ? '0 -18px 42px rgba(20, 22, 27, 0.14)' : 'none',
            }}
          >
            <FullBleedBottomStage
              brollKey={activeBeat.brollKey}
              subBrollKeys={activeBeat.subBrollKeys}
              subBrollUrls={activeBeat.subBrollUrls}
              topicCategory={project.topicCategory}
              projectTitle={project.title}
              beatIndex={activeBeat.index}
              beatLocalT={beatLocalT}
              beatSpan={beatSpan}
              seam={seam}
            />
          </div>
        )}

        {/* Upper Kinetic Motion Stage (z-20, cleanly inside safe zones) */}
        <div
          className="absolute inset-x-0 px-[52px] flex flex-col justify-center pointer-events-none"
          style={{
            zIndex: 20,
            top: `${stageTop}px`,
            height: `${stageHeight.toFixed(0)}px`,
          }}
        >
          <UniversalMelvynxScene
            beat={activeBeat}
            t={beatLocalT}
            span={beatSpan}
            look={look}
            layout={activeBeat.layout}
          />
        </div>

        {/* Two-Layer Outlined Subtitles — Zero Word Fusion */}
        <ShortCaptionOverlay
          chunk={activeChunk}
          seam={seam}
          testId="dynamic-captions"
        />

        {/* Safe Zones Overlay (Studio inspection only) */}
        {showSafeZones && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-[220px] bg-red-500/18 border-b-2 border-dashed border-red-500 flex items-end justify-center pb-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue haut · 220 px
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[420px] bg-red-500/18 border-t-2 border-dashed border-red-500 flex items-start justify-center pt-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue bas · 420 px
              </span>
            </div>
            <div className="absolute right-0 top-[900px] bottom-[420px] w-[140px] bg-amber-500/20 border-l-2 border-dashed border-amber-500" />
          </div>
        )}
      </div>
    </div>
  );
};
