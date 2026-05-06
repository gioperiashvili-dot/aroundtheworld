const admin = require("firebase-admin");
const {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_JSON,
} = require("../config/env");

function createFirebaseAuthError(statusCode, error, details, code) {
  const authError = new Error(error);
  authError.statusCode = statusCode;
  authError.details = details;
  authError.code = code;
  return authError;
}

function parseServiceAccountJson() {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
    return null;
  }

  try {
    const parsed = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    throw createFirebaseAuthError(
      500,
      "Firebase authentication is not configured",
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.",
      "FIREBASE_CONFIG_INVALID"
    );
  }
}

function getServiceAccountFromEnv() {
  const jsonServiceAccount = parseServiceAccountJson();

  if (jsonServiceAccount) {
    return {
      ...jsonServiceAccount,
      private_key: String(jsonServiceAccount.private_key || "").replace(/\\n/g, "\n"),
    };
  }

  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return {
    project_id: FIREBASE_PROJECT_ID,
    client_email: FIREBASE_CLIENT_EMAIL,
    private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

function hasFirebaseConfiguration() {
  return Boolean(
    FIREBASE_SERVICE_ACCOUNT_JSON ||
      (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT
  );
}

function getFirebaseApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  if (!hasFirebaseConfiguration()) {
    throw createFirebaseAuthError(
      500,
      "Firebase authentication is not configured",
      "Set Firebase Admin credentials on the backend before accepting reviews.",
      "FIREBASE_CONFIG_MISSING"
    );
  }

  const serviceAccount = getServiceAccountFromEnv();

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });
  }

  if (FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT) {
    return admin.initializeApp({
      projectId: FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    });
  }

  return admin.initializeApp();
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

  try {
    const decodedToken = await admin.auth(getFirebaseApp()).verifyIdToken(idToken);
    const signInProvider = decodedToken.firebase?.sign_in_provider || "";

    if (!decodedToken.uid || signInProvider !== "google.com") {
      throw createFirebaseAuthError(
        401,
        "Google sign-in required",
        "Sign in with Google before submitting a review. Anonymous reviews are not allowed.",
        signInProvider === "anonymous"
          ? "ANONYMOUS_REVIEW_BLOCKED"
          : "GOOGLE_SIGN_IN_REQUIRED"
      );
    }

    return decodedToken;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createFirebaseAuthError(
      401,
      "Invalid authentication token",
      "Your sign-in session could not be verified. Please sign in again.",
      "AUTH_TOKEN_INVALID"
    );
  }
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
