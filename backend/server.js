const express = require("express");
const cors = require("cors");
const flightsRoute = require("./routes/flights");
const hotelsRoute = require("./routes/hotels");
const restaurantsRoute = require("./routes/restaurants");
const toursRoute = require("./routes/tours");
const adminRoute = require("./routes/admin");
const { PORT } = require("./config/env");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // allow non-browser/server-to-server requests with no origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("[CORS] Blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/flights", flightsRoute);
app.use("/api/hotels", hotelsRoute);
app.use("/api/restaurants", restaurantsRoute);
app.use("/api/tours", toursRoute);
app.use("/api/admin", adminRoute);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
