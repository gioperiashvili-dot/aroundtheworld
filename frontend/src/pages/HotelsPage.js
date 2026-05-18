import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BookingSearchTabs from "../components/BookingSearchTabs";
import EmptyState from "../components/EmptyState";
import HotelCard from "../components/HotelCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchHotels } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";
import { buildWebPageStructuredData } from "../lib/structuredData";

function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallbackValue : parsed;
}

export default function HotelsPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const lastAutoSearchRef = useRef("");

  const loadHotels = useCallback(async (search) => {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetchHotels(search);

      setResults(
        Array.isArray(response?.results)
          ? response.results
          : Array.isArray(response?.hotels)
            ? response.hotels
            : []
      );
    } catch (requestError) {
      setResults([]);
      setError(
        getFriendlyApiError(requestError, t("hotels.errors.searchFailed"), {
          providerUnavailableMessage: t("common.providerUnavailable"),
        })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const cityParam = searchParams.get("city") || "";
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";
    const rooms = parsePositiveInteger(searchParams.get("rooms"), 1);
    const adults = parsePositiveInteger(searchParams.get("adults"), 2);
    const currencyCode = searchParams.get("currencyCode") || undefined;

    if (
      !cityParam ||
      !checkIn ||
      !checkOut ||
      searchParams.get("auto") !== "1" ||
      checkOut <= checkIn
    ) {
      return;
    }

    const searchKey = `${cityParam}|${checkIn}|${checkOut}|${rooms}|${adults}|${currencyCode || ""}`;

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;

    void loadHotels({
      city: cityParam,
      checkIn,
      checkOut,
      rooms,
      adults,
      currencyCode,
    });
  }, [loadHotels, searchParams]);

  const handleHotelSearch = useCallback(
    (search, nextParams) => {
      setError("");

      if (searchParams.toString() === nextParams.toString()) {
        const searchKey = `${search.city}|${search.checkIn}|${search.checkOut}|${search.rooms}|${search.adults}|${search.currencyCode || ""}`;
        lastAutoSearchRef.current = searchKey;
        void loadHotels(search);
        return;
      }

      setSearchParams(nextParams);
    },
    [loadHotels, searchParams, setSearchParams]
  );

  const heroContent = t("app.pages.hotels");
  const webPageStructuredData = buildWebPageStructuredData(PAGE_SEO.hotels);

  return (
    <PublicPageShell
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("hotels.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.hotels} structuredData={webPageStructuredData} />
      <section className="space-y-6">
        <BookingSearchTabs
          defaultTab="hotel"
          hotelLoading={loading}
          onHotelSearch={handleHotelSearch}
        />

        {error ? (
          <div className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-6 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? <LoadingSkeleton /> : null}

        {!loading && results.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
                {t("hotels.resultsLabel")}
              </p>
              <p className="text-sm text-white/70">{results.length}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((hotel) => (
                <HotelCard key={hotel.id || hotel.name} hotel={hotel} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error && hasSearched && results.length === 0 ? (
          <EmptyState
            title={t("hotels.empty.noResultsTitle")}
            message={t("hotels.empty.noResultsMessage")}
          />
        ) : null}
      </section>
    </PublicPageShell>
  );
}
