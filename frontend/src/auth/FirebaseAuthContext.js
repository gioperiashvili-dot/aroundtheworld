import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const FirebaseAuthContext = createContext(null);
const AUTH_DEFER_MS = 2800;
const AUTH_IDLE_TIMEOUT_MS = 2200;
let firebaseAuthSdkPromise = null;

function hasFirebaseEnvConfig() {
  return Boolean(
    process.env.REACT_APP_FIREBASE_API_KEY &&
      process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
      process.env.REACT_APP_FIREBASE_PROJECT_ID &&
      process.env.REACT_APP_FIREBASE_APP_ID
  );
}

async function loadFirebaseAuthSdk() {
  if (!firebaseAuthSdkPromise) {
    firebaseAuthSdkPromise = Promise.all([
      import("../lib/firebaseClient"),
      import("firebase/auth"),
    ])
      .then(([firebaseClient, firebaseAuth]) => ({
        auth: firebaseClient.getFirebaseAuth(),
        ...firebaseAuth,
      }))
      .catch((error) => {
        firebaseAuthSdkPromise = null;
        throw error;
      });
  }

  return firebaseAuthSdkPromise;
}

function scheduleDeferredAuth(callback) {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  let idleId = null;
  const timeoutId = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(callback, {
        timeout: AUTH_IDLE_TIMEOUT_MS,
      });
      return;
    }

    callback();
  }, AUTH_DEFER_MS);

  return () => {
    window.clearTimeout(timeoutId);

    if (idleId !== null && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
  };
}

async function ensureProfile(user, overrides) {
  const { ensureUserProfile } = await import("../lib/firebaseUserData");
  return ensureUserProfile(user, overrides);
}

export function FirebaseAuthProvider({ children }) {
  const initialAuthConfigured = useMemo(() => hasFirebaseEnvConfig(), []);
  const authSdkRef = useRef(null);
  const initializePromiseRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(initialAuthConfigured);
  const [authConfigured, setAuthConfigured] = useState(initialAuthConfigured);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const initializeAuth = useCallback(async () => {
    if (authSdkRef.current) {
      return authSdkRef.current;
    }

    if (!hasFirebaseEnvConfig()) {
      if (isMountedRef.current) {
        setAuthConfigured(false);
        setLoading(false);
      }

      return { auth: null };
    }

    if (initializePromiseRef.current) {
      return initializePromiseRef.current;
    }

    if (isMountedRef.current) {
      setLoading(true);
    }

    initializePromiseRef.current = loadFirebaseAuthSdk()
      .then((sdk) => {
        authSdkRef.current = sdk;

        if (!isMountedRef.current) {
          return sdk;
        }

        const nextAuthConfigured = Boolean(sdk.auth);
        setAuthConfigured(nextAuthConfigured);

        if (!sdk.auth) {
          setCurrentUser(null);
          setLoading(false);
          return sdk;
        }

        if (!unsubscribeRef.current) {
          unsubscribeRef.current = sdk.onAuthStateChanged(
            sdk.auth,
            (nextUser) => {
              if (!isMountedRef.current) {
                return;
              }

              setCurrentUser(nextUser);
              setLoading(false);
            },
            (authError) => {
              console.warn("[auth] Unable to observe auth state:", authError);

              if (isMountedRef.current) {
                setCurrentUser(null);
                setLoading(false);
              }
            }
          );
        }

        return sdk;
      })
      .catch((error) => {
        initializePromiseRef.current = null;
        console.warn("[auth] Unable to initialize Firebase Auth:", error);

        if (isMountedRef.current) {
          setAuthConfigured(false);
          setCurrentUser(null);
          setLoading(false);
        }

        throw error;
      });

    return initializePromiseRef.current;
  }, []);

  useEffect(() => {
    if (!initialAuthConfigured) {
      setLoading(false);
      return undefined;
    }

    return scheduleDeferredAuth(() => {
      void initializeAuth().catch(() => {});
    });
  }, [initialAuthConfigured, initializeAuth]);

  const value = useMemo(() => {
    const login = async (email, password) => {
      const sdk = await initializeAuth();

      if (!sdk.auth) {
        throw Object.assign(new Error("Firebase Auth is not configured."), {
          code: "FIREBASE_NOT_CONFIGURED",
        });
      }

      const credential = await sdk.signInWithEmailAndPassword(sdk.auth, email, password);

      try {
        await ensureProfile(credential.user);
      } catch (profileError) {
        console.warn("[auth] Unable to refresh user profile:", profileError);
      }

      return credential;
    };

    const register = async (email, password, displayName = "") => {
      const sdk = await initializeAuth();

      if (!sdk.auth) {
        throw Object.assign(new Error("Firebase Auth is not configured."), {
          code: "FIREBASE_NOT_CONFIGURED",
        });
      }

      const credential = await sdk.createUserWithEmailAndPassword(sdk.auth, email, password);
      const trimmedDisplayName = displayName.trim();

      if (trimmedDisplayName) {
        await sdk.updateProfile(credential.user, {
          displayName: trimmedDisplayName,
        });
      }

      await ensureProfile(credential.user, {
        displayName: trimmedDisplayName || credential.user.displayName || "",
      });

      return credential;
    };

    const googleLogin = async (language = "ka") => {
      const sdk = await initializeAuth();

      if (!sdk.auth) {
        throw Object.assign(new Error("Firebase Auth is not configured."), {
          code: "FIREBASE_NOT_CONFIGURED",
        });
      }

      sdk.auth.languageCode = language === "en" ? "en" : "ka";
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential = await sdk.signInWithPopup(sdk.auth, provider);

      try {
        await ensureProfile(credential.user);
      } catch (profileError) {
        console.warn("[auth] Unable to create Google user profile:", profileError);
      }

      return credential;
    };

    const logout = async () => {
      const sdk = await initializeAuth();

      if (!sdk.auth) {
        return;
      }

      await sdk.signOut(sdk.auth);
    };

    return {
      authConfigured,
      currentUser,
      ensureAuthReady: initializeAuth,
      loading,
      user: currentUser,
      login,
      register,
      googleLogin,
      logout,
      signInWithGoogle: googleLogin,
      signOutGoogle: logout,
    };
  }, [authConfigured, currentUser, initializeAuth, loading]);

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
