import React from 'react';
import { EDITORIAL_IMAGES, LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

export const Beat3FranceCensure: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 17.1 || t > 27.45) return null;

  const localT = t - 17.15;
  const enter = spring(localT, 14);
  const exit = leave(t, 27.3, 0.28);
  const stampP = spring(t - 25.92, 22);
  const hl1 = seg(t, 23.0, 24.2);
  const hl2 = seg(t, 24.3, 25.7);

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[225px] pl-[60px] pr-[150px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(40 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Recreated official French Parliament -> Conseil constitutionnel card */}
      <div
        className="w-full rounded-[34px] overflow-hidden border"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 32px 64px -18px rgba(20,22,27,0.22)',
        }}
      >
        {/* Photo strip header of the parliamentary chamber */}
        <div className="relative h-[230px] w-full overflow-hidden">
          <img
            src={EDITORIAL_IMAGES.parliament}
            alt="Hémicycle parlementaire"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-[24px] left-[32px] right-[32px] flex items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[14px] min-w-0">
              <div className="flex h-[30px] w-[44px] rounded-[6px] overflow-hidden border border-white/30 shrink-0">
                <div className="flex-1 bg-[#002395]" />
                <div className="flex-1 bg-[#FFFFFF]" />
                <div className="flex-1 bg-[#ED2939]" />
              </div>
              <span className="text-[32px] font-bold text-white tracking-[-0.02em] truncate" style={{ fontFamily: look.fontDisplay }}>
                France · Loi -15 ans
              </span>
            </div>
            <span className="text-[30px] font-semibold text-white/90 tabular-nums shrink-0">Juillet 2026</span>
          </div>
        </div>

        {/* Decision body */}
        <div className="p-[36px] relative">
          <div className="flex items-center justify-between gap-[16px] mb-[26px]">
            <div className="flex items-center gap-[14px] min-w-0">
              <div className="w-[44px] h-[44px] rounded-[14px] bg-[#16A34A]/15 flex items-center justify-center shrink-0">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-[32px] font-bold truncate" style={{ color: look.ink }}>
                Votée au Parlement
              </span>
            </div>

            {/* CENSURÉ stamp landing at 25.97s ("l'a censurée") */}
            {t >= 25.85 && (
              <div
                className="px-[22px] py-[8px] rounded-[16px] border-[4px] font-extrabold text-[32px] tracking-[-0.02em] shrink-0"
                style={{
                  borderColor: '#DC2626',
                  color: '#DC2626',
                  backgroundColor: '#FEF2F2',
                  opacity: clamp(stampP * 2.5, 0, 1),
                  transform: `scale(${(1.25 - 0.25 * stampP).toFixed(3)}) rotate(-3deg)`,
                  fontFamily: look.fontDisplay,
                }}
              >
                CENSURÉ · 14 AOÛT
              </div>
            )}
          </div>

          {/* Decision quote with animated marker highlighter */}
          <div className="text-[44px] font-bold leading-[1.34] tracking-[-0.02em]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            <span className="text-[34px] font-semibold block mb-[10px]" style={{ color: look.ink2 }}>
              Décision du Conseil constitutionnel :
            </span>
            <span className="relative inline-block">
              <span
                className="absolute left-0 top-[6px] bottom-[4px] rounded-[8px]"
                style={{
                  width: `${(hl1 * 100).toFixed(1)}%`,
                  backgroundColor: look.accent,
                  opacity: 0.24,
                }}
              />
              <span className="relative">« Atteinte disproportionnée</span>
            </span>{' '}
            <span className="relative inline-block">
              <span
                className="absolute left-0 top-[6px] bottom-[4px] rounded-[8px]"
                style={{
                  width: `${(hl2 * 100).toFixed(1)}%`,
                  backgroundColor: look.accent,
                  opacity: 0.24,
                }}
              />
              <span className="relative">à la liberté de communication. »</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
