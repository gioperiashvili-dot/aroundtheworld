import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCurrencyValue, formatDateTimeLabel } from "../lib/formatters";

const BOOKING_STATUS_OPTIONS = ["active", "completed", "cancelled"];
const ALL_STATUS_FILTER = "all";
const STATUS_FILTER_OPTIONS = [ALL_STATUS_FILTER, ...BOOKING_STATUS_OPTIONS];
const MAX_BOOKING_PDF_BYTES = 10 * 1024 * 1024;
const CURRENCY_OPTIONS = [
  { value: "GEL", ka: "\u10DA\u10D0\u10E0\u10D8", en: "GEL" },
  { value: "USD", ka: "\u10D0\u10E8\u10E8 \u10D3\u10DD\u10DA\u10D0\u10E0\u10D8", en: "USD" },
  { value: "EUR", ka: "\u10D4\u10D5\u10E0\u10DD", en: "EUR" },
];

const LABELS = {
  ka: {
    label: "აქტიური ჯავშნები",
    heading: "აქტიური ჯავშნების მართვა",
    all: "ყველა",
    emptyTitle: "ჯავშნები ჯერ არ არის",
    emptyMessage: "აქტიური ჯავშნები აქ გამოჩნდება.",
    errorTitle: "ჯავშნების ჩატვირთვა ვერ მოხერხდა",
    save: "შენახვა",
    saving: "ინახება...",
    customer: "მომხმარებელი",
    email: "ელ. ფოსტა",
    phone: "ტელეფონი",
    title: "სათაური",
    category: "კატეგორია",
    status: "სტატუსი",
    startDate: "დაწყების თარიღი",
    endDate: "დასრულების თარიღი",
    totalPrice: "სრული ფასი",
    currency: "ვალუტა",
    paidAmount: "გადახდილი თანხა",
    paidPercent: "გადახდილია",
    remainingAmount: "დარჩენილი თანხა",
    includes: "შედის",
    description: "აღწერა",
    adminNote: "ადმინის შენიშვნა",
    originalRequestId: "მოთხოვნის ID",
    createdAt: "შეიქმნა",
    updatedAt: "განახლდა",
    pdfDocuments: "PDF დოკუმენტები",
    pdfUpload: "PDF ატვირთვა",
    fileName: "ფაილის სახელი",
    choosePdf: "PDF ფაილი",
    upload: "ატვირთვა",
    uploading: "იტვირთება...",
    download: "გადმოწერა",
    delete: "წაშლა",
    pdfType: "PDF",
    noFiles: "PDF დოკუმენტები ჯერ არ არის",
    deleteFileConfirm: "წავშალოთ PDF ფაილი?",
    noName: "სახელი არ არის",
    statuses: {
      active: "აქტიური",
      confirmed: "აქტიური",
      completed: "დასრულებული",
      cancelled: "გაუქმებული",
    },
    errors: {
      statusRequired: "სტატუსი აუცილებელია.",
      statusInvalid: "აირჩიეთ სტატუსი: აქტიური, დასრულებული ან გაუქმებული.",
      totalPriceInvalid: "სრული ფასი უნდა იყოს 0-ზე მეტი რიცხვი.",
      paidAmountInvalid: "გადახდილი თანხა უნდა იყოს 0 ან მეტი რიცხვი.",
      paidAmountTooHigh: "გადახდილი თანხა სრულ ფასს არ უნდა აღემატებოდეს.",
      currencyRequired: "ვალუტა აუცილებელია.",
      fileRequired: "აირჩიეთ PDF ფაილი.",
      pdfOnly: "მხოლოდ PDF ფაილის ატვირთვაა შესაძლებელი",
      fileTooLarge: "ფაილი ძალიან დიდია",
    },
  },
  en: {
    label: "Active bookings",
    heading: "Active booking management",
    all: "All",
    emptyTitle: "No bookings yet",
    emptyMessage: "Active bookings will appear here.",
    errorTitle: "Could not load bookings",
    save: "Save",
    saving: "Saving...",
    customer: "Customer",
    email: "Email",
    phone: "Phone",
    title: "Title",
    category: "Category",
    status: "Status",
    startDate: "Start date",
    endDate: "End date",
    totalPrice: "Total price",
    currency: "Currency",
    paidAmount: "Paid amount",
    paidPercent: "Paid",
    remainingAmount: "Remaining amount",
    includes: "Includes",
    description: "Description",
    adminNote: "Admin note",
    originalRequestId: "Request ID",
    createdAt: "Created",
    updatedAt: "Updated",
    pdfDocuments: "PDF documents",
    pdfUpload: "Upload PDF",
    fileName: "File name",
    choosePdf: "PDF file",
    upload: "Upload",
    uploading: "Uploading...",
    download: "Download",
    delete: "Delete",
    pdfType: "PDF",
    noFiles: "No PDF documents yet",
    deleteFileConfirm: "Delete this PDF file?",
    noName: "No name",
    statuses: {
      active: "Active",
      confirmed: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    errors: {
      statusRequired: "Status is required.",
      statusInvalid: "Choose active, completed, or cancelled.",
      totalPriceInvalid: "Total price must be a number greater than 0.",
      paidAmountInvalid: "Paid amount must be a number that is 0 or greater.",
      paidAmountTooHigh: "Paid amount cannot be greater than total price.",
      currencyRequired: "Currency is required.",
      fileRequired: "Choose a PDF file.",
      pdfOnly: "Only PDF files can be uploaded.",
      fileTooLarge: "The file is too large.",
    },
  },
};

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "confirmed" ? "active" : status;
}

