import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { BEATS, HOOK_CANDIDATES, WORD_CUES } from '../data/shortSpec';
import { generateSrt } from '../engine/math';

interface ScriptViewProps {
  onJumpToTime: (t: number) => void;
  onDownloadSrt: () => void;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ onJumpToTime, onDownloadSrt }) => {
  const [copied, setCopied] = useState(false);

  const fullScriptText = BEATS.map((b) => b.spokenLine).join('\n');

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(fullScriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const totalWords = fullScriptText.trim().split(/\s+/).length;

  return (
    <main className="max-w-[1160px] mx-auto px-6 py-10 space-y-10">
      <section className="border-b border-[#E3DED3] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-[#5C5F68] mb-2">
            studio-script · {totalWords} mots · 52.0 s à 1.08× (56.2 s source) · Voix ElevenLabs FR
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14161B]"
            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
          >
            Script viral &amp; Hooks notés (/10)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyScript}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E3DED3] bg-[#FCFBF8] text-xs font-semibold text-[#14161B] hover:border-[#14161B] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Script copié' : 'Copier le script'}
          </button>
          <button
            type="button"
            onClick={onDownloadSrt}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14161B] text-white text-xs font-semibold hover:bg-[#258EFF] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger .srt
          </button>
        </div>
      </section>

      {/* 3 Hook Candidates per studio-script/references/hooks.md */}
      <section>
        <h2
          className="text-lg font-bold text-[#14161B] mb-4"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          3 Hooks générés (rubric hooks.md)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOOK_CANDIDATES.map((hk) => (
            <div
              key={hk.formula}
              className={`rounded-2xl p-5 border ${
                hk.selected
                  ? 'bg-[#FCFBF8] border-[#258EFF]'
                  : 'bg-[#FCFBF8] border-[#E3DED3]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[#14161B]">{hk.formula}</span>
                <span className="font-mono font-bold text-[#258EFF] tabular-nums">{hk.score}</span>
              </div>
              <p className="text-sm font-semibold text-[#14161B] leading-snug mb-3">
                « {hk.spoken} »
              </p>
              <div className="text-xs text-[#5C5F68] border-t border-[#E3DED3] pt-2.5 space-y-1">
                <div>À l’écran : <span className="text-[#14161B] font-medium">{hk.onScreen}</span></div>
                <div>Audit : {hk.weakest}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Line-by-line script with click-to-preview jump */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-start">
        <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl divide-y divide-[#E3DED3] overflow-hidden">
          {BEATS.map((beat) => (
            <button
              key={beat.id}
              type="button"
              onClick={() => onJumpToTime(beat.from + 0.3)}
              className="w-full text-left p-5 hover:bg-[#F6F5F1] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-[#5C5F68] mb-1.5">
                <span className="font-semibold text-[#258EFF]">
                  Beat 0{beat.index} · {beat.shortLabel}
                </span>
                <span className="font-mono tabular-nums">
                  {beat.from.toFixed(1)}s → {beat.to.toFixed(1)}s
                </span>
              </div>
              <p className="text-base font-semibold text-[#14161B] leading-snug">
                {beat.spokenLine}
              </p>
              <p className="text-xs text-[#5C5F68] mt-1.5">
                Visuel : {beat.mechanism} · Levier : {beat.retentionLever}
              </p>
            </button>
          ))}
        </div>

        {/* Post Copy & SRT Preview */}
        <div className="space-y-6">
          <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5">
            <h3
              className="text-base font-bold text-[#14161B] mb-3"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Kit de publication (output/post.md)
            </h3>
            <div className="space-y-3 text-xs text-[#5C5F68] leading-relaxed">
              <div>
                <div className="font-semibold text-[#14161B] mb-0.5">Titre YouTube Shorts (54 car.)</div>
                <div>Interdire les réseaux avant 15 ans : pourquoi ça bloque</div>
              </div>
              <div>
                <div className="font-semibold text-[#14161B] mb-0.5">Légende (125 premiers car. autonomes)</div>
                <div>
                  En Australie, 85 % des ados contournent déjà l’interdiction. En France, le Conseil constitutionnel a censuré le texte. Commente LOI pour recevoir le dossier complet.
                </div>
              </div>
              <div>
                <div className="font-semibold text-[#14161B] mb-0.5">Hashtags (sans #fyp / #viral)</div>
                <div className="font-mono text-[#258EFF]">#reseauxsociaux #moinsde15ans #tech #loi #attention</div>
              </div>
            </div>
          </div>

          <div className="bg-[#14161B] text-white rounded-2xl p-5">
            <div className="text-xs font-mono text-white/60 mb-2">Aperçu sous-titres (.srt · 1.08× · Bloc unifié)</div>
            <pre className="text-xs font-mono text-white/85 whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto">
              {generateSrt(WORD_CUES.slice(0, 14), 1.08)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
};
