import { useCallback, useEffect, useState } from "react";
import AdminBookingsPanel from "../components/AdminBookingsPanel";
import AdminBookingRequestsPanel from "../components/AdminBookingRequestsPanel";
import AdminBlogManager from "../components/AdminBlogManager";
import AdminReviewsPanel from "../components/AdminReviewsPanel";
import AdminTourForm from "../components/AdminTourForm";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SEO from "../components/SEO";
import TravelImage from "../components/TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import {
  approveAdminReview,
  convertAdminBookingRequest,
  createAdminSession,
  createAdminTour,
  deleteAdminBookingFile,
  deleteAdminReview,
  deleteAdminTour,
  downloadAdminBookingFile,
  fetchAdminBookings,
  fetchAdminBookingRequests,
  fetchAdminReviews,
  fetchAdminTours,
  uploadAdminBookingFile,
  uploadAdminTourImages,
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

const TOKEN_STORAGE_KEY = "around-the-world-admin-token";
const EXPIRY_STORAGE_KEY = "around-the-world-admin-expiry";
const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
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

function createEmptyForm() {
  return {
    titleKa: "",
    titleEn: "",
    destinationKa: "",
    destinationEn: "",
    descriptionKa: "",
    descriptionEn: "",
    price: "",
    durationKa: "",
    durationEn: "",
    dates: "",
    category: "",
    image: "",
    images: [],
    included: [createEmptyLocalizedItem()],
    notIncluded: [createEmptyLocalizedItem()],
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
    durationKa: tour?.duration?.ka || "",
    durationEn: tour?.duration?.en || "",
    dates: Array.isArray(tour?.dates) ? tour.dates.join(", ") : "",
    category: tour?.category || "",
    image: coverImage,
    images: galleryImages.filter((image) => image !== coverImage),
    included: toLocalizedItemRows(tour?.included),
    notIncluded: toLocalizedItemRows(tour?.notIncluded),
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
    setForm(createEmptyForm());
    setImageFiles([]);
    setImageInputKey((currentKey) => currentKey + 1);

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
    setImageFiles([]);
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

    if (invalidDate) {
      return replaceToken(t("admin.errors.invalidDateFormat"), {
        date: invalidDate,
      });
    }

    if (galleryImageCount > MAX_TOUR_IMAGES) {
      return getTourImageLimitMessage(language);
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
      duration: {
        ka: form.durationKa.trim(),
        en: form.durationEn.trim(),
      },
      dates: parseDatesInput(form.dates),
      included: toLocalizedListPayload(form.included),
      notIncluded: toLocalizedListPayload(form.notIncluded),
      category: form.category.trim(),
      image: galleryImages[0] || "",
      images: galleryImages,
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
      <div className="min-h-screen bg-[#f5efe7] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {adminSeo}
        <div className="mx-auto max-w-7xl">
            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
                <TravelImage
                  image={null}
                  title={t("admin.loginHeading")}
                  subtitle={t("admin.loginDescription")}
                  variant="tour"
                  className="h-full min-h-[24rem]"
                />
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5 rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                    {t("admin.loginLabel")}
                  </p>
                  <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                    {t("admin.loginHeading")}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
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
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
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
    <div className="min-h-screen bg-[#f5efe7] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {adminSeo}
      <div className="mx-auto max-w-7xl">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
            <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                  {t("admin.dashboardLabel")}
                </p>
                <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {t("admin.dashboardHeading")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {t("admin.sessionExpires")}:{" "}
                  {expiresAt
                    ? formatDateTimeLabel(Number(expiresAt), language)
                    : t("admin.unknownExpiry")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setSuccess(t("admin.logoutSuccess"));
                }}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.logout")}
              </button>
            </div>

            {(error || success) && (
              <div className="border-t border-slate-100 px-6 py-4 lg:px-8 dark:border-white/10">
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {success}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <AdminTourForm
            form={form}
            editing={Boolean(editingId)}
            saving={saving}
            galleryImages={getFormGalleryImages(form)}
            imageFileNames={imageFiles.map((imageFile) => imageFile.name)}
            imagePreviewUrls={imagePreviewUrls}
            imageInputKey={imageInputKey}
            onChange={(event) => {
              const { name, value } = event.target;
              setForm((previousForm) => ({
                ...previousForm,
                [name]: value,
              }));
            }}
            onImageFileChange={handleImageFileChange}
            onClearImageFile={clearSelectedImageFile}
            onRemoveGalleryImage={handleRemoveGalleryImage}
            onMakeCoverImage={handleMakeCoverImage}
            onRemovePendingImage={handleRemovePendingImage}
            onLocalizedItemChange={handleLocalizedItemChange}
            onAddLocalizedItem={addLocalizedItem}
            onRemoveLocalizedItem={removeLocalizedItem}
            onSubmit={handleSubmit}
            onReset={resetForm}
          />

          <AdminBlogManager token={token} onUnauthorized={clearSession} />

          <AdminBookingRequestsPanel
            bookingRequests={bookingRequests}
            loading={bookingRequestsLoading}
            error={bookingRequestsError}
            actionId={bookingRequestActionId}
            onSave={handleSaveBookingRequest}
            onConvert={handleConvertBookingRequest}
          />

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

          <AdminReviewsPanel
            reviews={reviews}
            loading={reviewsLoading}
            actionId={reviewActionId}
            onApprove={handleApproveReview}
            onDelete={handleDeleteReview}
          />

          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                  {t("admin.existingTours")}
                </p>
                <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {t("admin.catalogEntries")}
                </h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {tours.length} {t("admin.tourCountSuffix")}
              </p>
            </div>

            <div className="mt-6">
              {loading ? (
                <LoadingSkeleton />
              ) : tours.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {tours.map((tour) => {
                    const tourTitle = getLocalized(tour.title, language);
                    const tourDestination = getLocalized(tour.destination, language);
                    const tourDescription = getLocalized(tour.description, language);
                    const tourDuration = getLocalized(tour.duration, language);

                    return (
                      <article
                        key={tour.id}
                        className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-slate-50 shadow-[0_22px_80px_-60px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-800/70 dark:shadow-[0_22px_80px_-60px_rgba(2,6,23,0.85)]"
                      >
                        <TravelImage
                          image={getTourCoverImage(tour)}
                          title={tourTitle}
                          subtitle={tourDestination}
                          variant="tour"
                          className="h-52"
                        />

                        <div className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                {tourDestination}
                              </p>
                              <h4 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                                {tourTitle}
                              </h4>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-950 shadow dark:bg-slate-950 dark:text-white">
                              {formatCurrencyValue(tour.price, tour.currency, language)}
                            </span>
                          </div>

                          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {tourDescription}
                          </p>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.3rem] bg-white p-4 dark:bg-slate-900">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                                {t("common.duration")}
                              </p>
                              <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                                {tourDuration}
                              </p>
                            </div>
                            <div className="rounded-[1.3rem] bg-white p-4 dark:bg-slate-900">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                                {t("common.updated")}
                              </p>
                              <p className="mt-2 font-semibold text-slate-950 dark:text-white">
                                {tour.updatedAt
                                  ? formatDateTimeLabel(tour.updatedAt, language)
                                  : t("common.recent")}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(tour.id);
                                setForm(toFormValues(tour));
                                clearSelectedImageFile();
                                setError("");
                                setSuccess("");
                              }}
                              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              {t("admin.editAction")}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(tour.id)}
                              className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                            >
                              {t("admin.deleteAction")}
                            </button>
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
        </section>
      </div>
    </div>
  );
}
