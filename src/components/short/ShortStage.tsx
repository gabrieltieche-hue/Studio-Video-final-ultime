import React, { useEffect, useRef, useState } from 'react';
import {
  EDITORIAL_IMAGES,
  LAYOUT_KEYS,
  LookPreset,
  ZOOM_KEYS,
} from '../../data/shortSpec';
import { getLayoutSeam, track } from '../../engine/math';
import { ShortCaptions } from './ShortCaptions';
import { Beat1HookShatter } from './beats/Beat1HookShatter';
import { Beat2AustraliaBypass } from './beats/Beat2AustraliaBypass';
import { Beat3FranceCensure } from './beats/Beat3FranceCensure';
import { Beat4AlgoGauge } from './beats/Beat4AlgoGauge';
import { Beat5ScreenTimeBars } from './beats/Beat5ScreenTimeBars';
import { Beat6KidsActToggles } from './beats/Beat6KidsActToggles';
import { Beat7BypassLock } from './beats/Beat7BypassLock';
import { Beat8IgCtaLoop } from './beats/Beat8IgCtaLoop';

interface ShortStageProps {
  t: number;
  look: LookPreset;
  showSafeZones: boolean;
  renderMode?: boolean;
}

export const ShortStage: React.FC<ShortStageProps> = ({ t, look, showSafeZones, renderMode = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(renderMode ? 1 : 0.36);

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

  const seam = getLayoutSeam(t, LAYOUT_KEYS, 0.34);
  const camZoom = track(t, ZOOM_KEYS, 36);

  // Pick editorial backdrop matching Brian's exact narrative segments
  const backdropSrc =
    t < 16.2
      ? EDITORIAL_IMAGES.teenNight
      : t < 45.85
        ? EDITORIAL_IMAGES.parliament
        : EDITORIAL_IMAGES.studio;

  // Subtle continuous kinetic motion across editorial media, architectural grid & floating blue aura
  const drift = 1 + ((t % 4) * 0.008);
  const mediaScale = camZoom * drift;
  const gridShiftY = (t * 20) % 44;
  const gridShiftX = Math.sin(t * 0.28) * 14;

  return (
    <div
      ref={containerRef}
      data-testid="short-stage-viewport"
      className={
        renderMode
          ? 'relative w-[1080px] h-[1920px] overflow-hidden bg-[#F1EEE6] select-none'
          : 'relative w-full aspect-[9/16] rounded-[24px] overflow-hidden border border-[#E3DED3] bg-[#F1EEE6] select-none'
      }
      style={
        renderMode
          ? undefined
          : {
              boxShadow: '0 24px 56px -18px rgba(20, 22, 27, 0.22)',
            }
      }
    >
      {/* Virtual 1080x1920 deterministic canvas scaled cleanly */}
      <div
        style={{
          width: '1080px',
          height: '1920px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: look.paper,
        }}
        className="relative overflow-hidden"
      >
        {/* Subtle textured paper grain */}
        {look.grain && <div className="absolute inset-0 paper-grain opacity-85 pointer-events-none" />}

        {/* Subtle kinetic architectural dot-grid + lightweight organic drifting blue glow on beige paper */}
        {seam > 200 && (
          <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height: `${seam.toFixed(1)}px` }}>
            <div
              className="absolute inset-0 opacity-28"
              style={{
                backgroundImage: `radial-gradient(${look.ink3} 1.5px, transparent 1.5px)`,
                backgroundSize: '44px 44px',
                backgroundPosition: `${gridShiftX.toFixed(1)}px ${gridShiftY.toFixed(1)}px`,
              }}
            />

            {/* Orb 1: Primary sky-blue ambient glow drifting smoothly across the upper/mid beige canvas */}
            <div
              className="absolute w-[840px] h-[840px] rounded-full blur-[34px]"
              style={{
                left: `${(120 + Math.sin(t * 0.48) * 320).toFixed(1)}px`,
                top: `${(-90 + Math.cos(t * 0.34) * 260).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(37,142,255,0.22) 0%, rgba(96,165,250,0.09) 42%, rgba(37,142,255,0) 72%)',
                transform: `scale(${(1 + 0.08 * Math.sin(t * 0.62)).toFixed(3)})`,
              }}
            />

            {/* Orb 2: Counter-drifting soft ice-azure wash for depth and fluid motion */}
            <div
              className="absolute w-[720px] h-[720px] rounded-full blur-[38px]"
              style={{
                left: `${(220 + Math.cos(t * 0.39 + 1.4) * 340).toFixed(1)}px`,
                top: `${(seam * 0.42 - 120 + Math.sin(t * 0.3 + 0.7) * 240).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(147,197,253,0.07) 48%, rgba(56,189,248,0) 74%)',
                transform: `scale(${(1 + 0.07 * Math.cos(t * 0.5)).toFixed(3)})`,
              }}
            />

            {/* Orb 3: Ultra-light cobalt halo weaving slowly between cards */}
            <div
              className="absolute w-[580px] h-[580px] rounded-full blur-[30px]"
              style={{
                left: `${(240 + Math.sin(t * 0.27 + 2.5) * 280).toFixed(1)}px`,
                top: `${(160 + Math.sin(t * 0.44 + 1.1) * 290).toFixed(1)}px`,
                background:
                  'radial-gradient(circle, rgba(37,142,255,0.14) 0%, rgba(191,219,254,0.05) 52%, rgba(37,142,255,0) 76%)',
              }}
            />
          </div>
        )}

        {/* Lower Editorial / Camera Panel (bleeds cleanly below seam) */}
        {seam < 1918 && (
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden z-10"
            style={{
              top: `${seam.toFixed(1)}px`,
              borderTopLeftRadius: seam > 20 ? '36px' : '0px',
              borderTopRightRadius: seam > 20 ? '36px' : '0px',
              boxShadow: seam > 20 ? '0 -24px 52px rgba(20, 22, 27, 0.22)' : 'none',
            }}
          >
            <img
              src={backdropSrc}
              alt="Illustration éditoriale du Short"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${mediaScale.toFixed(4)})`,
                transformOrigin: 'center center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/22 to-black/35" />

            {/* Subtle editorial context tag inside split panel */}
            {seam > 300 && (
              <div className="absolute bottom-[64px] left-[56px] right-[180px] flex items-center justify-between text-white/95">
                <div className="flex items-center gap-[14px]">
                  <span
                    className="w-[14px] h-[14px] rounded-full"
                    style={{
                      backgroundColor: look.accent,
                      transform: `scale(${(0.85 + 0.3 * Math.abs(Math.sin(t * 4.5))).toFixed(2)})`,
                    }}
                  />
                  <div className="text-[30px] font-bold tracking-[-0.01em] drop-shadow">
                    {t < 16.2
                      ? 'Usage réel · Moins de 16 ans'
                      : t < 23.38
                        ? 'Décision institutionnelle · Paris'
                        : 'Design attentionnel · UE / France'}
                  </div>
                </div>
                <span className="text-[26px] font-mono font-bold text-white/80 tabular-nums">
                  {(t / 1.06).toFixed(1)} s
                </span>
              </div>
            )}
          </div>
        )}



        {/* Paper Stage Beats (z-20) */}
        <div className="relative z-20 w-full h-full">
          <Beat1HookShatter t={t} look={look} />
          <Beat2AustraliaBypass t={t} look={look} />
          <Beat3FranceCensure t={t} look={look} />
          <Beat4AlgoGauge t={t} look={look} />
          <Beat5ScreenTimeBars t={t} look={look} />
          <Beat6KidsActToggles t={t} look={look} />
          <Beat7BypassLock t={t} look={look} />
          <Beat8IgCtaLoop t={t} look={look} />
        </div>

        {/* Word-synced captions on the seam (z-30) */}
        <ShortCaptions t={t} seam={seam} look={look} />

        {/* Platform Safe-Zone Overlay */}
        {showSafeZones && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-[220px] bg-red-500/18 border-b-2 border-dashed border-red-500 flex items-end justify-center pb-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue haut · 220 px (Shorts / Reels)
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[420px] bg-red-500/18 border-t-2 border-dashed border-red-500 flex items-start justify-center pt-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue bas · 420 px (Légende &amp; Audio)
              </span>
            </div>
            <div className="absolute right-0 top-[900px] bottom-[420px] w-[140px] bg-amber-500/20 border-l-2 border-dashed border-amber-500 flex flex-col items-center justify-around py-[30px]">
              <div className="w-[62px] h-[62px] rounded-full bg-white/80 border border-amber-600/40" />
              <div className="w-[62px] h-[62px] rounded-full bg-white/80 border border-amber-600/40" />
              <div className="w-[62px] h-[62px] rounded-full bg-white/80 border border-amber-600/40" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
