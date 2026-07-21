/**
 * AIS — Cinematic Notification System v2 (INT-040)
 *
 * Variant B: Scan-Materialize — единственный стиль уведомлений AIS.
 *
 * Это не toast. Не snackbar. Не popup.
 * Это собственная операционная система взаимодействия с платформой.
 *
 * Анимация появления (350-450ms):
 *   Stage 1: Световая линия (scan line сверху вниз)
 *   Stage 2: Рамка (clip-path раскрывается)
 *   Stage 3: Заголовок "AIS / Adaptive Intelligence System"
 *   Stage 4: Основной текст (typewriter)
 *   Stage 5: Действие (кнопка)
 *   Stage 6: Исчезновение (схлопывание к центру)
 *
 * Поддерживает: очередь, приоритеты, адаптивное время,
 * Do-Not-Disturb, Reduced Motion, клавиатуру, screen reader.
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

/* ─── Priority Levels (INT-040 v2) ─────────────────────── */

export type AISPriority = "critical" | "high" | "normal" | "info";

export type AISEventType =
  | "system"
  | "achievement"
  | "success"
  | "info"
  | "warning"
  | "ai_tip";

/* ─── Notification Interface ────────────────────────────── */

export interface AISSystemNotification {
  id: string;
  type: AISEventType;
  priority: AISPriority;
  /** i18n key for system label (default: "ais.label") */
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

/* ─── Context ───────────────────────────────────────────── */

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

/* ─── Visual Config per Event Type ──────────────────────── */

const EVENT_CONFIG: Record<
  AISEventType,
  {
    icon: React.ElementType;
    gradient: string;
    glowColor: string;
    borderColor: string;
    accentColor: string;
    scanLineColor: string;
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
    scanLineColor: "rgba(139, 92, 246, 0.8)",
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
    scanLineColor: "rgba(16, 185, 129, 0.8)",
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
    scanLineColor: "rgba(59, 130, 246, 0.8)",
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
    scanLineColor: "rgba(6, 182, 212, 0.8)",
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
    scanLineColor: "rgba(245, 158, 11, 0.8)",
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
    scanLineColor: "rgba(168, 85, 247, 0.8)",
    accentColor: "#a855f7",
    defaultSound: "recommendation",
    defaultDuration: 9000,
    defaultPriority: "normal",
  },
};

/* ─── Priority order for queue ──────────────────────────── */

const PRIORITY_ORDER: Record<AISPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  info: 3,
};

/* ─── Do-Not-Disturb Detection ──────────────────────────── */

function isUserTyping(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((active as HTMLElement).isContentEditable) return true;
  // Check for contenteditable parent
  if (active.closest("[contenteditable='true']")) return true;
  return false;
}

/* ─── Typewriter Hook ───────────────────────────────────── */

