import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translations } from "./translations";
import { translationEnhancements } from "./translationEnhancements";

const LANGUAGE_STORAGE_KEY = "around-the-world-language";
const LanguageContext = createContext(null);

function deepMerge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return overrideValue !== undefined ? overrideValue : baseValue;
  }

  if (
    baseValue &&
    overrideValue &&
    typeof baseValue === "object" &&
    typeof overrideValue === "object"
  ) {
    const merged = { ...baseValue };

    Object.keys(overrideValue).forEach((key) => {
      merged[key] = deepMerge(baseValue?.[key], overrideValue[key]);
    });

    return merged;
  }

  return overrideValue !== undefined ? overrideValue : baseValue;
}

const mergedTranslations = {
  ka: deepMerge(translations.ka, translationEnhancements.ka),
  en: deepMerge(translations.en, translationEnhancements.en),
};

function getNestedValue(source, key) {
  return key.split(".").reduce((value, segment) => {
    if (value && typeof value === "object" && segment in value) {
      return value[segment];
    }

    return undefined;
  }, source);
}

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "ka";
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === "en" ? "en" : "ka";
}

export function getLocalized(value, language = "ka") {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  const localizedValue =
    value[language] || value.ka || value.en || Object.values(value).find(Boolean);

  return typeof localizedValue === "string" ? localizedValue : "";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dataset.language = language;
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(nextLanguage === "en" ? "en" : "ka");
  }, []);

  const t = useCallback((key) => {
    const currentValue = getNestedValue(mergedTranslations[language], key);

    if (currentValue !== undefined) {
      return currentValue;
    }

    const fallbackValue = getNestedValue(mergedTranslations.en, key);
    return fallbackValue !== undefined ? fallbackValue : key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
