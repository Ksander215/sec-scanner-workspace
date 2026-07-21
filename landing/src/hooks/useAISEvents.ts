/**
 * AIS — Event-Driven Notification Hook (INT-039 BLOCK 4-6)
 *
 * Connects AIS Event Bus to SoloNotification system.
 * Shows contextual notifications when real events occur.
 * Implements adaptive timing based on user behavior.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSoloNotification } from "@/components/ui/SoloNotification";
import { useAIS } from "@/hooks/useAIS";
import {
  getAISEventBus,
  getPageContext,
  getNotificationForEvent,
  calculateAdaptiveTiming,
  type AISEventType,
} from "@/lib/ais/events";

/* ─── Track which pages we've shown notifications for this session ──── */

const shownForRoute = new Set<string>();
let firstVisitShown = false;

/* ─── Hook ──────────────────────────────────────────────────────────── */

export function useAISEvents() {
  const pathname = usePathname();
  const { addNotification } = useSoloNotification();
  const ais = useAIS();
  const prevPathRef = useRef<string | null>(null);

  // Show notification on first visit ever
  useEffect(() => {
    if (firstVisitShown) return;
    if (!pathname?.startsWith("/app")) return;
    if (!ais.isFirstTime) return;

    firstVisitShown = true;
    const def = getNotificationForEvent("first_visit");
    if (!def) return;

    addNotification({
      type: def.notificationType,
      systemKey: def.systemKey,
      titleKey: def.titleKey,
      descKey: def.descKey,
      actions: def.actionLabelKey
        ? [{ labelKey: def.actionLabelKey, href: def.actionHref }]
        : undefined,
      duration: def.duration,
      glowColor: def.glowColor,
    });
  }, [pathname, ais.isFirstTime, addNotification]);

  // Show page context notification on route change (only for new pages in session)
  useEffect(() => {
    if (!pathname?.startsWith("/app")) return;
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Skip if already shown for this route this session
    if (shownForRoute.has(pathname)) return;

    // Check autoAssistant preference
    if (!ais.memory.preferences.autoAssistant) return;

    // Don't spam — only show on first visit to a page
    const context = getPageContext(pathname);
    if (!context) return;

    shownForRoute.add(pathname);

    // Adaptive timing
    const baseDuration = 7000;
    const timing = calculateAdaptiveTiming(baseDuration, {
      tipsDismissed: ais.memory.tipsDismissed,
      tipsEngaged: ais.memory.tipsEngaged,
    });

    addNotification({
      type: "ai_tip",
      systemKey: "ais.label",
      titleKey: context.titleKey,
      descKey: context.descKey,
      actions: context.actionLabelKey
        ? [{ labelKey: context.actionLabelKey, href: context.actionHref }]
        : undefined,
      duration: timing.autoDismiss ? timing.duration : 0,
      glowColor: "rgba(139, 92, 246, 0.25)",
    });
  }, [pathname, ais.memory.preferences.autoAssistant, ais.memory.tipsDismissed, ais.memory.tipsEngaged, addNotification]);

  // Subscribe to event bus for action-driven notifications
  useEffect(() => {
    const bus = getAISEventBus();

    const unsubscribe = bus.subscribe((event) => {
      const def = getNotificationForEvent(event.type);
      if (!def) return;

      // Don't show if autoAssistant is off
      if (!ais.memory.preferences.autoAssistant) return;

      // Adaptive timing
      const timing = calculateAdaptiveTiming(def.duration === -1 ? 7000 : def.duration, {
        tipsDismissed: ais.memory.tipsDismissed,
        tipsEngaged: ais.memory.tipsEngaged,
      });

      const finalDuration = def.duration === -1
        ? (timing.autoDismiss ? timing.duration : 0)
        : def.duration;

      addNotification({
        type: def.notificationType,
        systemKey: def.systemKey,
        titleKey: def.titleKey,
        descKey: def.descKey,
        actions: def.actionLabelKey
          ? [{ labelKey: def.actionLabelKey, href: def.actionHref }]
          : undefined,
        duration: finalDuration,
        glowColor: def.glowColor,
      });
    });

    return unsubscribe;
  }, [ais.memory.preferences.autoAssistant, ais.memory.tipsDismissed, ais.memory.tipsEngaged, addNotification]);
}

/* ─── Helper to emit AIS events from any component ──────────────────── */

export function emitAISEvent(type: AISEventType, meta?: Record<string, unknown>) {
  getAISEventBus().emit(type, meta);
}
