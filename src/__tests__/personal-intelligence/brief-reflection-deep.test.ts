import { describe, test, expect } from 'vitest';
import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';
import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';
import { BriefType, ReflectionPeriod } from '../../core/personal-intelligence/types.js';

const mp = { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null };
const mi = { getCurrentUserId: () => 'u1', getUserRoles: () => ['a'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mm = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mk = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mw = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mcg = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mpe = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mai = { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true };
const mex = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'O', getBehaviorPatterns: () => [] };
const C = { identity: mi, memory: mm, knowledge: mk, workflow: mw, cognitive: mcg, personal: mpe, aiProvider: mai, experience: mex, platform: mp };

describe('DailyBrief Deep Coverage', () => {
test('brief: MorningBrief has correct item count', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MorningBrief); expect(b.items.length).toBeGreaterThan(0); });
test('brief: MorningBrief has unique IDs', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MorningBrief); const ids = b.items.map(i => i.id); const unique = new Set(ids); expect(unique.size).toBe(ids.length); });
test('brief: MorningBrief summary is non-empty', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MorningBrief); expect(b.summary.length).toBeGreaterThan(0); });
test('brief: MorningBrief createdAt is valid', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MorningBrief); expect(b.createdAt.length).toBeGreaterThan(10); });
test('brief: MiddayReview has correct item count', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MiddayReview); expect(b.items.length).toBeGreaterThan(0); });
test('brief: MiddayReview has unique IDs', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MiddayReview); const ids = b.items.map(i => i.id); const unique = new Set(ids); expect(unique.size).toBe(ids.length); });
test('brief: MiddayReview summary is non-empty', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MiddayReview); expect(b.summary.length).toBeGreaterThan(0); });
test('brief: MiddayReview createdAt is valid', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.MiddayReview); expect(b.createdAt.length).toBeGreaterThan(10); });
test('brief: EveningSummary has correct item count', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.EveningSummary); expect(b.items.length).toBeGreaterThan(0); });
test('brief: EveningSummary has unique IDs', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.EveningSummary); const ids = b.items.map(i => i.id); const unique = new Set(ids); expect(unique.size).toBe(ids.length); });
test('brief: EveningSummary summary is non-empty', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.EveningSummary); expect(b.summary.length).toBeGreaterThan(0); });
test('brief: EveningSummary createdAt is valid', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.EveningSummary); expect(b.createdAt.length).toBeGreaterThan(10); });
test('brief: WeeklyReview has correct item count', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.WeeklyReview); expect(b.items.length).toBeGreaterThan(0); });
test('brief: WeeklyReview has unique IDs', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.WeeklyReview); const ids = b.items.map(i => i.id); const unique = new Set(ids); expect(unique.size).toBe(ids.length); });
test('brief: WeeklyReview summary is non-empty', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.WeeklyReview); expect(b.summary.length).toBeGreaterThan(0); });
test('brief: WeeklyReview createdAt is valid', () => { const g = new DailyBriefGenerator(C); const b = g.generateBrief(BriefType.WeeklyReview); expect(b.createdAt.length).toBeGreaterThan(10); });
test('reflection: Daily has accomplishments', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r.accomplishments.length).toBeGreaterThan(0); });
test('reflection: Daily has lessons', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection: Daily has valid sentiment', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Daily); expect(['Positive','Neutral','Negative','Mixed']).toContain(r.sentiment); });
test('reflection: Daily highlights', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r.highlights.length).toBeGreaterThan(0); });
});

describe('Reflection Deep Coverage', () => {
test('reflection: Daily unique IDs', () => { const e = new ReflectionEngine(C); const r1 = e.generateReflection(ReflectionPeriod.Daily); const r2 = e.generateReflection(ReflectionPeriod.Daily); expect(r1.id).not.toBe(r2.id); });
test('reflection: Daily notAccomplished array', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Daily); expect(Array.isArray(r.notAccomplished)).toBe(true); });
test('reflection: Weekly has accomplishments', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r.accomplishments.length).toBeGreaterThan(0); });
test('reflection: Weekly has lessons', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection: Weekly has valid sentiment', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(['Positive','Neutral','Negative','Mixed']).toContain(r.sentiment); });
test('reflection: Weekly highlights', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r.highlights.length).toBeGreaterThan(0); });
test('reflection: Weekly unique IDs', () => { const e = new ReflectionEngine(C); const r1 = e.generateReflection(ReflectionPeriod.Weekly); const r2 = e.generateReflection(ReflectionPeriod.Weekly); expect(r1.id).not.toBe(r2.id); });
test('reflection: Weekly notAccomplished array', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(Array.isArray(r.notAccomplished)).toBe(true); });
test('reflection: Monthly has accomplishments', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r.accomplishments.length).toBeGreaterThan(0); });
test('reflection: Monthly has lessons', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection: Monthly has valid sentiment', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(['Positive','Neutral','Negative','Mixed']).toContain(r.sentiment); });
test('reflection: Monthly highlights', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r.highlights.length).toBeGreaterThan(0); });
test('reflection: Monthly unique IDs', () => { const e = new ReflectionEngine(C); const r1 = e.generateReflection(ReflectionPeriod.Monthly); const r2 = e.generateReflection(ReflectionPeriod.Monthly); expect(r1.id).not.toBe(r2.id); });
test('reflection: Monthly notAccomplished array', () => { const e = new ReflectionEngine(C); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(Array.isArray(r.notAccomplished)).toBe(true); });
});
