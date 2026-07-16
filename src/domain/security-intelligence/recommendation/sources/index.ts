/**
 * Security Intelligence Recommendation Engine — Sources
 *
 * Generates recommendations from 5 upstream sources:
 * CanonicalFinding, CorrelationGroup, RiskAssessment, AttackPath, ImpactAnalysis
 */

import type {
  Recommendation, RecommendationSource, RuleContext, GenerateInput,
} from '../types/index.ts';
import { RecommendationSource as RS } from '../types/index.ts';
import type { RecommendationRule } from '../types/index.ts';
import { createRecommendation, createRecommendationCost, createRecommendationBenefit, createRecommendationEvidence } from '../models/index.ts';
import type { RuleRegistry } from '../rules/index.ts';
import type { CanonicalFinding } from '../../normalization/types/index.ts';
import type { CorrelationGroup } from '../../correlation/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { AttackPath } from '../../attack-path/types/index.ts';
import type { ImpactAnalysis } from '../../impact/types/index.ts';

/**
 * Generate recommendations from a single source context.
 * Evaluates all applicable rules against the context.
 */
export function generateFromSource(
  input: GenerateInput,
  ruleRegistry: RuleRegistry,
): readonly Recommendation[] {
  const context: RuleContext = {
    finding: input.finding,
    correlationGroup: input.correlationGroup,
    riskAssessment: input.riskAssessment,
    attackPath: input.attackPath,
    impactAnalysis: input.impactAnalysis,
  };

  const applicableRules = ruleRegistry.getApplicableRules(input.source);
  const recommendations: Recommendation[] = [];

  for (const rule of applicableRules) {
    const result = rule.evaluate(context);
    if (!result) continue;

    // Create cost model
    const tempRecId = 'temp' as any;
    const cost = createRecommendationCost({
      recommendationId: tempRecId,
      ...result.costEstimate,
    });

    // Create benefit model
    const benefit = createRecommendationBenefit({
      recommendationId: tempRecId,
      ...result.benefitEstimate,
    });

    // Create evidence models
    const evidence = result.evidence.map(e =>
      createRecommendationEvidence({
        recommendationId: tempRecId,
        ...e,
      }),
    );

    // Create the full recommendation
    const rec = createRecommendation({
      ruleType: result.ruleType,
      source: result.source,
      sourceId: result.sourceId,
      title: result.title,
      description: result.description,
      severity: result.severity,
      targetId: result.targetId,
      targetType: result.targetType,
      targetLabel: result.targetLabel,
      findingIds: result.findingIds,
      correlationGroupIds: result.correlationGroupIds,
      attackPathIds: result.attackPathIds,
      impactAnalysisId: input.impactAnalysis?.id ?? null,
      cost,
      benefit,
      evidence,
    });

    recommendations.push(rec);
  }

  return Object.freeze(recommendations);
}

/**
 * Generate recommendations from all sources in a batch.
 */
export function generateFromAllSources(
  findings: readonly CanonicalFinding[] | undefined,
  correlationGroups: readonly CorrelationGroup[] | undefined,
  riskAssessments: readonly RiskAssessment[] | undefined,
  attackPaths: readonly AttackPath[] | undefined,
  impactAnalyses: readonly ImpactAnalysis[] | undefined,
  ruleRegistry: RuleRegistry,
): readonly Recommendation[] {
  const allRecommendations: Recommendation[] = [];

  // From findings
  if (findings) {
    for (const finding of findings) {
      const recs = generateFromSource({
        source: RS.CanonicalFinding,
        sourceId: finding.id,
        finding,
      }, ruleRegistry);
      allRecommendations.push(...recs);
    }
  }

  // From correlation groups
  if (correlationGroups) {
    for (const group of correlationGroups) {
      const recs = generateFromSource({
        source: RS.CorrelationGroup,
        sourceId: group.id,
        correlationGroup: group,
      }, ruleRegistry);
      allRecommendations.push(...recs);
    }
  }

  // From risk assessments
  if (riskAssessments) {
    for (const assessment of riskAssessments) {
      const recs = generateFromSource({
        source: RS.RiskAssessment,
        sourceId: assessment.id,
        riskAssessment: assessment,
      }, ruleRegistry);
      allRecommendations.push(...recs);
    }
  }

  // From attack paths
  if (attackPaths) {
    for (const path of attackPaths) {
      const recs = generateFromSource({
        source: RS.AttackPath,
        sourceId: path.id,
        attackPath: path,
      }, ruleRegistry);
      allRecommendations.push(...recs);
    }
  }

  // From impact analyses — the primary source for recommendation generation
  if (impactAnalyses) {
    for (const analysis of impactAnalyses) {
      const recs = generateFromSource({
        source: RS.ImpactAnalysis,
        sourceId: analysis.id,
        impactAnalysis: analysis,
        // Attach related findings/paths if the impact analysis references them
      }, ruleRegistry);
      allRecommendations.push(...recs);
    }
  }

  return Object.freeze(allRecommendations);
}
