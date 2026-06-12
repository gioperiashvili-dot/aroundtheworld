const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const TOUR_UPLOAD_PUBLIC_PATH = "/uploads/tours";
const BLOG_UPLOAD_PUBLIC_PATH = "/uploads/blogs";
const TOUR_HOTEL_UPLOAD_PUBLIC_PATH = "/uploads/tours/hotels";
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_HOTEL_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function createUploadError(statusCode, code, error, details) {
  const uploadError = new Error(error);
  uploadError.statusCode = statusCode;
  uploadError.code = code;
  uploadError.details = details;
  return uploadError;
}

function getUploadsRoot() {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  return path.resolve(__dirname, "../uploads");
}

function getTourUploadsDir() {
  return path.join(getUploadsRoot(), "tours");
}

function getBlogUploadsDir() {
  return path.join(getUploadsRoot(), "blogs");
}

function toSafePathSegment(value, fallback = "item") {
  const segment = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return segment || fallback;
}

function getTourHotelUploadsDir(tourId, hotelId) {
  return path.join(
    getUploadsRoot(),
    "tours",
    "hotels",
    toSafePathSegment(tourId, "tour"),
    toSafePathSegment(hotelId, "hotel")
  );
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

function getImageExtensionFromFile(file) {
  const originalExtension = path.extname(String(file?.originalname || "")).toLowerCase();

  if (
    ALLOWED_IMAGE_EXTENSIONS.has(originalExtension) &&
    ((file?.mimetype === "image/jpeg" &&
      [".jpg", ".jpeg"].includes(originalExtension)) ||
      (file?.mimetype === "image/png" && originalExtension === ".png") ||
      (file?.mimetype === "image/webp" && originalExtension === ".webp"))
  ) {
    return originalExtension;
  }

  if (file?.mimetype === "image/jpeg") {
    return ".jpg";
  }

  if (file?.mimetype === "image/png") {
    return ".png";
  }

  if (file?.mimetype === "image/webp") {
    return ".webp";
  }

  return "";
}

function createTourHotelImageFilename(file) {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const extension = getImageExtensionFromFile(file);
  return `hotel-${timestamp}-${randomSuffix}${extension}`;
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

async function assertValidHotelImageFile(file) {
  assertAllowedImageFile(file);

  const extension = getImageExtensionFromFile(file);

  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw createUploadError(
      400,
      "INVALID_FILE_TYPE",
      "Invalid file type",
      "Only JPG, JPEG, PNG, and WebP hotel images are allowed."
    );
  }

  try {
    const metadata = await sharp(file.buffer, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    }).metadata();
    const detectedMimeType = getMimeTypeFromSharpFormat(metadata.format);

    if (
      !ALLOWED_IMAGE_MIME_TYPES.has(detectedMimeType) ||
      detectedMimeType !== file.mimetype
    ) {
      throw createUploadError(
        400,
        "INVALID_FILE_TYPE",
        "Invalid file type",
        "Only JPG, JPEG, PNG, and WebP hotel images are allowed."
      );
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createUploadError(
      422,
      "IMAGE_VALIDATION_FAILED",
      "Image validation failed",
      "The hotel image could not be verified. Try another JPG, JPEG, PNG, or WebP file."
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

async function saveTourHotelImage(file, tourId, hotelId) {
  await assertValidHotelImageFile(file);

  const safeTourId = toSafePathSegment(tourId, "tour");
  const safeHotelId = toSafePathSegment(hotelId, "hotel");
  const uploadDir = getTourHotelUploadsDir(safeTourId, safeHotelId);
  const filename = createTourHotelImageFilename(file);
  const outputPath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(outputPath, file.buffer, { flag: "wx" });

  return {
    imageUrl: `${TOUR_HOTEL_UPLOAD_PUBLIC_PATH}/${safeTourId}/${safeHotelId}/${filename}`,
    filename,
  };
}

function getTourHotelImageFileTarget(tourId, hotelId, imagePath) {
  const source = String(imagePath || "").trim();

  if (!source) {
    throw createUploadError(
      400,
      "HOTEL_IMAGE_PATH_REQUIRED",
      "Hotel image path is required",
      "Choose a hotel image before deleting."
    );
  }

  let pathname = source;

  try {
    if (/^https?:\/\//i.test(source)) {
      pathname = new URL(source).pathname;
    }
  } catch (_error) {
    pathname = source;
  }

  const relativePath = pathname
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const safeTourId = toSafePathSegment(tourId, "tour");
  const safeHotelId = toSafePathSegment(hotelId, "hotel");
  const expectedPrefix = `uploads/tours/hotels/${safeTourId}/${safeHotelId}/`;

  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\0") ||
    relativePath.includes("..") ||
    !relativePath.startsWith(expectedPrefix)
  ) {
    throw createUploadError(
      400,
      "HOTEL_IMAGE_PATH_INVALID",
      "Invalid hotel image path",
      "Hotel image paths must belong to the selected tour and hotel."
    );
  }

  const filename = path.posix.basename(relativePath);

  if (!filename || !ALLOWED_IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
    throw createUploadError(
      400,
      "HOTEL_IMAGE_PATH_INVALID",
      "Invalid hotel image path",
      "Hotel image paths must use JPG, JPEG, PNG, or WebP files."
    );
  }

  const uploadsRoot = path.resolve(getUploadsRoot());
  const expectedDir = path.resolve(
    getUploadsRoot(),
    "tours",
    "hotels",
    safeTourId,
    safeHotelId
  );
  const absolutePath = path.resolve(uploadsRoot, relativePath.replace(/^uploads\//, ""));

  if (
    absolutePath !== expectedDir &&
    !absolutePath.startsWith(`${expectedDir}${path.sep}`)
  ) {
    throw createUploadError(
      400,
      "HOTEL_IMAGE_PATH_INVALID",
      "Invalid hotel image path",
      "Hotel image paths must stay inside the selected hotel upload folder."
    );
  }

  return {
    absolutePath,
    publicPath: `/${relativePath}`,
  };
}

async function deleteTourHotelImageFile(tourId, hotelId, imagePath) {
  const target = getTourHotelImageFileTarget(tourId, hotelId, imagePath);

  try {
    await fs.unlink(target.absolutePath);
    return {
      ...target,
      deleted: true,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        ...target,
        deleted: false,
      };
    }

    throw createUploadError(
      503,
      "HOTEL_IMAGE_DELETE_FAILED",
      "Hotel image delete failed",
      "The hotel image could not be deleted from the uploads directory."
    );
  }
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_HOTEL_IMAGE_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  deleteTourHotelImageFile,
  getBlogUploadsDir,
  getTourUploadsDir,
  getTourHotelImageFileTarget,
  getUploadsRoot,
  optimizeBlogImage,
  optimizeTourImage,
  saveTourHotelImage,
};
