const { admin, getAdminFirestore } = require("./firebaseAdmin");

const BOOKING_REQUEST_STATUSES = new Set([
  "pending",
  "contacted",
  "waiting_payment",
  "converted",
  "cancelled",
]);
const MAX_ADMIN_NOTE_LENGTH = 1500;
const BOOKING_CATEGORIES = [
  "tour-package",
  "flight-ticket",
  "hotel-booking",
  "restaurant-reservation",
  "visa-service",
  "custom-tour",
  "custom-service",
  "transfer",
  "insurance",
  "other",
];

function createBookingRequestError(statusCode, error, details, code) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  requestError.code = code;
  return requestError;
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

function mapBookingRequest(documentSnapshot) {
  const data = documentSnapshot.data() || {};

  return {
    id: documentSnapshot.id,
    uid: data.uid || "",
    email: data.email || "",
    customerName: data.customerName || "",
    displayName: data.displayName || "",
    phone: data.phone || "",
    message: data.message || "",
    serviceType: data.serviceType || "",
    category: data.category || "",
    tourId: data.tourId || "",
    tourTitle: data.tourTitle || "",
    status: data.status || "pending",
    adminNote: data.adminNote || "",
    convertedBookingId: data.convertedBookingId || "",
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function mapBooking(documentSnapshot) {
  const data = documentSnapshot.data() || {};

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
    adminNote: data.adminNote || "",
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

async function getBookingRequests() {
  const snapshot = await getAdminFirestore().collection("bookingRequests").get();

  return snapshot.docs
    .map(mapBookingRequest)
    .sort((left, right) => getTimestampMillis(right.createdAt) - getTimestampMillis(left.createdAt));
}

async function updateBookingRequest(id, payload = {}) {
  const requestId = normalizeText(id, 200);

  if (!requestId) {
    throw createBookingRequestError(
      400,
      "Booking request id is required",
      "Choose a booking request to update.",
      "BOOKING_REQUEST_ID_REQUIRED"
    );
  }

  const updatePayload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeText(payload.status, 40);

    if (!BOOKING_REQUEST_STATUSES.has(status)) {
      throw createBookingRequestError(
        400,
        "Invalid booking request status",
        "Choose one of: pending, contacted, waiting_payment, converted, cancelled.",
        "BOOKING_REQUEST_STATUS_INVALID"
      );
    }

    updatePayload.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "adminNote")) {
    updatePayload.adminNote = normalizeText(payload.adminNote, MAX_ADMIN_NOTE_LENGTH);
  }

  if (!Object.prototype.hasOwnProperty.call(updatePayload, "status") &&
      !Object.prototype.hasOwnProperty.call(updatePayload, "adminNote")) {
    throw createBookingRequestError(
      400,
      "No booking request changes provided",
      "Update the status or admin note before saving.",
      "BOOKING_REQUEST_NO_CHANGES"
    );
  }

  const requestRef = getAdminFirestore().collection("bookingRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    throw createBookingRequestError(
      404,
      "Booking request not found",
      "We could not find a booking request with that id.",
      "BOOKING_REQUEST_NOT_FOUND"
    );
  }

  await requestRef.update(updatePayload);

  const updatedSnapshot = await requestRef.get();
  return mapBookingRequest(updatedSnapshot);
}

function isTourBasedRequest(requestData) {
  return Boolean(
    requestData?.tourId ||
      requestData?.tourTitle ||
      normalizeText(requestData?.serviceType, 80).toLowerCase() === "tour"
  );
}

