export type Locale = "ru" | "en";

export const defaultLocale: Locale = "ru";

export const locales: Locale[] = ["ru", "en"];

export const localeNames: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
};

export type TranslationKey =
  | "nav.product"
  | "nav.marketplace"
  | "nav.docs"
  | "nav.community"
  | "nav.pricing"
  | "nav.search"
  | "nav.tryDemo"
  | "nav.github"
  | "common.comingSoon"
  | "common.learnMore"
  | "common.getStarted"
  | "common.viewAll"
  | "common.backToHome"
  | "footer.product"
  | "footer.developers"
  | "footer.community"
  | "footer.legal"
  | "footer.privacy"
  | "footer.terms"
  | "footer.security"
  | "footer.copyright"
  | "search.placeholder"
  | "search.noResults"
  | "search.categories"
  | "breadcrumb.home";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  ru: {
    "nav.product": "Продукт",
    "nav.marketplace": "Маркетплейс",
    "nav.docs": "Документация",
    "nav.community": "Сообщество",
    "nav.pricing": "Цены",
    "nav.search": "Поиск",
    "nav.tryDemo": "Попробовать",
    "nav.github": "GitHub",
    "common.comingSoon": "Скоро",
    "common.learnMore": "Подробнее",
    "common.getStarted": "Начать",
    "common.viewAll": "Смотреть все",
    "common.backToHome": "На главную",
    "footer.product": "Продукт",
    "footer.developers": "Разработчикам",
    "footer.community": "Сообщество",
    "footer.legal": "Юридическое",
    "footer.privacy": "Политика конфиденциальности",
    "footer.terms": "Условия использования",
    "footer.security": "Политика безопасности",
    "footer.copyright": "Open Source Security Intelligence",
    "search.placeholder": "Поиск по документации, страницам...",
    "search.noResults": "Ничего не найдено",
    "search.categories": "Категории",
    "breadcrumb.home": "Главная",
  },
  en: {
    "nav.product": "Product",
    "nav.marketplace": "Marketplace",
    "nav.docs": "Docs",
    "nav.community": "Community",
    "nav.pricing": "Pricing",
    "nav.search": "Search",
    "nav.tryDemo": "Try Demo",
    "nav.github": "GitHub",
    "common.comingSoon": "Coming Soon",
    "common.learnMore": "Learn More",
    "common.getStarted": "Get Started",
    "common.viewAll": "View All",
    "common.backToHome": "Back to Home",
    "footer.product": "Product",
    "footer.developers": "Developers",
    "footer.community": "Community",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.security": "Security Policy",
    "footer.copyright": "Open Source Security Intelligence",
    "search.placeholder": "Search docs, pages...",
    "search.noResults": "No results found",
    "search.categories": "Categories",
    "breadcrumb.home": "Home",
  },
};

export function t(key: TranslationKey, locale: Locale = defaultLocale): string {
  return translations[locale]?.[key] ?? translations[defaultLocale]?.[key] ?? key;
}

export function getLocaleFromStorage(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const stored = localStorage.getItem("locale");
    if (stored && locales.includes(stored as Locale)) return stored as Locale;
  } catch {
    // ignore
  }
  return defaultLocale;
}

export function setLocaleToStorage(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("locale", locale);
  } catch {
    // ignore
  }
}
