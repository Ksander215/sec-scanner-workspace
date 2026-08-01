import { describe, test, expect } from 'vitest';
import { GoalPlanner } from '../../core/personal-intelligence/goal-planner.js';
import { GoalLevel, GoalStatus } from '../../core/personal-intelligence/types.js';
import { GoalNotFoundError, GoalValidationError } from '../../core/personal-intelligence/errors.js';

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

describe('GoalPlanner', () => {
test('creates Vision goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Vision', level: GoalLevel.Vision }); expect(g.title).toBe('My Vision'); expect(g.level).toBe(GoalLevel.Vision); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Vision with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Vision }); expect(g.description).toBe('D'); });
test('creates Vision with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Vision, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Vision with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Vision, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Vision with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Vision, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Vision', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Vision }); expect(p.getGoalsByLevel(GoalLevel.Vision).length).toBe(1); });
test('creates Goals goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Goals', level: GoalLevel.Goals }); expect(g.title).toBe('My Goals'); expect(g.level).toBe(GoalLevel.Goals); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Goals with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Goals }); expect(g.description).toBe('D'); });
test('creates Goals with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Goals, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Goals with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Goals, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Goals with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Goals, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Goals', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Goals }); expect(p.getGoalsByLevel(GoalLevel.Goals).length).toBe(1); });
test('creates Projects goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Projects', level: GoalLevel.Projects }); expect(g.title).toBe('My Projects'); expect(g.level).toBe(GoalLevel.Projects); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Projects with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Projects }); expect(g.description).toBe('D'); });
test('creates Projects with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Projects, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Projects with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Projects, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Projects with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Projects, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Projects', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Projects }); expect(p.getGoalsByLevel(GoalLevel.Projects).length).toBe(1); });
test('creates Milestones goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Milestones', level: GoalLevel.Milestones }); expect(g.title).toBe('My Milestones'); expect(g.level).toBe(GoalLevel.Milestones); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Milestones with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Milestones }); expect(g.description).toBe('D'); });
test('creates Milestones with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Milestones, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Milestones with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Milestones, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Milestones with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Milestones, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Milestones', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Milestones }); expect(p.getGoalsByLevel(GoalLevel.Milestones).length).toBe(1); });
test('creates Tasks goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Tasks', level: GoalLevel.Tasks }); expect(g.title).toBe('My Tasks'); expect(g.level).toBe(GoalLevel.Tasks); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Tasks with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Tasks }); expect(g.description).toBe('D'); });
test('creates Tasks with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Tasks, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Tasks with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Tasks, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Tasks with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Tasks, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Tasks', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Tasks }); expect(p.getGoalsByLevel(GoalLevel.Tasks).length).toBe(1); });
test('creates Actions goal', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'My Actions', level: GoalLevel.Actions }); expect(g.title).toBe('My Actions'); expect(g.level).toBe(GoalLevel.Actions); expect(g.status).toBe(GoalStatus.Draft); expect(g.progress).toBe(0); expect(g.id).toBeDefined(); });
test('creates Actions with description', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', description: 'D', level: GoalLevel.Actions }); expect(g.description).toBe('D'); });
test('creates Actions with priority', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Actions, priority: 5 }); expect(g.priority).toBe(5); });
test('creates Actions with deadline', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Actions, deadline: '2025-12-31' }); expect(g.deadline).toBe('2025-12-31'); });
test('creates Actions with tags', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({ title: 'T', level: GoalLevel.Actions, tags: ['a','b'] }); expect(g.tags).toEqual(['a','b']); });
test('getGoalsByLevel for Actions', () => { const p = new GoalPlanner(contracts); p.createGoal({ title: 'T', level: GoalLevel.Actions }); expect(p.getGoalsByLevel(GoalLevel.Actions).length).toBe(1); });
test('creates child goal with parent', () => { const p = new GoalPlanner(contracts); const parent = p.createGoal({title:'P',level:GoalLevel.Vision}); const child = p.createGoal({title:'C',level:GoalLevel.Goals,parentId:parent.id}); expect(child.parentId).toBe(parent.id); expect(p.getChildren(parent.id as unknown as string).length).toBe(1); });
test('getRootGoals returns only roots', () => { const p = new GoalPlanner(contracts); p.createGoal({title:'Root',level:GoalLevel.Vision}); p.createGoal({title:'P',level:GoalLevel.Vision}); expect(p.getRootGoals().length).toBe(2); });
test('getGoalHierarchy returns path', () => { const p = new GoalPlanner(contracts); const v = p.createGoal({title:'V',level:GoalLevel.Vision}); const g = p.createGoal({title:'G',level:GoalLevel.Goals,parentId:v.id}); const path = p.getGoalHierarchy(g.id as unknown as string); expect(path.length).toBe(2); expect(path[0].id).toBe(v.id); });
test('getDescendants returns all descendants', () => { const p = new GoalPlanner(contracts); const v = p.createGoal({title:'V',level:GoalLevel.Vision}); const g = p.createGoal({title:'G',level:GoalLevel.Goals,parentId:v.id}); const t = p.createGoal({title:'T',level:GoalLevel.Tasks,parentId:g.id}); expect(p.getDescendants(v.id as unknown as string).length).toBe(2); });
test('transitions Draft -> Active', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); const updated = p.setStatus(g.id as unknown as string, GoalStatus.Active); expect(updated.status).toBe(GoalStatus.Active); });
test('transitions Active -> InProgress', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); if ('InProgress' !== 'Active') { const updated = p.setStatus(g.id as unknown as string, GoalStatus.InProgress); expect(updated.status).toBe(GoalStatus.InProgress); } });
test('transitions InProgress -> Completed', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); p.setStatus(g.id as unknown as string, GoalStatus.InProgress); const updated = p.setStatus(g.id as unknown as string, GoalStatus.Completed); expect(updated.status).toBe(GoalStatus.Completed); expect(updated.progress).toBe(100); });
test('transitions Active -> Paused', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); if ('Paused' !== 'Active') { const updated = p.setStatus(g.id as unknown as string, GoalStatus.Paused); expect(updated.status).toBe(GoalStatus.Paused); } });
test('transitions Paused -> Active', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); p.setStatus(g.id as unknown as string, GoalStatus.Paused); const updated = p.setStatus(g.id as unknown as string, GoalStatus.Active); expect(updated.status).toBe(GoalStatus.Active); });
test('transitions Draft -> Cancelled', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); const updated = p.setStatus(g.id as unknown as string, GoalStatus.Cancelled); expect(updated.status).toBe(GoalStatus.Cancelled); });
test('throws on invalid transition Completed -> Active', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'T',level:GoalLevel.Tasks}); p.setStatus(g.id as unknown as string, GoalStatus.Active); p.setStatus(g.id as unknown as string, GoalStatus.InProgress); p.setStatus(g.id as unknown as string, GoalStatus.Completed); expect(() => p.setStatus(g.id as unknown as string, GoalStatus.Active)).toThrow(); });
test('throws on empty title', () => { const p = new GoalPlanner(contracts); expect(() => p.createGoal({title:'',level:GoalLevel.Tasks})).toThrow(GoalValidationError); });
test('throws on not found', () => { const p = new GoalPlanner(contracts); expect(() => p.getGoal('invalid')).toThrow(GoalNotFoundError); });
test('updateGoal changes title', () => { const p = new GoalPlanner(contracts); const g = p.createGoal({title:'Old',level:GoalLevel.Tasks}); const u = p.updateGoal(g.id as unknown as string,{title:'New'}); expect(u.title).toBe('New'); });
test('dispose clears goals', () => { const p = new GoalPlanner(contracts); p.createGoal({title:'T',level:GoalLevel.Tasks}); p.dispose(); expect(p.getGoalCount()).toBe(0); });
});
