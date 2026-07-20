/**
 * AIS — Adaptive Intelligence System
 * BLOCK 10: Sound Identity
 *
 * Generates short branded sounds using Web Audio API.
 * No external audio files needed.
 */

type SoundType = "notification" | "success" | "error" | "complete" | "tip" | "achievement";

class SoundIdentity {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("sip_ais_memory")
        ? JSON.parse(localStorage.getItem("sip_ais_memory")!).soundEnabled ?? true
        : true;
    }
  }

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(type: SoundType): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().then(() => this.playSound(ctx, type));
    } else {
      this.playSound(ctx, type);
    }
  }

  private playSound(ctx: AudioContext, type: SoundType): void {
    switch (type) {
      case "notification":
        this.playTone(ctx, 880, 0.08, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 1100, 0.1, "sine", 0.12), 80);
        break;
      case "success":
        this.playTone(ctx, 660, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 880, 0.1, "sine", 0.15), 100);
        setTimeout(() => this.playTone(ctx, 1100, 0.15, "sine", 0.12), 200);
        break;
      case "error":
        this.playTone(ctx, 330, 0.15, "sawtooth", 0.08);
        setTimeout(() => this.playTone(ctx, 280, 0.2, "sawtooth", 0.06), 150);
        break;
      case "complete":
        this.playTone(ctx, 523, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 659, 0.1, "sine", 0.15), 120);
        setTimeout(() => this.playTone(ctx, 784, 0.1, "sine", 0.15), 240);
        setTimeout(() => this.playTone(ctx, 1047, 0.2, "sine", 0.12), 360);
        break;
      case "tip":
        this.playTone(ctx, 1200, 0.05, "sine", 0.08);
        setTimeout(() => this.playTone(ctx, 1400, 0.06, "sine", 0.06), 50);
        break;
      case "achievement":
        this.playTone(ctx, 440, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 554, 0.1, "sine", 0.15), 100);
        setTimeout(() => this.playTone(ctx, 659, 0.1, "sine", 0.15), 200);
        setTimeout(() => this.playTone(ctx, 880, 0.15, "sine", 0.2), 300);
        setTimeout(() => this.playTone(ctx, 1100, 0.25, "sine", 0.15), 450);
        break;
    }
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  }
}

/* ─── Singleton ──────────────────────────────────────────────────────── */

let instance: SoundIdentity | null = null;

export function getSoundIdentity(): SoundIdentity {
  if (!instance) {
    instance = new SoundIdentity();
  }
  return instance;
}

export type { SoundType };
