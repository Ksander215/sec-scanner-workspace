/**
 * AIS — BLOCK 4: SOLO LEVELING Notification System
 *
 * Custom branded notifications with glow, animation, and sound.
 * Appears at the top of the screen with a distinctive SIP style.
 */

"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { getSoundIdentity, type SoundType } from "@/lib/ais/sound";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Target,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

export type SoloNotificationType =
  | "system"      // General system message
  | "achievement" // Goal progress / milestone
  | "success"     // Action completed
  | "info"        // Contextual hint
  | "warning"     // Gentle warning
  | "ai_tip";     // AI assistant tip

export interface SoloNotification {
  id: string;
  type: SoloNotificationType;
  /** i18n key for the system label (default: "SYSTEM") */
  systemKey?: string;
  /** i18n key for the title */
  titleKey: string;
  /** i18n key for the description */
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
}

interface SoloNotificationContextValue {
  addNotification: (notification: Omit<SoloNotification, "id">) => void;
  removeNotification: (id: string) => void;
}

/* ─── Context ────────────────────────────────────────────────────────── */

const SoloNotificationContext = createContext<SoloNotificationContextValue>({
  addNotification: () => {},
  removeNotification: () => {},
});

/* ─── Notification visual config ─────────────────────────────────────── */

const NOTIFICATION_CONFIG: Record<
  SoloNotificationType,
  {
    icon: React.ElementType;
    gradient: string;
    glowColor: string;
    borderColor: string;
    defaultSound: SoundType;
    defaultDuration: number;
  }
> = {
  system: {
    icon: Zap,
    gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
    glowColor: "rgba(139, 92, 246, 0.3)",
    borderColor: "border-violet-500/20",
    defaultSound: "notification",
    defaultDuration: 6000,
  },
  achievement: {
    icon: Target,
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    glowColor: "rgba(16, 185, 129, 0.3)",
    borderColor: "border-emerald-500/20",
    defaultSound: "achievement",
    defaultDuration: 8000,
  },
  success: {
    icon: CheckCircle2,
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    glowColor: "rgba(59, 130, 246, 0.3)",
    borderColor: "border-blue-500/20",
    defaultSound: "success",
    defaultDuration: 5000,
  },
  info: {
    icon: Info,
    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    glowColor: "rgba(6, 182, 212, 0.25)",
    borderColor: "border-cyan-500/20",
    defaultSound: "tip",
    defaultDuration: 7000,
  },
  warning: {
    icon: AlertCircle,
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    glowColor: "rgba(245, 158, 11, 0.25)",
    borderColor: "border-amber-500/20",
    defaultSound: "notification",
    defaultDuration: 7000,
  },
  ai_tip: {
    icon: Sparkles,
    gradient: "from-violet-500/10 via-fuchsia-500/5 to-transparent",
    glowColor: "rgba(168, 85, 247, 0.3)",
    borderColor: "border-violet-500/25",
    defaultSound: "tip",
    defaultDuration: 8000,
  },
};

/* ─── Provider ───────────────────────────────────────────────────────── */

export function SoloNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<SoloNotification[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const addNotification = useCallback(
    (notification: Omit<SoloNotification, "id">) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const n: SoloNotification = { ...notification, id };
      setNotifications((prev) => [n, ...prev].slice(0, 5));

      // Play sound
      if (soundEnabled) {
        const sound = notification.sound ||
          NOTIFICATION_CONFIG[notification.type].defaultSound;
        getSoundIdentity().play(sound);
      }

      // Auto-dismiss
      const duration = notification.duration ??
        NOTIFICATION_CONFIG[notification.type].defaultDuration;
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== id));
        }, duration);
      }
    },
    [soundEnabled]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      getSoundIdentity().setEnabled(!prev);
      return !prev;
    });
  }, []);

  return (
    <SoloNotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}

      {/* Notification stack — top center */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => {
            const config = NOTIFICATION_CONFIG[n.type];
            const Icon = config.icon;
            const isCollapsed = collapsed[n.id];
            const glowColor = n.glowColor || config.glowColor;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -60, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="pointer-events-auto w-full max-w-lg mx-auto mt-3 px-4"
              >
                <div
                  className={`relative overflow-hidden rounded-xl border ${config.borderColor} bg-gradient-to-r ${config.gradient} backdrop-blur-md`}
                  style={{
                    boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor.replace("0.3", "0.1").replace("0.25", "0.08")}`,
                  }}
                >
                  {/* Glow line at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${glowColor.replace("0.3", "0.6").replace("0.25", "0.5")}, transparent)`,
                    }}
                  />

                  <div className="p-3.5">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-foreground/80 shrink-0" />
                      <span className="text-[10px] font-bold tracking-[0.15em] text-foreground/60 uppercase">
                        {n.systemKey || "SYSTEM"}
                      </span>
                      <div className="flex-1" />
                      {/* Sound toggle */}
                      <button
                        onClick={toggleSound}
                        className="text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        {soundEnabled ? (
                          <Volume2 className="w-3.5 h-3.5" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {/* Collapse */}
                      <button
                        onClick={() => toggleCollapse(n.id)}
                        className="text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                        />
                      </button>
                      {/* Dismiss */}
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="text-sm font-medium text-foreground">
                      {n.titleKey}
                    </div>

                    {/* Description (collapsible) */}
                    <AnimatePresence>
                      {!isCollapsed && n.descKey && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                            {n.descKey}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    {!isCollapsed && n.actions && n.actions.length > 0 && (
                      <div className="flex items-center gap-2 mt-2.5">
                        {n.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              action.onClick?.();
                              if (action.href) {
                                window.location.href = action.href;
                              }
                              removeNotification(n.id);
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground/80 transition-colors"
                          >
                            {action.labelKey}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progress bar (auto-dismiss timer) */}
                  {(() => {
                    const dur = n.duration ?? NOTIFICATION_CONFIG[n.type].defaultDuration;
                    if (dur <= 0) return null;
                    return (
                      <motion.div
                        className="absolute bottom-0 left-0 h-0.5"
                        style={{ backgroundColor: glowColor.replace("0.3", "0.5").replace("0.25", "0.4") }}
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: dur / 1000, ease: "linear" }}
                      />
                    );
                  })()}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </SoloNotificationContext.Provider>
  );
}

/* ─── Consumer hook ──────────────────────────────────────────────────── */

export function useSoloNotification() {
  return useContext(SoloNotificationContext);
}
