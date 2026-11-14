import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Circle,
  Mic,
  RotateCcw,
  Square,
  Video,
  VideoOff,
} from 'lucide-react';
import { BEATS } from '../../data/shortSpec';
import { buildDynamicBeatsFromProject } from '../../engine/transcriptUtils';
import { formatStudioTimecode, type ShortProject } from '../../types/studio';

interface ScriptPreset {
  id: string;
  title: string;
  lines: string[];
}

const PRESET_SCRIPTS: ScriptPreset[] = [
  {
    id: 'script-interdiction-15',
    title: 'Interdire les réseaux avant 15 ans (Script validé)',
    lines: BEATS.map((b) => `${String(b.index).padStart(2, '0')} · ${b.spokenLine}`),
  },
  {
    id: 'script-ia-agent',
    title: 'Créer son monteur IA avec Studio Short',
    lines: [
      '01 · Tout le monde veut automatiser ses Shorts, mais presque personne ne garde un vrai contrôle qualité.',
      '02 · Voici comment piloter script, voix off ElevenLabs, motion design et retours frame par frame.',
      '03 · Chaque commentaire horodaté part directement en prompt structuré pour itérer en quelques secondes.',
    ],
  },
];

interface StudioRecorderViewProps {
  activeProject?: ShortProject | null;
}

export const StudioRecorderView: React.FC<StudioRecorderViewProps> = ({ activeProject }) => {
  const allScripts = useMemo(() => {
    if (!activeProject || activeProject.isFlagshipReactStage) {
      return PRESET_SCRIPTS;
    }
    const beats = buildDynamicBeatsFromProject(activeProject);
    const lines = beats
      .map((b) => `${String(b.index).padStart(2, '0')} · ${b.spokenLine || b.title}`)
      .filter(Boolean);
    const dynamicScript: ScriptPreset = {
      id: `project-${activeProject.id}`,
      title: `${activeProject.title} (${activeProject.currentVersion})`,
      lines: lines.length > 0 ? lines : [`01 · ${activeProject.hookText || activeProject.title}`],
    };
    return [dynamicScript, ...PRESET_SCRIPTS];
  }, [activeProject]);

  const [scriptId, setScriptId] = useState(allScripts[0].id);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'md' | 'lg'>('lg');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (activeProject && !activeProject.isFlagshipReactStage) {
      setScriptId(`project-${activeProject.id}`);
      setActiveLineIdx(0);
    } else {
      setScriptId(PRESET_SCRIPTS[0].id);
      setActiveLineIdx(0);
    }
  }, [activeProject?.id, activeProject?.isFlagshipReactStage]);

  const script = allScripts.find((s) => s.id === scriptId) || allScripts[0];

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 0.1), 100);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsRecording((r) => !r);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveLineIdx((i) => Math.min(script.lines.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveLineIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [script.lines.length]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const toggleCamera = async () => {
    if (cameraActive) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setCameraActive(false);
      return;
    }
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Caméra indisponible dans cet environnement.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setCameraError('Accès caméra/micro refusé ou matériel absent.');
    }
  };

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Scripts & Teleprompter Controls */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-extrabold text-[#14161B]"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              Prompteur Facecam
            </h2>
            <span className="text-[11px] font-mono text-[#5C5F68]">R · ↑ / ↓</span>
          </div>

          <div className="space-y-1.5">
            {allScripts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setScriptId(s.id);
                  setActiveLineIdx(0);
                }}
                className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  s.id === scriptId
                    ? 'bg-[#258EFF]/10 border-[#258EFF] text-[#14161B]'
                    : 'bg-white border-[#E3DED3] text-[#5C5F68] hover:text-[#14161B]'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Camera Preview Card */}
          <div className="rounded-2xl border border-[#E3DED3] bg-[#F1EEE6] overflow-hidden aspect-[9/16] max-h-[260px] relative flex items-center justify-center">
            {cameraActive ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="p-4 text-center space-y-2 text-[#5C5F68]">
                <Camera className="w-7 h-7 mx-auto text-[#258EFF]" />
                <p className="text-xs font-semibold text-[#14161B]">Retour Caméra</p>
                <p className="text-[11px]">
                  {cameraError || 'Activez votre webcam pour caler votre regard sous la lentille.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              className="flex-1 py-2 px-3 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {cameraActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              {cameraActive ? 'Couper caméra' : 'Activer caméra'}
            </button>

            <button
              type="button"
              onClick={() => setFontSize((f) => (f === 'lg' ? 'md' : 'lg'))}
              className="py-2 px-3 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold text-[#14161B] cursor-pointer"
            >
              Taille {fontSize === 'lg' ? 'XL' : 'M'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Teleprompter Reading Stage */}
      <div className="lg:col-span-8 bg-[#FCFBF8] border border-[#E3DED3] rounded-2xl p-5 flex flex-col justify-between min-h-[480px] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E3DED3] pb-3">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isRecording ? 'text-[#DC2626]' : 'text-[#258EFF]'}`} />
            <span className="text-xs font-bold text-[#14161B]">{script.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#14161B] tabular-nums">
              {formatStudioTimecode(elapsed)}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRecording(false);
                setElapsed(0);
              }}
              title="Réinitialiser le chrono"
              className="p-1.5 rounded-lg hover:bg-[#EAE7DF] text-[#5C5F68] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsRecording((r) => !r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                isRecording ? 'bg-[#DC2626] text-white' : 'bg-[#14161B] text-white hover:bg-[#258EFF]'
              }`}
            >
              {isRecording ? <Square className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 fill-current" />}
              {isRecording ? 'Arrêter (R)' : 'Enregistrer (R)'}
            </button>
          </div>
        </div>

        <div className="flex-1 py-6 space-y-3 overflow-y-auto">
          {script.lines.map((line, idx) => {
            const active = idx === activeLineIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveLineIdx(idx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#258EFF]/10 border-[#258EFF] text-[#14161B] shadow-sm'
                    : 'bg-transparent border-transparent text-[#A19F98] hover:text-[#5C5F68]'
                }`}
              >
                <p
                  className={`font-bold leading-snug ${
                    fontSize === 'lg' ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
                  }`}
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  {line}
                </p>
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#E3DED3] pt-3 flex items-center justify-between">
          <span className="text-xs text-[#5C5F68] font-mono">
            Ligne {activeLineIdx + 1} / {script.lines.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveLineIdx((i) => Math.max(0, i - 1))}
              disabled={activeLineIdx === 0}
              className="px-3 py-1.5 rounded-xl border border-[#E3DED3] bg-white hover:bg-[#EAE7DF] text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Précédente
            </button>
            <button
              type="button"
              onClick={() => setActiveLineIdx((i) => Math.min(script.lines.length - 1, i + 1))}
              disabled={activeLineIdx >= script.lines.length - 1}
              className="px-3 py-1.5 rounded-xl bg-[#14161B] text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              Suivante
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
