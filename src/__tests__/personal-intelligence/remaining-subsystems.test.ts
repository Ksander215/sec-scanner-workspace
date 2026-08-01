import { describe, test, expect } from 'vitest';
import { KnowledgeSynthesizer } from '../../core/personal-intelligence/knowledge-synthesizer.js';
import { ConversationInterpreter } from '../../core/personal-intelligence/conversation-interpreter.js';
import { HabitInsights } from '../../core/personal-intelligence/habit-insights.js';
import { PriorityOptimizer } from '../../core/personal-intelligence/priority-optimizer.js';
import { PersonalDashboard } from '../../core/personal-intelligence/personal-dashboard.js';
import { PackMetricsRuntime } from '../../core/personal-intelligence/pack-metrics-runtime.js';
import { PackTraceRuntime } from '../../core/personal-intelligence/pack-trace-runtime.js';
import { KnowledgeNodeType, KnowledgeEdgeType, ConversationIntent, HabitDirection, HabitStrength, TraceStatus } from '../../core/personal-intelligence/types.js';

const mockPlatform = {
  publishEvent: async () => {},
  getConfiguration: () => null,
  getHealth: async () => null,
};
const mockIdentity = { getCurrentUserId: () => 'user-1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mockMemory = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mockKnowledge = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mockWorkflow = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mockCognitive = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mockPersonal = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mockAIProvider = { complete: async () => 'response', embed: async () => [0.1], isAvailable: () => true };
const mockExperience = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] };
const contracts = {
  identity: mockIdentity, memory: mockMemory, knowledge: mockKnowledge,
  workflow: mockWorkflow, cognitive: mockCognitive, personal: mockPersonal,
  aiProvider: mockAIProvider, experience: mockExperience, platform: mockPlatform,
};

