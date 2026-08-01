/**
 * Domain Analyzer Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Analyzes raw input to detect the business domain, industry,
 * subject area, terminology, and best practices.
 * Emits DomainDetectedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, DomainAnalysis, BusinessDomain,
} from './types.js';
import { BusinessDomain as BusinessDomainEnum } from './types.js';
import type { IDomainAnalyzer } from './contracts.js';
import type { DomainAnalyzerConfig } from './types.js';
import type { DomainDetectedEvent } from './events.js';

/** Domain keyword map for detection */
const DOMAIN_KEYWORDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Construction: Object.freeze([
    'building', 'construction', 'contractor', 'foundation', 'structural',
    'blueprint', 'architecture', 'civil engineering', 'site plan', 'renovation',
    'concrete', 'steel', 'crane', 'excavation', 'inspector', 'permit',
  ]),
  Healthcare: Object.freeze([
    'patient', 'clinical', 'diagnosis', 'treatment', 'hospital', 'medical',
    'health', 'physician', 'nurse', 'pharmacy', 'ehr', 'emr', 'hipaa',
    'prescription', 'therapy', 'surgery', 'icd-10', 'hl7', 'fhir',
  ]),
  Finance: Object.freeze([
    'banking', 'investment', 'portfolio', 'trading', 'fintech', 'loan',
    'mortgage', 'credit', 'compliance', 'regulatory', 'audit', 'risk',
    'interest rate', 'equity', 'derivative', 'basel', 'sox', 'sec filing',
  ]),
  Education: Object.freeze([
    'student', 'learning', 'curriculum', 'course', 'school', 'university',
    'education', 'assessment', 'grade', 'lms', 'elearning', 'lms',
    'enrollment', 'tuition', 'faculty', 'syllabus', 'lecture', 'quiz',
  ]),
  ECommerce: Object.freeze([
    'shopping', 'cart', 'product', 'catalog', 'checkout', 'payment',
    'ecommerce', 'inventory', 'order', 'shipment', 'shipping', 'return',
    'merchant', 'marketplace', 'woocommerce', 'shopify', 'sku', 'fulfillment',
  ]),
  Manufacturing: Object.freeze([
    'production', 'factory', 'assembly', 'supply chain', 'quality control',
    'manufacturing', 'bom', 'erp', 'mes', 'six sigma', 'lean', 'iso',
    'plant', 'machinery', 'maintenance', 'downtime', 'throughput', 'yield',
  ]),
  Logistics: Object.freeze([
    'shipping', 'freight', 'warehouse', 'transportation', 'fleet', 'delivery',
    'logistics', 'supply chain', 'routing', 'tracking', 'customs', 'import',
    'export', 'tms', 'wms', '3pl', 'carrier', 'dock', 'container',
  ]),
  RealEstate: Object.freeze([
    'property', 'real estate', 'listing', 'mls', 'mortgage', 'appraisal',
    'rental', 'tenant', 'landlord', 'zoning', 'closing', 'escrow',
    'broker', 'agent', 'inspection', 'hoa', 'condo', 'commercial',
  ]),
  Legal: Object.freeze([
    'law', 'attorney', 'contract', 'litigation', 'compliance', 'regulatory',
    'legal', 'court', 'lawyer', 'statute', 'regulation', 'governance',
    'ip', 'intellectual property', 'patent', 'trademark', 'nda', 'clause',
  ]),
  HR: Object.freeze([
    'employee', 'recruitment', 'onboarding', 'payroll', 'benefits',
    'human resources', 'hr', 'performance review', 'talent', 'hiring',
    'training', 'compensation', 'attendance', 'leave', 'termination',
    'org chart', 'workforce', 'engagement', 'retention', 'applicant tracking',
  ]),
  Marketing: Object.freeze([
    'campaign', 'brand', 'audience', 'analytics', 'seo', 'sem',
    'marketing', 'content', 'social media', 'email', 'lead', 'conversion',
    'roi', 'impression', 'click-through', 'attribution', 'segmentation',
    'funnel', 'engagement', 'awareness', 'acquisition',
  ]),
});

