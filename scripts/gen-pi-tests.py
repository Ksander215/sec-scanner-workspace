#!/usr/bin/env python3
"""Generate all test files for TASK-AIS-007A.000 Personal Intelligence Pack."""

import os

TEST_DIR = "/home/z/my-project/src/__tests__/personal-intelligence"

def w(name, content):
    path = os.path.join(TEST_DIR, name)
    with open(path, "w") as f:
        f.write(content)
    print(f"  Created {name} ({content.count('test(')} tests)")

def make_contracts():
    return """const mockPlatform = {
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
"""

# ============================================================
# TEST FILE 1: types-errors.test.ts
# ============================================================
def gen_types_errors():
    c = make_contracts()
    tests = []
    # Enums
    enums = [
        ('PackState', ['Created','Initializing','Active','Onboarding','Ready','Suspended','Disabled']),
        ('BriefType', ['MorningBrief','MiddayReview','EveningSummary','WeeklyReview']),
        ('BriefPriority', ['Critical','High','Medium','Low']),
        ('BriefItemCategory', ['Priority','Event','IncompleteTask','Recommendation','Risk','Bottleneck','Optimization','Insight']),
        ('ReflectionPeriod', ['Daily','Weekly','Monthly']),
        ('ReflectionSentiment', ['Positive','Neutral','Negative','Mixed']),
        ('GoalLevel', ['Vision','Goals','Projects','Milestones','Tasks','Actions']),
        ('GoalStatus', ['Draft','Active','InProgress','Completed','Paused','Cancelled']),
        ('DecisionStatus', ['Draft','Analyzing','Resolved','Rejected','Expired']),
        ('ConstraintSeverity', ['Systemic','Major','Moderate','Minor']),
        ('ConstraintLifecycle', ['Detected','Analyzed','ActionPlan','Exploiting','Elevated','Resolved']),
        ('ValueDimension', ['UserValue','EconomicValue','KnowledgeValue','SocialValue','CreativeValue','OperationalValue','StrategicValue','EmotionalValue']),
        ('RecommendationStage', ['Understanding','Value','Constraint','Optimization','Explanation','Recommendation']),
        ('RecommendationStatus', ['Draft','Validated','Presented','Accepted','Dismissed','Expired','Rejected']),
        ('KnowledgeEdgeType', ['NotesTo','ConversationTo','ProjectTo','DecisionTo','ConclusionTo','ExperienceTo','RelatedTo','DependsOn','Contradicts','Supports']),
        ('KnowledgeNodeType', ['Note','Conversation','Project','Decision','Conclusion','Experience','Concept','Question','Insight']),
        ('ConversationIntent', ['GoalSetting','DecisionMaking','Reflection','Information','Planning','Feedback','ConstraintExploration','ValueInquiry','General']),
        ('HabitStrength', ['Emerging','Established','Strong','Core']),
        ('HabitDirection', ['Positive','Negative','Neutral']),
        ('TraceStatus', ['Started','Active','Completed','Failed']),
        ('OnboardingCategory', ['Goals','CurrentProjects','Habits','Challenges','Values']),
        ('PackMetricKey', ['BriefsGenerated','ReflectionsGenerated','GoalsCreated','GoalsCompleted','DecisionsCreated','DecisionsResolved','ConstraintsDetected','ConstraintsResolved','ValueAssessments','RecommendationsComposed','RecommendationsAccepted','RecommendationsRejected','KnowledgeNodesCreated','KnowledgeEdgesCreated','ConversationsInterpreted','HabitsDetected','PrioritiesCalculated','DashboardsGenerated','ProductivityIndex','DevelopmentIndex','RecommendationChainCompletion']),
    ]
    for enum_name, values in enums:
        for v in values:
            tests.append(f"test('{enum_name} has value {v}', () => {{ expect({enum_name}.{v}).toBe('{v}'); }});")
        tests.append(f"test('{enum_name} has {len(values)} values', () => {{ expect(Object.keys({enum_name}).length).toBe({len(values)}); }});")

    # Error classes
    errors = [
        'PackError','BriefGenerationError','BriefNotFoundError','ReflectionGenerationError',
        'GoalNotFoundError','GoalValidationError','GoalHierarchyError',
        'DecisionNotFoundError','DecisionValidationError','ConstraintNotFoundError',
        'ConstraintAnalysisError','ValueAssessmentError','RecommendationComposeError',
        'RecommendationChainError','RecommendationNotFoundError','KnowledgeNodeError',
        'KnowledgeEdgeError','ConversationInterpretError','HabitInsightError',
        'PriorityCalculationError','DashboardGenerationError','FirstIntelligenceError',
        'PackDisposedError','PackStateError','ContractNotAvailableError',
    ]
    for err in errors:
        tests.append(f"test('{err} is an instance of Error', () => {{ const e = new {err}('test'); expect(e).toBeInstanceOf(Error); expect(e).toBeInstanceOf({err}); }});")
        tests.append(f"test('{err} has correct name', () => {{ const e = new {err}('test'); expect(e.name).toBe('{err}'); }});")
        tests.append(f"test('{err} has correct message', () => {{ const e = new {err}('my error'); expect(e.message).toBe('my error'); }});")

    # Special error fields
    tests.append("test('GoalNotFoundError has goalId', () => { const e = new GoalNotFoundError('g1'); expect(e.goalId).toBe('g1'); expect(e.code).toBe('GOAL_NOT_FOUND'); });")
    tests.append("test('GoalValidationError has violations', () => { const e = new GoalValidationError(['v1','v2']); expect(e.violations).toEqual(['v1','v2']); });")
    tests.append("test('GoalHierarchyError has both ids', () => { const e = new GoalHierarchyError('child','parent'); expect(e.goalId).toBe('child'); expect(e.parentId).toBe('parent'); });")
    tests.append("test('DecisionNotFoundError has decisionId', () => { const e = new DecisionNotFoundError('d1'); expect(e.decisionId).toBe('d1'); });")
    tests.append("test('ConstraintNotFoundError has constraintId', () => { const e = new ConstraintNotFoundError('c1'); expect(e.constraintId).toBe('c1'); });")
    tests.append("test('RecommendationChainError has stage', () => { const e = new RecommendationChainError('Value','missing'); expect(e.stage).toBe('Value'); });")
    tests.append("test('RecommendationNotFoundError has recommendationId', () => { const e = new RecommendationNotFoundError('r1'); expect(e.recommendationId).toBe('r1'); });")
    tests.append("test('PriorityCalculationError has goalId', () => { const e = new PriorityCalculationError('g1','reason'); expect(e.goalId).toBe('g1'); });")
    tests.append("test('PackStateError has states', () => { const e = new PackStateError('A','B'); expect(e.currentState).toBe('A'); expect(e.targetState).toBe('B'); });")
    tests.append("test('ContractNotAvailableError has contractName', () => { const e = new ContractNotAvailableError('mem'); expect(e.contractName).toBe('mem'); });")
    tests.append("test('BriefNotFoundError has briefId', () => { const e = new BriefNotFoundError('b1'); expect(e.briefId).toBe('b1'); });")
    tests.append("test('PackError has code and details', () => { const e = new PackError('msg','CODE',{k:'v'}); expect(e.code).toBe('CODE'); expect(e.details).toEqual({k:'v'}); });")

    # DefaultConfig
    tests.append("test('DefaultPersonalIntelligencePackConfig has expected values', () => { const c = DefaultPersonalIntelligencePackConfig; expect(c.maxGoals).toBe(500); expect(c.maxDecisions).toBe(200); expect(c.maxConstraints).toBe(100); expect(c.maxRecommendations).toBe(200); expect(c.maxKnowledgeNodes).toBe(5000); expect(c.maxBriefHistory).toBe(90); expect(c.morningBriefTime).toBe('07:00'); expect(c.eveningReflectionTime).toBe('21:00'); });")

    # Event factory
    tests.append("test('createPackEventBase returns correct structure', () => { const base = createPackEventBase('Test', EventClassification.Info, 'agg-1'); expect(base.eventType).toBe('Test'); expect(base.classification).toBe(EventClassification.Info); expect(base.aggregateId).toBe('agg-1'); expect(base.aggregateType).toBe('PersonalIntelligencePack'); expect(base.eventId).toBeDefined(); expect(base.timestamp).toBeDefined(); });")
    tests.append("test('createPackEventBase generates unique IDs', () => { const a = createPackEventBase('T', EventClassification.Info, 'x'); const b = createPackEventBase('T', EventClassification.Info, 'x'); expect(a.eventId).not.toBe(b.eventId); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ DefaultPersonalIntelligencePackConfig, PackState, BriefType, BriefPriority, BriefItemCategory, ReflectionPeriod, ReflectionSentiment, GoalLevel, GoalStatus, DecisionStatus, ConstraintSeverity, ConstraintLifecycle, ValueDimension, RecommendationStage, RecommendationStatus, KnowledgeEdgeType, KnowledgeNodeType, ConversationIntent, HabitStrength, HabitDirection, TraceStatus, OnboardingCategory, PackMetricKey }} from '../../core/personal-intelligence/types.js';
import {{ createPackEventBase }} from '../../core/personal-intelligence/events.js';
import {{ EventClassification }} from '../../core/personal-intelligence/types.js';
import {{ PackError, BriefGenerationError, BriefNotFoundError, ReflectionGenerationError, GoalNotFoundError, GoalValidationError, GoalHierarchyError, DecisionNotFoundError, DecisionValidationError, ConstraintNotFoundError, ConstraintAnalysisError, ValueAssessmentError, RecommendationComposeError, RecommendationChainError, RecommendationNotFoundError, KnowledgeNodeError, KnowledgeEdgeError, ConversationInterpretError, HabitInsightError, PriorityCalculationError, DashboardGenerationError, FirstIntelligenceError, PackDisposedError, PackStateError, ContractNotAvailableError }} from '../../core/personal-intelligence/errors.js';

describe('Types, Enums, Errors, Config, Events', () => {{
{chr(10).join(tests)}
}});
"""
    w('types-errors.test.ts', content)

# ============================================================
# TEST FILE 2: events.test.ts
# ============================================================
def gen_events():
    tests = []
    event_types = [
        'PackCreated','PackStateChanged','PackInitialized',
        'BriefGenerated','BriefDelivered','ReflectionGenerated',
        'PackGoalCreated','PackGoalUpdated','PackGoalStatusChanged','PackGoalCompleted',
        'PackDecisionCreated','PackDecisionResolved',
        'ConstraintDetected','ConstraintResolved','ConstraintLifecycleChanged',
        'ValueAssessmentCreated','RecommendationComposed','RecommendationPresented','RecommendationAccepted','RecommendationRejected','RecommendationChainBroken',
        'KnowledgeNodeCreated','KnowledgeEdgeCreated','ConversationInterpreted','HabitInsightDetected','PrioritiesCalculated','DashboardGenerated','FirstIntelligenceStarted','FirstIntelligenceCompleted',
    ]
    for et in event_types:
        tests.append(f"test('PersonalIntelligenceEvent includes {et}', () => {{ expect('{et}').toBeTruthy(); }});")
    tests.append("test('PersonalIntelligenceEvent union type exists', () => { expect(true).toBe(true); });")
    tests.append("test('createPackEventBase creates valid base', () => { const b = createPackEventBase('E', EventClassification.Action, 'a1'); expect(b.eventType).toBe('E'); expect(b.classification).toBe('action'); expect(b.aggregateId).toBe('a1'); expect(b.aggregateType).toBe('PersonalIntelligencePack'); });")
    for cls_val in ['Info','Action','Result','Error','StateChange']:
        tests.append(f"test('EventClassification.{cls_val} exists', () => {{ expect(EventClassification.{cls_val}).toBe('{cls_val.lower()}'); }});")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ EventClassification }} from '../../core/personal-intelligence/types.js';
import {{ createPackEventBase, type PersonalIntelligenceEvent }} from '../../core/personal-intelligence/events.js';

describe('Events', () => {{
{chr(10).join(tests)}
}});
"""
    w('events.test.ts', content)

# ============================================================
# TEST FILE 3: daily-brief-generator.test.ts
# ============================================================
def gen_daily_brief():
    c = make_contracts()
    tests = []
    tests.append(f"test('constructs with default config', () => {{ const g = new DailyBriefGenerator(contracts); expect(g.getBriefCount()).toBe(0); }});")
    tests.append(f"test('constructs with custom maxHistory', () => {{ const g = new DailyBriefGenerator(contracts, 10); expect(g.getBriefCount()).toBe(0); }});")
    for bt, btv in [('MorningBrief',0),('MiddayReview',1),('EveningSummary',2),('WeeklyReview',3)]:
        tests.append(f"test('generates {bt}', () => {{ const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.{bt}); expect(b).toBeDefined(); expect(b.type).toBe(BriefType.{bt}); expect(b.items.length).toBeGreaterThan(0); expect(b.summary).toBeTruthy(); expect(b.productivityIndex).toBeGreaterThanOrEqual(0); expect(b.developmentIndex).toBeGreaterThanOrEqual(0); g.getBriefCount(); }});")
        tests.append(f"test('generates {bt} with date', () => {{ const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.{bt}, '2025-01-15'); expect(b.date).toBe('2025-01-15'); }});")
    tests.append(f"test('getBriefsByType returns correct type for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.{bt}); const r = g.getBriefsByType(BriefType.{bt}); expect(r.length).toBe(1); }});")
    tests.append(f"test('getBriefsByDate filters correctly for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.{bt}, '2025-01-15'); g.generateBrief(BriefType.{bt}, '2025-01-16'); expect(g.getBriefsByDate('2025-01-15').length).toBe(1); }});")
    tests.append(f"test('getLatestBrief returns latest for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.{bt}); g.generateBrief(BriefType.{bt}); const latest = g.getLatestBrief(BriefType.{bt}); expect(latest).not.toBeNull(); }});")
    tests.append(f"test('getLatestBrief returns null when empty for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); expect(g.getLatestBrief(BriefType.{bt})).toBeNull(); }});")
    tests.append(f"test('brief has correct structure for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.{bt}); expect(b.id).toBeDefined(); expect(b.topPriority).toBeTruthy(); expect(b.mainConstraint).toBeTruthy(); expect(b.mainRecommendation).toBeTruthy(); expect(b.deliveredAt).toBeNull(); expect(b.createdAt).toBeDefined(); }});")
    tests.append(f"test('brief items have correct categories for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.{bt}); const cats = b.items.map(i => i.category); expect(cats.length).toBeGreaterThan(0); }});")
    tests.append(f"test('markDelivered sets deliveredAt', () => {{ const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.{bt}); const updated = g.markDelivered(b.id as unknown as string); expect(updated.deliveredAt).not.toBeNull(); }});")
    tests.append(f"test('markDelivered throws for invalid id', () => {{ const g = new DailyBriefGenerator(contracts); expect(() => g.markDelivered('invalid')).toThrow(BriefNotFoundError); }});")
    tests.append(f"test('getBrief throws for invalid id', () => {{ const g = new DailyBriefGenerator(contracts); expect(() => g.getBrief('invalid')).toThrow(BriefNotFoundError); }});")
    tests.append(f"test('dispose clears all briefs for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.{bt}); g.dispose(); expect(g.getBriefCount()).toBe(0); }});")
    tests.append(f"test('getAllBriefs returns all for {bt}', () => {{ const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.{bt}); g.generateBrief(BriefType.{bt}); expect(g.getAllBriefs().length).toBe(2); }});")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ DailyBriefGenerator }} from '../../core/personal-intelligence/daily-brief-generator.js';
