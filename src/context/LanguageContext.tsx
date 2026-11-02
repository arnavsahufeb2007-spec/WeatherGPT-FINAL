import React, { createContext, useContext, useMemo } from "react";
import { UIStrings } from "../translations/index.js";
import { getTranslations, getLanguageConfig, LanguageDefinition } from "../languages.js";

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  langConfig: LanguageDefinition;
  t: UIStrings;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  language: string;
  onChangeLanguage: (lang: string) => void;
  children: React.ReactNode;
}

export function LanguageProvider({ language, onChangeLanguage, children }: LanguageProviderProps) {
  const value = useMemo<LanguageContextValue>(() => {
    const config = getLanguageConfig(language);
    const translations = getTranslations(language);
    return {
      language,
      setLanguage: onChangeLanguage,
      langConfig: config,
      t: translations,
    };
  }, [language, onChangeLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Hook to access current language state and translated UI strings.
 * Can be called with an optional language override string, e.g. useTranslation(props.preferredLanguage).
 */
export function useLanguage(languageOverride?: string): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (languageOverride) {
    const config = getLanguageConfig(languageOverride);
    const translations = getTranslations(languageOverride);
    return {
      language: languageOverride,
      setLanguage: ctx ? ctx.setLanguage : () => {},
      langConfig: config,
      t: translations,
    };
  }
  if (ctx) {
    return ctx;
  }
  // Standalone fallback when outside provider
  const fallbackLang = typeof window !== "undefined" ? localStorage.getItem("weathergpt_lang") || "en" : "en";
  const config = getLanguageConfig(fallbackLang);
  const translations = getTranslations(fallbackLang);
  return {
    language: fallbackLang,
    setLanguage: () => {},
    langConfig: config,
    t: translations,
  };
}

/**
 * Convenience hook returning the active UIStrings dictionary.
 */
export function useTranslation(languageOverride?: string): UIStrings {
  const { t } = useLanguage(languageOverride);
  return t;
}