/** Best practices per domain */
const DOMAIN_BEST_PRACTICES: Readonly<Partial<Record<string, readonly string[]>>> = Object.freeze({
  Healthcare: Object.freeze([
    'HIPAA compliance by design', 'Patient data encryption at rest and in transit',
    'Audit trail for all data access', 'Role-based access control',
    'Regular security assessments', 'Disaster recovery planning',
  ]),
  Finance: Object.freeze([
    'SOX compliance framework', 'Multi-factor authentication', 'Transaction encryption',
    'Real-time fraud detection', 'Regulatory reporting automation',
    'Data retention policies',
  ]),
  Construction: Object.freeze([
    'Safety-first design', 'Document management for permits', 'Progress tracking',
    'Change order workflows', 'Subcontractor coordination',
  ]),
  Education: Object.freeze([
    'Accessibility compliance (WCAG)', 'Data privacy for minors (FERPA/COPPA)',
    'Scalable content delivery', 'Progress analytics and reporting',
  ]),
  ECommerce: Object.freeze([
    'PCI-DSS compliance', 'Cart abandonment recovery', 'Inventory sync',
    'A/B testing framework', 'Personalized recommendations',
  ]),
});

export class DomainAnalyzer implements IDomainAnalyzer {
  private readonly config: DomainAnalyzerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly analyses = new Map<string, DomainAnalysis>();

  constructor(config: DomainAnalyzerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(solutionId: SolutionId, rawInput: string): Promise<DomainAnalysis> {
    const now: Timestamp = new Date().toISOString();

    const businessDomain = this.detectDomain(rawInput);
    const industry = this.detectIndustry(rawInput, businessDomain);
    const subjectArea = this.detectSubjectArea(rawInput);
    const terminology = this.extractTerminology(rawInput, businessDomain);
    const bestPractices = this.getBestPractices(businessDomain);

    const analysis: DomainAnalysis = Object.freeze({
      solutionId,
      industry,
      businessDomain,
      subjectArea,
      terminology: Object.freeze(terminology),
      bestPractices: Object.freeze(bestPractices),
      analyzedAt: now,
      metadata: Object.freeze({}),
    });

    this.analyses.set(solutionId as string, analysis);

    const event: DomainDetectedEvent = Object.freeze({
      eventType: 'solution.domain.detected',
      classification: EventClassification.Info,
      solutionId,
      businessDomain,
      industry,
      terminologyCount: terminology.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'DomainAnalysis');

    return analysis;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<DomainAnalysis | null> {
    return this.analyses.get(solutionId as string) ?? null;
  }

  async list(): Promise<readonly DomainAnalysis[]> {
    return Object.freeze([...this.analyses.values()]);
  }

  // ─── Detection Helpers ───────────────────────────────────────────

  private detectDomain(input: string): BusinessDomain {
    const lower = input.toLowerCase();
    const scores = new Map<string, number>();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score++;
        }
      }
      if (score > 0) {
        scores.set(domain, score);
      }
    }

    if (scores.size === 0) {
      return BusinessDomainEnum.General;
    }

    // Find domain with highest score
    let bestDomain = BusinessDomainEnum.General;
    let bestScore = 0;
    for (const [domain, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain as BusinessDomain;
      }
    }

    return bestDomain;
  }

  private detectIndustry(input: string, domain: BusinessDomain): string {
    const lower = input.toLowerCase();
    // Use domain as base industry, refine from input
    const industryHints: Readonly<Record<string, readonly string[]>> = Object.freeze({
      'saas': Object.freeze(['SaaS']),
      'enterprise': Object.freeze(['Enterprise']),
      'startup': Object.freeze(['Startup']),
      'government': Object.freeze(['Government']),
      'nonprofit': Object.freeze(['Non-Profit']),
      'b2b': Object.freeze(['B2B']),
      'b2c': Object.freeze(['B2C']),
    });

    for (const [hint, industries] of Object.entries(industryHints)) {
      if (lower.includes(hint)) {
        return `${industries[0]} ${domain}`;
      }
    }

    return domain;
  }

  private detectSubjectArea(input: string): string {
    // Extract key topics from the input
    const sentences = input.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 10);
    if (sentences.length === 0) return 'General';
    // Use the most substantive sentence as subject area
    const longest = sentences.reduce((a, b) => a.length >= b.length ? a : b, '');
    return longest.length > 100 ? longest.substring(0, 100) + '…' : longest;
  }

  private extractTerminology(input: string, domain: BusinessDomain): readonly string[] {
    const keywords = DOMAIN_KEYWORDS[domain] ?? [];
    const lower = input.toLowerCase();
    const found: string[] = [];

    for (const kw of keywords) {
      if (lower.includes(kw) && !found.includes(kw)) {
        found.push(kw);
      }
    }

    return found.slice(0, this.config.maxTerminology);
  }

  private getBestPractices(domain: BusinessDomain): readonly string[] {
    return DOMAIN_BEST_PRACTICES[domain] ?? Object.freeze([]);
  }

  // ─── Event Publishing ────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
