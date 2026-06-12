const admin = require("firebase-admin");
const {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_JSON,
} = require("../config/env");

function createFirebaseAdminError(details) {
  const error = new Error("Firebase Admin is not configured");
  error.statusCode = 503;
  error.code = "FIREBASE_ADMIN_NOT_CONFIGURED";
  error.details = details;
  return error;
}

function normalizePrivateKey(privateKey) {
  return String(privateKey || "").replace(/\\n/g, "\n");
}

function getServiceAccountConfig() {
  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);

      return {
        projectId: serviceAccount.project_id || serviceAccount.projectId,
        clientEmail: serviceAccount.client_email || serviceAccount.clientEmail,
        privateKey: normalizePrivateKey(
          serviceAccount.private_key || serviceAccount.privateKey
        ),
      };
    } catch (_error) {
      throw createFirebaseAdminError(
        "FIREBASE_SERVICE_ACCOUNT_JSON must be valid service account JSON."
      );
    }
  }

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
    };
  }

  throw createFirebaseAdminError(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
  );
}

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const appConfig = {
    credential: admin.credential.cert(getServiceAccountConfig()),
  };

  return admin.initializeApp(appConfig);
}

function getAdminFirestore() {
  return getFirebaseAdminApp().firestore();
}

async function verifyFirebaseUserIdToken(idToken) {
  const token = String(idToken || "").trim();

  if (!token) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    error.code = "AUTH_REQUIRED";
    error.details = "Sign in before downloading booking documents.";
    throw error;
  }

  try {
    return await admin.auth(getFirebaseAdminApp()).verifyIdToken(token);
  } catch (_error) {
    const error = new Error("Invalid authentication token");
    error.statusCode = 401;
    error.code = "INVALID_AUTH_TOKEN";
    error.details = "Your sign-in session could not be verified. Please sign in again.";
    throw error;
  }
}

module.exports = {
  admin,
  getFirebaseAdminApp,
  getAdminFirestore,
  verifyFirebaseUserIdToken,
};
