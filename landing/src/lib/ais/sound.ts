/**
 * AIS — Adaptive Intelligence System
 * BLOCK 5 (INT-040): Sound Identity Engine
 *
 * Generates short branded sounds using Web Audio API.
 * No external audio files needed.
 *
 * Supports 7 sound types for the Cinematic Notification System:
 * - notification: System event appeared
 * - success: Action completed successfully
 * - warning: Gentle warning / attention needed
 * - recommendation: AIS recommendation / tip
 * - completed: Task fully finished (multi-stage)
 * - achievement: Goal progress / milestone unlocked
 * - error: Something went wrong
 */

type SoundType =
  | "notification"
  | "success"
  | "warning"
  | "recommendation"
  | "tip"          // alias for recommendation (backward compat)
  | "completed"
  | "complete"     // alias for completed (backward compat)
  | "achievement"
  | "error";

class SoundIdentity {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private pendingQueue: SoundType[] = [];

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

  /** Ensure AudioContext is running — call from user gesture (click) handlers */
  async unlock(): Promise<void> {
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // Flush any pending sounds
    while (this.pendingQueue.length > 0) {
      const type = this.pendingQueue.shift()!;
      this.playSound(ctx, type);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Check if sound is currently enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  play(type: SoundType): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      this.pendingQueue.push(type);
      ctx.resume().then(() => {
        // Flush queue after resume
        while (this.pendingQueue.length > 0) {
          const pending = this.pendingQueue.shift()!;
          this.playSound(ctx, pending);
        }
      }).catch(() => {
        // If resume fails, clear queue — likely no user gesture yet
        this.pendingQueue = [];
      });
    } else {
      this.playSound(ctx, type);
    }
  }

  private playSound(ctx: AudioContext, type: SoundType): void {
    switch (type) {
      case "notification":
        // Short two-tone ascending — "hey, look here"
        this.playTone(ctx, 880, 0.08, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 1100, 0.1, "sine", 0.12), 80);
        break;

      case "success":
        // Bright ascending triad — "done, good"
        this.playTone(ctx, 660, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 880, 0.1, "sine", 0.15), 100);
        setTimeout(() => this.playTone(ctx, 1100, 0.15, "sine", 0.12), 200);
        break;

      case "warning":
        // Warm double-tap — "pay attention"
        this.playTone(ctx, 580, 0.08, "triangle", 0.12);
        setTimeout(() => this.playTone(ctx, 580, 0.08, "triangle", 0.10), 120);
        setTimeout(() => this.playTone(ctx, 730, 0.12, "triangle", 0.08), 260);
        break;

      case "recommendation":
        // Soft ascending — "here's an idea"
        this.playTone(ctx, 900, 0.06, "sine", 0.08);
        setTimeout(() => this.playTone(ctx, 1050, 0.06, "sine", 0.07), 70);
        setTimeout(() => this.playTone(ctx, 1200, 0.08, "sine", 0.06), 140);
        break;

      case "completed":
        // Full ascending chord — "mission accomplished"
        this.playTone(ctx, 523, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 659, 0.1, "sine", 0.15), 120);
        setTimeout(() => this.playTone(ctx, 784, 0.1, "sine", 0.15), 240);
        setTimeout(() => this.playTone(ctx, 1047, 0.2, "sine", 0.12), 360);
        break;

      case "achievement":
        // Triumphant ascending — "you leveled up"
        this.playTone(ctx, 440, 0.1, "sine", 0.15);
        setTimeout(() => this.playTone(ctx, 554, 0.1, "sine", 0.15), 100);
        setTimeout(() => this.playTone(ctx, 659, 0.1, "sine", 0.15), 200);
        setTimeout(() => this.playTone(ctx, 880, 0.15, "sine", 0.2), 300);
        setTimeout(() => this.playTone(ctx, 1100, 0.25, "sine", 0.15), 450);
        break;

      case "error":
        // Low descending — "something wrong"
        this.playTone(ctx, 330, 0.15, "sawtooth", 0.08);
        setTimeout(() => this.playTone(ctx, 280, 0.2, "sawtooth", 0.06), 150);
        break;

      // Backward compatibility aliases
      case "tip":
        this.playSound(ctx, "recommendation");
        break;
      case "complete":
        this.playSound(ctx, "completed");
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
