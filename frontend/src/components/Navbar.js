import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "../auth/FirebaseAuthContext";
import logoMain from "../assets/AroundTheWorld_128.png";
import { useLanguage } from "../i18n/LanguageContext";

const TourSearchModal = lazy(() => import("./TourSearchModal"));

const LANGUAGE_OPTIONS = [
  {
    value: "ka",
    Icon: GeorgiaFlagIcon,
    label: "\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8",
    shortLabel: "KA",
  },
  {
    value: "en",
    Icon: UnitedKingdomFlagIcon,
    label: "English",
    shortLabel: "EN",
  },
];

const ACCOUNT_LABELS = {
  ka: {
    account: "ანგარიში",
    login: "შესვლა",
    register: "რეგისტრაცია",
    profile: "პროფილი",
    logout: "გასვლა",
  },
  en: {
    account: "Account",
    login: "Login",
    register: "Register",
    profile: "Profile",
    logout: "Logout",
  },
};

export default function Navbar({ variant = "page" }) {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navSubtitle = t("nav.subtitle");

  const navItems = useMemo(
    () => [
      { to: "/", label: t("nav.home"), end: true },
      { to: "/tours", label: t("nav.tours") },
      { to: "/visa-services", label: t("nav.visaServices") },
      { to: "/blog", label: t("nav.blog") },
      { to: "/about", label: t("nav.about") },
      { to: "/contact", label: t("nav.contact") },
    ],
    [t]
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.hash, location.pathname, location.search, variant]);

  const navContainerClassName =
    "border border-white/10 bg-[#111111]/95 px-3 py-3 shadow-[0_28px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-5";
  const menuPanelClassName =
    "border-white/10 bg-[#171717]/98 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.95)]";

  return (
    <nav className={`sticky top-4 z-30 w-full ${navContainerClassName}`}>
      <div className="hidden min-w-0 items-center gap-5 xl:flex">
        <BrandLink navSubtitle={navSubtitle} />

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 2xl:gap-2">
          {navItems.map((item) => (
            <HeaderNavLink key={item.to} item={item} location={location} />
          ))}
        </div>

        <div className="flex min-w-0 flex-shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/12 bg-[var(--aw-accent)] text-slate-950 shadow-[0_16px_34px_-24px_rgba(245,184,0,0.95)] transition hover:-translate-y-0.5 hover:bg-[var(--aw-accent-hover)]"
            aria-label={t("nav.searchTours")}
            title={t("nav.searchTours")}
          >
            <SearchIcon className="h-4 w-4" />
          </button>

          <Controls
            language={language}
            setLanguage={setLanguage}
            t={t}
          />
        </div>
      </div>

      <div className="xl:hidden">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <BrandLink navSubtitle={navSubtitle} compact />

          <button
            type="button"
            onClick={() => setIsMenuOpen((currentState) => !currentState)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:bg-white/14"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={isMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div
          className={`mt-4 space-y-4 rounded-[1.15rem] border p-4 xl:hidden ${menuPanelClassName}`}
        >
          <div className="grid gap-2">
            {navItems.map((item) => (
              <HeaderNavLink
                key={item.to}
                item={item}
                location={location}
                mobile
              />
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-[0.9rem] border border-white/10 bg-[var(--aw-accent)] px-4 py-3 text-left text-sm font-black uppercase text-slate-950 shadow-[0_16px_34px_-24px_rgba(245,184,0,0.95)] transition hover:bg-[var(--aw-accent-hover)]"
            >
              <span>{t("common.searchPlaceholder")}</span>
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>

          <Controls
            language={language}
            setLanguage={setLanguage}
            t={t}
            mobile
          />
        </div>
      ) : null}

      {isSearchOpen ? (
        <Suspense fallback={null}>
          <TourSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
      ) : null}
    </nav>
  );
}

function BrandLink({ compact = false, navSubtitle }) {
  return (
    <Link to="/" className="flex min-w-0 flex-shrink-0 items-center gap-3 text-left">
      <span
        className={`flex items-center rounded-lg border border-white/10 bg-white/8 px-2.5 shadow-[0_16px_34px_-28px_rgba(0,0,0,0.95)] backdrop-blur ${
          compact ? "h-11" : "h-12"
        }`}
      >
        <img
          src={logoMain}
          alt="Around The World"
          width="128"
          height="128"
          decoding="async"
          className={`w-auto object-contain ${compact ? "h-12 sm:h-14" : "h-14"}`}
        />
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="[font-family:var(--font-display)] block truncate text-base font-bold text-white 2xl:text-xl">
          Around The World
        </span>
        {navSubtitle ? (
          <span className="hidden truncate text-sm text-white/84 2xl:block">
            {navSubtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function HeaderNavLink({ item, location, mobile = false }) {
  const isHashActive =
    item.hashOnly && location.pathname === "/" && location.hash === "#about";

  if (item.hashOnly) {
    return (
      <Link
        to={item.to}
        className={
          mobile
            ? getMobileNavLinkClass(isHashActive)
            : getDesktopNavLinkClass(isHashActive)
        }
      >
        {item.label}
      </Link>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        mobile
          ? getMobileNavLinkClass(isActive)
          : getDesktopNavLinkClass(isActive)
      }
    >
      {item.label}
    </NavLink>
  );
}

function getDesktopNavLinkClass(isActive) {
  return `whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition 2xl:px-4 ${
    isActive
      ? "bg-[var(--aw-accent)] text-slate-950 shadow-[0_14px_32px_-24px_rgba(245,184,0,0.95)]"
      : "text-white/76 hover:bg-white/8 hover:text-white"
  }`;
}

function getMobileNavLinkClass(isActive) {
  return `rounded-[0.9rem] px-4 py-3 text-left text-sm font-semibold transition ${
    isActive
      ? "bg-[var(--aw-accent)] text-slate-950"
      : "bg-white/8 text-white/84 hover:bg-white/10 hover:text-white"
  }`;
}

function Controls({ language, setLanguage, t, mobile = false }) {
  const { currentUser, ensureAuthReady, loading, logout } = useFirebaseAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountLabels = ACCOUNT_LABELS[language] || ACCOUNT_LABELS.ka;

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
  };

  const handleAccountToggle = () => {
    setIsAccountMenuOpen((currentState) => {
      const nextState = !currentState;

      if (nextState) {
        void ensureAuthReady().catch(() => {});
      }

      return nextState;
    });
  };

  return (
    <div
      className={
        mobile
          ? "grid gap-3 border-t border-white/10 pt-4"
          : "flex items-center gap-2"
      }
    >
      <LanguageDropdown
        language={language}
        setLanguage={setLanguage}
        label={t("common.language")}
        mobile={mobile}
      />

      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={handleAccountToggle}
          disabled={loading}
          className={
            mobile
              ? "flex min-h-11 w-full items-center justify-between rounded-[0.9rem] border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white/84 transition hover:border-[var(--aw-accent)] hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-70"
              : "flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/84 transition hover:border-[var(--aw-accent)] hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-70"
          }
          aria-label={accountLabels.account}
          aria-haspopup="menu"
          aria-expanded={isAccountMenuOpen}
          title={accountLabels.account}
        >
          {mobile ? <span>{accountLabels.account}</span> : null}
          <UserIcon />
        </button>

        {isAccountMenuOpen ? (
          <div
            className={`z-50 mt-2 overflow-hidden rounded-[1rem] border border-white/12 bg-[#1c1f1f]/98 p-1 text-sm font-semibold text-white shadow-[0_20px_70px_-38px_rgba(0,0,0,0.95)] backdrop-blur ${
              mobile ? "w-full" : "absolute right-0 top-full w-48"
            }`}
            role="menu"
          >
            {currentUser ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block rounded-[0.95rem] px-4 py-3 transition hover:bg-white/10"
                  role="menuitem"
                >
                  {accountLabels.profile}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="block w-full rounded-[0.95rem] px-4 py-3 text-left transition hover:bg-white/10"
                  role="menuitem"
                >
                  {accountLabels.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block rounded-[0.95rem] px-4 py-3 transition hover:bg-white/10"
                  role="menuitem"
                >
                  {accountLabels.login}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block rounded-[0.95rem] px-4 py-3 transition hover:bg-white/10"
                  role="menuitem"
                >
                  {accountLabels.register}
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LanguageDropdown({ language, setLanguage, label, mobile = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.value === language) || LANGUAGE_OPTIONS[0];
  const dropdownOptions = LANGUAGE_OPTIONS.filter(
    (option) => option.value !== currentOption.value
  );
  const CurrentFlag = currentOption.Icon;

  useEffect(() => {
    setIsOpen(false);
  }, [language]);

  return (
    <div className={`relative flex-shrink-0 ${mobile ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((currentState) => !currentState)}
        className={
          mobile
            ? "flex min-h-11 w-full items-center justify-between rounded-[0.9rem] border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white/84 transition hover:border-[var(--aw-accent)] hover:bg-white/12 hover:text-white"
            : "flex h-10 min-w-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-2.5 text-white/84 transition hover:border-[var(--aw-accent)] hover:bg-white/12 hover:text-white"
        }
        aria-label={`${label}: ${currentOption.label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={currentOption.label}
      >
        <span className="flex items-center gap-3">
          <CurrentFlag />
          {mobile ? (
            <span>
              {currentOption.label} / {currentOption.shortLabel}
            </span>
          ) : null}
        </span>
        <span className="h-2 w-2 rotate-45 border-b border-r border-current opacity-70" />
      </button>

      {isOpen ? (
        <div
          className={`z-50 mt-2 overflow-hidden rounded-[0.95rem] border border-white/12 bg-[#1c1f1f]/98 p-1 text-sm font-semibold text-white shadow-[0_20px_70px_-38px_rgba(0,0,0,0.95)] backdrop-blur ${
            mobile ? "w-full" : "absolute right-0 top-full w-40"
          }`}
          role="menu"
        >
          {dropdownOptions.map((option) => {
            const FlagIcon = option.Icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setLanguage(option.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-3 text-left transition hover:bg-white/10"
                role="menuitem"
              >
                <FlagIcon />
                <span>{option.shortLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function GeorgiaFlagIcon() {
  return (
    <svg
      viewBox="0 0 28 20"
      className="h-[22px] w-7 rounded-[0.2rem] shadow-sm ring-1 ring-black/10"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="28" height="20" fill="#fff" />
      <rect x="11" width="6" height="20" fill="#D40000" />
      <rect y="7" width="28" height="6" fill="#D40000" />
      <path
        fill="#D40000"
        d="M6 4h1.4v2.1h2.1v1.4H7.4v2.1H6V7.5H3.9V6.1H6V4Zm14.6 0H22v2.1h2.1v1.4H22v2.1h-1.4V7.5h-2.1V6.1h2.1V4ZM6 12.4h1.4v2.1h2.1v1.4H7.4V18H6v-2.1H3.9v-1.4H6v-2.1Zm14.6 0H22v2.1h2.1v1.4H22V18h-1.4v-2.1h-2.1v-1.4h2.1v-2.1Z"
      />
    </svg>
  );
}

function UnitedKingdomFlagIcon() {
  return (
    <svg
      viewBox="0 0 28 20"
      className="h-[22px] w-7 rounded-[0.2rem] shadow-sm ring-1 ring-black/10"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="28" height="20" fill="#012169" />
      <path stroke="#fff" strokeWidth="4.8" d="M0 0 28 20M28 0 0 20" />
      <path stroke="#C8102E" strokeWidth="2.6" d="M0 0 28 20M28 0 0 20" />
      <path stroke="#fff" strokeWidth="7" d="M14 0v20M0 10h28" />
      <path stroke="#C8102E" strokeWidth="4.2" d="M14 0v20M0 10h28" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}
