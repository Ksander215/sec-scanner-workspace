/**
 * AIS — Event-Driven Notification System (INT-039 BLOCK 4-6)
 *
 * Every AIS notification must be tied to a real event.
 * No messages "just because". Zero fake notifications.
 *
 * Events are emitted by user actions, page transitions,
 * and system state changes. AIS listens and shows contextual
 * notifications with Solo Leveling style.
 */

/* ─── Event Types ──────────────────────────────────────────────────── */

export type AISEventType =
  // Page navigation
  | "page_enter"
  // User actions
  | "scan_started"
  | "scan_completed"
  | "integration_connected"
  | "integration_disconnected"
  | "integration_tested"
  | "tool_installed"
  | "tool_uninstalled"
  | "report_generated"
  | "report_downloaded"
  | "repo_connected"
  | "repo_disconnected"
  | "ssh_connected"
  | "ssh_disconnected"
  | "api_key_created"
  | "api_key_revoked"
  | "notification_rule_created"
  | "notification_rule_deleted"
  | "finding_reviewed"
  | "recommendation_followed"
  | "project_created"
  | "project_deleted"
  // System events
  | "risk_changed"
  | "attack_path_built"
  | "goal_progress"
  | "achievement_unlocked"
  | "first_visit"
  | "error_occurred"
  | "session_started";

export interface AISEvent {
  type: AISEventType;
  /** Route where the event occurred */
  route?: string;
  /** Timestamp */
  timestamp: number;
  /** Additional data */
  meta?: Record<string, unknown>;
}

/* ─── Notification mapping ─────────────────────────────────────────── */

export interface AISNotificationDef {
  /** SoloNotification type */
  notificationType: "system" | "achievement" | "success" | "info" | "warning" | "ai_tip";
  /** i18n key for the system label */
  systemKey: string;
  /** i18n key for title */
  titleKey: string;
  /** i18n key for description */
  descKey: string;
  /** Action button */
  actionLabelKey?: string;
  actionHref?: string;
  /** Duration: 0 = manual dismiss only, -1 = adaptive */
  duration: number;
  /** Glow color */
  glowColor?: string;
}

const EVENT_NOTIFICATIONS: Partial<Record<AISEventType, AISNotificationDef>> = {
  page_enter: {
    notificationType: "ai_tip",
    systemKey: "ais.label",
    titleKey: "ais.event.pageEnter.title",
    descKey: "ais.event.pageEnter.desc",
    duration: -1, // adaptive
    glowColor: "rgba(139, 92, 246, 0.3)",
  },
  first_visit: {
    notificationType: "system",
    systemKey: "ais.label",
    titleKey: "ais.event.firstVisit.title",
    descKey: "ais.event.firstVisit.desc",
    duration: -1,
  },
  scan_started: {
    notificationType: "system",
    systemKey: "ais.label",
    titleKey: "ais.event.scanStarted.title",
    descKey: "ais.event.scanStarted.desc",
    actionLabelKey: "ais.event.viewProgress",
    actionHref: "/app/scanner",
    duration: 5000,
    glowColor: "rgba(59, 130, 246, 0.3)",
  },
  scan_completed: {
    notificationType: "achievement",
    systemKey: "ais.label",
    titleKey: "ais.event.scanCompleted.title",
    descKey: "ais.event.scanCompleted.desc",
    actionLabelKey: "ais.event.viewFindings",
    actionHref: "/app/findings",
    duration: 8000,
  },
  integration_connected: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.integrationConnected.title",
    descKey: "ais.event.integrationConnected.desc",
    duration: 6000,
  },
  integration_disconnected: {
    notificationType: "warning",
    systemKey: "ais.label",
    titleKey: "ais.event.integrationDisconnected.title",
    descKey: "ais.event.integrationDisconnected.desc",
    duration: 6000,
    glowColor: "rgba(245, 158, 11, 0.3)",
  },
  tool_installed: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.toolInstalled.title",
    descKey: "ais.event.toolInstalled.desc",
    actionLabelKey: "ais.event.openScanner",
    actionHref: "/app/scanner",
    duration: 6000,
  },
  report_generated: {
    notificationType: "achievement",
    systemKey: "ais.label",
    titleKey: "ais.event.reportGenerated.title",
    descKey: "ais.event.reportGenerated.desc",
    actionLabelKey: "ais.event.viewReport",
    actionHref: "/app/reports",
    duration: 7000,
  },
  repo_connected: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.repoConnected.title",
    descKey: "ais.event.repoConnected.desc",
    duration: 6000,
  },
  ssh_connected: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.sshConnected.title",
    descKey: "ais.event.sshConnected.desc",
    duration: 6000,
  },
  api_key_created: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.apiKeyCreated.title",
    descKey: "ais.event.apiKeyCreated.desc",
    duration: 6000,
  },
  api_key_revoked: {
    notificationType: "warning",
    systemKey: "ais.label",
    titleKey: "ais.event.apiKeyRevoked.title",
    descKey: "ais.event.apiKeyRevoked.desc",
    duration: 6000,
  },
  notification_rule_created: {
    notificationType: "success",
    systemKey: "ais.label",
    titleKey: "ais.event.notificationRuleCreated.title",
    descKey: "ais.event.notificationRuleCreated.desc",
    duration: 6000,
  },
  goal_progress: {
    notificationType: "achievement",
    systemKey: "ais.label",
    titleKey: "ais.event.goalProgress.title",
    descKey: "ais.event.goalProgress.desc",
    duration: 7000,
  },
  achievement_unlocked: {
    notificationType: "achievement",
    systemKey: "ais.label",
    titleKey: "ais.event.achievementUnlocked.title",
    descKey: "ais.event.achievementUnlocked.desc",
    duration: 0, // manual dismiss only
  },
  error_occurred: {
    notificationType: "warning",
    systemKey: "ais.label",
    titleKey: "ais.event.errorOccurred.title",
    descKey: "ais.event.errorOccurred.desc",
    duration: 0, // manual dismiss only
    glowColor: "rgba(239, 68, 68, 0.3)",
  },
};

