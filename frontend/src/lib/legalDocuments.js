export const PRIVACY_POLICY_HREF = "/Around_The_World_Privacy_Policy.pdf";
export const TERMS_CONDITIONS_HREF = "/Around_The_World_Terms_and_Conditions.pdf";
export const COOKIE_POLICY_HREF = "/Around_The_World_Cookie_Policy.pdf";
export const TERMS_VERSION = "2026-05";

export function buildTermsConsentPayload(acceptedAt = new Date().toISOString()) {
  return {
    termsAccepted: true,
    termsAcceptedAt: acceptedAt,
    termsVersion: TERMS_VERSION,
    termsUrl: TERMS_CONDITIONS_HREF,
  };
}
