import React, { useState } from 'react';
import { REPO_FILES_SUMMARY } from '../data/melvynxAnalysis';

const STYLE_JSON_PREVIEW = `{
  "version": 1,
  "name": "Papier Signature · Melvynx",
  "creator": { "name": "Studio Short FR", "handle": "@melvynxdev", "lang": "fr", "voiceProvider": "elevenlabs" },
  "colors": { "paper": "#F1EEE6", "sheet": "#FCFBF8", "ink": "#14161B", "accent": "#258EFF" },
  "captions": { "style": "rise", "groupedContainer": true, "perWordBoxes": false, "maxWords": 4, "maxChars": 22 },
  "layout": { "frame": { "bleed": true, "r": 32, "border": 0, "shadow": 40 }, "seam": 1160 },
  "display": { "font": "Bricolage Grotesque", "weight": 800, "flat": true },
  "pace": { "speed": 1.08, "targetDurationSec": [45, 55] },
  "music": { "bed": "upbeat", "src": "assets/music/upbeat.mp3", "offset": 0 },
  "mix": { "music": -30, "sfx": -22, "duck": 0.75 }
}`;

const SPEC_JS_PREVIEW = `window.SPEC = {
  title: 'Interdire les réseaux avant 15 ans : pourquoi la loi explose',
  speed: 1.08, // ~52.0 s effectifs (56.2 s source)
  voice: { provider: 'elevenlabs', src: 'public/audio/voice/short-interdiction-15-ans-fr.mp3' },
  layout: {
    keys: [
      [0.0, 1160],   // Beat 1: Hook verrou parental -15 ans + explosion 3.35s
      [5.9, 1160],   // Beat 2: Australie 85 % + Age Gate bypass 2012 -> 2004
      [15.15, 1160], // Beat 3: France juil. 2026 -> CENSURÉ 14 août
      [23.72, 1920], // Beat 4: Full Paper — Design du feed + Jauge 92 %
      [29.42, 1920], // Beat 5: Full Paper — Bars 45 min vs 3h42 (x4.9)
      [37.4, 1160],  // Beat 6: Split — KIDS Act Toggles
      [46.24, 0],    // Beat 7: Plein écran — Punch-in verdict
      [51.96, 0],    // Beat 8: Plein écran — CTA commentaires "LOI" + DM
    ]
  },
  music: { bed: 'upbeat', offset: 0 }, // Bright Corporate Groove
  mix: { music: -30, sfx: -22, duck: 0.75 }
};`;

export const RepoSetupView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<'style' | 'spec'>('style');

  return (
    <main className="max-w-[1160px] mx-auto px-6 py-10 space-y-10">
      <section className="border-b border-[#E3DED3] pb-6">
        <div className="text-xs text-[#5C5F68] mb-2">
          Dépôt cloné &amp; configuré · github.com/melvynx/video-agent-skills
        </div>
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14161B]"
          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
        >
          Installation complète du pipeline dans ce workspace
        </h1>
        <p className="text-sm text-[#5C5F68] mt-3 max-w-3xl leading-relaxed">
          Les 13 skills de <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">video-agent-skills</code> ont été installés
          dans <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">.claude/skills/</code>, la voix off FR ElevenLabs est générée
          via <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">engine/voiceover.mjs</code>, les 5 musiques studio
          (avec <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">upbeat.mp3</code> par défaut) sont centralisées dans
          <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">assets/music/</code>, et le projet
          <code className="text-xs bg-[#EAE7DF] px-1.5 py-0.5 rounded">video-agent/edits/short-interdiction-15-ans/</code> est prêt.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        {/* File Tree & Roles */}
        <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl divide-y divide-[#E3DED3]">
          {REPO_FILES_SUMMARY.map((item) => (
            <div key={item.path} className="p-4">
              <div className="text-xs font-mono font-bold text-[#14161B] break-all">{item.path}</div>
              <div className="text-xs text-[#5C5F68] mt-1 leading-relaxed">{item.role}</div>
            </div>
          ))}
        </div>

        {/* Live Config Viewer */}
        <div className="bg-[#14161B] text-white rounded-2xl overflow-hidden border border-[#14161B]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1 bg-white/10 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedFile('style')}
                className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                  selectedFile === 'style' ? 'bg-[#258EFF] text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                style.json
              </button>
              <button
                type="button"
                onClick={() => setSelectedFile('spec')}
                className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer ${
                  selectedFile === 'spec' ? 'bg-[#258EFF] text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                source/spec.js
              </button>
            </div>
            <span className="text-xs font-mono text-white/55">video-agent/</span>
          </div>

          <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-white/90">
            <code>{selectedFile === 'style' ? STYLE_JSON_PREVIEW : SPEC_JS_PREVIEW}</code>
          </pre>
        </div>
      </section>
    </main>
  );
};
