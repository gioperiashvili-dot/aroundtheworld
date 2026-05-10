const GEORGIAN_TO_LATIN = {
  "\u10D0": "a",
  "\u10D1": "b",
  "\u10D2": "g",
  "\u10D3": "d",
  "\u10D4": "e",
  "\u10D5": "v",
  "\u10D6": "z",
  "\u10D7": "t",
  "\u10D8": "i",
  "\u10D9": "k",
  "\u10DA": "l",
  "\u10DB": "m",
  "\u10DC": "n",
  "\u10DD": "o",
  "\u10DE": "p",
  "\u10DF": "zh",
  "\u10E0": "r",
  "\u10E1": "s",
  "\u10E2": "t",
  "\u10E3": "u",
  "\u10E4": "p",
  "\u10E5": "k",
  "\u10E6": "gh",
  "\u10E7": "q",
  "\u10E8": "sh",
  "\u10E9": "ch",
  "\u10EA": "ts",
  "\u10EB": "dz",
  "\u10EC": "ts",
  "\u10ED": "ch",
  "\u10EE": "kh",
  "\u10EF": "j",
  "\u10F0": "h",
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function transliterateGeorgian(value) {
  return Array.from(String(value || ""))
    .map((character) => GEORGIAN_TO_LATIN[character] || character)
    .join("")
    .replace(/antalia/gi, "antalya");
}

export function createTourSlug(value, fallback = "tour") {
  const slug = transliterateGeorgian(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function normalizeTourSlug(value) {
  return createTourSlug(value, "");
}

export function isValidTourSlug(value) {
  const slug = String(value || "").trim();
  return SLUG_PATTERN.test(slug) && slug === normalizeTourSlug(slug);
}

export function getTourUrlSegment(tour) {
  return String(tour?.slug || tour?.id || "").trim();
}

export function getTourPublicPath(tour) {
  const segment = getTourUrlSegment(tour);
  return segment ? `/tours/${encodeURIComponent(segment)}` : "/tours";
}
