const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const reviewsFilePath = path.resolve(__dirname, "../data/reviews.json");
const REVIEW_STATUSES = new Set(["pending", "approved"]);
const PUBLIC_REVIEWS_DEFAULT_LIMIT = 5;
const PUBLIC_REVIEWS_MAX_LIMIT = 50;
const MAX_COMMENT_LENGTH = 1500;
const MAX_TEXT_FIELD_LENGTH = 140;
const LOCAL_REVIEW_PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
let writeQueue = Promise.resolve();

function createReviewsError(statusCode, error, details, code) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  requestError.code = code;
  return requestError;
}

async function ensureReviewsFile() {
  await fs.mkdir(path.dirname(reviewsFilePath), { recursive: true });

  try {
    await fs.access(reviewsFilePath);
  } catch (_error) {
    await fs.writeFile(reviewsFilePath, "[]\n", "utf8");
  }
}

function normalizeText(value, maxLength = MAX_TEXT_FIELD_LENGTH) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeOptionalText(value, maxLength = MAX_TEXT_FIELD_LENGTH) {
  const normalizedValue = normalizeText(value, maxLength);
  return normalizedValue || null;
}

function hasAllowedReviewPhotoExtension(value) {
  return LOCAL_REVIEW_PHOTO_EXTENSIONS.has(path.extname(value).toLowerCase());
}

function isSafeLocalReviewPhotoFilename(value) {
  return (
    value.length <= 200 &&
    !value.includes("..") &&
    !/[\\/]/.test(value) &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) &&
    hasAllowedReviewPhotoExtension(value)
  );
}

function isSafeUploadsReviewPhotoPath(value) {
  const normalizedPath = value.replace(/\\/g, "/");

  return (
    normalizedPath === value &&
    /^\/?uploads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalizedPath) &&
    !normalizedPath.split("/").includes("..") &&
    !normalizedPath.includes("//") &&
    hasAllowedReviewPhotoExtension(normalizedPath)
  );
}

function normalizePhotoURL(value) {
  const source = normalizeText(value, 800);

  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch (_error) {
    // Allow safe local avatar filenames from frontend/src/assets/dpp,
    // for example: Z-96.jpg, G-96.jpg, V-96.jpg, GO-96.jpg
    const isSafeLocalImageFilename = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(source);

    if (
      isSafeLocalImageFilename &&
      !source.includes("..") &&
      !source.includes("/") &&
      !source.includes("\\")
    ) {
      return source;
    }

    return "";
  }
}

function normalizeRating(value) {
  const rating = Number(value);

  if (!Number.isFinite(rating)) {
    return null;
  }

  return Math.min(Math.max(Math.round(rating), 1), 5);
}

function getReviewTimestamp(review) {
  const timestamp = Date.parse(review?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortReviewsByCreatedAtDesc(reviews) {
  return reviews
    .map((review, index) => ({ review, index, timestamp: getReviewTimestamp(review) }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) {
        return left.index - right.index;
      }

      return right.timestamp - left.timestamp;
    })
    .map(({ review }) => review);
}

function normalizePublicReviewLimit(value) {
  const limit = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(limit) || limit < 1) {
    return PUBLIC_REVIEWS_DEFAULT_LIMIT;
  }

  return Math.min(limit, PUBLIC_REVIEWS_MAX_LIMIT);
}

function normalizeReviewRecord(record) {
  const status = REVIEW_STATUSES.has(record?.status) ? record.status : "pending";

  return {
    id: String(record?.id || ""),
    userId: String(record?.userId || ""),
    name: normalizeText(record?.name) || "Google user",
    photoURL: normalizePhotoURL(record?.photoURL),
    rating: normalizeRating(record?.rating),
    comment: normalizeText(record?.comment, MAX_COMMENT_LENGTH),
    relatedType: normalizeOptionalText(record?.relatedType, 40),
    tourId: normalizeOptionalText(record?.tourId, 120),
    status,
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
  };
}

