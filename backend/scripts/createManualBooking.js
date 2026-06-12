const fs = require("fs/promises");
const path = require("path");

const {
  admin,
  getAdminFirestore,
} = require("../services/firebaseAdmin");

const BOOKINGS_COLLECTION = "bookings";
const VALID_STATUSES = new Set(["active", "completed"]);

function usage() {
  return [
    "Usage:",
    "  node backend/scripts/createManualBooking.js backend/tmp/manual-booking.json",
    "  node backend/scripts/createManualBooking.js backend/tmp/manual-booking.json --confirm",
    "",
    "Without --confirm, this script prints a dry-run preview and does not write to Firestore.",
  ].join("\n");
}

function normalizeText(value, maxLength = 3000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMoney(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return Number.NaN;
  }

  return Number(numberValue.toFixed(2));
}

function normalizeIncludes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item, 500))
    .filter(Boolean);
}

function assertValidBookingInput(input) {
  const errors = [];
  const uid = normalizeText(input.uid, 200);
  const customerEmail = normalizeText(input.customerEmail, 320);
  const customerName = normalizeText(input.customerName, 300);
  const title = normalizeText(input.title, 300);
  const status = normalizeText(input.status, 40).toLowerCase();
  const category = normalizeText(input.category, 80).toLowerCase();
  const currency = normalizeText(input.currency, 10).toUpperCase();
  const totalPrice = normalizeMoney(input.totalPrice);
  const paidAmount = normalizeMoney(input.paidAmount);

  if (!uid) {
    errors.push("uid is required.");
  }

  if (!customerEmail) {
    errors.push("customerEmail is required.");
  }

  if (!customerName) {
    errors.push("customerName is required.");
  }

  if (!title) {
    errors.push("title is required.");
  }

  if (!VALID_STATUSES.has(status)) {
    errors.push("status must be active or completed.");
  }

  if (category !== "custom") {
    errors.push("category must be custom.");
  }

  if (!currency) {
    errors.push("currency is required.");
  }

  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    errors.push("totalPrice must be a valid number >= 0.");
  }

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    errors.push("paidAmount must be a valid number >= 0.");
  }

  if (
    Number.isFinite(totalPrice) &&
    Number.isFinite(paidAmount) &&
    totalPrice > 0 &&
    paidAmount > totalPrice
  ) {
    errors.push("paidAmount cannot be greater than totalPrice unless totalPrice is 0.");
  }

  if (!Array.isArray(input.includes)) {
    errors.push("includes must be an array.");
  }

  if (errors.length > 0) {
    const error = new Error(`Manual booking validation failed:\n- ${errors.join("\n- ")}`);
    error.code = "MANUAL_BOOKING_VALIDATION_FAILED";
    throw error;
  }
}

function calculatePayment(totalPrice, paidAmount) {
  if (totalPrice > 0) {
    return {
      paidPercent: Math.round((paidAmount / totalPrice) * 100),
      remainingAmount: normalizeMoney(totalPrice - paidAmount),
    };
  }

  return {
    paidPercent: paidAmount > 0 ? 100 : 0,
    remainingAmount: 0,
  };
}

function buildManualBookingDocument(input, timestampValue) {
  assertValidBookingInput(input);

  const totalPrice = normalizeMoney(input.totalPrice);
  const paidAmount = normalizeMoney(input.paidAmount);
  const payment = calculatePayment(totalPrice, paidAmount);
  const title = normalizeText(input.title, 300);
  const booking = {
    uid: normalizeText(input.uid, 200),
    customerEmail: normalizeText(input.customerEmail, 320),
    customerName: normalizeText(input.customerName, 300),
    phone: normalizeText(input.phone, 120),
    originalRequestId: null,
    tourId: null,
    tourTitle: normalizeText(input.tourTitle, 300) || title,
    category: "custom",
    title,
    description: normalizeText(input.description, 5000),
    startDate: normalizeText(input.startDate, 120),
    endDate: normalizeText(input.endDate, 120),
    status: normalizeText(input.status, 40).toLowerCase(),
    totalPrice,
    currency: normalizeText(input.currency, 10).toUpperCase(),
    paidAmount,
    paidPercent: payment.paidPercent,
    remainingAmount: payment.remainingAmount,
    includes: normalizeIncludes(input.includes),
    files: [],
    adminNote: normalizeText(input.adminNote, 1500),
    createdAt: timestampValue,
    updatedAt: timestampValue,
  };

  return booking;
}

async function readInputFile(inputPath) {
  const absoluteInputPath = path.resolve(process.cwd(), inputPath);
  const rawJson = await fs.readFile(absoluteInputPath, "utf8");

  try {
    return JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Invalid JSON in ${inputPath}: ${error.message}`);
  }
}

async function createManualBooking() {
  const args = process.argv.slice(2);
  const inputPath = args.find((arg) => !arg.startsWith("--"));
  const shouldConfirm = args.includes("--confirm");

  if (!inputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const input = await readInputFile(inputPath);
  const previewDocument = buildManualBookingDocument(input, "<serverTimestamp>");

  console.log("Manual booking preview:");
  console.log(JSON.stringify(previewDocument, null, 2));

  if (!shouldConfirm) {
    console.log("\nDry run only. Firestore was not modified.");
    console.log("Add --confirm to create this booking document.");
    return;
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const bookingDocument = buildManualBookingDocument(input, timestamp);
  const documentRef = await getAdminFirestore()
    .collection(BOOKINGS_COLLECTION)
    .add(bookingDocument);

  console.log("\nManual booking created. You can now upload PDFs from AdminPanel Active Bookings.");
  console.log(`Booking ID: ${documentRef.id}`);
  console.log(`UID: ${bookingDocument.uid}`);
  console.log(`Customer email: ${bookingDocument.customerEmail}`);
  console.log(`Title: ${bookingDocument.title}`);
  console.log(`Status: ${bookingDocument.status}`);
}

createManualBooking().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
