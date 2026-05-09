const express = require("express");
const multer = require("multer");
const router = express.Router();
const { createAdminSession, requireAdmin } = require("../services/adminAuth");
const {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizeBlogImage,
  optimizeTourImage,
} = require("../services/uploads");
const {
  MAX_BLOG_PAYLOAD_BYTES,
  createBlog,
  deleteBlog,
  getBlogById,
  getBlogs: getAdminBlogs,
  updateBlog,
} = require("../services/blogs");
const {
  convertBookingRequestToBooking,
  getBookingRequests,
  updateBookingRequest,
} = require("../services/bookingRequests");
const {
  MAX_BOOKING_FILE_BYTES,
  deleteBookingFile,
  getBookingFileForDownload,
  getBookings,
  updateBooking,
  uploadBookingFile,
} = require("../services/bookings");
const {
  createTour,
  deleteTour,
  getTourById,
  getTours,
  updateTour,
} = require("../services/tours");
const {
  approveReview,
  deleteReview,
  getReviews,
} = require("../services/reviews");

function getBodySize(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body || {}), "utf8");
  } catch (_error) {
    return MAX_BLOG_PAYLOAD_BYTES + 1;
  }
}

function rejectLargeBlogPayload(req, res) {
  if (getBodySize(req.body) <= MAX_BLOG_PAYLOAD_BYTES) {
    return false;
  }

  res.status(413).json({
    code: "PAYLOAD_TOO_LARGE",
    error: "Blog payload is too large",
    details: "Blog post data must be 256KB or smaller.",
  });
  return true;
}

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

const bookingPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BOOKING_FILE_BYTES,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    const hasPdfExtension = /\.pdf$/i.test(String(file.originalname || ""));

    if (file.mimetype !== "application/pdf" || !hasPdfExtension) {
      return callback(
        Object.assign(new Error("Invalid file type"), {
          statusCode: 400,
          code: "BOOKING_FILE_INVALID_TYPE",
          details: "Only PDF booking documents can be uploaded.",
        })
      );
    }

    return callback(null, true);
  },
});

function sendBookingPdfUploadError(uploadError, res) {
  const isTooLarge =
    uploadError instanceof multer.MulterError &&
    uploadError.code === "LIMIT_FILE_SIZE";
  const statusCode = isTooLarge ? 413 : uploadError.statusCode || 400;

  return res.status(statusCode).json({
    ok: false,
    code: isTooLarge
      ? "BOOKING_FILE_TOO_LARGE"
      : uploadError.code || "BOOKING_FILE_UPLOAD_FAILED",
    error: isTooLarge ? "File too large" : uploadError.message || "Upload failed",
    details: isTooLarge
      ? "The selected PDF must be 10MB or smaller."
      : uploadError.details || "Choose a valid PDF file.",
  });
}

function sendBookingPdfFile(res, fileResult) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", fileResult.contentDisposition);
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.sendFile(fileResult.absolutePath);
}

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