/* ─── Page-specific contextual messages ─────────────────────────────── */

export interface PageContext {
  titleKey: string;
  descKey: string;
  actionLabelKey?: string;
  actionHref?: string;
}

const PAGE_CONTEXTS: Record<string, PageContext> = {
  "/app/dashboard": {
    titleKey: "ais.page.dashboard.title",
    descKey: "ais.page.dashboard.desc",
    actionLabelKey: "ais.page.dashboard.action",
    actionHref: "/app/scanner",
  },
  "/app/scanner": {
    titleKey: "ais.page.scanner.title",
    descKey: "ais.page.scanner.desc",
    actionLabelKey: "ais.page.scanner.action",
    actionHref: "/app/scanner",
  },
  "/app/findings": {
    titleKey: "ais.page.findings.title",
    descKey: "ais.page.findings.desc",
  },
  "/app/risks": {
    titleKey: "ais.page.risks.title",
    descKey: "ais.page.risks.desc",
  },
  "/app/reports": {
    titleKey: "ais.page.reports.title",
    descKey: "ais.page.reports.desc",
    actionLabelKey: "ais.page.reports.action",
    actionHref: "/app/scanner",
  },
  "/app/marketplace": {
    titleKey: "ais.page.marketplace.title",
    descKey: "ais.page.marketplace.desc",
  },
  "/app/integrations": {
    titleKey: "ais.page.integrations.title",
    descKey: "ais.page.integrations.desc",
    actionLabelKey: "ais.page.integrations.action",
    actionHref: "/app/integrations",
  },
  "/app/notifications": {
    titleKey: "ais.page.notifications.title",
    descKey: "ais.page.notifications.desc",
    actionLabelKey: "ais.page.notifications.action",
    actionHref: "/app/notifications",
  },
  "/app/projects": {
    titleKey: "ais.page.projects.title",
    descKey: "ais.page.projects.desc",
  },
  "/app/repositories": {
    titleKey: "ais.page.repositories.title",
    descKey: "ais.page.repositories.desc",
    actionLabelKey: "ais.page.repositories.action",
    actionHref: "/app/repositories",
  },
  "/app/workspace": {
    titleKey: "ais.page.workspace.title",
    descKey: "ais.page.workspace.desc",
  },
  "/app/settings": {
    titleKey: "ais.page.settings.title",
    descKey: "ais.page.settings.desc",
  },
  "/app/pricing": {
    titleKey: "ais.page.pricing.title",
    descKey: "ais.page.pricing.desc",
  },
};

