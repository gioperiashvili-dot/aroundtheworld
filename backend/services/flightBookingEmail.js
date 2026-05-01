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

    const text = normalizeText(value);

    if (text) {
      return text;
    }
  }

  return fallback;
}

function toList(value, itemKeys = ["name", "code", "displayCode"]) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string" || typeof entry === "number") {
          return normalizeText(entry);
        }

        return firstText(entry, itemKeys);
      })
      .filter(Boolean);
  }

  const text = normalizeText(value);
  return text ? [text] : [];
}

function getRouteLabel(flight) {
  const route =
    firstText(flight, ["route", "routeLabel"]) ||
    [firstText(flight, ["originCode", "origin"]), firstText(flight, ["destinationCode", "destination"])]
      .filter(Boolean)
      .join(" -> ");

  return route || "Route unavailable";
}

function normalizeSegment(segment, index) {
  const originCode = firstText(segment, ["originCode"]);
  const destinationCode = firstText(segment, ["destinationCode"]);
  const origin = firstText(segment, ["originAirport", "originName", "origin"], originCode);
  const destination = firstText(
    segment,
    ["destinationAirport", "destinationName", "destination"],
    destinationCode
  );
  const route = [origin, destination].filter(Boolean).join(" -> ");
  const layover = segment?.layover || segment?.layoverAfter || {};

  return {
    label: `Segment ${index + 1}`,
    route,
    airline: firstText(segment, ["airline", "airlineName", "carrierName"]),
    flightNumber: firstText(segment, ["flightNumber"]),
    departure: firstText(segment, ["departure"]),
    arrival: firstText(segment, ["arrival"]),
    duration: firstText(segment, ["duration"]),
    aircraft: firstText(segment, ["aircraft"]),
    layoverAirport: firstText(layover, ["airport", "airportName", "code"]),
    layoverDuration: firstText(layover, ["duration"]),
  };
}

function buildFlightSummary(selectedFlight = {}) {
  const carriers = toList(selectedFlight.airlines || selectedFlight.carriers).slice(0, 12);
  const flightNumbers = toList(
    selectedFlight.flightNumbers || selectedFlight.flightNumber,
    ["flightNumber", "number"]
  ).slice(0, 12);
  const segments = Array.isArray(selectedFlight.segments)
    ? selectedFlight.segments.slice(0, 12).map(normalizeSegment)
    : [];

  return {
    route: getRouteLabel(selectedFlight),
    airlines:
      carriers.join(", ") ||
      firstText(selectedFlight, ["airline", "airlineName"], "Airline unavailable"),
    flightNumbers:
      flightNumbers.join(", ") ||
      firstText(selectedFlight, ["flightNumber"], "Flight number unavailable"),
    departure: firstText(selectedFlight, ["departure"]),
    arrival: firstText(selectedFlight, ["arrival"]),
    duration: firstText(selectedFlight, ["duration"]),
    stops: firstText(selectedFlight, ["stopsLabel", "stops"]),
    layovers: toList(selectedFlight.layovers, ["airport", "airportName", "duration"]).join(", "),
    price: firstText(selectedFlight, ["price", "priceFormatted"]),
    cabin: firstText(selectedFlight, ["cabin", "cabinLabel"]),
    travelers: firstText(selectedFlight, ["travelers", "travelersLabel"]),
    segments,
  };
}

