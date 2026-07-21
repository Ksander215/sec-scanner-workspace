/**
 * AIS — Cinematic Notification System (INT-040)
 *
 * Полная замена toast-уведомлений для AIS.
 * Кинематографичная многоэтапная анимация:
 *
 * Stage 1: Появление символа AIS (100-200мс задержка, только символ)
 * Stage 2: Раскрытие карточки (высота, свечение)
 * Stage 3: Появление заголовка
 * Stage 4: Эффект печати текста
 * Stage 5: Кнопка действия
 * Stage 6: Исчезновение (свечение затухает, горизонтальное схлопывание к центру)
 *
 * Поддерживает: очередь, приоритеты, адаптивное время, Reduced Motion,
 * клавиатурную навигацию, screen reader.
 */

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { getSoundIdentity, type SoundType } from "@/lib/ais/sound";
import { getAISMemory } from "@/lib/ais/memory";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info,
  Zap,
  Target,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";

/* ─── Priority Levels ──────────────────────────────────────────────── */

export type AISPriority = "critical" | "high" | "normal" | "info";

export type AISEventType =
  | "system"
  | "achievement"
  | "success"
  | "info"
  | "warning"
  | "ai_tip";

/* ─── Notification Interface ──────────────────────────────────────── */

export interface AISSystemNotification {
  id: string;
  type: AISEventType;
  priority: AISPriority;
  /** i18n key for system label (default: "AIS") */
  systemKey?: string;
  /** i18n key for title */
  titleKey: string;
  /** i18n key for description — rendered with typewriter effect */
  descKey?: string;
  /** Optional action buttons */
  actions?: {
    labelKey: string;
    href?: string;
    onClick?: () => void;
  }[];
  /** Duration in ms (0 = manual dismiss only) */
  duration?: number;
  /** Sound to play */
  sound?: SoundType;
  /** Glow color override */
  glowColor?: string;
  /** Timestamp when added */
  addedAt: number;
}

/* ─── Context ──────────────────────────────────────────────────────── */

interface AISSystemEventContextValue {
  addNotification: (notification: Omit<AISSystemNotification, "id" | "addedAt">) => void;
  removeNotification: (id: string) => void;
  /** Clear all notifications */
  clearAll: () => void;
}

const AISSystemEventContext = createContext<AISSystemEventContextValue>({
  addNotification: () => {},
  removeNotification: () => {},
  clearAll: () => {},
});

/* ─── Visual Config ────────────────────────────────────────────────── */

const EVENT_CONFIG: Record<
  AISEventType,
  {
    icon: React.ElementType;
    gradient: string;
    glowColor: string;
    borderColor: string;
    accentColor: string;
    defaultSound: SoundType;
    defaultDuration: number;
    defaultPriority: AISPriority;
  }
> = {
  system: {
    icon: Zap,
    gradient: "from-violet-600/15 via-violet-500/5 to-transparent",
    glowColor: "rgba(139, 92, 246, 0.35)",
    borderColor: "border-violet-500/25",
    accentColor: "#8b5cf6",
    defaultSound: "notification",
    defaultDuration: 7000,
    defaultPriority: "normal",
  },
  achievement: {
    icon: Target,
    gradient: "from-emerald-600/15 via-emerald-500/5 to-transparent",
    glowColor: "rgba(16, 185, 129, 0.35)",
    borderColor: "border-emerald-500/25",
    accentColor: "#10b981",
    defaultSound: "achievement",
    defaultDuration: 9000,
    defaultPriority: "high",
  },
  success: {
    icon: CheckCircle2,
    gradient: "from-blue-600/15 via-blue-500/5 to-transparent",
    glowColor: "rgba(59, 130, 246, 0.35)",
    borderColor: "border-blue-500/25",
    accentColor: "#3b82f6",
    defaultSound: "success",
    defaultDuration: 6000,
    defaultPriority: "normal",
  },
  info: {
    icon: Info,
    gradient: "from-cyan-600/15 via-cyan-500/5 to-transparent",
    glowColor: "rgba(6, 182, 212, 0.3)",
    borderColor: "border-cyan-500/25",
    accentColor: "#06b6d4",
    defaultSound: "recommendation",
    defaultDuration: 8000,
    defaultPriority: "info",
  },
  warning: {
    icon: AlertCircle,
    gradient: "from-amber-600/15 via-amber-500/5 to-transparent",
    glowColor: "rgba(245, 158, 11, 0.3)",
    borderColor: "border-amber-500/25",
    accentColor: "#f59e0b",
    defaultSound: "warning",
    defaultDuration: 8000,
    defaultPriority: "high",
  },
  ai_tip: {
    icon: Sparkles,
    gradient: "from-violet-600/15 via-fuchsia-500/8 to-transparent",
    glowColor: "rgba(168, 85, 247, 0.35)",
    borderColor: "border-violet-500/30",
    accentColor: "#a855f7",
    defaultSound: "recommendation",
    defaultDuration: 9000,
    defaultPriority: "normal",
  },
};

