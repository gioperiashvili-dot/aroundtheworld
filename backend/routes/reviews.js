const express = require("express");
const router = express.Router();
const { requireFirebaseUser } = require("../services/firebaseAuth");
const { createReview, getApprovedReviews } = require("../services/reviews");

router.get("/", async (req, res) => {
  try {
    const reviews = await getApprovedReviews({
      relatedType: req.query.relatedType,
      tourId: req.query.tourId,
    });

    return res.json({
      reviews,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "REVIEWS_LOAD_FAILED",
      error: error.message || "Unable to load reviews",
      details: error.details || "Please try again in a moment.",
      reviews: [],
    });
  }
});

router.post("/", requireFirebaseUser, async (req, res) => {
  try {
    const review = await createReview(req.body || {}, req.firebaseUser);

    return res.status(201).json({
      review,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "REVIEW_CREATE_FAILED",
      error: error.message || "Unable to submit review",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
