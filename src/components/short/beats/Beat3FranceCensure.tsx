import React from 'react';
import { EDITORIAL_IMAGES, LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const STEPS = [
  { label: 'Vote AN', at: 17.6 },
  { label: 'Sénat', at: 18.8 },
  { label: 'Saisine', at: 20.5 },
  { label: 'CENSURE', at: 22.5 },
];

export const Beat3FranceCensure: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 16.15 || t > 23.52) return null;

  const localT = t - 16.2;
  const enter = spring(localT, 14);
  const exit = leave(t, 23.38, 0.28);
  const stampP = spring(t - 22.48, 22);
  const shockP = seg(t, 22.54, 23.15);
  const hl1 = seg(t, 20.4, 21.4);
  const hl2 = seg(t, 21.45, 22.45);
  const timelineFill = seg(t, 16.8, 22.6);

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[186px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(38 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Animated 4-step Legislative Timeline Strip */}
      <div
        className="w-full rounded-[22px] px-[28px] py-[16px] border mb-[18px]"
        style={{ backgroundColor: look.sheet, borderColor: look.line, boxShadow: '0 14px 30px -12px rgba(20,22,27,0.12)' }}
      >
        <div className="relative flex items-center justify-between">
          <div className="absolute left-[20px] right-[20px] top-[16px] h-[5px] rounded-full" style={{ backgroundColor: look.paper }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(timelineFill * 100).toFixed(1)}%`,
                backgroundColor: t >= 22.48 ? '#DC2626' : look.accent,
              }}
            />
          </div>
          {STEPS.map((st, idx) => {
            const reached = t >= st.at;
            const isCensure = idx === 3 && reached;
            return (
              <div key={st.label} className="relative z-10 flex flex-col items-center gap-[6px]">
                <div
                  className="w-[32px] h-[32px] rounded-full border-4 flex items-center justify-center"
                  style={{
                    backgroundColor: isCensure ? '#DC2626' : reached ? look.accent : look.sheet,
                    borderColor: isCensure ? '#DC2626' : reached ? look.accent : look.line,
                  }}
                >
                  {reached && (
                    <span className="w-[10px] h-[10px] rounded-full bg-white" />
                  )}
                </div>
                <span
                  className="text-[24px] font-extrabold tracking-[-0.01em]"
                  style={{
                    color: isCensure ? '#DC2626' : reached ? look.ink : look.ink3,
                    fontFamily: look.fontDisplay,
                  }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Parliament -> Conseil constitutionnel card */}
      <div
        className="w-full rounded-[32px] overflow-hidden border"
        style={{
          backgroundColor: look.sheet,
          borderColor: t >= 22.48 ? '#DC2626' : look.line,
          borderWidth: t >= 22.48 ? '2.5px' : '1.5px',
          boxShadow: '0 28px 56px -18px rgba(20,22,27,0.22)',
        }}
      >
        {/* Photo strip header */}
        <div className="relative h-[196px] w-full overflow-hidden">
          <img
            src={EDITORIAL_IMAGES.parliament}
            alt="Hémicycle parlementaire"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-[20px] left-[28px] right-[28px] flex items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[14px] min-w-0">
              <div className="flex h-[28px] w-[42px] rounded-[6px] overflow-hidden border border-white/30 shrink-0">
                <div className="flex-1 bg-[#002395]" />
                <div className="flex-1 bg-[#FFFFFF]" />
                <div className="flex-1 bg-[#ED2939]" />
              </div>
              <span className="text-[31px] font-bold text-white tracking-[-0.02em] truncate" style={{ fontFamily: look.fontDisplay }}>
                France · Loi -15 ans
              </span>
            </div>
            <span className="text-[28px] font-semibold text-white/90 tabular-nums shrink-0">Juillet 2026</span>
          </div>
        </div>

        {/* Decision body */}
        <div className="p-[32px] relative">
          <div className="flex items-center justify-between gap-[14px] mb-[22px]">
            <div className="flex items-center gap-[12px] min-w-0">
              <div className="w-[42px] h-[42px] rounded-[12px] bg-[#16A34A]/15 flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-[31px] font-bold truncate" style={{ color: look.ink }}>
                Votée au Parlement
              </span>
            </div>

            {/* CENSURÉ stamp landing at 22.54s ("l'a censurée.") */}
            {t >= 22.45 && (
              <div className="relative shrink-0">
                {shockP < 1 && (
                  <div
                    className="absolute inset-0 rounded-[16px] border-4"
                    style={{
                      borderColor: '#DC2626',
                      opacity: (1 - shockP) * 0.75,
                      transform: `scale(${(1 + 0.35 * shockP).toFixed(3)})`,
                    }}
                  />
                )}
                <div
                  className="px-[22px] py-[8px] rounded-[14px] border-[4px] font-extrabold text-[32px] tracking-[-0.02em]"
                  style={{
                    borderColor: '#DC2626',
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    opacity: clamp(stampP * 2.5, 0, 1),
                    transform: `scale(${(1.25 - 0.25 * stampP).toFixed(3)}) rotate(-3deg)`,
                    fontFamily: look.fontDisplay,
                  }}
                >
                  CENSURÉ
                </div>
              </div>
            )}
          </div>

          <div className="text-[40px] font-bold leading-[1.32] tracking-[-0.02em]" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
            <span className="text-[31px] font-semibold block mb-[8px]" style={{ color: look.ink2 }}>
              Conseil constitutionnel :
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

      {/* Bottom Legal Consequence Bar */}
      <div
        className="w-full mt-[18px] rounded-[20px] px-[26px] py-[16px] border flex items-center justify-between"
        style={{ backgroundColor: look.sheet, borderColor: look.line }}
      >
        <span className="text-[27px] font-bold" style={{ color: look.ink2 }}>
          Art. 11 · Constitution française
        </span>
        <span className="text-[28px] font-extrabold" style={{ color: t >= 22.48 ? '#DC2626' : look.accent }}>
          {t >= 22.48 ? 'Loi bloquée' : 'Examen en cours'}
        </span>
      </div>
    </div>
  );
};
