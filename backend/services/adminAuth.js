const crypto = require("crypto");
const { ADMIN_PASSWORD } = require("../config/env");

const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createAdminAuthError(statusCode, error, details) {
  const authError = new Error(error);
  authError.statusCode = statusCode;
  authError.details = details;
  return authError;
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", ADMIN_PASSWORD).update(payload).digest("base64url");
}

function assertAdminConfigured() {
  if (!ADMIN_PASSWORD) {
    throw createAdminAuthError(
      500,
      "Admin access is not configured",
      "Set ADMIN_PASSWORD on the backend before using the admin panel."
    );
  }
}

function createAdminSession(password) {
  assertAdminConfigured();

  if (!password || password !== ADMIN_PASSWORD) {
    throw createAdminAuthError(
      401,
      "Invalid admin password",
      "The password you entered does not match the configured admin access."
    );
  }

  const sessionPayload = {
    role: "admin",
    issuedAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(sessionPayload));
  const signature = signPayload(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: sessionPayload.expiresAt,
  };
}

function verifyAdminToken(token) {
  assertAdminConfigured();

  if (!token || typeof token !== "string") {
    throw createAdminAuthError(
      401,
      "Admin authentication required",
      "Sign in to access admin routes."
    );
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw createAdminAuthError(
      401,
      "Invalid admin session",
      "The admin session token format is invalid."
    );
  }

  const expectedSignature = signPayload(encodedPayload);

  if (signature !== expectedSignature) {
    throw createAdminAuthError(
      401,
      "Invalid admin session",
      "The admin session token could not be verified."
    );
  }

  let sessionPayload;

  try {
    sessionPayload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch (_error) {
    throw createAdminAuthError(
      401,
      "Invalid admin session",
      "The admin session token payload is invalid."
    );
  }

  if (sessionPayload?.expiresAt <= Date.now()) {
    throw createAdminAuthError(
      401,
      "Admin session expired",
      "Please sign in again to continue."
    );
  }

  return sessionPayload;
}

function getAdminTokenFromRequest(req) {
  const authorizationHeader = req.headers.authorization || "";

  if (authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  return req.headers["x-admin-token"] || "";
}

function requireAdmin(req, res, next) {
  try {
    req.adminSession = verifyAdminToken(getAdminTokenFromRequest(req));
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      error: error.message || "Admin authentication failed",
      details: error.details || "Please sign in again.",
    });
  }
}

module.exports = {
  createAdminSession,
  requireAdmin,
  verifyAdminToken,
};
