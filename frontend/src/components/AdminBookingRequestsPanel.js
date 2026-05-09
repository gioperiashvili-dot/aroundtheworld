import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDateTimeLabel } from "../lib/formatters";

const STATUS_OPTIONS = [
  "pending",
  "contacted",
  "waiting_payment",
  "converted",
  "cancelled",
];
const ALL_STATUS_FILTER = "all";
const STATUS_FILTER_OPTIONS = [ALL_STATUS_FILTER, ...STATUS_OPTIONS];
const BOOKING_CATEGORY_OPTIONS = [
  "tour-package",
  "flight-ticket",
  "hotel-booking",
  "restaurant-reservation",
  "visa-service",
  "custom-tour",
  "custom-service",
  "transfer",
  "insurance",
  "other",
];

const LABELS = {
  ka: {
    label: "ჯავშნის მოთხოვნები",
    heading: "ჯავშნის მოთხოვნების მართვა",
    countSuffix: "მოთხოვნა",
    all: "ყველა",
    emptyTitle: "მოთხოვნები ჯერ არ არის",
    emptyMessage: "ახალი მოთხოვნები აქ გამოჩნდება.",
    errorTitle: "მოთხოვნების ჩატვირთვა ვერ მოხერხდა",
    save: "შენახვა",
    saving: "ინახება...",
    customer: "მომხმარებელი",
    email: "ელ. ფოსტა",
    phone: "ტელეფონი",
    tour: "ტური",
    tourId: "ტურის ID",
    message: "შეტყობინება",
    status: "სტატუსი",
    adminNote: "ადმინის შენიშვნა",
    createdAt: "შეიქმნა",
    updatedAt: "განახლდა",
    noName: "სახელი არ არის",
    convertedBookingId: "აქტიური ჯავშნის ID",
    convert: "აქტიურ ჯავშნად გადაქცევა",
    closeConversion: "ფორმის დახურვა",
    conversionTitle: "აქტიური ჯავშნის დეტალები",
    createBooking: "აქტიური ჯავშნის შექმნა",
    alreadyConverted: "უკვე გადაყვანილია აქტიურ ჯავშანში",
    title: "სათაური",
    category: "კატეგორია",
    totalPrice: "სრული ფასი",
    currency: "ვალუტა",
    paidAmount: "გადახდილი თანხა",
    startDate: "დაწყების თარიღი",
    endDate: "დასრულების თარიღი",
    description: "აღწერა",
    includes: "შედის",
    remainingAmount: "დარჩენილი თანხა",
    paidPercent: "გადახდილია",
    chooseCategory: "აირჩიეთ კატეგორია",
    errors: {
      registeredUserRequired:
        "სტუმრის მოთხოვნის აქტიურ ჯავშნად გადაქცევა შეუძლებელია. მოთხოვნა რეგისტრირებულ მომხმარებელს უნდა ეკუთვნოდეს.",
      titleRequired: "სათაური აუცილებელია.",
      categoryRequired: "კატეგორია აუცილებელია.",
      currencyRequired: "ვალუტა აუცილებელია.",
      totalPriceInvalid: "სრული ფასი უნდა იყოს 0-ზე მეტი რიცხვი.",
      paidAmountInvalid: "გადახდილი თანხა უნდა იყოს 0-ზე მეტი რიცხვი.",
      paidAmountTooHigh: "გადახდილი თანხა სრულ ფასს არ უნდა აღემატებოდეს.",
      minimumPayment:
        "აქტიური ჯავშნის შესაქმნელად გადახდილი უნდა იყოს სრული ფასის მინიმუმ 30%.",
      alreadyConverted:
        "ეს მოთხოვნა უკვე გადაყვანილია აქტიურ ჯავშანში.",
    },
    statuses: {
      pending: "მოლოდინში",
      contacted: "დაკავშირებულია",
      waiting_payment: "გადახდის მოლოდინში",
      converted: "გადაყვანილია აქტიურ ჯავშანში",
      cancelled: "გაუქმებულია",
    },
  },
  en: {
    label: "Booking requests",
    heading: "Booking request management",
    countSuffix: "requests",
    all: "All",
    emptyTitle: "No requests yet",
    emptyMessage: "New booking requests will appear here.",
    errorTitle: "Could not load booking requests",
    save: "Save",
    saving: "Saving...",
    customer: "Customer",
    email: "Email",
    phone: "Phone",
    tour: "Tour",
    tourId: "Tour ID",
    message: "Message",
    status: "Status",
    adminNote: "Admin note",
    createdAt: "Created",
    updatedAt: "Updated",
    noName: "No name",
    convertedBookingId: "Active booking ID",
    convert: "Convert to active booking",
    closeConversion: "Close form",
    conversionTitle: "Active booking details",
    createBooking: "Create active booking",
    alreadyConverted: "Already converted to an active booking",
    title: "Title",
    category: "Category",
    totalPrice: "Total price",
    currency: "Currency",
    paidAmount: "Paid amount",
    startDate: "Start date",
    endDate: "End date",
    description: "Description",
    includes: "Includes",
    remainingAmount: "Remaining amount",
    paidPercent: "Paid",
    chooseCategory: "Choose category",
    errors: {
      registeredUserRequired:
        "Guest requests cannot be converted. The request must belong to a registered user.",
      titleRequired: "Title is required.",
      categoryRequired: "Category is required.",
      currencyRequired: "Currency is required.",
      totalPriceInvalid: "Total price must be a number greater than 0.",
      paidAmountInvalid: "Paid amount must be a number greater than 0.",
      paidAmountTooHigh: "Paid amount cannot be greater than total price.",
      minimumPayment:
        "At least 30% of the total price must be paid before creating an active booking.",
      alreadyConverted: "This request is already converted to an active booking.",
    },
    statuses: {
      pending: "Pending",
      contacted: "Contacted",
      waiting_payment: "Waiting for payment",
      converted: "Marked converted",
      cancelled: "Cancelled",
    },
  },
};

