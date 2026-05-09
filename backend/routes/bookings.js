const express = require("express");
const router = express.Router();
const { verifyFirebaseUserIdToken } = require("../services/firebaseAdmin");
const { getBookingFileForDownload } = require("../services/bookings");

function getBearerTokenFromRequest(req) {
  const authorizationHeader = req.headers.authorization || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

function sendPdfFile(res, fileResult) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", fileResult.contentDisposition);
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.sendFile(fileResult.absolutePath);
}

router.get("/:bookingId/files/:fileId", async (req, res) => {
  try {
    const decodedToken = await verifyFirebaseUserIdToken(
      getBearerTokenFromRequest(req)
    );
    const fileResult = await getBookingFileForDownload(
      req.params.bookingId,
      req.params.fileId,
      {
        uid: decodedToken.uid,
      }
    );

    return sendPdfFile(res, fileResult);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "BOOKING_FILE_DOWNLOAD_FAILED",
      error: error.message || "Unable to download booking PDF",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
