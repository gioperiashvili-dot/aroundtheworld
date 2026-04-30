import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutocompleteInput from "./AutocompleteInput";
import {
  findLocation,
  getFlightSearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";

const SEARCH_DEBOUNCE_MS = 850;
const QUICK_DESTINATIONS = ["CDG", "IST", "LHR", "DXB", "ATH"];
const TRIP_TYPES = ["oneWay", "roundTrip", "multiCity"];
const CABIN_OPTIONS = ["economy", "premium_economy", "business", "first"];

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

export function buildFlightSearchParams(snapshot) {
  const params = new URLSearchParams();
  params.set("from", snapshot.from);
  params.set("fromLabel", snapshot.fromLabel);
  params.set("to", snapshot.to);
  params.set("toLabel", snapshot.toLabel);
  params.set("date", snapshot.date);
  params.set("tripType", snapshot.tripType);
  params.set("cabin", snapshot.cabin);
  params.set("adults", String(snapshot.travelers.adults));
  params.set("children", String(snapshot.travelers.children));
  params.set("infants", String(snapshot.travelers.infants));

  if (snapshot.returnDate) {
    params.set("returnDate", snapshot.returnDate);
  }

  params.set("human", snapshot.isHuman ? "1" : "0");
  params.set("auto", "1");
  return params;
}

function normalizeTripType(value, returnDate = "") {
  return TRIP_TYPES.includes(value) ? value : returnDate ? "roundTrip" : "oneWay";
}

function normalizeCabin(value) {
  return CABIN_OPTIONS.includes(value) ? value : "economy";
}

function parseTravelerCount(value, fallbackValue, minimumValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < minimumValue) {
    return fallbackValue;
  }

  return parsed;
}

function getTravelersTotal(travelers) {
  return travelers.adults + travelers.children + travelers.infants;
}

function buildAutoSearchKey(snapshot) {
  return [
    snapshot.from,
    snapshot.to,
    snapshot.date,
    snapshot.returnDate,
    snapshot.fromLabel,
    snapshot.toLabel,
    snapshot.tripType,
    snapshot.cabin,
    snapshot.travelers.adults,
    snapshot.travelers.children,
    snapshot.travelers.infants,
  ].join("|");
}