describe('KnowledgeSynthesizer', () => {
test('adds Note node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Note, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Note); expect(n.title).toBe('Title'); });
test('adds Conversation node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Conversation, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Conversation); expect(n.title).toBe('Title'); });
test('adds Project node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Project, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Project); expect(n.title).toBe('Title'); });
test('adds Decision node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Decision, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Decision); expect(n.title).toBe('Title'); });
test('adds Conclusion node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Conclusion, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Conclusion); expect(n.title).toBe('Title'); });
test('adds Experience node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Experience, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Experience); expect(n.title).toBe('Title'); });
test('adds Concept node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Concept, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Concept); expect(n.title).toBe('Title'); });
test('adds Question node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Question, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Question); expect(n.title).toBe('Title'); });
test('adds Insight node', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Insight, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.Insight); expect(n.title).toBe('Title'); });
test('adds edge between nodes', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'N1','C1','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'N2','C2','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo, 0.8); expect(e.sourceId).toBe(n1.id); expect(e.targetId).toBe(n2.id); expect(e.weight).toBe(0.8); });
test('adds NotesTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.NotesTo); expect(e.type).toBe(KnowledgeEdgeType.NotesTo); });
test('adds ConversationTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.ConversationTo); expect(e.type).toBe(KnowledgeEdgeType.ConversationTo); });
test('adds ProjectTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.ProjectTo); expect(e.type).toBe(KnowledgeEdgeType.ProjectTo); });
test('adds DecisionTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.DecisionTo); expect(e.type).toBe(KnowledgeEdgeType.DecisionTo); });
test('adds ConclusionTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.ConclusionTo); expect(e.type).toBe(KnowledgeEdgeType.ConclusionTo); });
test('adds ExperienceTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.ExperienceTo); expect(e.type).toBe(KnowledgeEdgeType.ExperienceTo); });
test('adds RelatedTo edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo); expect(e.type).toBe(KnowledgeEdgeType.RelatedTo); });
test('adds DependsOn edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.DependsOn); expect(e.type).toBe(KnowledgeEdgeType.DependsOn); });
test('adds Contradicts edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.Contradicts); expect(e.type).toBe(KnowledgeEdgeType.Contradicts); });
test('adds Supports edge', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.Supports); expect(e.type).toBe(KnowledgeEdgeType.Supports); });
test('getConnectedNodes returns neighbors', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const n3 = k.addNode(KnowledgeNodeType.Note,'C','C','s'); k.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo); k.addEdge(n1.id, n3.id, KnowledgeEdgeType.DependsOn); expect(k.getConnectedNodes(n1.id as unknown as string).length).toBe(2); });
test('getSynthesis returns complete graph', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'A','C','s'); k.addNode(KnowledgeNodeType.Note,'B','C','s'); const s = k.getSynthesis(); expect(s.totalNodes).toBe(2); expect(s.totalEdges).toBe(0); });
});

describe('ConversationInterpreter', () => {
test('searchNodes finds by title', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'Special Title','Content','s'); k.addNode(KnowledgeNodeType.Note,'Other','Content','s'); expect(k.searchNodes('Special').length).toBe(1); });
test('throws on missing source node for edge', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Note,'A','C','s'); expect(() => k.addEdge('invalid' as any, n.id, KnowledgeEdgeType.RelatedTo)).toThrow(); });
test('dispose clears', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'A','C','s'); k.dispose(); expect(k.getNodeCount()).toBe(0); expect(k.getEdgeCount()).toBe(0); });
test('detects GoalSetting intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('goal something'); expect(r.intent).toBe(ConversationIntent.GoalSetting); });
test('detects DecisionMaking intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('decide something'); expect(r.intent).toBe(ConversationIntent.DecisionMaking); });
test('detects Reflection intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('reflect something'); expect(r.intent).toBe(ConversationIntent.Reflection); });
});

describe('HabitInsights', () => {
test('detects Planning intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('plan something'); expect(r.intent).toBe(ConversationIntent.Planning); });
test('detects ConstraintExploration intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('constraint something'); expect(r.intent).toBe(ConversationIntent.ConstraintExploration); });
test('detects ValueInquiry intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('value something'); expect(r.intent).toBe(ConversationIntent.ValueInquiry); });
test('detects General intent', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('hello world something'); expect(r.intent).toBe(ConversationIntent.General); });
test('extracts entities', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('goal: learn TypeScript'); expect(r.entities.length).toBeGreaterThan(0); });
test('generates suggested actions', async () => { const i = new ConversationInterpreter(contracts); const r = await i.interpret('I need to decide something'); expect(r.suggestedActions.length).toBeGreaterThan(0); });
test('throws on empty input', async () => { const i = new ConversationInterpreter(contracts); await expect(i.interpret('')).rejects.toThrow(); });
test('getInterpretationCount', async () => { const i = new ConversationInterpreter(contracts); await i.interpret('hello'); expect(i.getInterpretationCount()).toBe(1); });
test('dispose clears', async () => { const i = new ConversationInterpreter(contracts); await i.interpret('hello'); i.dispose(); expect(i.getInterpretationCount()).toBe(0); });
test('detects Positive habit', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('Habit','desc',HabitDirection.Positive); expect(habit.direction).toBe(HabitDirection.Positive); expect(habit.strength).toBe(HabitStrength.Emerging); expect(habit.observationCount).toBe(1); });
test('detects Negative habit', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('Habit','desc',HabitDirection.Negative); expect(habit.direction).toBe(HabitDirection.Negative); expect(habit.strength).toBe(HabitStrength.Emerging); expect(habit.observationCount).toBe(1); });
test('detects Neutral habit', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('Habit','desc',HabitDirection.Neutral); expect(habit.direction).toBe(HabitDirection.Neutral); expect(habit.strength).toBe(HabitStrength.Emerging); expect(habit.observationCount).toBe(1); });
test('detects habit with Emerging strength', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive,HabitStrength.Emerging); expect(habit.strength).toBe(HabitStrength.Emerging); });
});

