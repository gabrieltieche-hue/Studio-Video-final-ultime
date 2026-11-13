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

  // Pick editorial backdrop matching the active narrative moment (never duplicating card photo)
  const backdropSrc =
    t < 17.15
      ? EDITORIAL_IMAGES.teenNight
      : t < 27.3
        ? EDITORIAL_IMAGES.parliament
        : t < 52.55
          ? EDITORIAL_IMAGES.parliament
          : EDITORIAL_IMAGES.studio;

  // Subtle slow drift (zoom.drift: 0.008/s) on the editorial frame
  const drift = 1 + ((t % 4) * 0.008);
  const mediaScale = camZoom * drift;

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
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />

            {/* Subtle editorial context tag inside split panel */}
            {seam > 300 && (
              <div className="absolute bottom-[60px] left-[56px] right-[180px] flex items-center justify-between text-white/90">
                <div className="text-[32px] font-semibold tracking-[-0.01em] drop-shadow">
                  {t < 17.15
                    ? 'Usage réel · Moins de 16 ans'
                    : t < 27.3
                      ? 'Décision institutionnelle · Paris'
                      : 'Design attentionnel · UE / France'}
                </div>
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

        {/* Platform Safe-Zone Overlay (shorts-codes.md: top 220, bottom 420, right 140) */}
        {showSafeZones && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Top 220px header/search zone */}
            <div className="absolute inset-x-0 top-0 h-[220px] bg-red-500/18 border-b-2 border-dashed border-red-500 flex items-end justify-center pb-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue haut · 220 px (Shorts / Reels)
              </span>
            </div>
            {/* Bottom 420px caption/title zone */}
            <div className="absolute inset-x-0 bottom-0 h-[420px] bg-red-500/18 border-t-2 border-dashed border-red-500 flex items-start justify-center pt-[18px]">
              <span className="text-[28px] font-bold text-red-700 bg-white/90 px-[16px] py-[4px] rounded-[8px]">
                Zone exclue bas · 420 px (Légende &amp; Audio)
              </span>
            </div>
            {/* Right 140px engagement icons */}
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