export default function FlightSearchPanel({
  searchParams,
  loading = false,
  externalError = "",
  onSearch,
  onFormInteraction,
  className = "",
}) {
  const { language, t } = useLanguage();
  const [form, setForm] = useState({
    from: "",
    fromCode: "",
    to: "",
    toCode: "",
    date: "",
    isHuman: false,
  });
  const [tripType, setTripType] = useState("oneWay");
  const [cabin, setCabin] = useState("economy");
  const [travelers, setTravelers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [returnDate, setReturnDate] = useState("");
  const [isTravelersOpen, setIsTravelersOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceRef = useRef(null);
  const lastAutoSearchRef = useRef("");
  const searchParamsString = searchParams?.toString() || "";

  const clearErrors = useCallback(() => {
    setValidationError("");
    onFormInteraction?.();
  }, [onFormInteraction]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fromSuggestions = useMemo(
    () =>
      getLocationSuggestions(form.from).map((location) =>
        toLocationSuggestion(location, language)
      ),
    [form.from, language]
  );
  const toSuggestions = useMemo(
    () =>
      getLocationSuggestions(form.to).map((location) =>
        toLocationSuggestion(location, language)
      ),
    [form.to, language]
  );

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const dateParam = searchParams.get("date") || "";
    const returnDateParam = searchParams.get("returnDate") || "";
    const nextTripType = normalizeTripType(searchParams.get("tripType"), returnDateParam);
    const nextCabin = normalizeCabin(searchParams.get("cabin"));
    const nextTravelers = {
      adults: parseTravelerCount(searchParams.get("adults"), 1, 1),
      children: parseTravelerCount(searchParams.get("children"), 0, 0),
      infants: parseTravelerCount(searchParams.get("infants"), 0, 0),
    };
    const fromLocation = findLocation(fromParam);
    const toLocation = findLocation(toParam);
    const fromLabel =
      searchParams.get("fromLabel") ||
      getLocationLabel(fromLocation, language) ||
      fromParam;
    const toLabel =
      searchParams.get("toLabel") ||
      getLocationLabel(toLocation, language) ||
      toParam;
    const isHuman = searchParams.get("human") === "1";

    setForm((previousForm) => ({
      ...previousForm,
      from: fromLabel,
      fromCode: fromLocation?.code || "",
      to: toLabel,
      toCode: toLocation?.code || "",
      date: dateParam,
      isHuman: isHuman || previousForm.isHuman,
    }));
    setTripType(nextTripType);
    setCabin(nextCabin);
    setTravelers(nextTravelers);
    setReturnDate(nextTripType === "roundTrip" ? returnDateParam : "");

    if (!fromParam || !toParam || !dateParam || searchParams.get("auto") !== "1") {
      return;
    }

    const snapshot = {
      from: fromParam,
      fromLabel,
      to: toParam,
      toLabel,
      date: dateParam,
      returnDate: nextTripType === "roundTrip" ? returnDateParam : "",
      tripType: nextTripType,
      cabin: nextCabin,
      travelers: nextTravelers,
      isHuman,
    };
    const searchKey = buildAutoSearchKey(snapshot);

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;
    onSearch?.(snapshot, buildFlightSearchParams(snapshot), { auto: true });
  }, [language, onSearch, searchParams, searchParamsString]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const fromLocation = findLocation(form.fromCode || form.from);
    const toLocation = findLocation(form.toCode || form.to);
    const snapshot = {
      from: getFlightSearchValue(fromLocation, form.from),
      fromLabel: form.from.trim(),
      to: getFlightSearchValue(toLocation, form.to),
      toLabel: form.to.trim(),
      date: form.date.trim(),
      returnDate: tripType === "roundTrip" ? returnDate.trim() : "",
      tripType,
      cabin,
      travelers,
      isHuman: form.isHuman,
    };

    if (!snapshot.fromLabel || !snapshot.toLabel || !snapshot.date) {
      setValidationError(t("flights.errors.required"));
      return;
    }

    if (snapshot.tripType === "multiCity") {
      setValidationError(t("flights.errors.multiCity"));
      return;
    }

    if (snapshot.from.trim().toLowerCase() === snapshot.to.trim().toLowerCase()) {
      setValidationError(t("flights.errors.sameRoute"));
      return;
    }

    if (snapshot.tripType === "roundTrip" && !snapshot.returnDate) {
      setValidationError(t("flights.errors.returnRequired"));
      return;
    }

    if (
      snapshot.travelers.adults < 1 ||
      snapshot.travelers.children < 0 ||
      snapshot.travelers.infants < 0
    ) {
      setValidationError(t("flights.errors.travelers"));
      return;
    }

    if (!snapshot.isHuman) {
      setValidationError(t("flights.errors.human"));
      return;
    }

    const nextParams = buildFlightSearchParams(snapshot);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setIsDebouncing(true);
    setValidationError("");
    debounceRef.current = window.setTimeout(() => {
      setIsDebouncing(false);
      onSearch?.(snapshot, nextParams, { auto: false });
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSwapLocations = () => {
    setForm((previousForm) => ({
      ...previousForm,
      from: previousForm.to,
      fromCode: previousForm.toCode,
      to: previousForm.from,
      toCode: previousForm.fromCode,
    }));
    clearErrors();
  };

  const updateTravelerCount = (type, delta) => {
    setTravelers((previousTravelers) => {
      const minimumValue = type === "adults" ? 1 : 0;
      const nextValue = Math.max(previousTravelers[type] + delta, minimumValue);

      return {
        ...previousTravelers,
        [type]: nextValue,
      };
    });
    clearErrors();
  };

  const isBusy = loading || isDebouncing;
  const statusLabel = loading
    ? t("flights.searchingButton")
    : isDebouncing
      ? t("flights.preparingButton")
      : t("flights.searchButton");
  const flightsHeading = t("flights.heading");
  const showReturnDate = tripType === "roundTrip";
  const isMultiCity = tripType === "multiCity";
  const displayError = validationError || externalError;

  return (
    <div className={className}>
      <div className="overflow-visible rounded-[2.25rem] border border-white/75 bg-white/95 shadow-[0_34px_100px_-58px_rgba(15,23,42,0.6)] backdrop-blur dark:border-white/10 dark:bg-transparent dark:shadow-[0_34px_100px_-58px_rgba(2,6,23,0.95)]">
        <div className="space-y-6 p-4 sm:p-5 lg:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
              {t("flights.sectionLabel")}
            </p>
            {flightsHeading ? (
              <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                {flightsHeading}
              </h2>
            ) : null}
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white">
              {t("flights.helperText")}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TripTypeOptions
                tripType={tripType}
                onChange={(nextTripType) => {
                  setTripType(nextTripType);
                  clearErrors();
                }}
                t={t}
              />

              <CabinSelect
                value={cabin}
                onChange={(event) => {
                  setCabin(event.target.value);
                  clearErrors();
                }}
                t={t}
                className="lg:min-w-[12rem]"
              />
            </div>

            {isMultiCity ? (
              <div className="rounded-[1.4rem] bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                {t("flights.multiCityComingSoon")}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
              <FieldCard className="xl:min-w-0 xl:flex-[1.16]">
                <AutocompleteInput
                  label={t("common.from")}
                  value={form.from}
                  onChange={(value) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      from: value,
                      fromCode: "",
                    }));
                    clearErrors();
                  }}
                  onSelect={(suggestion) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      from: suggestion.value,
                      fromCode: suggestion.location.code,
                    }));
                    clearErrors();
                  }}
                  suggestions={fromSuggestions}
                  placeholder={t("flights.placeholders.from")}
                  noSuggestionsText={t("common.noSuggestions")}
                />
              </FieldCard>

              <button
                type="button"
                onClick={handleSwapLocations}
                aria-label={t("flights.swapRoute")}
                title={t("flights.swapRoute")}
                className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:border-[#e64d53]/45 hover:text-[#d83f45] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#ff8c90]/45 dark:hover:text-[#ffb4b7] xl:h-[4.6rem] xl:w-[4.6rem]"
              >
                <SwapIcon />
              </button>

              <FieldCard className="xl:min-w-0 xl:flex-[1.16]">
                <AutocompleteInput
                  label={t("common.to")}
                  value={form.to}
                  onChange={(value) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      to: value,
                      toCode: "",
                    }));
                    clearErrors();
                  }}
                  onSelect={(suggestion) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      to: suggestion.value,
                      toCode: suggestion.location.code,
                    }));
                    clearErrors();
                  }}
                  suggestions={toSuggestions}
                  placeholder={t("flights.placeholders.to")}
                  noSuggestionsText={t("common.noSuggestions")}
                />
              </FieldCard>

              <FieldCard className="xl:min-w-[10rem] xl:flex-[0.78]">
                <DateField
                  label={t("flights.departureLabel")}
                  name="date"
                  value={form.date}
                  onChange={(event) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      date: event.target.value,
                    }));
                    clearErrors();
                  }}
                />
              </FieldCard>

              {showReturnDate ? (
                <FieldCard className="xl:min-w-[10rem] xl:flex-[0.78]">
                  <DateField
                    label={t("flights.returnLabel")}
                    name="returnDate"
                    value={returnDate}
                    onChange={(event) => {
                      setReturnDate(event.target.value);
                      clearErrors();
                    }}
                  />
                </FieldCard>
              ) : null}

              <TravelersField
                travelers={travelers}
                isOpen={isTravelersOpen}
                onToggle={() => setIsTravelersOpen((currentValue) => !currentValue)}
                onChange={updateTravelerCount}
                t={t}
                className="xl:min-w-[10rem] xl:flex-[0.78]"
              />

              <button
                type="submit"
                disabled={isBusy || isMultiCity}
                aria-label={statusLabel}
                className="group flex h-14 w-full shrink-0 items-center justify-center rounded-[1.25rem] bg-[#e64d53] px-5 text-sm font-semibold text-white shadow-[0_22px_44px_-26px_rgba(216,63,69,0.9)] transition hover:-translate-y-0.5 hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-300 xl:h-[4.6rem] xl:w-[4.6rem] xl:rounded-full xl:px-0"
              >
                <SearchIcon />
                <span className="ml-2 xl:sr-only">{statusLabel}</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.75rem] bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-900/80">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  name="isHuman"
                  checked={form.isHuman}
                  onChange={(event) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      isHuman: event.target.checked,
                    }));
                    clearErrors();
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t("flights.humanCheck")}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                  {t("common.popularDestinations")}
                </span>
                {QUICK_DESTINATIONS.map((code) => {
                  const location = findLocation(code);

                  if (!location) {
                    return null;
                  }

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          to: getLocationLabel(location, language),
                          toCode: location.code,
                        }));
                        clearErrors();
                      }}
                      className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                    >
                      {getLocationLabel(location, language)}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {displayError ? (
          <div className="border-t border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {displayError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TripTypeOptions({ tripType, onChange, t }) {
  return (
    <div
      role="radiogroup"
      aria-label={t("flights.tripTypeLabel")}
      className="inline-flex w-full flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto"
    >
      {TRIP_TYPES.map((type) => {
        const isSelected = tripType === type;

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(type)}
            className={`min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              isSelected
                ? "bg-white text-slate-950 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.72)] dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {t(`flights.tripTypes.${type}`)}
          </button>
        );
      })}
    </div>
  );
}

function FieldCard({ children, className = "" }) {
  return (
    <div
      className={`min-h-[4.6rem] rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] transition focus-within:border-[#e64d53]/55 dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      {children}
    </div>
  );
}

function DateField({ label, name, value, onChange }) {
  return (
    <label className="block text-left">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-white"
      />
    </label>
  );
}

function CabinSelect({ value, onChange, t, className = "" }) {
  return (
    <div
      className={`min-h-[4.6rem] rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
          {t("flights.cabinLabel")}
        </span>
        <select
          value={value}
          onChange={onChange}
          className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-white"
        >
          {CABIN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`flights.cabinClasses.${option}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TravelersField({
  travelers,
  isOpen,
  onToggle,
  onChange,
  t,
  className = "",
}) {
  const totalTravelers = getTravelersTotal(travelers);
  const summary =
    totalTravelers === 1
      ? t("flights.travelersSummaryOne")
      : t("flights.travelersSummaryMany").replace("{count}", totalTravelers);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="min-h-[4.6rem] w-full rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700"
      >
        <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
          {t("flights.travelersLabel")}
        </span>
        <span className="mt-2 flex min-w-0 items-center justify-between gap-3 text-sm font-semibold text-slate-950 dark:text-white">
          <span className="min-w-0 truncate">{summary}</span>
          <span className="h-2 w-2 rotate-45 border-b border-r border-slate-400 dark:border-slate-500" />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:w-80">
          <TravelerCounter
            label={t("flights.travelers.adults")}
            value={travelers.adults}
            minValue={1}
            onDecrease={() => onChange("adults", -1)}
            onIncrease={() => onChange("adults", 1)}
            t={t}
          />
          <TravelerCounter
            label={t("flights.travelers.children")}
            value={travelers.children}
            minValue={0}
            onDecrease={() => onChange("children", -1)}
            onIncrease={() => onChange("children", 1)}
            t={t}
          />
          <TravelerCounter
            label={t("flights.travelers.infants")}
            value={travelers.infants}
            minValue={0}
            onDecrease={() => onChange("infants", -1)}
            onIncrease={() => onChange("infants", 1)}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}

function TravelerCounter({ label, value, minValue, onDecrease, onIncrease, t }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] px-2 py-3">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= minValue}
          onClick={onDecrease}
          aria-label={`${t("flights.decrease")} ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          -
        </button>
        <span className="min-w-6 text-center text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          aria-label={`${t("flights.increase")} ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          +
        </button>
      </span>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h11" />
      <path d="m15 3 4 4-4 4" />
      <path d="M17 17H6" />
      <path d="m9 13-4 4 4 4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
