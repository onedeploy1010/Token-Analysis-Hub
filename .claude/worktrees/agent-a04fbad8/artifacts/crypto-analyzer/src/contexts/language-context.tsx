import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { dictionaries, en, type Language } from "./i18n";

export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "b18-language";

// Vite HMR: reuse the same context instance across hot reloads.
// Without this, editing this file would create a new Context object,
// desynchronising LanguageProvider and useLanguage consumers and
// throwing "useLanguage must be used within a LanguageProvider".
const LanguageContext =
  ((globalThis as unknown as { __LanguageContext__?: React.Context<LanguageContextType | undefined> })
    .__LanguageContext__ ??= createContext<LanguageContextType | undefined>(undefined));

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "zh";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && stored in dictionaries) return stored;
    return "zh";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
      // Expose the active locale to CSS so `.zh-only` labels can hide/show
      // without per-component re-renders.
      const isZh = language === "zh" || language === "zh-TW";
      const root = document.documentElement;
      if (isZh) root.setAttribute("data-zh", "");
      else root.removeAttribute("data-zh");
      root.setAttribute("lang", language);
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "zh" : "en"));
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = dictionaries[language];
      if (dict && dict[key] !== undefined) return dict[key];
      if (en[key] !== undefined) return en[key];
      if (import.meta.env?.DEV) console.warn(`Missing translation for key: ${key}`);
      return key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

/**
 * Convenience hook — true when the active locale is a Chinese variant.
 * Used by legacy pages that render bilingual "English · 中文" labels.
 */
export function useShowZh() {
  const { language } = useLanguage();
  return language === "zh" || language === "zh-TW";
}
