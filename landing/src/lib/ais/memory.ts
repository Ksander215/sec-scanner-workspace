/**
 * AIS — Adaptive Intelligence System
 * BLOCK 1: Adaptive Memory Engine
 *
 * Stores user behavior data between sessions in localStorage.
 * Tracks: page visits, last actions, favorite pages, goals, dismissals.
 */

/* ─── Types ──────────────────────────────────────────────────────────── */

export type UserRole =
  | "ceo"
  | "cto"
  | "devops"
  | "devsecops"
  | "developer"
  | "analyst"
  | "pentester"
  | "unknown";

export interface UserAction {
  type: string;       // "page_visit" | "scan" | "install" | "export" | "connect" | etc.
  target: string;     // route or tool id
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface AISGoal {
  id: string;
  titleKey: string;       // i18n key
  targetSteps: number;
  completedSteps: number;
  nextStepKey: string;    // i18n key for next step
  nextStepHref: string;
}

export interface AISMetric {
  totalActions: number;
  connectedIntegrations: number;
  scansPerformed: number;
  recommendationsFollowed: number;
  reportsGenerated: number;
  findingsReviewed: number;
  toolsInstalled: number;
}

export interface AISMemory {
  /** When the user first visited */
  firstVisit: number;
  /** Last visit timestamp */
  lastVisit: number;
  /** Total sessions */
  sessionCount: number;
  /** Page visit counts: route → count */
  pageVisits: Record<string, number>;
  /** Recent actions (last 100) */
  recentActions: UserAction[];
  /** Role scores: each role gets points */
  roleScores: Record<UserRole, number>;
  /** Detected role (cached) */
  detectedRole: UserRole | null;
  /** Tips dismissed count */
  tipsDismissed: number;
  /** Tips engaged (read/clicked) count */
  tipsEngaged: number;
  /** Adaptive detail level: 0=minimal, 1=normal, 2=detailed */
  detailLevel: 0 | 1 | 2;
  /** Active goals */
  goals: AISGoal[];
  /** Metrics for confidence engine */
  metrics: AISMetric;
  /** Sound enabled */
  soundEnabled: boolean;
  /** First time on each page: route → true */
  firstTimeOnPage: Record<string, boolean>;
  /** Pages where assistant was shown already (session-scoped) */
  assistantShownThisSession: Record<string, boolean>;
  /** Current session ID */
  currentSessionId: string;
  /** Context prediction: last prediction data */
  contextPrediction: {
    page: string;
    timeOnPage: number;
    timestamp: number;
    prompted: boolean;
  } | null;
  /** Per-page time tracking (ms) */
  pageTimeTracking: Record<string, number>;
  /** Custom preferences */
  preferences: {
    executiveMode: boolean;   // force executive mode
    engineerMode: boolean;    // force engineer mode
    autoAssistant: boolean;   // allow auto assistant
  };
  /** One-time action bonuses applied (prevents re-accumulation) */
  actionBonuses?: {
    scans?: boolean;
    integrations?: boolean;
    reports?: boolean;
  };
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const STORAGE_KEY = "sip_ais_memory";
const MAX_RECENT_ACTIONS = 100;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min = new session

/* ─── Helpers ────────────────────────────────────────────────────────── */

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createDefaultMemory(): AISMemory {
  return {
    firstVisit: Date.now(),
    lastVisit: Date.now(),
    sessionCount: 1,
    pageVisits: {},
    recentActions: [],
    roleScores: {
      ceo: 0,
      cto: 0,
      devops: 0,
      devsecops: 0,
      developer: 0,
      analyst: 0,
      pentester: 0,
      unknown: 0,
    },
    detectedRole: null,
    tipsDismissed: 0,
    tipsEngaged: 0,
    detailLevel: 1,
    goals: [],
    metrics: {
      totalActions: 0,
      connectedIntegrations: 0,
      scansPerformed: 0,
      recommendationsFollowed: 0,
      reportsGenerated: 0,
      findingsReviewed: 0,
      toolsInstalled: 0,
    },
    soundEnabled: true,
    firstTimeOnPage: {},
    assistantShownThisSession: {},
    currentSessionId: generateSessionId(),
    contextPrediction: null,
    pageTimeTracking: {},
    preferences: {
      executiveMode: false,
      engineerMode: false,
      autoAssistant: true,
    },
  };
}

/* ─── Core Engine ────────────────────────────────────────────────────── */

class AdaptiveMemoryEngine {
  private memory: AISMemory;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.memory = this.load();
    this.checkNewSession();
  }

