import { useCallback, useEffect, useMemo, useState } from "react";
import AdminBookingsPanel from "../components/AdminBookingsPanel";
import AdminBookingRequestsPanel from "../components/AdminBookingRequestsPanel";
import AdminBlogManager from "../components/AdminBlogManager";
import AdminReviewsPanel from "../components/AdminReviewsPanel";
import AdminTourForm from "../components/AdminTourForm";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SEO from "../components/SEO";
import TravelImage from "../components/TravelImage";
import logoMain from "../assets/AroundTheWorld_Logo_BGREMOVE_NAV_128.png";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import {
  approveAdminReview,
  convertAdminBookingRequest,
  createAdminSession,
  createAdminTour,
  deleteAdminBookingFile,
  deleteAdminReview,
  deleteAdminTour,
  deleteTourHotelImage,
  downloadAdminBookingFile,
  fetchAdminBookings,
  fetchAdminBookingRequests,
  fetchAdminReviews,
  fetchAdminTours,
  uploadAdminBookingFile,
  uploadAdminTourImages,
  uploadTourHotelImages,
  updateAdminBooking,
  updateAdminBookingRequest,
  updateAdminTour,
} from "../lib/api";
import {
  formatCurrencyValue,
  formatDateTimeLabel,
  getFriendlyApiError,
  parseDatesInput,
} from "../lib/formatters";
import {
  MAX_TOUR_IMAGES,
  getTourCoverImage,
  getTourImageSources,
  normalizeTourImageSources,
} from "../lib/tourImages";
import {
  createTourSlug,
  isValidTourSlug,
  normalizeTourSlug,
} from "../lib/tourSlugs";

const TOKEN_STORAGE_KEY = "around-the-world-admin-token";
const EXPIRY_STORAGE_KEY = "around-the-world-admin-expiry";
const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const HOTEL_IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const MAX_TOUR_HOTEL_IMAGES = 12;
const ALLOWED_IMAGE_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ADMIN_BOOKING_REQUEST_MESSAGES = {
  ka: {
    loadFailed: "ჯავშნის მოთხოვნების ჩატვირთვა ვერ მოხერხდა.",
    updateFailed: "ჯავშნის მოთხოვნის განახლება ვერ მოხერხდა.",
    updateSuccess: "ჯავშნის მოთხოვნა განახლდა.",
    convertFailed: "მოთხოვნის აქტიურ ჯავშნად გადაქცევა ვერ მოხერხდა.",
    convertSuccess: "აქტიური ჯავშანი შეიქმნა.",
    convertErrors: {
      BOOKING_REQUEST_ALREADY_CONVERTED:
        "ეს მოთხოვნა უკვე გადაყვანილია აქტიურ ჯავშანში.",
      BOOKING_REQUEST_UID_REQUIRED:
        "სტუმრის მოთხოვნის აქტიურ ჯავშნად გადაქცევა შეუძლებელია. მოთხოვნა რეგისტრირებულ მომხმარებელს უნდა ეკუთვნოდეს.",
      BOOKING_TITLE_REQUIRED: "სათაური აუცილებელია.",
      BOOKING_CATEGORY_REQUIRED: "კატეგორია აუცილებელია.",
      BOOKING_CURRENCY_REQUIRED: "ვალუტა აუცილებელია.",
      BOOKING_TOTAL_PRICE_INVALID: "სრული ფასი უნდა იყოს 0-ზე მეტი რიცხვი.",
      BOOKING_PAID_AMOUNT_INVALID:
        "გადახდილი თანხა უნდა იყოს 0-ზე მეტი რიცხვი.",
      BOOKING_PAID_AMOUNT_TOO_HIGH:
        "გადახდილი თანხა სრულ ფასს არ უნდა აღემატებოდეს.",
      BOOKING_MINIMUM_PAYMENT_REQUIRED:
        "აქტიური ჯავშნის შესაქმნელად გადახდილი უნდა იყოს სრული ფასის მინიმუმ 30%.",
    },
  },
  en: {
    loadFailed: "Something went wrong while loading booking requests.",
    updateFailed: "Something went wrong while updating the booking request.",
    updateSuccess: "Booking request updated.",
    convertFailed: "Something went wrong while converting the booking request.",
    convertSuccess: "Active booking created.",
    convertErrors: {
      BOOKING_REQUEST_ALREADY_CONVERTED:
        "This request is already converted to an active booking.",
      BOOKING_REQUEST_UID_REQUIRED:
        "Guest requests cannot be converted. The request must belong to a registered user.",
      BOOKING_TITLE_REQUIRED: "Title is required.",
      BOOKING_CATEGORY_REQUIRED: "Category is required.",
      BOOKING_CURRENCY_REQUIRED: "Currency is required.",
      BOOKING_TOTAL_PRICE_INVALID:
        "Total price must be a number greater than 0.",
      BOOKING_PAID_AMOUNT_INVALID:
        "Paid amount must be a number greater than 0.",
      BOOKING_PAID_AMOUNT_TOO_HIGH:
        "Paid amount cannot be greater than total price.",
      BOOKING_MINIMUM_PAYMENT_REQUIRED:
        "At least 30% of the total price must be paid before creating an active booking.",
    },
  },
};

const ADMIN_BOOKING_MESSAGES = {
  ka: {
    loadFailed: "აქტიური ჯავშნების ჩატვირთვა ვერ მოხერხდა.",
    updateFailed: "აქტიური ჯავშნის განახლება ვერ მოხერხდა.",
    updateSuccess: "ჯავშანი განახლდა.",
    fileUploadFailed: "PDF ფაილის ატვირთვა ვერ მოხერხდა.",
    fileUploadSuccess: "PDF ფაილი აიტვირთა.",
    fileDownloadFailed: "PDF ფაილის ჩამოტვირთვა ვერ მოხერხდა.",
    fileDeleteFailed: "PDF ფაილის წაშლა ვერ მოხერხდა.",
    fileDeleteSuccess: "PDF ფაილი წაიშალა.",
    updateErrors: {
      BOOKING_STATUS_INVALID:
        "აირჩიეთ სტატუსი: აქტიური, დასრულებული ან გაუქმებული.",
      BOOKING_TOTAL_PRICE_INVALID: "სრული ფასი უნდა იყოს 0-ზე მეტი რიცხვი.",
      BOOKING_PAID_AMOUNT_INVALID:
        "გადახდილი თანხა უნდა იყოს 0 ან მეტი რიცხვი.",
      BOOKING_PAID_AMOUNT_TOO_HIGH:
        "გადახდილი თანხა სრულ ფასს არ უნდა აღემატებოდეს.",
      BOOKING_CURRENCY_REQUIRED: "ვალუტა აუცილებელია.",
      BOOKING_NOT_FOUND: "ჯავშანი ვერ მოიძებნა.",
      BOOKING_FILE_REQUIRED: "აირჩიეთ PDF ფაილი.",
      BOOKING_FILE_INVALID_TYPE: "მხოლოდ PDF ფაილის ატვირთვაა შესაძლებელი.",
      BOOKING_FILE_TOO_LARGE: "ფაილი ძალიან დიდია.",
      BOOKING_FILE_NOT_FOUND: "PDF ფაილი ვერ მოიძებნა.",
      FIREBASE_ADMIN_NOT_CONFIGURED:
        "Firebase Storage არ არის კონფიგურირებული.",
    },
  },
  en: {
    loadFailed: "Something went wrong while loading bookings.",
    updateFailed: "Something went wrong while updating the booking.",
    updateSuccess: "Booking updated.",
    fileUploadFailed: "Something went wrong while uploading the PDF.",
    fileUploadSuccess: "PDF uploaded.",
    fileDownloadFailed: "Something went wrong while downloading the PDF.",
    fileDeleteFailed: "Something went wrong while deleting the PDF.",
    fileDeleteSuccess: "PDF deleted.",
    updateErrors: {
      BOOKING_STATUS_INVALID: "Choose active, completed, or cancelled.",
      BOOKING_TOTAL_PRICE_INVALID:
        "Total price must be a number greater than 0.",
      BOOKING_PAID_AMOUNT_INVALID:
        "Paid amount must be a number that is 0 or greater.",
      BOOKING_PAID_AMOUNT_TOO_HIGH:
        "Paid amount cannot be greater than total price.",
      BOOKING_CURRENCY_REQUIRED: "Currency is required.",
      BOOKING_NOT_FOUND: "Booking not found.",
      BOOKING_FILE_REQUIRED: "Choose a PDF file.",
      BOOKING_FILE_INVALID_TYPE: "Only PDF files can be uploaded.",
      BOOKING_FILE_TOO_LARGE: "The selected PDF is too large.",
      BOOKING_FILE_NOT_FOUND: "PDF file not found.",
      FIREBASE_ADMIN_NOT_CONFIGURED: "Firebase Storage is not configured.",
    },
  },
};

