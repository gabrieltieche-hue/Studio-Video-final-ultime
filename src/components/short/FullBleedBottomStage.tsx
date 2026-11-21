import React from 'react';
import { resolveBrollAsset } from '../../data/brollLibrary';
import { clamp, lerp, seg } from '../../engine/math';

interface FullBleedBottomStageProps {
  brollKey?: string;
  subBrollKeys?: string[];
  subBrollUrls?: string[];
  topicCategory?: string;
  projectTitle?: string;
  beatIndex: number;
  beatLocalT: number;
  beatSpan: number;
  seam: number;
}

/**
 * Full-bleed edge-to-edge bright photographic B-roll stage (NO pastel padding cards, NO English tag badges).
 * Uses cached query photography (subBrollUrls) or the 190+ verified local B-roll pool (subBrollKeys)
 * with smooth Ken Burns zoom and mid-beat crossfade.
 */
export const FullBleedBottomStage: React.FC<FullBleedBottomStageProps> = ({
  brollKey,
  subBrollKeys,
  subBrollUrls,
  topicCategory,
  projectTitle,
  beatIndex,
  beatLocalT,
  beatSpan,
  seam,
}) => {
  const safeSpan = Math.max(1.2, beatSpan);
  const progress = clamp(beatLocalT / safeSpan, 0, 1);

  const keys =
    Array.isArray(subBrollKeys) && subBrollKeys.length > 0
      ? subBrollKeys
      : [brollKey || 'biz_desk_minimal'];

  const customUrls = Array.isArray(subBrollUrls) ? subBrollUrls.filter(Boolean) : [];
  const slotCount = Math.max(keys.length, customUrls.length);
  const activeSlot = slotCount > 1 && progress >= 0.5 ? 1 : 0;

  const activeKey = keys[activeSlot] || keys[0];
  const prevKey = keys[0];

  const activeAsset = resolveBrollAsset(activeKey, topicCategory, projectTitle, beatIndex);
  const prevAsset = resolveBrollAsset(prevKey, topicCategory, projectTitle, beatIndex);

  const activeSrc = customUrls[activeSlot] || activeAsset.src;
  const prevSrc = customUrls[0] || prevAsset.src;

  const slotStart = activeSlot === 0 ? 0 : 0.5;
  const slotLen = slotCount > 1 ? 0.5 : 1;
  const slotP = clamp((progress - slotStart) / slotLen, 0, 1);
  const crossfade = activeSlot === 1 ? seg(progress, 0.5, 0.62) : 1;

  // Deterministic continuous Ken Burns zoom + gentle lateral pan alternating per beat
  const dir = (beatIndex + activeSlot) % 2 === 0 ? 1 : -1;
  const scale = lerp(1.01, 1.08, slotP);
  const panX = lerp(-12 * dir, 12 * dir, slotP);
  const panY = lerp(6, -6, slotP);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#14161B]"
      data-testid="fullbleed-bottom-stage"
      data-media-key={activeAsset.key}
      data-media-src={activeSrc}
    >
      {/* Underlying previous slot during smooth 0.25s mid-beat crossfade */}
      {activeSlot === 1 && crossfade < 1 && (
        <img
          src={prevSrc}
          alt=""
          onError={(e) => {
            if (e.currentTarget.src !== prevAsset.src) {
              e.currentTarget.src = prevAsset.src;
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'brightness(1.08) contrast(1.05) saturate(1.06)',
            transform: `scale(1.06) translate3d(${(-8 * dir).toFixed(1)}px, -4px, 0)`,
          }}
        />
      )}

      {/* Active Full-Bleed Photographic Visual */}
      <img
        src={activeSrc}
        alt={activeAsset.defaultCaption}
        onError={(e) => {
          if (e.currentTarget.src !== activeAsset.src) {
            e.currentTarget.src = activeAsset.src;
          }
        }}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: crossfade,
          filter: 'brightness(1.08) contrast(1.05) saturate(1.06)',
          transform: `scale(${scale.toFixed(3)}) translate3d(${panX.toFixed(1)}px, ${panY.toFixed(1)}px, 0)`,
        }}
      />

      {/* Crisp upper-seam gradient only (ensures subtitles right above seam stay razor sharp) */}
      {seam > 20 && (
        <div
          className="absolute inset-x-0 top-0 h-[145px] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(12, 14, 18, 0.38) 0%, rgba(12, 14, 18, 0.12) 55%, rgba(12, 14, 18, 0) 100%)',
          }}
        />
      )}

      {/* Subtle bottom vignette protecting safe zone clarity without darkening center image */}
      <div
        className="absolute inset-x-0 bottom-0 h-[180px] pointer-events-none"
        style={{
          background:
            'linear-gradient(0deg, rgba(12, 14, 18, 0.34) 0%, rgba(12, 14, 18, 0) 100%)',
        }}
      />
    </div>
  );
};
