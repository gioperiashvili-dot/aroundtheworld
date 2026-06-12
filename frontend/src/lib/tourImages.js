export const MAX_TOUR_IMAGES = 10;
export const RECOMMENDED_TOUR_IMAGES = 5;

export function normalizeTourImageSource(value) {
  const source = String(value || "").trim();
  return source || "";
}

export function normalizeTourImageSources(values = []) {
  const seen = new Set();

  return values
    .map(normalizeTourImageSource)
    .filter(Boolean)
    .filter((source) => {
      if (seen.has(source)) {
        return false;
      }

      seen.add(source);
      return true;
    });
}

export function getTourImageSources(tour) {
  const galleryImages = Array.isArray(tour?.images) ? tour.images : [];

  return normalizeTourImageSources([
    ...galleryImages,
    tour?.image,
    tour?.imageUrl,
    tour?.coverImage,
  ]);
}

export function getTourCoverImage(tour) {
  return getTourImageSources(tour)[0] || "";
}

const HOTEL_IMAGE_SOURCE_KEYS = [
  "images",
  "imageUrls",
  "imageURLs",
  "photos",
  "photoUrls",
  "photoURLs",
  "gallery",
  "galleryImages",
  "media",
  "image",
  "imageUrl",
  "imageURL",
  "photo",
  "photoUrl",
  "photoURL",
  "coverImage",
  "thumbnail",
  "thumbnailUrl",
];

const HOTEL_IMAGE_OBJECT_KEYS = [
  "url",
  "src",
  "path",
  "image",
  "imageUrl",
  "imageURL",
  "photo",
  "photoUrl",
  "photoURL",
  "coverImage",
  "thumbnail",
  "thumbnailUrl",
];

function collectHotelImageValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectHotelImageValues);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return HOTEL_IMAGE_OBJECT_KEYS.flatMap((key) =>
    collectHotelImageValues(value[key])
  );
}

export function getHotelImageSources(hotel) {
  if (!hotel || typeof hotel !== "object") {
    return [];
  }

  return normalizeTourImageSources(
    HOTEL_IMAGE_SOURCE_KEYS.flatMap((key) => collectHotelImageValues(hotel[key]))
  );
}
