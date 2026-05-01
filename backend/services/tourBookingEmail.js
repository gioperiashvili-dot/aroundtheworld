const {
  MAX_BOOKING_REQUEST_BYTES,
  MAX_LONG_TEXT_LENGTH,
  escapeHtml,
  normalizeText,
  sendBookingEmail,
} = require("./bookingEmail");

function firstText(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];

    if (typeof value === "number") {
      return String(value);
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const localizedText = normalizeText(value.ka || value.en);

      if (localizedText) {
        return localizedText;
      }
    }

    const text = normalizeText(value);

    if (text) {
      return text;
    }
  }

  return fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string" || typeof entry === "number") {
          return normalizeText(entry);
        }

        if (entry && typeof entry === "object") {
          return normalizeText(entry.ka || entry.en || entry.value || entry.label);
        }

        return "";
      })
      .filter(Boolean)
      .slice(0, 40);
  }

  if (value && typeof value === "object") {
    return normalizeList(value.ka || value.en);
  }

  const text = normalizeText(value);
  return text ? [text] : [];
}

function normalizeTourSummary(selectedTour = {}) {
  return {
    title: firstText(selectedTour, ["title", "name"], "Tour unavailable"),
    destination: firstText(selectedTour, ["destination"]),
    price: firstText(selectedTour, ["price", "priceFormatted"]),
    duration: firstText(selectedTour, ["duration"]),
    dates: normalizeList(selectedTour.dates || selectedTour.availableDates),
    category: firstText(selectedTour, ["category"]),
    included: normalizeList(selectedTour.included),
    notIncluded: normalizeList(selectedTour.notIncluded),
    detailUrl: firstText(selectedTour, ["detailUrl", "url"]),
  };
}

function formatTextList(label, values, lines) {
  lines.push(`${label}:`);

  if (values.length === 0) {
    lines.push("- Unavailable");
    return;
  }

  values.forEach((value) => {
    lines.push(`- ${value}`);
  });
}

function buildTextEmail({ customer, tour, language }) {
  const note =
    language === "ka"
      ? "ტურის ფასი და ხელმისაწვდომობა შეიძლება შეიცვალოს. საბოლოო პირობები უნდა დადასტურდეს დაჯავშნამდე."
      : "Tour price and availability may change. Final conditions should be confirmed before booking.";
  const lines = [
    language === "ka"
      ? "ახალი ტურის დაჯავშნის მოთხოვნა | Around The World"
      : "New tour booking request | Around The World",
    "",
    "Customer info:",
    `Name: ${customer.name}`,
    `Email: ${customer.email}`,
    `Phone: ${customer.phone}`,
  ];

  if (customer.message) {
    lines.push(`Message: ${customer.message}`);
  }

  lines.push(
    "",
    "Selected tour:",
    `Title: ${tour.title}`,
    `Destination: ${tour.destination || "Unavailable"}`,
    `Price: ${tour.price || "Unavailable"}`,
    `Duration: ${tour.duration || "Unavailable"}`,
    `Dates: ${tour.dates.join(", ") || "Unavailable"}`,
    `Category: ${tour.category || "Unavailable"}`,
    `Tour detail URL: ${tour.detailUrl || "Unavailable"}`,
    ""
  );

  formatTextList("Included items", tour.included, lines);
  lines.push("");
  formatTextList("Not included items", tour.notIncluded, lines);

  lines.push("", "Important note:", note);

  return lines.join("\n");
}

function row(label, value) {
  if (!value) {
    return "";
  }

  return `<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;color:#475569;">${escapeHtml(
    label
  )}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#0f172a;">${escapeHtml(
    value
  )}</td></tr>`;
}

function listBlock(title, values) {
  const items =
    values.length > 0
      ? values
          .map((value) => `<li style="margin:6px 0;">${escapeHtml(value)}</li>`)
          .join("")
      : `<li style="margin:6px 0;">Unavailable</li>`;

  return `
    <section style="margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
      <h3 style="margin:0 0 10px;color:#0f172a;">${escapeHtml(title)}</h3>
      <ul style="margin:0;padding-left:20px;color:#334155;">${items}</ul>
    </section>`;
}

function buildHtmlEmail({ customer, tour, language }) {
  const title =
    language === "ka"
      ? "ახალი ტურის დაჯავშნის მოთხოვნა"
      : "New tour booking request";
  const note =
    language === "ka"
      ? "ტურის ფასი და ხელმისაწვდომობა შეიძლება შეიცვალოს. საბოლოო პირობები უნდა დადასტურდეს დაჯავშნამდე."
      : "Tour price and availability may change. Final conditions should be confirmed before booking.";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 16px;">${escapeHtml(title)} | Around The World</h2>

      <h3 style="margin:20px 0 8px;">Customer info</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${row("Name", customer.name)}
        ${row("Email", customer.email)}
        ${row("Phone", customer.phone)}
        ${row("Message", customer.message)}
      </table>

      <h3 style="margin:20px 0 8px;">Selected tour</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${row("Title", tour.title)}
        ${row("Destination", tour.destination)}
        ${row("Price", tour.price)}
        ${row("Duration", tour.duration)}
        ${row("Dates", tour.dates.join(", "))}
        ${row("Category", tour.category)}
        ${row("Tour detail URL", tour.detailUrl)}
      </table>

      ${listBlock("Included items", tour.included)}
      ${listBlock("Not included items", tour.notIncluded)}

      <p style="margin-top:20px;padding:14px;border-radius:14px;background:#fff7ed;color:#9a3412;">
        <strong>Important note:</strong> ${escapeHtml(note)}
      </p>
    </div>
  `;
}

async function sendTourBookingRequestEmail(payload) {
  const language = payload.language === "ka" ? "ka" : "en";
  const customer = {
    name: normalizeText(payload.customerName),
    email: normalizeText(payload.customerEmail),
    phone: normalizeText(payload.customerPhone),
    message: normalizeText(payload.customerMessage, MAX_LONG_TEXT_LENGTH),
  };
  const tour = normalizeTourSummary(payload.selectedTour);
  const subject =
    language === "ka"
      ? "ახალი ტურის დაჯავშნის მოთხოვნა | Around The World"
      : "New tour booking request | Around The World";

  return sendBookingEmail({
    replyTo: customer.email,
    subject,
    text: buildTextEmail({ customer, tour, language }),
    html: buildHtmlEmail({ customer, tour, language }),
  });
}

module.exports = {
  MAX_BOOKING_REQUEST_BYTES,
  sendTourBookingRequestEmail,
};
