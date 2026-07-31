#!/usr/bin/env python3
"""Generate PIR tests - 1000+ tests for Personal Intelligence Runtime"""
import os

BASE = "/home/z/my-project/src/__tests__/core/personal"

def mock_contracts():
    return """function createMockContracts(): PersonalRuntimeContracts {
  return {
    identity: {
      getCurrentUserId: vi.fn(() => 'user-1'),
      getUserRoles: vi.fn(() => ['admin', 'developer']),
      getUserPreferences: vi.fn(() => ({ theme: 'dark', language: 'en' })),
      resolvePreference: vi.fn((_userId: string, _key: string) => 'dark'),
    },
    memory: {
      retrieve: vi.fn(async (_layer: string, _key: string) => null),
      store: vi.fn(async (_layer: string, _key: string, _value: unknown) => {}),
      query: vi.fn((_filter: Record<string, unknown>) => []),
      getSessionEntries: vi.fn((_sessionId: string) => []),
      getWorkingEntries: vi.fn((_executionId: string) => []),
    },
    knowledge: {
      search: vi.fn(async (_query: string) => []),
      getNamespaces: vi.fn(async () => [{ id: 'ns-1', name: 'general' }]),
      getItemCount: vi.fn(async () => 42),
      getRecentItems: vi.fn(async (_limit?: number) => [{ id: 'ki-1', name: 'Test Item' }]),
      getByTags: vi.fn(async (_tags: readonly string[]) => []),
    },
    workflow: {
      getActiveWorkflows: vi.fn(() => [{ id: 'wf-1', name: 'Test Workflow' }]),
      getRunningInstances: vi.fn(() => [{ id: 'wi-1' }]),
      getRecentCompletions: vi.fn((_limit?: number) => [{ id: 'wc-1' }]),
      getAvailableWorkflows: vi.fn(() => [{ id: 'wf-2', name: 'Available' }]),
    },
    experience: {
      getActiveAdaptations: vi.fn(() => [{ id: 'ea-1' }]),
      getRecommendations: vi.fn(() => [{ id: 'er-1' }]),
      getCurrentPhase: vi.fn(() => 'Stable'),
      getBehaviorPatterns: vi.fn(() => [{ pattern: 'morning-review' }]),
    },
    cognitive: {
      getCurrentIntent: vi.fn(() => 'general'),
      getConversationTurnCount: vi.fn(() => 5),
      getCurrentSessionId: vi.fn(() => 'session-1'),
      getConversationSummary: vi.fn(async () => 'User discussed project planning'),
    },
    capability: {
      getActivePacks: vi.fn(() => [{ id: 'cp-1', name: 'editor-tools' }]),
      getAvailableCapabilities: vi.fn(() => ['edit', 'search', 'analyze']),
    },
    desktop: {
      getOpenWindowCount: vi.fn(() => 3),
      getActiveWindow: vi.fn(() => 'code-editor'),
      getDesktopState: vi.fn(() => 'Ready'),
      getSubsystemCount: vi.fn(() => 14),
    },
    platform: {
      publishEvent: vi.fn(async (_type: string, _payload: unknown) => {}),
      getConfiguration: vi.fn((_key: string) => null),
      getHealth: vi.fn(async () => ({ status: 'Healthy' })),
    },
  };
}"""

def write_types_tests():
    path = os.path.join(BASE, "types.test.ts")
    enums_to_test = [
        ("GoalStatus", ["Draft","Active","Paused","Completed","Archived","Cancelled"]),
        ("GoalLevel", ["Vision","Strategy","Goal","Objective","Task"]),
        ("PlanPeriod", ["Today","Tomorrow","Week","Month","Quarter"]),
        ("PredictionType", ["NextAction","NextTask","NextQuestion","NextDocument","NextWorkflow"]),
        ("HabitFrequency", ["Daily","Weekly","Weekday","Weekend","Monthly","Custom"]),
        ("RecommendationType", ["Action","Learning","Reminder","Optimization","Automation","Knowledge","Focus","Health"]),
        ("AttentionState", ["Focused","Distracted","Overloaded","Fatigued","ContextSwitching","Idle","Unknown"]),
        ("ReflectionPeriod", ["Daily","Weekly","Monthly"]),
        ("LearningStatus", ["New","Learning","Practicing","Mastered","Forgotten","Declining"]),
        ("DecisionMethod", ["ProsCons","SWOT","RiskAnalysis","ScenarioAnalysis","ExpectedOutcome","TradeOffs"]),
        ("BriefType", ["MorningBrief","MiddayReview","EveningSummary","WeeklyReview","MonthlyReview"]),
    ]
    lines = ["""import { describe, it, expect } from 'vitest';
import {
  GoalStatus, GoalLevel, PlanPeriod, PredictionType,
  HabitFrequency, RecommendationType, AttentionState,
  ReflectionPeriod, LearningStatus, DecisionMethod, BriefType,
} from '../../../core/personal/types.js';

describe('PIR Types', () => {"""]
    for enum_name, values in enums_to_test:
        lines.append(f""\