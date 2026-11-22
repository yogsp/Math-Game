import type { AudioSettings, RhythmInstrument } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    muted: false,
    musicVolume: 0.35,
    sfxVolume: 0.7,
  };
  private musicTimer: number | null = null;
  private noteIndex = 0;

  // Gentle C-major pentatonic melody for background ambience
  private readonly melodyNotes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0];

  public updateSettings(next: AudioSettings) {
    this.settings = { ...next };
    if (this.settings.muted || this.settings.musicVolume <= 0.01) {
      this.stopMusicLoop();
    } else if (this.ctx && this.ctx.state === 'running' && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public unlockFromGesture() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.settings.muted && this.settings.musicVolume > 0.01 && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public startMusicLoop() {
    if (typeof window === 'undefined') return;
    if (this.musicTimer !== null || this.settings.muted || this.settings.musicVolume <= 0.01) return;

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.settings.muted || this.settings.musicVolume <= 0.01) {
        return;
      }
      const freq = this.melodyNotes[this.noteIndex % this.melodyNotes.length];
      this.noteIndex += 1;
      this.playSoftHarpNote(freq, 0.9, 0.055 * this.settings.musicVolume);
    }, 1150);
  }

  public stopMusicLoop() {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playSoftHarpNote(freq: number, durationSec: number, gainPeak: number) {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gainPeak), now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  public playClick() {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);
    gain.gain.setValueAtTime(0.08 * this.settings.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playPlaceTile() {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.09);
    gain.gain.setValueAtTime(0.11 * this.settings.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSuccess() {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      setTimeout(() => {
        this.playSoftHarpNote(f, 0.35, 0.13 * this.settings.sfxVolume);
      }, idx * 80);
    });
  }

  public playGentleRetry() {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    // Warm, non-punitive wooden marimba nudge
    this.playSoftHarpNote(329.63, 0.22, 0.09 * this.settings.sfxVolume);
    setTimeout(() => {
      this.playSoftHarpNote(293.66, 0.28, 0.08 * this.settings.sfxVolume);
    }, 110);
  }

  public playAreaUnlock() {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    const fanfare = [392.0, 523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, idx) => {
      setTimeout(() => {
        this.playSoftHarpNote(f, 0.5, 0.15 * this.settings.sfxVolume);
      }, idx * 100);
    });
  }

  public playRhythmInstrument(instrument: RhythmInstrument) {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    this.unlockFromGesture();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.sfxVolume;

    if (instrument === 'drum') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.22);
      gain.gain.setValueAtTime(0.28 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
      return;
    }

    if (instrument === 'wood') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      gain.gain.setValueAtTime(0.12 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    if (instrument === 'chime') {
      this.playSoftHarpNote(523.25, 0.45, 0.18 * vol);
      return;
    }

    if (instrument === 'bell') {
      this.playSoftHarpNote(659.25, 0.45, 0.16 * vol);
      this.playSoftHarpNote(1318.5, 0.25, 0.06 * vol);
      return;
    }

    // sparkle
    this.playSoftHarpNote(783.99, 0.25, 0.14 * vol);
    setTimeout(() => this.playSoftHarpNote(1046.5, 0.3, 0.12 * vol), 65);
  }
}

export const soundEngine = new SoundEngine();
