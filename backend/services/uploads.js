const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const TOUR_UPLOAD_PUBLIC_PATH = "/uploads/tours";
const BLOG_UPLOAD_PUBLIC_PATH = "/uploads/blogs";
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function createUploadError(statusCode, code, error, details) {
  const uploadError = new Error(error);
  uploadError.statusCode = statusCode;
  uploadError.code = code;
  uploadError.details = details;
  return uploadError;
}

function getUploadsRoot() {
  if (process.env.UPLOADS_ROOT || process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_ROOT || process.env.UPLOADS_DIR);
  }

  if (process.env.NODE_ENV === "production") {
    return "/var/www/aroundtheworld/uploads";
  }

  return path.resolve(__dirname, "../../uploads");
}

function getTourUploadsDir() {
  return path.join(getUploadsRoot(), "tours");
}

function getBlogUploadsDir() {
  return path.join(getUploadsRoot(), "blogs");
}

function assertAllowedImageFile(file) {
  if (!file) {
    throw createUploadError(
      400,
      "IMAGE_REQUIRED",
      "Image file required",
      "Choose a JPEG, PNG, or WebP image to upload."
    );
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw createUploadError(
      400,
      "INVALID_FILE_TYPE",
      "Invalid file type",
      "Only JPEG, PNG, and WebP image uploads are allowed."
    );
  }
}

function createTourImageFilename() {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  return `tour-${timestamp}-${randomSuffix}.webp`;
}

function createBlogImageFilename() {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  return `blog-${timestamp}-${randomSuffix}.webp`;
}

function getMimeTypeFromSharpFormat(format) {
  if (format === "jpeg" || format === "jpg") {
    return "image/jpeg";
  }

  if (format === "png") {
    return "image/png";
  }

  if (format === "webp") {
    return "image/webp";
  }

  return "";
}

async function optimizeImageFile(file, uploadDir, filename) {
  assertAllowedImageFile(file);

  const outputPath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });

  try {
    const inputImage = sharp(file.buffer, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    });
    const metadata = await inputImage.metadata();
    const detectedMimeType = getMimeTypeFromSharpFormat(metadata.format);

    if (!ALLOWED_IMAGE_MIME_TYPES.has(detectedMimeType)) {
      throw createUploadError(
        400,
        "INVALID_FILE_TYPE",
        "Invalid file type",
        "Only JPEG, PNG, and WebP image uploads are allowed."
      );
    }

    await sharp(file.buffer, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: 1200,
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
      })
      .toFile(outputPath);
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createUploadError(
      422,
      "IMAGE_OPTIMIZATION_FAILED",
      "Image optimization failed",
      "The image could not be processed. Try another JPEG, PNG, or WebP file."
    );
  }
}

async function optimizeTourImage(file) {
  const filename = createTourImageFilename();

  await optimizeImageFile(file, getTourUploadsDir(), filename);

  return {
    imageUrl: `${TOUR_UPLOAD_PUBLIC_PATH}/${filename}`,
    filename,
  };
}

async function optimizeBlogImage(file) {
  const filename = createBlogImageFilename();

  await optimizeImageFile(file, getBlogUploadsDir(), filename);

  return {
    imageUrl: `${BLOG_UPLOAD_PUBLIC_PATH}/${filename}`,
    filename,
  };
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  getUploadsRoot,
  optimizeBlogImage,
  optimizeTourImage,
};