function formatAdminDate(value, language) {
  return value ? formatDateTimeLabel(value, language) : "";
}

function isTourBasedRequest(request) {
  return Boolean(
    request?.tourId ||
      request?.tourTitle ||
      String(request?.serviceType || "").trim().toLowerCase() === "tour"
  );
}

function getDefaultCategory(request) {
  if (isTourBasedRequest(request)) {
    return "tour-package";
  }

  return BOOKING_CATEGORY_OPTIONS.includes(request?.category) ? request.category : "";
}

function createConversionDraft(request) {
  return {
    title: request?.tourTitle || "",
    category: getDefaultCategory(request),
    totalPrice: "",
    currency: "USD",
    paidAmount: "",
    startDate: "",
    endDate: "",
    description: "",
    includes: "",
    adminNote: request?.adminNote || "",
  };
}

function normalizeIncludesInput(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCalculatedPayment(draft) {
  const totalPrice = Number(draft?.totalPrice);
  const paidAmount = Number(draft?.paidAmount);

  if (!Number.isFinite(totalPrice) || !Number.isFinite(paidAmount) || totalPrice <= 0) {
    return {
      paidPercent: 0,
      remainingAmount: 0,
    };
  }

  return {
    paidPercent: Math.round((paidAmount / totalPrice) * 100),
    remainingAmount: Number((totalPrice - paidAmount).toFixed(2)),
  };
}

function validateConversionDraft(request, draft, labels) {
  const totalPrice = Number(draft.totalPrice);
  const paidAmount = Number(draft.paidAmount);

  if (request.convertedBookingId) {
    return labels.errors.alreadyConverted;
  }

  if (!request.uid) {
    return labels.errors.registeredUserRequired;
  }

  if (!String(draft.title || "").trim()) {
    return labels.errors.titleRequired;
  }

  if (!String(draft.category || "").trim()) {
    return labels.errors.categoryRequired;
  }

  if (!String(draft.currency || "").trim()) {
    return labels.errors.currencyRequired;
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return labels.errors.totalPriceInvalid;
  }

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return labels.errors.paidAmountInvalid;
  }

  if (paidAmount > totalPrice) {
    return labels.errors.paidAmountTooHigh;
  }

  if (paidAmount < totalPrice * 0.3) {
    return labels.errors.minimumPayment;
  }

  return "";
}