function createEmptyLocalizedItem() {
  return {
    ka: "",
    en: "",
  };
}

function createEmptyHotelFormRow(id = "hotel-1") {
  return {
    id,
    name: "",
    location: "",
    mealPlan: "",
    stars: "",
    rating: "",
    reviewCount: "",
    link: "",
    images: [],
  };
}

function createEmptyForm() {
  return {
    titleKa: "",
    titleEn: "",
    destinationKa: "",
    destinationEn: "",
    descriptionKa: "",
    descriptionEn: "",
    price: "",
    currency: "GEL",
    durationKa: "",
    durationEn: "",
    dates: "",
    category: "",
    slug: "",
    image: "",
    images: [],
    included: [createEmptyLocalizedItem()],
    notIncluded: [createEmptyLocalizedItem()],
    hotels: [],
  };
}

function replaceToken(message, replacements) {
  return Object.entries(replacements).reduce(
    (value, [key, replacement]) => value.replace(`{${key}}`, replacement),
    message
  );
}

function saveBlobAsFile(blob, filename) {
  if (typeof window === "undefined") {
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function getBookingFileDownloadName(file) {
  const name = file?.originalName || file?.name || "booking-document.pdf";
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

function toFormValues(tour) {
  const galleryImages = getTourImageSources(tour);
  const coverImage = galleryImages[0] || tour?.image || "";

  return {
    titleKa: tour?.title?.ka || "",
    titleEn: tour?.title?.en || "",
    destinationKa: tour?.destination?.ka || "",
    destinationEn: tour?.destination?.en || "",
    descriptionKa: tour?.description?.ka || "",
    descriptionEn: tour?.description?.en || "",
    price: tour?.price ?? "",
    currency: tour?.currency || "GEL",
    durationKa: tour?.duration?.ka || "",
    durationEn: tour?.duration?.en || "",
    dates: Array.isArray(tour?.dates) ? tour.dates.join(", ") : "",
    category: tour?.category || "",
    slug: tour?.slug || "",
    image: coverImage,
    images: galleryImages.filter((image) => image !== coverImage),
    included: toLocalizedItemRows(tour?.included),
    notIncluded: toLocalizedItemRows(tour?.notIncluded),
    hotels: toHotelFormRows(tour?.hotels),
  };
}

function getFormGalleryImages(form) {
  return normalizeTourImageSources([
    form?.image,
    ...(Array.isArray(form?.images) ? form.images : []),
  ]);
}

function toGalleryFormValues(images = []) {
  const galleryImages = normalizeTourImageSources(images);

  return {
    image: galleryImages[0] || "",
    images: galleryImages.slice(1),
  };
}

function getAdminHotelTextValue(value, language = "ka") {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return (
    String(value[language] || "").trim() ||
    String(value.ka || "").trim() ||
    String(value.en || "").trim()
  );
}

function toHotelFormRows(hotels = []) {
  if (!Array.isArray(hotels)) {
    return [];
  }

  return hotels
    .map((hotel, index) => ({
      id: String(hotel?.id || `hotel-${index + 1}`).trim() || `hotel-${index + 1}`,
      name: getAdminHotelTextValue(hotel?.name),
      location: getAdminHotelTextValue(hotel?.location),
      mealPlan: getAdminHotelTextValue(hotel?.mealPlan),
      stars: hotel?.stars ? String(hotel.stars) : "",
      rating: hotel?.rating !== undefined && hotel?.rating !== null ? String(hotel.rating) : "",
      reviewCount:
        hotel?.reviewCount !== undefined && hotel?.reviewCount !== null
          ? String(hotel.reviewCount)
          : "",
      link: String(hotel?.link || "").trim(),
      images: normalizeTourImageSources(Array.isArray(hotel?.images) ? hotel.images : []),
    }))
    .filter((hotel) =>
      hotel.name ||
      hotel.location ||
      hotel.mealPlan ||
      hotel.stars ||
      hotel.rating ||
      hotel.reviewCount ||
      hotel.link ||
      hotel.images.length > 0
    );
}

function createNextHotelId(hotels = []) {
  const usedIds = new Set(hotels.map((hotel) => String(hotel?.id || "").trim()));
  let index = hotels.length + 1;
  let nextId = `hotel-${index}`;

  while (usedIds.has(nextId)) {
    index += 1;
    nextId = `hotel-${index}`;
  }

  return nextId;
}

function buildHotelsPayload(hotels = []) {
  return hotels
    .map((hotel) => {
      const stars = Number(hotel.stars);
      const rating = Number.parseFloat(String(hotel.rating || "").replace(",", "."));
      const reviewCount = Number.parseInt(hotel.reviewCount, 10);
      const normalizedHotel = {
        id: String(hotel.id || "").trim(),
        name: String(hotel.name || "").trim(),
        location: String(hotel.location || "").trim(),
        mealPlan: String(hotel.mealPlan || "").trim(),
        stars: Number.isFinite(stars) && stars >= 1 && stars <= 5 ? Math.round(stars) : "",
        rating:
          Number.isFinite(rating) && rating >= 0 && rating <= 10
            ? Math.round(rating * 10) / 10
            : "",
        reviewCount:
          Number.isInteger(reviewCount) && reviewCount >= 0 ? reviewCount : "",
        link: String(hotel.link || "").trim(),
        images: normalizeTourImageSources(
          Array.isArray(hotel.images) ? hotel.images : []
        ).slice(0, MAX_TOUR_HOTEL_IMAGES),
      };

      return normalizedHotel;
    })
    .filter((hotel) =>
      hotel.name ||
      hotel.location ||
      hotel.mealPlan ||
      hotel.stars ||
      hotel.rating ||
      hotel.reviewCount ||
      hotel.link ||
      hotel.images.length > 0
    );
}

function getPersistedHotelIds(tours = [], editingId = "") {
  const tour = tours.find((item) => item.id === editingId);

  if (!tour || !Array.isArray(tour.hotels)) {
    return [];
  }

  return tour.hotels
    .map((hotel) => String(hotel?.id || "").trim())
    .filter(Boolean);
}

function getTourImageLimitMessage(language) {
  const georgianMessage = `\u10E2\u10E3\u10E0\u10D6\u10D4 \u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB ${MAX_TOUR_IMAGES} \u10E4\u10DD\u10E2\u10DD\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10D8\u10EB\u10DA\u10D4\u10D1\u10D0. \u10EC\u10D0\u10E8\u10D0\u10DA\u10D4\u10D7 \u10E0\u10DD\u10DB\u10D4\u10DA\u10D8\u10DB\u10D4 \u10E4\u10DD\u10E2\u10DD \u10D0\u10DC \u10D0\u10D8\u10E0\u10E9\u10D8\u10D4\u10D7 \u10DC\u10D0\u10D9\u10DA\u10D4\u10D1\u10D8 \u10E4\u10D0\u10D8\u10DA\u10D8.`;

  if (language === "en") {
    return `${georgianMessage} A tour can have at most ${MAX_TOUR_IMAGES} images.`;
  }

  return georgianMessage;
}

function getTourImageFieldMessage(language) {
  const georgianMessage =
    '\u10E2\u10E3\u10E0\u10D8\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D8\u10E1 \u10D5\u10D4\u10DA\u10D8 \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 "images".';

  if (language === "en") {
    return `${georgianMessage} Use the "images" field for tour photos.`;
  }

  return georgianMessage;
}

function getTourImageTypeMessage(language) {
  const georgianMessage =
    "\u10E1\u10E3\u10E0\u10D0\u10D7\u10D8\u10E1 \u10E2\u10D8\u10DE\u10D8 \u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8\u10D0. \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D4\u10D7 JPG, PNG \u10D0\u10DC WebP \u10E4\u10D0\u10D8\u10DA\u10D8.";

  if (language === "en") {
    return `${georgianMessage} Upload a JPG, PNG, or WebP image.`;
  }

  return georgianMessage;
}

function getTourSlugRequiredMessage(language) {
  const georgianMessage =
    "URL \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8 \u10D0\u10E3\u10EA\u10D8\u10DA\u10D4\u10D1\u10D4\u10DA\u10D8\u10D0.";

  if (language === "en") {
    return `${georgianMessage} URL slug is required.`;
  }

  return georgianMessage;
}

function getTourSlugFormatMessage(language) {
  const georgianMessage =
    "URL slug \u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8\u10D0. \u10D2\u10D0\u10DB\u10DD\u10D8\u10E7\u10D4\u10DC\u10D4\u10D7 a-z, 0-9 \u10D3\u10D0 \u10D3\u10D4\u10E4\u10D8\u10E1\u10D8.";

  if (language === "en") {
    return `${georgianMessage} Use only a-z, 0-9, and hyphens.`;
  }

  return georgianMessage;
}

function getTourSlugSourceFromForm(form) {
  return (
    form.titleKa ||
    form.titleEn ||
    form.destinationKa ||
    form.destinationEn ||
    ""
  );
}

function toLocalizedItemRows(value) {
  const kaItems = Array.isArray(value?.ka) ? value.ka : [];
  const enItems = Array.isArray(value?.en) ? value.en : [];
  const itemCount = Math.max(kaItems.length, enItems.length, 1);

  return Array.from({ length: itemCount }, (_entry, index) => ({
    ka: kaItems[index] || "",
    en: enItems[index] || "",
  }));
}

function toLocalizedListPayload(rows = []) {
  return {
    ka: rows
      .map((row) => row?.ka?.trim())
      .filter(Boolean),
    en: rows
      .map((row) => row?.en?.trim())
      .filter(Boolean),
  };
}

const ADMIN_TAB_IDS = {
  dashboard: "dashboard",
  tours: "tours",
  requests: "requests",
  bookings: "bookings",
  blog: "blog",
  reviews: "reviews",
};

const ADMIN_COPY = {
  ka: {
    dashboard: "\u10DB\u10D7\u10D0\u10D5\u10D0\u10E0\u10D8",
    tours: "\u10E2\u10E3\u10E0\u10D4\u10D1\u10D8",
    requests:
      "\u10EF\u10D0\u10D5\u10E8\u10DC\u10D8\u10E1 \u10DB\u10DD\u10D7\u10EE\u10DD\u10D5\u10DC\u10D4\u10D1\u10D8",
    bookings: "\u10EF\u10D0\u10D5\u10E8\u10DC\u10D4\u10D1\u10D8",
    blog: "\u10D1\u10DA\u10DD\u10D2\u10D8",
    reviews: "\u10E8\u10D4\u10E4\u10D0\u10E1\u10D4\u10D1\u10D4\u10D1\u10D8",
    workspace:
      "\u10E1\u10D0\u10DB\u10E3\u10E8\u10D0\u10DD \u10E1\u10D8\u10D5\u10E0\u10EA\u10D4",
    overview:
      "\u10E1\u10EC\u10E0\u10D0\u10E4\u10D8 \u10DB\u10D8\u10DB\u10DD\u10EE\u10D8\u10DA\u10D5\u10D0",
    manage: "\u10DB\u10D0\u10E0\u10D7\u10D5\u10D0",
    pending: "\u10DB\u10DD\u10DA\u10DD\u10D3\u10D8\u10DC\u10E8\u10D8",
    addPackage:
      "\u10D0\u10EE\u10D0\u10DA\u10D8 \u10E2\u10E3\u10E0\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D0",
    activeBookings:
      "\u10D0\u10E5\u10E2\u10D8\u10E3\u10E0\u10D8 \u10EF\u10D0\u10D5\u10E8\u10DC\u10D4\u10D1\u10D8",
    completedBookings:
      "\u10D3\u10D0\u10E1\u10E0\u10E3\u10DA\u10D4\u10D1\u10E3\u10DA\u10D8 \u10EF\u10D0\u10D5\u10E8\u10DC\u10D4\u10D1\u10D8",
  },
  en: {
    dashboard: "Dashboard",
    tours: "Packages",
    requests: "Requests",
    bookings: "Bookings",
    blog: "Blog",
    reviews: "Reviews",
    workspace: "Workspace",
    overview: "Overview",
    manage: "Manage",
    pending: "pending",
    addPackage: "Add New Package",
    activeBookings: "Active bookings",
    completedBookings: "Completed bookings",
  },
};

function getAdminCopy(language) {
  return ADMIN_COPY[language] || ADMIN_COPY.ka;
}

function getAdminBookingStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "confirmed" ? "active" : status;
}

export default function AdminPage() {
  const { language, t } = useLanguage();
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [tours, setTours] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [bookingRequestsLoading, setBookingRequestsLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewActionId, setReviewActionId] = useState("");
  const [bookingRequestActionId, setBookingRequestActionId] = useState("");
  const [bookingActionId, setBookingActionId] = useState("");
  const [hotelImageActionId, setHotelImageActionId] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState(ADMIN_TAB_IDS.dashboard);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [error, setError] = useState("");
  const [bookingRequestsError, setBookingRequestsError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [success, setSuccess] = useState("");
  const bookingRequestMessages =
    ADMIN_BOOKING_REQUEST_MESSAGES[language] || ADMIN_BOOKING_REQUEST_MESSAGES.ka;
  const bookingMessages =
    ADMIN_BOOKING_MESSAGES[language] || ADMIN_BOOKING_MESSAGES.ka;
  const adminSeo = (
    <SEO title="Admin Panel | Around The World" robots="noindex,nofollow" />
  );
  const adminCopy = useMemo(() => getAdminCopy(language), [language]);
  const activeAdminTitle =
    activeAdminTab === ADMIN_TAB_IDS.dashboard
      ? t("admin.dashboardHeading")
      : adminCopy[activeAdminTab] || t("admin.dashboardHeading");
  const bookingStats = useMemo(() => {
    const nextStats = {
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((booking) => {
      const status = getAdminBookingStatus(booking.status);

      if (Object.prototype.hasOwnProperty.call(nextStats, status)) {
        nextStats[status] += 1;
      }
    });

    return nextStats;
  }, [bookings]);
  const pendingRequestCount = useMemo(
    () =>
      bookingRequests.filter((request) => request.status === "pending").length,
    [bookingRequests]
  );
  const adminTabs = useMemo(
    () => [
      {
        id: ADMIN_TAB_IDS.dashboard,
        label: adminCopy.dashboard,
      },
      {
        id: ADMIN_TAB_IDS.tours,
        label: adminCopy.tours,
        count: tours.length,
      },
      {
        id: ADMIN_TAB_IDS.requests,
        label: adminCopy.requests,
        count: bookingRequests.length,
      },
      {
        id: ADMIN_TAB_IDS.bookings,
        label: adminCopy.bookings,
        count: bookings.length,
      },
      {
        id: ADMIN_TAB_IDS.blog,
        label: adminCopy.blog,
      },
      {
        id: ADMIN_TAB_IDS.reviews,
        label: adminCopy.reviews,
        count: reviews.length,
      },
    ],
    [
      adminCopy,
      bookingRequests.length,
      bookings.length,
      reviews.length,
      tours.length,
    ]
  );
  const dashboardStats = useMemo(
    () => [
      {
        id: ADMIN_TAB_IDS.tours,
        label: adminCopy.tours,
        value: tours.length,
        tone: "bg-[#fff8ed]",
      },
      {
        id: ADMIN_TAB_IDS.requests,
        label: adminCopy.requests,
        value: bookingRequests.length,
        helper: pendingRequestCount
          ? `${pendingRequestCount} ${adminCopy.pending}`
          : "",
        tone: "bg-[#fff4f0]",
      },
      {
        id: ADMIN_TAB_IDS.bookings,
        label: adminCopy.activeBookings,
        value: bookingStats.active,
        tone: "bg-[#eef8ef]",
      },
      {
        id: ADMIN_TAB_IDS.bookings,
        label: adminCopy.completedBookings,
        value: bookingStats.completed,
        tone: "bg-[#eef4ff]",
      },
      {
        id: ADMIN_TAB_IDS.reviews,
        label: adminCopy.reviews,
        value: reviews.length,
        tone: "bg-[#fff8ed]",
      },
    ],
    [
      adminCopy,
      bookingRequests.length,
      bookingStats.active,
      bookingStats.completed,
      pendingRequestCount,
      reviews.length,
      tours.length,
    ]
  );

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([]);
      return undefined;
    }

    const objectUrls = imageFiles.map((imageFile) => URL.createObjectURL(imageFile));
    setImagePreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [imageFiles]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    const storedExpiry = window.localStorage.getItem(EXPIRY_STORAGE_KEY) || "";

    if (storedToken) {
      setToken(storedToken);
      setExpiresAt(storedExpiry);
    }
  }, []);

  const persistSession = (nextToken, nextExpiresAt) => {
    setToken(nextToken);
    setExpiresAt(String(nextExpiresAt || ""));

    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      window.localStorage.setItem(EXPIRY_STORAGE_KEY, String(nextExpiresAt || ""));
    }
  };

  const clearSession = useCallback(() => {
    setToken("");
    setExpiresAt("");
    setTours([]);
    setReviews([]);
    setBookingRequests([]);
    setBookings([]);
    setBookingRequestsError("");
    setBookingsError("");
    setPassword("");
    setEditingId("");
    setActiveAdminTab(ADMIN_TAB_IDS.dashboard);
    setSlugManuallyEdited(false);
    setForm(createEmptyForm());
    setImageFiles([]);
    setImageInputKey((currentKey) => currentKey + 1);
    setHotelImageActionId("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(EXPIRY_STORAGE_KEY);
    }
  }, []);

  const loadAdminTours = useCallback(
    async (activeToken) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchAdminTours(activeToken);
        setTours(Array.isArray(response?.tours) ? response.tours : []);
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearSession();
        }

        setError(
          getFriendlyApiError(requestError, t("admin.errors.loadFailed"), {
            unauthorizedMessage: t("admin.errors.loginFailed"),
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [clearSession, t]
  );

  const loadAdminReviews = useCallback(
    async (activeToken) => {
      setReviewsLoading(true);
      setError("");

      try {
        const response = await fetchAdminReviews(activeToken);
        setReviews(Array.isArray(response?.reviews) ? response.reviews : []);
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearSession();
        }

        setError(
          getFriendlyApiError(requestError, t("admin.errors.reviewsLoadFailed"), {
            unauthorizedMessage: t("admin.errors.loginFailed"),
          })
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    [clearSession, t]
  );

  const loadAdminBookingRequests = useCallback(
    async (activeToken) => {
      setBookingRequestsLoading(true);
      setBookingRequestsError("");

      try {
        const response = await fetchAdminBookingRequests(activeToken);
        setBookingRequests(
          Array.isArray(response?.bookingRequests) ? response.bookingRequests : []
        );
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearSession();
        }

        setBookingRequestsError(
          getFriendlyApiError(requestError, bookingRequestMessages.loadFailed, {
            unauthorizedMessage: t("admin.errors.loginFailed"),
          })
        );
      } finally {
        setBookingRequestsLoading(false);
      }
    },
    [bookingRequestMessages.loadFailed, clearSession, t]
  );

  const loadAdminBookings = useCallback(
    async (activeToken) => {
      setBookingsLoading(true);
      setBookingsError("");

      try {
        const response = await fetchAdminBookings(activeToken);
        setBookings(Array.isArray(response?.bookings) ? response.bookings : []);
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearSession();
        }

        setBookingsError(
          getFriendlyApiError(requestError, bookingMessages.loadFailed, {
            unauthorizedMessage: t("admin.errors.loginFailed"),
          })
        );
      } finally {
        setBookingsLoading(false);
      }
    },
    [bookingMessages.loadFailed, clearSession, t]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadAdminTours(token);
    void loadAdminReviews(token);
    void loadAdminBookingRequests(token);
    void loadAdminBookings(token);
  }, [
    token,
    loadAdminBookingRequests,
    loadAdminBookings,
    loadAdminReviews,
    loadAdminTours,
  ]);

  const resetForm = () => {
    setEditingId("");
    setForm(createEmptyForm());
    setSlugManuallyEdited(false);
    setImageFiles([]);
    setHotelImageActionId("");
    setImageInputKey((currentKey) => currentKey + 1);
  };

  const validateForm = () => {
    const dates = parseDatesInput(form.dates);
    const invalidDate = dates.find((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date));
    const priceValue = Number(form.price);
    const galleryImageCount = getFormGalleryImages(form).length + imageFiles.length;

    if (!form.titleKa.trim()) {
      return t("admin.errors.titleKaRequired");
    }

    if (!form.titleEn.trim()) {
      return t("admin.errors.titleEnRequired");
    }

    if (!form.destinationKa.trim()) {
      return t("admin.errors.destinationKaRequired");
    }

    if (!form.destinationEn.trim()) {
      return t("admin.errors.destinationEnRequired");
    }

    if (!form.descriptionKa.trim()) {
      return t("admin.errors.descriptionKaRequired");
    }

    if (!form.descriptionEn.trim()) {
      return t("admin.errors.descriptionEnRequired");
    }

    if (!form.durationKa.trim()) {
      return t("admin.errors.durationKaRequired");
    }

    if (!form.durationEn.trim()) {
      return t("admin.errors.durationEnRequired");
    }

    if (Number.isNaN(priceValue) || priceValue < 0) {
      return t("admin.errors.priceInvalid");
    }

    if (!String(form.currency || "").trim()) {
      return language === "en" ? "Currency is required." : "\u10D5\u10D0\u10DA\u10E3\u10E2\u10D0 \u10D0\u10E3\u10EA\u10D8\u10DA\u10D4\u10D1\u10D4\u10DA\u10D8\u10D0.";
    }

    if (!form.slug.trim()) {
      return getTourSlugRequiredMessage(language);
    }

    if (!isValidTourSlug(form.slug)) {
      return getTourSlugFormatMessage(language);
    }

    if (invalidDate) {
      return replaceToken(t("admin.errors.invalidDateFormat"), {
        date: invalidDate,
      });
    }

    if (galleryImageCount > MAX_TOUR_IMAGES) {
      return getTourImageLimitMessage(language);
    }

    const duplicateHotelIds = new Set();
    const duplicateHotel = (Array.isArray(form.hotels) ? form.hotels : []).find(
      (hotel) => {
        const hotelId = String(hotel?.id || "").trim();

        if (!hotelId) {
          return true;
        }

        if (duplicateHotelIds.has(hotelId)) {
          return true;
        }

        duplicateHotelIds.add(hotelId);
        return false;
      }
    );

    if (duplicateHotel) {
      return language === "en"
        ? "Each hotel needs a unique id."
        : "\u10E7\u10D5\u10D4\u10DA\u10D0 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E3\u10DC\u10D3\u10D0 \u10F0\u10E5\u10DD\u10DC\u10D3\u10D4\u10E1 \u10E3\u10DC\u10D8\u10D9\u10D0\u10DA\u10E3\u10E0\u10D8 ID.";
    }

    const hotelWithTooManyImages = (Array.isArray(form.hotels) ? form.hotels : [])
      .find((hotel) => Array.isArray(hotel?.images) && hotel.images.length > MAX_TOUR_HOTEL_IMAGES);

    if (hotelWithTooManyImages) {
      return language === "en"
        ? `A hotel can have at most ${MAX_TOUR_HOTEL_IMAGES} images.`
        : `\u10D4\u10E0\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D6\u10D4 \u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB ${MAX_TOUR_HOTEL_IMAGES} \u10E4\u10DD\u10E2\u10DD\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10D8\u10EB\u10DA\u10D4\u10D1\u10D0.`;
    }

    const invalidHotelRating = (Array.isArray(form.hotels) ? form.hotels : []).find(
      (hotel) => {
        const ratingText = String(hotel?.rating || "").trim();

        if (!ratingText) {
          return false;
        }

        const rating = Number.parseFloat(ratingText.replace(",", "."));
        return !Number.isFinite(rating) || rating < 0 || rating > 10;
      }
    );

    if (invalidHotelRating) {
      return language === "en"
        ? "Hotel rating must be a number from 0 to 10."
        : "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E0\u10D4\u10D8\u10E2\u10D8\u10DC\u10D2\u10D8 \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 0-\u10D3\u10D0\u10DC 10-\u10DB\u10D3\u10D4 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8.";
    }

    const invalidHotelReviewCount = (Array.isArray(form.hotels) ? form.hotels : []).find(
      (hotel) => {
        const reviewCountText = String(hotel?.reviewCount || "").trim();

        if (!reviewCountText) {
          return false;
        }

        const reviewCount = Number.parseInt(reviewCountText, 10);
        return (
          !Number.isInteger(reviewCount) ||
          reviewCount < 0 ||
          String(reviewCount) !== reviewCountText
        );
      }
    );

    if (invalidHotelReviewCount) {
      return language === "en"
        ? "Hotel review count must be an integer that is 0 or greater."
        : "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E8\u10D4\u10E4\u10D0\u10E1\u10D4\u10D1\u10D4\u10D1\u10D8\u10E1 \u10E0\u10D0\u10DD\u10D3\u10D4\u10DC\u10DD\u10D1\u10D0 \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 0 \u10D0\u10DC \u10DB\u10D4\u10E2\u10D8 \u10DB\u10D7\u10D4\u10DA\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8.";
    }

    return null;
  };

  const buildPayload = (imageValues = getFormGalleryImages(form)) => {
    const galleryImages = normalizeTourImageSources(imageValues);

    return {
      title: {
        ka: form.titleKa.trim(),
        en: form.titleEn.trim(),
      },
      destination: {
        ka: form.destinationKa.trim(),
        en: form.destinationEn.trim(),
      },
      description: {
        ka: form.descriptionKa.trim(),
        en: form.descriptionEn.trim(),
      },
      price: Number(form.price),
      currency: String(form.currency || "GEL").trim().toUpperCase(),
      duration: {
        ka: form.durationKa.trim(),
        en: form.durationEn.trim(),
      },
      dates: parseDatesInput(form.dates),
      included: toLocalizedListPayload(form.included),
      notIncluded: toLocalizedListPayload(form.notIncluded),
      category: form.category.trim(),
      slug: normalizeTourSlug(form.slug),
      image: galleryImages[0] || "",
      images: galleryImages,
      hotels: buildHotelsPayload(form.hotels),
    };
  };

  const getUploadErrorMessage = (requestError) => {
    const statusCode = requestError.response?.status;
    const apiCode = requestError.response?.data?.code;
    const apiDetails = requestError.response?.data?.details;

    if (statusCode === 401) {
      return t("admin.errors.loginFailed");
    }

    if (apiCode === "INVALID_FILE_TYPE") {
      return apiDetails || getTourImageTypeMessage(language);
    }

    if (apiCode === "FILE_TOO_LARGE" || statusCode === 413) {
      return t("admin.errors.fileTooLarge");
    }

    if (apiCode === "TOO_MANY_TOUR_IMAGES") {
      return apiDetails || getTourImageLimitMessage(language);
    }

    if (apiCode === "INVALID_TOUR_IMAGE_FIELD" || apiCode === "LIMIT_UNEXPECTED_FILE") {
      return apiDetails || getTourImageFieldMessage(language);
    }

    if (apiCode === "IMAGE_OPTIMIZATION_FAILED") {
      return t("admin.errors.imageOptimizationFailed");
    }

    return t("admin.errors.uploadFailed");
  };

  const clearSelectedImageFile = () => {
    setImageFiles([]);
    setImageInputKey((currentKey) => currentKey + 1);
  };

  const handleImageFileChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);

    if (nextFiles.length === 0) {
      clearSelectedImageFile();
      return;
    }

    const galleryImageCount = getFormGalleryImages(form).length;

    if (galleryImageCount + nextFiles.length > MAX_TOUR_IMAGES) {
      setError(getTourImageLimitMessage(language));
      setSuccess("");
      clearSelectedImageFile();
      return;
    }

    if (nextFiles.some((nextFile) => !ALLOWED_IMAGE_UPLOAD_TYPES.has(nextFile.type))) {
      setError(getTourImageTypeMessage(language));
      setSuccess("");
      clearSelectedImageFile();
      return;
    }

    if (nextFiles.some((nextFile) => nextFile.size > IMAGE_UPLOAD_MAX_BYTES)) {
      setError(t("admin.errors.fileTooLarge"));
      setSuccess("");
      clearSelectedImageFile();
      return;
    }

    setImageFiles(nextFiles);
    setError("");
    setSuccess("");
  };

  const handleRemoveGalleryImage = (imageUrl) => {
    setForm((previousForm) => {
      const nextImages = getFormGalleryImages(previousForm).filter(
        (image) => image !== imageUrl
      );

      return {
        ...previousForm,
        ...toGalleryFormValues(nextImages),
      };
    });
  };

  const handleMakeCoverImage = (imageUrl) => {
    setForm((previousForm) => {
      const currentImages = getFormGalleryImages(previousForm);
      const nextImages = normalizeTourImageSources([
        imageUrl,
        ...currentImages.filter((image) => image !== imageUrl),
      ]);

      return {
        ...previousForm,
        ...toGalleryFormValues(nextImages),
      };
    });
  };

  const handleRemovePendingImage = (imageIndex) => {
    setImageFiles((previousFiles) =>
      previousFiles.filter((_imageFile, index) => index !== imageIndex)
    );
    setImageInputKey((currentKey) => currentKey + 1);
  };

  const handleLocalizedItemChange = (section, index, locale, value) => {
    setForm((previousForm) => {
      const rows = Array.isArray(previousForm[section])
        ? previousForm[section]
        : [createEmptyLocalizedItem()];

      return {
        ...previousForm,
        [section]: rows.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                [locale]: value,
              }
            : row
        ),
      };
    });
  };

  const addLocalizedItem = (section) => {
    setForm((previousForm) => ({
      ...previousForm,
      [section]: [
        ...(Array.isArray(previousForm[section]) ? previousForm[section] : []),
        createEmptyLocalizedItem(),
      ],
    }));
  };

  const removeLocalizedItem = (section, index) => {
    setForm((previousForm) => {
      const rows = Array.isArray(previousForm[section])
        ? previousForm[section]
        : [createEmptyLocalizedItem()];
      const nextRows = rows.filter((_row, rowIndex) => rowIndex !== index);

      return {
        ...previousForm,
        [section]: nextRows.length > 0 ? nextRows : [createEmptyLocalizedItem()],
      };
    });
  };

  const updateHotelRows = (updater) => {
    setForm((previousForm) => {
      const hotels = Array.isArray(previousForm.hotels) ? previousForm.hotels : [];

      return {
        ...previousForm,
        hotels: updater(hotels),
      };
    });
  };

  const handleAddHotel = () => {
    updateHotelRows((hotels) => [
      ...hotels,
      createEmptyHotelFormRow(createNextHotelId(hotels)),
    ]);
    setError("");
    setSuccess("");
  };

  const handleRemoveHotel = (hotelId) => {
    updateHotelRows((hotels) => hotels.filter((hotel) => hotel.id !== hotelId));
    setError("");
    setSuccess("");
  };

  const handleHotelFieldChange = (hotelId, field, value) => {
    updateHotelRows((hotels) =>
      hotels.map((hotel) =>
        hotel.id === hotelId
          ? {
              ...hotel,
              [field]: field === "id" ? value.replace(/[^A-Za-z0-9_-]/g, "") : value,
            }
          : hotel
      )
    );
  };

  const getHotelUploadErrorMessage = (requestError) => {
    const statusCode = requestError.response?.status;
    const apiCode = requestError.response?.data?.code;
    const apiDetails = requestError.response?.data?.details;

    if (statusCode === 401) {
      return t("admin.errors.loginFailed");
    }

    if (apiCode === "INVALID_FILE_TYPE" || apiCode === "IMAGE_VALIDATION_FAILED") {
      return apiDetails ||
        (language === "en"
          ? "Only JPG, JPEG, PNG, or WebP hotel images are allowed."
          : "\u10DB\u10EE\u10DD\u10DA\u10DD\u10D3 JPG, JPEG, PNG \u10D0\u10DC WebP \u10E4\u10DD\u10E0\u10DB\u10D0\u10E2\u10D8\u10E1 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10D0 \u10D3\u10D0\u10E8\u10D5\u10D4\u10D1\u10E3\u10DA\u10D8.");
    }

    if (apiCode === "FILE_TOO_LARGE" || statusCode === 413) {
      return t("admin.errors.fileTooLarge");
    }

    if (apiCode === "TOO_MANY_HOTEL_IMAGES") {
      return apiDetails ||
        (language === "en"
          ? `A hotel can have at most ${MAX_TOUR_HOTEL_IMAGES} images.`
          : `\u10D4\u10E0\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D6\u10D4 \u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB ${MAX_TOUR_HOTEL_IMAGES} \u10E4\u10DD\u10E2\u10DD\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10D8\u10EB\u10DA\u10D4\u10D1\u10D0.`);
    }

    if (apiCode === "HOTEL_NOT_FOUND") {
      return apiDetails ||
        (language === "en"
          ? "Save this hotel before uploading images."
          : "\u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0\u10DB\u10D3\u10D4 \u10E8\u10D4\u10D8\u10DC\u10D0\u10EE\u10D4\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD.");
    }

    return apiDetails ||
      (language === "en"
        ? "Hotel image action failed."
        : "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD\u10E1 \u10DB\u10DD\u10E5\u10DB\u10D4\u10D3\u10D4\u10D1\u10D0 \u10D5\u10D4\u10E0 \u10DB\u10DD\u10EE\u10D4\u10E0\u10EE\u10D3\u10D0.");
  };

  const handleHotelImagesUpload = async (hotelId, files) => {
    const nextFiles = Array.from(files || []);
    const currentHotel = (Array.isArray(form.hotels) ? form.hotels : []).find(
      (hotel) => hotel.id === hotelId
    );

    if (!editingId) {
      setError(
        language === "en"
          ? "Hotel photo upload will be available after saving the tour."
          : "\u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10E1\u10D0\u10EB\u10DA\u10D4\u10D1\u10D4\u10DA\u10D8 \u10D8\u10E5\u10DC\u10D4\u10D1\u10D0 \u10E2\u10E3\u10E0\u10D8\u10E1 \u10E8\u10D4\u10DC\u10D0\u10EE\u10D5\u10D8\u10E1 \u10E8\u10D4\u10DB\u10D3\u10D4\u10D2."
      );
      setSuccess("");
      return false;
    }

    if (!currentHotel) {
      setError(
        language === "en"
          ? "Choose a saved hotel before uploading images."
          : "\u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0\u10DB\u10D3\u10D4 \u10D0\u10D8\u10E0\u10E9\u10D8\u10D4\u10D7 \u10E8\u10D4\u10DC\u10D0\u10EE\u10E3\u10DA\u10D8 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD."
      );
      setSuccess("");
      return false;
    }

    if (nextFiles.length === 0) {
      return false;
    }

    if (
      (Array.isArray(currentHotel.images) ? currentHotel.images.length : 0) +
        nextFiles.length >
      MAX_TOUR_HOTEL_IMAGES
    ) {
      setError(
        language === "en"
          ? `A hotel can have at most ${MAX_TOUR_HOTEL_IMAGES} images.`
          : `\u10D4\u10E0\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D6\u10D4 \u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB ${MAX_TOUR_HOTEL_IMAGES} \u10E4\u10DD\u10E2\u10DD\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10D8\u10EB\u10DA\u10D4\u10D1\u10D0.`
      );
      setSuccess("");
      return false;
    }

    if (nextFiles.some((nextFile) => !ALLOWED_IMAGE_UPLOAD_TYPES.has(nextFile.type))) {
      setError(
        language === "en"
          ? "Only JPG, JPEG, PNG, or WebP hotel images are allowed."
          : "\u10DB\u10EE\u10DD\u10DA\u10DD\u10D3 JPG, JPEG, PNG \u10D0\u10DC WebP \u10E4\u10DD\u10E0\u10DB\u10D0\u10E2\u10D8\u10E1 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10D0 \u10D3\u10D0\u10E8\u10D5\u10D4\u10D1\u10E3\u10DA\u10D8."
      );
      setSuccess("");
      return false;
    }

    if (nextFiles.some((nextFile) => nextFile.size > HOTEL_IMAGE_UPLOAD_MAX_BYTES)) {
      setError(t("admin.errors.fileTooLarge"));
      setSuccess("");
      return false;
    }

    setHotelImageActionId(hotelId);
    setError("");
    setSuccess("");

    try {
      const response = await uploadTourHotelImages(token, editingId, hotelId, nextFiles);
      const nextHotel = response?.hotel;

      updateHotelRows((hotels) =>
        hotels.map((hotel) =>
          hotel.id === hotelId
            ? {
                ...hotel,
                images: normalizeTourImageSources(
                  Array.isArray(nextHotel?.images)
                    ? nextHotel.images
                    : [
                        ...(Array.isArray(hotel.images) ? hotel.images : []),
                        ...(Array.isArray(response?.imageUrls)
                          ? response.imageUrls
                          : [response?.imageUrl].filter(Boolean)),
                      ]
                ),
              }
            : hotel
        )
      );
      setTours((previousTours) =>
        previousTours.map((tour) =>
          tour.id === editingId && response?.tour ? response.tour : tour
        )
      );
      setSuccess(
        language === "en"
          ? "Hotel images uploaded."
          : "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8 \u10D0\u10D8\u10E2\u10D5\u10D8\u10E0\u10D7\u10D0."
      );
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(getHotelUploadErrorMessage(requestError));
      return false;
    } finally {
      setHotelImageActionId("");
    }
  };

  const handleRemoveHotelImage = async (hotelId, imagePath) => {
    const normalizedPath = String(imagePath || "").trim();
    const isVpsHotelImage =
      normalizedPath.startsWith("/uploads/tours/hotels/") ||
      normalizedPath.startsWith("uploads/tours/hotels/") ||
      /^https?:\/\/[^/]+\/uploads\/tours\/hotels\//i.test(normalizedPath);

    if (!editingId || !isVpsHotelImage) {
      updateHotelRows((hotels) =>
        hotels.map((hotel) =>
          hotel.id === hotelId
            ? {
                ...hotel,
                images: (Array.isArray(hotel.images) ? hotel.images : []).filter(
                  (image) => image !== imagePath
                ),
              }
            : hotel
        )
      );
      setError("");
      setSuccess("");
      return true;
    }

    setHotelImageActionId(`${hotelId}:${imagePath}`);
    setError("");
    setSuccess("");

    try {
      const response = await deleteTourHotelImage(
        token,
        editingId,
        hotelId,
        imagePath
      );
      const nextHotel = response?.hotel;

      updateHotelRows((hotels) =>
        hotels.map((hotel) =>
          hotel.id === hotelId
            ? {
                ...hotel,
                images: normalizeTourImageSources(
                  Array.isArray(nextHotel?.images)
                    ? nextHotel.images
                    : (Array.isArray(hotel.images) ? hotel.images : []).filter(
                        (image) => image !== imagePath
                      )
                ),
              }
            : hotel
        )
      );
      setTours((previousTours) =>
        previousTours.map((tour) =>
          tour.id === editingId && response?.tour ? response.tour : tour
        )
      );
      setSuccess(
        language === "en"
          ? "Hotel image deleted."
          : "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD \u10EC\u10D0\u10D8\u10E8\u10D0\u10DA\u10D0."
      );
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(getHotelUploadErrorMessage(requestError));
      return false;
    } finally {
      setHotelImageActionId("");
    }
  };

  const handleTourFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "slug") {
      setSlugManuallyEdited(true);
      setForm((previousForm) => ({
        ...previousForm,
        slug: normalizeTourSlug(value),
      }));
      return;
    }

    setForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [name]: value,
      };
      const shouldAutoGenerateSlug =
        (name === "titleKa" || name === "titleEn") &&
        !slugManuallyEdited &&
        (!editingId || !previousForm.slug.trim());

      if (shouldAutoGenerateSlug) {
        nextForm.slug = createTourSlug(getTourSlugSourceFromForm(nextForm), "");
      }

      return nextForm;
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!password.trim()) {
      setError(t("admin.errors.passwordRequired"));
      return;
    }

    setAuthLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await createAdminSession(password.trim());
      persistSession(response?.token || "", response?.expiresAt || "");
      setPassword("");
      setSuccess(t("admin.loginSuccess"));
    } catch (requestError) {
      setError(
        getFriendlyApiError(requestError, t("admin.errors.loginFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let requestPhase = "save";

    try {
      let galleryImages = getFormGalleryImages(form);

      if (imageFiles.length > 0) {
        requestPhase = "upload";
        const uploadResponse = await uploadAdminTourImages(token, imageFiles);
        const uploadedImageUrls = Array.isArray(uploadResponse?.imageUrls)
          ? uploadResponse.imageUrls
          : [uploadResponse?.imageUrl].filter(Boolean);

        galleryImages = normalizeTourImageSources([
          ...galleryImages,
          ...uploadedImageUrls,
        ]);
        requestPhase = "save";
      }

      if (galleryImages.length > MAX_TOUR_IMAGES) {
        setError(getTourImageLimitMessage(language));
        setSaving(false);
        return;
      }

      if (editingId) {
        await updateAdminTour(token, editingId, buildPayload(galleryImages));
        setSuccess(t("admin.success.updated"));
      } else {
        await createAdminTour(token, buildPayload(galleryImages));
        setSuccess(t("admin.success.created"));
      }

      resetForm();
      await loadAdminTours(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(
        requestPhase === "upload"
          ? getUploadErrorMessage(requestError)
          : getFriendlyApiError(requestError, t("admin.errors.saveFailed"), {
              unauthorizedMessage: t("admin.errors.loginFailed"),
            })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(t("admin.confirmDelete"));

      if (!shouldDelete) {
        return;
      }
    }

    setError("");
    setSuccess("");

    try {
      await deleteAdminTour(token, id);
      if (editingId === id) {
        resetForm();
      }
      setSuccess(t("admin.success.deleted"));
      await loadAdminTours(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.deleteFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    }
  };

  const handleApproveReview = async (id) => {
    setReviewActionId(id);
    setError("");
    setSuccess("");

    try {
      await approveAdminReview(token, id);
      setSuccess(t("admin.success.reviewApproved"));
      await loadAdminReviews(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.reviewApproveFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setReviewActionId("");
    }
  };

  const handleDeleteReview = async (id) => {
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(t("admin.confirmReviewDelete"));

      if (!shouldDelete) {
        return;
      }
    }

    setReviewActionId(id);
    setError("");
    setSuccess("");

    try {
      await deleteAdminReview(token, id);
      setSuccess(t("admin.success.reviewDeleted"));
      await loadAdminReviews(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.reviewDeleteFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setReviewActionId("");
    }
  };

  const handleSaveBookingRequest = async (id, payload) => {
    setBookingRequestActionId(id);
    setBookingRequestsError("");
    setError("");
    setSuccess("");

    try {
      await updateAdminBookingRequest(token, id, {
        status: payload.status,
        adminNote: payload.adminNote,
      });
      setSuccess(bookingRequestMessages.updateSuccess);
      await loadAdminBookingRequests(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setBookingRequestsError(
        getFriendlyApiError(requestError, bookingRequestMessages.updateFailed, {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setBookingRequestActionId("");
    }
  };

  const handleConvertBookingRequest = async (id, payload) => {
    setBookingRequestActionId(id);
    setBookingRequestsError("");
    setError("");
    setSuccess("");

    try {
      await convertAdminBookingRequest(token, id, payload);
      setSuccess(bookingRequestMessages.convertSuccess);
      await Promise.all([
        loadAdminBookingRequests(token),
        loadAdminBookings(token),
      ]);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      const convertErrorCode = requestError.response?.data?.code;
      const localizedConvertError =
        bookingRequestMessages.convertErrors?.[convertErrorCode];

      setBookingRequestsError(
        localizedConvertError ||
          getFriendlyApiError(requestError, bookingRequestMessages.convertFailed, {
            unauthorizedMessage: t("admin.errors.loginFailed"),
          })
      );
    } finally {
      setBookingRequestActionId("");
    }
  };

  const getBookingActionErrorMessage = (requestError, fallbackMessage) => {
    const errorCode = requestError.response?.data?.code;
    const localizedError = bookingMessages.updateErrors?.[errorCode];

    return (
      localizedError ||
      getFriendlyApiError(requestError, fallbackMessage, {
        unauthorizedMessage: t("admin.errors.loginFailed"),
      })
    );
  };

  const handleSaveBooking = async (id, payload) => {
    setBookingActionId(id);
    setBookingsError("");
    setError("");
    setSuccess("");

    try {
      await updateAdminBooking(token, id, payload);
      setSuccess(bookingMessages.updateSuccess);
      await loadAdminBookings(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setBookingsError(
        getBookingActionErrorMessage(requestError, bookingMessages.updateFailed)
      );
    } finally {
      setBookingActionId("");
    }
  };

  const handleUploadBookingFile = async (id, file, name) => {
    setBookingActionId(id);
    setBookingsError("");
    setError("");
    setSuccess("");

    try {
      await uploadAdminBookingFile(token, id, file, name);
      setSuccess(bookingMessages.fileUploadSuccess);
      await loadAdminBookings(token);
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setBookingsError(
        getBookingActionErrorMessage(requestError, bookingMessages.fileUploadFailed)
      );
      return false;
    } finally {
      setBookingActionId("");
    }
  };

  const handleDownloadBookingFile = async (bookingId, file) => {
    setBookingActionId(bookingId);
    setBookingsError("");
    setError("");
    setSuccess("");

    try {
      const response = await downloadAdminBookingFile(token, bookingId, file.id);

      saveBlobAsFile(
        response.blob,
        response.filename || getBookingFileDownloadName(file)
      );
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setBookingsError(
        getBookingActionErrorMessage(
          requestError,
          bookingMessages.fileDownloadFailed
        )
      );
      return false;
    } finally {
      setBookingActionId("");
    }
  };

  const handleDeleteBookingFile = async (bookingId, fileId) => {
    setBookingActionId(bookingId);
    setBookingsError("");
    setError("");
    setSuccess("");

    try {
      await deleteAdminBookingFile(token, bookingId, fileId);
      setSuccess(bookingMessages.fileDeleteSuccess);
      await loadAdminBookings(token);
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setBookingsError(
        getBookingActionErrorMessage(requestError, bookingMessages.fileDeleteFailed)
      );
      return false;
    } finally {
      setBookingActionId("");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f7f1e8] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {adminSeo}
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
          <section className="grid w-full overflow-hidden rounded-[2.25rem] border border-white/80 bg-[#fffdf8] p-3 shadow-[0_30px_100px_-70px_rgba(72,52,34,0.75)] dark:border-white/10 dark:bg-slate-900/90 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-hidden rounded-[1.75rem]">
              <TravelImage
                image={null}
                title={t("admin.loginHeading")}
                subtitle={t("admin.loginDescription")}
                variant="tour"
                className="h-full min-h-[25rem]"
              />
            </div>

            <form onSubmit={handleLogin} className="space-y-6 p-5 sm:p-8 lg:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
                  {t("admin.loginLabel")}
                </p>
                <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">
                  {t("admin.loginHeading")}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t("admin.loginDescription")}
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("common.password")}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder={t("admin.passwordPlaceholder")}
                  className="w-full rounded-[1.25rem] border border-[#eadfcc] bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                />
              </label>

              {error ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
              >
                {authLoading ? t("admin.loginLoading") : t("admin.loginButton")}
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#30302f] px-3 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-5 sm:py-8">
      {adminSeo}
      <main className="mx-auto max-w-[1540px] overflow-hidden rounded-[2.9rem] border-[8px] border-white/10 bg-[#fff] p-4 shadow-[0_34px_120px_-54px_rgba(0,0,0,0.8)] dark:border-white/10 dark:bg-slate-900/90 sm:p-5 lg:p-6">
        <section className="rounded-[2.15rem] bg-transparent">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white/65 shadow-[0_14px_30px_-26px_rgba(72,52,34,0.9)] dark:bg-white/10">
                <img
                  src={logoMain}
                  alt="Around The World"
                  className="h-11 w-11 object-contain"
                />
              </span>
              <div>
                <p className="[font-family:var(--font-display)] text-xl font-semibold text-slate-950 dark:text-white">
                  Around The World
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9a5435] dark:text-orange-200">
                  {adminCopy.workspace}
                </p>
              </div>
            </div>

            <AdminTabBar
              activeTab={activeAdminTab}
              tabs={adminTabs}
              onChange={setActiveAdminTab}
            />

            <AdminHeaderActions
              logoutLabel={t("common.logout")}
              onLogout={() => {
                clearSession();
                setSuccess(t("admin.logoutSuccess"));
              }}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="[font-family:var(--font-display)] text-4xl font-semibold text-slate-950 dark:text-white">
                {activeAdminTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t("admin.sessionExpires")}:{" "}
                {expiresAt
                  ? formatDateTimeLabel(Number(expiresAt), language)
                  : t("admin.unknownExpiry")}
              </p>
            </div>
          </div>

          {(error || success) && (
            <div className="mt-5 space-y-3 border-t border-[#efe4d4] pt-5 dark:border-white/10">
              {error ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {success}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-7 space-y-6">
          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.dashboard}>
            <AdminDashboardOverview
              copy={adminCopy}
              stats={dashboardStats}
              onOpenTab={setActiveAdminTab}
            />
          </AdminTabPanel>

          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.tours}>
            <ToursAdminSection
              form={form}
              editing={Boolean(editingId)}
              saving={saving}
              loading={loading}
              tours={tours}
              language={language}
              copy={adminCopy}
              t={t}
              galleryImages={getFormGalleryImages(form)}
              imageFileNames={imageFiles.map((imageFile) => imageFile.name)}
              imagePreviewUrls={imagePreviewUrls}
              imageInputKey={imageInputKey}
              hotelImageActionId={hotelImageActionId}
              persistedHotelIds={getPersistedHotelIds(tours, editingId)}
              onFormChange={handleTourFormChange}
              onImageFileChange={handleImageFileChange}
              onClearImageFile={clearSelectedImageFile}
              onRemoveGalleryImage={handleRemoveGalleryImage}
              onMakeCoverImage={handleMakeCoverImage}
              onRemovePendingImage={handleRemovePendingImage}
              onLocalizedItemChange={handleLocalizedItemChange}
              onAddLocalizedItem={addLocalizedItem}
              onRemoveLocalizedItem={removeLocalizedItem}
              onAddHotel={handleAddHotel}
              onRemoveHotel={handleRemoveHotel}
              onHotelFieldChange={handleHotelFieldChange}
              onHotelImagesUpload={handleHotelImagesUpload}
              onRemoveHotelImage={handleRemoveHotelImage}
              onSubmit={handleSubmit}
              onReset={resetForm}
              onEditTour={(tour) => {
                setEditingId(tour.id);
                setForm(toFormValues(tour));
                setSlugManuallyEdited(Boolean(tour.slug));
                clearSelectedImageFile();
                setError("");
                setSuccess("");
              }}
              onDeleteTour={handleDelete}
            />
          </AdminTabPanel>

          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.requests}>
            <AdminBookingRequestsPanel
              bookingRequests={bookingRequests}
              loading={bookingRequestsLoading}
              error={bookingRequestsError}
              actionId={bookingRequestActionId}
              onSave={handleSaveBookingRequest}
              onConvert={handleConvertBookingRequest}
            />
          </AdminTabPanel>

          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.bookings}>
            <AdminBookingsPanel
              bookings={bookings}
              loading={bookingsLoading}
              error={bookingsError}
              actionId={bookingActionId}
              onSave={handleSaveBooking}
              onUploadFile={handleUploadBookingFile}
              onDownloadFile={handleDownloadBookingFile}
              onDeleteFile={handleDeleteBookingFile}
            />
          </AdminTabPanel>

          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.blog}>
            <AdminBlogManager token={token} onUnauthorized={clearSession} />
          </AdminTabPanel>

          <AdminTabPanel active={activeAdminTab === ADMIN_TAB_IDS.reviews}>
            <AdminReviewsPanel
              reviews={reviews}
              loading={reviewsLoading}
              actionId={reviewActionId}
              onApprove={handleApproveReview}
              onDelete={handleDeleteReview}
            />
          </AdminTabPanel>
        </section>
      </main>
    </div>
  );
}

function AdminTabPanel({ active, children }) {
  return (
    <div className={active ? "block" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

function AdminTabBar({ activeTab, onChange, tabs = [] }) {
  return (
    <nav className="min-w-0 flex-1 overflow-x-auto pb-1 xl:flex xl:justify-center xl:pb-0">
      <div className="flex min-w-max gap-1.5 rounded-full bg-white/86 p-1.5 shadow-[0_18px_60px_-48px_rgba(72,52,34,0.8)] backdrop-blur dark:bg-slate-950/70">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#2f2f2f] text-[#ffd84f] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.85)] dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950"
                      : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AdminHeaderActions({ logoutLabel, onLogout }) {
  const actions = [
    {
      label: "Search",
      icon: (
        <path d="m15 15 4 4M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
      ),
    },
    {
      label: "Alerts",
      icon: (
        <path d="M12 3a4 4 0 0 0-4 4v3.6L6.4 14h11.2L16 10.6V7a4 4 0 0 0-4-4ZM10 17h4" />
      ),
    },
    {
      label: "Settings",
      icon: (
        <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
      ),
    },
  ];

  return (
    <div className="flex shrink-0 items-center gap-2">
      {actions.map((action) => (
        <span
          key={action.label}
          className="hidden h-12 w-12 items-center justify-center rounded-full border border-[#d8caa9] bg-white/25 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:flex"
          title={action.label}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {action.icon}
          </svg>
        </span>
      ))}
      <button
        type="button"
        onClick={onLogout}
        className="rounded-full border border-[#d8caa9] bg-white/30 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white/65 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        {logoutLabel}
      </button>
    </div>
  );
}

function AdminDashboardOverview({ copy, onOpenTab, stats = [] }) {
  return (
    <div className="rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
            {copy.dashboard}
          </p>
          <h3 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
            {copy.overview}
          </h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <button
            key={`${stat.id}-${stat.label}`}
            type="button"
            onClick={() => onOpenTab(stat.id)}
            className={`group min-h-[10.5rem] rounded-[1.7rem] border border-white/80 p-5 text-left shadow-[0_18px_60px_-50px_rgba(72,52,34,0.65)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-48px_rgba(72,52,34,0.75)] dark:border-white/10 dark:bg-slate-800/70 ${stat.tone}`}
          >
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {stat.label}
            </span>
            <span className="mt-5 block text-4xl font-semibold text-slate-950 dark:text-white">
              {stat.value}
            </span>
            <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-950/70 dark:text-slate-200 dark:group-hover:bg-white dark:group-hover:text-slate-950">
              {stat.helper || copy.manage}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToursAdminSection({
  copy,
  editing,
  form,
  galleryImages,
  hotelImageActionId,
  imageFileNames,
  imageInputKey,
  imagePreviewUrls,
  language,
  loading,
  persistedHotelIds,
  onAddLocalizedItem,
  onClearImageFile,
  onDeleteTour,
  onEditTour,
  onFormChange,
  onAddHotel,
  onHotelFieldChange,
  onHotelImagesUpload,
  onImageFileChange,
  onLocalizedItemChange,
  onMakeCoverImage,
  onRemoveGalleryImage,
  onRemoveHotel,
  onRemoveHotelImage,
  onRemoveLocalizedItem,
  onRemovePendingImage,
  onReset,
  onSubmit,
  saving,
  t,
  tours,
}) {
  return (
    <>
      <AdminTourForm
        form={form}
        editing={editing}
        saving={saving}
        galleryImages={galleryImages}
        hotelImageActionId={hotelImageActionId}
        persistedHotelIds={persistedHotelIds}
        imageFileNames={imageFileNames}
        imagePreviewUrls={imagePreviewUrls}
        imageInputKey={imageInputKey}
        onChange={onFormChange}
        onImageFileChange={onImageFileChange}
        onClearImageFile={onClearImageFile}
        onRemoveGalleryImage={onRemoveGalleryImage}
        onMakeCoverImage={onMakeCoverImage}
        onRemovePendingImage={onRemovePendingImage}
        onLocalizedItemChange={onLocalizedItemChange}
        onAddLocalizedItem={onAddLocalizedItem}
        onRemoveLocalizedItem={onRemoveLocalizedItem}
        onAddHotel={onAddHotel}
        onRemoveHotel={onRemoveHotel}
        onHotelFieldChange={onHotelFieldChange}
        onHotelImagesUpload={onHotelImagesUpload}
        onRemoveHotelImage={onRemoveHotelImage}
        onSubmit={onSubmit}
        onReset={onReset}
      />

      <div className="overflow-hidden rounded-[2.1rem] border border-white/80 bg-[#fffdf8] p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
              {t("admin.existingTours")}
            </p>
            <h3 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {t("admin.catalogEntries")}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-full bg-[#f7f1e8] px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {tours.length} {t("admin.tourCountSuffix")}
            </p>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-full border border-slate-950/80 bg-[#f5efd8] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white dark:border-white/20 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-[#ffd84f]">
                +
              </span>
              {copy.addPackage}
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton />
          ) : tours.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
              {tours.map((tour) => {
                const tourTitle = getLocalized(tour.title, language);
                const tourDestination = getLocalized(tour.destination, language);
                const tourDuration = getLocalized(tour.duration, language);

                return (
                  <article
                    key={tour.id}
                    className="group relative min-h-[23rem] overflow-hidden rounded-[1.55rem] bg-slate-950 shadow-[0_22px_80px_-58px_rgba(0,0,0,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_95px_-56px_rgba(0,0,0,0.85)]"
                  >
                    <TravelImage
                      image={getTourCoverImage(tour)}
                      title={tourTitle}
                      subtitle={tourDestination}
                      variant="tour"
                      className="absolute inset-0 h-full transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                    <div className="absolute right-4 top-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTour(tour)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/22 text-white backdrop-blur transition hover:bg-white/35"
                        aria-label={t("admin.editAction")}
                        title={t("admin.editAction")}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTour(tour.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/22 text-white backdrop-blur transition hover:bg-rose-500/75"
                        aria-label={t("admin.deleteAction")}
                        title={t("admin.deleteAction")}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 space-y-4 p-5 text-white">
                      <div className="flex items-end justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-base font-semibold">
                            {tourTitle}
                          </h4>
                          <p className="mt-2 truncate text-sm text-white/78">
                            {tourDestination}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-white">
                          {formatCurrencyValue(tour.price, tour.currency, language)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm text-white">
                        <span>{tourDuration || "-"}</span>
                        <span className="truncate text-white/78">
                          {tour.category || t("admin.category")}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t("admin.noToursTitle")}
              message={t("admin.noToursMessage")}
            />
          )}
        </div>
      </div>
    </>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}
