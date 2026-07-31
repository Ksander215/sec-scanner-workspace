import { describe, it, expect } from 'vitest';
import {
  GoalStatus,
  GoalLevel,
  PlanPeriod,
  PredictionType,
  HabitFrequency,
  RecommendationType,
  AttentionState,
  ReflectionPeriod,
  LearningStatus,
  DecisionMethod,
  BriefType,
} from '../../../core/personal/types.js';

// ── GoalStatus ──────────────────────────────────────────────────

describe('GoalStatus', () => {
  it('has Draft value', () => {
    expect(GoalStatus.Draft).toBe('Draft');
  });

  it('has Active value', () => {
    expect(GoalStatus.Active).toBe('Active');
  });

  it('has Paused value', () => {
    expect(GoalStatus.Paused).toBe('Paused');
  });

  it('has Completed value', () => {
    expect(GoalStatus.Completed).toBe('Completed');
  });

  it('has Archived value', () => {
    expect(GoalStatus.Archived).toBe('Archived');
  });

  it('has Cancelled value', () => {
    expect(GoalStatus.Cancelled).toBe('Cancelled');
  });

  it('has 6 values', () => {
    expect(Object.keys(GoalStatus)).toHaveLength(6);
  });
});

// ── GoalLevel ───────────────────────────────────────────────────

describe('GoalLevel', () => {
  it('has Vision value', () => {
    expect(GoalLevel.Vision).toBe('Vision');
  });

  it('has Strategy value', () => {
    expect(GoalLevel.Strategy).toBe('Strategy');
  });

  it('has Goal value', () => {
    expect(GoalLevel.Goal).toBe('Goal');
  });

  it('has Objective value', () => {
    expect(GoalLevel.Objective).toBe('Objective');
  });

  it('has Task value', () => {
    expect(GoalLevel.Task).toBe('Task');
  });

  it('has 5 values', () => {
    expect(Object.keys(GoalLevel)).toHaveLength(5);
  });
});

// ── PlanPeriod ──────────────────────────────────────────────────

describe('PlanPeriod', () => {
  it('has Today value', () => {
    expect(PlanPeriod.Today).toBe('Today');
  });

  it('has Tomorrow value', () => {
    expect(PlanPeriod.Tomorrow).toBe('Tomorrow');
  });

  it('has Week value', () => {
    expect(PlanPeriod.Week).toBe('Week');
  });

  it('has Month value', () => {
    expect(PlanPeriod.Month).toBe('Month');
  });

  it('has Quarter value', () => {
    expect(PlanPeriod.Quarter).toBe('Quarter');
  });

  it('has 5 values', () => {
    expect(Object.keys(PlanPeriod)).toHaveLength(5);
  });
});

// ── PredictionType ──────────────────────────────────────────────

describe('PredictionType', () => {
  it('has NextAction value', () => {
    expect(PredictionType.NextAction).toBe('NextAction');
  });

  it('has NextTask value', () => {
    expect(PredictionType.NextTask).toBe('NextTask');
  });

  it('has NextQuestion value', () => {
    expect(PredictionType.NextQuestion).toBe('NextQuestion');
  });

  it('has NextDocument value', () => {
    expect(PredictionType.NextDocument).toBe('NextDocument');
  });

  it('has NextWorkflow value', () => {
    expect(PredictionType.NextWorkflow).toBe('NextWorkflow');
  });
});

// ── HabitFrequency ──────────────────────────────────────────────

describe('HabitFrequency', () => {
  it('has Daily value', () => {
    expect(HabitFrequency.Daily).toBe('Daily');
  });

  it('has Weekly value', () => {
    expect(HabitFrequency.Weekly).toBe('Weekly');
  });

  it('has Weekday value', () => {
    expect(HabitFrequency.Weekday).toBe('Weekday');
  });

  it('has Weekend value', () => {
    expect(HabitFrequency.Weekend).toBe('Weekend');
  });

  it('has Monthly value', () => {
    expect(HabitFrequency.Monthly).toBe('Monthly');
  });

  it('has Custom value', () => {
    expect(HabitFrequency.Custom).toBe('Custom');
  });
});

// ── RecommendationType ──────────────────────────────────────────

