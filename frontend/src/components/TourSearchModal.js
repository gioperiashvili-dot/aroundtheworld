import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchTours } from "../lib/api";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesTour(tour, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return false;
  }

  return [
    tour?.title?.ka,
    tour?.title?.en,
    tour?.destination?.ka,
    tour?.destination?.en,
    tour?.description?.ka,
    tour?.description?.en,
  ].some((value) => normalize(value).includes(normalizedQuery));
}

export default function TourSearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const [query, setQuery] = useState("");
  const [tours, setTours] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isMounted = true;

    const loadTours = async () => {
      try {
        const response = await fetchTours();
        if (isMounted) {
          setTours(Array.isArray(response?.tours) ? response.tours : []);
        }
      } catch {
        if (isMounted) {
          setTours([]);
        }
      }
    };

    void loadTours();
    window.setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (normalize(query).length < 2) {
      return [];
    }

    return tours.filter((tour) => matchesTour(tour, query)).slice(0, 6);
  }, [query, tours]);

  const closeAndNavigate = (path) => {
    onClose();
    setQuery("");
    navigate(path);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      closeAndNavigate(`/tours?search=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/54 px-4 pt-24 backdrop-blur-sm sm:pt-28"
      onMouseDown={(event) => {
        if (panelRef.current && !panelRef.current.contains(event.target)) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl animate-[searchModalIn_180ms_ease-out] overflow-hidden rounded-[2rem] border border-white/20 bg-white/96 shadow-[0_34px_110px_-46px_rgba(2,6,23,0.8)] dark:border-white/10 dark:bg-slate-950/96"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
            {t("tourSearch.title")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={submitSearch} className="p-5">
          <label className="relative block">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("tourSearch.placeholder")}
              className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-400 focus:bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/24"
            />
          </label>
        </form>

        <div className="max-h-[22rem] overflow-y-auto px-5 pb-5">
          {query.trim().length >= 2 && results.length === 0 ? (
            <div className="rounded-[1.5rem] bg-slate-50 px-4 py-5 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {t("tourSearch.noResults")}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="grid gap-3">
              {results.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => closeAndNavigate(`/tours/${tour.id}`)}
                  className="group flex items-center justify-between gap-4 rounded-[1.5rem] bg-slate-50 p-4 text-left transition hover:bg-slate-950 hover:text-white dark:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-950"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">
                      {getLocalized(tour.title, language)}
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-700 group-hover:text-white/72 dark:text-slate-300 dark:group-hover:text-slate-600">
                      {getLocalized(tour.destination, language)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950 dark:bg-slate-950 dark:text-white">
                    {t("tourSearch.viewTour")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
