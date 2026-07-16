/** Business impact level */
export type ImpactLevel = 'severe' | 'major' | 'moderate' | 'minor' | 'negligible';

/** Impact dimension */
export type ImpactDimension = 'confidentiality' | 'integrity' | 'availability' | 'financial' | 'reputation' | 'compliance';

/** Impact assessment */
export interface ImpactAssessment {
  id: string;
  findingId: string;
  level: ImpactLevel;
  score: number; // 0-100
  dimensions: Record<ImpactDimension, number>;
  description: string;
  affectedAssets: string[];
  estimatedCost?: number;
}
