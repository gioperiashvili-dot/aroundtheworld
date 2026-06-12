export const COOKIE_CONSENT_STORAGE_KEY = "aroundworld_cookie_consent";
export const COOKIE_SETTINGS_EVENT_NAME = "aroundworld:open-cookie-settings";
export const GOOGLE_TAG_ID = "G-3JG6HZ6S8J";

const GOOGLE_TAG_SCRIPT_ID = "aroundworld-google-tag";
const TOP_GE_SCRIPT_ID = "aroundworld-top-ge-counter";
const TOP_GE_CONTAINER_ID = "top-ge-counter-container";
const TOP_GE_SITE_ID = "118709";

export const DEFAULT_COOKIE_CONSENT = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

function normalizeCookieConsent(preferences) {
  return {
    ...DEFAULT_COOKIE_CONSENT,
    ...(preferences || {}),
    essential: true,
    marketing: false,
  };
}

export function getCookieConsent() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedConsent = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const parsedConsent = storedConsent ? JSON.parse(storedConsent) : null;

    if (!parsedConsent || typeof parsedConsent !== "object") {
      return null;
    }

    return normalizeCookieConsent(parsedConsent);
  } catch (_error) {
    return null;
  }
}

export function readCookieConsent() {
  return getCookieConsent();
}

export function hasCookieConsent() {
  return Boolean(getCookieConsent());
}

export function applyGoogleConsent(preferences = DEFAULT_COOKIE_CONSENT) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const consent = normalizeCookieConsent(preferences);

  window.gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

function ensureGtagFunction() {
  if (typeof window === "undefined") {
    return false;
  }

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  return true;
}

function ensureGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  ensureGtagFunction();
  applyGoogleConsent({ analytics: true });

  if (!window.__aroundworldGaConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_TAG_ID);
    window.__aroundworldGaConfigured = true;
  }

  if (document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = GOOGLE_TAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`;
  document.head.appendChild(script);
}

function ensureTopGeCounter() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (!document.getElementById(TOP_GE_CONTAINER_ID)) {
    const counterContainer = document.createElement("div");
    counterContainer.id = TOP_GE_CONTAINER_ID;
    counterContainer.dataset.siteId = TOP_GE_SITE_ID;
    document.body.appendChild(counterContainer);
  }

  if (document.getElementById(TOP_GE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = TOP_GE_SCRIPT_ID;
  script.async = true;
  script.src = "https://counter.top.ge/counter.js";
  document.body.appendChild(script);
}

function removeNonEssentialAnalyticsScripts() {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById(GOOGLE_TAG_SCRIPT_ID)?.remove();
  document.getElementById(TOP_GE_SCRIPT_ID)?.remove();
  document.getElementById(TOP_GE_CONTAINER_ID)?.remove();

  if (typeof window !== "undefined") {
    window.__aroundworldGaConfigured = false;
  }
}

export function applyCookieConsent(preferences = DEFAULT_COOKIE_CONSENT) {
  const consent = normalizeCookieConsent(preferences);

  applyGoogleConsent(consent);

  if (consent.analytics) {
    ensureGoogleAnalytics();
    ensureTopGeCounter();
    return;
  }

  removeNonEssentialAnalyticsScripts();
}

export function saveCookieConsent(preferences) {
  const consent = {
    ...normalizeCookieConsent(preferences),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (_error) {
      // If storage is unavailable, keep the in-memory consent flow working.
    }
  }

  applyCookieConsent(consent);

  return consent;
}

export function writeCookieConsent(preferences) {
  return saveCookieConsent(preferences);
}

export function clearCookieConsent() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch (_error) {
    // Storage may be unavailable in private or restricted browsing modes.
  }

  applyCookieConsent(DEFAULT_COOKIE_CONSENT);
}

export function openCookieSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT_NAME));
}
