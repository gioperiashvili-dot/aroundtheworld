function truncateText(value, maxLength = 220) {
  if (typeof value !== "string") {
    return value;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function summarizeProviderValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 4).map((entry) => summarizeProviderValue(entry));
  }

  if (typeof value === "object") {
    const summary = {};

    [
      "action",
      "code",
      "message",
      "error",
      "status",
      "statusCode",
      "uuid",
      "vid",
      "appId",
      "collectorUrl",
      "title",
      "details",
    ].forEach((key) => {
      if (key in value && value[key] !== undefined) {
        summary[key] = summarizeProviderValue(value[key]);
      }
    });

    if (Object.keys(summary).length > 0) {
      return summary;
    }

    const fallbackEntries = Object.entries(value)
      .filter(([key]) => !["headers", "config", "request", "response", "page"].includes(key))
      .slice(0, 10)
      .reduce((accumulator, [key, entryValue]) => {
        accumulator[key] = summarizeProviderValue(entryValue);
        return accumulator;
      }, {});

    return Object.keys(fallbackEntries).length > 0 ? fallbackEntries : "[object]";
  }

  return value;
}

function sanitizeDiagnostics(details = {}) {
  const sanitized = {};

  Object.entries(details).forEach(([key, value]) => {
    sanitized[key] = summarizeProviderValue(value);
  });

  return sanitized;
}

function logProviderDiagnostic(provider, label, details = {}, level = "warn") {
  const logger = typeof console[level] === "function" ? console[level] : console.warn;
  logger(`[${provider}] ${label}`, sanitizeDiagnostics(details));
}

module.exports = {
  logProviderDiagnostic,
  sanitizeDiagnostics,
  summarizeProviderValue,
};
