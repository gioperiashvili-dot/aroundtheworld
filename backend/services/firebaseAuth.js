const crypto = require("crypto");
const axios = require("axios");
const { FIREBASE_PROJECT_ID } = require("../config/env");

const SECURE_TOKEN_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_CERT_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSecureTokenCertificates = null;
let cachedSecureTokenCertificatesExpiresAt = 0;
let certificateRefreshPromise = null;

function createFirebaseAuthError(statusCode, error, details, code) {
  const authError = new Error(error);
  authError.statusCode = statusCode;
  authError.details = details;
  authError.code = code;
  return authError;
}

function getFirebaseProjectId() {
  const projectId = String(FIREBASE_PROJECT_ID || "").trim();

  if (!projectId) {
    throw createFirebaseAuthError(
      500,
      "Firebase authentication is not configured",
      "Set FIREBASE_PROJECT_ID on the backend before accepting reviews.",
      "FIREBASE_CONFIG_MISSING"
    );
  }

  return projectId;
}

function getTokenFingerprint(idToken) {
  return crypto.createHash("sha256").update(idToken).digest("hex").slice(0, 16);
}

function logTokenVerificationFailure(reason, context = {}) {
  console.warn("[reviews-auth] Firebase ID token verification failed:", {
    reason,
    ...context,
  });
}

function createInvalidTokenError(details, reason, context = {}) {
  logTokenVerificationFailure(reason, context);

  return createFirebaseAuthError(
    401,
    "Invalid authentication token",
    details || "Your sign-in session could not be verified. Please sign in again.",
    "INVALID_AUTH_TOKEN"
  );
}

function parseCacheExpiry(headers = {}) {
  const now = Date.now();
  const cacheControl = String(headers["cache-control"] || "");
  const maxAgeMatch = cacheControl.match(/(?:^|,)\s*max-age=(\d+)/i);

  if (maxAgeMatch) {
    return now + Number(maxAgeMatch[1]) * 1000;
  }

  const expiresAt = Date.parse(headers.expires || "");

  if (Number.isFinite(expiresAt) && expiresAt > now) {
    return expiresAt;
  }

  return now + DEFAULT_CERT_CACHE_TTL_MS;
}

async function fetchSecureTokenCertificates() {
  try {
    const response = await axios.get(SECURE_TOKEN_CERTS_URL, {
      responseType: "json",
      timeout: 5000,
    });
    const certificates = response.data;

    if (
      !certificates ||
      typeof certificates !== "object" ||
      Array.isArray(certificates)
    ) {
      throw new Error("Google securetoken certificates response was not an object.");
    }

    const normalizedCertificates = Object.fromEntries(
      Object.entries(certificates).filter(
        ([keyId, certificate]) =>
          typeof keyId === "string" &&
          keyId.trim() &&
          typeof certificate === "string" &&
          certificate.trim()
      )
    );

    if (Object.keys(normalizedCertificates).length === 0) {
      throw new Error("Google securetoken certificates response was empty.");
    }

    cachedSecureTokenCertificates = normalizedCertificates;
    cachedSecureTokenCertificatesExpiresAt = parseCacheExpiry(response.headers);

    return normalizedCertificates;
  } catch (error) {
    console.warn("[reviews-auth] Unable to refresh Firebase public certificates:", {
      message: error.message || "Unknown certificate fetch error",
    });

    throw createFirebaseAuthError(
      503,
      "Authentication verification unavailable",
      "Firebase token verification is temporarily unavailable. Please try again.",
      "AUTH_VERIFICATION_UNAVAILABLE"
    );
  }
}

async function getSecureTokenCertificates() {
  if (
    cachedSecureTokenCertificates &&
    cachedSecureTokenCertificatesExpiresAt > Date.now()
  ) {
    return cachedSecureTokenCertificates;
  }

  if (!certificateRefreshPromise) {
    certificateRefreshPromise = fetchSecureTokenCertificates().finally(() => {
      certificateRefreshPromise = null;
    });
  }

  return certificateRefreshPromise;
}

