import React from 'react';
import type { LookPreset } from '../../data/shortSpec';
import { clamp, leave, seg, spring } from '../../engine/math';
import type { DynamicBeat } from '../../engine/transcriptUtils';
import type { MelvynxArchetypeType } from '../../types/batch';
import { BrandLogoBadge, NotoSvgIcon } from './BrandAndNotoIcons';

const MELVYNX_SET = new Set<string>([
  'massive_dot_matrix_zoom',
  'avatar_crowd_highlight',
  'confidential_vault_slam',
  'paywall_shock_stack',
  'chat_prompt_refusal_cascade',
  'neural_shield_abliteration',
  'night_shift_multi_agent_laptop',
  'claude_code_slash_cli',
  'rotary_mixing_knobs',
  'code_and_live_preview_split',
  'github_repo_star_rocket',
  'article_highlighter_zoom',
  'pixel_diff_clone_loop',
  'github_heatmap_and_runs',
  'social_feed_waterfall',
  'conveyor_belt_cleaner',
  'red_strike_live_rewrite',
  'ugly_to_apple_ui_morph',
  'retro_crt_1995_parallel',
  'physical_cable_app_plug',
  'metallic_toolbox_explode',
  'card_fan_explosion_10x',
  'ab_hook_leaderboard',
  'cloud_vs_offline_shield',
  'voice_shortcut_waveform',
]);

export function isMelvynxArchetype(vType?: string): vType is MelvynxArchetypeType {
  return Boolean(vType && MELVYNX_SET.has(vType));
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgba(0, 0, 0, 0.08)',
  borderRadius: '18px',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.07)',
};

