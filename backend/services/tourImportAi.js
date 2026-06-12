const { createTourSlug } = require("./tourSlugs");

const MAX_POST_TEXT_CHARS = 12000;
const DEFAULT_PROVIDER = "manual_parser";
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DIGIT_RANGES = [
  [0xff10, 0xff19],
  [0x1d7ce, 0x1d7d7],
  [0x1d7d8, 0x1d7e1],
  [0x1d7e2, 0x1d7eb],
  [0x1d7ec, 0x1d7f5],
  [0x1d7f6, 0x1d7ff],
];
const HOTEL_KEYWORD_PATTERN =
  /\b(?:hotel|resort|beach|village|palace|apart(?:ments?)?|spa|inn|suites?|villa|hostel)\b/i;
const URL_PATTERN = /https?:\/\/[^\s)]+/i;

function createImportError(statusCode, error, details) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  return requestError;
}

function normalizeDigit(character) {
  const codePoint = character.codePointAt(0);

  for (const [start, end] of DIGIT_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return String(codePoint - start);
    }
  }

  return character;
}

function normalizeDigits(value) {
  return Array.from(String(value || "")).map(normalizeDigit).join("");
}

function sanitizeText(value) {
  return normalizeDigits(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, MAX_POST_TEXT_CHARS);
}

