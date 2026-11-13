import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

/**
 * Beat 8 (59.35s - 65.00s): Creator Subscribe + Notification Bell Animation
 * Replaces old "Commente LOI" drawer with an authentic "Abonne-toi pour suivre toute l'actualité tech" CTA.
 * Positioned safely between y=360 and y=1040 so bottom seam captions (y=1230) and safe zones stay 100% clear.
 */
export const Beat8IgCtaLoop: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 59.3 || t > 65.15) return null;

  const localT = t - 59.35;
  const cardP = spring(localT, 15);
  const exit = leave(t, 65.0, 0.28);

  // Cursor moves toward "S'abonner" across 59.45 -> 60.20, clicks at 60.25s
  const cursorP = seg(t, 59.45, 60.2);
  const clicked = t >= 60.25;
  const pressScale = t >= 60.2 && t <= 60.38 ? 0.92 : 1;
  const subP = clicked ? spring(t - 60.25, 22) : 0;

  // Bell activation shockwave + gentle wiggle right at 60.55s
  const bellActivated = t >= 60.55;
  const bellRingP = seg(t, 60.55, 61.35);
  const bellTilt =
    t >= 60.55 && t <= 61.45
      ? Math.sin((t - 60.55) * 38) * (1 - seg(t, 60.55, 61.45)) * 18
      : 0;

  // Confirmation feed banner sliding down cleanly at 61.30s ("toute l'actualité tech")
  const toastP = spring(t - 61.25, 16);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start pt-[370px] pl-[60px] pr-[150px] pointer-events-none"
      style={{ opacity: exit }}
    >
      {/* Main Creator Subscribe Card */}
      <div
        className="relative w-full rounded-[36px] p-[44px] border backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(252, 251, 248, 0.96)',
          borderColor: 'rgba(20, 22, 27, 0.12)',
          opacity: clamp(cardP * 1.8, 0, 1),
          transform: `translateY(${(48 * (1 - cardP)).toFixed(1)}px) scale(${(0.95 + 0.05 * cardP).toFixed(3)})`,
          boxShadow: '0 36px 72px -18px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Top creator profile row */}
        <div className="flex items-center gap-[24px] pb-[30px] border-b border-[#E3DED3]">
          <div
            className="w-[96px] h-[96px] rounded-full flex items-center justify-center text-[44px] font-extrabold shrink-0"
            style={{
              backgroundColor: '#14161B',
              color: '#FFFFFF',
              fontFamily: look.fontDisplay,
            }}
          >
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[12px]">
              <span
                className="text-[44px] font-extrabold tracking-[-0.03em] text-[#14161B]"
                style={{ fontFamily: look.fontDisplay }}
              >
                @melvynxdev
              </span>
              <span
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: look.accent, color: look.onAccent }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="text-[32px] font-medium text-[#5C5F68] mt-[2px]">
              Actualité Tech, IA &amp; Décryptages
            </div>
          </div>
        </div>

        {/* Subscribe Action Row */}
        <div className="pt-[32px] flex items-center justify-between gap-[20px]">
          <div
            className="relative flex-1 h-[104px] rounded-[24px] flex items-center justify-center gap-[16px] font-extrabold text-[40px] tracking-[-0.02em]"
            style={{
              backgroundColor: clicked ? '#EAE7DF' : look.accent,
              color: clicked ? '#14161B' : look.onAccent,
              fontFamily: look.fontDisplay,
              transform: `scale(${pressScale})`,
              boxShadow: clicked ? 'none' : '0 18px 36px -10px rgba(37, 142, 255, 0.45)',
            }}
          >
            {clicked ? (
              <>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Abonné</span>
              </>
            ) : (
              <span>S’abonner</span>
            )}
          </div>

          {/* Notification Bell Pill */}
          <div
            className="relative w-[104px] h-[104px] rounded-[24px] border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: bellActivated ? '#14161B' : '#F1EEE6',
              borderColor: bellActivated ? '#14161B' : '#E3DED3',
              color: bellActivated ? '#FFFFFF' : '#14161B',
            }}
          >
            {bellActivated && bellRingP < 1 && (
              <div
                className="absolute inset-0 rounded-[24px] border-[5px]"
                style={{
                  borderColor: look.accent,
                  opacity: (1 - bellRingP) * 0.8,
                  transform: `scale(${(1 + 0.45 * bellRingP).toFixed(3)})`,
                }}
              />
            )}
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill={bellActivated ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `rotate(${bellTilt.toFixed(1)}deg)` }}
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
        </div>

        {/* Animated macOS pointer gliding onto bottom-right edge of S'abonner button */}
        <svg
          width="52"
          height="52"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-lg"
          style={{
            left: `${(160 + 345 * cursorP).toFixed(1)}px`,
            top: `${(365 - 88 * cursorP + 6 * subP).toFixed(1)}px`,
            opacity: clamp(localT * 3, 0, 1) * (1 - clamp((t - 62.2) * 2, 0, 1)),
            transform: `scale(${pressScale})`,
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Topic pill sliding cleanly below Subscribe card */}
      {t >= 61.2 && (
        <div
          className="w-full mt-[28px] rounded-[26px] px-[30px] py-[22px] border flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(20, 22, 27, 0.88)',
            borderColor: 'rgba(255, 255, 255, 0.16)',
            opacity: clamp(toastP * 2, 0, 1),
            transform: `translateY(${(24 * (1 - toastP)).toFixed(1)}px)`,
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="flex items-center gap-[16px]">
            <span className="w-[16px] h-[16px] rounded-full shrink-0" style={{ backgroundColor: look.accent }} />
            <span className="text-[29px] font-bold text-white whitespace-nowrap">
              Décryptages Tech &amp; IA chaque semaine
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
