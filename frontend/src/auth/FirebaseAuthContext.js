import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebaseClient";

const FirebaseAuthContext = createContext(null);

async function ensureProfile(user, overrides) {
  const { ensureUserProfile } = await import("../lib/firebaseUserData");
  return ensureUserProfile(user, overrides);
}

export function FirebaseAuthProvider({ children }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser);
      setLoading(false);
    });
  }, [auth]);

  const value = useMemo(() => {
    const login = async (email, password) => {
      if (!auth) {
        throw Object.assign(new Error("Firebase Auth is not configured."), {
          code: "FIREBASE_NOT_CONFIGURED",
        });
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);

      try {
        await ensureProfile(credential.user);
      } catch (profileError) {
        console.warn("[auth] Unable to refresh user profile:", profileError);
      }

      return credential;
    };

    const register = async (email, password, displayName = "") => {
      if (!auth) {
        throw Object.assign(new Error("Firebase Auth is not configured."), {
          code: "FIREBASE_NOT_CONFIGURED",
        });
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const trimmedDisplayName = displayName.trim();

      if (trimmedDisplayName) {
        await updateProfile(credential.user, {
          displayName: trimmedDisplayName,
        });
      }

      await ensureProfile(credential.user, {
        displayName: trimmedDisplayName || credential.user.displayName || "",
      });

      return credential;
    };

    const googleLogin = async (language = "ka") => {
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

      const credential = await signInWithPopup(auth, provider);

      try {
        await ensureProfile(credential.user);
      } catch (profileError) {
        console.warn("[auth] Unable to create Google user profile:", profileError);
      }

      return credential;
    };

    const logout = async () => {
      if (!auth) {
        return;
      }

      await signOut(auth);
    };

    return {
      authConfigured: Boolean(auth),
      currentUser,
      loading,
      user: currentUser,
      login,
      register,
      googleLogin,
      logout,
      signInWithGoogle: googleLogin,
      signOutGoogle: logout,
    };
  }, [auth, currentUser, loading]);

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