function getFilterStatus(value) {
  return normalizeStatus(value);
}

function formatAdminDate(value, language) {
  return value ? formatDateTimeLabel(value, language) : "";
}

function formatAdminMoney(value, currency, language) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return formatCurrencyValue(amount, currency || "GEL", language);
}

function normalizeIncludes(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toIncludesTextarea(value) {
  return normalizeIncludes(value).join("\n");
}

function toDateInputValue(value) {
  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  return "";
}

function createDraft(booking) {
  return {
    status: normalizeStatus(booking?.status) || "active",
    adminNote: booking?.adminNote || "",
    paidAmount: booking?.paidAmount ?? "",
    totalPrice: booking?.totalPrice ?? "",
    currency: booking?.currency || "GEL",
    includes: toIncludesTextarea(booking?.includes),
    description: booking?.description || "",
    startDate: toDateInputValue(booking?.startDate),
    endDate: toDateInputValue(booking?.endDate),
  };
}

function createFileDraft() {
  return {
    file: null,
    inputKey: 0,
    name: "",
  };
}

function validateDraft(draft, labels) {
  const status = normalizeStatus(draft.status);
  const totalPrice = Number(draft.totalPrice);
  const paidAmount = Number(draft.paidAmount);

  if (!status) {
    return labels.errors.statusRequired;
  }

  if (!BOOKING_STATUS_OPTIONS.includes(status)) {
    return labels.errors.statusInvalid;
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return labels.errors.totalPriceInvalid;
  }

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    return labels.errors.paidAmountInvalid;
  }

  if (paidAmount > totalPrice) {
    return labels.errors.paidAmountTooHigh;
  }

  if (!String(draft.currency || "").trim()) {
    return labels.errors.currencyRequired;
  }

  return "";
}

function validatePdfDraft(draft, labels) {
  const file = draft?.file;
  const fileName = String(file?.name || "").trim();

  if (!file) {
    return labels.errors.fileRequired;
  }

  if (file.type !== "application/pdf" || !/\.pdf$/i.test(fileName)) {
    return labels.errors.pdfOnly;
  }

  if (file.size > MAX_BOOKING_PDF_BYTES) {
    return labels.errors.fileTooLarge;
  }

  return "";
}

function normalizeBookingFiles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((file) => file?.id);
}

function getBookingFileLabel(file, labels) {
  return file?.name || file?.originalName || labels.pdfType;
}