function getCleanLines(text) {
  return sanitizeText(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function containsGeorgian(value) {
  return /[\u10a0-\u10ff]/.test(String(value || ""));
}

function containsLatin(value) {
  return /[a-z]/i.test(String(value || ""));
}

function toLocalizedText(value) {
  const source = String(value || "").replace(/\s+/g, " ").trim();

  if (!source) {
    return {
      ka: "",
      en: "",
    };
  }

  if (containsGeorgian(source)) {
    return {
      ka: source,
      en: "",
    };
  }

  return {
    ka: "",
    en: containsLatin(source) ? source : "",
  };
}

function toLocalizedList(values = []) {
  const ka = [];
  const en = [];

  values.forEach((value) => {
    const localized = toLocalizedText(value);

    if (localized.ka) {
      ka.push(localized.ka);
    }

    if (localized.en) {
      en.push(localized.en);
    }
  });

  return {
    ka,
    en,
  };
}

function stripLeadingMarker(value) {
  return String(value || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulTitleLine(line) {
  const source = String(line || "").trim();

  if (!source || source.length < 3 || source.length > 160) {
    return false;
  }

  if (URL_PATTERN.test(source) || /@/.test(source)) {
    return false;
  }

  if (/^\+?\d[\d\s().-]{6,}$/.test(source)) {
    return false;
  }

  return !/(?:price|from|includes?|contact|phone|\u10e4\u10d0\u10e1\u10d8|\u10e8\u10d4\u10d3\u10d8\u10e1)/i.test(
    source
  );
}

function extractTitle(lines) {
  const titleLine = lines
    .map(stripLeadingMarker)
    .find(isUsefulTitleLine);

  return titleLine || "";
}

function normalizeCurrencyToken(value) {
  const token = String(value || "").trim().toUpperCase();

  if (!token) {
    return "";
  }

  if (token === "$" || token === "USD") {
    return "USD";
  }

  if (token === "\u20ac" || token === "EUR") {
    return "EUR";
  }

  if (
    token === "\u20be" ||
    token === "GEL" ||
    token === "\u10da" ||
    token === "\u10da\u10d0\u10e0\u10d8"
  ) {
    return "GEL";
  }

  return "";
}

function getCurrencyFromText(text) {
  if (/\bUSD\b|\$/i.test(text)) {
    return "USD";
  }

  if (/\bEUR\b|\u20ac/i.test(text)) {
    return "EUR";
  }

  if (/\bGEL\b|\u20be|\u10da\u10d0\u10e0\u10d8|\u10da(?=\s|$|[.,!])/i.test(text)) {
    return "GEL";
  }

  return "";
}

function normalizePriceNumber(value) {
  const price = Number(String(value || "").replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function extractPrice(text, warnings) {
  const source = sanitizeText(text);
  const pricePatterns = [
    /(?:price|from|\u10e4\u10d0\u10e1\u10d8|\u10e6\u10d8\u10e0\u10d4\u10d1\u10e3\u10da\u10d4\u10d1\u10d0|\u10d3\u10d0\u10dc)[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(GEL|USD|EUR|\$|\u20ac|\u20be|\u10da\u10d0\u10e0\u10d8|\u10da)?/i,
    /(\d+(?:[.,]\d+)?)\s*(GEL|USD|EUR|\$|\u20ac|\u20be|\u10da\u10d0\u10e0\u10d8|\u10da)(?=\s|$|[.,!])/i,
  ];

  for (const pattern of pricePatterns) {
    const match = source.match(pattern);

    if (match) {
      const price = normalizePriceNumber(match[1]);
      const explicitCurrency = normalizeCurrencyToken(match[2]);
      const contextCurrency = getCurrencyFromText(source);
      const currency = explicitCurrency || contextCurrency || (containsGeorgian(source) ? "GEL" : "");

      if (price === null) {
        continue;
      }

      if (!explicitCurrency && !contextCurrency) {
        warnings.push(
          "Price was found without an explicit currency; review the currency before publishing."
        );
      }

      return {
        price,
        currency: currency || "GEL",
        confidence: explicitCurrency || contextCurrency ? "high" : "medium",
      };
    }
  }

  return {
    price: null,
    currency: getCurrencyFromText(source) || (containsGeorgian(source) ? "GEL" : "GEL"),
    confidence: "unknown",
  };
}

function toIsoDate(year, month, day) {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);
  const normalizedDay = Number(day);
  const date = new Date(Date.UTC(normalizedYear, normalizedMonth - 1, normalizedDay));

  if (
    date.getUTCFullYear() !== normalizedYear ||
    date.getUTCMonth() !== normalizedMonth - 1 ||
    date.getUTCDate() !== normalizedDay
  ) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function normalizeYear(value) {
  const year = Number(value);
  return value.length === 2 ? 2000 + year : year;
}

function extractDates(text, warnings) {
  const source = sanitizeText(text);
  const dates = [];
  const seen = new Set();

  function addDate(date) {
    if (date && !seen.has(date)) {
      seen.add(date);
      dates.push(date);
    }
  }

  for (const match of source.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    addDate(toIsoDate(match[1], match[2], match[3]));
  }

  for (const match of source.matchAll(/(^|[^\d])(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?=$|[^\d])/g)) {
    addDate(toIsoDate(normalizeYear(match[4]), match[3], match[2]));
  }

  if (dates.length === 0 && /(^|[^\d])\d{1,2}[./-]\d{1,2}(?=$|[^\d])/.test(source)) {
    warnings.push("A date-like value was found without a year, so it was not imported as an exact date.");
  }

  return dates;
}

function getFirstIntegerMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = Number(match?.[1]);

    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function deriveDuration(text, dates) {
  let days = getFirstIntegerMatch(text, [
    /(\d+)\s*(?:days?|\u10d3\u10e6)/i,
    /(?:days?|\u10d3\u10e6)[^\d]{0,12}(\d+)/i,
  ]);
  let nights = getFirstIntegerMatch(text, [
    /(\d+)\s*(?:nights?|\u10e6\u10d0\u10db)/i,
    /(?:nights?|\u10e6\u10d0\u10db)[^\d]{0,12}(\d+)/i,
  ]);

  if ((!days || !nights) && dates.length >= 2) {
    const start = Date.parse(`${dates[0]}T00:00:00Z`);
    const end = Date.parse(`${dates[1]}T00:00:00Z`);

    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const dateNights = Math.round((end - start) / DAY_IN_MS);

      if (!nights) {
        nights = dateNights;
      }

      if (!days) {
        days = dateNights + 1;
      }
    }
  }

  return {
    days,
    nights,
  };
}

function buildDurationField({ days, nights }) {
  if (!days && !nights) {
    return {
      ka: "",
      en: "",
    };
  }

  const kaParts = [];
  const enParts = [];

  if (nights) {
    kaParts.push(`${nights} \u10e6\u10d0\u10db\u10d4`);
    enParts.push(`${nights} night${nights === 1 ? "" : "s"}`);
  }

  if (days) {
    kaParts.push(`${days} \u10d3\u10e6\u10d4`);
    enParts.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  return {
    ka: kaParts.join(" "),
    en: enParts.join(" "),
  };
}

function isIncludeLine(line) {
  return /^[\s]*(?:[-*+]|\u221a|\u2713|\u2714|\u2611)/.test(line);
}

function cleanIncludeLine(line) {
  return stripLeadingMarker(line)
    .replace(/^\s*(?:\u221a|\u2713|\u2714|\u2611)\s*/u, "")
    .trim();
}

function extractIncludes(lines) {
  const includes = [];
  let inIncludeBlock = false;

  lines.forEach((line) => {
    if (/(?:includes?|\u10e8\u10d4\u10d3\u10d8\u10e1|\u10e4\u10d0\u10e1\u10e8\u10d8)/i.test(line)) {
      inIncludeBlock = true;
      return;
    }

    if (!inIncludeBlock && !isIncludeLine(line)) {
      return;
    }

    if (URL_PATTERN.test(line)) {
      return;
    }

    const include = cleanIncludeLine(line);

    if (include && include.length <= 180) {
      includes.push(include);
    }
  });

  return [...new Set(includes)].slice(0, 20);
}

function getHotelStars(line) {
  const match = line.match(/([1-5])\s*(?:\*|\u2605|stars?)/i);
  const stars = Number(match?.[1]);
  return Number.isInteger(stars) ? stars : null;
}

function cleanHotelName(line) {
  return stripLeadingMarker(line)
    .replace(URL_PATTERN, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:GEL|USD|EUR|\$|\u20ac|\u20be|\u10da\u10d0\u10e0\u10d8|\u10da).*$/i, "")
    .replace(/\s*[-\u2013\u2014]\s*$/g, "")
    .replace(/\b[1-5]\s*(?:\*|\u2605|stars?)\b/gi, "")
    .replace(/\([^)]{1,16}\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHotelLine(line) {
  if (isIncludeLine(line)) {
    return false;
  }

  return HOTEL_KEYWORD_PATTERN.test(line) || /[1-5]\s*(?:\*|\u2605)/.test(line);
}

function extractHotels(lines) {
  const hotels = [];
  const seen = new Set();

  lines.forEach((line, index) => {
    if (!isHotelLine(line)) {
      return;
    }

    const name = cleanHotelName(line);

    if (!name || name.length < 3 || /(?:includes?|included|contact)/i.test(name)) {
      return;
    }

    const key = name.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const ownLink = line.match(URL_PATTERN)?.[0] || "";
    const nextLink = lines[index + 1]?.match(URL_PATTERN)?.[0] || "";
    hotels.push({
      id: createTourSlug(name, `hotel-${hotels.length + 1}`),
      name,
      stars: getHotelStars(line),
      link: ownLink || nextLink,
    });
  });

  return hotels.slice(0, 20);
}

function buildSeoFields(title) {
  const source = title.ka || title.en;

  if (!source) {
    return {
      seoTitle: {
        ka: "",
        en: "",
      },
      seoDescription: {
        ka: "",
        en: "",
      },
    };
  }

  if (title.ka) {
    return {
      seoTitle: {
        ka: `${source} \u10e2\u10e3\u10e0\u10d8 | Aroundworld`,
        en: "",
      },
      seoDescription: {
        ka: `${source} - \u10d3\u10d0\u10d2\u10d4\u10d2\u10db\u10d4 \u10db\u10dd\u10d2\u10d6\u10d0\u10e3\u10e0\u10dd\u10d1\u10d0 Aroundworld-\u10d7\u10d0\u10dc \u10d4\u10e0\u10d7\u10d0\u10d3.`,
        en: "",
      },
    };
  }

  return {
    seoTitle: {
      ka: "",
      en: `${source} tour | Aroundworld`,
    },
    seoDescription: {
      ka: "",
      en: `${source} tour draft from Aroundworld. Confirm details before publishing.`,
    },
  };
}

function buildExtractionPrompt() {
  return [
    "Extract a travel tour offer from Facebook text and optional image context.",
    "Return only confirmed facts using the existing Aroundworld tour schema.",
    "Never invent price, hotel names, dates, included services, or publish status.",
    "Use status draft. Put uncertain or missing values into warnings and missingFields.",
  ].join("\n");
}

function getConfiguredProvider() {
  const provider = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  return provider || DEFAULT_PROVIDER;
}

function buildDraftFromText({ text, image, provider }) {
  const warnings = [];
  const missingFields = [];
  const lines = getCleanLines(text);
  const titleText = extractTitle(lines);
  const title = toLocalizedText(titleText || "Facebook import draft");
  const destination = titleText ? toLocalizedText(titleText) : { ka: "", en: "" };
  const priceResult = extractPrice(text, warnings);
  const dates = extractDates(text, warnings);
  const durationValues = deriveDuration(text, dates);
  const hotels = extractHotels(lines);
  const includes = extractIncludes(lines);
  const description = toLocalizedText(text);
  const confidence = {
    title: titleText ? "medium" : "low",
    destination: destination.ka || destination.en ? "medium" : "unknown",
    price: priceResult.confidence,
    dates: dates.length > 0 ? "high" : "unknown",
    hotels: hotels.length > 0 ? "medium" : "unknown",
    includes: includes.length > 0 ? "medium" : "unknown",
  };

  if (!titleText) {
    missingFields.push("title");
    warnings.push("No clear title was found; a placeholder draft title was used.");
  }

  if (priceResult.price === null) {
    missingFields.push("price");
  }

  if (dates.length === 0) {
    missingFields.push("exact departure date");
  }

  if (hotels.length === 0) {
    missingFields.push("hotel");
  }

  if (includes.length === 0) {
    missingFields.push("included services");
  }

  if (image) {
    warnings.push("Screenshot received, but AI vision/OCR extraction is not configured yet.");
  }

  if (provider !== DEFAULT_PROVIDER) {
    warnings.push(
      "AI provider is configured, but this build is using the safe parser fallback."
    );
  }

  const seo = buildSeoFields(title);
  const draft = {
    title,
    slug: createTourSlug(title.ka || title.en || destination.ka || destination.en, "tour-draft"),
    destination,
    description,
    price: priceResult.price,
    currency: priceResult.currency,
    duration: buildDurationField(durationValues),
    dates,
    included: toLocalizedList(includes),
    notIncluded: {
      ka: [],
      en: [],
    },
    category: "",
    image: "",
    images: [],
    hotels,
    status: "draft",
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    canonicalUrl: "",
    days: durationValues.days,
    nights: durationValues.nights,
    importMeta: {
      confidence,
      missingFields,
      warnings,
      source: {
        type: "facebook_import",
        textProvided: Boolean(text),
        imageProvided: Boolean(image),
        imageName: image?.originalname || "",
        imageMimeType: image?.mimetype || "",
        imageSize: image?.size || 0,
        provider,
      },
    },
  };

  return {
    draft,
    confidence,
    missingFields,
    warnings,
  };
}

async function extractTourImportDraft({ postText = "", image = null } = {}) {
  const text = sanitizeText(postText);

  if (!text && !image) {
    throw createImportError(
      400,
      "Import source required",
      "Paste Facebook post text or upload a screenshot."
    );
  }

  const provider = getConfiguredProvider();

  return buildDraftFromText({
    text,
    image,
    provider,
    prompt: buildExtractionPrompt(),
  });
}

module.exports = {
  buildExtractionPrompt,
  extractTourImportDraft,
};
