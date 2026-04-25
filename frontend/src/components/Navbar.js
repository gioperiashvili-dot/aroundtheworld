import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import TourSearchModal from "./TourSearchModal";
import logoMain from "../assets/AroundTheWorld_Logo_Main.png";
import { useLanguage } from "../i18n/LanguageContext";
import { useTheme } from "../theme/ThemeContext";

const LANGUAGE_OPTIONS = [
  {
    value: "ka",
    Icon: GeorgiaFlagIcon,
    label: "\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8",
  },
  {
    value: "en",
    Icon: UnitedKingdomFlagIcon,
    label: "English",
  },
];

export default function Navbar({ variant = "page" }) {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isHomeVariant = variant === "home";
  const navSubtitle = t("nav.subtitle");

  const navItems = useMemo(
    () => [
      { to: "/", label: t("nav.home"), end: true },
      { to: "/tours", label: t("nav.tours") },
      { to: "/flights", label: t("nav.flights") },
      { to: "/hotels", label: t("nav.hotels") },
      { to: "/restaurants", label: t("nav.restaurants") },
      { to: "/contact", label: t("nav.contact") },
    ],
    [t]
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search, variant]);

  const navContainerClassName = isHomeVariant
    ? "rounded-[2rem] border border-white/12 bg-black/12 px-5 py-4 shadow-[0_25px_90px_-55px_rgba(15,23,42,0.95)] backdrop-blur-xl"
    : "rounded-[2rem] border border-white/18 bg-black/14 px-5 py-4 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.85)] backdrop-blur-xl";

  const menuPanelClassName = isHomeVariant
    ? "border-white/12 bg-black/18"
    : "border-white/12 bg-slate-950/55";

  return (
    <nav className={`sticky top-4 z-30 w-full ${navContainerClassName}`}>
      <div className="flex min-w-0 items-center justify-between gap-3 lg:gap-4">
        <Link to="/" className="flex min-w-0 flex-shrink-0 items-center gap-3 text-left">
          <span className="flex h-12 items-center rounded-2xl bg-white/14 px-2.5 shadow-lg shadow-cyan-950/30 backdrop-blur">
            <img
              src={logoMain}
              alt="Around The World"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="[font-family:var(--font-display)] block truncate text-xl font-bold text-white 2xl:text-2xl">
              Around The World
            </span>
            {navSubtitle ? (
              <span className="hidden truncate text-sm text-white/70 2xl:block">
                {navSubtitle}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-shrink items-center justify-end gap-2 xl:flex 2xl:gap-3">
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5 whitespace-nowrap 2xl:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition 2xl:px-4 2xl:text-sm ${
                    isActive
                      ? "bg-white text-slate-950 shadow-lg"
                      : isHomeVariant
                        ? "text-white/84 hover:bg-white/10 hover:text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/18 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex-shrink-0 rounded-full bg-[#ff5a5f] p-3 text-white transition hover:bg-[#ff4a50]"
            aria-label={t("nav.searchTours")}
            title={t("nav.searchTours")}
          >
            <SearchIcon className="h-4 w-4" />
          </button>

          <Controls
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            t={t}
          />
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="rounded-full border border-white/15 bg-white/8 p-3 text-white transition hover:bg-white/14"
            aria-label={t("nav.searchTours")}
            title={t("nav.searchTours")}
          >
            <SearchIcon className="h-5 w-5" />
          </button>

          <Controls
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            t={t}
            compact
          />

          <button
            type="button"
            onClick={() => setIsMenuOpen((currentState) => !currentState)}
            className="rounded-full border border-white/15 bg-white/8 p-3 text-white transition hover:bg-white/14"
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
          className={`mt-4 space-y-3 rounded-[1.6rem] border p-4 xl:hidden ${menuPanelClassName}`}
        >
          <div className="grid gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "bg-white/8 text-white/84 hover:bg-white/12 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}

      <TourSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </nav>
  );
}

function Controls({ compact = false, language, setLanguage, theme, toggleTheme, t }) {
  return (
    <div
      className={`flex items-center gap-2 ${compact ? "flex-wrap justify-end" : "flex-nowrap"}`}
    >
      <div
        className="flex flex-shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/8 p-1"
        aria-label={t("common.language")}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <LanguageButton
            key={option.value}
            option={option}
            isActive={language === option.value}
            onSelect={() => setLanguage(option.value)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className={`flex-shrink-0 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[13px] font-semibold text-white/84 transition hover:bg-white/14 hover:text-white 2xl:px-4 2xl:text-sm ${
          compact ? "px-3 text-xs" : ""
        }`}
      >
        {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
      </button>
    </div>
  );
}

function LanguageButton({ option, isActive, onSelect }) {
  const FlagIcon = option.Icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={option.label}
      title={option.label}
      className={`flex h-8 w-10 items-center justify-center rounded-full transition ${
        isActive
          ? "bg-white shadow-sm ring-1 ring-white/70"
          : "opacity-75 hover:bg-white/10 hover:opacity-100"
      }`}
    >
      <FlagIcon />
    </button>
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