router.post("/uploads/blogs", (req, res) => {
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
      const optimizedImage = await optimizeBlogImage(req.file);

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

router.get("/blogs", async (_req, res) => {
  try {
    const blogs = await getAdminBlogs();

    return res.json({
      blogs,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOGS_LOAD_FAILED",
      error: error.message || "Unable to load blog posts",
      details: error.details || "Please try again in a moment.",
      blogs: [],
    });
  }
});

router.get("/reviews", async (_req, res) => {
  try {
    const reviews = await getReviews();

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

router.get("/booking-requests", async (_req, res) => {
  try {
    const bookingRequests = await getBookingRequests();

    return res.json({
      bookingRequests,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_REQUESTS_LOAD_FAILED",
      error: error.message || "Unable to load booking requests",
      details: error.details || "Please try again in a moment.",
      bookingRequests: [],
    });
  }
});

router.patch("/booking-requests/:id", async (req, res) => {
  try {
    const bookingRequest = await updateBookingRequest(
      req.params.id,
      req.body || {}
    );

    return res.json({
      bookingRequest,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_REQUEST_UPDATE_FAILED",
      error: error.message || "Unable to update booking request",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.post("/booking-requests/:requestId/convert", async (req, res) => {
  try {
    const result = await convertBookingRequestToBooking(
      req.params.requestId,
      req.body || {}
    );

    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_REQUEST_CONVERT_FAILED",
      error: error.message || "Unable to convert booking request",
      details: error.details || "Please try again in a moment.",
      convertedBookingId: error.convertedBookingId,
    });
  }
});

router.get("/bookings", async (_req, res) => {
  try {
    const bookings = await getBookings();

    return res.json({
      bookings,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKINGS_LOAD_FAILED",
      error: error.message || "Unable to load bookings",
      details: error.details || "Please try again in a moment.",
      bookings: [],
    });
  }
});

router.post("/bookings/:bookingId/files", (req, res) => {
  bookingPdfUpload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      return sendBookingPdfUploadError(uploadError, res);
    }

    try {
      const result = await uploadBookingFile(req.params.bookingId, req.file, {
        name: req.body?.name,
        uploadedBy: req.adminSession?.role || "admin",
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        code: error.code || "BOOKING_FILE_UPLOAD_FAILED",
        error: error.message || "Unable to upload booking PDF",
        details: error.details || "Please try again in a moment.",
      });
    }
  });
});

router.patch("/bookings/:bookingId", async (req, res) => {
  try {
    const booking = await updateBooking(req.params.bookingId, req.body || {});

    return res.json({
      booking,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_UPDATE_FAILED",
      error: error.message || "Unable to update booking",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.get("/bookings/:bookingId/files/:fileId", async (req, res) => {
  try {
    const fileResult = await getBookingFileForDownload(
      req.params.bookingId,
      req.params.fileId
    );

    return sendBookingPdfFile(res, fileResult);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_FILE_DOWNLOAD_FAILED",
      error: error.message || "Unable to download booking PDF",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.delete("/bookings/:bookingId/files/:fileId", async (req, res) => {
  try {
    const result = await deleteBookingFile(
      req.params.bookingId,
      req.params.fileId
    );

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_FILE_DELETE_FAILED",
      error: error.message || "Unable to delete booking PDF",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.patch("/reviews/:id/approve", async (req, res) => {
  try {
    const review = await approveReview(req.params.id);

    return res.json({
      review,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "REVIEW_APPROVE_FAILED",
      error: error.message || "Unable to approve review",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await deleteReview(req.params.id);

    return res.json({
      review,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "REVIEW_DELETE_FAILED",
      error: error.message || "Unable to delete review",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.post("/blogs", async (req, res) => {
  if (rejectLargeBlogPayload(req, res)) {
    return;
  }

  try {
    const blog = await createBlog(req.body || {});

    return res.status(201).json({
      blog,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOG_CREATE_FAILED",
      error: error.message || "Unable to create blog post",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.put("/blogs/:id", async (req, res) => {
  if (rejectLargeBlogPayload(req, res)) {
    return;
  }

  try {
    const existingBlog = await getBlogById(req.params.id);

    if (!existingBlog) {
      return res.status(404).json({
        code: "BLOG_NOT_FOUND",
        error: "Blog post not found",
        details: "We could not find a blog post with that id.",
      });
    }

    const blog = await updateBlog(req.params.id, req.body || {});

    return res.json({
      blog,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOG_UPDATE_FAILED",
      error: error.message || "Unable to update blog post",
      details: error.details || "Please try again in a moment.",
    });
  }
});

router.delete("/blogs/:id", async (req, res) => {
  try {
    const blog = await deleteBlog(req.params.id);

    return res.json({
      blog,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BLOG_DELETE_FAILED",
      error: error.message || "Unable to delete blog post",
      details: error.details || "Please try again in a moment.",
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