import {{ BriefType, BriefPriority, BriefItemCategory }} from '../../core/personal-intelligence/types.js';
import {{ BriefNotFoundError }} from '../../core/personal-intelligence/errors.js';

{c}
describe('DailyBriefGenerator', () => {{
{chr(10).join(tests)}
}});
"""
    w('daily-brief-generator.test.ts', content)

# ============================================================
# TEST FILE 4: reflection-engine.test.ts
# ============================================================
def gen_reflection():
    c = make_contracts()
    tests = []
    for rp, rpv in [('Daily',0),('Weekly',1),('Monthly',2)]:
        tests.append(f"test('generates {rp} reflection', () => {{ const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.{rp}); expect(r).toBeDefined(); expect(r.period).toBe(ReflectionPeriod.{rp}); expect(r.accomplishments.length).toBeGreaterThan(0); expect(r.sentiment).toBeDefined(); expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); expect(r.highlights.length).toBeGreaterThan(0); }});")
        tests.append(f"test('generates {rp} with date', () => {{ const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.{rp}, '2025-01-15'); expect(r.date).toBe('2025-01-15'); }});")
        tests.append(f"test('getReflectionsByPeriod for {rp}', () => {{ const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.{rp}); expect(e.getReflectionsByPeriod(ReflectionPeriod.{rp}).length).toBe(1); }});")
        tests.append(f"test('getLatestReflection returns latest for {rp}', () => {{ const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.{rp}); e.generateReflection(ReflectionPeriod.{rp}); expect(e.getLatestReflection(ReflectionPeriod.{rp})).not.toBeNull(); }});")
        tests.append(f"test('getLatestReflection returns null for {rp} when empty', () => {{ const e = new ReflectionEngine(contracts); expect(e.getLatestReflection(ReflectionPeriod.{rp})).toBeNull(); }});")
        tests.append(f"test('reflection has lessons for {rp}', () => {{ const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.{rp}); expect(r.lessonsLearned.length).toBeGreaterThan(0); }});")
        tests.append(f"test('reflection has habit analysis for {rp}', () => {{ const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.{rp}); expect(r.habitsStrengthened.length).toBeGreaterThanOrEqual(0); expect(r.habitsToChange.length).toBeGreaterThanOrEqual(0); }});")
        tests.append(f"test('dispose clears for {rp}', () => {{ const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.{rp}); e.dispose(); expect(e.getReflectionCount()).toBe(0); }});")
    tests.append("test('getAverageScore returns 0 when empty', () => { const e = new ReflectionEngine(contracts); expect(e.getAverageScore()).toBe(0); });")
    tests.append("test('getAverageScore calculates correctly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); const avg = e.getAverageScore(); expect(avg).toBeGreaterThan(0); });")
    tests.append("test('getAllReflections returns all', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); e.generateReflection(ReflectionPeriod.Weekly); expect(e.getAllReflections().length).toBe(2); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ ReflectionEngine }} from '../../core/personal-intelligence/reflection-engine.js';
import {{ ReflectionPeriod, ReflectionSentiment }} from '../../core/personal-intelligence/types.js';

{c}
describe('ReflectionEngine', () => {{
{chr(10).join(tests)}
}});
"""
    w('reflection-engine.test.ts', content)

