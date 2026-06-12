import { useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCurrencyValue, formatDateTimeLabel } from "../lib/formatters";

const BOOKING_STATUS_OPTIONS = ["active", "completed", "cancelled"];
const CURRENCY_OPTIONS = ["GEL", "USD", "EUR"];
const SERVICE_TYPE_OPTIONS = [
  { value: "custom-tour", ka: "ინდივიდუალური ტური", en: "Individual tour" },
  { value: "flight-ticket", ka: "ავიაბილეთი", en: "Flight ticket" },
  { value: "hotel-booking", ka: "სასტუმრო", en: "Hotel" },
  { value: "visa-service", ka: "ვიზა", en: "Visa" },
  { value: "travel-package", ka: "სამოგზაურო პაკეტი", en: "Travel package" },
  { value: "other", ka: "სხვა", en: "Other" },
];

const LABELS = {
  ka: {
    label: "მომხმარებლები",
    heading: "რეგისტრირებული მომხმარებლები",
    search: "ძებნა",
    searchPlaceholder: "სახელი, ელ. ფოსტა, ტელეფონი ან UID",
    emptyTitle: "მომხმარებლები ვერ მოიძებნა",
    emptyMessage: "Firebase Auth მომხმარებლები აქ გამოჩნდება.",
    errorTitle: "მომხმარებლების ჩატვირთვა ვერ მოხერხდა",
    noName: "სახელი არ არის",
    noEmail: "ელ. ფოსტა არ არის",
    uid: "UID",
    email: "ელ. ფოსტა",
    phone: "ტელეფონი",
    provider: "პროვაიდერი",
    emailVerified: "ელ. ფოსტა",
    verified: "დადასტურებულია",
    notVerified: "არ არის დადასტურებული",
    profileExists: "Firestore პროფილი",
    profileYes: "არის",
    profileNo: "არ არის",
    createdAt: "შეიქმნა",
    lastSignInAt: "ბოლო შესვლა",
    activeBookings: "აქტიური",
    completedBookings: "დასრულებული",
    bookingRequests: "მოთხოვნები",
    createBooking: "ინდივიდუალური ჯავშნის შექმნა",
    modalTitle: "ინდივიდუალური ჯავშანი",
    selectedUser: "მომხმარებელი",
    title: "ჯავშნის სათაური",
    serviceType: "სერვისის ტიპი",
    description: "აღწერა",
    startDate: "დაწყების თარიღი",
    endDate: "დასრულების თარიღი",
    totalPrice: "ჯამური ღირებულება",
    paidAmount: "გადახდილი თანხა",
    currency: "ვალუტა",
    includes: "შედის",
    adminNote: "ადმინისტრატორის შენიშვნა",
    status: "სტატუსი",
    remainingAmount: "დარჩენილი თანხა",
    paidPercent: "გადახდილია",
    cancel: "გაუქმება",
    submit: "შექმნა",
    submitting: "იქმნება...",
    providers: {
      google: "Google",
      email: "Email",
      other: "Other",
    },
    statuses: {
      active: "აქტიური",
      completed: "დასრულებული",
      cancelled: "გაუქმებული",
    },
    errors: {
      titleRequired: "სათაური აუცილებელია.",
      totalPriceInvalid: "ჯამური ღირებულება უნდა იყოს 0-ზე მეტი რიცხვი.",
      paidAmountInvalid: "გადახდილი თანხა უნდა იყოს 0 ან მეტი რიცხვი.",
      paidAmountTooHigh: "გადახდილი თანხა ჯამურ ღირებულებას არ უნდა აღემატებოდეს.",
      currencyRequired: "ვალუტა აუცილებელია.",
      statusInvalid: "აირჩიეთ სტატუსი: აქტიური, დასრულებული ან გაუქმებული.",
      submitFailed: "ჯავშნის შექმნა ვერ მოხერხდა.",
    },
  },
  en: {
    label: "Users",
    heading: "Registered users",
    search: "Search",
    searchPlaceholder: "Name, email, phone, or UID",
    emptyTitle: "No users found",
    emptyMessage: "Firebase Auth users will appear here.",
    errorTitle: "Could not load users",
    noName: "No name",
    noEmail: "No email",
    uid: "UID",
    email: "Email",
    phone: "Phone",
    provider: "Provider",
    emailVerified: "Email",
    verified: "Verified",
    notVerified: "Not verified",
    profileExists: "Firestore profile",
    profileYes: "Exists",
    profileNo: "Missing",
    createdAt: "Created",
    lastSignInAt: "Last sign-in",
    activeBookings: "Active",
    completedBookings: "Completed",
    bookingRequests: "Requests",
    createBooking: "Create custom booking",
    modalTitle: "Custom booking",
    selectedUser: "User",
    title: "Booking title",
    serviceType: "Service type",
    description: "Description",
    startDate: "Start date",
    endDate: "End date",
    totalPrice: "Total price",
    paidAmount: "Paid amount",
    currency: "Currency",
    includes: "Includes",
    adminNote: "Admin note",
    status: "Status",
    remainingAmount: "Remaining amount",
    paidPercent: "Paid",
    cancel: "Cancel",
    submit: "Create",
    submitting: "Creating...",
    providers: {
      google: "Google",
      email: "Email",
      other: "Other",
    },
    statuses: {
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    errors: {
      titleRequired: "Title is required.",
      totalPriceInvalid: "Total price must be a number greater than 0.",
      paidAmountInvalid: "Paid amount must be a number that is 0 or greater.",
      paidAmountTooHigh: "Paid amount cannot be greater than total price.",
      currencyRequired: "Currency is required.",
      statusInvalid: "Choose active, completed, or cancelled.",
      submitFailed: "Could not create booking.",
    },
  },
};

function createEmptyForm() {
  return {
    title: "",
    serviceType: SERVICE_TYPE_OPTIONS[0].value,
    description: "",
    startDate: "",
    endDate: "",
    totalPrice: "",
    paidAmount: "0",
    currency: "GEL",
    includes: "",
    adminNote: "",
    status: "active",
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeIncludes(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUserName(user, labels) {
  return (
    normalizeText(user?.name) ||
    normalizeText(user?.displayName) ||
    normalizeText(user?.email) ||
    labels.noName
  );
}

function getUserPhone(user) {
  return normalizeText(user?.phone) || normalizeText(user?.phoneNumber);
}

function getProviderType(user) {
  const providerIds = Array.isArray(user?.providerIds) ? user.providerIds : [];

  if (providerIds.includes("google.com")) {
    return "google";
  }

  if (providerIds.includes("password")) {
    return "email";
  }

  return "other";
}

function getProviderLabel(user, labels) {
  return labels.providers[getProviderType(user)] || labels.providers.other;
}

function getProviderClass(user) {
  const providerType = getProviderType(user);

  if (providerType === "google") {
    return "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200";
  }

  if (providerType === "email") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function getInitials(user, labels) {
  return getUserName(user, labels)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatAdminDate(value, language) {
  return value ? formatDateTimeLabel(value, language) : "";
}

function getSearchText(user) {
  return [
    user?.uid,
    user?.email,
    user?.displayName,
    user?.name,
    user?.phone,
    user?.phoneNumber,
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function getPaymentPreview(form) {
  const totalPrice = Number(form.totalPrice);
  const paidAmount = Number(form.paidAmount || 0);

  if (!Number.isFinite(totalPrice) || totalPrice <= 0 || !Number.isFinite(paidAmount)) {
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

function validateForm(form, labels) {
  const totalPrice = Number(form.totalPrice);
  const paidAmount = Number(form.paidAmount || 0);

  if (!form.title.trim()) {
    return labels.errors.titleRequired;
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

  if (!form.currency.trim()) {
    return labels.errors.currencyRequired;
  }

  if (!BOOKING_STATUS_OPTIONS.includes(form.status)) {
    return labels.errors.statusInvalid;
  }

  return "";
}

export default function AdminUsersPanel({
  actionId = "",
  error = "",
  loading = false,
  onCreateBooking = () => {},
  users = [],
}) {
  const { language } = useLanguage();
  const labels = LABELS[language] || LABELS.ka;
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }

    return users.filter((user) => getSearchText(user).includes(searchTerm));
  }, [searchTerm, users]);
  const isSubmitting = Boolean(selectedUser?.uid && actionId === selectedUser.uid);
  const paymentPreview = useMemo(() => getPaymentPreview(form), [form]);

  const updateForm = (field, value) => {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
    setFormError("");
  };

  const openBookingModal = (user) => {
    setSelectedUser(user);
    setForm(createEmptyForm());
    setFormError("");
  };

  const closeBookingModal = () => {
    if (isSubmitting) {
      return;
    }

    setSelectedUser(null);
    setForm(createEmptyForm());
    setFormError("");
  };

  const submitCustomBooking = async (event) => {
    event.preventDefault();

    if (!selectedUser?.uid) {
      return;
    }

    const validationError = validateForm(form, labels);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const result = await Promise.resolve(
      onCreateBooking({
        uid: selectedUser.uid,
        title: form.title.trim(),
        category: form.serviceType,
        serviceType: form.serviceType,
        description: form.description.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        totalPrice: Number(form.totalPrice),
        paidAmount: Number(form.paidAmount || 0),
        currency: form.currency.trim().toUpperCase(),
        includes: normalizeIncludes(form.includes),
        adminNote: form.adminNote.trim(),
        status: form.status,
      })
    );

    if (result) {
      closeBookingModal();
    } else {
      setFormError(labels.errors.submitFailed);
    }
  };

  return (
    <div className="overflow-hidden rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
            {labels.label}
          </p>
          <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {labels.heading}
          </h3>
        </div>

        <label className="block w-full max-w-xl space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {labels.search}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <p className="text-sm font-semibold">{labels.errorTitle}</p>
          <p className="mt-1 text-sm leading-6">{error}</p>
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-[1.5rem] bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : error ? null : filteredUsers.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.uid}
                labels={labels}
                language={language}
                onCreateBooking={openBookingModal}
                user={user}
              />
            ))}
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

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            onSubmit={submitCustomBooking}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.6rem] border border-white/70 bg-[#fffdf8] p-5 shadow-[0_32px_100px_-48px_rgba(15,23,42,0.92)] dark:border-white/10 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex flex-col gap-4 border-b border-[#eadfcc] pb-5 dark:border-slate-700 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c26b45] dark:text-orange-200">
                  {labels.modalTitle}
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {getUserName(selectedUser, labels)}
                </h4>
                <p className="mt-1 break-words text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {selectedUser.email || labels.noEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                disabled={isSubmitting}
                className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {labels.cancel}
              </button>
            </div>

            <SelectedUserSummary
              labels={labels}
              language={language}
              user={selectedUser}
            />

            {formError ? (
              <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {formError}
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <BookingInput
                label={labels.title}
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                disabled={isSubmitting}
              />
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {labels.serviceType}
                </span>
                <select
                  value={form.serviceType}
                  onChange={(event) => updateForm("serviceType", event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                >
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {language === "ka" ? option.ka : option.en}
                    </option>
                  ))}
                </select>
              </label>
              <BookingInput
                label={labels.startDate}
                type="date"
                value={form.startDate}
                onChange={(value) => updateForm("startDate", value)}
                disabled={isSubmitting}
              />
              <BookingInput
                label={labels.endDate}
                type="date"
                value={form.endDate}
                onChange={(value) => updateForm("endDate", value)}
                disabled={isSubmitting}
              />
              <BookingInput
                label={labels.totalPrice}
                type="number"
                min="0"
                step="0.01"
                value={form.totalPrice}
                onChange={(value) => updateForm("totalPrice", value)}
                disabled={isSubmitting}
              />
              <BookingInput
                label={labels.paidAmount}
                type="number"
                min="0"
                step="0.01"
                value={form.paidAmount}
                onChange={(value) => updateForm("paidAmount", value)}
                disabled={isSubmitting}
              />
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {labels.currency}
                </span>
                <select
                  value={form.currency}
                  onChange={(event) => updateForm("currency", event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {labels.status}
                </span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20"
                >
                  {BOOKING_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {labels.statuses[status]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {labels.remainingAmount}:{" "}
                  {formatCurrencyValue(
                    paymentPreview.remainingAmount,
                    form.currency || "GEL",
                    language
                  )}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {labels.paidPercent}: {paymentPreview.paidPercent}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <BookingTextarea
                label={labels.description}
                rows={3}
                value={form.description}
                onChange={(value) => updateForm("description", value)}
                disabled={isSubmitting}
              />
              <BookingTextarea
                label={labels.includes}
                rows={4}
                value={form.includes}
                onChange={(value) => updateForm("includes", value)}
                disabled={isSubmitting}
              />
              <BookingTextarea
                label={labels.adminNote}
                rows={4}
                value={form.adminNote}
                onChange={(value) => updateForm("adminNote", value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#eadfcc] pt-5 dark:border-slate-700">
              <button
                type="button"
                onClick={closeBookingModal}
                disabled={isSubmitting}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
              >
                {isSubmitting ? labels.submitting : labels.submit}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function UserCard({ labels, language, onCreateBooking, user }) {
  const phone = getUserPhone(user);
  const userName = getUserName(user, labels);

  return (
    <article className="rounded-[1.7rem] border border-[#efe4d4] bg-white p-5 shadow-[0_22px_80px_-62px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-800/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar labels={labels} user={user} />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-slate-950 dark:text-white">
              {userName}
            </h4>
            <p className="mt-1 break-words text-sm font-semibold text-slate-600 dark:text-slate-300">
              {user.email || labels.noEmail}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getProviderClass(
            user
          )}`}
        >
          {getProviderLabel(user, labels)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <UserMeta
          label={labels.emailVerified}
          value={user.emailVerified ? labels.verified : labels.notVerified}
        />
        <UserMeta label={labels.phone} value={phone} />
        <UserMeta
          label={labels.profileExists}
          value={user.profileExists ? labels.profileYes : labels.profileNo}
        />
        <UserMeta
          label={labels.createdAt}
          value={formatAdminDate(user.createdAt, language)}
        />
        <UserMeta
          label={labels.lastSignInAt}
          value={formatAdminDate(user.lastSignInAt, language)}
        />
        <UserMeta label={labels.uid} value={user.uid} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <CountPill label={labels.activeBookings} value={user.activeBookings} />
        <CountPill label={labels.completedBookings} value={user.completedBookings} />
        <CountPill label={labels.bookingRequests} value={user.bookingRequests} />
      </div>

      <button
        type="button"
        onClick={() => onCreateBooking(user)}
        className="mt-5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      >
        {labels.createBooking}
      </button>
    </article>
  );
}

function SelectedUserSummary({ labels, language, user }) {
  const phone = getUserPhone(user);

  return (
    <div className="mt-5 grid gap-3 rounded-[1.2rem] border border-[#eadfcc] bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
      <UserMeta label={labels.selectedUser} value={getUserName(user, labels)} />
      <UserMeta label={labels.email} value={user.email || labels.noEmail} />
      <UserMeta label={labels.provider} value={getProviderLabel(user, labels)} />
      <UserMeta
        label={labels.profileExists}
        value={user.profileExists ? labels.profileYes : labels.profileNo}
      />
      <UserMeta label={labels.phone} value={phone} />
      <UserMeta
        label={labels.createdAt}
        value={formatAdminDate(user.createdAt, language)}
      />
      <UserMeta
        label={labels.lastSignInAt}
        value={formatAdminDate(user.lastSignInAt, language)}
      />
      <UserMeta label={labels.uid} value={user.uid} />
    </div>
  );
}

function UserAvatar({ labels, user }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f5efd8] text-sm font-black text-slate-950 dark:bg-slate-700 dark:text-white">
      {getInitials(user, labels)}
    </span>
  );
}

function CountPill({ label, value }) {
  return (
    <div className="rounded-[1rem] bg-[#faf4ea] px-3 py-2 dark:bg-slate-900">
      <p className="text-lg font-semibold text-slate-950 dark:text-white">
        {value || 0}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

function UserMeta({ label, value }) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <div className="min-w-0 rounded-[1rem] bg-[#faf4ea] p-3 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
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
        className="w-full rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20 dark:disabled:bg-slate-800"
      />
    </label>
  );
}

function BookingTextarea({
  disabled = false,
  label,
  onChange,
  rows,
  value,
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full resize-none rounded-[1.15rem] border border-[#eadfcc] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-200 dark:focus:ring-orange-200/20 dark:disabled:bg-slate-800"
      />
    </label>
  );
}
