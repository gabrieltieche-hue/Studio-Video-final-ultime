import React from 'react';
import { FACT_SOURCES, MELVYNX_DNA } from '../data/melvynxAnalysis';

export const MelvynxAnalysisView: React.FC = () => {
  return (
    <main className="max-w-[1160px] mx-auto px-6 py-10 space-y-12">
      {/* Editorial Hero */}
      <section className="border-b border-[#E3DED3] pb-8">
        <div className="text-xs text-[#5C5F68] mb-2">
          Décryptage technique · Chaîne YouTube @melvynxdev · Dépôt melvynx/video-agent-skills
        </div>
        <h1
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#14161B] max-w-3xl text-balance"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          L’anatomie exacte d’un Short de Melvynx : du code pur, zéro hasard
        </h1>
        <p className="text-base text-[#5C5F68] mt-4 max-w-3xl leading-relaxed">
          Contrairement aux montages CapCut surchargés de whooshes et d’émojis rebondissants, le système open-source de
          Melvynx repose sur un moteur déterministe (<code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">Node + Chrome + ffmpeg + whisper.cpp</code>)
          piloté par une grammaire visuelle stricte : papier texturé, une seule couleur d’accent, des UI recréées et une rétention calibrée à la centième de seconde.
        </p>
      </section>

      {/* 4 Core Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MELVYNX_DNA.map((dim) => (
          <article
            key={dim.title}
            className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-[#E3DED3] pb-3 mb-4">
                <h2
                  className="text-lg font-bold text-[#14161B]"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  {dim.title}
                </h2>
                <span className="text-xs font-mono text-[#258EFF] whitespace-nowrap shrink-0">
                  {dim.metric}
                </span>
              </div>
              <p className="text-sm text-[#5C5F68] leading-relaxed mb-4">{dim.summary}</p>
            </div>
            <ul className="space-y-2 border-t border-[#E3DED3] pt-4">
              {dim.rules.map((rule) => (
                <li key={rule} className="text-xs text-[#14161B] leading-relaxed flex items-start gap-2.5">
                  <span className="text-[#258EFF] font-mono font-bold mt-0.5" aria-hidden="true">
                    —
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {/* Palette & Design Tokens Table */}
      <section className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-6">
        <h2
          className="text-xl font-bold text-[#14161B] mb-1"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Design System extrait de engine/lib/kit.js
        </h2>
        <p className="text-sm text-[#5C5F68] mb-5">
          Chaque Short utilise exactement ces variables chromatiques et typographiques, sans dégradé décoratif ni halo lumineux.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { name: 'paper', hex: '#F1EEE6', use: 'Fond plateau' },
            { name: 'sheet', hex: '#FCFBF8', use: 'Cartes UI' },
            { name: 'ink', hex: '#14161B', use: 'Titres & encre' },
            { name: 'ink2', hex: '#5C5F68', use: 'Sous-titres' },
            { name: 'line', hex: '#E3DED3', use: 'Filets 1px' },
            { name: 'blue', hex: '#258EFF', use: 'Accent unique' },
            { name: 'tint', hex: '#E6F0FD', use: 'Fond sélection' },
          ].map((tok) => (
            <div key={tok.name} className="border border-[#E3DED3] rounded-xl p-3 bg-white">
              <div
                className="w-full h-10 rounded-lg border border-black/10 mb-2.5"
                style={{ backgroundColor: tok.hex }}
              />
              <div className="text-xs font-bold text-[#14161B] font-mono">{tok.name}</div>
              <div className="text-xs text-[#5C5F68] font-mono tabular-nums">{tok.hex}</div>
              <div className="text-xs text-[#5C5F68] mt-0.5">{tok.use}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Fact Sources used in the Short */}
      <section className="border-t border-[#E3DED3] pt-8">
        <h2
          className="text-xl font-bold text-[#14161B] mb-4"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Sources factuelles intégrées au Short (-15 ans)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FACT_SOURCES.map((src) => (
            <div key={src.label} className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5">
              <div className="text-sm font-bold text-[#14161B] mb-2">{src.label}</div>
              <p className="text-xs text-[#5C5F68] leading-relaxed">{src.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
