/**
 * AIS — Adaptive Intelligence System
 * Main React Hook
 *
 * Integrates all AIS subsystems and provides reactive state
 * for components to consume.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  getAISMemory,
  type AISMemory,
  type UserRole,
  type AISGoal,
} from "@/lib/ais/memory";
import { getSoundIdentity, type SoundType } from "@/lib/ais/sound";
import { computeConfidence, type ConfidenceResult } from "@/lib/ais/confidence";
import { predictContext, type ContextPrediction } from "@/lib/ais/context-predictor";

/* ─── Hook return type ───────────────────────────────────────────────── */

export interface AISState {
  /** Current detected user role */
  role: UserRole;
  /** Whether this is an executive-style user */
  isExecutive: boolean;
  /** Whether this is an engineer-style user */
  isEngineer: boolean;
  /** Detail level: 0=minimal, 1=normal, 2=detailed */
  detailLevel: 0 | 1 | 2;
  /** Current confidence result */
  confidence: ConfidenceResult;
  /** Active goals */
  goals: AISGoal[];
  /** Sound enabled */
  soundEnabled: boolean;
  /** First time on current page */
  isFirstTime: boolean;
  /** Context prediction for current page */
  prediction: ContextPrediction | null;
  /** Memory snapshot */
  memory: Readonly<AISMemory>;

  /* ─── Actions ─────────────────────────────────────────────────────── */

  /** Record a page visit (called automatically by hook) */
  recordPageVisit: (route: string) => void;
  /** Record a scan */
  recordScan: () => void;
  /** Record an integration connected */
  recordIntegration: () => void;
  /** Record a tool installed */
  recordToolInstall: (toolId: string) => void;
  /** Record a report generated */
  recordReport: () => void;
  /** Record findings reviewed */
  recordFindingsReview: () => void;
  /** Record recommendation followed */
  recordRecommendationFollowed: () => void;
  /** Tip dismissed */
  recordTipDismissed: () => void;
  /** Tip engaged */
  recordTipEngaged: () => void;
  /** Mark assistant shown for page */
  markAssistantShown: (route: string) => void;
  /** Was assistant shown for page this session */
  wasAssistantShown: (route: string) => boolean;
  /** Toggle sound */
  toggleSound: (enabled?: boolean) => void;
  /** Set preference */
  setPreference: (key: string, value: boolean) => void;
  /** Update goal progress */
  updateGoalProgress: (goalId: string, steps: number) => void;
  /** Play a sound */
  playSound: (type: SoundType) => void;
  /** Refresh state from memory */
  refresh: () => void;
}

/* ─── Default goals based on role ────────────────────────────────────── */

function getDefaultGoals(role: UserRole): AISGoal[] {
  const base: AISGoal = {
    id: "full_control",
    titleKey: "ais.goal.fullControl",
    targetSteps: 6,
    completedSteps: 0,
    nextStepKey: "ais.goal.next.scan",
    nextStepHref: "/app/scanner",
  };

  if (role === "ceo" || role === "cto") {
    return [
      { ...base, titleKey: "ais.goal.transparency", targetSteps: 5, nextStepKey: "ais.goal.next.dashboard" },
    ];
  }
  if (role === "developer") {
    return [
      { ...base, titleKey: "ais.goal.secureCode", targetSteps: 6, nextStepKey: "ais.goal.next.repositories" },
    ];
  }
  if (role === "pentester") {
    return [
      { ...base, titleKey: "ais.goal.fullAudit", targetSteps: 7, nextStepKey: "ais.goal.next.scanner" },
    ];
  }
  return [base];
}

/* ─── Compute goal progress from metrics ─────────────────────────────── */

function computeGoalProgress(
  goals: AISGoal[],
  metrics: AISMemory["metrics"]
): AISGoal[] {
  return goals.map((goal) => {
    let completed = 0;

    if (metrics.scansPerformed > 0) completed++;
    if (metrics.connectedIntegrations > 0) completed++;
    if (metrics.findingsReviewed > 0) completed++;
    if (metrics.reportsGenerated > 0) completed++;
    if (metrics.toolsInstalled > 0) completed++;
    if (metrics.recommendationsFollowed > 0) completed++;

    // Determine next step
    let nextStepKey = goal.nextStepKey;
    let nextStepHref = goal.nextStepHref;

    if (metrics.scansPerformed === 0) {
      nextStepKey = "ais.goal.next.scan";
      nextStepHref = "/app/scanner";
    } else if (metrics.connectedIntegrations === 0) {
      nextStepKey = "ais.goal.next.integrations";
      nextStepHref = "/app/integrations";
    } else if (metrics.findingsReviewed === 0) {
      nextStepKey = "ais.goal.next.findings";
      nextStepHref = "/app/findings";
    } else if (metrics.reportsGenerated === 0) {
      nextStepKey = "ais.goal.next.reports";
      nextStepHref = "/app/reports";
    } else if (metrics.recommendationsFollowed === 0) {
      nextStepKey = "ais.goal.next.recommendations";
      nextStepHref = "/app/marketplace";
    } else {
      nextStepKey = "ais.goal.next.optimize";
      nextStepHref = "/app/dashboard";
    }

    return {
      ...goal,
      completedSteps: Math.min(completed, goal.targetSteps),
      nextStepKey,
      nextStepHref,
    };
  });
}