  /* ─── Persistence ─────────────────────────────────────────────────── */

  private load(): AISMemory {
    if (typeof window === "undefined") return createDefaultMemory();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultMemory();
      const parsed = JSON.parse(raw) as AISMemory;
      // Merge with defaults to handle schema evolution
      return { ...createDefaultMemory(), ...parsed };
    } catch {
      return createDefaultMemory();
    }
  }

  private save(): void {
    if (typeof window === "undefined") return;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
      } catch {
        // localStorage full — non-critical
      }
      this.dirty = false;
    }, 300);
  }

  /* ─── Session management ──────────────────────────────────────────── */

  private checkNewSession(): void {
    const now = Date.now();
    if (now - this.memory.lastVisit > SESSION_TIMEOUT) {
      this.memory.sessionCount++;
      this.memory.currentSessionId = generateSessionId();
      this.memory.assistantShownThisSession = {};
    }
    this.memory.lastVisit = now;
    this.save();
  }

  /* ─── Public API ──────────────────────────────────────────────────── */

  /** Get full memory (read-only copy) */
  getMemory(): Readonly<AISMemory> {
    return this.memory;
  }

  /** Record a page visit */
  recordPageVisit(route: string): void {
    this.memory.pageVisits[route] = (this.memory.pageVisits[route] || 0) + 1;
    this.recordAction({ type: "page_visit", target: route });

    // Track first time
    if (this.memory.firstTimeOnPage[route] === undefined) {
      this.memory.firstTimeOnPage[route] = true;
    } else {
      this.memory.firstTimeOnPage[route] = false;
    }

    // Update role scores
    this.updateRoleScores(route);
    this.save();
  }

  /** Record a generic action */
  recordAction(action: Omit<UserAction, "timestamp">): void {
    const fullAction: UserAction = { ...action, timestamp: Date.now() };
    this.memory.recentActions.push(fullAction);
    if (this.memory.recentActions.length > MAX_RECENT_ACTIONS) {
      this.memory.recentActions = this.memory.recentActions.slice(-MAX_RECENT_ACTIONS);
    }
    this.memory.metrics.totalActions++;
    this.save();
  }

  /** Record a scan */
  recordScan(): void {
    this.memory.metrics.scansPerformed++;
    this.recordAction({ type: "scan", target: "scanner" });
  }

  /** Record an integration connected */
  recordIntegration(): void {
    this.memory.metrics.connectedIntegrations++;
    this.recordAction({ type: "connect", target: "integrations" });
  }

  /** Record a tool installed */
  recordToolInstall(toolId: string): void {
    this.memory.metrics.toolsInstalled++;
    this.recordAction({ type: "install", target: toolId });
  }

  /** Record report generated */
  recordReport(): void {
    this.memory.metrics.reportsGenerated++;
    this.recordAction({ type: "export", target: "reports" });
  }

  /** Record findings reviewed */
  recordFindingsReview(): void {
    this.memory.metrics.findingsReviewed++;
    this.recordAction({ type: "review", target: "findings" });
  }

  /** Record recommendation followed */
  recordRecommendationFollowed(): void {
    this.memory.metrics.recommendationsFollowed++;
    this.recordAction({ type: "follow", target: "recommendation" });
  }

  /** Tip dismissed */
  recordTipDismissed(): void {
    this.memory.tipsDismissed++;
    this.recalculateDetailLevel();
    this.save();
  }

  /** Tip engaged */
  recordTipEngaged(): void {
    this.memory.tipsEngaged++;
    this.recalculateDetailLevel();
    this.save();
  }

  /** Mark assistant shown for a page this session */
  markAssistantShown(route: string): void {
    this.memory.assistantShownThisSession[route] = true;
    this.save();
  }

  /** Check if assistant was shown for a page this session */
  wasAssistantShown(route: string): boolean {
    return !!this.memory.assistantShownThisSession[route];
  }

  /** Is this the first time on this page? */
  isFirstTimeOnPage(route: string): boolean {
    return this.memory.firstTimeOnPage[route] === true;
  }

  /** Get favorite pages (top N) */
  getFavoritePages(count = 5): string[] {
    return Object.entries(this.memory.pageVisits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([route]) => route);
  }

  /** Get rarely used pages */
  getRarePages(count = 5): string[] {
    return Object.entries(this.memory.pageVisits)
      .sort(([, a], [, b]) => a - b)
      .slice(0, count)
      .map(([route]) => route);
  }

  /** Get last action */
  getLastAction(): UserAction | null {
    if (this.memory.recentActions.length === 0) return null;
    return this.memory.recentActions[this.memory.recentActions.length - 1];
  }

  /** Get last action of a specific type */
  getLastActionOfType(type: string): UserAction | null {
    for (let i = this.memory.recentActions.length - 1; i >= 0; i--) {
      if (this.memory.recentActions[i].type === type) {
        return this.memory.recentActions[i];
      }
    }
    return null;
  }

  /** Update page time tracking */
  updatePageTime(route: string, additionalMs: number): void {
    this.memory.pageTimeTracking[route] =
      (this.memory.pageTimeTracking[route] || 0) + additionalMs;
    this.save();
  }

  /** Get time spent on page */
  getPageTime(route: string): number {
    return this.memory.pageTimeTracking[route] || 0;
  }

  /** Set context prediction */
  setContextPrediction(prediction: AISMemory["contextPrediction"]): void {
    this.memory.contextPrediction = prediction;
    this.save();
  }

  /** Toggle sound */
  toggleSound(enabled?: boolean): void {
    this.memory.soundEnabled = enabled ?? !this.memory.soundEnabled;
    this.save();
  }

  /** Set preference */
  setPreference<K extends keyof AISMemory["preferences"]>(
    key: K,
    value: AISMemory["preferences"][K]
  ): void {
    this.memory.preferences[key] = value;
    this.save();
  }

  /** Set goals */
  setGoals(goals: AISGoal[]): void {
    this.memory.goals = goals;
    this.save();
  }

  /** Update goal progress */
  updateGoalProgress(goalId: string, stepsCompleted: number): void {
    const goal = this.memory.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.completedSteps = Math.min(stepsCompleted, goal.targetSteps);
      this.save();
    }
  }

  /** Get detected role (computed on access) */
  getDetectedRole(): UserRole {
    // If user forced a mode, use that
    if (this.memory.preferences.executiveMode) return "ceo";
    if (this.memory.preferences.engineerMode) return "devsecops";

    // If cached and enough data, return cached
    if (this.memory.detectedRole && this.memory.metrics.totalActions > 20) {
      return this.memory.detectedRole;
    }

    // Recalculate
    const role = this.computeRole();
    this.memory.detectedRole = role;
    this.save();
    return role;
  }

  /** Force set role */
  setRole(role: UserRole): void {
    this.memory.detectedRole = role;
    this.save();
  }

  /* ─── Internal ────────────────────────────────────────────────────── */

  /** Update role scores based on page visit */
  private updateRoleScores(route: string): void {
    const ROLE_PAGE_WEIGHTS: Record<string, Partial<Record<UserRole, number>>> = {
      "/app/dashboard": { ceo: 3, cto: 2, analyst: 2 },
      "/app/reports": { ceo: 4, analyst: 3, cto: 2 },
      "/app/scanner": { pentester: 4, devsecops: 3, devops: 2 },
      "/app/findings": { devsecops: 4, pentester: 3, analyst: 2, developer: 1 },
      "/app/risks": { cto: 3, devsecops: 3, analyst: 2 },
      "/app/marketplace": { devops: 2, devsecops: 2, developer: 2 },
      "/app/integrations": { devops: 4, cto: 2, developer: 2 },
      "/app/repositories": { developer: 4, devops: 3, devsecops: 2 },
      "/app/workspace": { devops: 4, developer: 2 },
      "/app/architecture": { cto: 4, devops: 2 },
      "/app/api-keys": { developer: 4, devops: 3 },
      "/app/playground": { pentester: 4, developer: 3 },
      "/app/pricing": { ceo: 4, cto: 2 },
      "/app/settings": { devops: 2, cto: 1 },
      "/app/notifications": { devsecops: 2, devops: 2, analyst: 1 },
      "/app/projects": { devsecops: 2, pentester: 2, developer: 2 },
      "/app/cloud": { devops: 4, cto: 2 },
      "/app/docs/getting-started": { developer: 2, analyst: 2 },
      "/app/demo/attack-paths": { pentester: 4, devsecops: 3 },
      "/app/demo/knowledge-graph": { devsecops: 3, analyst: 2 },
    };

    // Also match by prefix
    for (const [pattern, weights] of Object.entries(ROLE_PAGE_WEIGHTS)) {
      if (route.startsWith(pattern) || route === pattern) {
        for (const [role, weight] of Object.entries(weights)) {
          this.memory.roleScores[role as UserRole] =
            (this.memory.roleScores[role as UserRole] || 0) + weight;
        }
        break;
      }
    }

    // Also add action-based scoring (one-time bonus, not cumulative)
    const scans = this.memory.metrics.scansPerformed;
    const integrations = this.memory.metrics.connectedIntegrations;
    const reports = this.memory.metrics.reportsGenerated;

    if (scans > 3 && !this.memory.actionBonuses?.scans) {
      this.memory.roleScores.pentester += 1;
      this.memory.roleScores.devsecops += 1;
      if (!this.memory.actionBonuses) this.memory.actionBonuses = {};
      this.memory.actionBonuses.scans = true;
    }
    if (integrations > 2 && !this.memory.actionBonuses?.integrations) {
      this.memory.roleScores.devops += 1;
      if (!this.memory.actionBonuses) this.memory.actionBonuses = {};
      this.memory.actionBonuses.integrations = true;
    }
    if (reports > 2 && !this.memory.actionBonuses?.reports) {
      this.memory.roleScores.ceo += 2;
      this.memory.roleScores.analyst += 1;
      if (!this.memory.actionBonuses) this.memory.actionBonuses = {};
      this.memory.actionBonuses.reports = true;
    }
  }

  /** Compute dominant role */
  private computeRole(): UserRole {
    const scores = this.memory.roleScores;
    const entries = Object.entries(scores).filter(([r]) => r !== "unknown") as [UserRole, number][];

    if (entries.length === 0 || entries.every(([, s]) => s === 0)) {
      return "unknown";
    }

    entries.sort(([, a], [, b]) => b - a);
    const [topRole, topScore] = entries[0];

    // Need minimum score to determine role
    if (topScore < 5) return "unknown";

    return topRole;
  }

  /** Recalculate detail level based on tip engagement */
  private recalculateDetailLevel(): void {
    const { tipsDismissed, tipsEngaged } = this.memory;

    if (tipsDismissed >= 5 && tipsEngaged < tipsDismissed * 0.3) {
      this.memory.detailLevel = 0; // Minimal — user doesn't want tips
    } else if (tipsEngaged > tipsDismissed * 2 && tipsEngaged > 5) {
      this.memory.detailLevel = 2; // Detailed — user loves tips
    } else {
      this.memory.detailLevel = 1; // Normal
    }
  }
}

/* ─── Singleton ──────────────────────────────────────────────────────── */

let instance: AdaptiveMemoryEngine | null = null;

export function getAISMemory(): AdaptiveMemoryEngine {
  if (!instance) {
    instance = new AdaptiveMemoryEngine();
  }
  return instance;
}

export { AdaptiveMemoryEngine };
