const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const {
  admin,
  getAdminFirestore,
} = require("./firebaseAdmin");
const { getUploadsRoot } = require("./uploads");

const BOOKING_STATUSES = new Set(["active", "completed", "cancelled"]);
const MAX_ADMIN_NOTE_LENGTH = 1500;
const BOOKING_FILE_TYPE = "booking-document";
const MAX_BOOKING_FILE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

function createBookingError(statusCode, error, details, code) {
  const bookingError = new Error(error);
  bookingError.statusCode = statusCode;
  bookingError.details = details;
  bookingError.code = code;
  return bookingError;
}

function normalizeText(value, maxLength = 3000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function normalizeMoney(value) {
  return Number(value.toFixed(2));
}

function normalizeIncludes(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item, 500))
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((item) => normalizeText(item, 500))
    .filter(Boolean);
}

function serializeTimestamp(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  return "";
}

function getTimestampMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasPayloadField(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function getOriginalFileName(value) {
  const nameParts = String(value || "")
    .replace(/\\/g, "/")
    .split("/");
  const fileName = normalizeText(nameParts[nameParts.length - 1], 220);

  return fileName || "booking-document.pdf";
}

function hasPdfExtension(fileName) {
  return /\.pdf$/i.test(String(fileName || "").trim());
}

function hasPdfSignature(buffer) {
  return Buffer.isBuffer(buffer) && buffer.slice(0, 5).toString("utf8") === "%PDF-";
}

function assertPdfUpload(file) {
  const originalName = getOriginalFileName(file?.originalname);

  if (!file) {
    throw createBookingError(
      400,
      "PDF file is required",
      "Choose a PDF file before uploading.",
      "BOOKING_FILE_REQUIRED"
    );
  }

  if (file.size > MAX_BOOKING_FILE_BYTES) {
    throw createBookingError(
      413,
      "File too large",
      "The selected PDF must be 10MB or smaller.",
      "BOOKING_FILE_TOO_LARGE"
    );
  }

  if (
    file.mimetype !== PDF_MIME_TYPE ||
    !hasPdfExtension(originalName) ||
    !hasPdfSignature(file.buffer)
  ) {
    throw createBookingError(
      400,
      "Invalid file type",
      "Only PDF files can be uploaded to bookings.",
      "BOOKING_FILE_INVALID_TYPE"
    );
  }
}

function createBookingFileDownloadUrl(bookingId, fileId) {
  return `/api/bookings/${encodeURIComponent(bookingId)}/files/${encodeURIComponent(
    fileId
  )}`;
}

function createContentDispositionFilename(fileName, fileId) {
  const fallbackName = `${fileId}.pdf`;
  const safeName = String(fileName || fallbackName)
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .trim();

  return hasPdfExtension(safeName) ? safeName : `${safeName || fileId}.pdf`;
}

function createUtf8ContentDisposition(fileName, fileId) {
  const fallbackName = createContentDispositionFilename(fileName, fileId);
  const utf8Name = encodeURIComponent(
    hasPdfExtension(fileName) ? fileName : `${fileName || fileId}.pdf`
  );

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`;
}

function createFileId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
}

function toSafePathSegment(value, fallback = "file") {
  const segment = normalizeText(value, 200).replace(/[^A-Za-z0-9_-]/g, "_");
  return segment || fallback;
}

function getBookingUploadsRoot() {
  return path.resolve(getUploadsRoot(), "bookings");
}

function resolveBookingStoragePath(storagePath) {
  const relativePath = String(storagePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\0") ||
    !relativePath.startsWith("bookings/")
  ) {
    throw createBookingError(
      400,
      "Invalid booking file path",
      "The booking file path is invalid.",
      "BOOKING_FILE_PATH_INVALID"
    );
  }

  const uploadsRoot = path.resolve(getUploadsRoot());
  const bookingUploadsRoot = getBookingUploadsRoot();
  const absolutePath = path.resolve(uploadsRoot, relativePath);

  if (
    absolutePath !== bookingUploadsRoot &&
    !absolutePath.startsWith(`${bookingUploadsRoot}${path.sep}`)
  ) {
    throw createBookingError(
      400,
      "Invalid booking file path",
      "The booking file path is outside the booking uploads directory.",
      "BOOKING_FILE_PATH_INVALID"
    );
  }

  return absolutePath;
}

function createBookingStoragePath(bookingId, fileId) {
  return `bookings/${toSafePathSegment(bookingId, "booking")}/${toSafePathSegment(
    fileId,
    "file"
  )}.pdf`;
}

async function removeLocalBookingFile(storagePath) {
  if (!storagePath) {
    return;
  }

  try {
    await fs.unlink(resolveBookingStoragePath(storagePath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function normalizeBookingFileMetadata(file) {
  if (!file || typeof file !== "object") {
    return null;
  }

  return {
    id: normalizeText(file.id, 120),
    name: normalizeText(file.name, 220),
    originalName: normalizeText(file.originalName, 220),
    type: normalizeText(file.type, 80) || BOOKING_FILE_TYPE,
    storagePath: normalizeText(file.storagePath, 500),
    downloadURL: normalizeText(file.downloadURL, 2000),
    uploadedAt: serializeTimestamp(file.uploadedAt),
    uploadedBy: normalizeText(file.uploadedBy, 120),
  };
}

function getBookingFiles(data) {
  if (!Array.isArray(data?.files)) {
    return [];
  }

  return data.files.filter((file) => file && typeof file === "object");
}

function mapBooking(documentSnapshot) {
  const data = documentSnapshot.data() || {};
  const files = getBookingFiles(data)
    .map(normalizeBookingFileMetadata)
    .filter((file) => file?.id && file.storagePath && file.downloadURL);

  return {
    id: documentSnapshot.id,
    uid: data.uid || "",
    customerEmail: data.customerEmail || "",
    customerName: data.customerName || "",
    phone: data.phone || "",
    originalRequestId: data.originalRequestId || "",
    tourId: data.tourId || "",
    tourTitle: data.tourTitle || "",
    category: data.category || "",
    title: data.title || "",
    description: data.description || "",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    status: data.status || "",
    totalPrice: data.totalPrice || 0,
    currency: data.currency || "",
    paidAmount: data.paidAmount || 0,
    paidPercent: data.paidPercent || 0,
    remainingAmount: data.remainingAmount || 0,
    includes: Array.isArray(data.includes) ? data.includes : [],
    files,
    adminNote: data.adminNote || "",
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

async function getBookingSnapshotById(id) {
  const bookingId = normalizeText(id, 200);

  if (!bookingId) {
    throw createBookingError(
      400,
      "Booking id is required",
      "Choose a booking before managing PDF files.",
      "BOOKING_ID_REQUIRED"
    );
  }

  const bookingRef = getAdminFirestore().collection("bookings").doc(bookingId);
  const bookingSnapshot = await bookingRef.get();

  if (!bookingSnapshot.exists) {
    throw createBookingError(
      404,
      "Booking not found",
      "We could not find a booking with that id.",
      "BOOKING_NOT_FOUND"
    );
  }

  return {
    bookingId,
    bookingRef,
    bookingSnapshot,
  };
}

async function getBookings() {
  const snapshot = await getAdminFirestore().collection("bookings").get();

  return snapshot.docs
    .map(mapBooking)
    .sort((left, right) => {
      const rightTime =
        getTimestampMillis(right.updatedAt) || getTimestampMillis(right.createdAt);
      const leftTime =
        getTimestampMillis(left.updatedAt) || getTimestampMillis(left.createdAt);

      return rightTime - leftTime;
    });
}

function buildPaymentUpdate(existingData, payload) {
  const hasTotalPrice = hasPayloadField(payload, "totalPrice");
  const hasPaidAmount = hasPayloadField(payload, "paidAmount");
  const hasCurrency = hasPayloadField(payload, "currency");
  const shouldRecalculate = hasTotalPrice || hasPaidAmount;
  const paymentUpdate = {};

  if (hasCurrency) {
    const currency = normalizeText(payload.currency, 10).toUpperCase();

    if (!currency) {
      throw createBookingError(
        400,
        "Booking currency is required",
        "Enter a currency before saving booking payment fields.",
        "BOOKING_CURRENCY_REQUIRED"
      );
    }

    paymentUpdate.currency = currency;
  }

  if (!shouldRecalculate) {
    return paymentUpdate;
  }

  const totalPrice = hasTotalPrice
    ? normalizeNumber(payload.totalPrice)
    : normalizeNumber(existingData.totalPrice);
  const paidAmount = hasPaidAmount
    ? normalizeNumber(payload.paidAmount)
    : normalizeNumber(existingData.paidAmount || 0);
  const currency = hasCurrency
    ? paymentUpdate.currency
    : normalizeText(existingData.currency, 10).toUpperCase();

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw createBookingError(
      400,
      "Total price must be greater than 0",
      "Enter a total price greater than 0.",
      "BOOKING_TOTAL_PRICE_INVALID"
    );
  }

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw createBookingError(
      400,
      "Paid amount must be 0 or greater",
      "Enter a paid amount that is 0 or greater.",
      "BOOKING_PAID_AMOUNT_INVALID"
    );
  }

  if (paidAmount > totalPrice) {
    throw createBookingError(
      400,
      "Paid amount cannot exceed total price",
      "The paid amount cannot be greater than the total price.",
      "BOOKING_PAID_AMOUNT_TOO_HIGH"
    );
  }

  if (!currency) {
    throw createBookingError(
      400,
      "Booking currency is required",
      "Enter a currency before saving booking payment fields.",
      "BOOKING_CURRENCY_REQUIRED"
    );
  }

  const normalizedTotalPrice = normalizeMoney(totalPrice);
  const normalizedPaidAmount = normalizeMoney(paidAmount);

  return {
    ...paymentUpdate,
    totalPrice: normalizedTotalPrice,
    paidAmount: normalizedPaidAmount,
    currency,
    remainingAmount: normalizeMoney(normalizedTotalPrice - normalizedPaidAmount),
    paidPercent: Math.round((normalizedPaidAmount / normalizedTotalPrice) * 100),
  };
}

async function updateBooking(id, payload = {}) {
  const bookingId = normalizeText(id, 200);

  if (!bookingId) {
    throw createBookingError(
      400,
      "Booking id is required",
      "Choose a booking to update.",
      "BOOKING_ID_REQUIRED"
    );
  }

  const bookingRef = getAdminFirestore().collection("bookings").doc(bookingId);
  const bookingSnapshot = await bookingRef.get();

  if (!bookingSnapshot.exists) {
    throw createBookingError(
      404,
      "Booking not found",
      "We could not find a booking with that id.",
      "BOOKING_NOT_FOUND"
    );
  }

  const existingData = bookingSnapshot.data() || {};
  const updatePayload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (hasPayloadField(payload, "status")) {
    const status = normalizeText(payload.status, 40).toLowerCase();

    if (!BOOKING_STATUSES.has(status)) {
      throw createBookingError(
        400,
        "Invalid booking status",
        "Choose one of: active, completed, cancelled.",
        "BOOKING_STATUS_INVALID"
      );
    }

    updatePayload.status = status;
  }

  if (hasPayloadField(payload, "adminNote")) {
    updatePayload.adminNote = normalizeText(
      payload.adminNote,
      MAX_ADMIN_NOTE_LENGTH
    );
  }

  if (hasPayloadField(payload, "description")) {
    updatePayload.description = normalizeText(payload.description, 5000);
  }

  if (hasPayloadField(payload, "startDate")) {
    updatePayload.startDate = normalizeText(payload.startDate, 120);
  }

  if (hasPayloadField(payload, "endDate")) {
    updatePayload.endDate = normalizeText(payload.endDate, 120);
  }

  if (hasPayloadField(payload, "includes")) {
    updatePayload.includes = normalizeIncludes(payload.includes);
  }

  Object.assign(updatePayload, buildPaymentUpdate(existingData, payload));

  if (Object.keys(updatePayload).length === 1) {
    throw createBookingError(
      400,
      "No booking changes provided",
      "Update at least one booking field before saving.",
      "BOOKING_NO_CHANGES"
    );
  }

  await bookingRef.update(updatePayload);

  const updatedSnapshot = await bookingRef.get();
  return mapBooking(updatedSnapshot);
}

async function uploadBookingFile(id, file, options = {}) {
  const { bookingId, bookingRef } = await getBookingSnapshotById(id);
  assertPdfUpload(file);

  const fileId = createFileId();
  const originalName = getOriginalFileName(file.originalname);
  const displayName =
    normalizeText(options.name, 220) ||
    originalName.replace(/\.pdf$/i, "") ||
    originalName;
  const storagePath = createBookingStoragePath(bookingId, fileId);
  const localFilePath = resolveBookingStoragePath(storagePath);
  const uploadedAt = admin.firestore.Timestamp.now();
  const fileMetadata = {
    id: fileId,
    name: displayName,
    originalName,
    type: BOOKING_FILE_TYPE,
    storagePath,
    downloadURL: createBookingFileDownloadUrl(bookingId, fileId),
    uploadedAt,
    uploadedBy: normalizeText(options.uploadedBy, 120) || "admin",
  };

  try {
    await fs.mkdir(path.dirname(localFilePath), { recursive: true });
    await fs.writeFile(localFilePath, file.buffer, { flag: "wx" });
  } catch (error) {
    throw createBookingError(
      error.code === "EEXIST" ? 409 : 503,
      "PDF upload failed",
      "The PDF could not be saved to the server uploads directory.",
      "BOOKING_FILE_UPLOAD_FAILED"
    );
  }

  try {
    await getAdminFirestore().runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(bookingRef);

      if (!latestSnapshot.exists) {
        throw createBookingError(
          404,
          "Booking not found",
          "We could not find a booking with that id.",
          "BOOKING_NOT_FOUND"
        );
      }

      const files = getBookingFiles(latestSnapshot.data());

      transaction.update(bookingRef, {
        files: [...files, fileMetadata],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    try {
      await removeLocalBookingFile(storagePath);
    } catch (_deleteError) {
      // The Firestore error is more useful to the caller here.
    }

    throw error;
  }

  const updatedSnapshot = await bookingRef.get();

  return {
    booking: mapBooking(updatedSnapshot),
    file: normalizeBookingFileMetadata(fileMetadata),
  };
}

async function deleteBookingFile(id, fileIdValue) {
  const { bookingRef, bookingSnapshot } = await getBookingSnapshotById(id);
  const fileId = normalizeText(fileIdValue, 120);

  if (!fileId) {
    throw createBookingError(
      400,
      "Booking file id is required",
      "Choose a PDF file before deleting.",
      "BOOKING_FILE_ID_REQUIRED"
    );
  }

  const files = getBookingFiles(bookingSnapshot.data());
  const fileMetadata = files.find((file) => normalizeText(file.id, 120) === fileId);

  if (!fileMetadata) {
    throw createBookingError(
      404,
      "Booking file not found",
      "We could not find that PDF file on this booking.",
      "BOOKING_FILE_NOT_FOUND"
    );
  }

  try {
    await removeLocalBookingFile(
      fileMetadata.storagePath || createBookingStoragePath(id, fileId)
    );
  } catch (_error) {
    throw createBookingError(
      503,
      "PDF delete failed",
      "The PDF could not be deleted from the server uploads directory.",
      "BOOKING_FILE_DELETE_FAILED"
    );
  }

  await bookingRef.update({
    files: files.filter((file) => normalizeText(file.id, 120) !== fileId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updatedSnapshot = await bookingRef.get();

  return {
    booking: mapBooking(updatedSnapshot),
  };
}

async function getBookingFileForDownload(id, fileIdValue, options = {}) {
  const { bookingId, bookingSnapshot } = await getBookingSnapshotById(id);
  const fileId = normalizeText(fileIdValue, 120);

  if (!fileId) {
    throw createBookingError(
      400,
      "Booking file id is required",
      "Choose a PDF file before downloading.",
      "BOOKING_FILE_ID_REQUIRED"
    );
  }

  const bookingData = bookingSnapshot.data() || {};
  const requestedUid = normalizeText(options.uid, 200);

  if (requestedUid && normalizeText(bookingData.uid, 200) !== requestedUid) {
    throw createBookingError(
      403,
      "Booking file access denied",
      "You can only download documents for your own bookings.",
      "BOOKING_FILE_FORBIDDEN"
    );
  }

  const files = getBookingFiles(bookingData);
  const fileMetadata = files.find((file) => normalizeText(file.id, 120) === fileId);

  if (!fileMetadata) {
    throw createBookingError(
      404,
      "Booking file not found",
      "We could not find that PDF file on this booking.",
      "BOOKING_FILE_NOT_FOUND"
    );
  }

  const storagePath =
    normalizeText(fileMetadata.storagePath, 500) ||
    createBookingStoragePath(bookingId, fileId);
  const absolutePath = resolveBookingStoragePath(storagePath);

  try {
    const stats = await fs.stat(absolutePath);

    if (!stats.isFile()) {
      throw new Error("Booking file path is not a file.");
    }
  } catch (_error) {
    throw createBookingError(
      404,
      "Booking file not found",
      "The PDF file is no longer available on the server.",
      "BOOKING_FILE_NOT_FOUND"
    );
  }

  return {
    absolutePath,
    booking: mapBooking(bookingSnapshot),
    contentDisposition: createUtf8ContentDisposition(
      fileMetadata.originalName || fileMetadata.name,
      fileId
    ),
    file: normalizeBookingFileMetadata(fileMetadata),
  };
}

module.exports = {
  BOOKING_STATUSES,
  MAX_BOOKING_FILE_BYTES,
  deleteBookingFile,
  getBookingFileForDownload,
  getBookings,
  updateBooking,
  uploadBookingFile,
};