/* ─── Main hook ──────────────────────────────────────────────────────── */

export function useAIS(): AISState {
  const pathname = usePathname();
  const [revision, setRevision] = useState(0);
  const pageEnterTime = useRef(Date.now());
  const predictionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  // Track page time on unmount / route change
  useEffect(() => {
    const enterTime = Date.now();
    pageEnterTime.current = enterTime;

    return () => {
      const timeSpent = Date.now() - enterTime;
      if (pathname) {
        getAISMemory().updatePageTime(pathname, timeSpent);
      }
    };
  }, [pathname]);

  // Record page visit on route change
  useEffect(() => {
    if (pathname) {
      getAISMemory().recordPageVisit(pathname);
      refresh();
    }
  }, [pathname, refresh]);

  // Context prediction timer
  useEffect(() => {
    if (predictionTimerRef.current) {
      clearTimeout(predictionTimerRef.current);
    }

    const enterTime = Date.now();
    const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

    const check = () => {
      if (!pathname) return;
      const timeOnPage = Date.now() - enterTime;
      const mem = getAISMemory().getMemory();

      // Don't re-prompt if already prompted for this page
      if (mem.contextPrediction?.prompted && mem.contextPrediction.page === pathname) {
        return;
      }

      const prediction = predictContext(pathname, timeOnPage);
      if (prediction) {
        getAISMemory().setContextPrediction({
          page: pathname,
          timeOnPage,
          timestamp: Date.now(),
          prompted: true,
        });
        refresh();
      }
    };

    predictionTimerRef.current = setTimeout(check, CHECK_INTERVAL);

    return () => {
      if (predictionTimerRef.current) {
        clearTimeout(predictionTimerRef.current);
      }
    };
  }, [pathname, refresh]);

  // Computed state
  const engine = getAISMemory();
  const memory = engine.getMemory();
  const role = memory.detectedRole || engine.getDetectedRole();
  const isExecutive = role === "ceo" || role === "cto" || memory.preferences.executiveMode;
  const isEngineer = role === "devops" || role === "devsecops" || role === "developer" || role === "pentester" || memory.preferences.engineerMode;

  // Initialize goals if empty
  const goalsRaw = memory.goals.length > 0 ? memory.goals : getDefaultGoals(role);
  const goals = computeGoalProgress(goalsRaw, memory.metrics);

  // Save initialized goals back (useEffect to avoid side effect during render)
  useEffect(() => {
    if (memory.goals.length === 0 && goals.length > 0) {
      engine.setGoals(goals);
      refresh();
    }
  }, [memory.goals.length, goals.length]);

  const confidence = computeConfidence();
  const isFirstTime = pathname ? engine.isFirstTimeOnPage(pathname) : false;
  const prediction = pathname ? predictContext(pathname, Date.now() - pageEnterTime.current) : null;

  const playSound = useCallback((type: SoundType) => {
    getSoundIdentity().play(type);
  }, []);

  return useMemo(
    () => ({
      role,
      isExecutive,
      isEngineer,
      detailLevel: memory.detailLevel,
      confidence,
      goals,
      soundEnabled: memory.soundEnabled,
      isFirstTime,
      prediction,
      memory,

      recordPageVisit: (route: string) => {
        getAISMemory().recordPageVisit(route);
        refresh();
      },
      recordScan: () => {
        getAISMemory().recordScan();
        refresh();
      },
      recordIntegration: () => {
        getAISMemory().recordIntegration();
        refresh();
      },
      recordToolInstall: (toolId: string) => {
        getAISMemory().recordToolInstall(toolId);
        refresh();
      },
      recordReport: () => {
        getAISMemory().recordReport();
        refresh();
      },
      recordFindingsReview: () => {
        getAISMemory().recordFindingsReview();
        refresh();
      },
      recordRecommendationFollowed: () => {
        getAISMemory().recordRecommendationFollowed();
        refresh();
      },
      recordTipDismissed: () => {
        getAISMemory().recordTipDismissed();
        refresh();
      },
      recordTipEngaged: () => {
        getAISMemory().recordTipEngaged();
        refresh();
      },
      markAssistantShown: (route: string) => {
        getAISMemory().markAssistantShown(route);
      },
      wasAssistantShown: (route: string) => {
        return getAISMemory().wasAssistantShown(route);
      },
      toggleSound: (enabled?: boolean) => {
        getAISMemory().toggleSound(enabled);
        getSoundIdentity().setEnabled(enabled ?? !memory.soundEnabled);
        refresh();
      },
      setPreference: (key: string, value: boolean) => {
        getAISMemory().setPreference(
          key as "executiveMode" | "engineerMode" | "autoAssistant",
          value
        );
        refresh();
      },
      updateGoalProgress: (goalId: string, steps: number) => {
        getAISMemory().updateGoalProgress(goalId, steps);
        refresh();
      },
      playSound,
      refresh,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      revision,
      role,
      isExecutive,
      isEngineer,
      memory.detailLevel,
      memory.soundEnabled,
      memory.goals,
      memory.metrics,
      confidence,
      goals,
      isFirstTime,
      prediction,
      pathname,
      playSound,
      refresh,
    ]
  );
}
