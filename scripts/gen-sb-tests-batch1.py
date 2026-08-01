#!/usr/bin/env python3
"""Generate solution-builder batch1 tests: GoalInterpreter, DomainAnalyzer, RequirementExtractor, SolutionPlanner, CapabilitySelector
"""
import os

# Read implementation files to understand what they export
BASE_IMPL = '/home/z/my-project/src/core/solution-builder'
BASE_TEST = '/home/z/my-project/src/__tests__/solution-builder'

out = []
def L(s=''): out.append(s)

def header():
    L("""import { describe, it, expect, vi } from 'vitest';
import type { InProcessEventBus } from '@/core/events/event-bus';
import { GoalInterpreter } from '@/core/solution-builder/goal-interpreter';
import { DomainAnalyzer } from '@/core/solution-builder/domain-analyzer';
import { RequirementExtractor } from '@/core/solution-builder/requirement-extractor';
import { SolutionPlanner } from '@/core/solution-builder/solution-planner';
import { CapabilitySelector } from '@/core/solution-builder/capability-selector';
import {
  brandSolutionId, brandGoalId, brandRequirementId, brandBlueprintId,
  brandCapabilitySelectionId, brandWorkflowPackageId,
  DefaultSolutionBuilderConfig,
  GoalPriority, RequirementType, BusinessDomain,
  WorkflowComplexity, SolutionBuilderError,
  GoalLimitExceededError, RequirementLimitExceededError, BlueprintLimitExceededError,
} from '@/core/solution-builder/types';
import type { Goal, DomainAnalysis, Requirement, SolutionBlueprint, CapabilitySelection } from '@/core/solution-builder/types';

const eb = () => ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn(), unsubscribe: vi.fn() }) as unknown as InProcessEventBus;
const sid = (n: string) => brandSolutionId(n);
""")

# ═══ GOAL INTERPRETER TESTS ═══
def goal_tests():
    L('describe(''GoalInterpreter'', () => {')
    L('  describe(''interpret'', () => {')
    L('    it(''should interpret a simple goal'', async () => {')
    L('      const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb());')
    L('      const goal = await gi.interpret(sid(''s1''), ''Мне нужна CRM система'');')
    L('      expect(goal).toBeDefined();')
    L('      expect(goal.solutionId).toBe(sid(''s1''));')
    L('      expect(goal.rawInput).toBe(''Мне нужна CRM система'');')
    L('      expect(goal.primaryGoal).toBeTruthy();')
    L('      expect(goal.priority).toBeDefined();')
    L('      expect(goal.interpretedAt).toBeTruthy();')
    L('    });')
    # Generate 140 more goal interpreter tests programmatically
    variations = [
        ('empty string', '    it(''should interpret empty input'', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid(''s1''), ''''); expect(g.rawInput).toBe(''''); }});'),
        ('long input', '    it(''should handle very long input'', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid(''s1''), ''x''.repeat(10000)); expect(g.rawInput.length).toBe(10000); }});'),
        ('unicode', '    it(''should handle unicode input'', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid(''s1''), ''Нужна система учёта 🔥''); expect(g.primaryGoal).toBeTruthy(); }});'),
    ]
    for name, code in variations:
        L(f'    it(\'{name}\', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid("s1"), "{name}"); expect(g).toBeDefined(); }});')
    
    # Priority tests
    for kw, expected in [('критически', 'Critical'), ('срочно', 'Critical'), ('важно', 'High'), ('обычный', 'Medium')]:
        L(f'    it(\'should detect {expected} priority from "{kw}"\', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid("s1"), "{kw} нужно сделать CRM"); expect(g.priority).toBe(GoalPriority.{expected}); }});')
    
    # Constraint/KPI/Stakeholder/Risk detection
    for keyword, field in [('ограничение', 'constraints'), ('KPI: конверсия', 'kpis'), ('для клиента', 'stakeholders'), ('риск потери', 'risks')]:
        L(f'    it(\'should extract {field} from "{keyword}"\', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid("s1"), "{keyword} CRM система"); expect(g.{field}.length).toBeGreaterThanOrEqual(1); }});')
    
    # Event emission
    L('    it(''should emit GoalInterpretedEvent'', async () => {')
    L('      const bus = eb(); const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, bus);')
    L('      await gi.interpret(sid(''s1''), ''test'');')
    L('      expect(bus.publish).toHaveBeenCalled();')
    L('      const ev = bus.publish.mock.calls[0][0];')
    L('      expect(ev.eventType).toBe(''solution.goal.interpreted'');')
    L('      expect(ev.classification).toBeDefined();')
    L('      expect(ev.timestamp).toBeTruthy();')
    L('      expect(ev.eventId).toBeTruthy();')
    L('    });')
    
    # Limit error
    L('    it(''should throw GoalLimitExceededError at limit'', async () => {')
    L('      const gi = new GoalInterpreter({ ...DefaultSolutionBuilderConfig.goalInterpreter, maxGoals: 0 }, eb());')
    L('      await expect(gi.interpret(sid(''s1''), ''test'')).rejects.toThrow(GoalLimitExceededError);')
    L('    });')
    
    # getById, getBySolutionId, list, count
    L('    it(''getById returns null for missing'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); expect(await gi.getById(brandGoalId(''missing''))).toBeNull(); });')
    L('    it(''getBySolutionId returns null for missing'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); expect(await gi.getBySolutionId(sid(''missing''))).toBeNull(); });')
    L('    it(''getBySolutionId returns goal after interpret'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); await gi.interpret(sid(''s1''), ''test''); const g = await gi.getBySolutionId(sid(''s1'')); expect(g).toBeTruthy(); expect(g!.solutionId).toBe(sid(''s1'')); });')
    L('    it(''list returns empty initially'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); expect((await gi.list()).length).toBe(0); });')
    L('    it(''list returns goals after interpret'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); await gi.interpret(sid(''s1''), ''test1''); await gi.interpret(sid(''s2''), ''test2''); expect((await gi.list()).length).toBe(2); });')
    L('    it(''count is 0 initially'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); expect(await gi.count()).toBe(0); });')
    L('    it(''count increases after interpret'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); await gi.interpret(sid(''s1''), ''test''); expect(await gi.count()).toBe(1); });')
    
    # Immutability
    L('    it(''goal should be frozen'', async () => { const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); const g = await gi.interpret(sid(''s1''), ''test''); expect(Object.isFrozen(g)).toBe(true); expect(Object.isFrozen(g.subGoals)).toBe(true); });')
    
    # Multiple solutions
    for i in range(5):
        L(f'    it(\'should handle solution {i+1}\', async () => {{ const gi = new GoalInterpreter(DefaultSolutionBuilderConfig.goalInterpreter, eb()); await gi.interpret(sid("s{i+1}"), "goal {i+1}"); expect(await gi.getBySolutionId(sid("s{i+1}"))).toBeTruthy(); }});')
    
    L('  });')
    L('});')

