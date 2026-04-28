function formatApiDetails(details) {
  if (Array.isArray(details)) {
    return details
      .map((entry) => {
        const [field, message] = Object.entries(entry || {})[0] || [];

        if (!field || !message) {
          return "";
        }

        return `${field}: ${message}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details.message === "string") {
    return details.message;
  }

  if (details && typeof details === "object") {
    return Object.values(details)
      .filter((value) => typeof value === "string")
      .join(" ");
  }

  return "";
}

function getLocale(language = "en") {
  return language === "ka" ? "ka-GE" : "en-US";
}

export function getFriendlyApiError(error, fallbackMessage, options = {}) {
  const statusCode = error.response?.status;
  const apiCode = error.response?.data?.code;
  const apiError = error.response?.data?.error;
  const apiMessage = error.response?.data?.message;
  const details = formatApiDetails(error.response?.data?.details);
  const blockedMessage = options.blockedMessage || fallbackMessage;
  const providerUnavailableMessage =
    options.providerUnavailableMessage || fallbackMessage;
  const unauthorizedMessage = options.unauthorizedMessage || fallbackMessage;

  if (
    apiCode === "BLOCKED" ||
    apiCode === "BLOCKED_OR_CAPTCHA" ||
    apiCode === "PROVIDER_LIMITED" ||
    statusCode === 429
  ) {
    return blockedMessage || "Too many requests. Please wait and try again.";
  }

  if (typeof apiError === "string" && apiError.toLowerCase().includes("blocked")) {
    return blockedMessage || "Too many requests. Please wait and try again.";
  }

  if (
    apiCode === "PROVIDER_UNAVAILABLE" ||
    apiCode === "UNKNOWN_PROVIDER_ERROR" ||
    apiCode === "MISSING_API_KEY"
  ) {
    return (
      providerUnavailableMessage ||
      apiMessage ||
      apiError ||
      details ||
      fallbackMessage ||
      error.message
    );
  }

  if (apiCode === "VALIDATION_ERROR" || apiCode === "LOCATION_NOT_FOUND") {
    return apiMessage || details || apiError || fallbackMessage || error.message;
  }

  if (statusCode === 401 && unauthorizedMessage) {
    return unauthorizedMessage;
  }

  return apiMessage || apiError || details || fallbackMessage || error.message;
}

export function formatTimeLabel(value, language = "en") {
  if (!value) {
    return language === "ka" ? "უცნობია" : "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString(getLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateLabel(value, language = "en") {
  if (!value) {
    return language === "ka" ? "უცნობია" : "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(getLocale(language), {
    month: "short",
    day: "numeric",
  });
}

export function formatCalendarDate(value, language = "en") {
  if (!value) {
    return language === "ka" ? "თარიღი უცნობია" : "Unknown date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(getLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTimeLabel(value, language = "en") {
  if (!value) {
    return language === "ka" ? "თარიღი უცნობია" : "Unknown date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(getLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrencyValue(value, currency = "USD", language = "en") {
  if (typeof value !== "number") {
    return language === "ka" ? "მონაცემი არ არის" : "N/A";
  }

  try {
    return new Intl.NumberFormat(getLocale(language), {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (_error) {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatFlightDuration(duration, departure, arrival, language = "en") {
  if (duration && duration !== "Unknown") {
    return duration;
  }

  const departureTime = Date.parse(departure);
  const arrivalTime = Date.parse(arrival);

  if (Number.isNaN(departureTime) || Number.isNaN(arrivalTime)) {
    return language === "ka" ? "უცნობია" : "Unknown";
  }

  const totalMinutes = Math.max(Math.round((arrivalTime - departureTime) / 60000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = language === "ka" ? "სთ" : "h";
  const minuteLabel = language === "ka" ? "წთ" : "m";

  if (hours === 0) {
    return `${minutes}${minuteLabel}`;
  }

  if (minutes === 0) {
    return `${hours}${hourLabel}`;
  }

  return `${hours}${hourLabel} ${minutes}${minuteLabel}`;
}

export function formatReviewCount(value, language = "en") {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString(getLocale(language))} ${
      language === "ka" ? "შეფასება" : "reviews"
    }`;
  }

  const normalizedValue = String(value).replace(/[()]/g, "").trim();

  if (!normalizedValue) {
    return "";
  }

  return `${normalizedValue} ${language === "ka" ? "შეფასება" : "reviews"}`;
}

export function formatStops(stops, language = "en") {
  if (stops === 0) {
    return language === "ka" ? "პირდაპირი" : "Non-stop";
  }

  if (typeof stops === "number") {
    if (language === "ka") {
      return stops === 1 ? "1 გადაჯდომა" : `${stops} გადაჯდომა`;
    }

    return `${stops} stop${stops === 1 ? "" : "s"}`;
  }

  return language === "ka" ? "გადაჯდომები უცნობია" : "Stops unavailable";
}

export function formatTourDates(dates, limit = 3, language = "en") {
  if (!Array.isArray(dates) || dates.length === 0) {
    return [];
  }

  return dates.slice(0, limit).map((date) => formatCalendarDate(date, language));
}

export function parseDatesInput(value) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