describe('RecommendationType', () => {
  it('has Action value', () => {
    expect(RecommendationType.Action).toBe('Action');
  });

  it('has Learning value', () => {
    expect(RecommendationType.Learning).toBe('Learning');
  });

  it('has Reminder value', () => {
    expect(RecommendationType.Reminder).toBe('Reminder');
  });

  it('has Optimization value', () => {
    expect(RecommendationType.Optimization).toBe('Optimization');
  });

  it('has Automation value', () => {
    expect(RecommendationType.Automation).toBe('Automation');
  });

  it('has Knowledge value', () => {
    expect(RecommendationType.Knowledge).toBe('Knowledge');
  });

  it('has Focus value', () => {
    expect(RecommendationType.Focus).toBe('Focus');
  });

  it('has Health value', () => {
    expect(RecommendationType.Health).toBe('Health');
  });
});

// ── AttentionState ──────────────────────────────────────────────

describe('AttentionState', () => {
  it('has Focused value', () => {
    expect(AttentionState.Focused).toBe('Focused');
  });

  it('has Distracted value', () => {
    expect(AttentionState.Distracted).toBe('Distracted');
  });

  it('has Overloaded value', () => {
    expect(AttentionState.Overloaded).toBe('Overloaded');
  });

  it('has Fatigued value', () => {
    expect(AttentionState.Fatigued).toBe('Fatigued');
  });

  it('has ContextSwitching value', () => {
    expect(AttentionState.ContextSwitching).toBe('ContextSwitching');
  });

  it('has Idle value', () => {
    expect(AttentionState.Idle).toBe('Idle');
  });

  it('has Unknown value', () => {
    expect(AttentionState.Unknown).toBe('Unknown');
  });
});

// ── ReflectionPeriod ────────────────────────────────────────────

describe('ReflectionPeriod', () => {
  it('has Daily value', () => {
    expect(ReflectionPeriod.Daily).toBe('Daily');
  });

  it('has Weekly value', () => {
    expect(ReflectionPeriod.Weekly).toBe('Weekly');
  });

  it('has Monthly value', () => {
    expect(ReflectionPeriod.Monthly).toBe('Monthly');
  });
});

// ── LearningStatus ──────────────────────────────────────────────

describe('LearningStatus', () => {
  it('has New value', () => {
    expect(LearningStatus.New).toBe('New');
  });

  it('has Learning value', () => {
    expect(LearningStatus.Learning).toBe('Learning');
  });

  it('has Practicing value', () => {
    expect(LearningStatus.Practicing).toBe('Practicing');
  });

  it('has Mastered value', () => {
    expect(LearningStatus.Mastered).toBe('Mastered');
  });

  it('has Forgotten value', () => {
    expect(LearningStatus.Forgotten).toBe('Forgotten');
  });

  it('has Declining value', () => {
    expect(LearningStatus.Declining).toBe('Declining');
  });
});

// ── DecisionMethod ──────────────────────────────────────────────

describe('DecisionMethod', () => {
  it('has ProsCons value', () => {
    expect(DecisionMethod.ProsCons).toBe('ProsCons');
  });

  it('has SWOT value', () => {
    expect(DecisionMethod.SWOT).toBe('SWOT');
  });

  it('has RiskAnalysis value', () => {
    expect(DecisionMethod.RiskAnalysis).toBe('RiskAnalysis');
  });

  it('has ScenarioAnalysis value', () => {
    expect(DecisionMethod.ScenarioAnalysis).toBe('ScenarioAnalysis');
  });

  it('has ExpectedOutcome value', () => {
    expect(DecisionMethod.ExpectedOutcome).toBe('ExpectedOutcome');
  });

  it('has TradeOffs value', () => {
    expect(DecisionMethod.TradeOffs).toBe('TradeOffs');
  });
});

// ── BriefType ───────────────────────────────────────────────────

describe('BriefType', () => {
  it('has MorningBrief value', () => {
    expect(BriefType.MorningBrief).toBe('MorningBrief');
  });

  it('has MiddayReview value', () => {
    expect(BriefType.MiddayReview).toBe('MiddayReview');
  });

  it('has EveningSummary value', () => {
    expect(BriefType.EveningSummary).toBe('EveningSummary');
  });

  it('has WeeklyReview value', () => {
    expect(BriefType.WeeklyReview).toBe('WeeklyReview');
  });

  it('has MonthlyReview value', () => {
    expect(BriefType.MonthlyReview).toBe('MonthlyReview');
  });
});
