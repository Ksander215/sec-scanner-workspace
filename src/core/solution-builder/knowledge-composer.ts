/**
 * Knowledge Composer Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Composes knowledge packages tailored to a specific business domain.
 * Selects domain-specific items such as terminology, best practices, policies,
 * prompt assets, and templates based on domain analysis.
 * Emits KnowledgeComposedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, KnowledgePackageId, KnowledgePackage,
  DomainAnalysis, BusinessDomain, KnowledgePackType,
} from './types.js';
import { brandKnowledgePackageId, BusinessDomain as BDomain, KnowledgePackType as KPackType } from './types.js';
import type { IKnowledgeComposer } from './contracts.js';
import type { KnowledgeComposerConfig } from './types.js';
import { KnowledgeCompositionError } from './errors.js';
import type { KnowledgeComposedEvent } from './events.js';

/** Domain-specific knowledge catalogs */
const DOMAIN_KNOWLEDGE: Readonly<Record<BusinessDomain, readonly string[]>> = Object.freeze({
  [BDomain.Construction]: Object.freeze([
    'Building code compliance frameworks',
    'Construction project lifecycle management',
    'Site safety protocols and OSHA standards',
    'Material procurement best practices',
    'Structural engineering calculation standards',
    'Subcontractor management workflows',
    'Building information modeling (BIM) guidelines',
    'Quality assurance and inspection checklists',
  ]),
  [BDomain.Healthcare]: Object.freeze([
    'HIPAA privacy rule compliance framework',
    'Clinical decision support guidelines',
    'Patient care pathway templates',
    'Medical terminology and coding systems (ICD-10, CPT)',
    'Electronic health record interoperability standards (HL7 FHIR)',
    'Clinical trial protocol management',
    'Patient consent and data governance policies',
    'Healthcare quality metrics (HEDIS, CAHPS)',
  ]),
  [BDomain.Finance]: Object.freeze([
    'Financial regulatory compliance (SOX, Dodd-Frank, MiFID II)',
    'Risk assessment and management frameworks',
    'Anti-money laundering (AML) procedures',
    'Financial reporting standards (GAAP, IFRS)',
    'Credit scoring and underwriting models',
    'Portfolio optimization strategies',
    'Fraud detection patterns and heuristics',
    'Know-your-customer (KYC) verification workflows',
  ]),
  [BDomain.Education]: Object.freeze([
    'Learning objective taxonomy (Bloom\'s)',
    'Curriculum alignment frameworks',
    'Student assessment and grading rubrics',
    'Adaptive learning path design',
    'Educational data privacy (FERPA compliance)',
    'Instructional design best practices',
    'Learning management system integration patterns',
    'Accessibility standards for educational content (WCAG)',
  ]),
  [BDomain.ECommerce]: Object.freeze([
    'Product catalog management workflows',
    'Inventory optimization and demand forecasting',
    'Payment processing security standards (PCI-DSS)',
    'Customer segmentation and personalization strategies',
    'Order fulfillment and logistics coordination',
    'A/B testing and conversion optimization',
    'Returns and refund policy templates',
    'Multi-channel retail integration patterns',
  ]),
  [BDomain.Manufacturing]: Object.freeze([
    'Production planning and scheduling algorithms',
    'Quality control and Six Sigma methodologies',
    'Supply chain optimization frameworks',
    'Predictive maintenance models',
    'Lean manufacturing principles and waste reduction',
    'Bill of materials (BOM) management',
    'Shop floor data collection and IoT integration',
    'Regulatory compliance for manufacturing (ISO 9001)',
  ]),
  [BDomain.Logistics]: Object.freeze([
    'Route optimization algorithms and heuristics',
    'Warehouse management system design patterns',
    'Fleet management and telematics integration',
    'Last-mile delivery optimization strategies',
    'Customs and trade compliance procedures',
    'Demand forecasting and capacity planning',
    'Cold chain monitoring and compliance',
    'Reverse logistics and returns processing',
  ]),
  [BDomain.RealEstate]: Object.freeze([
    'Property valuation methodologies (comparative, income, cost)',
    'Real estate transaction workflow templates',
    'Property management best practices',
    'Zoning and land use regulation frameworks',
    'Mortgage processing and underwriting guidelines',
    'Real estate investment analysis (cap rate, NOI, IRR)',
    'Fair housing compliance requirements',
    'Property inspection and due diligence checklists',
  ]),
  [BDomain.Legal]: Object.freeze([
    'Legal document template libraries',
    'Contract review and analysis checklists',
    'Regulatory compliance tracking frameworks',
    'Case management workflow templates',
    'Legal research methodologies',
    'Client matter management best practices',
    'E-discovery and data preservation protocols',
    'Ethical wall and conflict of interest procedures',
  ]),
  [BDomain.HR]: Object.freeze([
    'Employee onboarding workflow templates',
    'Performance review and appraisal frameworks',
    'Compensation and benefits benchmarking data',
    'Labor law compliance checklists (FLSA, ADA, FMLA)',
    'Talent acquisition and recruitment best practices',
    'Learning and development program design',
    'Employee engagement survey methodologies',
    'Workforce planning and analytics frameworks',
  ]),
  [BDomain.Marketing]: Object.freeze([
    'Campaign management lifecycle templates',
    'Customer journey mapping frameworks',
    'Content strategy and editorial calendar templates',
    'Marketing attribution models and analytics',
    'Brand guideline and governance frameworks',
    'SEO and SEM optimization best practices',
    'Social media strategy and governance',
    'Marketing technology stack integration patterns',
  ]),
  [BDomain.General]: Object.freeze([
    'General business process optimization',
    'Stakeholder communication templates',
    'Project management methodology frameworks',
    'Data-driven decision making guidelines',
    'Continuous improvement (Kaizen) principles',
    'Risk management and mitigation frameworks',
    'Knowledge management best practices',
    'Change management and adoption strategies',
  ]),
});

