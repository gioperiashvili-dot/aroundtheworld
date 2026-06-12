import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "../auth/FirebaseAuthContext";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { buildCanonicalUrl } from "../components/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import { getAuthErrorMessage } from "../lib/authMessages";
import { aroundWorldPageBackground } from "../lib/pageBackgrounds";

const LOGIN_TEXT = {
  ka: {
    eyebrow: "პროფილი",
    title: "შესვლა",
    description: "შედით ანგარიშში და ნახეთ თქვენი ჯავშნები.",
    email: "ელ. ფოსტა",
    password: "პაროლი",
    submit: "შესვლა",
    submitting: "შესვლა...",
    google: "Google-ით შესვლა",
    googleLoading: "Google-ით შესვლა...",
    registerPrompt: "არ გაქვთ ანგარიში?",
    registerLink: "რეგისტრაცია",
    configWarning: "Firebase Auth კონფიგურაცია ვერ მოიძებნა.",
    required: "შეავსეთ ელ. ფოსტა და პაროლი.",
    emailInvalid: "შეიყვანეთ სწორი ელ. ფოსტა.",
    passwordInvalid: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.",
  },
  en: {
    eyebrow: "Profile",
    title: "Login",
    description: "Sign in to your account and view your bookings.",
    email: "Email",
    password: "Password",
    submit: "Login",
    submitting: "Signing in...",
    google: "Continue with Google",
    googleLoading: "Opening Google...",
    registerPrompt: "No account yet?",
    registerLink: "Register",
    configWarning: "Firebase Auth configuration was not found.",
    required: "Please enter email and password.",
    emailInvalid: "Please enter a valid email address.",
    passwordInvalid: "Password must be at least 6 characters.",
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRedirectPath(location) {
  const from = location.state?.from;

  if (from?.pathname) {
    return `${from.pathname}${from.search || ""}${from.hash || ""}`;
  }

  return "/profile";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { authConfigured, currentUser, ensureAuthReady, googleLogin, loading, login } =
    useFirebaseAuth();
  const text = LOGIN_TEXT[language] || LOGIN_TEXT.ka;
  const redirectPath = getRedirectPath(location);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void ensureAuthReady().catch(() => {});
  }, [ensureAuthReady]);

  if (!loading && currentUser) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setError(text.required);
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setError(text.emailInvalid);
      return;
    }

    if (password.length < 6) {
      setError(text.passwordInvalid);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError, language));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleSubmitting(true);
    setError("");

    try {
      await googleLogin(language);
      navigate(redirectPath, { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError, language));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <PublicPageShell
      eyebrow={text.eyebrow}
      title={text.title}
      description={text.description}
      backgroundImage={aroundWorldPageBackground}
      compactHero
    >
      <SEO
        title={`${text.title} | Around The World`}
        description={text.description}
        canonical={buildCanonicalUrl("/login")}
      />

      <section className="mx-auto w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] md:p-8"
          noValidate
        >
          <AuthField
            label={text.email}
            name="email"
            type="email"
            value={form.email}
            onChange={handleFieldChange}
            autoComplete="email"
          />
          <AuthField
            label={text.password}
            name="password"
            type="password"
            value={form.password}
            onChange={handleFieldChange}
            autoComplete="current-password"
          />

          {!authConfigured ? (
            <p className="rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              {text.configWarning}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!authConfigured || loading || submitting || googleSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_-26px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
          >
            {submitting ? text.submitting : text.submit}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!authConfigured || loading || submitting || googleSubmitting}
            className="mt-3 inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/12 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            <GoogleIcon />
            {googleSubmitting ? text.googleLoading : text.google}
          </button>

          <p className="mt-5 text-center text-sm font-medium text-white/68">
            {text.registerPrompt}{" "}
            <Link
              to="/register"
              className="font-semibold text-[var(--aw-accent)] transition hover:text-[var(--aw-accent-hover)]"
            >
              {text.registerLink}
            </Link>
          </p>
        </form>
      </section>
    </PublicPageShell>
  );
}

function AuthField({ label, name, value, onChange, type, autoComplete }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm font-semibold text-white/78">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-[0.85rem] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[var(--aw-accent)]"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 3.1-4.4 3.1-7.3Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-0.9 6.7-2.5L15.5 17c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.7 8.2 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.4l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.3 3.1 7.6l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z"
      />
    </svg>
  );
}
