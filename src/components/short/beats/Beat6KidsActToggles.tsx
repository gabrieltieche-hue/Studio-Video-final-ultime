import React from 'react';
import { LookPreset } from '../../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../../engine/math';

interface BeatProps {
  t: number;
  look: LookPreset;
}

const ROWS = [
  { label: 'Défilement infini', sub: 'Coupé par défaut (-18 ans)', offAt: 42.1 },
  { label: 'Lecture automatique', sub: 'Autoplay désactivé', offAt: 43.55 },
  { label: 'Notifs nocturnes', sub: 'Pause forcée 22h–07h', offAt: 44.85 },
];

export const Beat6KidsActToggles: React.FC<BeatProps> = ({ t, look }) => {
  if (t < 37.45 || t > 46.0) return null;

  const localT = t - 37.5;
  const enter = spring(localT, 14);
  const exit = leave(t, 45.85, 0.28);

  // Cursor travels cleanly across each toggle on exact spoken words
  let cursorY = 190;
  if (t >= 41.7 && t < 43.3) cursorY = 190 + 130 * seg(t, 42.15, 43.25);
  else if (t >= 43.3 && t < 44.85) cursorY = 320 + 130 * seg(t, 43.65, 44.75);
  else if (t >= 44.85) cursorY = 450;

  const cutCount = ROWS.filter((r) => t >= r.offAt).length;

  return (
    <div
      className="absolute inset-x-0 top-0 h-[1120px] flex flex-col items-center justify-start pt-[186px] pl-[58px] pr-[148px] pointer-events-none"
      style={{
        opacity: clamp(enter * 1.4, 0, 1) * exit,
        transform: `translateY(${(40 * (1 - enter) - 36 * (1 - exit)).toFixed(1)}px)`,
      }}
    >
      {/* Top UE Strategy Header */}
      <div
        className="w-full rounded-[22px] px-[26px] py-[14px] border flex items-center justify-between mb-[18px]"
        style={{ backgroundColor: look.sheet, borderColor: look.line }}
      >
        <div className="flex items-center gap-[14px]">
          <span
            className="px-[14px] py-[5px] rounded-[10px] text-[24px] font-extrabold"
            style={{ backgroundColor: look.accent, color: look.onAccent, fontFamily: look.fontDisplay }}
          >
            UE · KIDS ACT
          </span>
          <span className="text-[28px] font-bold" style={{ color: look.ink }}>
            Nouveau standard produit
          </span>
        </div>
        <span className="text-[28px] font-mono font-extrabold tabular-nums" style={{ color: look.accent }}>
          {cutCount}/3 COUPÉS
        </span>
      </div>

      {/* Recreated macOS / iOS System Settings Window */}
      <div
        className="relative w-full rounded-[32px] border overflow-hidden"
        style={{
          backgroundColor: look.sheet,
          borderColor: look.line,
          boxShadow: '0 28px 56px -18px rgba(20,22,27,0.2)',
        }}
      >
        <div
          className="h-[80px] px-[28px] flex items-center justify-between border-b"
          style={{ backgroundColor: look.paper, borderColor: look.line }}
        >
          <div className="flex items-center gap-[10px] min-w-0">
            <span className="w-[18px] h-[18px] rounded-full bg-[#FF5F56] shrink-0" />
            <span className="w-[18px] h-[18px] rounded-full bg-[#FFBD2E] shrink-0" />
            <span className="w-[18px] h-[18px] rounded-full bg-[#27C93F] shrink-0" />
            <span className="ml-[10px] text-[28px] font-bold truncate" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
              Paramètres par défaut
            </span>
          </div>
          <span className="text-[26px] font-bold shrink-0 ml-[12px]" style={{ color: look.accent }}>
            Design sobre
          </span>
        </div>

        <div className="px-[32px] py-[10px]">
          {ROWS.map((row, idx) => {
            const isOff = t >= row.offAt;
            const swP = isOff ? spring(t - row.offAt, 24) : 0;
            const rowPress = Math.abs(t - row.offAt) < 0.08 ? 0.985 : 1;
            const pulseP = isOff ? seg(t, row.offAt, row.offAt + 0.5) : 1;

            return (
              <div
                key={row.label}
                className={`h-[130px] flex items-center justify-between gap-[16px] ${idx < ROWS.length - 1 ? 'border-b' : ''}`}
                style={{
                  borderColor: look.line,
                  transform: `scale(${rowPress})`,
                }}
              >
                <div className="min-w-0">
                  <div className="text-[35px] font-bold leading-tight" style={{ color: look.ink, fontFamily: look.fontDisplay }}>
                    {row.label}
                  </div>
                  <div className="text-[28px] font-medium mt-[2px]" style={{ color: isOff ? look.accent : look.ink3 }}>
                    {isOff ? row.sub : 'Actif par défaut'}
                  </div>
                </div>

                <div
                  className="relative w-[122px] h-[66px] rounded-full p-[6px] shrink-0"
                  style={{
                    backgroundColor: isOff ? look.line : look.accent,
                  }}
                >
                  {isOff && pulseP < 1 && (
                    <div
                      className="absolute inset-0 rounded-full border-4"
                      style={{
                        borderColor: look.accent,
                        opacity: 1 - pulseP,
                        transform: `scale(${(1 + 0.25 * pulseP).toFixed(3)})`,
                      }}
                    />
                  )}
                  <div
                    className="w-[54px] h-[54px] rounded-full bg-white shadow-md"
                    style={{
                      transform: `translateX(${((1 - swP) * 56).toFixed(1)}px)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          className="absolute pointer-events-none drop-shadow-md"
          style={{
            left: '742px',
            top: `${cursorY.toFixed(1)}px`,
            opacity: clamp(localT - 0.25, 0, 1),
          }}
        >
          <path d="M5 3l14 9l-6 1.5l3 6l-2.5 1.2l-3-6l-4.5 4z" fill="#14161B" stroke="#FFFFFF" strokeWidth="1.6" />
        </svg>
      </div>

      {/* Strategy Swap Footer Pill */}
      <div
        className="w-full mt-[20px] rounded-[22px] px-[28px] py-[18px] border flex items-center justify-between"
        style={{
          backgroundColor: cutCount === 3 ? '#14161B' : look.sheet,
          borderColor: cutCount === 3 ? '#14161B' : look.line,
        }}
      >
        <span
          className="text-[32px] font-extrabold tracking-[-0.02em]"
          style={{ color: cutCount === 3 ? '#FFFFFF' : look.ink, fontFamily: look.fontDisplay }}
        >
          Couper les <span style={{ color: cutCount === 3 ? '#5EA8FF' : look.accent }}>pièges</span>, pas les ados.
        </span>
        <span
          className="text-[26px] font-mono font-bold"
          style={{ color: cutCount === 3 ? '#4ADE80' : look.ink3 }}
        >
          {cutCount === 3 ? 'PROTECTION ACTIVE ✓' : 'EN COURS…'}
        </span>
      </div>
    </div>
  );
};
