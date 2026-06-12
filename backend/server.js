const express = require("express");
const cors = require("cors");
const flightsRoute = require("./routes/flights");
const hotelsRoute = require("./routes/hotels");
const restaurantsRoute = require("./routes/restaurants");
const toursRoute = require("./routes/tours");
const reviewsRoute = require("./routes/reviews");
const blogsRoute = require("./routes/blogs");
const bookingsRoute = require("./routes/bookings");
const adminRoute = require("./routes/admin");
const { CLIENT_ORIGIN, CLIENT_ORIGINS, PORT } = require("./config/env");
const { buildSitemapXml } = require("./services/sitemap");
const { getBlogUploadsDir, getTourUploadsDir } = require("./services/uploads");

const app = express();

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/$/, "");
}

function parseAllowedOrigins() {
  const configuredOrigins = [
    CLIENT_ORIGIN,
    ...String(CLIENT_ORIGINS || "").split(","),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set(configuredOrigins)];
}

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn("[CORS] Blocked origin:", origin);
    return callback(null, false);
  },
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(
  "/uploads/tours",
  express.static(getTourUploadsDir(), {
    maxAge: "30d",
    immutable: true,
  })
);
app.use(
  "/uploads/blogs",
  express.static(getBlogUploadsDir(), {
    maxAge: "30d",
    immutable: true,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/sitemap.xml", async (_req, res) => {
  try {
    const sitemapXml = await buildSitemapXml();
    res.type("application/xml").send(sitemapXml);
  } catch (error) {
    console.error("[sitemap] Unable to generate sitemap:", error);
    res.status(500).type("text/plain").send("Unable to generate sitemap.");
  }
});

app.use("/api/flights", flightsRoute);
app.use("/api/hotels", hotelsRoute);
app.use("/api/restaurants", restaurantsRoute);
app.use("/api/tours", toursRoute);
app.use("/api/reviews", reviewsRoute);
app.use("/api/blogs", blogsRoute);
app.use("/api/bookings", bookingsRoute);
app.use("/api/admin", adminRoute);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