export default function AdminBookingRequestsPanel({
  actionId = "",
  bookingRequests = [],
  error = "",
  loading = false,
  onConvert = () => {},
  onSave = () => {},
}) {
  const { language } = useLanguage();
  const labels = LABELS[language] || LABELS.ka;
  const [drafts, setDrafts] = useState({});
  const [activeConversionId, setActiveConversionId] = useState("");
  const [conversionDrafts, setConversionDrafts] = useState({});
  const [conversionErrors, setConversionErrors] = useState({});
  const [activeStatusFilter, setActiveStatusFilter] = useState(ALL_STATUS_FILTER);
  const counts = useMemo(
    () => {
      const statusCounts = STATUS_OPTIONS.reduce(
        (nextCounts, status) => {
          nextCounts[status] = bookingRequests.filter(
            (request) => request.status === status
          ).length;
          return nextCounts;
        },
        { [ALL_STATUS_FILTER]: bookingRequests.length }
      );

      return statusCounts;
    },
    [bookingRequests]
  );
  const filteredBookingRequests = useMemo(() => {
    if (activeStatusFilter === ALL_STATUS_FILTER) {
      return bookingRequests;
    }

    return bookingRequests.filter(
      (request) => request.status === activeStatusFilter
    );
  }, [activeStatusFilter, bookingRequests]);

  useEffect(() => {
    setDrafts((previousDrafts) => {
      const nextDrafts = {};

      bookingRequests.forEach((request) => {
        nextDrafts[request.id] = {
          status: previousDrafts[request.id]?.status || request.status || "pending",
          adminNote:
            previousDrafts[request.id]?.adminNote ?? request.adminNote ?? "",
        };
      });

      return nextDrafts;
    });

    setConversionDrafts((previousDrafts) => {
      const nextDrafts = {};

      bookingRequests.forEach((request) => {
        nextDrafts[request.id] = {
          ...createConversionDraft(request),
          ...(previousDrafts[request.id] || {}),
        };
      });

      return nextDrafts;
    });
  }, [bookingRequests]);

  const updateDraft = (id, field, value) => {
    setDrafts((previousDrafts) => ({
      ...previousDrafts,
      [id]: {
        ...(previousDrafts[id] || {}),
        [field]: value,
      },
    }));
  };

  const updateConversionDraft = (id, field, value) => {
    setConversionDrafts((previousDrafts) => ({
      ...previousDrafts,
      [id]: {
        ...(previousDrafts[id] || {}),
        [field]: value,
      },
    }));
    setConversionErrors((previousErrors) => ({
      ...previousErrors,
      [id]: "",
    }));
  };

  const toggleConversionForm = (request) => {
    setConversionDrafts((previousDrafts) => ({
      ...previousDrafts,
      [request.id]: previousDrafts[request.id] || createConversionDraft(request),
    }));
    setConversionErrors((previousErrors) => ({
      ...previousErrors,
      [request.id]: "",
    }));
    setActiveConversionId((currentId) =>
      currentId === request.id ? "" : request.id
    );
  };

  const submitConversion = (request) => {
    const draft = conversionDrafts[request.id] || createConversionDraft(request);
    const validationError = validateConversionDraft(request, draft, labels);

    if (validationError) {
      setConversionErrors((previousErrors) => ({
        ...previousErrors,
        [request.id]: validationError,
      }));
      return;
    }

    onConvert(request.id, {
      title: draft.title.trim(),
      category: draft.category.trim(),
      totalPrice: Number(draft.totalPrice),
      currency: draft.currency.trim().toUpperCase(),
      paidAmount: Number(draft.paidAmount),
      startDate: draft.startDate.trim(),
      endDate: draft.endDate.trim(),
      description: draft.description.trim(),
      includes: normalizeIncludesInput(draft.includes),
      adminNote: draft.adminNote.trim(),
    });
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
            {labels.label}
          </p>
          <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {labels.heading}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {STATUS_FILTER_OPTIONS.map((status) => {
            const isActive = activeStatusFilter === status;
            const label =
              status === ALL_STATUS_FILTER ? labels.all : labels.statuses[status];

            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setActiveStatusFilter(status);
                  setActiveConversionId("");
                }}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                  isActive
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950"
                      : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {counts[status] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="text-sm font-semibold">{labels.errorTitle}</p>
          <p className="mt-1 text-sm leading-6">{error}</p>
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-[1.5rem] bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : error ? null : filteredBookingRequests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBookingRequests.map((request) => {
              const draft = drafts[request.id] || {
                status: request.status || "pending",
                adminNote: request.adminNote || "",
              };
              const isBusy = actionId === request.id;
              const customerName =
                request.customerName || request.displayName || labels.noName;
              const conversionDraft =
                conversionDrafts[request.id] || createConversionDraft(request);
              const conversionError = conversionErrors[request.id] || "";
              const isConversionOpen = activeConversionId === request.id;
              const isConverted = Boolean(request.convertedBookingId);
              const paymentPreview = getCalculatedPayment(conversionDraft);

              return (
                <article
                  key={request.id}
                  className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-800/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {customerName}
                      </h4>
                      {request.tourTitle ? (
                        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {request.tourTitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                      {labels.statuses[request.status] || request.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <RequestMeta label={labels.email} value={request.email} />
                    <RequestMeta label={labels.phone} value={request.phone} />
                    <RequestMeta label={labels.tourId} value={request.tourId} />
                    <RequestMeta
                      label={labels.createdAt}
                      value={formatAdminDate(request.createdAt, language)}
                    />
                    <RequestMeta
                      label={labels.updatedAt}
                      value={formatAdminDate(request.updatedAt, language)}
                    />
                    <RequestMeta
                      label={labels.convertedBookingId}
                      value={request.convertedBookingId}
                    />
                  </div>

                  {request.message ? (
                    <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{labels.message}:</span>{" "}
                      {request.message}
                    </p>
                  ) : null}

                  <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {labels.status}
                      </span>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          updateDraft(request.id, "status", event.target.value)
                        }
                        disabled={isBusy}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {labels.statuses[status]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {labels.adminNote}
                      </span>
                      <textarea
                        value={draft.adminNote}
                        onChange={(event) =>
                          updateDraft(request.id, "adminNote", event.target.value)
                        }
                        disabled={isBusy}
                        rows={4}
                        maxLength={1500}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onSave(request.id, draft)}
                      disabled={isBusy}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                      {isBusy ? labels.saving : labels.save}
                    </button>

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                      {isConverted ? (
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {labels.alreadyConverted}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleConversionForm(request)}
                          disabled={isBusy}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                        >
                          {isConversionOpen
                            ? labels.closeConversion
                            : labels.convert}
                        </button>
                      )}

                      {isConversionOpen && !isConverted ? (
                        <div className="mt-4 space-y-4">
                          <h5 className="text-sm font-semibold text-slate-950 dark:text-white">
                            {labels.conversionTitle}
                          </h5>

                          {conversionError ? (
                            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                              {conversionError}
                            </p>
                          ) : null}

                          <div className="grid gap-4 sm:grid-cols-2">
                            <ConversionInput
                              label={labels.title}
                              value={conversionDraft.title}
                              onChange={(value) =>
                                updateConversionDraft(request.id, "title", value)
                              }
                              disabled={isBusy}
                              required
                            />
                            <label className="block space-y-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {labels.category}
                              </span>
                              <select
                                value={conversionDraft.category}
                                onChange={(event) =>
                                  updateConversionDraft(
                                    request.id,
                                    "category",
                                    event.target.value
                                  )
                                }
                                disabled={isBusy}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                              >
                                <option value="">{labels.chooseCategory}</option>
                                {BOOKING_CATEGORY_OPTIONS.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <ConversionInput
                              label={labels.totalPrice}
                              type="number"
                              min="0"
                              step="0.01"
                              value={conversionDraft.totalPrice}
                              onChange={(value) =>
                                updateConversionDraft(
                                  request.id,
                                  "totalPrice",
                                  value
                                )
                              }
                              disabled={isBusy}
                              required
                            />
                            <ConversionInput
                              label={labels.currency}
                              value={conversionDraft.currency}
                              onChange={(value) =>
                                updateConversionDraft(request.id, "currency", value)
                              }
                              disabled={isBusy}
                              required
                            />
                            <ConversionInput
                              label={labels.paidAmount}
                              type="number"
                              min="0"
                              step="0.01"
                              value={conversionDraft.paidAmount}
                              onChange={(value) =>
                                updateConversionDraft(
                                  request.id,
                                  "paidAmount",
                                  value
                                )
                              }
                              disabled={isBusy}
                              required
                            />
                            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {labels.remainingAmount}:{" "}
                                {Number.isFinite(paymentPreview.remainingAmount)
                                  ? paymentPreview.remainingAmount
                                  : 0}
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {labels.paidPercent}: {paymentPreview.paidPercent}%
                              </span>
                            </div>
                            <ConversionInput
                              label={labels.startDate}
                              type="date"
                              value={conversionDraft.startDate}
                              onChange={(value) =>
                                updateConversionDraft(
                                  request.id,
                                  "startDate",
                                  value
                                )
                              }
                              disabled={isBusy}
                            />
                            <ConversionInput
                              label={labels.endDate}
                              type="date"
                              value={conversionDraft.endDate}
                              onChange={(value) =>
                                updateConversionDraft(request.id, "endDate", value)
                              }
                              disabled={isBusy}
                            />
                          </div>

                          <ConversionTextarea
                            label={labels.description}
                            value={conversionDraft.description}
                            onChange={(value) =>
                              updateConversionDraft(
                                request.id,
                                "description",
                                value
                              )
                            }
                            disabled={isBusy}
                            rows={3}
                          />
                          <ConversionTextarea
                            label={labels.includes}
                            value={conversionDraft.includes}
                            onChange={(value) =>
                              updateConversionDraft(request.id, "includes", value)
                            }
                            disabled={isBusy}
                            rows={4}
                          />
                          <ConversionTextarea
                            label={labels.adminNote}
                            value={conversionDraft.adminNote}
                            onChange={(value) =>
                              updateConversionDraft(request.id, "adminNote", value)
                            }
                            disabled={isBusy}
                            rows={3}
                          />

                          <button
                            type="button"
                            onClick={() => submitConversion(request)}
                            disabled={isBusy}
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                          >
                            {isBusy ? labels.saving : labels.createBooking}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] bg-slate-50 p-6 dark:bg-slate-800/70">
            <h4 className="font-semibold text-slate-950 dark:text-white">
              {labels.emptyTitle}
            </h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {labels.emptyMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversionInput({
  disabled = false,
  label,
  min,
  onChange,
  required = false,
  step,
  type = "text",
  value,
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
      />
    </label>
  );
}

function ConversionTextarea({ disabled = false, label, onChange, rows, value }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
      />
    </label>
  );
}

function RequestMeta({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-[1.1rem] bg-white p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