/* ─── Priority order for queue ─────────────────────────────────────── */

const PRIORITY_ORDER: Record<AISPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  info: 3,
};

/* ─── Typewriter Hook ──────────────────────────────────────────────── */

function useTypewriter(text: string, speed = 28, enabled = true) {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed(text);
      setIsDone(true);
      return;
    }

    setDisplayed("");
    setIsDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setIsDone(true);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, isDone };
}

/* ─── Animation Stage Component ────────────────────────────────────── */

function CinematicNotification({
  notification,
  onDismiss,
  onAction,
  animationIntensity,
  typingEnabled,
  dismissSpeed,
}: {
  notification: AISSystemNotification;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
  animationIntensity: "full" | "reduced" | "minimal";
  typingEnabled: boolean;
  dismissSpeed: "fast" | "normal" | "slow";
}) {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const config = EVENT_CONFIG[notification.type];
  const Icon = config.icon;
  const glowColor = notification.glowColor || config.glowColor;

  // Animation stage management
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Typewriter for description
  const descText = notification.descKey ? t(notification.descKey) : "";
  const { displayed: typedText, isDone: typingDone } = useTypewriter(
    descText,
    28,
    typingEnabled && animationIntensity !== "minimal"
  );

  // Track read time for adaptive timing
  const appearTime = useRef(Date.now());
  const [isHovered, setIsHovered] = useState(false);

  // Reduced motion override
  const isReduced = prefersReducedMotion || animationIntensity === "minimal";
  const isReducedPartial = isReduced || animationIntensity === "reduced";

  // Stage progression
  useEffect(() => {
    if (isReduced) {
      // Skip to final state immediately
      setStage(5);
      return;
    }

    // Clear previous timers
    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];

    const addTimer = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      stageTimerRef.current.push(id);
    };

    // Stage 1: Symbol only → 150ms delay → Stage 2
    addTimer(() => setStage(2), 150);

    // Stage 2: Card expands → 300ms → Stage 3
    addTimer(() => setStage(3), 450);

    // Stage 3: Title appears → 200ms → Stage 4
    addTimer(() => setStage(4), 650);

    // Stage 4: Typewriter starts, after it finishes → Stage 5
    const typingDuration = Math.min(descText.length * 28 + 200, 3000);
    addTimer(() => setStage(5), 650 + typingDuration);

    return () => {
      stageTimerRef.current.forEach(clearTimeout);
    };
  }, [isReduced, descText.length]);

  // Auto-dismiss timer (paused on hover, affected by dismissSpeed setting)
  useEffect(() => {
    if (notification.duration === 0) return; // Manual dismiss only
    if (stage < 5) return; // Don't start until fully visible

    // Apply dismiss speed multiplier
    const speedMultiplier = dismissSpeed === "fast" ? 0.5 : dismissSpeed === "slow" ? 1.8 : 1.0;
    let remaining = (notification.duration ?? config.defaultDuration) * speedMultiplier;
    let startTime = Date.now();
    let timerId: ReturnType<typeof setTimeout>;

    const startTimer = () => {
      startTime = Date.now();
      timerId = setTimeout(() => {
        handleDismiss();
      }, remaining);
    };

    const pauseTimer = () => {
      remaining -= (Date.now() - startTime);
      if (remaining < 0) remaining = 0;
      clearTimeout(timerId);
    };

    if (isHovered) {
      // Don't start timer while hovered
    } else {
      startTimer();
    }

    return () => {
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isHovered, notification.duration, notification.id, dismissSpeed]);

  const handleDismiss = useCallback(() => {
    setStage(6);
    // Wait for exit animation
    setTimeout(() => onDismiss(notification.id), 600);
  }, [notification.id, onDismiss]);

  const handleAction = useCallback(() => {
    const action = notification.actions?.[0];
    if (action?.onClick) action.onClick();
    if (action?.href) window.location.href = action.href;
    onAction(notification.id);
  }, [notification, onAction]);

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "Enter" && stage >= 5 && notification.actions?.length) {
        handleAction();
      }
    },
    [handleDismiss, handleAction, stage, notification.actions]
  );

  // Glow intensity based on stage
  const glowIntensity =
    stage === 1 ? 0.2 :
    stage === 2 ? 0.6 :
    stage >= 3 && stage <= 5 ? 1.0 :
    stage === 6 ? 0 : 1.0;

  // Animation variants
  const finalState = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    height: "auto" as const,
    width: 420,
  };

  const cardVariants = {
    stage1: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 0.7,
      scaleX: 1,
      scaleY: 1,
      height: 56,
      width: 56,
    },
    stage2: isReduced ? { ...finalState } : {
      ...finalState,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 22,
        height: { duration: 0.4, ease: "easeOut" },
        width: { duration: 0.4, ease: "easeOut" },
      },
    },
    stage3: { ...finalState },
    stage4: { ...finalState },
    stage5: { ...finalState },
    stage6: isReduced
      ? { opacity: 0, scaleX: 0.6, scaleY: 0.95 }
      : {
          opacity: 0,
          scaleX: 0,
          scaleY: 0.85,
          y: 0,
          transition: {
            duration: 0.5,
            ease: "easeInOut" as const,
            scaleX: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
            scaleY: { duration: 0.4, ease: "easeOut" as const },
            opacity: { duration: 0.35, delay: 0.08 },
          },
        },
  };

  // Determine which stage variant to show
  const currentVariant =
    stage === 1 ? "stage1" :
    stage === 2 ? "stage2" :
    stage === 3 ? "stage3" :
    stage === 4 ? "stage4" :
    stage === 5 ? "stage5" :
    "stage6";

  return (
    <motion.div
      layout
      variants={cardVariants}
      animate={currentVariant}
      initial={{ opacity: 0, x: 60, scaleX: 0.3, scaleY: 0.85 }}
      className="pointer-events-auto mx-auto mt-3 px-4"
      style={{ maxWidth: stage === 1 ? 56 : 420, zIndex: 210 }}
      role="alert"
      aria-live="polite"
      aria-label={
        stage >= 3
          ? `${t(notification.systemKey || "ais.label")}: ${t(notification.titleKey)}${descText ? `. ${descText}` : ""}`
          : t("ais.label")
      }
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative overflow-hidden rounded-xl border ${config.borderColor} bg-gradient-to-r ${config.gradient} backdrop-blur-md`}
        style={{
          boxShadow:
            glowIntensity > 0
              ? `0 0 ${20 * glowIntensity}px ${glowColor}, 0 0 ${50 * glowIntensity}px ${glowColor.replace(/[\d.]+\)$/, `${0.12 * glowIntensity})`)}, inset 0 1px 0 0 rgba(255,255,255,0.05)`
              : "none",
          transition: "box-shadow 0.5s ease",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${glowColor.replace(/[\d.]+\)$/, `${0.7 * glowIntensity})`)}, transparent)`,
            opacity: glowIntensity,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Scan line effect (brand identity) */}
        {stage >= 2 && stage <= 5 && !isReduced && (
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${config.accentColor}40, transparent)`,
            }}
            animate={{ top: ["0%", "100%"] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        <div className="p-4">
          {/* Stage 1: Only symbol */}
          {stage === 1 && !isReduced && (
            <div className="flex items-center justify-center w-8 h-8">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="w-6 h-6" style={{ color: config.accentColor }} />
              </motion.div>
            </div>
          )}

          {/* Stages 2+: Full card content */}
          {stage >= 2 && (
            <>
              {/* Header row */}
              <div className="flex items-center gap-2.5 mb-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="shrink-0"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: `${config.accentColor}18`,
                      border: `1px solid ${config.accentColor}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.accentColor }} />
                  </div>
                </motion.div>

                {/* System label */}
                <span
                  className="text-[10px] font-bold tracking-[0.18em] uppercase"
                  style={{ color: `${config.accentColor}aa` }}
                >
                  {notification.systemKey ? t(notification.systemKey) : "AIS"}
                </span>

                {/* Priority indicator */}
                {notification.priority === "critical" && (
                  <span className="text-[9px] font-bold tracking-wider uppercase text-red animate-pulse">
                    CRITICAL
                  </span>
                )}
                {notification.priority === "high" && (
                  <span className="text-[9px] font-medium tracking-wider uppercase text-amber">
                    HIGH
                  </span>
                )}

                <div className="flex-1" />

                {/* Dismiss button */}
                <button
                  onClick={handleDismiss}
                  className="text-foreground/30 hover:text-foreground/70 transition-colors p-0.5"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stage 3+: Title */}
              {stage >= 3 && (
                <motion.div
                  initial={isReduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {t(notification.titleKey)}
                  </div>
                </motion.div>
              )}

              {/* Stage 4+: Description with typewriter */}
              {stage >= 4 && descText && (
                <motion.div
                  initial={isReduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs text-foreground/60 leading-relaxed min-h-[1.25rem]">
                    {typedText}
                    {!typingDone && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        className="inline-block w-1.5 h-3 ml-0.5 align-text-bottom rounded-sm"
                        style={{ background: config.accentColor }}
                      />
                    )}
                  </p>
                </motion.div>
              )}

              {/* Stage 5+: Action button */}
              {stage >= 5 && notification.actions && notification.actions.length > 0 && (
                <motion.div
                  initial={isReduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                  className="mt-3"
                >
                  <button
                    onClick={handleAction}
                    className="group inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg transition-all duration-200"
                    style={{
                      background: `${config.accentColor}15`,
                      border: `1px solid ${config.accentColor}30`,
                      color: config.accentColor,
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = `${config.accentColor}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = `${config.accentColor}15`;
                    }}
                  >
                    {t(notification.actions[0].labelKey)}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Progress bar (auto-dismiss timer) */}
        {stage >= 5 && (() => {
          const dur = notification.duration ?? config.defaultDuration;
          if (dur <= 0) return null;
          return (
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] rounded-full"
              style={{ backgroundColor: config.accentColor }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: dur / 1000, ease: "linear" }}
            />
          );
        })()}
      </div>
    </motion.div>
  );
}

/* ─── Provider with Queue ──────────────────────────────────────────── */

export function AISSystemEventProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [activeNotification, setActiveNotification] = useState<AISSystemNotification | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Queue of pending notifications
  const queueRef = useRef<AISSystemNotification[]>([]);
  const processingRef = useRef(false);

  // Adaptive timing state
  const [dismissHistory, setDismissHistory] = useState<{
    fastDismissals: number;
    slowDismissals: number;
    neverDismissed: number;
    avgReadTimeMs: number;
  }>({
    fastDismissals: 0,
    slowDismissals: 0,
    neverDismissed: 0,
    avgReadTimeMs: 0,
  });
  const appearTimeRef = useRef<number>(0);

  // AIS settings from memory — reactive via custom event + storage event
  const [settings, setSettings] = useState({
    autoAssistant: true,
    typingEnabled: true,
    animationIntensity: "full" as "full" | "reduced" | "minimal",
    dismissSpeed: "normal" as "fast" | "normal" | "slow",
    activityLevel: "normal" as "proactive" | "normal" | "minimal",
    soundEnabled: true,
  });

  // Helper: read current settings from AdaptiveMemoryEngine
  const readSettingsFromEngine = useCallback(() => {
    try {
      const mem = getAISMemory().getMemory();
      const ais = mem.aisSettings;
      setSettings({
        autoAssistant: mem.preferences.autoAssistant,
        typingEnabled: ais.typingEnabled,
        animationIntensity: ais.animationIntensity,
        dismissSpeed: ais.dismissSpeed,
        activityLevel: ais.activityLevel,
        soundEnabled: mem.soundEnabled,
      });
    } catch {
      // Use defaults
    }
  }, []);

  // Load settings on mount + listen for changes
  useEffect(() => {
    readSettingsFromEngine();

    // Listen for cross-tab changes via native storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sip_ais_memory") readSettingsFromEngine();
    };
    window.addEventListener("storage", onStorage);

    // Listen for same-tab changes via custom event (settings page dispatches this)
    const onAISChange = () => readSettingsFromEngine();
    window.addEventListener("ais-settings-changed", onAISChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ais-settings-changed", onAISChange);
    };
  }, [readSettingsFromEngine]);

  // Spam protection: track shown notification keys
  const shownKeysRef = useRef<Map<string, number>>(new Map());

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;

    processingRef.current = true;

    // Sort by priority (critical first)
    queueRef.current.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    // If there's a critical and current is info, interrupt
    const next = queueRef.current.shift()!;
    appearTimeRef.current = Date.now();
    setActiveNotification(next);
    setIsExiting(false);

    // Play sound
    if (settings.soundEnabled) {
      const config = EVENT_CONFIG[next.type];
      const sound = next.sound || config.defaultSound;
      getSoundIdentity().play(sound);
    }
  }, [settings.soundEnabled]);

  const addNotification = useCallback(
    (notification: Omit<AISSystemNotification, "id" | "addedAt">) => {
      // Check autoAssistant
      if (!settings.autoAssistant) return;

      // Spam protection: no duplicate same titleKey within 10 seconds
      const now = Date.now();
      const lastShown = shownKeysRef.current.get(notification.titleKey);
      if (lastShown && now - lastShown < 10000) return;

      shownKeysRef.current.set(notification.titleKey, now);
      // Cleanup old entries
      for (const [key, time] of shownKeysRef.current) {
        if (now - time > 60000) shownKeysRef.current.delete(key);
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const n: AISSystemNotification = {
        ...notification,
        id,
        addedAt: Date.now(),
      };

      // Priority override: critical can interrupt
      if (n.priority === "critical" && activeNotification && activeNotification.priority !== "critical") {
        // Interrupt current notification
        setIsExiting(true);
        setTimeout(() => {
          setActiveNotification(null);
          processingRef.current = false;
          // Add current back to queue
          queueRef.current.unshift(activeNotification);
          // Then add the critical one to front
          queueRef.current.unshift(n);
          processQueue();
        }, 200);
        return;
      }

      queueRef.current.push(n);

      if (!processingRef.current) {
        processQueue();
      }
    },
    [settings.autoAssistant, activeNotification, processQueue]
  );

  const removeNotification = useCallback(
    (id: string) => {
      if (!activeNotification || activeNotification.id !== id) return;

      // Track dismiss behavior for adaptive timing
      const readTime = Date.now() - appearTimeRef.current;
      setDismissHistory((prev) => {
        const newAvg =
          prev.avgReadTimeMs === 0
            ? readTime
            : Math.round((prev.avgReadTimeMs + readTime) / 2);

        if (readTime < 2000) {
          return { ...prev, fastDismissals: prev.fastDismissals + 1, avgReadTimeMs: newAvg };
        } else if (readTime > 8000) {
          return { ...prev, slowDismissals: prev.slowDismissals + 1, avgReadTimeMs: newAvg };
        }
        return { ...prev, avgReadTimeMs: newAvg };
      });

      // Save to memory for persistence
      try {
        const raw = localStorage.getItem("sip_ais_adaptive");
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          "sip_ais_adaptive",
          JSON.stringify({
            ...existing,
            fastDismissals: (existing.fastDismissals || 0) + (readTime < 2000 ? 1 : 0),
            slowDismissals: (existing.slowDismissals || 0) + (readTime > 8000 ? 1 : 0),
            avgReadTimeMs: readTime,
          })
        );
      } catch {
        // Non-critical
      }

      setIsExiting(true);
      setTimeout(() => {
        setActiveNotification(null);
        processingRef.current = false;
        processQueue();
      }, 500);
    },
    [activeNotification, processQueue]
  );

  const onAction = useCallback(
    (id: string) => {
      // Count as engagement
      try {
        const raw = localStorage.getItem("sip_ais_memory");
        if (raw) {
          const mem = JSON.parse(raw);
          mem.tipsEngaged = (mem.tipsEngaged || 0) + 1;
          localStorage.setItem("sip_ais_memory", JSON.stringify(mem));
        }
      } catch {
        // Non-critical
      }

      removeNotification(id);
    },
    [removeNotification]
  );

  const clearAll = useCallback(() => {
    queueRef.current = [];
    if (activeNotification) {
      setIsExiting(true);
      setTimeout(() => {
        setActiveNotification(null);
        processingRef.current = false;
      }, 300);
    }
  }, [activeNotification]);

  return (
    <AISSystemEventContext.Provider
      value={{ addNotification, removeNotification, clearAll }}
    >
      {children}

      {/* Cinematic notification — top center, one at a time */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          {activeNotification && !isExiting && (
            <CinematicNotification
              key={activeNotification.id}
              notification={activeNotification}
              onDismiss={removeNotification}
              onAction={onAction}
              animationIntensity={settings.animationIntensity}
              typingEnabled={settings.typingEnabled}
              dismissSpeed={settings.dismissSpeed}
            />
          )}
        </AnimatePresence>
      </div>
    </AISSystemEventContext.Provider>
  );
}

/* ─── Consumer hook ──────────────────────────────────────────────────── */

export function useAISSystemEvent() {
  return useContext(AISSystemEventContext);
}

/* ─── Re-export for backward compatibility ──────────────────────────── */

export { useAISSystemEvent as useSoloNotification };
export type { AISSystemNotification as SoloNotification };
