/**
 * Desktop Composer Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Composes desktop configurations with windows, panels, and navigation
 * tailored to the business domain. Supports layout and theme overrides.
 * Emits DesktopComposedEvent via the event bus.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, DesktopConfigId, DesktopConfiguration,
  DomainAnalysis, BusinessDomain,
  DesktopLayout,
  WindowConfig, PanelConfig, NavigationItem,
} from './types.js';
import { brandDesktopConfigId, BusinessDomain as BDomain, DesktopLayout as DLayout, ThemeType as TTheme } from './types.js';
import type { IDesktopComposer, DesktopOverrides } from './contracts.js';
import type { DesktopComposerConfig } from './types.js';
import type { DesktopComposedEvent } from './events.js';

/** Default layout per domain */
const DOMAIN_LAYOUTS: Readonly<Record<BusinessDomain, DesktopLayout>> = Object.freeze({
  [BDomain.Construction]: DLayout.Dashboard,
  [BDomain.Healthcare]: DLayout.Dashboard,
  [BDomain.Finance]: DLayout.SplitView,
  [BDomain.Education]: DLayout.Sidebar,
  [BDomain.ECommerce]: DLayout.Dashboard,
  [BDomain.Manufacturing]: DLayout.Dashboard,
  [BDomain.Logistics]: DLayout.Dashboard,
  [BDomain.RealEstate]: DLayout.SplitView,
  [BDomain.Legal]: DLayout.SplitView,
  [BDomain.HR]: DLayout.Sidebar,
  [BDomain.Marketing]: DLayout.Dashboard,
  [BDomain.General]: DLayout.Sidebar,
});

/** Domain-specific window definitions */
interface WindowTemplate {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly width: number;
  readonly height: number;
}