function buildTextEmail({ customer, flight, language }) {
  const lines = [
    language === "ka"
      ? "ახალი ავიაბილეთის მოთხოვნა | Around The World"
      : "New flight booking request | Around The World",
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
    "Selected flight:",
    `Route: ${flight.route}`,
    `Airline(s): ${flight.airlines}`,
    `Flight number(s): ${flight.flightNumbers}`,
    `Departure: ${flight.departure || "Unavailable"}`,
    `Arrival: ${flight.arrival || "Unavailable"}`,
    `Duration: ${flight.duration || "Unavailable"}`,
    `Stops/layovers: ${[flight.stops, flight.layovers].filter(Boolean).join(", ") || "Unavailable"}`,
    `Price shown: ${flight.price || "Unavailable"}`,
    `Cabin/travelers: ${[flight.cabin, flight.travelers].filter(Boolean).join(", ") || "Unavailable"}`
  );

  flight.segments.forEach((segment) => {
    lines.push(
      "",
      `${segment.label}: ${segment.route || "Route unavailable"}`,
      `Airline: ${segment.airline || "Unavailable"}`,
      `Flight: ${segment.flightNumber || "Unavailable"}`,
      `Departure: ${segment.departure || "Unavailable"}`,
      `Arrival: ${segment.arrival || "Unavailable"}`,
      `Duration: ${segment.duration || "Unavailable"}`
    );

    if (segment.aircraft) {
      lines.push(`Aircraft: ${segment.aircraft}`);
    }

    if (segment.layoverAirport || segment.layoverDuration) {
      lines.push(
        `Layover: ${[segment.layoverAirport, segment.layoverDuration].filter(Boolean).join(" - ")}`
      );
    }
  });

  lines.push(
    "",
    "Important note:",
    "The displayed ticket price may change and should be confirmed before booking."
  );

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

function buildHtmlEmail({ customer, flight, language }) {
  const title =
    language === "ka"
      ? "ახალი ავიაბილეთის მოთხოვნა"
      : "New flight booking request";
  const segmentHtml = flight.segments
    .map(
      (segment) => `
        <section style="margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:14px;">
          <h3 style="margin:0 0 10px;color:#0f172a;">${escapeHtml(segment.label)}</h3>
          <p style="margin:0 0 10px;color:#334155;">${escapeHtml(
            segment.route || "Route unavailable"
          )}</p>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${row("Airline", segment.airline)}
            ${row("Flight", segment.flightNumber)}
            ${row("Departure", segment.departure)}
            ${row("Arrival", segment.arrival)}
            ${row("Duration", segment.duration)}
            ${row("Aircraft", segment.aircraft)}
            ${row(
              "Layover",
              [segment.layoverAirport, segment.layoverDuration].filter(Boolean).join(" - ")
            )}
          </table>
        </section>`
    )
    .join("");

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

      <h3 style="margin:20px 0 8px;">Selected flight</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${row("Route", flight.route)}
        ${row("Airline(s)", flight.airlines)}
        ${row("Flight number(s)", flight.flightNumbers)}
        ${row("Departure", flight.departure)}
        ${row("Arrival", flight.arrival)}
        ${row("Duration", flight.duration)}
        ${row("Stops/layovers", [flight.stops, flight.layovers].filter(Boolean).join(", "))}
        ${row("Price shown", flight.price)}
        ${row("Cabin/travelers", [flight.cabin, flight.travelers].filter(Boolean).join(", "))}
      </table>

      ${segmentHtml}

      <p style="margin-top:20px;padding:14px;border-radius:14px;background:#fff7ed;color:#9a3412;">
        <strong>Important note:</strong> The displayed ticket price may change and should be confirmed before booking.
      </p>
    </div>
  `;
}

async function sendFlightBookingRequestEmail(payload) {
  const language = payload.language === "ka" ? "ka" : "en";
  const customer = {
    name: normalizeText(payload.customerName),
    email: normalizeText(payload.customerEmail),
    phone: normalizeText(payload.customerPhone),
    message: normalizeText(payload.customerMessage, MAX_LONG_TEXT_LENGTH),
  };
  const flight = buildFlightSummary(payload.selectedFlight);
  const subject =
    language === "ka"
      ? "ახალი ავიაბილეთის მოთხოვნა | Around The World"
      : "New flight booking request | Around The World";

  return sendBookingEmail({
    replyTo: customer.email,
    subject,
    text: buildTextEmail({ customer, flight, language }),
    html: buildHtmlEmail({ customer, flight, language }),
  });
}

module.exports = {
  MAX_BOOKING_REQUEST_BYTES,
  sendFlightBookingRequestEmail,
};
