const express = require("express");
const router = express.Router();
const { createAdminSession, requireAdmin } = require("../services/adminAuth");
const {
  createTour,
  deleteTour,
  getTourById,
  getTours,
  updateTour,
} = require("../services/tours");

router.post("/session", async (req, res) => {
  const password = req.body?.password?.trim();

  if (!password) {
    return res.status(400).json({
      error: "Password required",
      details: "Enter the admin password to continue.",
    });
  }

  try {
    const session = createAdminSession(password);

    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Admin sign-in failed",
      details: error.details || "Please try again.",
    });
  }
});

router.delete("/session", (_req, res) => {
  res.status(204).send();
});

router.use(requireAdmin);

router.get("/tours", async (_req, res) => {
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

router.post("/tours", async (req, res) => {
  try {
    const tour = await createTour(req.body || {});

    return res.status(201).json({
      tour,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to create tour",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.put("/tours/:id", async (req, res) => {
  try {
    const existingTour = await getTourById(req.params.id);

    if (!existingTour) {
      return res.status(404).json({
        error: "Tour not found",
        details: "We could not find a tour with that id.",
      });
    }

    const tour = await updateTour(req.params.id, req.body || {});

    return res.json({
      tour,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to update tour",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.delete("/tours/:id", async (req, res) => {
  try {
    const deletedTour = await deleteTour(req.params.id);

    return res.json({
      tour: deletedTour,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to delete tour",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
