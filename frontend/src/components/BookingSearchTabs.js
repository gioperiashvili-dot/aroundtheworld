import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AutocompleteInput from "./AutocompleteInput";
import FlightSearchPanel from "./FlightSearchPanel";
import {
  findLocation,
  getCitySearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";

const BOOKING_TABS = ["oneWay", "roundTrip", "hotel", "restaurant"];
const FLIGHT_TABS = new Set(["oneWay", "roundTrip"]);
const CURRENCY_OPTIONS = [
  { value: "GEL", ka: "\u10DA\u10D0\u10E0\u10D8 / \u20be", en: "GEL / \u20be" },
  { value: "USD", ka: "\u10D0\u10E8\u10E8 \u10D3\u10DD\u10DA\u10D0\u10E0\u10D8 / $", en: "USD / $" },
  { value: "EUR", ka: "\u10D4\u10D5\u10E0\u10DD / \u20ac", en: "EUR / \u20ac" },
];

function getDefaultCurrency(language) {
  return language === "ka" ? "GEL" : "USD";
}

function toLocationSuggestion(location, language) {
  return {
    id: location.id || location.code,
    primary: getLocationLabel(location, language),
    secondary: getLocationMeta(location, language),
    tag: location.code,
    value: getLocationLabel(location, language),
    location,
  };
}

function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallbackValue : parsed;
}

function getCityLabelFromParams(params, language) {
  const cityParam = params.get("city") || "";
  const cityLocation = findLocation(cityParam);

  return (
    params.get("cityLabel") ||
    getLocationLabel(cityLocation, language) ||
    cityParam
  );
}

