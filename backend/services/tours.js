const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { createTourSlug, normalizeTourSlug } = require("./tourSlugs");

const toursFilePath = path.resolve(__dirname, "../data/tours.json");
const MAX_TOUR_IMAGES = 10;
const MAX_TOUR_HOTEL_IMAGES = 12;
const TOUR_STATUSES = new Set(["active", "draft"]);
const TOUR_CURRENCIES = new Set(["GEL", "USD", "EUR"]);
const MAX_TOUR_TITLE_LENGTH = 180;
const MAX_TOUR_DESCRIPTION_LENGTH = 12000;
let writeQueue = Promise.resolve();

function createToursError(statusCode, error, details) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  return requestError;
}

async function ensureToursFile() {
  await fs.mkdir(path.dirname(toursFilePath), { recursive: true });

  try {
    await fs.access(toursFilePath);
  } catch (_error) {
    await fs.writeFile(toursFilePath, "[]\n", "utf8");
  }
}

function normalizeImage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();

  if (/^uploads\//i.test(trimmedValue)) {
    return `/${trimmedValue}`;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch (_error) {
    return null;
  }
}

function normalizeImages(value) {
  const values = Array.isArray(value) ? value : [];
  const seen = new Set();

  return values
    .map(normalizeImage)
    .filter(Boolean)
    .filter((image) => {
      if (seen.has(image)) {
        return false;
      }

      seen.add(image);
      return true;
    });
}

const HOTEL_IMAGE_SOURCE_KEYS = [
  "images",
  "imageUrls",
  "imageURLs",
  "photos",
  "photoUrls",
  "photoURLs",
  "gallery",
  "galleryImages",
  "media",
  "image",
  "imageUrl",
  "imageURL",
  "photo",
  "photoUrl",
  "photoURL",
  "coverImage",
  "thumbnail",
  "thumbnailUrl",
];

const HOTEL_IMAGE_OBJECT_KEYS = [
  "url",
  "src",
  "path",
  "image",
  "imageUrl",
  "imageURL",
  "photo",
  "photoUrl",
  "photoURL",
  "coverImage",
  "thumbnail",
  "thumbnailUrl",
];

function collectHotelImageValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectHotelImageValues);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return HOTEL_IMAGE_OBJECT_KEYS.flatMap((key) =>
    collectHotelImageValues(value[key])
  );
}

function getHotelImages(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return [];
  }

  return normalizeImages(
    HOTEL_IMAGE_SOURCE_KEYS.flatMap((key) => collectHotelImageValues(record[key]))
  );
}

function getSingleImageFallback(record) {
  return (
    normalizeImage(record?.image) ||
    normalizeImage(record?.imageUrl) ||
    normalizeImage(record?.coverImage)
  );
}

function getTourImages(record) {
  const galleryImages = normalizeImages(record?.images);
  const singleImage = getSingleImageFallback(record);
  const images = normalizeImages([...galleryImages, singleImage]);

  return {
    coverImage: galleryImages[0] || singleImage || images[0] || null,
    images,
  };
}

function countImageEntries(value) {
  return Array.isArray(value)
    ? value.filter((entry) => String(entry || "").trim()).length
    : 0;
}

function normalizeDates(value) {
  const dateValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .split(/[\n,]/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  return dateValues.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
}

function normalizeTourStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return TOUR_STATUSES.has(status) ? status : "active";
}

function isDraftTour(record) {
  return normalizeTourStatus(record?.status) === "draft";
}

function normalizePrice(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const source = String(value).trim();

  if (!source) {
    return null;
  }

  const price = Number(source);
  return Number.isFinite(price) ? price : null;
}

function normalizeCurrency(value) {
  const currency = String(value || "GEL").trim().toUpperCase();
  return TOUR_CURRENCIES.has(currency) ? currency : "GEL";
}

function normalizeLocalizedField(value) {
  if (typeof value === "string") {
    return {
      ka: "",
      en: value.trim(),
    };
  }

  if (!value || typeof value !== "object") {
    return {
      ka: "",
      en: "",
    };
  }

  return {
    ka: typeof value.ka === "string" ? value.ka.trim() : "",
    en: typeof value.en === "string" ? value.en.trim() : "",
  };
}

function normalizeTextList(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];

  return values
    .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeLocalizedListField(value) {
  if (Array.isArray(value)) {
    return {
      ka: normalizeTextList(value),
      en: [],
    };
  }

  if (!value || typeof value !== "object") {
    return {
      ka: [],
      en: [],
    };
  }

  return {
    ka: normalizeTextList(value.ka),
    en: normalizeTextList(value.en),
  };
}

function normalizeNullableInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : null;
}

function normalizeCanonicalUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const parsedUrl = new URL(value.trim());
    return ["http:", "https:"].includes(parsedUrl.protocol)
      ? parsedUrl.toString()
      : "";
  } catch (_error) {
    return "";
  }
}

function normalizeStringArray(value, maxItems = 20) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];

  return values
    .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeConfidence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((confidence, [key, level]) => {
    const confidenceKey = String(key || "").replace(/[^\w.-]/g, "").slice(0, 60);
    const confidenceLevel = String(level || "").trim().toLowerCase();

    if (
      confidenceKey &&
      ["high", "medium", "low", "unknown"].includes(confidenceLevel)
    ) {
      confidence[confidenceKey] = confidenceLevel;
    }

    return confidence;
  }, {});
}

function normalizeImportSource(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      type: "manual",
    };
  }

  return {
    type: String(value.type || "facebook_import").trim().slice(0, 80),
    textProvided: Boolean(value.textProvided),
    imageProvided: Boolean(value.imageProvided),
    imageName: String(value.imageName || "").trim().slice(0, 180),
    imageMimeType: String(value.imageMimeType || "").trim().slice(0, 80),
    imageSize: Number.isFinite(Number(value.imageSize)) ? Number(value.imageSize) : 0,
    provider: String(value.provider || "").trim().slice(0, 80),
  };
}

function normalizeImportMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const normalizedMeta = {
    confidence: normalizeConfidence(value.confidence),
    missingFields: normalizeStringArray(value.missingFields),
    warnings: normalizeStringArray(value.warnings),
    source: normalizeImportSource(value.source),
  };

  const hasMeta =
    Object.keys(normalizedMeta.confidence).length > 0 ||
    normalizedMeta.missingFields.length > 0 ||
    normalizedMeta.warnings.length > 0 ||
    normalizedMeta.source.type !== "manual";

  return hasMeta ? normalizedMeta : null;
}

function normalizeHotelLink(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const trimmedValue = value.trim();

  try {
    const parsedUrl = new URL(trimmedValue);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch (_error) {
    return "";
  }
}

function getHotelField(record, names) {
  for (const name of names) {
    if (
      record?.[name] !== undefined &&
      record?.[name] !== null &&
      record?.[name] !== ""
    ) {
      return record[name];
    }
  }

  return "";
}

function normalizeHotelRecord(record, index) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const name =
    typeof record.name === "string"
      ? record.name.trim()
      : normalizeLocalizedField(record.name);
  const stars = Number.parseFloat(
    String(getHotelField(record, ["stars", "starRating"]) ?? "").replace(",", ".")
  );
  const rating = Number.parseFloat(
    String(getHotelField(record, ["rating", "reviewRating"]) ?? "").replace(",", ".")
  );
  const reviewCountText = String(
    getHotelField(record, ["reviewCount", "reviewsCount", "review_count"]) ?? ""
  ).replace(/[,\s]/g, "");
  const reviewCount = /^\d+$/.test(reviewCountText)
    ? Number.parseInt(reviewCountText, 10)
    : Number.NaN;
  const hotelImages = getHotelImages(record);
  const normalizedHotel = {
    id: String(record.id || `hotel-${index + 1}`).trim() || `hotel-${index + 1}`,
    name,
    location:
      typeof record.location === "string"
        ? record.location.trim()
        : normalizeLocalizedField(record.location),
    mealPlan:
      typeof record.mealPlan === "string"
        ? record.mealPlan.trim()
        : normalizeLocalizedField(record.mealPlan),
    stars: Number.isFinite(stars) && stars > 0 ? Math.min(Math.round(stars), 5) : null,
    rating:
      Number.isFinite(rating) && rating >= 0 && rating <= 10
        ? Math.round(rating * 10) / 10
        : null,
    reviewCount:
      Number.isInteger(reviewCount) && reviewCount >= 0 ? reviewCount : null,
    link: normalizeHotelLink(record.link),
    images: hotelImages.slice(0, MAX_TOUR_HOTEL_IMAGES),
  };

  const hasHotelContent =
    hasLocalizedOrPlainText(normalizedHotel.name) ||
    hasLocalizedOrPlainText(normalizedHotel.location) ||
    hasLocalizedOrPlainText(normalizedHotel.mealPlan) ||
    Boolean(normalizedHotel.stars) ||
    normalizedHotel.rating !== null ||
    normalizedHotel.reviewCount !== null ||
    Boolean(normalizedHotel.link) ||
    normalizedHotel.images.length > 0;

  if (!hasHotelContent) {
    return null;
  }

  if (!hasLocalizedOrPlainText(normalizedHotel.location)) {
    delete normalizedHotel.location;
  }

  if (!hasLocalizedOrPlainText(normalizedHotel.mealPlan)) {
    delete normalizedHotel.mealPlan;
  }

  if (!normalizedHotel.stars) {
    delete normalizedHotel.stars;
  }

  if (normalizedHotel.rating === null) {
    delete normalizedHotel.rating;
  }

  if (normalizedHotel.reviewCount === null) {
    delete normalizedHotel.reviewCount;
  }

  if (!normalizedHotel.link) {
    delete normalizedHotel.link;
  }

  if (normalizedHotel.images.length === 0) {
    normalizedHotel.images = [];
  }

  return normalizedHotel;
}