function validateReviewInput(input, user) {
  const rating = normalizeRating(input?.rating);
  const comment = normalizeText(input?.comment, MAX_COMMENT_LENGTH);

  if (!user?.uid) {
    throw createReviewsError(
      401,
      "Authentication required",
      "Sign in with Google before submitting a review.",
      "AUTH_REQUIRED"
    );
  }

  if (rating === null) {
    throw createReviewsError(
      400,
      "Invalid review",
      "rating must be a number from 1 to 5.",
      "VALIDATION_ERROR"
    );
  }

  if (comment.length < 2) {
    throw createReviewsError(
      400,
      "Invalid review",
      "comment is required.",
      "VALIDATION_ERROR"
    );
  }

  return {
    userId: user.uid,
    name: normalizeText(user.name) || "Google user",
    photoURL: normalizePhotoURL(input?.photoURL) || normalizePhotoURL(user.photoURL),
    rating,
    comment,
    relatedType: normalizeOptionalText(input?.relatedType, 40),
    tourId: normalizeOptionalText(input?.tourId, 120),
    status: "approved",
  };
}

function matchesReviewFilters(review, filters = {}) {
  const relatedType = normalizeOptionalText(filters.relatedType, 40);
  const tourId = normalizeOptionalText(filters.tourId, 120);

  if (relatedType && review.relatedType !== relatedType) {
    return false;
  }

  if (tourId && review.tourId !== tourId) {
    return false;
  }

  return true;
}

async function readReviewsFile() {
  await ensureReviewsFile();
  const fileContents = await fs.readFile(reviewsFilePath, "utf8");

  try {
    const parsed = JSON.parse(fileContents);
    return Array.isArray(parsed) ? parsed.map(normalizeReviewRecord) : [];
  } catch (_error) {
    throw createReviewsError(
      500,
      "Reviews data is invalid",
      "The reviews storage file could not be parsed.",
      "REVIEWS_DATA_INVALID"
    );
  }
}

async function writeReviewsFile(reviews) {
  await ensureReviewsFile();
  const serializedReviews = `${JSON.stringify(reviews, null, 2)}\n`;
  await fs.writeFile(reviewsFilePath, serializedReviews, "utf8");
}

function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function getReviews(filters = {}) {
  const reviews = await readReviewsFile();
  return reviews.filter((review) => matchesReviewFilters(review, filters));
}

async function getApprovedReviews(filters = {}) {
  const reviews = await readReviewsFile();
  return reviews.filter(
    (review) => review.status === "approved" && matchesReviewFilters(review, filters)
  );
}

async function getPublicReviews(filters = {}, options = {}) {
  const approvedReviews = await getApprovedReviews(filters);
  const orderedReviews = sortReviewsByCreatedAtDesc(approvedReviews);
  const limit = normalizePublicReviewLimit(options.limit);

  return {
    reviews: orderedReviews.slice(0, limit),
    total: orderedReviews.length,
  };
}

async function createReview(input, user) {
  const nextReview = validateReviewInput(input, user);

  return queueWrite(async () => {
    const reviews = await readReviewsFile();
    const timestamp = new Date().toISOString();
    const createdReview = {
      ...nextReview,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    reviews.unshift(createdReview);
    await writeReviewsFile(reviews);
    return createdReview;
  });
}

async function approveReview(id) {
  return queueWrite(async () => {
    const reviews = await readReviewsFile();
    const existingIndex = reviews.findIndex((review) => review.id === String(id));

    if (existingIndex === -1) {
      throw createReviewsError(
        404,
        "Review not found",
        "The requested review does not exist.",
        "REVIEW_NOT_FOUND"
      );
    }

    const updatedReview = {
      ...reviews[existingIndex],
      status: "approved",
      updatedAt: new Date().toISOString(),
    };

    reviews[existingIndex] = updatedReview;
    await writeReviewsFile(reviews);
    return updatedReview;
  });
}

async function deleteReview(id) {
  return queueWrite(async () => {
    const reviews = await readReviewsFile();
    const existingIndex = reviews.findIndex((review) => review.id === String(id));

    if (existingIndex === -1) {
      throw createReviewsError(
        404,
        "Review not found",
        "The requested review does not exist.",
        "REVIEW_NOT_FOUND"
      );
    }

    const [removedReview] = reviews.splice(existingIndex, 1);
    await writeReviewsFile(reviews);
    return removedReview;
  });
}

module.exports = {
  approveReview,
  createReview,
  deleteReview,
  getApprovedReviews,
  getPublicReviews,
  getReviews,
};
