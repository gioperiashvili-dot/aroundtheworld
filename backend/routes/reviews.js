const express = require("express");
const router = express.Router();
const { requireFirebaseUser } = require("../services/firebaseAuth");
const { createReview, getPublicReviews } = require("../services/reviews");

router.get("/", async (req, res) => {
  try {
    const result = await getPublicReviews(
      {
        relatedType: req.query.relatedType,
        tourId: req.query.tourId,
      },
      {
        limit: req.query.limit,
      }
    );

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "REVIEWS_LOAD_FAILED",
      error: error.message || "Unable to load reviews",
      details: error.details || "Please try again in a moment.",
      reviews: [],
      total: 0,
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