export class KnowledgeComposer implements IKnowledgeComposer {
  private readonly config: KnowledgeComposerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly packages = new Map<string, KnowledgePackage>();
  private readonly solutionIndex = new Map<string, KnowledgePackageId[]>();

  constructor(config: KnowledgeComposerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async compose(solutionId: SolutionId, domain: DomainAnalysis): Promise<KnowledgePackage> {
    if (this.packages.size >= this.config.maxPackages) {
      throw new KnowledgeCompositionError(
        `Maximum knowledge packages exceeded: ${this.config.maxPackages}`,
        { maxPackages: this.config.maxPackages },
      );
    }

    const now: Timestamp = new Date().toISOString();
    const packageId = brandKnowledgePackageId(crypto.randomUUID());

    const type = this.selectPackType(domain);
    const items = this.selectDomainItems(domain);

    const pkg: KnowledgePackage = Object.freeze({
      id: packageId,
      solutionId,
      type,
      name: `Knowledge Pack: ${domain.businessDomain}`,
      items: Object.freeze(items),
      selectedAt: now,
      metadata: Object.freeze({
        industry: domain.industry,
        subjectArea: domain.subjectArea,
        terminologyCount: domain.terminology.length,
      }),
    });

    const key = packageId as string;
    this.packages.set(key, pkg);

    const existing = this.solutionIndex.get(solutionId as string);
    if (existing) {
      this.solutionIndex.set(solutionId as string, [...existing, packageId]);
    } else {
      this.solutionIndex.set(solutionId as string, [packageId]);
    }

    const event: KnowledgeComposedEvent = Object.freeze({
      eventType: 'solution.knowledge.composed',
      classification: EventClassification.Info,
      packageId,
      solutionId,
      type,
      itemCount: items.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'KnowledgePackage');

    return pkg;
  }

  async getById(id: KnowledgePackageId): Promise<KnowledgePackage | null> {
    return this.packages.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<readonly KnowledgePackage[]> {
    const ids = this.solutionIndex.get(solutionId as string);
    if (!ids || ids.length === 0) return Object.freeze([]);
    const results: KnowledgePackage[] = [];
    for (const id of ids) {
      const pkg = this.packages.get(id as string);
      if (pkg) results.push(pkg);
    }
    return Object.freeze(results);
  }

  async list(): Promise<readonly KnowledgePackage[]> {
    return Object.freeze([...this.packages.values()]);
  }

  async count(): Promise<number> {
    return this.packages.size;
  }

  // ─── Knowledge Selection ────────────────────────────────────────────

  private selectPackType(domain: DomainAnalysis): KnowledgePackType {
    const subject = domain.subjectArea.toLowerCase();
    if (subject.includes('policy') || subject.includes('compliance') || subject.includes('regulation')) {
      return KPackType.Policies;
    }
    if (subject.includes('prompt') || subject.includes('ai') || subject.includes('llm')) {
      return KPackType.PromptAssets;
    }
    if (subject.includes('template') || subject.includes('pattern') || subject.includes('framework')) {
      return KPackType.Templates;
    }
    if (subject.includes('best practice') || subject.includes('guideline') || subject.includes('standard')) {
      return KPackType.BestPractices;
    }
    return KPackType.DomainKnowledge;
  }

  private selectDomainItems(domain: DomainAnalysis): readonly string[] {
    const items: string[] = [];

    // Add domain-specific knowledge items
    const catalog = DOMAIN_KNOWLEDGE[domain.businessDomain];
    if (catalog) {
      for (const item of catalog) {
        items.push(item);
      }
    }

    // Add terminology items from the domain analysis
    for (const term of domain.terminology) {
      items.push(`Term: ${term}`);
    }

    // Add best practices from domain analysis
    for (const bp of domain.bestPractices) {
      items.push(`Best practice: ${bp}`);
    }

    // Add industry-specific items
    if (domain.industry) {
      items.push(`Industry context: ${domain.industry}`);
    }

    if (domain.subjectArea) {
      items.push(`Subject area focus: ${domain.subjectArea}`);
    }

    // Cap at config limit
    return items.slice(0, this.config.maxItemsPerPackage);
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