function useTypewriter(text: string, speed = 25, enabled = true) {
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

/* ─── Cinematic Notification (Variant B: Scan-Materialize) ─ */

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
  const scanLineColor = config.scanLineColor;

  // Animation stage management
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Typewriter for description
  const descText = notification.descKey ? t(notification.descKey) : "";
  const { displayed: typedText, isDone: typingDone } = useTypewriter(
    descText,
    22,
    typingEnabled && animationIntensity !== "minimal"
  );

  // Track read time for adaptive timing
  const [isHovered, setIsHovered] = useState(false);

  // Reduced motion override
  const isReduced = prefersReducedMotion || animationIntensity === "minimal";
  const isReducedPartial = isReduced || animationIntensity === "reduced";

  // Stage progression — total ~400ms for stages 1-5
  useEffect(() => {
    if (isReduced) {
      setStage(5);
      return;
    }

    stageTimerRef.current.forEach(clearTimeout);
    stageTimerRef.current = [];

    const addTimer = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      stageTimerRef.current.push(id);
    };

    // Stage 1→2: Scan line → card reveals (~80ms)
    addTimer(() => setStage(2), 80);

    // Stage 2→3: Card expands → header appears (~200ms)
    addTimer(() => setStage(3), 200);

    // Stage 3→4: Header → text starts typing (~300ms)
    addTimer(() => setStage(4), 300);

    // Stage 4→5: After typewriter finishes → action button
    const typingDuration = Math.min(descText.length * 22 + 100, 2000);
    addTimer(() => setStage(5), 300 + typingDuration);

    return () => {
      stageTimerRef.current.forEach(clearTimeout);
    };
  }, [isReduced, descText.length]);

  // Auto-dismiss timer (paused on hover, affected by dismissSpeed)
  useEffect(() => {
    if (notification.duration === 0) return;
    if (stage < 5) return;

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

    if (!isHovered) {
      startTimer();
    }

    return () => {
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isHovered, notification.duration, notification.id, dismissSpeed]);

  const handleDismiss = useCallback(() => {
    setStage(6);
    // Play shutdown sound at dismiss
    getSoundIdentity().play("shutdown");
    setTimeout(() => onDismiss(notification.id), 500);
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
    stage === 1 ? 0.3 :
    stage === 2 ? 0.6 :
    stage >= 3 && stage <= 5 ? 1.0 :
    stage === 6 ? 0 : 1.0;

  // Priority badge config
  const priorityBadge: Record<AISPriority, { label: string; className: string }> = {
    critical: { label: "CRITICAL", className: "text-red-400 bg-red-500/15 border-red-500/30" },
    high: { label: "IMPORTANT", className: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    normal: { label: "TIP", className: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
    info: { label: "INFO", className: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  };

  return (
    <motion.div
      layout
      className="pointer-events-auto mx-auto mt-3 px-4"
      style={{ maxWidth: 460, zIndex: 210 }}
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
      {/* ─── Variant B: Scan-Materialize ─── */}
      <motion.div
        className="relative overflow-hidden"
        initial={{
          opacity: 0,
          clipPath: "inset(0 0 100% 0)",
        }}
        animate={
          stage === 6
            ? {
                opacity: 0,
                clipPath: "inset(50% 0 50% 0)",
                scaleY: 0,
                transition: {
                  duration: 0.45,
                  ease: [0.4, 0, 0.2, 1],
                },
              }
            : stage === 1
            ? {
                opacity: 1,
                clipPath: "inset(0 0 85% 0)",
                transition: { duration: 0.08 },
              }
            : {
                opacity: 1,
                clipPath: "inset(0 0 0% 0)",
                scaleY: stage === 2 ? 1.01 : 1,
                transition: {
                  clipPath: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                  scaleY: { duration: 0.2, ease: "easeOut" },
                },
              }
        }
      >
        <div
          className={`rounded-xl border ${config.borderColor} bg-gradient-to-r ${config.gradient} backdrop-blur-md`}
          style={{
            boxShadow:
              glowIntensity > 0
                ? `0 0 ${20 * glowIntensity}px ${glowColor}, 0 0 ${50 * glowIntensity}px ${glowColor.replace(/[\d.]+\)$/, `${0.12 * glowIntensity})`)}, inset 0 1px 0 0 rgba(255,255,255,0.05)`
                : "none",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {/* ─── BLOCK 3: Scan Line Effect ─── */}
          {stage >= 1 && stage <= 3 && !isReduced && (
            <motion.div
              className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
              style={{
                background: `linear-gradient(90deg, transparent, ${scanLineColor}, ${scanLineColor}80, transparent)`,
                boxShadow: `0 0 12px ${scanLineColor}60, 0 0 24px ${scanLineColor}30`,
              }}
              initial={{ top: "0%", opacity: 1 }}
              animate={{ top: "100%", opacity: [1, 1, 0.4] }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          )}

          {/* ─── Top Glow Line ─── */}
          <div
            className="absolute top-0 left-0 right-0 h-px z-10"
            style={{
              background: `linear-gradient(90deg, transparent, ${glowColor.replace(/[\d.]+\)$/, `${0.7 * glowIntensity})`)}, transparent)`,
              opacity: glowIntensity,
              transition: "opacity 0.4s ease",
            }}
          />

          {/* ─── Ambient Scan Line (brand identity) ─── */}
          {stage >= 3 && stage <= 5 && !isReduced && (
            <motion.div
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${config.accentColor}30, transparent)`,
              }}
              animate={{ top: ["0%", "100%"] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}

          <div className="p-5">
            {/* ─── Header Row ─── */}
            <div className="flex items-center gap-3 mb-3">
              {/* Icon with entrance animation */}
              <motion.div
                initial={isReduced ? false : { scale: 0, opacity: 0 }}
                animate={stage >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                className="shrink-0"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${config.accentColor}15`,
                    border: `1px solid ${config.accentColor}30`,
                  }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: config.accentColor }} />
                </div>
              </motion.div>

              {/* System label: "AIS" + subtitle */}
              <motion.div
                initial={isReduced ? false : { opacity: 0, x: -6 }}
                animate={stage >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex flex-col"
              >
                <span
                  className="text-[11px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: `${config.accentColor}bb` }}
                >
                  {notification.systemKey ? t(notification.systemKey) : "AIS"}
                </span>
                <span className="text-[9px] tracking-[0.12em] uppercase text-foreground/30">
                  Adaptive Intelligence System
                </span>
              </motion.div>

              {/* Priority badge */}
              {stage >= 3 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${priorityBadge[notification.priority].className}`}
                >
                  {priorityBadge[notification.priority].label}
                </motion.span>
              )}

              <div className="flex-1" />

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="text-foreground/25 hover:text-foreground/60 transition-colors p-1 rounded-md hover:bg-white/5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ─── Stage 3+: Title (larger, more readable) ─── */}
            {stage >= 3 && (
              <motion.div
                initial={isReduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
                  {t(notification.titleKey)}
                </div>
              </motion.div>
            )}

            {/* ─── Stage 4+: Description with typewriter (larger) ─── */}
            {stage >= 4 && descText && (
              <motion.div
                initial={isReduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[13px] text-foreground/60 leading-relaxed min-h-[1.4rem]">
                  {typedText}
                  {!typingDone && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.45, repeat: Infinity, repeatType: "reverse" }}
                      className="inline-block w-1.5 h-3.5 ml-0.5 align-text-bottom rounded-sm"
                      style={{ background: config.accentColor }}
                    />
                  )}
                </p>
              </motion.div>
            )}

            {/* ─── Stage 5+: Action button ─── */}
            {stage >= 5 && notification.actions && notification.actions.length > 0 && (
              <motion.div
                initial={isReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
                className="mt-4"
              >
                <button
                  onClick={handleAction}
                  className="group inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
                  style={{
                    background: `${config.accentColor}12`,
                    border: `1px solid ${config.accentColor}28`,
                    color: config.accentColor,
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = `${config.accentColor}22`;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = `${config.accentColor}12`;
                  }}
                >
                  {t(notification.actions[0].labelKey)}
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Provider with Queue ───────────────────────────────── */

export function AISSystemEventProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [activeNotification, setActiveNotification] = useState<AISSystemNotification | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Queue of pending notifications
  const queueRef = useRef<AISSystemNotification[]>([]);
  const processingRef = useRef(false);

  // Adaptive timing state
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

  // DND: user is typing/editing — defer notification
  const dndRef = useRef(false);
  const pendingDNDRef = useRef<AISSystemNotification | null>(null);
  const dndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect typing (BLOCK 11)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onFocusIn = () => {
      dndRef.current = isUserTyping();
    };
    const onFocusOut = () => {
      dndRef.current = false;
      // If there's a deferred notification, show it after short delay
      if (pendingDNDRef.current) {
        const pending = pendingDNDRef.current;
        pendingDNDRef.current = null;
        dndTimerRef.current = setTimeout(() => {
          showNotification(pending);
        }, 800);
      }
    };
    const onInput = () => {
      dndRef.current = true;
      // Reset DND timer on each input
      if (dndTimerRef.current) clearTimeout(dndTimerRef.current);
    };

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    window.addEventListener("input", onInput);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("input", onInput);
      if (dndTimerRef.current) clearTimeout(dndTimerRef.current);
    };
  }, []);

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

    const sync = () => {
      readSettingsFromEngine();
      try {
        const mem = getAISMemory().getMemory();
        getSoundIdentity().setEnabled(mem.soundEnabled);
      } catch { /* ignore */ }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sip_ais_memory") sync();
    };
    window.addEventListener("storage", onStorage);

    const onAISChange = () => sync();
    window.addEventListener("ais-settings-changed", onAISChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ais-settings-changed", onAISChange);
    };
  }, [readSettingsFromEngine]);

  // Spam protection (BLOCK 8): track shown notification keys
  const shownKeysRef = useRef<Map<string, number>>(new Map());

  // Actually display a notification
  const showNotification = useCallback((n: AISSystemNotification) => {
    appearTimeRef.current = Date.now();
    setActiveNotification(n);
    setIsExiting(false);
    processingRef.current = true;

    // Play branded sound (BLOCK 4-5)
    if (settings.soundEnabled) {
      const config = EVENT_CONFIG[n.type];
      const sound = n.sound || config.defaultSound;
      getSoundIdentity().play(sound);
    }
  }, [settings.soundEnabled]);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;

    // Sort by priority (critical first)
    queueRef.current.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    const next = queueRef.current.shift()!;

    // BLOCK 11: Do-Not-Disturb — if user is typing, defer
    if (dndRef.current && next.priority !== "critical") {
      pendingDNDRef.current = next;
      return;
    }

    showNotification(next);
  }, [showNotification]);

  const addNotification = useCallback(
    (notification: Omit<AISSystemNotification, "id" | "addedAt">) => {
      // Check autoAssistant
      if (!settings.autoAssistant) return;

      // BLOCK 8: No repeat — same titleKey within 30 seconds
      const now = Date.now();
      const lastShown = shownKeysRef.current.get(notification.titleKey);
      if (lastShown && now - lastShown < 30000) return;

      shownKeysRef.current.set(notification.titleKey, now);
      // Cleanup old entries
      for (const [key, time] of shownKeysRef.current) {
        if (now - time > 120000) shownKeysRef.current.delete(key);
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const n: AISSystemNotification = {
        ...notification,
        id,
        addedAt: Date.now(),
      };

      // Priority override: critical can interrupt
      if (n.priority === "critical" && activeNotification && activeNotification.priority !== "critical") {
        setIsExiting(true);
        setTimeout(() => {
          setActiveNotification(null);
          processingRef.current = false;
          queueRef.current.unshift(activeNotification);
          queueRef.current.unshift(n);
          processQueue();
        }, 150);
        return;
      }

      queueRef.current.push(n);

      if (!processingRef.current) {
        processQueue();
      }
    },
    [settings.autoAssistant, activeNotification, processQueue]
  );

  // BLOCK 6: Adaptive duration — track dismiss behavior
  const removeNotification = useCallback(
    (id: string) => {
      if (!activeNotification || activeNotification.id !== id) return;

      // Track dismiss behavior for adaptive timing
      const readTime = Date.now() - appearTimeRef.current;
      try {
        const mem = getAISMemory();
        // If dismissed quickly, increase dismiss count → shorter durations
        if (readTime < 2000) {
          mem.recordTipDismissed();
        } else if (readTime > 5000) {
          mem.recordTipEngaged();
        }
      } catch {
        // Non-critical
      }

      setIsExiting(true);
      setTimeout(() => {
        setActiveNotification(null);
        processingRef.current = false;
        processQueue();
      }, 450);
    },
    [activeNotification, processQueue]
  );

  const onAction = useCallback(
    (id: string) => {
      // Count as engagement
      try {
        getAISMemory().recordTipEngaged();
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

/* ─── Consumer hook ─────────────────────────────────────── */

export function useAISSystemEvent() {
  return useContext(AISSystemEventContext);
}

/* ─── Re-export for backward compatibility ──────────────── */

export { useAISSystemEvent as useSoloNotification };
export type { AISSystemNotification as SoloNotification };