function normalizeBookingPayload(payload, requestData) {
  const totalPrice = normalizeNumber(payload.totalPrice);
  const paidAmount = normalizeNumber(payload.paidAmount);
  const defaultCategory = isTourBasedRequest(requestData) ? "tour-package" : "";
  const title = normalizeText(payload.title || requestData.tourTitle, 300);
  const category = normalizeText(payload.category || defaultCategory, 80);
  const currency = normalizeText(payload.currency || "USD", 10).toUpperCase();

  if (!title) {
    throw createBookingRequestError(
      400,
      "Booking title is required",
      "Enter a title before converting this request.",
      "BOOKING_TITLE_REQUIRED"
    );
  }

  if (!category) {
    throw createBookingRequestError(
      400,
      "Booking category is required",
      "Choose a category before converting this request.",
      "BOOKING_CATEGORY_REQUIRED"
    );
  }

  if (!currency) {
    throw createBookingRequestError(
      400,
      "Booking currency is required",
      "Enter a currency before converting this request.",
      "BOOKING_CURRENCY_REQUIRED"
    );
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw createBookingRequestError(
      400,
      "Total price must be greater than 0",
      "Enter a total price greater than 0.",
      "BOOKING_TOTAL_PRICE_INVALID"
    );
  }

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw createBookingRequestError(
      400,
      "Paid amount must be greater than 0",
      "Enter a paid amount greater than 0.",
      "BOOKING_PAID_AMOUNT_INVALID"
    );
  }

  if (paidAmount > totalPrice) {
    throw createBookingRequestError(
      400,
      "Paid amount cannot exceed total price",
      "The paid amount cannot be greater than the total price.",
      "BOOKING_PAID_AMOUNT_TOO_HIGH"
    );
  }

  if (paidAmount < totalPrice * 0.3) {
    throw createBookingRequestError(
      400,
      "Paid amount is below the required minimum",
      "The customer must pay at least 30% before this request can become an active booking.",
      "BOOKING_MINIMUM_PAYMENT_REQUIRED"
    );
  }

  const paidPercent = Math.round((paidAmount / totalPrice) * 100);
  const remainingAmount = normalizeMoney(totalPrice - paidAmount);

  return {
    category,
    title,
    description: normalizeText(payload.description, 5000),
    startDate: normalizeText(payload.startDate, 120),
    endDate: normalizeText(payload.endDate, 120),
    totalPrice: normalizeMoney(totalPrice),
    currency,
    paidAmount: normalizeMoney(paidAmount),
    paidPercent,
    remainingAmount,
    includes: normalizeIncludes(payload.includes),
    adminNote: normalizeText(payload.adminNote, MAX_ADMIN_NOTE_LENGTH),
  };
}

async function convertBookingRequestToBooking(id, payload = {}) {
  const requestId = normalizeText(id, 200);

  if (!requestId) {
    throw createBookingRequestError(
      400,
      "Booking request id is required",
      "Choose a booking request to convert.",
      "BOOKING_REQUEST_ID_REQUIRED"
    );
  }

  const db = getAdminFirestore();
  const requestRef = db.collection("bookingRequests").doc(requestId);
  let bookingId = "";

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);

    if (!requestSnapshot.exists) {
      throw createBookingRequestError(
        404,
        "Booking request not found",
        "We could not find a booking request with that id.",
        "BOOKING_REQUEST_NOT_FOUND"
      );
    }

    const requestData = requestSnapshot.data() || {};

    if (requestData.convertedBookingId) {
      const duplicateError = createBookingRequestError(
        409,
        "Booking request is already converted",
        "This booking request already has an active booking.",
        "BOOKING_REQUEST_ALREADY_CONVERTED"
      );
      duplicateError.convertedBookingId = requestData.convertedBookingId;
      throw duplicateError;
    }

    if (!normalizeText(requestData.uid, 200)) {
      throw createBookingRequestError(
        400,
        "Registered user is required",
        "Guest requests cannot be converted into active bookings.",
        "BOOKING_REQUEST_UID_REQUIRED"
      );
    }

    const bookingPayload = normalizeBookingPayload(payload, requestData);
    const bookingRef = db.collection("bookings").doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    bookingId = bookingRef.id;

    transaction.set(bookingRef, {
      uid: normalizeText(requestData.uid, 200),
      customerEmail: normalizeText(
        requestData.customerEmail || requestData.email,
        320
      ),
      customerName: normalizeText(
        requestData.customerName || requestData.displayName,
        300
      ),
      phone: normalizeText(requestData.phone || requestData.customerPhone, 120),
      originalRequestId: requestId,
      tourId: normalizeText(requestData.tourId, 200),
      tourTitle: normalizeText(requestData.tourTitle, 300),
      category: bookingPayload.category,
      title: bookingPayload.title,
      description: bookingPayload.description,
      startDate: bookingPayload.startDate,
      endDate: bookingPayload.endDate,
      status: "active",
      totalPrice: bookingPayload.totalPrice,
      currency: bookingPayload.currency,
      paidAmount: bookingPayload.paidAmount,
      paidPercent: bookingPayload.paidPercent,
      remainingAmount: bookingPayload.remainingAmount,
      includes: bookingPayload.includes,
      adminNote: bookingPayload.adminNote,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const requestUpdate = {
      status: "converted",
      convertedBookingId: bookingRef.id,
      updatedAt: timestamp,
    };

    if (Object.prototype.hasOwnProperty.call(payload, "adminNote")) {
      requestUpdate.adminNote = bookingPayload.adminNote;
    }

    transaction.update(requestRef, requestUpdate);
  });

  const [bookingSnapshot, requestSnapshot] = await Promise.all([
    db.collection("bookings").doc(bookingId).get(),
    requestRef.get(),
  ]);

  return {
    booking: mapBooking(bookingSnapshot),
    bookingRequest: mapBookingRequest(requestSnapshot),
  };
}

module.exports = {
  BOOKING_CATEGORIES,
  BOOKING_REQUEST_STATUSES,
  convertBookingRequestToBooking,
  getBookingRequests,
  updateBookingRequest,
};