function getPaymentPreview(draft) {
  const totalPrice = Number(draft.totalPrice);
  const paidAmount = Number(draft.paidAmount);

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

export default function AdminBookingsPanel({
  actionId = "",
  bookings = [],
  error = "",
  loading = false,
  onDeleteFile = () => {},
  onDownloadFile = () => {},
  onSave = () => {},
  onUploadFile = () => {},
}) {
  const { language } = useLanguage();
  const labels = LABELS[language] || LABELS.ka;
  const [activeStatusFilter, setActiveStatusFilter] = useState(ALL_STATUS_FILTER);
  const [drafts, setDrafts] = useState({});
  const [draftErrors, setDraftErrors] = useState({});
  const [fileDrafts, setFileDrafts] = useState({});
  const [fileErrors, setFileErrors] = useState({});

  const counts = useMemo(() => {
    const nextCounts = {
      [ALL_STATUS_FILTER]: bookings.length,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((booking) => {
      const status = getFilterStatus(booking.status);

      if (Object.prototype.hasOwnProperty.call(nextCounts, status)) {
        nextCounts[status] += 1;
      }
    });

    return nextCounts;
  }, [bookings]);
  const filteredBookings = useMemo(() => {
    if (activeStatusFilter === ALL_STATUS_FILTER) {
      return bookings;
    }

    return bookings.filter(
      (booking) => getFilterStatus(booking.status) === activeStatusFilter
    );
  }, [activeStatusFilter, bookings]);

  useEffect(() => {
    setDrafts((previousDrafts) => {
      const nextDrafts = {};

      bookings.forEach((booking) => {
        nextDrafts[booking.id] = {
          ...createDraft(booking),
          ...(previousDrafts[booking.id] || {}),
        };
      });

      return nextDrafts;
    });
    setFileDrafts((previousDrafts) => {
      const nextDrafts = {};

      bookings.forEach((booking) => {
        nextDrafts[booking.id] = previousDrafts[booking.id] || createFileDraft();
      });

      return nextDrafts;
    });
    setFileErrors((previousErrors) => {
      const nextErrors = {};

      bookings.forEach((booking) => {
        nextErrors[booking.id] = previousErrors[booking.id] || "";
      });

      return nextErrors;
    });
  }, [bookings]);

  const updateDraft = (id, field, value) => {
    setDrafts((previousDrafts) => ({
      ...previousDrafts,
      [id]: {
        ...(previousDrafts[id] || {}),
        [field]: value,
      },
    }));
    setDraftErrors((previousErrors) => ({
      ...previousErrors,
      [id]: "",
    }));
  };

  const updateFileDraft = (id, field, value) => {
    setFileDrafts((previousDrafts) => ({
      ...previousDrafts,
      [id]: {
        ...(previousDrafts[id] || createFileDraft()),
        [field]: value,
      },
    }));
    setFileErrors((previousErrors) => ({
      ...previousErrors,
      [id]: "",
    }));
  };

  const resetFileDraft = (id) => {
    setFileDrafts((previousDrafts) => {
      const currentDraft = previousDrafts[id] || createFileDraft();

      return {
        ...previousDrafts,
        [id]: {
          file: null,
          inputKey: currentDraft.inputKey + 1,
          name: "",
        },
      };
    });
    setFileErrors((previousErrors) => ({
      ...previousErrors,
      [id]: "",
    }));
  };

  const handleFileChange = (id, file) => {
    const nextDraft = {
      ...(fileDrafts[id] || createFileDraft()),
      file,
    };
    const validationError = file ? validatePdfDraft(nextDraft, labels) : "";

    setFileDrafts((previousDrafts) => ({
      ...previousDrafts,
      [id]: nextDraft,
    }));
    setFileErrors((previousErrors) => ({
      ...previousErrors,
      [id]: validationError,
    }));
  };

  const submitDraft = (booking) => {
    const draft = drafts[booking.id] || createDraft(booking);
    const validationError = validateDraft(draft, labels);

    if (validationError) {
      setDraftErrors((previousErrors) => ({
        ...previousErrors,
        [booking.id]: validationError,
      }));
      return;
    }

    onSave(booking.id, {
      status: normalizeStatus(draft.status),
      adminNote: draft.adminNote.trim(),
      paidAmount: Number(draft.paidAmount),
      totalPrice: Number(draft.totalPrice),
      currency: draft.currency.trim().toUpperCase(),
      includes: normalizeIncludes(draft.includes),
      description: draft.description.trim(),
      startDate: draft.startDate.trim(),
      endDate: draft.endDate.trim(),
    });
  };

  const submitFileDraft = async (booking) => {
    const fileDraft = fileDrafts[booking.id] || createFileDraft();
    const validationError = validatePdfDraft(fileDraft, labels);

    if (validationError) {
      setFileErrors((previousErrors) => ({
        ...previousErrors,
        [booking.id]: validationError,
      }));
      return;
    }

    const succeeded = await Promise.resolve(
      onUploadFile(booking.id, fileDraft.file, fileDraft.name.trim())
    );

    if (succeeded !== false) {
      resetFileDraft(booking.id);
    }
  };

  const deleteBookingFile = (booking, file) => {
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(labels.deleteFileConfirm);

      if (!shouldDelete) {
        return;
      }
    }

    void onDeleteFile(booking.id, file.id);
  };

  return (
    <div className="overflow-hidden rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
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
                onClick={() => setActiveStatusFilter(status)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                  isActive
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-[#f7f1e8] text-slate-700 hover:bg-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                className="h-96 animate-pulse rounded-[1.5rem] bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : error ? null : filteredBookings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBookings.map((booking) => {
              const draft = drafts[booking.id] || createDraft(booking);
              const isBusy = actionId === booking.id;
              const customerName = booking.customerName || labels.noName;
              const paymentPreview = getPaymentPreview(draft);
              const includes = normalizeIncludes(booking.includes);
              const draftError = draftErrors[booking.id] || "";
              const bookingFiles = normalizeBookingFiles(booking.files);
              const fileDraft = fileDrafts[booking.id] || createFileDraft();
              const fileError = fileErrors[booking.id] || "";

              return (
                <article
                  key={booking.id}
                  className="rounded-[1.7rem] border border-[#efe4d4] bg-white p-5 shadow-[0_22px_80px_-62px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-800/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {booking.title || booking.tourTitle || labels.title}
                      </h4>
                      <p className="mt-2 text-sm font-semibold text-[#c26b45] dark:text-orange-200">
                        {customerName}
                      </p>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-[#eef8ef] px-3 py-1.5 text-xs font-semibold text-[#2f6f55] dark:bg-emerald-500/10 dark:text-emerald-200">
                      {labels.statuses[booking.status] || booking.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <BookingMeta label={labels.email} value={booking.customerEmail} />
                    <BookingMeta label={labels.phone} value={booking.phone} />
                    <BookingMeta label={labels.category} value={booking.category} />
                    <BookingMeta label={labels.startDate} value={booking.startDate} />
                    <BookingMeta label={labels.endDate} value={booking.endDate} />
                    <BookingMeta
                      label={labels.totalPrice}
                      value={formatAdminMoney(
                        booking.totalPrice,
                        booking.currency,
                        language
                      )}
                    />
                    <BookingMeta label={labels.currency} value={booking.currency} />
                    <BookingMeta
                      label={labels.paidAmount}
                      value={formatAdminMoney(
                        booking.paidAmount,
                        booking.currency,
                        language
                      )}
                    />
                    <BookingMeta
                      label={labels.paidPercent}
                      value={
                        typeof booking.paidPercent === "number"
                          ? `${booking.paidPercent}%`
                          : booking.paidPercent
                      }
                    />
                    <BookingMeta
                      label={labels.remainingAmount}
                      value={formatAdminMoney(
                        booking.remainingAmount,
                        booking.currency,
                        language
                      )}
                    />
                    <BookingMeta
                      label={labels.originalRequestId}
                      value={booking.originalRequestId}
                    />
                    <BookingMeta
                      label={labels.createdAt}
                      value={formatAdminDate(booking.createdAt, language)}
                    />
                    <BookingMeta
                      label={labels.updatedAt}
                      value={formatAdminDate(booking.updatedAt, language)}
                    />
                  </div>

                  {booking.description ? (
                    <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{labels.description}:</span>{" "}
                      {booking.description}
                    </p>
                  ) : null}

                  {includes.length > 0 ? (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {labels.includes}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {includes.map((item) => (
                          <li
                            key={item}
                            className="text-sm leading-6 text-slate-700 dark:text-slate-300"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {booking.adminNote ? (
                    <p className="mt-4 rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                      {labels.adminNote}: {booking.adminNote}
                    </p>
                  ) : null}

                  <BookingFilesSection
                    booking={booking}
                    disabled={isBusy}
                    draft={fileDraft}
                    error={fileError}
                    files={bookingFiles}
                    labels={labels}
                    onDelete={deleteBookingFile}
                    onDownload={onDownloadFile}
                    onFileChange={handleFileChange}
                    onNameChange={(value) =>
                      updateFileDraft(booking.id, "name", value)
                    }
                    onUpload={submitFileDraft}
                  />

                  <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {draftError ? (
                      <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        {draftError}
                      </p>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {labels.status}
                        </span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(booking.id, "status", event.target.value)
                          }
                          disabled={isBusy}
                          className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                        >
                          {BOOKING_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {labels.statuses[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <BookingInput
                        label={labels.totalPrice}
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.totalPrice}
                        onChange={(value) =>
                          updateDraft(booking.id, "totalPrice", value)
                        }
                        disabled={isBusy}
                      />
                      <BookingInput
                        label={labels.paidAmount}
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.paidAmount}
                        onChange={(value) =>
                          updateDraft(booking.id, "paidAmount", value)
                        }
                        disabled={isBusy}
                      />
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {labels.currency}
                        </span>
                        <select
                          value={draft.currency}
                          onChange={(event) =>
                            updateDraft(booking.id, "currency", event.target.value)
                          }
                          disabled={isBusy}
                          className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                        >
                          {CURRENCY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {language === "ka" ? option.ka : option.en}
                            </option>
                          ))}
                        </select>
                      </label>
                      <BookingInput
                        label={labels.startDate}
                        type="date"
                        value={draft.startDate}
                        onChange={(value) =>
                          updateDraft(booking.id, "startDate", value)
                        }
                        disabled={isBusy}
                      />
                      <BookingInput
                        label={labels.endDate}
                        type="date"
                        value={draft.endDate}
                        onChange={(value) =>
                          updateDraft(booking.id, "endDate", value)
                        }
                        disabled={isBusy}
                      />
                      <div className="grid gap-2 rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {labels.remainingAmount}:{" "}
                          {Number.isFinite(paymentPreview.remainingAmount)
                            ? formatAdminMoney(
                                paymentPreview.remainingAmount,
                                draft.currency,
                                language
                              )
                            : 0}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {labels.paidPercent}: {paymentPreview.paidPercent}%
                        </span>
                      </div>
                    </div>

                    <BookingTextarea
                      label={labels.description}
                      value={draft.description}
                      onChange={(value) =>
                        updateDraft(booking.id, "description", value)
                      }
                      disabled={isBusy}
                      rows={3}
                    />
                    <BookingTextarea
                      label={labels.includes}
                      value={draft.includes}
                      onChange={(value) => updateDraft(booking.id, "includes", value)}
                      disabled={isBusy}
                      rows={4}
                    />
                    <BookingTextarea
                      label={labels.adminNote}
                      value={draft.adminNote}
                      onChange={(value) =>
                        updateDraft(booking.id, "adminNote", value)
                      }
                      disabled={isBusy}
                      rows={4}
                    />

                    <button
                      type="button"
                      onClick={() => submitDraft(booking)}
                      disabled={isBusy}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                      {isBusy ? labels.saving : labels.save}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-[#efe4d4] bg-[#faf4ea] p-6 dark:border-white/10 dark:bg-slate-800/70">
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

function BookingFilesSection({
  booking,
  disabled,
  draft,
  error,
  files,
  labels,
  onDelete,
  onDownload,
  onFileChange,
  onNameChange,
  onUpload,
}) {
  return (
    <section className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {labels.pdfDocuments}
        </p>
        <span className="inline-flex w-fit rounded-full bg-[#faf4ea] px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {files.length} {labels.pdfType}
        </span>
      </div>

      {files.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-col gap-3 rounded-[1.1rem] bg-[#faf4ea] p-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {getBookingFileLabel(file, labels)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {labels.pdfType}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDownload(booking.id, file)}
                  disabled={disabled}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:text-slate-500"
                >
                  {labels.download}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(booking, file)}
                  disabled={disabled}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                >
                  {labels.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-[1.1rem] bg-[#faf4ea] px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {labels.noFiles}
        </p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {labels.choosePdf}
          </span>
          <input
            key={draft.inputKey}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) =>
              onFileChange(booking.id, event.target.files?.[0] || null)
            }
            disabled={disabled}
            className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm text-slate-900 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:border-[#c26b45] focus:outline-none focus:ring-4 focus:ring-[#c26b45]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:file:bg-white dark:file:text-slate-950 dark:focus:border-orange-200 dark:focus:ring-orange-200/20 dark:disabled:bg-slate-800"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {labels.fileName}
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={disabled}
            placeholder={labels.fileName}
            className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20 dark:disabled:bg-slate-800"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            void onUpload(booking);
          }}
          disabled={disabled}
          className="self-end rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          {disabled ? labels.uploading : labels.upload}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function BookingInput({
  disabled = false,
  label,
  min,
  onChange,
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
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
      />
    </label>
  );
}

function BookingTextarea({ disabled = false, label, onChange, rows, value }) {
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
        className="w-full resize-none rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
      />
    </label>
  );
}

function BookingMeta({ label, value }) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <div className="rounded-[1.1rem] bg-[#faf4ea] p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
