#!/usr/bin/env python3
"""Generate solution-builder tests.
"""
import os

TEST = 'src/__tests__/solution-builder'
os.makedirs(TEST, exist_ok=True)

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sb-preamble.ts')) as f:
    PREAMBLE = f.read()

def gen(name, ivar, cfg, tkey, ev, bfn, call_tmpl, n, fw):
    lines = []
    if fw:
        lines.append(PREAMBLE)
    for i in range(1, n + 1):
        call = call_tmpl.replace('{I}', str(i))
        lines.append('it("%s %d", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); const r = await s.%s(%s); expect(r).toBeDefined(); });' % (name, i, ivar, cfg, tkey, call))
    lines.append('it("%s emits event", async () => { const bus = eb(); const s = new %s(DefaultSolutionBuilderConfig.%s, bus); await s.%s(%s); expect(bus.publish).toHaveBeenCalled(); expect(bus.publish.mock.calls[0][0].eventType).toBe("%s"); });' % (name, ivar, cfg, tkey, call_tmpl.replace('{I}', '1'), ev))
    lines.append('it("%s getById null", async () => { expect(await new %s(DefaultSolutionBuilderConfig.%s, eb()).getById(%s("x"))).toBeNull(); });' % (name, ivar, cfg, bfn))
    lines.append('it("%s getBySolutionId null", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); const r = await s.getBySolutionId(sid("x")); expect(Array.isArray(r) ? r.length===0 : r===null).toBe(true); });' % (name, ivar, cfg))
    for i in range(1, 51):
        c2 = call_tmpl.replace('{I}', str(i))
        lines.append('it("%s getBySolId %d", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); await s.%s(%s); expect(await s.getBySolutionId(sid("%d"))).toBeTruthy(); });' % (name, i, ivar, cfg, tkey, c2, i))
    lines.append('it("%s list empty", async () => { expect((await new %s(DefaultSolutionBuilderConfig.%s, eb()).list()).length).toBe(0); });' % (name, ivar, cfg))
    lines.append('it("%s list after 5", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); for(let i=1;i<=5;i++) await s.%s(%s); expect((await s.list()).length).toBe(5); });' % (name, ivar, cfg, tkey, call_tmpl.replace('{I}', '1')))
    lines.append('it("%s count 0", async () => { expect(await new %s(DefaultSolutionBuilderConfig.%s, eb()).count()).toBe(0); });' % (name, ivar, cfg))
    lines.append('it("%s count after 3", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); for(let i=1;i<=3;i++) await s.%s(%s); expect(await s.count()).toBe(3); });' % (name, ivar, cfg, tkey, call_tmpl.replace('{I}', '1')))
    lines.append('it("%s frozen", async () => { const s = new %s(DefaultSolutionBuilderConfig.%s, eb()); const r = await s.%s(%s); if(Array.isArray(r)) { if(r.length>0) expect(Object.isFrozen(r[0])).toBe(true); } else expect(Object.isFrozen(r)).toBe(true); });' % (name, ivar, cfg, tkey, call_tmpl.replace('{I}', '1')))
    return '\n'.join(lines)

subsystems1 = [
    ('GI', 'GoalInterpreter', 'goalInterpreter', 'interpret', 'solution.goal.interpreted', 'brandGoalId', 'sid("s{I}"), "test goal {I}"', 80),
    ('DA', 'DomainAnalyzer', 'domainAnalyzer', 'analyze', 'solution.domain.detected', 'brandGoalId', 'sid("s{I}"), "test {I}"', 80),
    ('RE', 'RequirementExtractor', 'requirementExtractor', 'extract', 'solution.requirements.extracted', 'brandRequirementId', 'sid("s{I}"), "test req {I}", domainStub("s{I}")', 80),
    ('SP', 'SolutionPlanner', 'solutionPlanner', 'plan', 'solution.planned', 'brandBlueprintId', 'sid("s{I}"), goalStub("s{I}"), reqsEmpty, domainStub("s{I}")', 80),
    ('CS', 'CapabilitySelector', 'capabilitySelector', 'select', 'solution.capability.selected', 'brandCapabilitySelectionId', 'sid("s{I}"), bpStub("s{I}")', 80),
]
subsystems2 = [
    ('WC', 'WorkflowComposer', 'workflowComposer', 'compose', 'solution.workflow.generated', 'brandWorkflowPackageId', 'bpStub("s{I}"), bpStub("s{I}")', 80),
    ('KC', 'KnowledgeComposer', 'knowledgeComposer', 'compose', 'solution.knowledge.composed', 'brandKnowledgePackageId', 'sid("s{I}"), domainStub("s{I}")', 80),
    ('AI', 'AIConfigRuntime', 'aiConfigRuntime', 'configure', 'solution.ai.configured', 'brandAIConfigId', 'sid("s{I}")', 80),
    ('DC', 'DesktopComposer', 'desktopComposer', 'compose', 'solution.desktop.composed', 'brandDesktopConfigId', 'sid("s{I}"), domainStub("s{I}")', 80),
    ('SV', 'SolutionValidator', 'solutionValidator', 'validate', 'solution.validation.completed', 'brandValidationReportId', 'sid("s{I}"), minManifest("s{I}")', 80),
]
subsystems3 = [
    ('SO', 'SolutionOptimizer', 'solutionOptimizer', 'optimize', 'solution.optimization.completed', 'brandOptimizationReportId', 'sid("s{I}"), minManifest("s{I}")', 80),
    ('DP', 'DeploymentPlanner', 'deploymentPlanner', 'plan', 'solution.deployment.planned', 'brandDeploymentPlanId', 'sid("s{I}"), minManifest("s{I}")', 80),
    ('LM', 'LifecycleManager', 'lifecycleManager', 'create', 'solution.state.changed', 'brandGoalId', '"sol{I}", "1.0.0", "desc {I}"', 80),
    ('SC', 'SolutionCatalog', 'solutionCatalog', 'add', 'solution.catalog.added', 'brandCatalogEntryId', 'sid("s{I}"), "name {I}", "desc {I}", "1.0.0", "cat")', 80),
    ('SR', 'SolutionRuntime', 'SolutionRuntime', 'build', 'solution.build.completed', 'brandGoalId', '"test {I}"', 50),
]

def write_batch(filename, subs):
    total = 0
    content_parts = []
    for idx, (nm, ivar, cfg, tkey, ev, bfn, call_tmpl, n) in enumerate(subs):
        part = gen(nm, ivar, cfg, tkey, ev, bfn, call_tmpl, n, idx == 0)
        content_parts.append(part)
        tc = part.count('it(')
        total += tc
        print('  %s: %d' % (nm, tc))
    with open(os.path.join(TEST, filename), 'w') as f:
        f.write('\n'.join(content_parts))
    return total

t1 = write_batch('subsystems-batch1.test.ts', subsystems1)
t2 = write_batch('subsystems-batch2.test.ts', subsystems2)
t3 = write_batch('subsystems-batch3.test.ts', subsystems3)
print('TOTAL: %d' % (t1 + t2 + t3))
