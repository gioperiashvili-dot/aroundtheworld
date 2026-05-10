const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { createTourSlug, normalizeTourSlug } = require("./tourSlugs");

const toursFilePath = path.resolve(__dirname, "../data/tours.json");
const MAX_TOUR_IMAGES = 10;
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

  return {
    id: String(record?.id || ""),
    slug,
    title: normalizeLocalizedField(record?.title),
    destination: normalizeLocalizedField(record?.destination),
    description: normalizeLocalizedField(record?.description),
    price: Number.isFinite(Number(record?.price)) ? Number(record.price) : null,
    currency: String(record?.currency || "USD").trim().toUpperCase() || "USD",
    duration: normalizeLocalizedField(record?.duration),
    dates: normalizeDates(record?.dates),
    included: normalizeLocalizedListField(record?.included),
    notIncluded: normalizeLocalizedListField(record?.notIncluded),
    category: String(record?.category || "").trim(),
    image: tourImages.coverImage,
    images: tourImages.images,
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
  };
}

function validateTourInput(input) {
  const normalizedTour = normalizeTourRecord(input);

  if (countImageEntries(input?.images) > MAX_TOUR_IMAGES) {
    throw createToursError(
      400,
      "Invalid tour",
      `A tour can have at most ${MAX_TOUR_IMAGES} images.`
    );
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
  MAX_TOUR_IMAGES,
  createTour,
  deleteTour,
  getTourById,
  getTourByIdOrSlug,
  getTours,
  updateTour,
};
