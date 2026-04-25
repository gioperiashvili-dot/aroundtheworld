const express = require("express");
const cors = require("cors");
const flightsRoute = require("./routes/flights");
const hotelsRoute = require("./routes/hotels");
const restaurantsRoute = require("./routes/restaurants");
const toursRoute = require("./routes/tours");
const adminRoute = require("./routes/admin");
const { PORT, CLIENT_ORIGIN } = require("./config/env");

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

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
