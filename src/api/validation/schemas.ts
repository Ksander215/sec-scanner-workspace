import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info', 'none']);
export const FindingCategorySchema = z.enum(['vulnerability', 'misconfiguration', 'exposure', 'secret', 'outdated', 'policy-violation', 'anomaly']);

export const RawFindingSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceId: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.string(),
  category: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  protocol: z.string().optional(),
  path: z.string().optional(),
  evidence: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

export const AnalyzeRequestSchema = z.object({
  findings: z.array(RawFindingSchema).min(1),
  options: z.object({
    persist: z.boolean().optional(),
    explain: z.boolean().optional(),
    includeAttackPaths: z.boolean().optional(),
    includeImpact: z.boolean().optional(),
  }).optional(),
});

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
