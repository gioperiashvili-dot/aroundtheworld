import giorgiAvatar from "../assets/dpp/G-96.jpg";
import gochaAvatar from "../assets/dpp/GO-96.jpg";
import vitoAvatar from "../assets/dpp/V-96.jpg";
import zuraAvatar from "../assets/dpp/Z-96.jpg";

const REVIEW_AVATARS_BY_FILENAME = {
  "Z-96.jpg": zuraAvatar,
  "G-96.jpg": giorgiAvatar,
  "V-96.jpg": vitoAvatar,
  "GO-96.jpg": gochaAvatar,
};

const REVIEW_AVATARS_BY_NAME = {
  "zura karsanauli": zuraAvatar,
  "giorgi konwliashvili": giorgiAvatar,
  "vito kosiashvili": vitoAvatar,
  "gocha beriashvili": gochaAvatar,
  "gocha periashvili": gochaAvatar,
};

function normalizeLookupKey(value) {
  return String(value || "").trim();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function isUploadsPath(value) {
  return value.startsWith("/uploads/") || value.startsWith("uploads/");
}

export function resolveReviewPhoto(photoURL) {
  const source = normalizeLookupKey(photoURL);
  const localAvatar = REVIEW_AVATARS_BY_FILENAME[source];

  if (localAvatar) {
    return localAvatar;
  }

  if (isHttpUrl(source) || isUploadsPath(source)) {
    return source;
  }

  return "";
}

export function getLocalReviewAvatar(name) {
  const nameAvatar =
    REVIEW_AVATARS_BY_NAME[normalizeLookupKey(name).toLowerCase()];

  if (nameAvatar) {
    return nameAvatar;
  }

  return "";
}

export function getReviewAvatarSrc(review) {
  return (
    resolveReviewPhoto(review?.photoURL) ||
    getLocalReviewAvatar(review?.name) ||
    ""
  );
}