describe('PriorityOptimizer', () => {
test('detects habit with Established strength', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive,HabitStrength.Established); expect(habit.strength).toBe(HabitStrength.Established); });
test('detects habit with Strong strength', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive,HabitStrength.Strong); expect(habit.strength).toBe(HabitStrength.Strong); });
test('detects habit with Core strength', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive,HabitStrength.Core); expect(habit.strength).toBe(HabitStrength.Core); });
test('recordObservation increases count', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive); h.recordObservation(habit.id as unknown as string); h.recordObservation(habit.id as unknown as string); const updated = h.getHabit(habit.id as unknown as string); expect(updated.observationCount).toBe(3); expect(updated.confidence).toBeGreaterThan(0.5); });
test('strength upgrades with observations', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive); for (let i = 0; i < 30; i++) h.recordObservation(habit.id as unknown as string); expect(h.getHabit(habit.id as unknown as string).strength).toBe(HabitStrength.Core); });
});

describe('PersonalDashboard', () => {
test('getTopPositiveHabits', () => { const h = new HabitInsights(contracts); h.detectHabit('Good','d',HabitDirection.Positive); h.detectHabit('Bad','d',HabitDirection.Negative); expect(h.getTopPositiveHabits().length).toBe(1); });
test('getTopNegativeHabits', () => { const h = new HabitInsights(contracts); h.detectHabit('Bad','d',HabitDirection.Negative); expect(h.getTopNegativeHabits().length).toBe(1); });
test('throws on empty name', () => { const h = new HabitInsights(contracts); expect(() => h.detectHabit('','d',HabitDirection.Positive)).toThrow(); });
test('throws on not found', () => { const h = new HabitInsights(contracts); expect(() => h.getHabit('invalid')).toThrow(); });
test('dispose clears', () => { const h = new HabitInsights(contracts); h.detectHabit('H','d',HabitDirection.Positive); h.dispose(); expect(h.getHabitCount()).toBe(0); });
});

describe('PackMetricsRuntime', () => {
test('calculates priority with factors', () => { const p = new PriorityOptimizer(contracts); const factors = {deadline:8,importance:9,urgency:7,energy:6,context:5,dependencies:8,risk:7,value:9}; const s = p.calculatePriority('g1', factors as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.factors).toBeDefined(); });
test('calculateAllPriorities ranks correctly', () => { const p = new PriorityOptimizer(contracts); const f = new Map(); f.set('g1',{deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}); f.set('g2',{deadline:9,importance:9,urgency:9,energy:9,context:9,dependencies:9,risk:9,value:9}); const r = p.calculateAllPriorities(['g1','g2'], f as any); expect(r.length).toBe(2); expect(r[0].rank).toBe(1); expect(r[0].totalScore).toBeGreaterThan(r[1].totalScore); });
test('getTopN returns top scores', () => { const p = new PriorityOptimizer(contracts); p.calculatePriority('g1',{deadline:3,importance:3,urgency:3,energy:3,context:3,dependencies:3,risk:3,value:3}); p.calculatePriority('g2',{deadline:9,importance:9,urgency:9,energy:9,context:9,dependencies:9,risk:9,value:9}); expect(p.getTopN(1).length).toBe(1); });
test('throws on missing factors', () => { const p = new PriorityOptimizer(contracts); const f = new Map(); expect(() => p.calculateAllPriorities(['g1'], f as any)).toThrow(); });
test('dispose clears', () => { const p = new PriorityOptimizer(contracts); p.calculatePriority('g1',{deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}); p.dispose(); expect(p.getScoreCount()).toBe(0); });
test('addInsight creates insight', () => { const d = new PersonalDashboard(contracts); const i = d.addInsight('Title','Desc','category','source',0.9); expect(i.title).toBe('Title'); expect(i.confidence).toBe(0.9); });
test('generateDashboard creates dashboard', () => { const d = new PersonalDashboard(contracts); const db = d.generateDashboard({userId:'u1',todaySummary:'Good day',topGoals:[],nextActions:['Action 1'],mainConstraint:null,mainRecommendation:null,productivityIndex:75,developmentIndex:60}); expect(db.userId).toBe('u1'); expect(db.productivityIndex).toBe(75); expect(db.nextActions).toEqual(['Action 1']); });
});

