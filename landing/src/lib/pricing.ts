/**
 * Pricing — единый источник истины для всех цен (PX-005 BLOCK 7)
 *
 * Все страницы используют ТОЛЬКО этот файл.
 * Запрещается `const price = ...` в нескольких местах.
 */

export interface PricingPlan {
  id: "starter" | "professional" | "business" | "enterprise";
  name: string;
  nameRu: string;
  priceMonthly: number;
  priceAnnual: number; // per month, billed annually
  priceAnnualTotal: number; // total per year
  discount: number; // annual discount percentage
  tagline: string;
  taglineRu: string;
  targetAudience: string;
  targetAudienceRu: string;
  popular?: boolean;
  features: {
    projects: number | "unlimited";
    scansPerMonth: number | "unlimited";
    users: number | "unlimited";
    aiAssistant: "basic" | "advanced" | "pro" | "unlimited";
    reports: string[];
    teamRbac: boolean;
    apiAccess: "none" | "limited" | "unlimited";
    integrations: boolean;
    sso: boolean;
    auditTrail: boolean;
    onPremise: boolean;
    whiteLabel: "none" | "reports" | "full";
    sla: string;
    support: string;
  };
  limits: {
    historyDays: number;
    apiCallsPerDay: number;
  };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    nameRu: "Старт",
    priceMonthly: 99,
    priceAnnual: 79,
    priceAnnualTotal: 948,
    discount: 20,
    tagline: "For solo developers and side projects",
    taglineRu: "Для solo-разработчиков и side-проектов",
    targetAudience: "1-10 employees",
    targetAudienceRu: "1-10 сотрудников",
    features: {
      projects: 1,
      scansPerMonth: 5,
      users: 1,
      aiAssistant: "basic",
      reports: ["HTML", "PDF"],
      teamRbac: false,
      apiAccess: "none",
      integrations: false,
      sso: false,
      auditTrail: false,
      onPremise: false,
      whiteLabel: "none",
      sla: "none",
      support: "Community",
    },
    limits: {
      historyDays: 30,
      apiCallsPerDay: 0,
    },
  },
  {
    id: "professional",
    name: "Professional",
    nameRu: "Профессионал",
    priceMonthly: 499,
    priceAnnual: 399,
    priceAnnualTotal: 4788,
    discount: 20,
    tagline: "For startups without security team",
    taglineRu: "Для стартапов без security-команды",
    targetAudience: "10-50 employees",
    targetAudienceRu: "10-50 сотрудников",
    popular: true,
    features: {
      projects: 3,
      scansPerMonth: 50,
      users: 3,
      aiAssistant: "advanced",
      reports: ["HTML", "PDF", "JSON", "SARIF", "MD", "CSV"],
      teamRbac: false,
      apiAccess: "none",
      integrations: false,
      sso: false,
      auditTrail: false,
      onPremise: false,
      whiteLabel: "none",
      sla: "none",
      support: "Email 24h",
    },
    limits: {
      historyDays: 90,
      apiCallsPerDay: 0,
    },
  },
  {
    id: "business",
    name: "Business",
    nameRu: "Бизнес",
    priceMonthly: 1499,
    priceAnnual: 1199,
    priceAnnualTotal: 14388,
    discount: 20,
    tagline: "For SMB teams that need automation",
    taglineRu: "Для SMB-команд, которым нужна автоматизация",
    targetAudience: "50-200 employees",
    targetAudienceRu: "50-200 сотрудников",
    features: {
      projects: 10,
      scansPerMonth: "unlimited",
      users: 10,
      aiAssistant: "pro",
      reports: ["HTML", "PDF", "JSON", "SARIF", "MD", "CSV", "Custom templates"],
      teamRbac: true,
      apiAccess: "limited",
      integrations: true,
      sso: false,
      auditTrail: true,
      onPremise: false,
      whiteLabel: "reports",
      sla: "99.5%",
      support: "Priority 4h + CSM",
    },
    limits: {
      historyDays: 365,
      apiCallsPerDay: 1000,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameRu: "Enterprise",
    priceMonthly: 4999,
    priceAnnual: 3999,
    priceAnnualTotal: 47988,
    discount: 20,
    tagline: "For enterprise with compliance requirements",
    taglineRu: "Для enterprise с compliance-требованиями",
    targetAudience: "500+ employees",
    targetAudienceRu: "500+ сотрудников",
    features: {
      projects: "unlimited",
      scansPerMonth: "unlimited",
      users: "unlimited",
      aiAssistant: "unlimited",
      reports: ["HTML", "PDF", "JSON", "SARIF", "MD", "CSV", "Custom development"],
      teamRbac: true,
      apiAccess: "unlimited",
      integrations: true,
      sso: true,
      auditTrail: true,
      onPremise: true,
      whiteLabel: "full",
      sla: "99.9%",
      support: "24/7 + Dedicated Engineer",
    },
    limits: {
      historyDays: 9999,
      apiCallsPerDay: 999999,
    },
  },
];

/* --- Helpers --- */

export function getPlanById(id: PricingPlan["id"]): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

export function getPopularPlan(): PricingPlan {
  return PRICING_PLANS.find((p) => p.popular) || PRICING_PLANS[1];
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

export function formatPriceRu(price: number): string {
  return `$${price.toLocaleString()}/мес`;
}

/* --- Add-ons --- */

export interface AddOn {
  id: string;
  name: string;
  nameRu: string;
  price: number;
  priceUnit: "month" | "one-time";
  description: string;
  descriptionRu: string;
}

export const ADDONS: AddOn[] = [
  {
    id: "extra-projects",
    name: "Extra projects",
    nameRu: "Дополнительные проекты",
    price: 49,
    priceUnit: "month",
    description: "For Starter/Pro/Business plans",
    descriptionRu: "Для Starter/Pro/Business планов",
  },
  {
    id: "extra-users",
    name: "Extra users",
    nameRu: "Дополнительные пользователи",
    price: 29,
    priceUnit: "month",
    description: "For Starter/Pro/Business plans",
    descriptionRu: "Для Starter/Pro/Business планов",
  },
  {
    id: "custom-integration",
    name: "Custom integration",
    nameRu: "Кастомная интеграция",
    price: 1999,
    priceUnit: "one-time",
    description: "Custom integration development",
    descriptionRu: "Разработка кастомной интеграции",
  },
  {
    id: "professional-services",
    name: "Professional services",
    nameRu: "Профессиональные услуги",
    price: 199,
    priceUnit: "month",
    description: "Custom setup, training, audit ($199/hour)",
    descriptionRu: "Настройка, обучение, аудит ($199/час)",
  },
];