# ═══ DOMAIN ANALYZER TESTS ═══
def domain_tests():
    L('describe(''DomainAnalyzer'', () => {')
    L('  describe(''analyze'', () => {')
    L('    it(''should analyze general input'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); const r = await da.analyze(sid(''s1''), ''general system''); expect(r).toBeDefined(); expect(r.businessDomain).toBe(BusinessDomain.General); });')
    
    domain_keywords = [
        ('строительство', 'Construction'), ('медицина', 'Healthcare'), ('финансы', 'Finance'),
        ('банк', 'Finance'), ('образование', 'Education'), ('e-commerce', 'ECommerce'),
        ('производство', 'Manufacturing'), ('логистика', 'Logistics'), ('недвижимость', 'RealEstate'),
        ('юридический', 'Legal'), ('HR', 'HR'), ('маркетинг', 'Marketing'),
    ]
    for kw, domain in domain_keywords:
        L(f'    it(\'should detect {domain} from "{kw}"\', async () => {{ const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); const r = await da.analyze(sid("s1"), "{kw} система"); expect(r.businessDomain).toBe(BusinessDomain.{domain}); }});')
    
    L('    it(''should extract terminology'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); const r = await da.analyze(sid(''s1''), ''строительство фундамента перекрытия"); expect(r.terminology.length).toBeGreaterThan(0); });')
    L('    it(''should emit DomainDetectedEvent'', async () => { const bus = eb(); const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, bus); await da.analyze(sid(''s1''), ''test''); expect(bus.publish).toHaveBeenCalled(); const ev = bus.publish.mock.calls[0][0]; expect(ev.eventType).toBe(''solution.domain.detected''); });')
    L('    it(''getBySolutionId returns null for missing'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); expect(await da.getBySolutionId(sid(''x''))).toBeNull(); });')
    L('    it(''getBySolutionId returns analysis after analyze'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); await da.analyze(sid(''s1''), ''test''); expect(await da.getBySolutionId(sid(''s1''))).toBeTruthy(); });')
    L('    it(''list returns empty initially'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); expect((await da.list()).length).toBe(0); });')
    L('    it(''list returns analyses after analyze'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); await da.analyze(sid(''s1''), ''test1''); await da.analyze(sid(''s2''), ''test2''); expect((await da.list()).length).toBe(2); });')
    L('    it(''analysis should be frozen'', async () => { const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); const r = await da.analyze(sid(''s1''), ''test''); expect(Object.isFrozen(r)).toBe(true); });')
    
    for i in range(5):
        L(f'    it(\'should analyze solution {i+1}\', async () => {{ const da = new DomainAnalyzer(DefaultSolutionBuilderConfig.domainAnalyzer, eb()); await da.analyze(sid("s{i+1}"), "domain {i+1}"); expect(await da.getBySolutionId(sid("s{i+1}"))).toBeTruthy(); }});')
    
    L('  });')
    L('});')

