import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const FirebaseAuthContext = createContext(null);

function getFirebaseConfig() {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
}

function hasFirebaseConfig(config) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function getConfiguredAuth() {
  const config = getFirebaseConfig();

  if (!hasFirebaseConfig(config)) {
    return null;
  }

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  return getAuth(app);
}

export function FirebaseAuthProvider({ children }) {
  const auth = useMemo(() => getConfiguredAuth(), []);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [auth]);

  const value = useMemo(
    () => ({
      authConfigured: Boolean(auth),
      loading,
      user,
      async signInWithGoogle(language = "ka") {
        if (!auth) {
          throw Object.assign(new Error("Firebase Auth is not configured."), {
            code: "FIREBASE_NOT_CONFIGURED",
          });
        }

        auth.languageCode = language === "en" ? "en" : "ka";
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: "select_account",
        });

        return signInWithPopup(auth, provider);
      },
      async signOutGoogle() {
        if (!auth) {
          return;
        }

        await signOut(auth);
      },
    }),
    [auth, loading, user]
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);

  if (!context) {
    throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider.");
  }

  return context;
}
