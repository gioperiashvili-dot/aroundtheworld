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
