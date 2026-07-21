/**
 * AIS — Adaptive Intelligence System
 * INT-040 v2: Sound Identity Engine
 *
 * Фирменный звук AIS. Не системный. Не браузерный.
 * Узнаваемый с первого тона.
 *
 * Требования:
 * - Длина: 150-300ms
 * - Звук: цифровой, мягкий, приятный, дорогой, не раздражающий
 * - Пользователь должен узнавать платформу только по одному звуку
 *
 * Звук только при настоящем событии (BLOCK 5):
 * - Переход в новый раздел
 * - Завершение сканирования
 * - Создание проекта
 * - Подключение интеграции
 * - Создание API
 * - Создание отчета
 * - Важное изменение
 */

type SoundType =
  | "notification"     // Фирменный звук AIS — scan-impulse
  | "success"          // Действие завершено успешно
  | "warning"          // Внимание
  | "recommendation"   // Рекомендация AIS
  | "tip"              // alias for recommendation
  | "completed"        // Многоэтапная задача завершена
  | "complete"         // alias for completed
  | "achievement"      // Достижение / milestone
  | "error"            // Ошибка
  | "shutdown";        // Звук исчезновения уведомления (BLOCK 4)

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
        while (this.pendingQueue.length > 0) {
          const pending = this.pendingQueue.shift()!;
          this.playSound(ctx, pending);
        }
      }).catch(() => {
        this.pendingQueue = [];
      });
    } else {
      this.playSound(ctx, type);
    }
  }

  private playSound(ctx: AudioContext, type: SoundType): void {
    switch (type) {
      case "notification":
        // ═══ ФИРМЕННЫЙ ЗВУК AIS ═══
        // Scan-impulse: 3 мягких импульса (300→500Hz), цифровой, дорогой
        // Длина: ~200ms. Узнаваемый с первого тона.
        this.playTone(ctx, 300, 0.08, "sine", 0.10);
        this.playTone(ctx, 300, 0.08, "sine", 0.10, 0.1);
        this.playTone(ctx, 500, 0.12, "sine", 0.13, 0.22);
        // Sub bass warmth
        this.playTone(ctx, 180, 0.25, "sine", 0.03, 0.08);
        break;

      case "success":
        // Яркий восходящий аккорд — "выполнено, отлично"
        this.playTone(ctx, 660, 0.08, "sine", 0.12);
        this.playTone(ctx, 880, 0.08, "sine", 0.10, 0.08);
        this.playTone(ctx, 1100, 0.12, "sine", 0.09, 0.16);
        break;

      case "warning":
        // Мягкий двойной tap — "обратите внимание"
        this.playTone(ctx, 580, 0.06, "triangle", 0.10);
        this.playTone(ctx, 580, 0.06, "triangle", 0.08, 0.1);
        this.playTone(ctx, 730, 0.1, "triangle", 0.06, 0.22);
        break;

      case "recommendation":
        // Мягкий восходящий — "вот идея"
        this.playTone(ctx, 900, 0.05, "sine", 0.07);
        this.playTone(ctx, 1050, 0.05, "sine", 0.06, 0.06);
        this.playTone(ctx, 1200, 0.07, "sine", 0.05, 0.12);
        break;

      case "completed":
        // Полный восходящий аккорд — "миссия выполнена"
        this.playTone(ctx, 523, 0.08, "sine", 0.12);
        this.playTone(ctx, 659, 0.08, "sine", 0.12, 0.1);
        this.playTone(ctx, 784, 0.08, "sine", 0.12, 0.2);
        this.playTone(ctx, 1047, 0.15, "sine", 0.10, 0.3);
        break;

      case "achievement":
        // Триумфальный — "вы достигли нового уровня"
        this.playTone(ctx, 440, 0.08, "sine", 0.12);
        this.playTone(ctx, 554, 0.08, "sine", 0.12, 0.08);
        this.playTone(ctx, 659, 0.08, "sine", 0.12, 0.16);
        this.playTone(ctx, 880, 0.12, "sine", 0.14, 0.24);
        this.playTone(ctx, 1100, 0.18, "sine", 0.10, 0.36);
        break;

      case "error":
        // Низкий нисходящий — "что-то не так"
        this.playTone(ctx, 330, 0.12, "sawtooth", 0.06);
        this.playTone(ctx, 280, 0.16, "sawtooth", 0.04, 0.12);
        break;

      case "shutdown":
        // ═══ ЗВУК ИСЧЕЗНОВЕНИЯ (Stage 6) ═══
        // Нисходящий тон + щелчок — "завершение работы системы"
        // Ощущение лагания системы, мягкое угасание
        this.playTone(ctx, 600, 0.12, "sine", 0.08);
        this.playTone(ctx, 450, 0.12, "sine", 0.06, 0.08);
        this.playTone(ctx, 300, 0.16, "sine", 0.05, 0.16);
        this.playTone(ctx, 180, 0.22, "triangle", 0.04, 0.26);
        // Noise burst — финальный щелчок
        this.playNoiseBurst(ctx, 0.025, 0.07, 0.42);
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
    volume: number,
    delay: number = 0
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  }

  /** Short noise burst — used for shutdown click effect */
  private playNoiseBurst(
    ctx: AudioContext,
    duration: number,
    volume: number,
    delay: number = 0
  ): void {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // Decaying noise
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }
}

/* ─── Singleton ──────────────────────────────────────────── */

let instance: SoundIdentity | null = null;

export function getSoundIdentity(): SoundIdentity {
  if (!instance) {
    instance = new SoundIdentity();
  }
  return instance;
}

export type { SoundType };