/* ─── Event Bus ────────────────────────────────────────────────────── */

type EventListener = (event: AISEvent) => void;

class AISEventBus {
  private listeners: EventListener[] = [];
  private eventHistory: AISEvent[] = [];
  private maxHistory = 50;

  /** Subscribe to AIS events */
  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Emit an AIS event */
  emit(type: AISEventType, meta?: Record<string, unknown>): void {
    const event: AISEvent = {
      type,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      timestamp: Date.now(),
      meta,
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // Listener error should not crash the bus
      }
    });
  }

  /** Get recent events */
  getHistory(count = 10): AISEvent[] {
    return this.eventHistory.slice(-count);
  }

  /** Check if an event type was recently emitted (within last N seconds) */
  wasRecent(type: AISEventType, withinMs = 5000): boolean {
    const cutoff = Date.now() - withinMs;
    return this.eventHistory.some(
      (e) => e.type === type && e.timestamp > cutoff
    );
  }
}

/* ─── Singleton ──────────────────────────────────────────────────────── */

let instance: AISEventBus | null = null;

export function getAISEventBus(): AISEventBus {
  if (!instance) {
    instance = new AISEventBus();
  }
  return instance;
}

/* ─── Adaptive Timing Engine (BLOCK 5) ──────────────────────────────── */

export interface AdaptiveTiming {
  /** Calculated duration in ms */
  duration: number;
  /** Whether to auto-dismiss or keep until manual */
  autoDismiss: boolean;
}

/**
 * Calculate adaptive display time based on user behavior.
 *
 * - If user quickly dismisses notifications → shorter duration
 * - If user reads them for a long time → longer duration
 * - If user never dismisses → keep until manual dismiss
 */
export function calculateAdaptiveTiming(
  baseDuration: number,
  memory: {
    tipsDismissed: number;
    tipsEngaged: number;
    notificationsRead?: number;
    avgReadTimeMs?: number;
  }
): AdaptiveTiming {
  const { tipsDismissed, tipsEngaged, avgReadTimeMs } = memory;

  // No data yet → use base duration
  if (tipsDismissed === 0 && tipsEngaged === 0) {
    return { duration: baseDuration, autoDismiss: true };
  }

  // Engagement ratio
  const total = tipsDismissed + tipsEngaged;
  const engagementRatio = total > 0 ? tipsEngaged / total : 0.5;

  // User dismisses quickly → shorten duration
  if (engagementRatio < 0.2 && tipsDismissed >= 3) {
    const shortened = Math.max(3000, baseDuration * 0.4);
    return { duration: shortened, autoDismiss: true };
  }

  // User reads carefully → extend duration
  if (engagementRatio > 0.6 && tipsEngaged >= 3) {
    const extended = baseDuration * 1.8;
    return { duration: extended, autoDismiss: true };
  }

  // User reads for a long time → don't auto-dismiss
  if (avgReadTimeMs && avgReadTimeMs > baseDuration * 0.8) {
    return { duration: 0, autoDismiss: false };
  }

  return { duration: baseDuration, autoDismiss: true };
}

/* ─── Exported helpers ──────────────────────────────────────────────── */

/** Get the notification definition for an event type */
export function getNotificationForEvent(type: AISEventType): AISNotificationDef | undefined {
  return EVENT_NOTIFICATIONS[type];
}

/** Get the page context for a route */
export function getPageContext(route: string): PageContext | undefined {
  // Exact match first
  if (PAGE_CONTEXTS[route]) return PAGE_CONTEXTS[route];

  // Prefix match (e.g., /app/integrations/ssh matches /app/integrations)
  const keys = Object.keys(PAGE_CONTEXTS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (route.startsWith(key)) return PAGE_CONTEXTS[key];
  }

  return undefined;
}
