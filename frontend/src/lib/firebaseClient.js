import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

export function getFirebaseConfig() {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
}

export function hasFirebaseConfig(config = getFirebaseConfig()) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseApp() {
  const config = getFirebaseConfig();

  if (!hasFirebaseConfig(config)) {
    return null;
  }

  return getApps().length > 0 ? getApps()[0] : initializeApp(config);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}
