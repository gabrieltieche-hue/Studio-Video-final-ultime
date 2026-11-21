import React from 'react';
import { CAPTION_CHUNKS, CAPTION_HIDE_SPANS, LookPreset } from '../../data/shortSpec';
import { getActiveCaptionChunk, type CaptionChunk } from '../../engine/math';

interface CaptionOverlayProps {
  chunk: CaptionChunk | null;
  seam: number;
  testId?: string;
}

/**
 * True two-layer outlined word renderer:
 * - Bottom stroke layer is cleanly separated from top fill layer
 * - Explicit horizontal slot padding guarantees zero glyph overlap when active word scales up
 */
const ShortCaptionWord: React.FC<{
  text: string;
  isActive: boolean;
  isPast: boolean;
}> = ({ text, isActive, isPast }) => {
  const fill = isActive ? '#FFD60A' : isPast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.94)';
  const transform = isActive ? 'scale(1.06) translateY(-2px)' : 'scale(1)';

  return (
    <span
      className="relative inline-block px-[6px] uppercase font-black leading-[1.08] tracking-[0.025em] whitespace-nowrap"
      style={{
        fontFamily: '"Archivo Black", "Bricolage Grotesque", "Inter", sans-serif',
        fontSize: '56px',
        transform,
      }}
    >
      {/* Backing black stroke layer */}
      <span
        aria-hidden="true"
        className="absolute inset-x-[6px] top-0 select-none pointer-events-none"
        style={{
          color: '#0B0D12',
          WebkitTextStroke: '11px #0B0D12',
          textShadow: '0 6px 18px rgba(0, 0, 0, 0.82)',
        }}
      >
        {text}
      </span>
      {/* Crisp un-stroked foreground fill */}
      <span className="relative" style={{ color: fill }}>
        {text}
      </span>
    </span>
  );
};

export const ShortCaptionOverlay: React.FC<CaptionOverlayProps> = ({
  chunk,
  seam,
  testId = 'short-captions',
}) => {
  if (!chunk) return null;

  // Position cleanly above the paper/photo seam in split, or comfortably above 420px bottom safe zone in fullscreen
  let topY = 1084;
  if (seam >= 1650) topY = 1385;
  else if (seam <= 300) topY = 1230;
  else topY = seam - 56;

  return (
    <div
      className="absolute inset-x-0 flex justify-center items-center px-[64px] pointer-events-none"
      style={{
        top: `${topY.toFixed(1)}px`,
        transform: 'translate3d(0, -50%, 0)',
        willChange: 'transform',
        zIndex: 35,
      }}
      data-testid={testId}
    >
      <div className="inline-flex flex-wrap items-baseline justify-center gap-x-[18px] gap-y-[10px] max-w-[950px] text-center">
        {chunk.words.map((word, idx) => (
          <ShortCaptionWord
            key={`${word.text}-${idx}`}
            text={word.text}
            isActive={idx === chunk.activeIndex}
            isPast={idx < chunk.activeIndex}
          />
        ))}
      </div>
    </div>
  );
};

interface ShortCaptionsProps {
  t: number;
  seam: number;
  look: LookPreset;
}

export const ShortCaptions: React.FC<ShortCaptionsProps> = ({ t, seam }) => {
  const chunk = getActiveCaptionChunk(t, CAPTION_CHUNKS, CAPTION_HIDE_SPANS);
  return <ShortCaptionOverlay chunk={chunk} seam={seam} testId="short-captions" />;
};