function hasLocalizedOrPlainText(value) {
  if (typeof value === "string") {
    return Boolean(value.trim());
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Boolean(String(value.ka || "").trim() || String(value.en || "").trim());
}

function normalizeTourHotels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeHotelRecord)
    .filter(Boolean);
}

function normalizeUploadPublicPath(value) {
  const source = String(value || "").trim();

  if (!source) {
    return "";
  }

  try {
    if (/^https?:\/\//i.test(source)) {
      return new URL(source).pathname;
    }
  } catch (_error) {
    return source;
  }

  if (/^uploads\//i.test(source)) {
    return `/${source}`;
  }

  return source;
}

function getTourAndHotelIndexes(tours, tourId, hotelId) {
  const tourIndex = tours.findIndex((tour) => tour.id === String(tourId));

  if (tourIndex === -1) {
    throw createToursError(404, "Tour not found", "The requested tour does not exist.");
  }

  const hotels = Array.isArray(tours[tourIndex].hotels) ? tours[tourIndex].hotels : [];
  const hotelIndex = hotels.findIndex((hotel) => hotel.id === String(hotelId));

  if (hotelIndex === -1) {
    throw createToursError(
      404,
      "Hotel not found",
      "Save this hotel on the tour before uploading images."
    );
  }

  return {
    tourIndex,
    hotelIndex,
  };
}

function getTourSlugSource(record) {
  const title = normalizeLocalizedField(record?.title);
  const destination = normalizeLocalizedField(record?.destination);

  return (
    title.ka ||
    title.en ||
    destination.ka ||
    destination.en ||
    record?.id ||
    "tour"
  );
}

