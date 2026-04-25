const express = require("express");
const router = express.Router();
const { getTourById, getTours } = require("../services/tours");

router.get("/", async (_req, res) => {
  try {
    const tours = await getTours();

    return res.json({
      tours,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to load tours",
      details: error.details || "Please try again in a moment.",
      tours: [],
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tour = await getTourById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        error: "Tour not found",
        details: "We could not find a tour with that id.",
      });
    }

    return res.json({
      tour,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to load tour",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