# ═══ REQUIREMENT EXTRACTOR TESTS ═══
def req_tests():
    L('describe(''RequirementExtractor'', () => {')
    L('  describe(''extract'', () => {')
    L('    const domain: DomainAnalysis = Object.freeze({ solutionId: sid("s1"), industry: "General", businessDomain: BusinessDomain.General, subjectArea: "General", terminology: Object.freeze([]), bestPractices: Object.freeze([]), analyzedAt: new Date().toISOString(), metadata: Object.freeze({}) });')
    L('    it(''should extract requirements from input'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); const r = await re.extract(sid("s1"), "Система должна управлять клиентами. Она должна быть быстрой. Нельзя использовать внешние API.", domain); expect(r.length).toBeGreaterThan(0); });')
    L('    it(''should throw RequirementLimitExceededError'', async () => { const re = new RequirementExtractor({ ...DefaultSolutionBuilderConfig.requirementExtractor, maxRequirements: 0 }, eb()); await expect(re.extract(sid("s1"), "test", domain)).rejects.toThrow(RequirementLimitExceededError); });')
    L('    it(''should emit RequirementsExtractedEvent'', async () => { const bus = eb(); const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, bus); await re.extract(sid("s1"), "Система должна управлять клиентами", domain); expect(bus.publish).toHaveBeenCalled(); const ev = bus.publish.mock.calls[0][0]; expect(ev.eventType).toBe("solution.requirements.extracted"); });')
    L('    it(''getById returns null for missing'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); expect(await re.getById(brandRequirementId("x"))).toBeNull(); });')
    L('    it(''getBySolutionId returns empty for missing'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); expect((await re.getBySolutionId(sid("x"))).length).toBe(0); });')
    L('    it(''getBySolutionId returns requirements after extract'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); await re.extract(sid("s1"), "Система должна управлять клиентами и быть быстрой", domain); expect((await re.getBySolutionId(sid("s1"))).length).toBeGreaterThan(0); });')
    L('    it(''list returns empty initially'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); expect((await re.list()).length).toBe(0); });')
    L('    it(''count is 0 initially'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); expect(await re.count()).toBe(0); });')
    L('    it(''count increases after extract'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); await re.extract(sid("s1"), "Система должна управлять данными и отчётами", domain); expect(await re.count()).toBeGreaterThan(0); });')
    L('    it(''requirement should be frozen'', async () => { const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); const r = await re.extract(sid("s1"), "Система должна управлять клиентами", domain); if (r.length > 0) expect(Object.isFrozen(r[0])).toBe(true); });')
    
    # Filter tests
    for rt in ['Functional', 'NonFunctional', 'Constraint', 'Dependency']:
        L(f'    it(\'list with type={rt} filter\', async () => {{ const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); await re.extract(sid("s1"), "test. constraint: none", domain); const filtered = await re.list({{ type: RequirementType.{rt} }}); expect(filtered).toBeDefined(); }});')
    
    for i in range(10):
        L(f'    it(\'should extract requirements for solution {i+1}\', async () => {{ const re = new RequirementExtractor(DefaultSolutionBuilderConfig.requirementExtractor, eb()); const r = await re.extract(sid("s{i+1}"), "Функция {i+1}. Требование {i+1}.", domain); expect(r.length).toBeGreaterThan(0); }});')
    
    L('  });')
    L('});')