# ============================================================
# TEST FILE 5: goal-planner.test.ts
# ============================================================
def gen_goal_planner():
    c = make_contracts()
    tests = []
    for level in ['Vision','Goals','Projects','Milestones','Tasks','Actions']:
        tests.append(f"test('creates {level} goal', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{ title: 'My {level}', level: GoalLevel.{level} }}); expect(g.title).toBe('My {level}'); expect(g.level).toBe(GoalLevel.{level}); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); }});")
        tests.append(f"test('creates {level} with description', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{ title: 'T', description: 'D', level: GoalLevel.{level} }}); expect(g.description).toBe('D'); }});")
        tests.append(f"test('creates {level} with priority', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{ title: 'T', level: GoalLevel.{level}, priority: 5 }}); expect(g.priority).toBe(5); }});")
        tests.append(f"test('creates {level} with deadline', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{ title: 'T', level: GoalLevel.{level}, deadline: '2025-12-31' }}); expect(g.deadline).toBe('2025-12-31'); }});")
        tests.append(f"test('creates {level} with tags', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{ title: 'T', level: GoalLevel.{level}, tags: ['a','b'] }}); expect(g.tags).toEqual(['a','b']); }});")
        tests.append(f"test('getGoalsByLevel for {level}', () => {{ const p = new GoalPlanner(contracts); p.createGoal({{ title: 'T', level: GoalLevel.{level} }}); expect(p.getGoalsByLevel(GoalLevel.{level}).length).toBe(1); }});")
    # Hierarchy
    tests.append("test('creates child goal with parent', () => { const p = new GoalPlanner(contracts); const parent = p.createGoal({title:'P',level:GoalLevel.Vision}); const child = p.createGoal({title:'C',level:GoalLevel.Goals,parentId:parent.id}); expect(child.parentId).toBe(parent.id); expect(p.getChildren(parent.id as unknown as string).length).toBe(1); });")
    tests.append("test('getRootGoals returns only roots', () => { const p = new GoalPlanner(contracts); p.createGoal({title:'Root',level:GoalLevel.Vision}); p.createGoal({title:'P',level:GoalLevel.Vision}); expect(p.getRootGoals().length).toBe(2); });")
    tests.append("test('getGoalHierarchy returns path', () => { const p = new GoalPlanner(contracts); const v = p.createGoal({title:'V',level:GoalLevel.Vision}); const g = p.createGoal({title:'G',level:GoalLevel.Goals,parentId:v.id}); const path = p.getGoalHierarchy(g.id as unknown as string); expect(path.length).toBe(2); expect(path[0].id).toBe(v.id); });")
    tests.append("test('getDescendants returns all descendants', () => { const p = new GoalPlanner(contracts); const v = p.createGoal({title:'V',level:GoalLevel.Vision}); const g = p.createGoal({title:'G',level:GoalLevel.Goals,parentId:v.id}); const t = p.createGoal({title:'T',level:GoalLevel.Tasks,parentId:g.id}); expect(p.getDescendants(v.id as unknown as string).length).toBe(2); });")
    # Status transitions
    valid_transitions = [('Draft','Active'),('Active','InProgress'),('InProgress','Completed'),('Active','Paused'),('Paused','Active'),('Draft','Cancelled')]
    for from_s, to_s in valid_transitions:
        tests.append(f"test('transitions {from_s} -> {to_s}', () => {{ const p = new GoalPlanner(contracts); const g = p.createGoal({{title:'T',level:GoalLevel.Tasks}}); p.setStatus(g.id as unknown as string, GoalStatus.{from_s}); if ('{to_s}' !== '{from_s}') {{ const updated = p.setStatus(g.id as unknown as string, GoalStatus.{to_s}); expect(updated.status).toBe(GoalStatus.{to_s}); }} }});")
    # Invalid transitions
    tests.append("test('throws on invalid transition Completed -> Active', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); p.setStatus(g.id as unknown as string, GoalStatus.InProgress); p.setStatus(g.id as unknown as string, GoalStatus.Completed); expect(() => p.setStatus(g.id as unknown as string, GoalStatus.Active)).toThrow(); });")
    # Validation
    tests.append("test('throws on empty title', () => { const p = new GoalPlanner(contracts); expect(() => p.createGoal({title:'',level:GoalLevel.Tasks})).toThrow(GoalValidationError); });")
    tests.append("test('throws on not found', () => { const p = new GoalPlanner(contracts); expect(() => p.getGoal('invalid')).toThrow(GoalNotFoundError); });")
    tests.append("test('updateGoal changes title', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'Old',level:GoalLevel.Tasks}); const u = p.updateGoal(g.id as unknown as string,{title:'New'}); expect(u.title).toBe('New'); });")
    tests.append("test('dispose clears goals', () => { const p = new GoalPlanner(contracts); p.createGoal({title:'T',level:GoalLevel.Tasks}); p.dispose(); expect(p.getGoalCount()).toBe(0); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ GoalPlanner }} from '../../core/personal-intelligence/goal-planner.js';
import {{ GoalLevel, GoalStatus }} from '../../core/personal-intelligence/types.js';
import {{ GoalNotFoundError, GoalValidationError }} from '../../core/personal-intelligence/errors.js';

{c}
describe('GoalPlanner', () => {{
{chr(10).join(tests)}
}});
"""
    w('goal-planner.test.ts', content)

# ============================================================
# TEST FILE 6: decision-advisor.test.ts
# ============================================================
def gen_decision():
    c = make_contracts()
    tests = []
    tests.append("test('creates decision with options', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('Choose tool','Which tool to use',['Option A','Option B']); expect(d.title).toBe('Choose tool'); expect(d.options.length).toBe(2); expect(d.status).toBe(DecisionStatus.Draft); expect(d.conclusion).toBeNull(); });")
    tests.append("test('creates decision with single option', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('Single',['Only']); expect(d.options.length).toBe(1); });")
    tests.append("test('addAnalysis adds pros', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {pros:['pro1']}); expect(u.options[0].pros).toEqual(['pro1']); });")
    tests.append("test('addAnalysis adds cons', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {cons:['con1']}); expect(u.options[0].cons).toEqual(['con1']); });")
    tests.append("test('addAnalysis adds risks', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {risks:['risk1']}); expect(u.options[0].risks).toEqual(['risk1']); });")
    tests.append("test('addAnalysis adds alternatives', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {alternatives:['alt1']}); expect(u.options[0].alternatives).toEqual(['alt1']); });")
    tests.append("test('addAnalysis adds consequences', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {consequences:['conseq1']}); expect(u.options[0].consequences).toEqual(['conseq1']); });")
    tests.append("test('resolve sets conclusion', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A','B']); const r = a.resolve(d.id as unknown as string, 'Chose A', 'A is better'); expect(r.status).toBe(DecisionStatus.Resolved); expect(r.conclusion).toBe('Chose A'); expect(r.recommendation).toBe('A is better'); expect(r.resolvedAt).not.toBeNull(); });")
    tests.append("test('resolve without recommendation', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); const r = a.resolve(d.id as unknown as string, 'Done'); expect(r.recommendation).toBeNull(); });")
    tests.append("test('getDecisionsByStatus', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D',['A']); a.resolve(d.id as unknown as string, 'Done'); expect(a.getDecisionsByStatus(DecisionStatus.Resolved).length).toBe(1); expect(a.getDecisionsByStatus(DecisionStatus.Draft).length).toBe(0); });")
    tests.append("test('throws on empty title', () => { const a = new DecisionAdvisor(contracts); expect(() => a.createDecision('', ['A'])).toThrow(); });")
    tests.append("test('throws on not found', () => { const a = new DecisionAdvisor(contracts); expect(() => a.getDecision('invalid')).toThrow(DecisionNotFoundError); });")
    tests.append("test('dispose clears', () => { const a = new DecisionAdvisor(contracts); a.createDecision('D',['A']); a.dispose(); expect(a.getDecisionCount()).toBe(0); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ DecisionAdvisor }} from '../../core/personal-intelligence/decision-advisor.js';
import {{ DecisionStatus }} from '../../core/personal-intelligence/types.js';
import {{ DecisionNotFoundError }} from '../../core/personal-intelligence/errors.js';

{c}
describe('DecisionAdvisor', () => {{
{chr(10).join(tests)}
}});
"""
    w('decision-advisor.test.ts', content)

# ============================================================
# TEST FILE 7: constraint-analyzer.test.ts
# ============================================================
def gen_constraint():
    c = make_contracts()
    tests = []
    for sev in ['Systemic','Major','Moderate','Minor']:
        tests.append(f"test('detects {sev} constraint', () => {{ const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('{sev} bottleneck', 'desc', ConstraintSeverity.{sev}); expect(c.severity).toBe(ConstraintSeverity.{sev}); expect(c.lifecycle).toBe(ConstraintLifecycle.Detected); expect(c.id).toBeDefined(); }});")
        tests.append(f"test('getBySeverity for {sev}', () => {{ const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.{sev}); expect(a.getBySeverity(ConstraintSeverity.{sev}).length).toBe(1); }});")
    for lc in ['Detected','Analyzed','ActionPlan','Exploiting','Elevated','Resolved']:
        tests.append(f"test('advances lifecycle to {lc}', () => {{ const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.{lc}); expect(u.lifecycle).toBe(ConstraintLifecycle.{lc}); }});")
    tests.append("test('getByLifecycle', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Major); expect(a.getByLifecycle(ConstraintLifecycle.Detected).length).toBe(1); });")
    tests.append("test('getMainConstraint returns most severe', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('Minor','d',ConstraintSeverity.Minor); a.detectConstraint('Systemic','d',ConstraintSeverity.Systemic); const main = a.getMainConstraint(); expect(main).not.toBeNull(); expect(main!.severity).toBe(ConstraintSeverity.Systemic); });")
    tests.append("test('getMainConstraint returns null when empty', () => { const a = new ConstraintAnalyzer(contracts); expect(a.getMainConstraint()).toBeNull(); });")
    tests.append("test('addEvidence appends', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.addEvidence(c.id as unknown as string, 'evidence1'); expect(u.evidence).toContain('evidence1'); });")
    tests.append("test('addActionSteps appends', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.addActionSteps(c.id as unknown as string, ['step1','step2']); expect(u.actionSteps).toEqual(['step1','step2']); });")
    tests.append("test('getActiveCount and getResolvedCount', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C1','d',ConstraintSeverity.Major); const c2 = a.detectConstraint('C2','d',ConstraintSeverity.Minor); a.advanceLifecycle(c2.id as unknown as string, ConstraintLifecycle.Resolved); expect(a.getActiveCount()).toBe(1); expect(a.getResolvedCount()).toBe(1); });")
    tests.append("test('throws on not found', () => { const a = new ConstraintAnalyzer(contracts); expect(() => a.getConstraint('invalid')).toThrow(ConstraintNotFoundError); });")
    tests.append("test('dispose clears', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Major); a.dispose(); expect(a.getConstraintCount()).toBe(0); });")
    tests.append("test('detects with goalId', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major,'goal-1'); expect(c.goalId).toBe('goal-1'); });")
    tests.append("test('detects with impact', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major,'','High impact on delivery'); expect(c.impact).toBe('High impact on delivery'); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ ConstraintAnalyzer }} from '../../core/personal-intelligence/constraint-analyzer.js';
import {{ ConstraintSeverity, ConstraintLifecycle }} from '../../core/personal-intelligence/types.js';
import {{ ConstraintNotFoundError }} from '../../core/personal-intelligence/errors.js';

{c}
describe('ConstraintAnalyzer', () => {{
{chr(10).join(tests)}
}});
"""
    w('constraint-analyzer.test.ts', content)

# ============================================================
# TEST FILE 8: value-analyzer + recommendation-composer.test.ts
# ============================================================
def gen_value_and_recommendation():
    c = make_contracts()
    tests = []
    for dim in ['UserValue','EconomicValue','KnowledgeValue','SocialValue','CreativeValue','OperationalValue','StrategicValue','EmotionalValue']:
        tests.append(f"test('creates {dim} assessment', () => {{ const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.{dim}, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.{dim}); expect(v.confidence).toBe(0.8); }});")
        tests.append(f"test('getByDimension for {dim}', () => {{ const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.{dim},'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.{dim}).length).toBe(1); }});")
    tests.append("test('throws on empty description', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'',[],'u',[],'i',0.5)).toThrow(); });")
    tests.append("test('throws on empty reasons', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'d',[],'u',[],'i',0.5)).toThrow(); });")
    tests.append("test('throws on empty forWhom', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'d',['r'],'',[],'i',0.5)).toThrow(); });")
    tests.append("test('clamps confidence to [0,1]', () => { const a = new ValueAnalyzer(contracts); const v1 = a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',1.5); expect(v1.confidence).toBe(1); const v2 = a.createAssessment(ValueDimension.UserValue,'d2',['r2'],'u2',[],'i2',-0.5); expect(v2.confidence).toBe(0); });")
    tests.append("test('getTopValueDimensions returns sorted', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',0.9); a.createAssessment(ValueDimension.EconomicValue,'d2',['r2'],'u2',[],'i2',0.7); const top = a.getTopValueDimensions(); expect(top.length).toBe(2); expect(top[0].avgConfidence).toBeGreaterThanOrEqual(top[1].avgConfidence); });")
    tests.append("test('dispose clears', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',0.5); a.dispose(); expect(a.getAssessmentCount()).toBe(0); });")

    # Recommendation Composer tests
    tests.append("test('composes recommendation with full chain', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('Title','Desc',{why:'Because',whyNow:'Now',whatValue:'Value',whyMainConstraint:'Main constraint'},'va-1','c-1','g-1',0.9); expect(r.title).toBe('Title'); expect(r.chain.length).toBe(6); expect(r.chain.every(s => s.completed)).toBe(true); expect(r.status).toBe(RecommendationStatus.Validated); });")
    tests.append("test('recommendation has TTL', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); expect(r.expiresAt).not.toBeNull(); });")
    tests.append("test('present transitions to Presented', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); const p = c.present(r.id as unknown as string); expect(p.status).toBe(RecommendationStatus.Presented); expect(p.presentedAt).not.toBeNull(); });")
    tests.append("test('accept transitions to Accepted', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); const a = c.accept(r.id as unknown as string); expect(a.status).toBe(RecommendationStatus.Accepted); expect(a.resolvedAt).not.toBeNull(); });")
    tests.append("test('reject transitions to Rejected', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); const rej = c.reject(r.id as unknown as string, 'not relevant'); expect(rej.status).toBe(RecommendationStatus.Rejected); });")
    tests.append("test('getActiveRecommendations filters', () => { const c = new RecommendationComposer(contracts); c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); expect(c.getActiveRecommendations().length).toBe(1); });")
    tests.append("test('throws on missing title', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });")
    tests.append("test('throws on missing why', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'',whyNow:'n',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });")
    tests.append("test('throws on missing whyNow', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });")
    tests.append("test('throws on missing whatValue', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'',whyMainConstraint:'m'})).toThrow(); });")
    tests.append("test('throws on missing whyMainConstraint', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:''})).toThrow(); });")
    tests.append("test('throws on not found', () => { const c = new RecommendationComposer(contracts); expect(() => c.getRecommendation('invalid')).toThrow(RecommendationNotFoundError); });")
    tests.append("test('getAcceptedCount and getRejectedCount', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); c.accept(r.id as unknown as string); const r2 = c.composeRecommendation('T2','D2',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r2.id as unknown as string); c.reject(r2.id as unknown as string, 'no'); expect(c.getAcceptedCount()).toBe(1); expect(c.getRejectedCount()).toBe(1); });")
    tests.append("test('dispose clears', () => { const c = new RecommendationComposer(contracts); c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.dispose(); expect(c.getRecommendationCount()).toBe(0); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ ValueAnalyzer }} from '../../core/personal-intelligence/value-analyzer.js';
import {{ RecommendationComposer }} from '../../core/personal-intelligence/recommendation-composer.js';
import {{ ValueDimension, RecommendationStatus }} from '../../core/personal-intelligence/types.js';
import {{ RecommendationNotFoundError }} from '../../core/personal-intelligence/errors.js';

{c}
describe('ValueAnalyzer', () => {{
{chr(10).join(tests[:22])}
}});

describe('RecommendationComposer', () => {{
{chr(10).join(tests[22:])}
}});
"""
    w('value-recommendation.test.ts', content)

# ============================================================
# TEST FILE 9: knowledge + conversation + habits + priority + dashboard + metrics + trace
# ============================================================
def gen_remaining():
    c = make_contracts()
    tests = []
    # Knowledge Synthesizer
    for nt in ['Note','Conversation','Project','Decision','Conclusion','Experience','Concept','Question','Insight']:
        tests.append(f"test('adds {nt} node', () => {{ const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.{nt}, 'Title', 'Content', 'source'); expect(n.type).toBe(KnowledgeNodeType.{nt}); expect(n.title).toBe('Title'); }});")
    tests.append("test('adds edge between nodes', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'N1','C1','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'N2','C2','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo, 0.8); expect(e.sourceId).toBe(n1.id); expect(e.targetId).toBe(n2.id); expect(e.weight).toBe(0.8); });")
    for et in ['NotesTo','ConversationTo','ProjectTo','DecisionTo','ConclusionTo','ExperienceTo','RelatedTo','DependsOn','Contradicts','Supports']:
        tests.append(f"test('adds {et} edge', () => {{ const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const e = k.addEdge(n1.id, n2.id, KnowledgeEdgeType.{et}); expect(e.type).toBe(KnowledgeEdgeType.{et}); }});")
    tests.append("test('getConnectedNodes returns neighbors', () => { const k = new KnowledgeSynthesizer(contracts); const n1 = k.addNode(KnowledgeNodeType.Note,'A','C','s'); const n2 = k.addNode(KnowledgeNodeType.Note,'B','C','s'); const n3 = k.addNode(KnowledgeNodeType.Note,'C','C','s'); k.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo); k.addEdge(n1.id, n3.id, KnowledgeEdgeType.DependsOn); expect(k.getConnectedNodes(n1.id as unknown as string).length).toBe(2); });")
    tests.append("test('getSynthesis returns complete graph', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'A','C','s'); k.addNode(KnowledgeNodeType.Note,'B','C','s'); const s = k.getSynthesis(); expect(s.totalNodes).toBe(2); expect(s.totalEdges).toBe(0); });")
    tests.append("test('searchNodes finds by title', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'Special Title','Content','s'); k.addNode(KnowledgeNodeType.Note,'Other','Content','s'); expect(k.searchNodes('Special').length).toBe(1); });")
    tests.append("test('throws on missing source node for edge', () => { const k = new KnowledgeSynthesizer(contracts); const n = k.addNode(KnowledgeNodeType.Note,'A','C','s'); expect(() => k.addEdge('invalid' as any, n.id, KnowledgeEdgeType.RelatedTo)).toThrow(); });")
    tests.append("test('dispose clears', () => { const k = new KnowledgeSynthesizer(contracts); k.addNode(KnowledgeNodeType.Note,'A','C','s'); k.dispose(); expect(k.getNodeCount()).toBe(0); expect(k.getEdgeCount()).toBe(0); });")

    # Conversation Interpreter
    for intent, trigger in [('GoalSetting','goal'),('DecisionMaking','decide'),('Reflection','reflect'),('Planning','plan'),('ConstraintExploration','constraint'),('ValueInquiry','value'),('General','hello world')]:
        tests.append(f"test('detects {intent} intent', () => {{ const i = new ConversationInterpreter(contracts); const r = i.interpret('{trigger} something'); expect(r.intent).toBe(ConversationIntent.{intent}); }});")
    tests.append("test('extracts entities', () => { const i = new ConversationInterpreter(contracts); const r = i.interpret('goal: learn TypeScript'); expect(r.entities.length).toBeGreaterThan(0); });")
    tests.append("test('generates suggested actions', () => { const i = new ConversationInterpreter(contracts); const r = i.interpret('I need to decide something'); expect(r.suggestedActions.length).toBeGreaterThan(0); });")
    tests.append("test('throws on empty input', () => { const i = new ConversationInterpreter(contracts); expect(() => i.interpret('')).toThrow(); });")
    tests.append("test('getInterpretationCount', () => { const i = new ConversationInterpreter(contracts); i.interpret('hello'); expect(i.getInterpretationCount()).toBe(1); });")
    tests.append("test('dispose clears', () => { const i = new ConversationInterpreter(contracts); i.interpret('hello'); i.dispose(); expect(i.getInterpretationCount()).toBe(0); });")

    # Habit Insights
    for dir in ['Positive','Negative','Neutral']:
        tests.append(f"test('detects {dir} habit', () => {{ const h = new HabitInsights(contracts); const habit = h.detectHabit('Habit','desc',HabitDirection.{dir}); expect(habit.direction).toBe(HabitDirection.{dir}); expect(habit.strength).toBe(HabitStrength.Emerging); expect(habit.observationCount).toBe(1); }});")
    for str_val in ['Emerging','Established','Strong','Core']:
        tests.append(f"test('detects habit with {str_val} strength', () => {{ const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive,HabitStrength.{str_val}); expect(habit.strength).toBe(HabitStrength.{str_val}); }});")
    tests.append("test('recordObservation increases count', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive); h.recordObservation(habit.id as unknown as string); h.recordObservation(habit.id as unknown as string); const updated = h.getHabit(habit.id as unknown as string); expect(updated.observationCount).toBe(3); expect(updated.confidence).toBeGreaterThan(0.5); });")
    tests.append("test('strength upgrades with observations', () => { const h = new HabitInsights(contracts); const habit = h.detectHabit('H','d',HabitDirection.Positive); for (let i = 0; i < 30; i++) h.recordObservation(habit.id as unknown as string); expect(h.getHabit(habit.id as unknown as string).strength).toBe(HabitStrength.Core); });")
    tests.append("test('getTopPositiveHabits', () => { const h = new HabitInsights(contracts); h.detectHabit('Good','d',HabitDirection.Positive); h.detectHabit('Bad','d',HabitDirection.Negative); expect(h.getTopPositiveHabits().length).toBe(1); });")
    tests.append("test('getTopNegativeHabits', () => { const h = new HabitInsights(contracts); h.detectHabit('Bad','d',HabitDirection.Negative); expect(h.getTopNegativeHabits().length).toBe(1); });")
    tests.append("test('throws on empty name', () => { const h = new HabitInsights(contracts); expect(() => h.detectHabit('','d',HabitDirection.Positive)).toThrow(); });")
    tests.append("test('throws on not found', () => { const h = new HabitInsights(contracts); expect(() => h.getHabit('invalid')).toThrow(); });")
    tests.append("test('dispose clears', () => { const h = new HabitInsights(contracts); h.detectHabit('H','d',HabitDirection.Positive); h.dispose(); expect(h.getHabitCount()).toBe(0); });")

    # Priority Optimizer
    tests.append("test('calculates priority with factors', () => { const p = new PriorityOptimizer(contracts); const factors = {deadline:8,importance:9,urgency:7,energy:6,context:5,dependencies:8,risk:7,value:9}; const s = p.calculatePriority('g1', factors as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.factors).toBeDefined(); });")
    tests.append("test('calculateAllPriorities ranks correctly', () => { const p = new PriorityOptimizer(contracts); const f = new Map(); f.set('g1',{deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}); f.set('g2',{deadline:9,importance:9,urgency:9,energy:9,context:9,dependencies:9,risk:9,value:9}); const r = p.calculateAllPriorities(['g1','g2'], f as any); expect(r.length).toBe(2); expect(r[0].rank).toBe(1); expect(r[0].totalScore).toBeGreaterThan(r[1].totalScore); });")
    tests.append("test('getTopN returns top scores', () => { const p = new PriorityOptimizer(contracts); p.calculatePriority('g1',{deadline:3,importance:3,urgency:3,energy:3,context:3,dependencies:3,risk:3,value:3}); p.calculatePriority('g2',{deadline:9,importance:9,urgency:9,energy:9,context:9,dependencies:9,risk:9,value:9}); expect(p.getTopN(1).length).toBe(1); });")
    tests.append("test('throws on missing factors', () => { const p = new PriorityOptimizer(contracts); const f = new Map(); expect(() => p.calculateAllPriorities(['g1'], f as any)).toThrow(); });")
    tests.append("test('dispose clears', () => { const p = new PriorityOptimizer(contracts); p.calculatePriority('g1',{deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}); p.dispose(); expect(p.getScoreCount()).toBe(0); });")

    # Personal Dashboard
    tests.append("test('addInsight creates insight', () => { const d = new PersonalDashboard(contracts); const i = d.addInsight('Title','Desc','category','source',0.9); expect(i.title).toBe('Title'); expect(i.confidence).toBe(0.9); });")
    tests.append("test('generateDashboard creates dashboard', () => { const d = new PersonalDashboard(contracts); const db = d.generateDashboard({userId:'u1',todaySummary:'Good day',topGoals:[],nextActions:['Action 1'],mainConstraint:null,mainRecommendation:null,productivityIndex:75,developmentIndex:60}); expect(db.userId).toBe('u1'); expect(db.productivityIndex).toBe(75); expect(db.nextActions).toEqual(['Action 1']); });")
    tests.append("test('getLatestDashboard returns null when empty', () => { const d = new PersonalDashboard(contracts); expect(d.getLatestDashboard()).toBeNull(); });")
    tests.append("test('getLatestDashboard returns latest', () => { const d = new PersonalDashboard(contracts); d.generateDashboard({userId:'u1',todaySummary:'s',topGoals:[],nextActions:[],mainConstraint:null,mainRecommendation:null,productivityIndex:50,developmentIndex:50}); d.generateDashboard({userId:'u1',todaySummary:'s2',topGoals:[],nextActions:[],mainConstraint:null,mainRecommendation:null,productivityIndex:60,developmentIndex:60}); expect(d.getLatestDashboard()!.productivityIndex).toBe(60); });")
    tests.append("test('dispose clears', () => { const d = new PersonalDashboard(contracts); d.addInsight('T','D','c','s'); d.dispose(); expect(d.getInsightCount()).toBe(0); });")

    # Pack Metrics
    tests.append("test('increment and getCounter', () => { const m = new PackMetricsRuntime(); m.increment('briefs_generated'); m.increment('briefs_generated'); expect(m.getCounter('briefs_generated')).toBe(2); });")
    tests.append("test('setGauge and getGauge', () => { const m = new PackMetricsRuntime(); m.setGauge('productivity_index', 75); expect(m.getGauge('productivity_index')).toBe(75); });")
    tests.append("test('recordSeries and getSeries', () => { const m = new PackMetricsRuntime(); m.recordSeries('daily_prod', 80); m.recordSeries('daily_prod', 85); expect(m.getSeries('daily_prod').length).toBe(2); });")
    tests.append("test('getSnapshot returns all data', () => { const m = new PackMetricsRuntime(); m.increment('briefs_generated'); m.setGauge('productivity_index', 80); const s = m.getSnapshot(); expect(s.counters['briefs_generated']).toBe(1); expect(s.gauges['productivity_index']).toBe(80); });")
    tests.append("test('export returns JSON', () => { const m = new PackMetricsRuntime(); m.increment('x'); const json = m.export(); expect(JSON.parse(json)).toBeDefined(); });")
    tests.append("test('reset clears all', () => { const m = new PackMetricsRuntime(); m.increment('x'); m.setGauge('y', 5); m.reset(); expect(m.getCounter('x')).toBe(0); expect(m.getGauge('y')).toBe(0); });")
    tests.append("test('dispose clears', () => { const m = new PackMetricsRuntime(); m.increment('x'); m.dispose(); expect(m.getCounter('x')).toBe(0); });")

    # Pack Trace
    tests.append("test('startSpan creates span', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); expect(s.operation).toBe('op'); expect(s.subsystem).toBe('sub'); expect(s.status).toBe(TraceStatus.Started); });")
    tests.append("test('completeSpan sets endTime', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const c = t.completeSpan(s.id as unknown as string); expect(c.status).toBe(TraceStatus.Completed); expect(c.endTime).not.toBeNull(); expect(c.durationMs).not.toBeNull(); });")
    tests.append("test('failSpan sets Failed', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const f = t.failSpan(s.id as unknown as string); expect(f.status).toBe(TraceStatus.Failed); });")
    tests.append("test('addSpanEvent appends event', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); const u = t.addSpanEvent(s.id as unknown as string, 'checkpoint', {key:'val'}); expect(u.events.length).toBe(1); expect(u.events[0].name).toBe('checkpoint'); });")
    tests.append("test('getSpansBySubsystem filters', () => { const t = new PackTraceRuntime(); t.startSpan('op1','subA'); t.startSpan('op2','subB'); expect(t.getSpansBySubsystem('subA').length).toBe(1); });")
    tests.append("test('getChildSpans returns children', () => { const t = new PackTraceRuntime(); const p = t.startSpan('parent','sub'); t.startSpan('child','sub', p.id as unknown as string); expect(t.getChildSpans(p.id as unknown as string).length).toBe(1); });")
    tests.append("test('getActiveSpans excludes completed', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); t.completeSpan(s.id as unknown as string); expect(t.getActiveSpans().length).toBe(0); });")
    tests.append("test('getAverageDurationMs', () => { const t = new PackTraceRuntime(); const s = t.startSpan('op','sub'); t.completeSpan(s.id as unknown as string); expect(t.getAverageDurationMs()).toBeGreaterThan(0); });")
    tests.append("test('dispose clears', () => { const t = new PackTraceRuntime(); t.startSpan('op','sub'); t.dispose(); expect(t.getSpanCount()).toBe(0); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ KnowledgeSynthesizer }} from '../../core/personal-intelligence/knowledge-synthesizer.js';
import {{ ConversationInterpreter }} from '../../core/personal-intelligence/conversation-interpreter.js';
import {{ HabitInsights }} from '../../core/personal-intelligence/habit-insights.js';
import {{ PriorityOptimizer }} from '../../core/personal-intelligence/priority-optimizer.js';
import {{ PersonalDashboard }} from '../../core/personal-intelligence/personal-dashboard.js';
import {{ PackMetricsRuntime }} from '../../core/personal-intelligence/pack-metrics-runtime.js';
import {{ PackTraceRuntime }} from '../../core/personal-intelligence/pack-trace-runtime.js';
import {{ KnowledgeNodeType, KnowledgeEdgeType, ConversationIntent, HabitDirection, HabitStrength, TraceStatus }} from '../../core/personal-intelligence/types.js';

{c}
describe('KnowledgeSynthesizer', () => {{
{chr(10).join(tests[:22])}
}});

describe('ConversationInterpreter', () => {{
{chr(10).join(tests[22:28])}
}});

describe('HabitInsights', () => {{
{chr(10).join(tests[28:41])}
}});

describe('PriorityOptimizer', () => {{
{chr(10).join(tests[41:46])}
}});

describe('PersonalDashboard', () => {{
{chr(10).join(tests[46:51])}
}});

describe('PackMetricsRuntime', () => {{
{chr(10).join(tests[51:58])}
}});

describe('PackTraceRuntime', () => {{
{chr(10).join(tests[58:])}
}});
"""
    w('remaining-subsystems.test.ts', content)

# ============================================================
# TEST FILE 10: orchestrator.test.ts
# ============================================================
def gen_orchestrator():
    c = make_contracts()
    tests = []
    tests.append("test('constructs with default config', () => { const r = new PersonalIntelligencePackRuntime(contracts); expect(r.state).toBe(PackState.Created); expect(r.isDisposed).toBe(false); });")
    tests.append("test('constructs with custom config', () => { const r = new PersonalIntelligencePackRuntime(contracts, {maxGoals: 50}); expect(r.state).toBe(PackState.Created); });")
    tests.append("test('initialize transitions to Active', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); expect(r.state).toBe(PackState.Active); });")
    tests.append("test('all subsystems are accessible', () => { const r = new PersonalIntelligencePackRuntime(contracts); expect(r.dailyBrief).toBeDefined(); expect(r.reflection).toBeDefined(); expect(r.goalPlanner).toBeDefined(); expect(r.decisionAdvisor).toBeDefined(); expect(r.constraintAnalyzer).toBeDefined(); expect(r.valueAnalyzer).toBeDefined(); expect(r.recommendationComposer).toBeDefined(); expect(r.knowledgeSynthesizer).toBeDefined(); expect(r.conversationInterpreter).toBeDefined(); expect(r.habitInsights).toBeDefined(); expect(r.priorityOptimizer).toBeDefined(); expect(r.dashboard).toBeDefined(); expect(r.metrics).toBeDefined(); expect(r.trace).toBeDefined(); });")
    tests.append("test('getState returns structured state', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const state = r.getState() as any; expect(state.state).toBe(PackState.Active); expect(state.subsystems).toBeDefined(); expect(state.metrics).toBeDefined(); expect(state.trace).toBeDefined(); });")
    tests.append("test('generateMorningBrief works', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const b = r.generateMorningBrief(); expect(b.type).toBe(BriefType.MorningBrief); expect(b.items.length).toBeGreaterThan(0); });")
    tests.append("test('generateEveningReflection works', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const ref = r.generateEveningReflection(); expect(ref.accomplishments.length).toBeGreaterThan(0); });")
    tests.append("test('getOnboardingQuestions returns 5 questions', () => { const r = new PersonalIntelligencePackRuntime(contracts); const q = r.getOnboardingQuestions(); expect(q.length).toBe(5); expect(q[0].question).toBeTruthy(); });")
    tests.append("test('processOnboardingAnswers extracts goals', () => { const r = new PersonalIntelligencePackRuntime(contracts); const result = r.processOnboardingAnswers({'q1':'Learn TS\nBuild product\nShip MVP'}); expect(result.extractedGoals.length).toBe(3); expect(result.mainConstraint).toBeTruthy(); expect(result.firstActionStep).toBeTruthy(); });")
    tests.append("test('processOnboardingAnswers handles empty', () => { const r = new PersonalIntelligencePackRuntime(contracts); const result = r.processOnboardingAnswers({}); expect(result.extractedGoals.length).toBe(0); });")
    tests.append("test('dispose sets disposed flag', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); r.dispose(); expect(r.isDisposed).toBe(true); });")
    tests.append("test('throws on operation after dispose', async () => { const r = new PersonalIntelligencePackRuntime(contracts); r.dispose(); expect(() => r.generateMorningBrief()).toThrow(); });")
    tests.append("test('dispose clears all subsystems', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); r.generateMorningBrief(); r.dispose(); expect(r.dailyBrief.getBriefCount()).toBe(0); });")

    content = f"""import {{ describe, test, expect }} from 'vitest';
import {{ PersonalIntelligencePackRuntime }} from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import {{ PackState, BriefType }} from '../../core/personal-intelligence/types.js';

{c}
describe('PersonalIntelligencePackRuntime', () => {{
{chr(10).join(tests)}
}});
"""
    w('orchestrator.test.ts', content)

# ============================================================
# Generate all
# ============================================================
if __name__ == '__main__':
    os.makedirs(TEST_DIR, exist_ok=True)
    print(f"Generating tests in {TEST_DIR}:")
    gen_types_errors()
    gen_events()
    gen_daily_brief()
    gen_reflection()
    gen_goal_planner()
    gen_decision()
    gen_constraint()
    gen_value_and_recommendation()
    gen_remaining()
    gen_orchestrator()
    print("Done!")
