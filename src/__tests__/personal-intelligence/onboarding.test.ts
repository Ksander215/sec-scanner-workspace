import { describe, test, expect } from 'vitest';
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import { PackState, BriefType, OnboardingCategory } from '../../core/personal-intelligence/types.js';

const mp = { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null };
const mi = { getCurrentUserId: () => 'u1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mm = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mk = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mw = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mcg = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mpe = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mai = { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true };
const mex = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] };
const C = { identity: mi, memory: mm, knowledge: mk, workflow: mw, cognitive: mcg, personal: mpe, aiProvider: mai, experience: mex, platform: mp };

describe('Onboarding & First Intelligence', () => {
  test('onboarding: 5 questions returned', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q.length).toBe(5);
  });

  test('onboarding: question 1 is about goals and required', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q[0].category).toBe(OnboardingCategory.Goals);
    expect(q[0].required).toBe(true);
  });

  test('onboarding: question 2 is about current projects and required', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q[1].category).toBe(OnboardingCategory.CurrentProjects);
    expect(q[1].required).toBe(true);
  });

  test('onboarding: question 3 is about habits and required', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q[2].category).toBe(OnboardingCategory.Habits);
    expect(q[2].required).toBe(true);
  });

  test('onboarding: question 4 is about challenges and required', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q[3].category).toBe(OnboardingCategory.Challenges);
    expect(q[3].required).toBe(true);
  });

  test('onboarding: question 5 is about values and not required', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    expect(q[4].category).toBe(OnboardingCategory.Values);
    expect(q[4].required).toBe(false);
  });

  test('onboarding: all questions have follow-ups', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    for (const question of q) {
      expect(question.followUps.length).toBeGreaterThan(0);
    }
  });

  test('onboarding: questions have unique IDs', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    const ids = q.map(q => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('onboarding: questions have question text', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const q = r.getOnboardingQuestions();
    for (const question of q) {
      expect(question.question.length).toBeGreaterThan(0);
    }
  });

  test('processOnboardingAnswers: extracts goals from newline-separated', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q1: 'Ship product\nHire team\nGet funding' });
    expect(result.extractedGoals.length).toBe(3);
    expect(result.extractedGoals[0]).toContain('Ship product');
    expect(result.extractedGoals[1]).toContain('Hire team');
    expect(result.extractedGoals[2]).toContain('Get funding');
  });

  test('processOnboardingAnswers: extracts from comma-separated', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q1: 'Goal 1, Goal 2, Goal 3' });
    expect(result.extractedGoals.length).toBe(3);
  });

  test('processOnboardingAnswers: extracts projects', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q2: 'Project Alpha\nProject Beta' });
    expect(result.extractedProjects.length).toBe(2);
  });

  test('processOnboardingAnswers: extracts challenges', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q4: 'Too much context switching\nNot enough focus time' });
    expect(result.extractedChallenges.length).toBe(2);
    expect(result.mainConstraint).toBe('Too much context switching');
  });

  test('processOnboardingAnswers: empty answers', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({});
    expect(result.extractedGoals.length).toBe(0);
    expect(result.extractedProjects.length).toBe(0);
    expect(result.extractedChallenges.length).toBe(0);
    expect(result.firstActionStep).toBeTruthy();
  });

  test('processOnboardingAnswers: value proposition is generated', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q1: 'Build startup', q4: 'No time' });
    expect(result.valueProposition).toBeTruthy();
    expect(result.valueProposition.length).toBeGreaterThan(10);
  });

  test('processOnboardingAnswers: first action step is generated', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q4: 'Procrastination' });
    expect(result.firstActionStep).toContain('Procrastination');
  });

  test('processOnboardingAnswers: results are frozen', () => {
    const r = new PersonalIntelligencePackRuntime(C);
    const result = r.processOnboardingAnswers({ q1: 'G1', q2: 'P1', q3: 'H1', q4: 'C1' });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('full workflow: onboarding -> morning brief -> evening reflection', async () => {
    const r = new PersonalIntelligencePackRuntime(C);
    await r.initialize();
    const questions = r.getOnboardingQuestions();
    const answers = r.processOnboardingAnswers({ q1: 'Launch v1\nGet 100 users', q2: 'AIS Platform', q3: 'Morning review', q4: 'Scope creep' });
    expect(answers.extractedGoals.length).toBe(2);
    expect(answers.mainConstraint).toBe('Scope creep');
    const brief = r.generateMorningBrief();
    expect(brief.type).toBe(BriefType.MorningBrief);
    const reflection = r.generateEveningReflection();
    expect(reflection.accomplishments.length).toBeGreaterThan(0);
    const state = r.getState() as any;
    expect(state.state).toBe(PackState.Active);
  });
});
