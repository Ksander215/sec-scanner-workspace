#!/usr/bin/env python3
"""Generate additional tests for TASK-AIS-007A.000 Personal Intelligence Pack.

Targets: event publishing, immutability, FSM error paths, recommendation chain,
First Intelligence Experience, boundary conditions, extended integration.
"""

import os

OUT_DIR = "/home/z/my-project/src/__tests__/personal-intelligence"


def event_publishing_tests():
    """Tests that verify subsystems publish correct events via the platform contract."""
    lines = [
        "import { describe, test, expect, vi } from 'vitest';",
        "import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';",
        "import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';",
        "import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';",
        "import { GoalPlanner } from '../../core/personal-intelligence/goal-planner.js';",
        "import { DecisionAdvisor } from '../../core/personal-intelligence/decision-advisor.js';",
        "import { ConstraintAnalyzer } from '../../core/personal-intelligence/constraint-analyzer.js';",
        "import { ValueAnalyzer } from '../../core/personal-intelligence/value-analyzer.js';",
        "import { RecommendationComposer } from '../../core/personal-intelligence/recommendation-composer.js';",
        "import { KnowledgeSynthesizer } from '../../core/personal-intelligence/knowledge-synthesizer.js';",
        "import { ConversationInterpreter } from '../../core/personal-intelligence/conversation-interpreter.js';",
        "import { HabitInsights } from '../../core/personal-intelligence/habit-insights.js';",
        "import { PriorityOptimizer } from '../../core/personal-intelligence/priority-optimizer.js';",
        "import { PersonalDashboard } from '../../core/personal-intelligence/personal-dashboard.js';",
        "import { BriefType, GoalLevel, GoalStatus, ConstraintSeverity, ConstraintLifecycle, ValueDimension, RecommendationStatus, KnowledgeNodeType, KnowledgeEdgeType, HabitStrength, HabitDirection } from '../../core/personal-intelligence/types.js';",
        "",
        "const makeContracts = () => {",
        "  const events: Array<{ type: string; payload: any }> = [];",
        "  const mp = { publishEvent: vi.fn(async (type: string, payload: any) => { events.push({ type, payload }); }), getConfiguration: () => null, getHealth: async () => null };",
        "  const mi = { getCurrentUserId: () => 'u1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null };",
        "  const mm = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };",
        "  const mk = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };",
        "  const mw = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };",
        "  const mcg = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };",
        "  const mpe = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };",
        "  const mai = { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true };",
        "  const mex = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] };",
        "  const C = { identity: mi, memory: mm, knowledge: mk, workflow: mw, cognitive: mcg, personal: mpe, aiProvider: mai, experience: mex, platform: mp };",
        "  return { C, events, mp };",
        "};",
        "",
        "describe('Event Publishing', () => {",
    ]

    # Subsystems that publish events with specific payload fields
    subsystems = [
        ("DailyBriefGenerator", "BriefGenerated", [
            ("generateBrief(MorningBrief)", "BriefType.MorningBrief", [
                "expect(evts[0].type).toBe('BriefGenerated');",
                "expect(evts[0].payload.briefType).toBe('MorningBrief');",
                "expect(evts[0].payload.itemCount).toBe(12);",
                "expect(evts[0].payload.productivityIndex).toBeGreaterThanOrEqual(0);",
                "expect(evts[0].payload.developmentIndex).toBeGreaterThanOrEqual(0);",
                "expect(evts[0].payload.generatedAt).toBeDefined();",
                "expect(evts[0].payload.briefId).toBeDefined();",
                "expect(evts[0].payload.date).toBeDefined();",
            ]),
            ("generateBrief(EveningSummary)", "BriefType.EveningSummary", [
                "expect(evts[0].payload.briefType).toBe('EveningSummary');",
                "expect(evts[0].payload.itemCount).toBe(10);",
            ]),
            ("generateBrief(WeeklyReview)", "BriefType.WeeklyReview", [
                "expect(evts[0].payload.briefType).toBe('WeeklyReview');",
                "expect(evts[0].payload.itemCount).toBe(15);",
            ]),
            ("generateBrief(MiddayReview)", "BriefType.MiddayReview", [
                "expect(evts[0].payload.briefType).toBe('MiddayReview');",
                "expect(evts[0].payload.itemCount).toBe(8);",
            ]),
        ]),
        ("ReflectionEngine", "ReflectionGenerated", [
            ("generateReflection(Daily)", "ReflectionPeriod.Daily", [
                "expect(evts[0].type).toBe('ReflectionGenerated');",
                "expect(evts[0].payload.period).toBe('Daily');",
                "expect(evts[0].payload.score).toBeGreaterThanOrEqual(0);",
                "expect(evts[0].payload.score).toBeLessThanOrEqual(100);",
                "expect(evts[0].payload.sentiment).toBeDefined();",
                "expect(evts[0].payload.reflectionId).toBeDefined();",
                "expect(evts[0].payload.generatedAt).toBeDefined();",
            ]),
            ("generateReflection(Weekly)", "ReflectionPeriod.Weekly", [
                "expect(evts[0].payload.period).toBe('Weekly');",
            ]),
            ("generateReflection(Monthly)", "ReflectionPeriod.Monthly", [
                "expect(evts[0].payload.period).toBe('Monthly');",
            ]),
        ]),
        ("GoalPlanner", "PackGoalCreated", [
            ("createGoal(Vision)", "GoalLevel.Vision", [
                "expect(evts[0].type).toBe('PackGoalCreated');",
                "expect(evts[0].payload.level).toBe('Vision');",
                "expect(evts[0].payload.title).toBeDefined();",
                "expect(evts[0].payload.goalId).toBeDefined();",
                "expect(evts[0].payload.parentId).toBeNull();",
                "expect(evts[0].payload.createdAt).toBeDefined();",
            ]),
            ("createGoal(Goals)", "GoalLevel.Goals", [
                "expect(evts[0].payload.level).toBe('Goals');",
            ]),
            ("createGoal(Projects)", "GoalLevel.Projects", [
                "expect(evts[0].payload.level).toBe('Projects');",
            ]),
            ("createGoal(Milestones)", "GoalLevel.Milestones", [
                "expect(evts[0].payload.level).toBe('Milestones');",
            ]),
            ("createGoal(Tasks)", "GoalLevel.Tasks", [
                "expect(evts[0].payload.level).toBe('Tasks');",
            ]),
            ("createGoal(Actions)", "GoalLevel.Actions", [
                "expect(evts[0].payload.level).toBe('Actions');",
            ]),
            ("setStatus to Completed", "GoalStatus.Completed", [
                "expect(evts[0].type).toBe('PackGoalCompleted');",
                "expect(evts[0].payload.completedAt).toBeDefined();",
            ]),
        ]),
        ("ConstraintAnalyzer", "ConstraintDetected", [
            ("detectConstraint(Systemic)", "ConstraintSeverity.Systemic", [
                "expect(evts[0].type).toBe('ConstraintDetected');",
                "expect(evts[0].payload.severity).toBe('Systemic');",
                "expect(evts[0].payload.title).toBeDefined();",
                "expect(evts[0].payload.constraintId).toBeDefined();",
                "expect(evts[0].payload.detectedAt).toBeDefined();",
            ]),
            ("detectConstraint(Minor)", "ConstraintSeverity.Minor", [
                "expect(evts[0].payload.severity).toBe('Minor');",
            ]),
            ("advanceLifecycle to Resolved", "ConstraintLifecycle.Resolved", [
                "expect(evts[1].type).toBe('ConstraintResolved');",
                "expect(evts[1].payload.resolvedAt).toBeDefined();",
            ]),
            ("advanceLifecycle to Analyzed", "ConstraintLifecycle.Analyzed", [
                "expect(evts[1].type).toBe('ConstraintLifecycleChanged');",
                "expect(evts[1].payload.oldLifecycle).toBe('Detected');",
                "expect(evts[1].payload.newLifecycle).toBe('Analyzed');",
            ]),
        ]),
        ("ValueAnalyzer", "ValueAssessmentCreated", [
            ("createAssessment(UserValue)", "ValueDimension.UserValue", [
                "expect(evts[0].type).toBe('ValueAssessmentCreated');",
                "expect(evts[0].payload.dimension).toBe('UserValue');",
                "expect(evts[0].payload.confidence).toBeGreaterThanOrEqual(0);",
                "expect(evts[0].payload.confidence).toBeLessThanOrEqual(1);",
                "expect(evts[0].payload.assessmentId).toBeDefined();",
                "expect(evts[0].payload.createdAt).toBeDefined();",
            ]),
            ("createAssessment(EconomicValue)", "ValueDimension.EconomicValue", [
                "expect(evts[0].payload.dimension).toBe('EconomicValue');",
            ]),
        ]),
        ("RecommendationComposer", "RecommendationComposed", [
            ("composeRecommendation full chain", "RecommendationStatus.Validated", [
                "expect(evts[0].type).toBe('RecommendationComposed');",
                "expect(evts[0].payload.chainComplete).toBe(true);",
                "expect(evts[0].payload.confidence).toBeGreaterThanOrEqual(0);",
                "expect(evts[0].payload.recommendationId).toBeDefined();",
                "expect(evts[0].payload.composedAt).toBeDefined();",
            ]),
            ("present recommendation", "RecommendationStatus.Presented", [
                "expect(evts[1].type).toBe('RecommendationPresented');",
            ]),
            ("accept recommendation", "RecommendationStatus.Accepted", [
                "expect(evts[1].type).toBe('RecommendationAccepted');",
                "expect(evts[1].payload.acceptedAt).toBeDefined();",
            ]),
            ("reject recommendation", "RecommendationStatus.Rejected", [
                "expect(evts[1].type).toBe('RecommendationRejected');",
                "expect(evts[1].payload.reason).toBeDefined();",
                "expect(evts[1].payload.rejectedAt).toBeDefined();",
            ]),
        ]),
        ("KnowledgeSynthesizer", "KnowledgeNodeCreated", [
            ("addNode(Note)", "KnowledgeNodeType.Note", [
                "expect(evts[0].type).toBe('KnowledgeNodeCreated');",
                "expect(evts[0].payload.type).toBe('Note');",
                "expect(evts[0].payload.title).toBeDefined();",
                "expect(evts[0].payload.nodeId).toBeDefined();",
            ]),
            ("addEdge", "KnowledgeEdgeType.RelatedTo", [
                "expect(evts[1].type).toBe('KnowledgeEdgeCreated');",
                "expect(evts[1].payload.edgeType).toBe('RelatedTo');",
                "expect(evts[1].payload.sourceId).toBeDefined();",
                "expect(evts[1].payload.targetId).toBeDefined();",
            ]),
        ]),
        ("ConversationInterpreter", "ConversationInterpreted", [
            ("interpret(goal text)", "ConversationIntent.GoalSetting", [
                "expect(evts[0].type).toBe('ConversationInterpreted');",
                "expect(evts[0].payload.intent).toBe('GoalSetting');",
                "expect(evts[0].payload.confidence).toBeGreaterThan(0);",
                "expect(evts[0].payload.interpretationId).toBeDefined();",
            ]),
            ("interpret(decision text)", "ConversationIntent.DecisionMaking", [
                "expect(evts[0].payload.intent).toBe('DecisionMaking');",
            ]),
        ]),
        ("HabitInsights", "HabitInsightDetected", [
            ("detectHabit(Positive)", "HabitDirection.Positive", [
                "expect(evts[0].type).toBe('HabitInsightDetected');",
                "expect(evts[0].payload.direction).toBe('Positive');",
                "expect(evts[0].payload.name).toBeDefined();",
                "expect(evts[0].payload.habitId).toBeDefined();",
                "expect(evts[0].payload.detectedAt).toBeDefined();",
            ]),
            ("detectHabit(Negative)", "HabitDirection.Negative", [
                "expect(evts[0].payload.direction).toBe('Negative');",
            ]),
        ]),
    ]

    # Special handling for different subsystems
    for subsystem_name, primary_event, scenarios in subsystems:
        lines.append(f"  describe('{subsystem_name}', () => {{")
        for scenario_name, _, assertions in scenarios:
            lines.append(f"    test('{scenario_name} publishes {primary_event}', () => {{")
            lines.append("      const { C, events } = makeContracts();")

            # Generate setup code based on subsystem
            if subsystem_name == "DailyBriefGenerator":
                lines.append("      const gen = new DailyBriefGenerator(C);")
                lines.append(f"      gen.generateBrief({scenario_name.split('(')[1].rstrip(')')});")
            elif subsystem_name == "ReflectionEngine":
                lines.append("      const eng = new ReflectionEngine(C);")
                lines.append(f"      eng.generateReflection({scenario_name.split('(')[1].rstrip(')')});")
            elif subsystem_name == "GoalPlanner":
                lines.append("      const pl = new GoalPlanner(C);")
                if "Completed" in scenario_name:
                    lines.append("      const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });")
                    lines.append("      pl.setStatus(g.id as unknown as string, GoalStatus.Active);")
                    lines.append("      pl.setStatus(g.id as unknown as string, GoalStatus.InProgress);")
                    lines.append("      pl.setStatus(g.id as unknown as string, GoalStatus.Completed);")
                else:
                    level = scenario_name.split('(')[1].rstrip(')')
                    lines.append(f"      pl.createGoal({{ title: 'Test', level: {level} }});")
            elif subsystem_name == "ConstraintAnalyzer":
                lines.append("      const ca = new ConstraintAnalyzer(C);")
                if "Resolved" in scenario_name:
                    lines.append("      const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Major);")
                    lines.append("      ca.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Resolved);")
                elif "Analyzed" in scenario_name:
                    lines.append("      const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Major);")
                    lines.append("      ca.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Analyzed);")
                else:
                    sev = scenario_name.split('(')[1].rstrip(')')
                    lines.append(f"      ca.detectConstraint('Test', 'Desc', {sev});")
            elif subsystem_name == "ValueAnalyzer":
                lines.append("      const va = new ValueAnalyzer(C);")
                dim = scenario_name.split('(')[1].rstrip(')')
                lines.append(f"      va.createAssessment({dim}, 'Desc', ['r1'], 'user', ['m1'], 'impact', 0.8);")
            elif subsystem_name == "RecommendationComposer":
                lines.append("      const rc = new RecommendationComposer(C);")
                if "accept" in scenario_name:
                    lines.append("      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });")
                    lines.append("      rc.present(r.id as unknown as string);")
                    lines.append("      rc.accept(r.id as unknown as string);")
                elif "reject" in scenario_name:
                    lines.append("      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });")
                    lines.append("      rc.present(r.id as unknown as string);")
                    lines.append("      rc.reject(r.id as unknown as string, 'no');")
                elif "present" in scenario_name:
                    lines.append("      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });")
                    lines.append("      rc.present(r.id as unknown as string);")
                else:
                    lines.append("      rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });")
            elif subsystem_name == "KnowledgeSynthesizer":
                lines.append("      const ks = new KnowledgeSynthesizer(C);")
                if "Edge" in scenario_name:
                    lines.append("      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C1', 's');")
                    lines.append("      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C2', 's');")
                    lines.append("      ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo);")
                else:
                    nt = scenario_name.split('(')[1].rstrip(')')
                    lines.append(f"      ks.addNode({nt}, 'Title', 'Content', 'source');")
            elif subsystem_name == "ConversationInterpreter":
                lines.append("      const ci = new ConversationInterpreter(C);")
                if "goal" in scenario_name.lower():
                    lines.append("      ci.interpret('I want to set a new goal for Q4');")
                elif "decision" in scenario_name.lower():
                    lines.append("      ci.interpret('I need to decide between option A and B');")
                else:
                    lines.append("      ci.interpret('hello');")
            elif subsystem_name == "HabitInsights":
                lines.append("      const hi = new HabitInsights(C);")
                d = scenario_name.split('(')[1].rstrip(')')
                lines.append(f"      hi.detectHabit('Habit', 'Desc', {d});")

            lines.append("      const evts = events.filter(e => e.type.startsWith('