const DOMAIN_WINDOWS: Readonly<Record<BusinessDomain, readonly WindowTemplate[]>> = Object.freeze({
  [BDomain.Construction]: Object.freeze([
    { id: 'w-project-overview', title: 'Project Overview', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-site-map', title: 'Site Map', type: 'map', width: 800, height: 600 },
    { id: 'w-schedule', title: 'Construction Schedule', type: 'timeline', width: 1000, height: 700 },
  ]),
  [BDomain.Healthcare]: Object.freeze([
    { id: 'w-patient-dashboard', title: 'Patient Dashboard', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-records', title: 'Medical Records', type: 'form', width: 900, height: 700 },
    { id: 'w-schedule', title: 'Appointment Schedule', type: 'calendar', width: 800, height: 600 },
  ]),
  [BDomain.Finance]: Object.freeze([
    { id: 'w-portfolio', title: 'Portfolio Overview', type: 'chart', width: 1200, height: 800 },
    { id: 'w-transactions', title: 'Transaction Ledger', type: 'table', width: 1000, height: 700 },
    { id: 'w-risk', title: 'Risk Dashboard', type: 'dashboard', width: 900, height: 700 },
  ]),
  [BDomain.Education]: Object.freeze([
    { id: 'w-course-view', title: 'Course View', type: 'content', width: 1000, height: 700 },
    { id: 'w-progress', title: 'Student Progress', type: 'chart', width: 800, height: 600 },
    { id: 'w-assignments', title: 'Assignments', type: 'list', width: 800, height: 600 },
  ]),
  [BDomain.ECommerce]: Object.freeze([
    { id: 'w-store-dashboard', title: 'Store Dashboard', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-product-catalog', title: 'Product Catalog', type: 'grid', width: 1000, height: 700 },
    { id: 'w-orders', title: 'Order Management', type: 'table', width: 1000, height: 700 },
  ]),
  [BDomain.Manufacturing]: Object.freeze([
    { id: 'w-production-line', title: 'Production Line Monitor', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-quality', title: 'Quality Control', type: 'chart', width: 900, height: 700 },
    { id: 'w-maintenance', title: 'Maintenance Schedule', type: 'timeline', width: 800, height: 600 },
  ]),
  [BDomain.Logistics]: Object.freeze([
    { id: 'w-shipment-tracker', title: 'Shipment Tracker', type: 'map', width: 1200, height: 800 },
    { id: 'w-warehouse', title: 'Warehouse View', type: 'dashboard', width: 1000, height: 700 },
    { id: 'w-routes', title: 'Route Planner', type: 'map', width: 900, height: 700 },
  ]),
  [BDomain.RealEstate]: Object.freeze([
    { id: 'w-property-list', title: 'Property Listings', type: 'grid', width: 1000, height: 700 },
    { id: 'w-property-detail', title: 'Property Detail', type: 'content', width: 900, height: 700 },
    { id: 'w-analytics', title: 'Market Analytics', type: 'chart', width: 800, height: 600 },
  ]),
  [BDomain.Legal]: Object.freeze([
    { id: 'w-case-list', title: 'Case List', type: 'table', width: 1000, height: 700 },
    { id: 'w-document-view', title: 'Document Viewer', type: 'content', width: 900, height: 700 },
    { id: 'w-calendar', title: 'Court Calendar', type: 'calendar', width: 800, height: 600 },
  ]),
  [BDomain.HR]: Object.freeze([
    { id: 'w-employee-dir', title: 'Employee Directory', type: 'table', width: 1000, height: 700 },
    { id: 'w-onboarding', title: 'Onboarding Pipeline', type: 'kanban', width: 900, height: 700 },
    { id: 'w-analytics', title: 'HR Analytics', type: 'chart', width: 800, height: 600 },
  ]),
  [BDomain.Marketing]: Object.freeze([
    { id: 'w-campaign-dash', title: 'Campaign Dashboard', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-content-cal', title: 'Content Calendar', type: 'calendar', width: 1000, height: 700 },
    { id: 'w-analytics', title: 'Marketing Analytics', type: 'chart', width: 900, height: 700 },
  ]),
  [BDomain.General]: Object.freeze([
    { id: 'w-overview', title: 'Overview', type: 'dashboard', width: 1200, height: 800 },
    { id: 'w-tasks', title: 'Tasks', type: 'list', width: 800, height: 600 },
    { id: 'w-reports', title: 'Reports', type: 'chart', width: 900, height: 700 },
  ]),
});

/** Domain-specific navigation items */
interface NavTemplate {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon: string | null;
}

const DOMAIN_NAVIGATION: Readonly<Record<BusinessDomain, readonly NavTemplate[]>> = Object.freeze({
  [BDomain.Construction]: Object.freeze([
    { id: 'nav-projects', label: 'Projects', path: '/projects', icon: 'building' },
    { id: 'nav-sites', label: 'Sites', path: '/sites', icon: 'map-pin' },
    { id: 'nav-schedule', label: 'Schedule', path: '/schedule', icon: 'calendar' },
    { id: 'nav-resources', label: 'Resources', path: '/resources', icon: 'users' },
    { id: 'nav-safety', label: 'Safety', path: '/safety', icon: 'shield' },
  ]),
  [BDomain.Healthcare]: Object.freeze([
    { id: 'nav-patients', label: 'Patients', path: '/patients', icon: 'user' },
    { id: 'nav-appointments', label: 'Appointments', path: '/appointments', icon: 'calendar' },
    { id: 'nav-records', label: 'Records', path: '/records', icon: 'file-text' },
    { id: 'nav-prescriptions', label: 'Prescriptions', path: '/prescriptions', icon: 'pill' },
    { id: 'nav-billing', label: 'Billing', path: '/billing', icon: 'credit-card' },
  ]),
  [BDomain.Finance]: Object.freeze([
    { id: 'nav-dashboard', label: 'Dashboard', path: '/dashboard', icon: 'bar-chart' },
    { id: 'nav-transactions', label: 'Transactions', path: '/transactions', icon: 'repeat' },
    { id: 'nav-portfolio', label: 'Portfolio', path: '/portfolio', icon: 'briefcase' },
    { id: 'nav-risk', label: 'Risk', path: '/risk', icon: 'alert-triangle' },
    { id: 'nav-compliance', label: 'Compliance', path: '/compliance', icon: 'shield' },
  ]),
  [BDomain.Education]: Object.freeze([
    { id: 'nav-courses', label: 'Courses', path: '/courses', icon: 'book' },
    { id: 'nav-students', label: 'Students', path: '/students', icon: 'users' },
    { id: 'nav-assignments', label: 'Assignments', path: '/assignments', icon: 'check-square' },
    { id: 'nav-grades', label: 'Grades', path: '/grades', icon: 'award' },
    { id: 'nav-resources', label: 'Resources', path: '/resources', icon: 'folder' },
  ]),
  [BDomain.ECommerce]: Object.freeze([
    { id: 'nav-store', label: 'Store', path: '/store', icon: 'shopping-bag' },
    { id: 'nav-orders', label: 'Orders', path: '/orders', icon: 'package' },
    { id: 'nav-products', label: 'Products', path: '/products', icon: 'box' },
    { id: 'nav-customers', label: 'Customers', path: '/customers', icon: 'users' },
    { id: 'nav-analytics', label: 'Analytics', path: '/analytics', icon: 'bar-chart' },
  ]),
  [BDomain.Manufacturing]: Object.freeze([
    { id: 'nav-production', label: 'Production', path: '/production', icon: 'activity' },
    { id: 'nav-quality', label: 'Quality', path: '/quality', icon: 'check-circle' },
    { id: 'nav-inventory', label: 'Inventory', path: '/inventory', icon: 'box' },
    { id: 'nav-maintenance', label: 'Maintenance', path: '/maintenance', icon: 'tool' },
    { id: 'nav-suppliers', label: 'Suppliers', path: '/suppliers', icon: 'truck' },
  ]),
  [BDomain.Logistics]: Object.freeze([
    { id: 'nav-shipments', label: 'Shipments', path: '/shipments', icon: 'truck' },
    { id: 'nav-warehouse', label: 'Warehouse', path: '/warehouse', icon: 'warehouse' },
    { id: 'nav-routes', label: 'Routes', path: '/routes', icon: 'navigation' },
    { id: 'nav-fleet', label: 'Fleet', path: '/fleet', icon: 'truck' },
    { id: 'nav-reports', label: 'Reports', path: '/reports', icon: 'file-text' },
  ]),
  [BDomain.RealEstate]: Object.freeze([
    { id: 'nav-properties', label: 'Properties', path: '/properties', icon: 'home' },
    { id: 'nav-clients', label: 'Clients', path: '/clients', icon: 'users' },
    { id: 'nav-listings', label: 'Listings', path: '/listings', icon: 'layout-grid' },
    { id: 'nav-deals', label: 'Deals', path: '/deals', icon: 'dollar-sign' },
    { id: 'nav-calendar', label: 'Calendar', path: '/calendar', icon: 'calendar' },
  ]),
  [BDomain.Legal]: Object.freeze([
    { id: 'nav-cases', label: 'Cases', path: '/cases', icon: 'folder' },
    { id: 'nav-documents', label: 'Documents', path: '/documents', icon: 'file-text' },
    { id: 'nav-calendar', label: 'Calendar', path: '/calendar', icon: 'calendar' },
    { id: 'nav-clients', label: 'Clients', path: '/clients', icon: 'users' },
    { id: 'nav-billing', label: 'Billing', path: '/billing', icon: 'credit-card' },
  ]),
  [BDomain.HR]: Object.freeze([
    { id: 'nav-employees', label: 'Employees', path: '/employees', icon: 'users' },
    { id: 'nav-onboarding', label: 'Onboarding', path: '/onboarding', icon: 'user-plus' },
    { id: 'nav-leave', label: 'Leave', path: '/leave', icon: 'calendar' },
    { id: 'nav-payroll', label: 'Payroll', path: '/payroll', icon: 'dollar-sign' },
    { id: 'nav-policies', label: 'Policies', path: '/policies', icon: 'file-text' },
  ]),
  [BDomain.Marketing]: Object.freeze([
    { id: 'nav-campaigns', label: 'Campaigns', path: '/campaigns', icon: 'megaphone' },
    { id: 'nav-content', label: 'Content', path: '/content', icon: 'edit' },
    { id: 'nav-analytics', label: 'Analytics', path: '/analytics', icon: 'bar-chart' },
    { id: 'nav-audience', label: 'Audience', path: '/audience', icon: 'users' },
    { id: 'nav-budget', label: 'Budget', path: '/budget', icon: 'dollar-sign' },
  ]),
  [BDomain.General]: Object.freeze([
    { id: 'nav-dashboard', label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { id: 'nav-tasks', label: 'Tasks', path: '/tasks', icon: 'check-square' },
    { id: 'nav-reports', label: 'Reports', path: '/reports', icon: 'file-text' },
    { id: 'nav-settings', label: 'Settings', path: '/settings', icon: 'settings' },
  ]),
});

export class DesktopComposer implements IDesktopComposer {
  private readonly config: DesktopComposerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly configurations = new Map<string, DesktopConfiguration>();
  private readonly solutionIndex = new Map<string, DesktopConfigId>();

  constructor(config: DesktopComposerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async compose(
    solutionId: SolutionId,
    domain: DomainAnalysis,
    overrides?: Partial<DesktopOverrides>,
  ): Promise<DesktopConfiguration> {
    const now: Timestamp = new Date().toISOString();
    const configId = brandDesktopConfigId(crypto.randomUUID());

    const layout = overrides?.layout ?? DOMAIN_LAYOUTS[domain.businessDomain];
    const theme = overrides?.theme ?? TTheme.System;

    const windowTemplates = DOMAIN_WINDOWS[domain.businessDomain] ?? [];
    const windows = this.composeWindows(windowTemplates);

    const panels = this.composePanels(layout, domain);

    const navTemplates = DOMAIN_NAVIGATION[domain.businessDomain] ?? [];
    const navigation = this.composeNavigation(navTemplates);

    const configuration: DesktopConfiguration = Object.freeze({
      id: configId,
      solutionId,
      layout,
      theme,
      windows: Object.freeze(windows),
      panels: Object.freeze(panels),
      navigation: Object.freeze(navigation),
      createdAt: now,
      metadata: Object.freeze({
        industry: domain.industry,
        subjectArea: domain.subjectArea,
      }),
    });

    const key = configId as string;
    this.configurations.set(key, configuration);
    this.solutionIndex.set(solutionId as string, configId);

    const event: DesktopComposedEvent = Object.freeze({
      eventType: 'solution.desktop.composed',
      classification: EventClassification.Info,
      configId,
      solutionId,
      layout,
      theme,
      windowCount: windows.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'DesktopConfiguration');

    return configuration;
  }

  async getById(id: DesktopConfigId): Promise<DesktopConfiguration | null> {
    return this.configurations.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<DesktopConfiguration | null> {
    const configId = this.solutionIndex.get(solutionId as string);
    if (!configId) return null;
    return this.configurations.get(configId as string) ?? null;
  }

  async list(): Promise<readonly DesktopConfiguration[]> {
    return Object.freeze([...this.configurations.values()]);
  }

  async count(): Promise<number> {
    return this.configurations.size;
  }

  // ─── Composition Helpers ────────────────────────────────────────────

  private composeWindows(templates: readonly WindowTemplate[]): readonly WindowConfig[] {
    const windows: WindowConfig[] = [];
    const count = Math.min(templates.length, this.config.maxWindows);
    for (let i = 0; i < count; i++) {
      const t = templates[i];
      windows.push(Object.freeze({
        id: t.id,
        title: t.title,
        type: t.type,
        width: t.width,
        height: t.height,
      }));
    }
    return windows;
  }

  private composePanels(layout: DesktopLayout, domain: DomainAnalysis): readonly PanelConfig[] {
    const panels: PanelConfig[] = [];

    if (layout === DLayout.Sidebar || layout === DLayout.SplitView) {
      panels.push(Object.freeze({
        id: 'panel-activity',
        title: 'Activity',
        position: 'right',
        collapsible: true,
      }));
    }

    if (layout === DLayout.Dashboard) {
      panels.push(Object.freeze({
        id: 'panel-summary',
        title: 'Summary',
        position: 'left',
        collapsible: true,
      }));
      panels.push(Object.freeze({
        id: 'panel-notifications',
        title: 'Notifications',
        position: 'right',
        collapsible: true,
      }));
    }

    // Add context-sensitive panel based on domain
    panels.push(Object.freeze({
      id: 'panel-context',
      title: `${domain.businessDomain} Context`,
      position: layout === DLayout.Sidebar ? 'left' : 'right',
      collapsible: true,
    }));

    return panels.slice(0, this.config.maxPanels);
  }

  private composeNavigation(templates: readonly NavTemplate[]): readonly NavigationItem[] {
    const items: NavigationItem[] = [];
    const count = Math.min(templates.length, this.config.maxNavItems);
    for (let i = 0; i < count; i++) {
      const t = templates[i];
      items.push(Object.freeze({
        id: t.id,
        label: t.label,
        path: t.path,
        icon: t.icon,
      }));
    }
    return items;
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
