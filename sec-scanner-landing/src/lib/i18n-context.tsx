"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  type Locale,
  defaultLocale,
  setLocaleToStorage,
  t as translate,
  type TranslationKey,
} from "./i18n";

function getLocaleSnapshot(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const stored = localStorage.getItem("locale");
    if (stored && ["ru", "en"].includes(stored)) return stored as Locale;
  } catch {
    // ignore
  }
  return defaultLocale;
}

function getServerSnapshot(): Locale {
  return defaultLocale;
}

function subscribeToLocale(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getServerSnapshot
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleToStorage(newLocale);
    document.documentElement.lang = newLocale;
    // Dispatch storage event so useSyncExternalStore re-reads
    window.dispatchEvent(new StorageEvent("storage", { key: "locale" }));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(key, locale),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
