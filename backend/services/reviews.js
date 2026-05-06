const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const reviewsFilePath = path.resolve(__dirname, "../data/reviews.json");
const REVIEW_STATUSES = new Set(["pending", "approved"]);
const MAX_COMMENT_LENGTH = 1500;
const MAX_TEXT_FIELD_LENGTH = 140;
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

function normalizePhotoURL(value) {
  const source = normalizeText(value, 800);

  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch (_error) {
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
    photoURL: normalizePhotoURL(user.photoURL),
    rating,
    comment,
    relatedType: normalizeOptionalText(input?.relatedType, 40),
    tourId: normalizeOptionalText(input?.tourId, 120),
    status: "pending",
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
  getReviews,
};