function base64UrlToBuffer(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function decodeJwtJsonSection(value) {
  const decoded = base64UrlToBuffer(value).toString("utf8");
  return JSON.parse(decoded);
}

function parseJwt(idToken) {
  const parts = idToken.split(".");

  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Token must contain three JWT sections.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtJsonSection(encodedHeader);
  const payload = decodeJwtJsonSection(encodedPayload);

  if (!header || typeof header !== "object" || Array.isArray(header)) {
    throw new Error("JWT header is invalid.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("JWT payload is invalid.");
  }

  return {
    encodedHeader,
    encodedPayload,
    header,
    payload,
    signature: base64UrlToBuffer(encodedSignature),
  };
}

function verifyJwtSignature(parsedToken, certificate, tokenFingerprint) {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${parsedToken.encodedHeader}.${parsedToken.encodedPayload}`);
  verifier.end();

  try {
    return verifier.verify(certificate, parsedToken.signature);
  } catch (_error) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "signature verification errored",
      {
        kid: parsedToken.header.kid,
        tokenFingerprint,
      }
    );
  }
}

function getJwtNumericDate(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validateFirebaseClaims(payload, projectId, tokenFingerprint, keyId) {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const expiresAt = getJwtNumericDate(payload.exp);
  const issuedAt = getJwtNumericDate(payload.iat);
  const now = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw createInvalidTokenError(
      "Your sign-in session belongs to a different Firebase project.",
      "audience mismatch",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  if (payload.iss !== expectedIssuer) {
    throw createInvalidTokenError(
      "Your sign-in session belongs to a different Firebase project.",
      "issuer mismatch",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  if (!expiresAt || expiresAt <= now) {
    throw createInvalidTokenError(
      "Your sign-in session has expired. Please sign in again.",
      "token expired",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  if (issuedAt && issuedAt > now + 300) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "token issued in the future",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  const uid =
    typeof payload.sub === "string" && payload.sub.trim()
      ? payload.sub.trim()
      : typeof payload.user_id === "string" && payload.user_id.trim()
        ? payload.user_id.trim()
        : "";

  if (!uid) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "missing uid",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  return uid;
}

async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw createFirebaseAuthError(
      401,
      "Authentication required",
      "Sign in with Google before submitting a review.",
      "AUTH_REQUIRED"
    );
  }

  const tokenFingerprint = getTokenFingerprint(idToken);
  let parsedToken;

  try {
    parsedToken = parseJwt(idToken);
  } catch (_error) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "malformed token",
      {
        tokenFingerprint,
      }
    );
  }

  const keyId = parsedToken.header.kid;

  if (parsedToken.header.alg !== "RS256") {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "unsupported algorithm",
      {
        alg: parsedToken.header.alg,
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  if (typeof keyId !== "string" || !keyId.trim()) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "missing key id",
      {
        tokenFingerprint,
      }
    );
  }

  const projectId = getFirebaseProjectId();
  const certificates = await getSecureTokenCertificates();
  const certificate = certificates[keyId];

  if (!certificate) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "unknown key id",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  const signatureIsValid = verifyJwtSignature(
    parsedToken,
    certificate,
    tokenFingerprint
  );

  if (!signatureIsValid) {
    throw createInvalidTokenError(
      "Your sign-in session could not be verified. Please sign in again.",
      "invalid signature",
      {
        kid: keyId,
        tokenFingerprint,
      }
    );
  }

  const uid = validateFirebaseClaims(
    parsedToken.payload,
    projectId,
    tokenFingerprint,
    keyId
  );
  const signInProvider = parsedToken.payload.firebase?.sign_in_provider || "";

  if (signInProvider !== "google.com") {
    console.warn("[reviews-auth] Firebase ID token rejected for reviews:", {
      reason: "non-google provider",
      provider: signInProvider || "unknown",
      uid,
    });

    throw createFirebaseAuthError(
      401,
      "Google sign-in required",
      "Sign in with Google before submitting a review. Anonymous reviews are not allowed.",
      signInProvider === "anonymous"
        ? "ANONYMOUS_REVIEW_BLOCKED"
        : "GOOGLE_SIGN_IN_REQUIRED"
    );
  }

  return {
    ...parsedToken.payload,
    uid,
  };
}

function getBearerTokenFromRequest(req) {
  const authorizationHeader = req.headers.authorization || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

async function requireFirebaseUser(req, res, next) {
  try {
    const decodedToken = await verifyFirebaseIdToken(getBearerTokenFromRequest(req));

    req.firebaseUser = {
      uid: decodedToken.uid,
      name:
        typeof decodedToken.name === "string" && decodedToken.name.trim()
          ? decodedToken.name.trim()
          : decodedToken.email || "Google user",
      email: decodedToken.email || "",
      photoURL:
        typeof decodedToken.picture === "string" && decodedToken.picture.trim()
          ? decodedToken.picture.trim()
          : typeof decodedToken.photoURL === "string" && decodedToken.photoURL.trim()
            ? decodedToken.photoURL.trim()
            : "",
      provider: decodedToken.firebase?.sign_in_provider || "",
    };

    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      code: error.code || "AUTH_FAILED",
      error: error.message || "Authentication failed",
      details: error.details || "Please sign in again.",
    });
  }
}

module.exports = {
  requireFirebaseUser,
  verifyFirebaseIdToken,
};