describe('PackTraceRuntime', () => {
test('getLatestDashboard returns null when empty', () => { const d = new PersonalDashboard(contracts); expect(d.getLatestDashboard()).toBeNull(); });
test('getLatestDashboard returns latest', () => { const d = new PersonalDashboard(contracts); d.generateDashboard({userId:'u1',todaySummary:'s',topGoals:[],nextActions:[],mainConstraint:null,mainRecommendation:null,productivityIndex:50,developmentIndex:50}); d.generateDashboard({userId:'u1',todaySummary:'s2',topGoals:[],nextActions:[],mainConstraint:null,mainRecommendation:null,productivityIndex:60,developmentIndex:60}); expect(d.getLatestDashboard()!.productivityIndex).toBe(60); });
test('dispose clears', () => { const d = new PersonalDashboard(contracts); d.addInsight('T','D','c','s'); d.dispose(); expect(d.getInsightCount()).toBe(0); });
test('increment and getCounter', () => { const m = new PackMetricsRuntime(); m.increment('briefs_generated'); m.increment('briefs_generated'); expect(m.getCounter('briefs_generated')).toBe(2); });
test('setGauge and getGauge', () => { const m = new PackMetricsRuntime(); m.setGauge('productivity_index', 75); expect(m.getGauge('productivity_index')).toBe(75); });
test('recordSeries and getSeries', () => { const m = new PackMetricsRuntime(); m.recordSeries('daily_prod', 80); m.recordSeries('daily_prod', 85); expect(m.getSeries('daily_prod').length).toBe(2); });
test('getSnapshot returns all data', () => { const m = new PackMetricsRuntime(); m.increment('briefs_generated'); m.setGauge('productivity_index', 80); const s = m.getSnapshot(); expect(s.counters['briefs_generated']).toBe(1); expect(s.gauges['productivity_index']).toBe(80); });
test('export returns JSON', () => { const m = new PackMetricsRuntime(); m.increment('x'); const json = m.export(); expect(JSON.parse(json)).toBeDefined(); });
test('reset clears all', () => { const m = new PackMetricsRuntime(); m.increment('x'); m.setGauge('y', 5); m.reset(); expect(m.getCounter('x')).toBe(0); expect(m.getGauge('y')).toBe(0); });
test('dispose clears', () => { const m = new PackMetricsRuntime(); m.increment('x'); m.dispose(); expect(m.getCounter('x')).toBe(0); });
test('startSpan creates span', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); expect(s.operation).toBe('op'); expect(s.subsystem).toBe('sub'); expect(s.status).toBe(TraceStatus.Started); });
test('completeSpan sets endTime', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const c = t.completeSpan(s.id as unknown as string); expect(c.status).toBe(TraceStatus.Completed); expect(c.endTime).not.toBeNull(); expect(c.durationMs).not.toBeNull(); });
test('failSpan sets Failed', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const f = t.failSpan(s.id as unknown as string); expect(f.status).toBe(TraceStatus.Failed); });
test('addSpanEvent appends event', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const u = t.addSpanEvent(s.id as unknown as string, 'checkpoint', {key:'val'}); expect(u.events.length).toBe(1); expect(u.events[0].name).toBe('checkpoint'); });
test('getSpansBySubsystem filters', () => { const t = new PackTraceRuntime(); t.startSpan('op1','subA'); t.startSpan('op2','subB'); expect(t.getSpansBySubsystem('subA').length).toBe(1); });
test('getChildSpans returns children', () => { const t = new PackTraceRuntime(); const p = t.startSpan('parent','sub'); t.startSpan('child','sub', p.id as unknown as string); expect(t.getChildSpans(p.id as unknown as string).length).toBe(1); });
test('getActiveSpans excludes completed', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); t.completeSpan(s.id as unknown as string); expect(t.getActiveSpans().length).toBe(0); });
test('getAverageDurationMs', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); t.completeSpan(s.id as unknown as string); expect(t.getAverageDurationMs()).toBeGreaterThanOrEqual(0); });
test('dispose clears', () => { const t = new PackTraceRuntime(); t.startSpan('op','sub'); t.dispose(); expect(t.getSpanCount()).toBe(0); });
});