function createUniqueTourSlug(baseSlug, tours, currentId = "") {
  const fallbackSource =
    tours.find((tour) => tour.id === String(currentId)) || null;
  const base =
    normalizeTourSlug(baseSlug) ||
    createTourSlug(getTourSlugSource(fallbackSource), "tour");
  const usedSlugs = new Set(
    tours
      .filter((tour) => !currentId || tour.id !== String(currentId))
      .map((tour) => normalizeTourSlug(tour.slug))
      .filter(Boolean)
  );
  let nextSlug = base;
  let suffix = 2;

  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${base}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

function ensureUniqueTourSlugs(tours) {
  const usedSlugs = new Set();

  return tours.map((tour) => {
    const base = normalizeTourSlug(tour.slug) || createTourSlug(getTourSlugSource(tour));
    let nextSlug = base;
    let suffix = 2;

    while (usedSlugs.has(nextSlug)) {
      nextSlug = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(nextSlug);

    return {
      ...tour,
      slug: nextSlug,
    };
  });
}

function normalizeTourRecord(record) {
  const tourImages = getTourImages(record);
  const slug = normalizeTourSlug(record?.slug) || createTourSlug(getTourSlugSource(record));
  const hotels = normalizeTourHotels(record?.hotels);
  const importMeta = normalizeImportMeta(record?.importMeta);

  const normalizedTour = {
    id: String(record?.id || ""),
    slug,
    status: normalizeTourStatus(record?.status),
    title: normalizeLocalizedField(record?.title),
    destination: normalizeLocalizedField(record?.destination),
    description: normalizeLocalizedField(record?.description),
    price: normalizePrice(record?.price),
    currency: normalizeCurrency(record?.currency),
    duration: normalizeLocalizedField(record?.duration),
    dates: normalizeDates(record?.dates),
    included: normalizeLocalizedListField(record?.included),
    notIncluded: normalizeLocalizedListField(record?.notIncluded),
    category: String(record?.category || "").trim(),
    seoTitle: normalizeLocalizedField(record?.seoTitle),
    seoDescription: normalizeLocalizedField(record?.seoDescription),
    canonicalUrl: normalizeCanonicalUrl(record?.canonicalUrl),
    days: normalizeNullableInteger(record?.days),
    nights: normalizeNullableInteger(record?.nights),
    image: tourImages.coverImage,
    images: tourImages.images,
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
  };

  if (hotels.length > 0) {
    normalizedTour.hotels = hotels;
  }

  if (importMeta) {
    normalizedTour.importMeta = importMeta;
  }

  return normalizedTour;
}

function validateTourInput(input) {
  const normalizedTour = normalizeTourRecord(input);
  const isDraft = isDraftTour(normalizedTour);

  if (countImageEntries(input?.images) > MAX_TOUR_IMAGES) {
    throw createToursError(
      400,
      "Invalid tour",
      `A tour can have at most ${MAX_TOUR_IMAGES} images.`
    );
  }

  if (normalizedTour.title.ka.length > MAX_TOUR_TITLE_LENGTH) {
    throw createToursError(400, "Invalid tour", "title.ka is too long.");
  }

  if (normalizedTour.title.en.length > MAX_TOUR_TITLE_LENGTH) {
    throw createToursError(400, "Invalid tour", "title.en is too long.");
  }

  if (normalizedTour.description.ka.length > MAX_TOUR_DESCRIPTION_LENGTH) {
    throw createToursError(400, "Invalid tour", "description.ka is too long.");
  }

  if (normalizedTour.description.en.length > MAX_TOUR_DESCRIPTION_LENGTH) {
    throw createToursError(400, "Invalid tour", "description.en is too long.");
  }

  if (normalizedTour.price !== null && normalizedTour.price < 0) {
    throw createToursError(
      400,
      "Invalid tour",
      "price must be a valid number greater than or equal to 0."
    );
  }

  if (isDraft) {
    return normalizedTour;
  }

  if (!normalizedTour.title.ka) {
    throw createToursError(400, "Invalid tour", "title.ka is required.");
  }

  if (!normalizedTour.title.en) {
    throw createToursError(400, "Invalid tour", "title.en is required.");
  }

  if (!normalizedTour.destination.ka) {
    throw createToursError(400, "Invalid tour", "destination.ka is required.");
  }

  if (!normalizedTour.destination.en) {
    throw createToursError(400, "Invalid tour", "destination.en is required.");
  }

  if (!normalizedTour.description.ka) {
    throw createToursError(400, "Invalid tour", "description.ka is required.");
  }

  if (!normalizedTour.description.en) {
    throw createToursError(400, "Invalid tour", "description.en is required.");
  }

  if (normalizedTour.price === null || normalizedTour.price < 0) {
    throw createToursError(
      400,
      "Invalid tour",
      "price must be a valid number greater than or equal to 0."
    );
  }

  if (!normalizedTour.duration.ka) {
    throw createToursError(400, "Invalid tour", "duration.ka is required.");
  }

  if (!normalizedTour.duration.en) {
    throw createToursError(400, "Invalid tour", "duration.en is required.");
  }

  return normalizedTour;
}

async function readToursFile() {
  await ensureToursFile();
  const fileContents = await fs.readFile(toursFilePath, "utf8");

  try {
    const parsed = JSON.parse(fileContents);
    const tours = Array.isArray(parsed) ? parsed.map(normalizeTourRecord) : [];
    return ensureUniqueTourSlugs(tours);
  } catch (_error) {
    throw createToursError(
      500,
      "Tours data is invalid",
      "The tours storage file could not be parsed."
    );
  }
}

async function writeToursFile(tours) {
  await ensureToursFile();
  const serializedTours = `${JSON.stringify(tours, null, 2)}\n`;
  await fs.writeFile(toursFilePath, serializedTours, "utf8");
}

function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function getTours() {
  return readToursFile();
}

async function getPublicTours() {
  const tours = await readToursFile();
  return tours.filter((tour) => !isDraftTour(tour));
}

async function getTourById(id) {
  const tours = await readToursFile();
  return tours.find((tour) => tour.id === String(id)) || null;
}

async function getTourByIdOrSlug(idOrSlug) {
  const tours = await readToursFile();
  const lookup = String(idOrSlug || "");
  const slug = normalizeTourSlug(lookup);

  return (
    tours.find((tour) => tour.id === lookup) ||
    tours.find((tour) => slug && tour.slug === slug) ||
    null
  );
}

async function getPublicTourByIdOrSlug(idOrSlug) {
  const tours = await getPublicTours();
  const lookup = String(idOrSlug || "");
  const slug = normalizeTourSlug(lookup);

  return (
    tours.find((tour) => tour.id === lookup) ||
    tours.find((tour) => slug && tour.slug === slug) ||
    null
  );
}

async function createTour(input) {
  const nextTour = validateTourInput(input);

  return queueWrite(async () => {
    const tours = await readToursFile();
    const timestamp = new Date().toISOString();
    const createdTour = {
      ...nextTour,
      id: randomUUID(),
      slug: createUniqueTourSlug(nextTour.slug, tours),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    tours.unshift(createdTour);
    await writeToursFile(tours);
    return createdTour;
  });
}

async function updateTour(id, input) {
  const nextTour = validateTourInput(input);

  return queueWrite(async () => {
    const tours = await readToursFile();
    const existingIndex = tours.findIndex((tour) => tour.id === String(id));

    if (existingIndex === -1) {
      throw createToursError(404, "Tour not found", "The requested tour does not exist.");
    }

    const existingTour = tours[existingIndex];
    const inputHasSlug =
      typeof input?.slug === "string" && input.slug.trim().length > 0;
    const slugSource = inputHasSlug
      ? nextTour.slug
      : existingTour.slug || nextTour.slug;
    const updatedTour = {
      ...existingTour,
      ...nextTour,
      id: existingTour.id,
      slug: createUniqueTourSlug(slugSource, tours, existingTour.id),
      createdAt: existingTour.createdAt,
      updatedAt: new Date().toISOString(),
    };

    tours[existingIndex] = updatedTour;
    await writeToursFile(tours);
    return updatedTour;
  });
}

async function addTourHotelImages(tourId, hotelId, imagePaths = []) {
  const incomingImages = normalizeImages(imagePaths);

  if (incomingImages.length === 0) {
    throw createToursError(
      400,
      "Hotel images are required",
      "Choose at least one hotel image before uploading."
    );
  }

  return queueWrite(async () => {
    const tours = await readToursFile();
    const { tourIndex, hotelIndex } = getTourAndHotelIndexes(tours, tourId, hotelId);
    const tour = tours[tourIndex];
    const hotels = Array.isArray(tour.hotels) ? [...tour.hotels] : [];
    const hotel = {
      ...hotels[hotelIndex],
      images: Array.isArray(hotels[hotelIndex].images)
        ? [...hotels[hotelIndex].images]
        : [],
    };
    const nextImages = normalizeImages([...hotel.images, ...incomingImages]);

    if (nextImages.length > MAX_TOUR_HOTEL_IMAGES) {
      throw createToursError(
        400,
        "Too many hotel images",
        `A hotel can have at most ${MAX_TOUR_HOTEL_IMAGES} images.`
      );
    }

    hotel.images = nextImages;
    hotels[hotelIndex] = hotel;
    tours[tourIndex] = {
      ...tour,
      hotels,
      updatedAt: new Date().toISOString(),
    };

    await writeToursFile(tours);

    return {
      tour: tours[tourIndex],
      hotel,
    };
  });
}

async function removeTourHotelImage(tourId, hotelId, imagePath) {
  const targetPath = normalizeUploadPublicPath(imagePath);

  if (!targetPath) {
    throw createToursError(
      400,
      "Hotel image path is required",
      "Choose a hotel image before deleting."
    );
  }

  return queueWrite(async () => {
    const tours = await readToursFile();
    const { tourIndex, hotelIndex } = getTourAndHotelIndexes(tours, tourId, hotelId);
    const tour = tours[tourIndex];
    const hotels = Array.isArray(tour.hotels) ? [...tour.hotels] : [];
    const hotel = {
      ...hotels[hotelIndex],
      images: Array.isArray(hotels[hotelIndex].images)
        ? hotels[hotelIndex].images.filter(
            (image) => normalizeUploadPublicPath(image) !== targetPath
          )
        : [],
    };

    hotels[hotelIndex] = hotel;
    tours[tourIndex] = {
      ...tour,
      hotels,
      updatedAt: new Date().toISOString(),
    };

    await writeToursFile(tours);

    return {
      tour: tours[tourIndex],
      hotel,
    };
  });
}

async function deleteTour(id) {
  return queueWrite(async () => {
    const tours = await readToursFile();
    const existingIndex = tours.findIndex((tour) => tour.id === String(id));

    if (existingIndex === -1) {
      throw createToursError(404, "Tour not found", "The requested tour does not exist.");
    }

    const [removedTour] = tours.splice(existingIndex, 1);
    await writeToursFile(tours);
    return removedTour;
  });
}

module.exports = {
  MAX_TOUR_HOTEL_IMAGES,
  MAX_TOUR_IMAGES,
  addTourHotelImages,
  createTour,
  deleteTour,
  getPublicTourByIdOrSlug,
  getPublicTours,
  getTourById,
  getTourByIdOrSlug,
  getTours,
  removeTourHotelImage,
  updateTour,
};
