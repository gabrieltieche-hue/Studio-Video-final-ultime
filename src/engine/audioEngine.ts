import { DEFAULT_PLAYBACK_SPEED, MusicBedId, SFX_EVENTS, SfxEvent } from '../data/shortSpec';

/**
 * Sample-accurate Web Audio mixing engine anchored to AudioContext hardware clock:
 * - Plays real ElevenLabs French voiceover MP3 (/audio/voice/short-interdiction-15-ans-fr.mp3)
 * - Plays Bright Corporate Groove (upbeat.mp3) by default at energetic background level (0.28 under voice)
 *   to boost energy and retention while keeping Brian baritone French narration clear
 * - Exposes getMasterTime(speed) locked directly to AudioContext.currentTime so voice, captions, and UI never drift
 */
class ShortAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;
  private musicBuffers: Partial<Record<MusicBedId, AudioBuffer>> = {};
  private voiceBuffer: AudioBuffer | null = null;
  private sfxBuffers: Record<string, AudioBuffer> = {};
  private currentBed: MusicBedId = 'upbeat';
  private playbackSpeed = DEFAULT_PLAYBACK_SPEED;
  private musicEnabled = true;
  private sfxEnabled = true;
  private voiceEnabled = true;
  private lastFiredIndex = -1;
  private loadingPromise: Promise<void> | null = null;

  // Hardware clock anchor for 0-drift audio/visual synchronization
  private anchorAudioTime: number | null = null;
  private anchorShortTime = 0;

  private targetMusicGain(): number {
    if (!this.musicEnabled) return 0;
    // Energetic corporate groove (-12.5 dB relative to source) balanced cleanly under Brian's warm baritone
    return this.voiceEnabled ? 0.24 : 0.36;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.gain.value = this.targetMusicGain();
      this.voiceGain.gain.value = this.voiceEnabled ? 1.0 : 0;
      this.sfxGain.gain.value = this.sfxEnabled ? 0.52 : 0;

      this.musicGain.connect(this.ctx.destination);
      this.voiceGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  async preload(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = this.ctx || new AudioCtx();
        if (!this.ctx) {
          this.ctx = ctx;
          this.musicGain = ctx.createGain();
          this.voiceGain = ctx.createGain();
          this.sfxGain = ctx.createGain();
          this.musicGain.gain.value = this.targetMusicGain();
          this.voiceGain.gain.value = this.voiceEnabled ? 1.0 : 0;
          this.sfxGain.gain.value = this.sfxEnabled ? 0.52 : 0;
          this.musicGain.connect(ctx.destination);
          this.voiceGain.connect(ctx.destination);
          this.sfxGain.connect(ctx.destination);
        }

        const sfxNames = ['glass-shatter', 'impact-boom', 'zhhh', 'riser', 'pop-back'];
        const bedNames: MusicBedId[] = ['upbeat', 'groove', 'analytical', 'clockwork', 'chill'];

        await Promise.all([
          (async () => {
            try {
              const res = await fetch('/audio/voice/short-interdiction-15-ans-fr.mp3');
              if (!res.ok) return;
              const buf = await res.arrayBuffer();
              this.voiceBuffer = await ctx.decodeAudioData(buf);
            } catch {
              // ignore decode failures in restricted environments
            }
          })(),
          ...sfxNames.map(async (name) => {
            try {
              const res = await fetch(`/audio/sfx/${name}.mp3`);
              if (!res.ok) return;
              const buf = await res.arrayBuffer();
              this.sfxBuffers[name] = await ctx.decodeAudioData(buf);
            } catch {
              // ignore
            }
          }),
          ...bedNames.map(async (bed) => {
            try {
              const res = await fetch(`/audio/music/${bed}.mp3`);
              if (!res.ok) return;
              const buf = await res.arrayBuffer();
              this.musicBuffers[bed] = await ctx.decodeAudioData(buf);
            } catch {
              // ignore
            }
          }),
        ]);
      } catch {
        // ignore if AudioContext is blocked prior to gesture
      }
    })();
    return this.loadingPromise;
  }

  setBed(bed: MusicBedId, isPlaying: boolean, currentTime: number) {
    this.currentBed = bed;
    if (isPlaying) {
      this.stopMusic();
      this.startMusic(currentTime);
    }
  }

  setSpeed(speed: number) {
    if (this.ctx && this.anchorAudioTime !== null) {
      const synced = this.getSyncedTime(this.playbackSpeed);
      if (synced !== null) {
        this.anchorShortTime = synced;
      }
      this.anchorAudioTime = this.ctx.currentTime;
    }
    this.playbackSpeed = speed;
    if (this.voiceSource && this.ctx) {
      this.voiceSource.playbackRate.setValueAtTime(speed, this.ctx.currentTime);
    }
  }

  setOptions(opts: { musicEnabled?: boolean; sfxEnabled?: boolean; voiceEnabled?: boolean }) {
    if (opts.musicEnabled !== undefined) {
      this.musicEnabled = opts.musicEnabled;
    }
    if (opts.sfxEnabled !== undefined) {
      this.sfxEnabled = opts.sfxEnabled;
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.52 : 0, this.ctx.currentTime, 0.05);
      }
    }
    if (opts.voiceEnabled !== undefined) {
      this.voiceEnabled = opts.voiceEnabled;
      if (this.voiceGain && this.ctx) {
        this.voiceGain.gain.setTargetAtTime(this.voiceEnabled ? 1.0 : 0, this.ctx.currentTime, 0.05);
      }
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.targetMusicGain(), this.ctx.currentTime, 0.08);
    }
  }

  async start(t: number, speed = DEFAULT_PLAYBACK_SPEED): Promise<boolean> {
    this.playbackSpeed = speed;
    const ctx = this.ensureContext();
    await this.preload();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    this.resetTriggersBefore(t);
    this.anchorShortTime = t;
    this.anchorAudioTime = ctx.currentTime;
    this.startMusic(t);
    this.startVoice(t, speed);
    return true;
  }

  seekWhilePlaying(t: number, speed = this.playbackSpeed) {
    this.playbackSpeed = speed;
    if (!this.ctx) return;
    this.resetTriggersBefore(t);
    this.anchorShortTime = t;
    this.anchorAudioTime = this.ctx.currentTime;
    this.stopVoice();
    this.startVoice(t, speed);
  }

  getSyncedTime(speed = this.playbackSpeed): number | null {
    if (!this.ctx || this.anchorAudioTime === null || this.ctx.state !== 'running') {
      return null;
    }
    return this.anchorShortTime + Math.max(0, this.ctx.currentTime - this.anchorAudioTime) * speed;
  }

  private startMusic(t: number) {
    if (!this.ctx || !this.musicGain) return;
    this.stopMusic();
    const buf = this.musicBuffers[this.currentBed];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const offset = (t / Math.max(0.5, this.playbackSpeed)) % Math.max(1, buf.duration - 2);
    src.connect(this.musicGain);
    src.start(0, offset);
    this.musicSource = src;
  }

  private startVoice(t: number, speed: number) {
    if (!this.ctx || !this.voiceGain || !this.voiceBuffer) return;
    this.stopVoice();
    if (t >= this.voiceBuffer.duration - 0.05) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.voiceBuffer;
    src.playbackRate.value = speed;
    src.connect(this.voiceGain);
    src.start(0, Math.max(0, t));
    this.voiceSource = src;
  }

  stop() {
    this.anchorAudioTime = null;
    this.stopMusic();
    this.stopVoice();
  }

  private stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch {
        // already stopped
      }
      this.musicSource = null;
    }
  }

  private stopVoice() {
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
        this.voiceSource.disconnect();
      } catch {
        // already stopped
      }
      this.voiceSource = null;
    }
  }

  resetTriggersBefore(t: number) {
    this.lastFiredIndex = -1;
    for (let i = 0; i < SFX_EVENTS.length; i++) {
      if (SFX_EVENTS[i].at < t - 0.05) {
        this.lastFiredIndex = i;
      }
    }
  }

  tick(prevT: number, nextT: number) {
    if (!this.ctx || !this.sfxGain) return;

    if (this.sfxEnabled) {
      for (let i = 0; i < SFX_EVENTS.length; i++) {
        const ev = SFX_EVENTS[i];
        if (i > this.lastFiredIndex && ev.at >= prevT && ev.at <= nextT + 0.05) {
          this.lastFiredIndex = i;
          this.playSfx(ev);
        }
      }
    }
  }

  playSfx(ev: SfxEvent) {
    if (!this.ctx || !this.sfxGain) return;
    const gainVal = ev.gain ?? 0.45;
    const buf = this.sfxBuffers[ev.kind];
    if (buf) {
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = gainVal;
      src.buffer = buf;
      src.connect(g);
      g.connect(this.sfxGain);
      src.start();
      return;
    }

    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.sfxGain);

    if (ev.kind === 'thud') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      g.gain.setValueAtTime(gainVal * 0.75, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (ev.kind === 'pop') {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.055);
      g.gain.setValueAtTime(gainVal * 0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (ev.kind === 'tap') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.028);
      g.gain.setValueAtTime(gainVal * 0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (ev.kind === 'bell') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      g.gain.setValueAtTime(gainVal * 0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  }
}

export const audioEngine = new ShortAudioEngine();
