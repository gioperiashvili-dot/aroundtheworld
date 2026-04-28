const express = require("express");
const multer = require("multer");
const router = express.Router();
const { createAdminSession, requireAdmin } = require("../services/adminAuth");
const {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizeTourImage,
} = require("../services/uploads");
const {
  createTour,
  deleteTour,
  getTourById,
  getTours,
  updateTour,
} = require("../services/tours");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return callback(
        Object.assign(new Error("Invalid file type"), {
          statusCode: 400,
          code: "INVALID_FILE_TYPE",
          details: "Only JPEG, PNG, and WebP image uploads are allowed.",
        })
      );
    }

    return callback(null, true);
  },
});

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

router.post("/uploads/tours", (req, res) => {
  upload.single("image")(req, res, async (uploadError) => {
    if (uploadError) {
      const isTooLarge =
        uploadError instanceof multer.MulterError &&
        uploadError.code === "LIMIT_FILE_SIZE";
      const statusCode = isTooLarge ? 413 : uploadError.statusCode || 400;

      return res.status(statusCode).json({
        ok: false,
        code: isTooLarge ? "FILE_TOO_LARGE" : uploadError.code || "UPLOAD_FAILED",
        error: isTooLarge ? "File too large" : uploadError.message || "Upload failed",
        details: isTooLarge
          ? "The selected image must be 5MB or smaller."
          : uploadError.details || "Choose a valid JPEG, PNG, or WebP image.",
      });
    }

    try {
      const optimizedImage = await optimizeTourImage(req.file);

      return res.status(201).json({
        ok: true,
        imageUrl: optimizedImage.imageUrl,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        code: error.code || "UPLOAD_FAILED",
        error: error.message || "Upload failed",
        details: error.details || "Please try another image.",
      });
    }
  });
});

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
