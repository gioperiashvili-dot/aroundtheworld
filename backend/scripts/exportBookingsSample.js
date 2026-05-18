const fs = require("fs/promises");
const path = require("path");

const { getAdminFirestore } = require("../services/firebaseAdmin");

const BOOKINGS_COLLECTION = "bookings";
const OUTPUT_PATH = path.resolve(__dirname, "../tmp/bookings-sample.json");
const SAMPLE_LIMIT = 3;
const MAX_STRING_LENGTH = 600;

const SECRET_KEY_PATTERN =
  /(secret|token|password|private|credential|authorization|rapidapi|api[_-]?key|serviceaccount)/i;
const PII_KEY_PATTERN =
  /^(uid|email|customeremail|customername|displayname|phone|customerphone)$/i;

function redactPlaceholder(key) {
  const normalizedKey = String(key || "").toLowerCase();

  if (normalizedKey.includes("email")) {
    return "[REDACTED_EMAIL]";
  }

  if (normalizedKey.includes("phone")) {
    return "[REDACTED_PHONE]";
  }

  if (normalizedKey.includes("name")) {
    return "[REDACTED_NAME]";
  }

  if (normalizedKey === "uid") {
    return "[REDACTED_UID]";
  }

  return "[REDACTED]";
}

function serializeValue(value, key = "") {
  if (SECRET_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)) {
    return redactPlaceholder(key);
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, key));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        serializeValue(childValue, childKey),
      ])
    );
  }

  if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}... [TRUNCATED]`;
  }

  return value;
}

async function exportBookingsSample() {
  const snapshot = await getAdminFirestore()
    .collection(BOOKINGS_COLLECTION)
    .limit(SAMPLE_LIMIT)
    .get();

  const sample = snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    data: serializeValue(documentSnapshot.data() || {}),
  }));

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(`${OUTPUT_PATH}`, `${JSON.stringify(sample, null, 2)}\n`);

  console.log(
    `Exported ${sample.length} sanitized booking sample(s) to ${path.relative(
      process.cwd(),
      OUTPUT_PATH
    )}`
  );
}

exportBookingsSample().catch((error) => {
  console.error("Failed to export booking samples:", error.message);
  process.exitCode = 1;
});