export default function BookingSearchTabs({
  defaultTab = "oneWay",
  flightSearchParams,
  flightLoading = false,
  flightError = "",
  onFlightSearch,
  onFlightFormInteraction,
  hotelLoading = false,
  restaurantLoading = false,
  onHotelSearch,
  onRestaurantSearch,
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(
    BOOKING_TABS.includes(defaultTab) ? defaultTab : "oneWay"
  );
  const [currencyCode, setCurrencyCode] = useState(() => getDefaultCurrency(language));
  const [hotelForm, setHotelForm] = useState({
    city: "",
    cityValue: "",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    adults: 2,
  });
  const [restaurantForm, setRestaurantForm] = useState({
    city: "",
    cityValue: "",
  });
  const [formError, setFormError] = useState("");
  const hasManualCurrencyRef = useRef(false);

  useEffect(() => {
    if (BOOKING_TABS.includes(defaultTab)) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    if (!hasManualCurrencyRef.current) {
      setCurrencyCode(getDefaultCurrency(language));
    }
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const routeCurrency = params.get("currencyCode");

    if (routeCurrency && CURRENCY_OPTIONS.some((option) => option.value === routeCurrency)) {
      hasManualCurrencyRef.current = true;
      setCurrencyCode(routeCurrency);
    }

    if (location.pathname === "/hotels") {
      setHotelForm({
        city: getCityLabelFromParams(params, language),
        cityValue: params.get("city") || "",
        checkIn: params.get("checkIn") || "",
        checkOut: params.get("checkOut") || "",
        rooms: parsePositiveInteger(params.get("rooms"), 1),
        adults: parsePositiveInteger(params.get("adults"), 2),
      });
    }

    if (location.pathname === "/restaurants") {
      setRestaurantForm({
        city: getCityLabelFromParams(params, language),
        cityValue: params.get("city") || "",
      });
    }
  }, [language, location.pathname, location.search]);

  const hotelCitySuggestions = useMemo(
    () =>
      getLocationSuggestions(hotelForm.city).map((locationOption) =>
        toLocationSuggestion(locationOption, language)
      ),
    [hotelForm.city, language]
  );

  const restaurantCitySuggestions = useMemo(
    () =>
      getLocationSuggestions(restaurantForm.city).map((locationOption) =>
        toLocationSuggestion(locationOption, language)
      ),
    [restaurantForm.city, language]
  );

  const handleCurrencyChange = (event) => {
    hasManualCurrencyRef.current = true;
    setCurrencyCode(event.target.value);
  };

  const navigateWithParams = (pathname, params) => {
    navigate({
      pathname,
      search: `?${params.toString()}`,
    });
  };

  const handleFlightSearch = (snapshot, nextParams, options = {}) => {
    nextParams.set("currencyCode", currencyCode);

    const nextSnapshot = {
      ...snapshot,
      currencyCode,
    };

    if (onFlightSearch) {
      onFlightSearch(nextSnapshot, nextParams, options);
      return;
    }

    navigateWithParams("/flights", nextParams);
  };

  const handleHotelSubmit = (event) => {
    event.preventDefault();

    const cityLocation = findLocation(hotelForm.cityValue || hotelForm.city);
    const city = getCitySearchValue(cityLocation, hotelForm.city);
    const cityLabel = hotelForm.city.trim();
    const checkIn = hotelForm.checkIn.trim();
    const checkOut = hotelForm.checkOut.trim();

    if (!cityLabel || !checkIn || !checkOut) {
      setFormError(t("hotels.errors.required"));
      return;
    }

    if (checkOut <= checkIn) {
      setFormError(t("hotels.errors.invalidDates"));
      return;
    }

    const params = new URLSearchParams({
      city,
      cityLabel,
      checkIn,
      checkOut,
      rooms: String(hotelForm.rooms),
      adults: String(hotelForm.adults),
      currencyCode,
      auto: "1",
    });

    setFormError("");

    if (onHotelSearch) {
      onHotelSearch(
        {
          city,
          cityLabel,
          checkIn,
          checkOut,
          rooms: hotelForm.rooms,
          adults: hotelForm.adults,
          currencyCode,
        },
        params
      );
      return;
    }

    navigateWithParams("/hotels", params);
  };

  const handleRestaurantSubmit = (event) => {
    event.preventDefault();

    const cityLocation = findLocation(restaurantForm.cityValue || restaurantForm.city);
    const city = getCitySearchValue(cityLocation, restaurantForm.city);
    const cityLabel = restaurantForm.city.trim();

    if (!cityLabel) {
      setFormError(t("restaurants.errors.required"));
      return;
    }

    const params = new URLSearchParams({
      city,
      cityLabel,
      auto: "1",
    });

    setFormError("");

    if (onRestaurantSearch) {
      onRestaurantSearch(
        {
          city,
          cityLabel,
        },
        params
      );
      return;
    }

    navigateWithParams("/restaurants", params);
  };

  const clearFormError = () => {
    if (formError) {
      setFormError("");
    }
  };

  return (
    <section
      className={`booking-search-tabs overflow-visible rounded-[1rem] border border-white/10 bg-[var(--aw-panel-soft)] shadow-[0_34px_90px_-60px_rgba(0,0,0,0.95)] ${className}`}
    >
      <div className="space-y-6 p-4 sm:p-5 lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="tablist"
            aria-label={t("booking.tabsLabel")}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {BOOKING_TABS.map((tab) => {
              const isSelected = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setActiveTab(tab);
                    setFormError("");
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-black uppercase transition ${
                    isSelected
                      ? "bg-[var(--aw-accent)] text-slate-950 shadow-[0_14px_30px_-24px_rgba(245,184,0,0.95)]"
                      : "bg-[var(--aw-input)] text-slate-700 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  {t(`booking.tabs.${tab}`)}
                </button>
              );
            })}
          </div>

          <label className="flex w-full flex-col sm:w-auto sm:min-w-56">
            <span className="sr-only">
              {t("booking.currency")}
            </span>
            <select
              value={currencyCode}
              onChange={handleCurrencyChange}
              className="min-h-11 rounded-[0.55rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {language === "ka" ? option.ka : option.en}
                </option>
              ))}
            </select>
          </label>
        </div>

        {FLIGHT_TABS.has(activeTab) ? (
          <FlightSearchPanel
            searchParams={flightSearchParams}
            loading={flightLoading}
            externalError={flightError}
            onSearch={handleFlightSearch}
            onFormInteraction={onFlightFormInteraction}
            onTripTypeChange={(nextTripType) => {
              if (FLIGHT_TABS.has(nextTripType)) {
                setActiveTab(nextTripType);
              }
            }}
            forcedTripType={activeTab}
            showTripTypeOptions={false}
            availableTripTypes={["oneWay", "roundTrip"]}
            variant="booking"
            currencyCode={currencyCode}
          />
        ) : null}

        {activeTab === "hotel" ? (
          <form className="space-y-5" onSubmit={handleHotelSubmit}>
            <div className="grid gap-3 xl:grid-cols-[1.25fr_0.82fr_0.82fr_0.62fr_0.62fr_auto] xl:items-stretch">
              <BookingField>
                <AutocompleteInput
                  label={t("booking.hotel.destination")}
                  value={hotelForm.city}
                  onChange={(value) => {
                    setHotelForm((currentForm) => ({
                      ...currentForm,
                      city: value,
                      cityValue: "",
                    }));
                    clearFormError();
                  }}
                  onSelect={(suggestion) => {
                    setHotelForm((currentForm) => ({
                      ...currentForm,
                      city: suggestion.value,
                      cityValue: suggestion.location.en,
                    }));
                    clearFormError();
                  }}
                  suggestions={hotelCitySuggestions}
                  placeholder={t("hotels.cityPlaceholder")}
                  noSuggestionsText={t("common.noSuggestions")}
                />
              </BookingField>

              <BookingDateField
                label={t("hotels.checkIn")}
                value={hotelForm.checkIn}
                onChange={(event) => {
                  setHotelForm((currentForm) => ({
                    ...currentForm,
                    checkIn: event.target.value,
                  }));
                  clearFormError();
                }}
              />

              <BookingDateField
                label={t("hotels.checkOut")}
                value={hotelForm.checkOut}
                onChange={(event) => {
                  setHotelForm((currentForm) => ({
                    ...currentForm,
                    checkOut: event.target.value,
                  }));
                  clearFormError();
                }}
              />

              <BookingNumberField
                label={t("booking.hotel.rooms")}
                value={hotelForm.rooms}
                min={1}
                onChange={(event) => {
                  setHotelForm((currentForm) => ({
                    ...currentForm,
                    rooms: parsePositiveInteger(event.target.value, 1),
                  }));
                  clearFormError();
                }}
              />

              <BookingNumberField
                label={t("booking.hotel.guests")}
                value={hotelForm.adults}
                min={1}
                onChange={(event) => {
                  setHotelForm((currentForm) => ({
                    ...currentForm,
                    adults: parsePositiveInteger(event.target.value, 1),
                  }));
                  clearFormError();
                }}
              />

              <BookingSubmitButton
                label={hotelLoading ? t("hotels.searchingButton") : t("hotels.searchButton")}
                disabled={hotelLoading}
              />
            </div>
          </form>
        ) : null}

        {activeTab === "restaurant" ? (
          <form className="space-y-5" onSubmit={handleRestaurantSubmit}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-stretch">
              <BookingField>
                <AutocompleteInput
                  label={t("booking.restaurant.location")}
                  value={restaurantForm.city}
                  onChange={(value) => {
                    setRestaurantForm((currentForm) => ({
                      ...currentForm,
                      city: value,
                      cityValue: "",
                    }));
                    clearFormError();
                  }}
                  onSelect={(suggestion) => {
                    setRestaurantForm({
                      city: suggestion.value,
                      cityValue: suggestion.location.en,
                    });
                    clearFormError();
                  }}
                  suggestions={restaurantCitySuggestions}
                  placeholder={t("restaurants.cityPlaceholder")}
                  noSuggestionsText={t("common.noSuggestions")}
                />
              </BookingField>

              <BookingSubmitButton
                label={
                  restaurantLoading
                    ? t("restaurants.searchingButton")
                    : t("restaurants.searchButton")
                }
                disabled={restaurantLoading}
              />
            </div>
          </form>
        ) : null}
      </div>

      {formError ? (
        <div className="border-t border-rose-400/20 bg-rose-500/10 px-6 py-4 text-sm font-semibold text-rose-100">
          {formError}
        </div>
      ) : null}
    </section>
  );
}

function BookingField({ children }) {
  return (
    <div className="min-h-[4.6rem] rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-4 py-3 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] transition focus-within:border-[var(--aw-accent)]">
      {children}
    </div>
  );
}

function BookingDateField({ label, value, onChange }) {
  return (
    <BookingField>
      <label className="block text-left">
        <span className="form-field-label text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {label}
        </span>
        <input
          type="date"
          value={value}
          onChange={onChange}
          className="mt-2 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
        />
      </label>
    </BookingField>
  );
}

function BookingNumberField({ label, value, min, onChange }) {
  return (
    <BookingField>
      <label className="block text-left">
        <span className="form-field-label text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {label}
        </span>
        <input
          type="number"
          min={min}
          value={value}
          onChange={onChange}
          className="mt-2 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
        />
      </label>
    </BookingField>
  );
}

function BookingSubmitButton({ label, disabled = false }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex min-h-[4.6rem] w-full items-center justify-center rounded-[0.7rem] bg-[var(--aw-accent)] px-7 text-sm font-black uppercase text-slate-950 shadow-[0_18px_34px_-26px_rgba(245,184,0,0.9)] transition hover:-translate-y-0.5 hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none md:w-auto"
    >
      {label}
    </button>
  );
}