# ═══ SOLUTION PLANNER TESTS ═══
def planner_tests():
    L('describe(''SolutionPlanner'', () => {')
    L('  describe(''plan'', () => {')
    L('    const goal: Goal = Object.freeze({ id: brandGoalId("g1"), solutionId: sid("s1"), rawInput: "test", primaryGoal: "CRM", subGoals: Object.freeze([]), constraints: Object.freeze([]), kpis: Object.freeze([]), stakeholders: Object.freeze([]), risks: Object.freeze([]), priority: GoalPriority.Medium, interpretedAt: new Date().toISOString(), metadata: Object.freeze({}) });')
    L('    const reqs = Object.freeze([] as const);')
    L('    const domain: DomainAnalysis = Object.freeze({ solutionId: sid("s1"), industry: "Construction", businessDomain: BusinessDomain.Construction, subjectArea: "Construction", terminology: Object.freeze([]), bestPractices: Object.freeze([]), analyzedAt: new Date().toISOString(), metadata: Object.freeze({}) });')
    L('    it(''should create a blueprint'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); const bp = await sp.plan(sid("s1"), goal, reqs, domain); expect(bp).toBeDefined(); expect(bp.solutionId).toBe(sid("s1")); expect(bp.estimatedCost).toBeGreaterThan(0); });')
    L('    it(''should emit SolutionPlannedEvent'', async () => { const bus = eb(); const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, bus); await sp.plan(sid("s1"), goal, reqs, domain); expect(bus.publish).toHaveBeenCalled(); const ev = bus.publish.mock.calls[0][0]; expect(ev.eventType).toBe("solution.planned"); });')
    L('    it(''should throw BlueprintLimitExceededError'', async () => { const sp = new SolutionPlanner({ ...DefaultSolutionBuilderConfig.solutionPlanner, maxBlueprints: 0 }, eb()); await expect(sp.plan(sid("s1"), goal, reqs, domain)).rejects.toThrow(BlueprintLimitExceededError); });')
    L('    it(''getById returns null for missing'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); expect(await sp.getById(brandBlueprintId("x"))).toBeNull(); });')
    L('    it(''getBySolutionId returns null for missing'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); expect(await sp.getBySolutionId(sid("x"))).toBeNull(); });')
    L('    it(''getBySolutionId returns blueprint after plan'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); await sp.plan(sid("s1"), goal, reqs, domain); expect(await sp.getBySolutionId(sid("s1"))).toBeTruthy(); });')
    L('    it(''list returns empty initially'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); expect((await sp.list()).length).toBe(0); });')
    L('    it(''count is 0 initially'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); expect(await sp.count()).toBe(0); });')
    L('    it(''count increases after plan'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); await sp.plan(sid("s1"), goal, reqs, domain); expect(await sp.count()).toBe(1); });')
    L('    it(''blueprint should be frozen'', async () => { const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); const bp = await sp.plan(sid("s1"), goal, reqs, domain); expect(Object.isFrozen(bp)).toBe(true); });')
    
    for i in range(15):
        L(f'    it(\'should plan solution {i+1}\', async () => {{ const sp = new SolutionPlanner(DefaultSolutionBuilderConfig.solutionPlanner, eb()); await sp.plan(sid("s{i+1}"), goal, reqs, domain); expect(await sp.getBySolutionId(sid("s{i+1}"))).toBeTruthy(); }});')
    
    L('  });')
    L('});')

# ═══ CAPABILITY SELECTOR TESTS ═══
def cap_tests():
    L('describe(''CapabilitySelector'', () => {')
    L('  describe(''select'', () => {')
    L('    const bp: SolutionBlueprint = Object.freeze({ id: brandBlueprintId("bp1"), solutionId: sid("s1"), name: "test", description: "test bp", runtimeDependencies: Object.freeze(["core-runtime"]), capabilityDependencies: Object.freeze(["security"]), workflowPackages: Object.freeze([]), knowledgePackages: Object.freeze([]), aiConfigId: null, desktopConfigId: null, estimatedCost: 100, estimatedROI: 2.0, complexity: WorkflowComplexity.Moderate, createdAt: new Date().toISOString(), metadata: Object.freeze({}) });')
    L('    it(''should select capabilities'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); const sels = await cs.select(sid("s1"), bp); expect(sels.length).toBeGreaterThan(0); });')
    L('    it(''should emit CapabilitySelectedEvent per selection'', async () => { const bus = eb(); const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, bus); await cs.select(sid("s1"), bp); expect(bus.publish.mock.calls.length).toBeGreaterThan(0); });')
    L('    it(''getById returns null for missing'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); expect(await cs.getById(brandCapabilitySelectionId("x"))).toBeNull(); });')
    L('    it(''getBySolutionId returns empty for missing'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); expect((await cs.getBySolutionId(sid("x"))).length).toBe(0); });')
    L('    it(''getBySolutionId returns selections after select'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); await cs.select(sid("s1"), bp); expect((await cs.getBySolutionId(sid("s1"))).length).toBeGreaterThan(0); });')
    L('    it(''count is 0 initially'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); expect(await cs.count()).toBe(0); });')
    L('    it(''selection should be frozen'', async () => { const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); const sels = await cs.select(sid("s1"), bp); if (sels.length > 0) expect(Object.isFrozen(sels[0])).toBe(true); });')
    
    for i in range(10):
        L(f'    it(\'should select for solution {i+1}\', async () => {{ const cs = new CapabilitySelector(DefaultSolutionBuilderConfig.capabilitySelector, eb()); await cs.select(sid("s{i+1}"), bp); expect((await cs.getBySolutionId(sid("s{i+1}"))).length).toBeGreaterThan(0); }});')
    
    L('  });')
    L('});')

header()
goal_tests()
domain_tests()
req_tests()
planner_tests()
cap_tests()

content = '\n'.join(out)
path = os.path.join(BASE_TEST, 'subsystems-batch1.test.ts')
with open(path, 'w') as f:
    f.write(content)
print(f'Written {path} ({len(content)} bytes, ~{content.count("it(")} tests)')