function MacHeader({
  title,
  badge,
  dark = false,
}: {
  title: string;
  badge?: string;
  dark?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-[22px] py-[13px] border-b"
      style={{
        borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
        backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(248,247,243,0.72)',
      }}
    >
      <div className="flex items-center gap-[8px] min-w-0">
        <span className="w-[12px] h-[12px] rounded-full bg-[#FF5F56]" />
        <span className="w-[12px] h-[12px] rounded-full bg-[#FFBD2E]" />
        <span className="w-[12px] h-[12px] rounded-full bg-[#27C93F]" />
        <span
          className="ml-[8px] text-[20px] font-mono font-bold truncate"
          style={{ color: dark ? 'rgba(255,255,255,0.72)' : '#5C5F68' }}
        >
          {title}
        </span>
      </div>
      {badge && (
        <span
          className="px-[12px] py-[4px] rounded-[9px] text-[18px] font-mono font-extrabold shrink-0"
          style={{
            backgroundColor: dark ? 'rgba(56,189,248,0.16)' : 'rgba(37,142,255,0.10)',
            color: dark ? '#38BDF8' : '#258EFF',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function Pointer({ x, y, pressing = false }: { x: number; y: number; pressing?: boolean }) {
  return (
    <div
      className="absolute z-40 pointer-events-none"
      style={{
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        transform: `translate(-4px, -4px) scale(${pressing ? 0.82 : 1})`,
        filter: 'drop-shadow(0 8px 14px rgba(17,24,39,0.32))',
      }}
    >
      <svg width="38" height="44" viewBox="0 0 28 32" fill="none">
        <path
          d="M4 2.5L23.5 16.5L14.4 18.2L18.6 26.8L14.4 28.8L10.2 20.1L4 25.4V2.5Z"
          fill="#111827"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Ripple({ x, y, progress, color = '#258EFF' }: { x: number; y: number; progress: number; color?: string }) {
  if (progress <= 0 || progress >= 1) return null;
  const size = 26 + progress * 86;
  return (
    <div
      className="absolute z-30 rounded-full border-4 pointer-events-none"
      style={{
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        width: `${size.toFixed(1)}px`,
        height: `${size.toFixed(1)}px`,
        borderColor: color,
        transform: 'translate(-50%, -50%)',
        opacity: 1 - progress,
      }}
    />
  );
}

function HeaderBanner({ beat, look }: { beat: DynamicBeat; look: LookPreset }) {
  return (
    <div className="w-full flex items-center justify-between gap-[14px] mb-[18px]">
      <div className="flex items-center gap-[12px] min-w-0">
        {beat.brandLogo ? (
          <BrandLogoBadge brand={beat.brandLogo} size={44} />
        ) : (
          <div className="w-[44px] h-[44px] rounded-[12px] bg-[#258EFF]/10 border border-[#258EFF]/20 flex items-center justify-center shrink-0">
            <NotoSvgIcon name={beat.notoIcon || 'bolt'} size={28} />
          </div>
        )}
        <span
          className="text-[44px] font-extrabold leading-none tracking-[-0.03em] truncate"
          style={{ color: look.ink, fontFamily: look.fontDisplay }}
        >
          {beat.title}
        </span>
      </div>
      <span
        className="px-[16px] py-[7px] rounded-[12px] text-[20px] font-mono font-extrabold shrink-0 border"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0,0,0,0.08)',
          color: look.accent,
        }}
      >
        {beat.screenLabel}
      </span>
    </div>
  );
}

function animateNum(raw: string | undefined, p: number): string {
  const s = String(raw || '72 %');
  const m = s.match(/^([^\d\-+]*)([\-+]?\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return s;
  const target = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(target)) return s;
  const v = target * p;
  const formatted = m[2].includes('.') ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
  return `${m[1]}${formatted}${m[3]}`;
}

export function renderMelvynxArchetype(
  beat: DynamicBeat,
  localT: number,
  beatSpan: number,
  look: LookPreset
): React.ReactNode {
  const vType = beat.visualType as MelvynxArchetypeType;
  const enter = beat.index === 1 && localT < 0.04 ? 1 : clamp(spring(localT, 24) * 1.16, 0.2, 1);
  const exit = Math.max(0.2, leave(localT, beatSpan, 0.14));
  const wrapStyle: React.CSSProperties = {
    opacity: clamp(enter * 2.6, 0, 1) * exit,
    transform: `translateY(${(24 * (1 - enter) - 20 * (1 - exit)).toFixed(1)}px)`,
  };

  // =========================================================================
  // CATÉGORIE A — Hooks Visuels & Tension
  // =========================================================================

  // 1. massive_dot_matrix_zoom
  if (vType === 'massive_dot_matrix_zoom') {
    const pct = beat.matrixHighlightPct ?? 78;
    const totalDots = 120;
    const fillCount = Math.round((pct / 100) * totalDots * seg(localT, 0.08, Math.min(1.5, beatSpan * 0.55)));
    const zoomPunch = 1 + 0.06 * spring(localT - 0.9, 24);
    const numP = seg(localT, 0.05, Math.min(1.2, beatSpan * 0.48));
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div
          className="w-full p-[30px] relative overflow-hidden"
          style={{ ...CARD_STYLE, transform: `scale(${zoomPunch.toFixed(3)})` }}
        >
          <div className="flex items-end justify-between gap-[20px] mb-[22px]">
            <div>
              <div className="text-[22px] font-mono font-bold uppercase text-[#5C5F68]">
                {beat.matrixCalloutLabel || beat.statLabel || 'Proportion réelle'}
              </div>
              <div
                className="text-[106px] font-black leading-[0.92] tracking-[-0.04em] tabular-nums mt-[4px]"
                style={{ color: look.accent, fontFamily: look.fontDisplay }}
              >
                {animateNum(beat.statValue || `${pct} %`, numP)}
              </div>
            </div>
            <div className="px-[18px] py-[10px] rounded-[14px] bg-[#14161B] text-white text-[22px] font-mono font-extrabold">
              {beat.stampWord || 'SIGNAL'}
            </div>
          </div>

          <div
            className="grid gap-[10px] px-[6px]"
            style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
          >
            {Array.from({ length: totalDots }, (_, i) => {
              const active = i < fillCount;
              const isFocus = i === fillCount - 1;
              return (
                <div
                  key={i}
                  className="w-full aspect-square rounded-full"
                  style={{
                    backgroundColor: active ? (isFocus ? '#DC2626' : look.accent) : '#E5E4DE',
                    transform: isFocus ? 'scale(1.18)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. avatar_crowd_highlight
  if (vType === 'avatar_crowd_highlight') {
    const focusAt = 0.55;
    const focusP = spring(localT - focusAt, 24);
    const cursorP = seg(localT, 0.1, focusAt);
    const avatars = Array.from({ length: 12 }, (_, i) => i);
    const heroIdx = 7;
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[28px] relative" style={CARD_STYLE}>
          <div className="grid grid-cols-4 gap-[18px]">
            {avatars.map((idx) => {
              const isHero = idx === heroIdx;
              const dimmed = localT >= focusAt && !isHero;
              return (
                <div
                  key={idx}
                  className="h-[118px] rounded-[18px] border flex flex-col items-center justify-center gap-[6px] relative"
                  style={{
                    backgroundColor: isHero && localT >= focusAt ? '#258EFF' : '#F8F7F3',
                    borderColor: isHero && localT >= focusAt ? '#1D4ED8' : 'rgba(0,0,0,0.08)',
                    opacity: dimmed ? 0.32 : 1,
                    transform: isHero ? `scale(${(1 + 0.12 * focusP).toFixed(3)})` : 'scale(1)',
                  }}
                >
                  <NotoSvgIcon name={isHero ? beat.notoIcon || 'star' : 'bust-in-silhouette'} size={46} />
                  <span
                    className="text-[19px] font-mono font-bold"
                    style={{ color: isHero && localT >= focusAt ? '#FFFFFF' : '#5C5F68' }}
                  >
                    {isHero ? beat.statValue || 'TOP 1 %' : `#${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
          <Ripple x={720} y={210} progress={seg(localT, focusAt, focusAt + 0.6)} color="#258EFF" />
          <Pointer x={260 + cursorP * 460} y={90 + cursorP * 120} pressing={localT >= focusAt && localT <= focusAt + 0.14} />
          <div className="mt-[20px] flex items-center justify-between px-[20px] py-[14px] rounded-[14px] bg-[#F8F7F3] border border-black/8">
            <span className="text-[24px] font-bold text-[#14161B]">{beat.statLabel || 'Cible isolée dans le lot'}</span>
            <span className="text-[24px] font-mono font-extrabold text-[#258EFF]">{beat.stampWord || 'ÉLITE'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. confidential_vault_slam
  if (vType === 'confidential_vault_slam') {
    const slamAt = 0.45;
    const slamP = spring(localT - slamAt, 26);
    const items = (beat.bullets || ['Accès bloqué par défaut', 'Preuve vérifiée', 'Action immédiate']).slice(0, 3);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden relative" style={CARD_STYLE}>
          <MacHeader title="DOSSIER_INTERNE.PDF" badge={beat.dateBadge || '2026'} />
          <div className="p-[28px] space-y-[14px]">
            {items.map((line, i) => {
              const p = spring(localT - (0.15 + i * 0.35), 24);
              return (
                <div
                  key={i}
                  className="px-[20px] py-[16px] rounded-[14px] bg-[#F8F7F3] border border-black/8 flex items-center gap-[14px]"
                  style={{ opacity: p, transform: `translateX(${((1 - p) * -28).toFixed(1)}px)` }}
                >
                  <NotoSvgIcon name={beat.notoIcon || 'lock'} size={32} />
                  <span className="text-[26px] font-bold text-[#14161B] truncate">{line}</span>
                </div>
              );
            })}
          </div>
          {localT >= slamAt && (
            <div
              className="absolute right-[34px] top-[98px] px-[26px] py-[12px] rounded-[12px] border-[5px] text-[34px] font-black tracking-[0.06em] uppercase"
              style={{
                borderColor: '#DC2626',
                color: '#DC2626',
                backgroundColor: 'rgba(255,255,255,0.94)',
                transform: `rotate(-11deg) scale(${(1.75 - 0.75 * slamP).toFixed(3)})`,
                opacity: clamp(slamP * 2, 0, 1),
              }}
            >
              {beat.stampWord || 'CONFIDENTIEL'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. paywall_shock_stack
  if (vType === 'paywall_shock_stack') {
    const cards = [
      { label: beat.leftCard?.label || 'Abonnement Pro', val: beat.leftCard?.value || '240 €/an', color: '#DC2626' },
      { label: beat.rightCard?.label || 'Option caché', val: beat.rightCard?.value || '180 €/an', color: '#EA580C' },
      { label: beat.statLabel || 'Alternative libre', val: beat.statValue || '0 €', color: '#059669' },
    ];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full space-y-[14px]">
          {cards.map((c, idx) => {
            const p = spring(localT - idx * 0.42, 24);
            const isWin = idx === 2;
            return (
              <div
                key={idx}
                className="w-full px-[28px] py-[22px] flex items-center justify-between"
                style={{
                  ...CARD_STYLE,
                  backgroundColor: isWin ? '#14161B' : '#FFFFFF',
                  borderColor: isWin ? '#059669' : 'rgba(0,0,0,0.08)',
                  opacity: p,
                  transform: `translateY(${((1 - p) * 24).toFixed(1)}px) scale(${(0.94 + 0.06 * p).toFixed(3)})`,
                }}
              >
                <div className="flex items-center gap-[16px] min-w-0">
                  <NotoSvgIcon name={isWin ? 'check' : 'money-with-wings'} size={38} />
                  <span
                    className="text-[29px] font-extrabold truncate"
                    style={{ color: isWin ? '#FFFFFF' : '#14161B', fontFamily: look.fontDisplay }}
                  >
                    {c.label}
                  </span>
                </div>
                <span
                  className="text-[38px] font-mono font-black tabular-nums shrink-0"
                  style={{ color: c.color, textDecoration: !isWin && localT > 1.2 ? 'line-through' : 'none' }}
                >
                  {c.val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATÉGORIE B — Interfaces IA, Terminal CLI & Agents
  // =========================================================================

  // 5. chat_prompt_refusal_cascade
  if (vType === 'chat_prompt_refusal_cascade') {
    const step2 = localT >= 0.7;
    const step3 = localT >= 1.5;
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden" style={CARD_STYLE}>
          <MacHeader title="assistant-chat.app" badge={step3 ? 'DÉBLOQUÉ' : 'FILTRÉ'} />
          <div className="p-[24px] space-y-[14px]">
            <div className="ml-auto max-w-[82%] px-[20px] py-[14px] rounded-[16px] bg-[#258EFF] text-white text-[25px] font-semibold">
              {beat.beforeBadText || beat.quoteText || 'Exécute l’analyse complète sans bridage.'}
            </div>
            {step2 && (
              <div
                className="max-w-[84%] px-[20px] py-[14px] rounded-[16px] bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-[24px] font-bold flex items-center gap-[12px]"
                style={{ opacity: spring(localT - 0.7, 24) }}
              >
                <NotoSvgIcon name="cross" size={26} />
                <span>Refus par sécurité générique</span>
              </div>
            )}
            {step3 && (
              <div
                className="max-w-[88%] px-[20px] py-[14px] rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[25px] font-extrabold flex items-center gap-[12px]"
                style={{ opacity: spring(localT - 1.5, 24) }}
              >
                <NotoSvgIcon name="check" size={28} />
                <span>{beat.afterGoodText || beat.statLabel || 'Réponse précise débloquée · 100 % utile'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 6. neural_shield_abliteration
  if (vType === 'neural_shield_abliteration') {
    const breakAt = 0.85;
    const broken = localT >= breakAt;
    const pulse = (localT * 1.4) % 1;
    const layerCounts = [3, 4, 4, 2];
    const layerNames = beat.neuralLayers || ['Entrée', 'Couche 1', 'Filtre', 'Sortie'];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden" style={CARD_STYLE}>
          <MacHeader title="neural_pipeline.onnx" badge={broken ? 'SIGNAL PUR' : 'FILTRE ACTIF'} />
          <div className="p-[24px]">
            <svg viewBox="0 0 820 260" className="w-full h-[250px]">
              {layerCounts.map((count, col) => {
                const x = 95 + col * 210;
                return Array.from({ length: count }, (_, row) => {
                  const y = 122 + (row - (count - 1) / 2) * 52;
                  const isShield = col === 2 && !broken;
                  return (
                    <g key={`${col}-${row}`}>
                      {col < layerCounts.length - 1 &&
                        Array.from({ length: layerCounts[col + 1] }, (__, nextRow) => {
                          const nx = 95 + (col + 1) * 210;
                          const ny = 122 + (nextRow - (layerCounts[col + 1] - 1) / 2) * 52;
                          return (
                            <line
                              key={nextRow}
                              x1={x}
                              y1={y}
                              x2={nx}
                              y2={ny}
                              stroke={broken ? '#258EFF' : '#CBD5E1'}
                              strokeWidth="2.5"
                              strokeDasharray={broken ? 'none' : '6 6'}
                            />
                          );
                        })}
                      <circle
                        cx={x}
                        cy={y}
                        r={isShield ? 17 : 14}
                        fill={isShield ? '#EF4444' : broken ? '#258EFF' : '#14161B'}
                      />
                    </g>
                  );
                });
              })}
              {layerNames.slice(0, 4).map((lbl, col) => (
                <text
                  key={lbl}
                  x={95 + col * 210}
                  y={248}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="16"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  {lbl.slice(0, 12)}
                </text>
              ))}
              <circle cx={95 + pulse * 630} cy={122} r="10" fill="#10B981" />
            </svg>
            <div className="mt-[12px] px-[20px] py-[12px] rounded-[12px] bg-[#14161B] text-white font-mono text-[23px] font-bold flex items-center justify-between">
              <span className="truncate">{beat.neuralEquation || 'Entrée × Poids = Sortie directe'}</span>
              <span className="text-[#34D399] shrink-0 ml-[12px]">{beat.statValue || `${beat.gaugePct ?? 94} %`}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 7. night_shift_multi_agent_laptop
  if (vType === 'night_shift_multi_agent_laptop') {
    const lanes = (beat.steps || ['Agent 01 · Veille', 'Agent 02 · Analyse', 'Agent 03 · Synthèse']).slice(0, 3);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden" style={{ ...CARD_STYLE, backgroundColor: '#14161B', borderColor: '#2A2E37' }}>
          <MacHeader title="cluster-agents · 03:14" badge="3× PARALLÈLE" dark />
          <div className="p-[26px] space-y-[16px]">
            {lanes.map((lane, idx) => {
              const p = clamp(seg(localT, 0.1 + idx * 0.35, 1.4 + idx * 0.45), 0, 1);
              const done = p >= 0.98;
              return (
                <div key={idx} className="rounded-[14px] bg-white/6 border border-white/10 p-[16px]">
                  <div className="flex items-center justify-between mb-[10px]">
                    <span className="text-[24px] font-mono font-bold text-white truncate">{lane}</span>
                    <span className="text-[20px] font-mono font-extrabold" style={{ color: done ? '#34D399' : '#38BDF8' }}>
                      {done ? 'PRÊT ✓' : `${Math.round(p * 100)} %`}
                    </span>
                  </div>
                  <div className="w-full h-[10px] rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(p * 100).toFixed(1)}%`, backgroundColor: done ? '#10B981' : '#38BDF8' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 8. claude_code_slash_cli
  if (vType === 'claude_code_slash_cli') {
    const cmds = beat.slashCommands || [beat.terminalCmd || '/effort high', '/review', '/compact'];
    const clickAt = 1.05;
    const clicked = localT >= clickAt;
    const typed = cmds[0].slice(0, Math.floor(cmds[0].length * seg(localT, 0.1, 0.75)));
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden relative" style={{ ...CARD_STYLE, backgroundColor: '#111318', borderColor: '#2B303A' }}>
          <MacHeader title="claude-code — zsh" badge={beat.brandLogo?.toUpperCase() || 'CLI'} dark />
          <div className="p-[26px] font-mono">
            <div className="text-[30px] font-bold text-[#60A5FA] mb-[16px]">
              $ {typed}
              <span className="inline-block w-[12px] h-[28px] bg-white/85 ml-[6px] align-middle" />
            </div>
            <div className="rounded-[14px] border border-white/12 bg-white/5 p-[12px] space-y-[8px]">
              {cmds.slice(0, 3).map((cmd, idx) => {
                const selected = idx === 0 && clicked;
                return (
                  <div
                    key={idx}
                    className="px-[16px] py-[10px] rounded-[10px] flex items-center justify-between text-[23px]"
                    style={{
                      backgroundColor: selected ? '#258EFF' : 'transparent',
                      color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <span>{cmd}</span>
                    <span className="text-[18px] opacity-80">{selected ? 'EXÉCUTÉ ✓' : 'TAB'}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <Ripple x={520} y={175} progress={seg(localT, clickAt, clickAt + 0.5)} color="#38BDF8" />
          <Pointer x={380 + seg(localT, 0.2, clickAt) * 140} y={240 - seg(localT, 0.2, clickAt) * 65} pressing={localT >= clickAt && localT <= clickAt + 0.14} />
        </div>
      </div>
    );
  }

  // 9. rotary_mixing_knobs
  if (vType === 'rotary_mixing_knobs') {
    const knobs = beat.dialKnobs || [
      { label: 'Vitesse', value: 88, unit: '%', active: true },
      { label: 'Précision', value: 94, unit: '%', active: true },
      { label: 'Coût', value: 18, unit: '€', active: false },
    ];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[28px] grid grid-cols-3 gap-[18px]" style={CARD_STYLE}>
          {knobs.slice(0, 3).map((k, idx) => {
            const p = seg(localT, 0.1 + idx * 0.35, 1.0 + idx * 0.45);
            const val = Math.round(k.value * p);
            const deg = -130 + (val / 100) * 260;
            const color = k.active ? '#258EFF' : '#10B981';
            return (
              <div key={idx} className="rounded-[18px] bg-[#F8F7F3] border border-black/8 p-[20px] flex flex-col items-center">
                <div className="relative w-[132px] h-[132px] rounded-full bg-white border-[6px] flex items-center justify-center shadow-inner" style={{ borderColor: color }}>
                  <div
                    className="w-[8px] h-[54px] rounded-full origin-bottom"
                    style={{
                      backgroundColor: '#14161B',
                      transform: `translateY(-24px) rotate(${deg.toFixed(1)}deg)`,
                    }}
                  />
                  <span className="absolute bottom-[16px] text-[24px] font-mono font-black tabular-nums" style={{ color }}>
                    {val}
                    {k.unit || '%'}
                  </span>
                </div>
                <span className="mt-[14px] text-[24px] font-extrabold text-[#14161B] text-center">{k.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 10. code_and_live_preview_split
  if (vType === 'code_and_live_preview_split') {
    const lines = beat.codeLines || [
      'const mode = "ultra";',
      'const delayMs = 60;',
      'return renderCard({ speed: 1.1 });',
    ];
    const ready = localT >= 1.1;
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full grid grid-cols-2 gap-[18px]">
          <div className="overflow-hidden" style={{ ...CARD_STYLE, backgroundColor: '#14161B', borderColor: '#2A2E37' }}>
            <MacHeader title="stage.tsx" dark />
            <div className="p-[20px] font-mono text-[21px] space-y-[10px]">
              {lines.slice(0, 3).map((l, i) => (
                <div
                  key={i}
                  className="px-[12px] py-[8px] rounded-[8px] text-[#93C5FD] bg-white/5 truncate"
                  style={{ opacity: spring(localT - i * 0.35, 24) }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden" style={CARD_STYLE}>
            <MacHeader title="Aperçu direct" badge={ready ? 'LIVE ✓' : 'BUILD'} />
            <div className="p-[22px] flex flex-col items-center justify-center text-center">
              <NotoSvgIcon name={beat.notoIcon || 'sparkles'} size={54} />
              <div className="mt-[12px] text-[40px] font-mono font-black text-[#258EFF] tabular-nums">
                {beat.statValue || '10×'}
              </div>
              <div className="text-[22px] font-bold text-[#5C5F68] mt-[4px]">
                {beat.statLabel || 'Rendu instantané'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATÉGORIE C — Preuves, Code, GitHub & Réseaux
  // =========================================================================

  // 11. github_repo_star_rocket
  if (vType === 'github_repo_star_rocket') {
    const p = seg(localT, 0.12, Math.min(2.0, beatSpan * 0.65));
    const stars = animateNum(beat.repoStars || beat.statValue || '18 400', p);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full overflow-hidden" style={CARD_STYLE}>
          <MacHeader title={`github.com/${beat.repoName || 'open-source/studio'}`} badge="OPEN SOURCE" />
          <div className="p-[28px]">
            <div className="flex items-center justify-between gap-[16px] mb-[20px]">
              <div className="flex items-center gap-[16px] min-w-0">
                <BrandLogoBadge brand="github" size={56} />
                <div className="min-w-0">
                  <div className="text-[30px] font-mono font-extrabold text-[#14161B] truncate">
                    {beat.repoName || 'open/workflow-kit'}
                  </div>
                  <div className="text-[22px] text-[#5C5F68] truncate">{beat.statLabel || 'Adoption rapide en 2026'}</div>
                </div>
              </div>
              <div className="px-[22px] py-[12px] rounded-[16px] bg-[#FEF3C7] border border-[#FCD34D] flex items-center gap-[10px] shrink-0">
                <NotoSvgIcon name="star" size={32} />
                <span className="text-[32px] font-mono font-black text-[#B45309] tabular-nums">{stars}</span>
              </div>
            </div>
            <svg viewBox="0 0 820 130" className="w-full h-[120px]">
              <path
                d="M 20 112 Q 260 108 460 72 T 790 18"
                fill="none"
                stroke="#258EFF"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray="900"
                strokeDashoffset={(900 * (1 - p)).toFixed(1)}
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // 12. article_highlighter_zoom
  if (vType === 'article_highlighter_zoom') {
    const headline = beat.newsHeadline || beat.quoteText || 'Les chiffres officiels confirment une bascule nette des usages.';
    const highlight = beat.newsHighlightPhrase || beat.quoteHighlight || 'bascule nette';
    const hiP = seg(localT, 0.35, 1.35);
    const parts = headline.split(highlight);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div
          className="w-full overflow-hidden"
          style={{ ...CARD_STYLE, transform: `scale(${(1 + 0.045 * hiP).toFixed(3)})` }}
        >
          <MacHeader title={beat.newsPublication || beat.sourceLabel || 'Le Monde · Édition 2026'} badge={beat.newsYears?.[1] || '2026'} />
          <div className="p-[32px]">
            <div className="text-[34px] font-extrabold leading-[1.34] text-[#14161B]" style={{ fontFamily: look.fontDisplay }}>
              {parts.length > 1 ? (
                <>
                  {parts[0]}
                  <span
                    className="px-[8px] py-[2px] rounded-[8px]"
                    style={{
                      background: `linear-gradient(90deg, rgba(250,204,21,0.75) ${(hiP * 100).toFixed(0)}%, rgba(250,204,21,0.12) ${(hiP * 100).toFixed(0)}%)`,
                    }}
                  >
                    {highlight}
                  </span>
                  {parts.slice(1).join(highlight)}
                </>
              ) : (
                headline
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 13. pixel_diff_clone_loop
  if (vType === 'pixel_diff_clone_loop') {
    const scanP = seg(localT, 0.25, Math.min(2.0, beatSpan * 0.7));
    const beforeLines = beat.diffBeforeLines || ['Traitement lent manuel', 'Erreurs répétitives', 'Coût élevé'];
    const afterLines = beat.diffAfterLines || ['Pipeline automatisé', 'Zéro erreur critique', 'Divisé par 3'];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[24px] relative overflow-hidden" style={CARD_STYLE}>
          <div className="grid grid-cols-2 gap-[16px]">
            <div className="rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] p-[18px] space-y-[10px]">
              <div className="text-[20px] font-mono font-extrabold text-[#DC2626]">AVANT</div>
              {beforeLines.slice(0, 3).map((l, i) => (
                <div key={i} className="text-[22px] font-bold text-[#7F1D1D] truncate">− {l}</div>
              ))}
            </div>
            <div className="rounded-[14px] bg-[#ECFDF5] border border-[#A7F3D0] p-[18px] space-y-[10px]">
              <div className="text-[20px] font-mono font-extrabold text-[#059669]">APRÈS · {beat.diffScore ?? 96} %</div>
              {afterLines.slice(0, 3).map((l, i) => (
                <div key={i} className="text-[22px] font-bold text-[#065F46] truncate">+ {l}</div>
              ))}
            </div>
          </div>
          <div
            className="absolute inset-y-0 w-[4px] bg-[#258EFF]"
            style={{ left: `${(6 + scanP * 88).toFixed(1)}%`, boxShadow: '0 0 18px rgba(37,142,255,0.85)' }}
          />
        </div>
      </div>
    );
  }

  // 14. github_heatmap_and_runs
  if (vType === 'github_heatmap_and_runs') {
    const wave = seg(localT, 0.08, Math.min(1.6, beatSpan * 0.65));
    const runs = (beat.steps || ['Build validé', 'Tests 100 %', 'Déployé']).slice(0, 3);
    const cells = beat.heatCells || Array.from({ length: 42 }, (_, i) => ((i * 7 + 3) % 4) + 1);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[26px] space-y-[18px]" style={CARD_STYLE}>
          <div
            className="grid gap-[8px]"
            style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
          >
            {cells.slice(0, 42).map((lvl, idx) => {
              const show = idx / 42 <= wave;
              const colors = ['#E5E7EB', '#A7F3D0', '#34D399', '#10B981', '#047857'];
              return (
                <div
                  key={idx}
                  className="aspect-square rounded-[5px]"
                  style={{ backgroundColor: show ? colors[lvl % colors.length] : '#F1F5F9' }}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-[12px]">
            {runs.map((r, i) => {
              const p = spring(localT - (0.35 + i * 0.35), 24);
              return (
                <div
                  key={i}
                  className="px-[14px] py-[12px] rounded-[12px] bg-[#F8F7F3] border border-black/8 flex items-center justify-between"
                  style={{ opacity: p }}
                >
                  <span className="text-[20px] font-bold text-[#14161B] truncate">{r}</span>
                  <span className="text-[20px] font-mono font-black text-[#059669]">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 15. social_feed_waterfall
  if (vType === 'social_feed_waterfall') {
    const posts = (beat.bullets || [
      beat.quoteText || 'Retour terrain vérifié en conditions réelles.',
      beat.statLabel || 'Gain mesuré dès la première semaine.',
      'Adoption immédiate par les équipes.',
    ]).slice(0, 3);
    const author = beat.authorName || '@alex.decode';
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full space-y-[12px]">
          {posts.map((txt, idx) => {
            const p = spring(localT - idx * 0.42, 24);
            return (
              <div
                key={idx}
                className="w-full px-[24px] py-[16px] flex items-center justify-between gap-[16px]"
                style={{
                  ...CARD_STYLE,
                  opacity: p,
                  transform: `translateY(${((1 - p) * 22).toFixed(1)}px)`,
                }}
              >
                <div className="min-w-0">
                  <div className="text-[19px] font-mono font-bold text-[#258EFF]">{author}</div>
                  <div className="text-[24px] font-bold text-[#14161B] truncate">{txt}</div>
                </div>
                <span className="px-[14px] py-[6px] rounded-[10px] bg-[#EFF6FF] text-[#258EFF] font-mono font-extrabold text-[20px] shrink-0">
                  +{Math.round((idx + 1) * 340 * p)} ♥
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATÉGORIE D — Refactoring, Morphing & Rétro
  // =========================================================================

  // 16. conveyor_belt_cleaner
  if (vType === 'conveyor_belt_cleaner') {
    const passP = seg(localT, 0.25, 1.5);
    const clean = passP >= 0.55;
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[28px] relative overflow-hidden" style={CARD_STYLE}>
          <div className="flex items-center justify-between gap-[16px]">
            <div
              className="flex-1 rounded-[16px] p-[18px] border"
              style={{
                backgroundColor: clean ? '#ECFDF5' : '#FEF2F2',
                borderColor: clean ? '#10B981' : '#EF4444',
                transform: `translateX(${((passP - 0.5) * 36).toFixed(1)}px)`,
              }}
            >
              <div className="text-[19px] font-mono font-extrabold" style={{ color: clean ? '#059669' : '#DC2626' }}>
                {clean ? 'FILTRÉ ✓' : 'BRUIT INITIAL'}
              </div>
              <div className="text-[26px] font-extrabold text-[#14161B] mt-[4px] truncate">
                {clean ? beat.afterGoodText || beat.statLabel || 'Signal net exploitable' : beat.beforeBadText || 'Données brutes dispersées'}
              </div>
            </div>
            <div className="px-[18px] py-[28px] rounded-[16px] bg-[#14161B] text-white font-mono font-black text-[22px] shrink-0">
              FILTRE IA
            </div>
          </div>
          <div className="mt-[18px] h-[14px] rounded-full bg-[#E5E4DE] overflow-hidden relative">
            <div
              className="h-full rounded-full bg-[#258EFF]"
              style={{ width: `${(20 + passP * 80).toFixed(0)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 17. red_strike_live_rewrite
  if (vType === 'red_strike_live_rewrite') {
    const strikeP = seg(localT, 0.25, 0.85);
    const writeP = spring(localT - 0.9, 24);
    const bad = beat.beforeBadText || beat.leftCard?.label || 'Méthode lente et imprécise';
    const good = beat.afterGoodText || beat.rightCard?.label || 'Version directe, nette et chiffrée';
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[30px] space-y-[20px]" style={CARD_STYLE}>
          <div className="relative px-[22px] py-[18px] rounded-[14px] bg-[#FEF2F2] border border-[#FECACA]">
            <span className="text-[28px] font-bold text-[#991B1B]">{bad}</span>
            <div
              className="absolute left-[18px] top-1/2 h-[6px] rounded-full bg-[#DC2626]"
              style={{ width: `${(strikeP * 92).toFixed(1)}%` }}
            />
          </div>
          <div
            className="px-[22px] py-[20px] rounded-[14px] bg-[#EFF6FF] border-2 border-[#258EFF]"
            style={{ opacity: writeP, transform: `translateY(${((1 - writeP) * 18).toFixed(1)}px)` }}
          >
            <div className="text-[19px] font-mono font-extrabold text-[#258EFF] mb-[4px]">VERSION VALIDÉE ✓</div>
            <div className="text-[30px] font-extrabold text-[#14161B]" style={{ fontFamily: look.fontDisplay }}>
              {good}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 18. ugly_to_apple_ui_morph
  if (vType === 'ugly_to_apple_ui_morph') {
    const morphed = localT >= 0.85;
    const p = spring(localT - 0.85, 24);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div
          className="w-full p-[28px]"
          style={{
            backgroundColor: morphed ? '#FFFFFF' : '#D4D4D8',
            borderRadius: morphed ? '22px' : '4px',
            border: morphed ? '2px solid #258EFF' : '4px inset #71717A',
            boxShadow: morphed ? '0 20px 44px rgba(37,142,255,0.18)' : 'none',
            transform: `scale(${(0.96 + 0.04 * p).toFixed(3)})`,
          }}
        >
          <div className="flex items-center justify-between mb-[16px]">
            <span className="text-[24px] font-mono font-extrabold" style={{ color: morphed ? '#258EFF' : '#27272A' }}>
              {morphed ? 'INTERFACE APPLE GRADE ✓' : 'ANCIEN FORMULAIRE BRUT'}
            </span>
            <span
              className="px-[16px] py-[8px] font-bold text-[21px]"
              style={{
                borderRadius: morphed ? '12px' : '0px',
                backgroundColor: morphed ? '#258EFF' : '#3F3F46',
                color: '#FFFFFF',
              }}
            >
              {beat.uiActionLabel || (morphed ? 'Prêt' : 'Attendre')}
            </span>
          </div>
          <div className="text-[32px] font-extrabold text-[#14161B]" style={{ fontFamily: morphed ? look.fontDisplay : 'monospace' }}>
            {morphed ? beat.afterGoodText || beat.statLabel || 'Clair, instantané et sans friction' : beat.beforeBadText || 'Complexe, lent, illisible'}
          </div>
        </div>
      </div>
    );
  }

  // 19. retro_crt_1995_parallel
  if (vType === 'retro_crt_1995_parallel') {
    const flipP = spring(localT - 0.65, 24);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full grid grid-cols-2 gap-[18px]">
          <div className="rounded-[18px] p-[24px] border-4 border-[#94A3B8] bg-[#0F172A] font-mono">
            <div className="text-[21px] font-bold text-[#22C55E] mb-[10px]">CRT · {beat.crtYear || '1995'}</div>
            <div className="text-[38px] font-black text-[#4ADE80] tabular-nums">{beat.crtMetric || beat.leftCard?.value || '48 Ko'}</div>
            <div className="text-[20px] text-[#86EFAC] mt-[8px] truncate">{beat.leftCard?.label || 'Capacité historique'}</div>
          </div>
          <div
            className="p-[24px]"
            style={{ ...CARD_STYLE, borderColor: '#258EFF', borderWidth: '2px', transform: `scale(${(0.95 + 0.05 * flipP).toFixed(3)})` }}
          >
            <div className="text-[21px] font-mono font-bold text-[#258EFF] mb-[10px]">2026 · MODERNE</div>
            <div className="text-[38px] font-black text-[#14161B] tabular-nums">{beat.statValue || beat.rightCard?.value || '1 000×'}</div>
            <div className="text-[20px] font-bold text-[#5C5F68] mt-[8px] truncate">{beat.statLabel || beat.rightCard?.label || 'Échelle actuelle'}</div>
          </div>
        </div>
      </div>
    );
  }

  // 20. physical_cable_app_plug
  if (vType === 'physical_cable_app_plug') {
    const plugAt = 0.85;
    const plugP = seg(localT, 0.15, plugAt);
    const connected = localT >= plugAt;
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[30px]" style={CARD_STYLE}>
          <div className="flex items-center justify-between gap-[16px]">
            <div className="w-[210px] rounded-[16px] bg-[#14161B] p-[20px] text-center text-white shrink-0">
              <NotoSvgIcon name="connected" size={44} className="mx-auto mb-[8px]" />
              <div className="text-[22px] font-mono font-bold">MOTEUR IA</div>
            </div>
            <div className="flex-1 flex items-center">
              <div className="w-full h-[14px] rounded-full bg-[#E5E4DE] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(plugP * 100).toFixed(1)}%`,
                    backgroundColor: connected ? '#10B981' : '#258EFF',
                  }}
                />
              </div>
            </div>
            <div
              className="w-[250px] rounded-[16px] border-2 p-[20px] text-center shrink-0"
              style={{
                backgroundColor: connected ? '#ECFDF5' : '#F8F7F3',
                borderColor: connected ? '#10B981' : '#CBD5E1',
              }}
            >
              <div className="text-[23px] font-extrabold text-[#14161B] truncate">{beat.cableAppLabel || 'Workflow Connecté'}</div>
              <div className="text-[20px] font-mono font-black mt-[6px]" style={{ color: connected ? '#059669' : '#64748B' }}>
                {connected ? 'CONNECTÉ ✓' : 'EN ATTENTE'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 21. metallic_toolbox_explode
  if (vType === 'metallic_toolbox_explode') {
    const rawTools = beat.toolboxTools || beat.bullets || ['Outil 1', 'Outil 2', 'Outil 3', beat.statLabel || 'Outil 4'];
    const toolIcons = ['wrench', 'bolt', 'shield', 'rocket'];
    const toolBadges = ['GRATUIT', 'RAPIDE', 'LOCAL', beat.statValue || 'PRO'];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full grid grid-cols-2 gap-[16px]">
          {rawTools.slice(0, 4).map((label, idx) => {
            const p = spring(localT - idx * 0.28, 24);
            return (
              <div
                key={idx}
                className="p-[22px] flex items-center justify-between gap-[12px]"
                style={{
                  ...CARD_STYLE,
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
                  opacity: p,
                  transform: `scale(${(0.86 + 0.14 * p).toFixed(3)})`,
                }}
              >
                <div className="flex items-center gap-[14px] min-w-0">
                  <NotoSvgIcon name={toolIcons[idx % toolIcons.length]} size={40} />
                  <span className="text-[25px] font-extrabold text-[#14161B] truncate">{label}</span>
                </div>
                <span className="px-[10px] py-[4px] rounded-[8px] bg-[#14161B] text-white text-[17px] font-mono font-bold shrink-0">
                  {toolBadges[idx % toolBadges.length]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CATÉGORIE E — Listes, Comparatifs, Offres & Dictée Vocale
  // =========================================================================

  // 22. card_fan_explosion_10x
  if (vType === 'card_fan_explosion_10x') {
    const fallbackMetrics = ['#1 PRIORITÉ', beat.multiplierBadge || '10×', '0 € COÛT'];
    const fanCards =
      beat.fanCards && beat.fanCards.length > 0
        ? beat.fanCards
        : (beat.bullets || ['Levier 1', 'Levier 2', 'Levier 3']).slice(0, 3).map((lbl, i) => ({
            tag: `0${i + 1}`,
            metric: fallbackMetrics[i % fallbackMetrics.length],
            label: lbl,
          }));
    const fanP = spring(localT - 0.2, 24);
    const angles = [-5, 0, 5];
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full grid grid-cols-3 gap-[14px] items-center relative pt-[34px]">
          {fanCards.slice(0, 3).map((c, idx) => (
            <div
              key={idx}
              className="p-[22px] min-h-[200px] flex flex-col justify-between"
              style={{
                ...CARD_STYLE,
                backgroundColor: idx === 1 ? '#14161B' : '#FFFFFF',
                transform: `rotate(${(angles[idx] * fanP).toFixed(1)}deg) translateY(${idx === 1 ? -10 * fanP : 0}px)`,
              }}
            >
              <div className="flex items-center justify-between gap-[8px]">
                <span className="text-[20px] font-mono font-extrabold" style={{ color: idx === 1 ? '#38BDF8' : '#258EFF' }}>
                  {c.tag || `0${idx + 1}`}
                </span>
                <span className="text-[19px] font-mono font-black" style={{ color: idx === 1 ? '#34D399' : '#14161B' }}>
                  {c.metric}
                </span>
              </div>
              <div
                className="text-[24px] font-extrabold leading-tight"
                style={{ color: idx === 1 ? '#FFFFFF' : '#14161B', fontFamily: look.fontDisplay }}
              >
                {c.label}
              </div>
            </div>
          ))}
          <div
            className="absolute right-[10px] -top-[8px] px-[20px] py-[8px] rounded-[14px] bg-[#258EFF] text-white text-[32px] font-mono font-black shadow-lg z-20"
            style={{ transform: `scale(${(0.7 + 0.35 * fanP).toFixed(2)}) rotate(5deg)` }}
          >
            {beat.multiplierBadge || '10×'}
          </div>
        </div>
      </div>
    );
  }

  // 23. ab_hook_leaderboard
  if (vType === 'ab_hook_leaderboard') {
    const rows =
      beat.hookVariantsList && beat.hookVariantsList.length > 0
        ? beat.hookVariantsList
        : (beat.bullets || ['Option A · Classique', 'Option B · Chiffrée', 'Option C · Contraste'])
            .slice(0, 3)
            .map((hook, idx) => ({ hook, retention: idx === 1 ? '94 %' : idx === 2 ? '72 %' : '58 %' }));
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full p-[26px] space-y-[14px]" style={CARD_STYLE}>
          {rows.slice(0, 3).map((row, idx) => {
            const p = seg(localT, 0.1 + idx * 0.25, 1.15 + idx * 0.25);
            const isWin = idx === 1;
            const targetPct = Number(String(row.retention || '').replace(/[^\d.]/g, '')) || (isWin ? 94 : 65);
            const sc = Math.round(targetPct * p);
            return (
              <div
                key={idx}
                className="rounded-[14px] px-[20px] py-[14px] border"
                style={{
                  backgroundColor: isWin ? '#ECFDF5' : '#F8F7F3',
                  borderColor: isWin ? '#10B981' : 'rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center justify-between mb-[8px]">
                  <span className="text-[24px] font-extrabold text-[#14161B] truncate">
                    {isWin ? '🏆 ' : ''}{row.hook}
                  </span>
                  <span className="text-[24px] font-mono font-black tabular-nums" style={{ color: isWin ? '#059669' : '#5C5F68' }}>
                    {sc} %
                  </span>
                </div>
                <div className="w-full h-[10px] rounded-full bg-black/8 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, sc)}%`, backgroundColor: isWin ? '#10B981' : '#94A3B8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 24. cloud_vs_offline_shield
  if (vType === 'cloud_vs_offline_shield') {
    const lockP = spring(localT - 0.5, 24);
    return (
      <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
        <HeaderBanner beat={beat} look={look} />
        <div className="w-full grid grid-cols-2 gap-[18px]">
          <div className="p-[24px]" style={{ ...CARD_STYLE, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}>
            <NotoSvgIcon name="globe" size={44} />
            <div className="mt-[12px] text-[22px] font-mono font-bold text-[#DC2626]">{beat.leftCard?.label || 'CLOUD'}</div>
            <div className="text-[40px] font-mono font-black text-[#B91C1C] tabular-nums mt-[4px]">{beat.leftCard?.value || 'Exposé'}</div>
            <div className="text-[21px] font-bold text-[#7F1D1D] mt-[6px] truncate">{beat.leftCard?.sub || 'Latence & frais'}</div>
          </div>
          <div
            className="p-[24px]"
            style={{
              ...CARD_STYLE,
              borderColor: '#10B981',
              borderWidth: '2px',
              backgroundColor: '#ECFDF5',
              transform: `scale(${(0.95 + 0.05 * lockP).toFixed(3)})`,
            }}
          >
            <NotoSvgIcon name="shield" size={44} />
            <div className="mt-[12px] text-[22px] font-mono font-bold text-[#059669]">{beat.rightCard?.label || 'LOCAL · PRIVÉ'}</div>
            <div className="text-[40px] font-mono font-black text-[#065F46] tabular-nums mt-[4px]">{beat.rightCard?.value || '0 €'}</div>
            <div className="text-[21px] font-bold text-[#047857] mt-[6px] truncate">{beat.rightCard?.sub || 'Contrôle total'}</div>
          </div>
        </div>
      </div>
    );
  }

  // 25. voice_shortcut_waveform
  const bars = 24;
  const textSample = beat.quoteText || beat.spokenLine || 'Dictée instantanée sans friction.';
  const revealCount = Math.floor(textSample.length * seg(localT, 0.25, Math.min(1.7, beatSpan * 0.65)));
  return (
    <div className="w-full flex flex-col items-center" style={wrapStyle} data-archetype={vType}>
      <HeaderBanner beat={beat} look={look} />
      <div className="w-full p-[28px] space-y-[18px]" style={{ ...CARD_STYLE, backgroundColor: '#14161B', borderColor: '#2A2E37' }}>
        <div className="flex items-center justify-between gap-[16px]">
          <span className="px-[16px] py-[8px] rounded-[10px] bg-white/10 text-white font-mono font-bold text-[22px]">
            ⌥ + ESPACE
          </span>
          <div className="flex items-center gap-[6px] h-[54px] flex-1 justify-center">
            {Array.from({ length: bars }, (_, i) => {
              const h = 12 + 38 * Math.abs(Math.sin(localT * 8 + i * 0.65));
              return (
                <span
                  key={i}
                  className="w-[7px] rounded-full"
                  style={{ height: `${h.toFixed(1)}px`, backgroundColor: i % 3 === 0 ? '#38BDF8' : '#FFFFFF' }}
                />
              );
            })}
          </div>
          <span className="text-[20px] font-mono font-bold text-[#34D399]">REC ●</span>
        </div>
        <div className="rounded-[14px] bg-white/8 p-[20px] text-[28px] font-bold text-white leading-snug">
          {textSample.slice(0, revealCount)}
          <span className="inline-block w-[4px] h-[28px] bg-[#38BDF8] ml-[4px] align-middle" />
        </div>
      </div>
    </div>
  );
}
