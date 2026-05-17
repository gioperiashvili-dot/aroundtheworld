import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "../auth/FirebaseAuthContext";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { buildCanonicalUrl } from "../components/SEO";
import backgroundThree from "../assets/background/background-3-page.webp";
import { useLanguage } from "../i18n/LanguageContext";
import {
  ensureUserProfile,
  fetchUserProfileBookings,
} from "../lib/firebaseUserData";
import { downloadUserBookingFile } from "../lib/api";
import { formatCurrencyValue } from "../lib/formatters";

const ACTIVE_BOOKING_STATUSES = new Set(["active", "confirmed"]);
const VISIBLE_BOOKING_REQUEST_STATUSES = new Set([
  "pending",
  "contacted",
  "waiting_payment",
]);
const PROFILE_TAB_OPTIONS = ["requests", "active", "completed"];

const PROFILE_TEXT = {
  ka: {
    eyebrow: "პროფილი",
    title: "ჩემი პროფილი",
    description: "ანგარიშის ინფორმაცია, მოთხოვნები და ჯავშნები.",
    nameFallback: "მომხმარებელი",
    email: "ელ. ფოსტა",
    phone: "ტელეფონი",
    loading: "იტვირთება...",
    logout: "გასვლა",
    status: "სტატუსი",
    submittedDate: "გაგზავნის თარიღი",
    dateRange: "თარიღები",
    serviceType: "ტიპი",
    category: "კატეგორია",
    message: "შეტყობინება",
    adminNote: "სააგენტოს შენიშვნა",
    notes: "შენიშვნა",
    descriptionLabel: "აღწერა",
    total: "სრული თანხა",
    paid: "გადახდილი",
    remaining: "დარჩენილი",
    currency: "ვალუტა",
    includes: "შედის",
    documents: "დოკუმენტები",
    download: "გადმოწერა",
    downloading: "იტვირთება...",
    downloadError: "PDF დოკუმენტის ჩამოტვირთვა ვერ მოხერხდა.",
    pdf: "PDF",
    requestFallbackTitle: "მოთხოვნა",
    bookingFallbackTitle: "ჯავშანი",
    bookingRequestsTitle: "ჯავშნის მოთხოვნები",
    bookingRequestsDescription:
      "ეს მხოლოდ გამოგზავნილი მოთხოვნაა. ჯავშანი დადასტურებული არ არის გადახდამდე.",
    activeBookingsTitle: "აქტიური ჯავშნები",
    activeBookingsDescription:
      "აქ ჩანს დადასტურებული ჯავშნები, რომლებიც სააგენტოს მიერ გადახდის შემდეგ აქტიურად არის მონიშნული.",
    completedBookingsTitle: "დასრულებული ჯავშნები",
    completedBookingsDescription: "დასრულებული მომსახურებები და დასრულებული ჯავშნები.",
    emptyRequests: "ჯავშნის მოთხოვნები ჯერ არ გაქვთ",
    emptyActive: "აქტიური ჯავშნები ჯერ არ გაქვთ",
    emptyCompleted: "დასრულებული ჯავშნები ჯერ არ გაქვთ",
    error: "ჯავშნების ჩატვირთვა ვერ მოხერხდა.",
  },
  en: {
    eyebrow: "Profile",
    title: "My Profile",
    description: "Account information, requests, and bookings.",
    nameFallback: "Customer",
    email: "Email",
    phone: "Phone",
    loading: "Loading...",
    logout: "Logout",
    status: "Status",
    submittedDate: "Submitted",
    dateRange: "Dates",
    serviceType: "Type",
    category: "Category",
    message: "Message",
    adminNote: "Agency note",
    notes: "Notes",
    descriptionLabel: "Description",
    total: "Total",
    paid: "Paid",
    remaining: "Remaining",
    currency: "Currency",
    includes: "Includes",
    documents: "Documents",
    download: "Download",
    downloading: "Downloading...",
    downloadError: "We could not download this PDF document.",
    pdf: "PDF",
    requestFallbackTitle: "Request",
    bookingFallbackTitle: "Booking",
    bookingRequestsTitle: "Booking Requests",
    bookingRequestsDescription:
      "These are submitted interest requests only. They are not confirmed bookings until payment is made.",
    activeBookingsTitle: "Active Bookings",
    activeBookingsDescription:
      "Confirmed bookings marked active or confirmed by the agency after payment.",
    completedBookingsTitle: "Completed Bookings",
    completedBookingsDescription: "Finished bookings and completed services.",
    emptyRequests: "No booking requests yet",
    emptyActive: "No active bookings yet",
    emptyCompleted: "No completed bookings yet",
    error: "We could not load your bookings.",
  },
};

function toDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatProfileDate(value, language) {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString(language === "ka" ? "ka-GE" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(user, fallback) {
  const source = user?.displayName || user?.email || fallback;

  return String(source)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getFirstText(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (typeof value === "number") {
      return String(value);
    }

    const text = String(value || "").trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const text = String(value || "").trim();
  return text ? [text] : [];
}

function normalizeBookingFiles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((file) => file?.id);
}

function getBookingFileLabel(file, text) {
  return file?.name || file?.originalName || text.pdf;
}

function getPdfFilename(file, text) {
  const label = getBookingFileLabel(file, text);
  return /\.pdf$/i.test(label) ? label : `${label}.pdf`;
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

export default function ProfilePage() {
  const location = useLocation();
  const { language } = useLanguage();
  const { currentUser, loading, logout } = useFirebaseAuth();
  const text = PROFILE_TEXT[language] || PROFILE_TEXT.ka;
  const [bookingRequests, setBookingRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeProfileTab, setActiveProfileTab] = useState("requests");
  const [downloadActionId, setDownloadActionId] = useState("");

  const displayName = currentUser?.displayName || text.nameFallback;
  const initials = useMemo(
    () => getInitials(currentUser, text.nameFallback),
    [currentUser, text.nameFallback]
  );

  const requestItems = useMemo(
    () =>
      bookingRequests.filter(
        (request) =>
          request.uid === currentUser?.uid &&
          VISIBLE_BOOKING_REQUEST_STATUSES.has(normalizeStatus(request.status))
      ),
    [bookingRequests, currentUser?.uid]
  );
  const userBookings = useMemo(
    () => bookings.filter((booking) => booking.uid === currentUser?.uid),
    [bookings, currentUser?.uid]
  );
  const activeBookings = useMemo(
    () =>
      userBookings.filter((booking) =>
        ACTIVE_BOOKING_STATUSES.has(normalizeStatus(booking.status))
      ),
    [userBookings]
  );
  const completedBookings = useMemo(
    () =>
      userBookings.filter(
        (booking) => normalizeStatus(booking.status) === "completed"
      ),
    [userBookings]
  );
  const profileTabs = useMemo(
    () =>
      PROFILE_TAB_OPTIONS.map((tabId) => {
        if (tabId === "active") {
          return {
            id: tabId,
            label: text.activeBookingsTitle,
            count: activeBookings.length,
          };
        }

        if (tabId === "completed") {
          return {
            id: tabId,
            label: text.completedBookingsTitle,
            count: completedBookings.length,
          };
        }

        return {
          id: tabId,
          label: text.bookingRequestsTitle,
          count: requestItems.length,
        };
      }),
    [
      activeBookings.length,
      completedBookings.length,
      requestItems.length,
      text.activeBookingsTitle,
      text.bookingRequestsTitle,
      text.completedBookingsTitle,
    ]
  );

  const loadBookings = useCallback(async () => {
    if (!currentUser?.uid) {
      return;
    }

    setBookingsLoading(true);
    setError("");

    try {
      await ensureUserProfile(currentUser);
      const data = await fetchUserProfileBookings(currentUser.uid);
      setBookingRequests(data.bookingRequests);
      setBookings(data.bookings);
    } catch (_requestError) {
      setError(text.error);
      setBookingRequests([]);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [currentUser, text.error]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleDownloadBookingFile = useCallback(
    async (booking, file) => {
      if (!currentUser?.getIdToken || !booking?.id || !file?.id) {
        return;
      }

      const actionId = `${booking.id}:${file.id}`;
      setDownloadActionId(actionId);
      setError("");

      try {
        const idToken = await currentUser.getIdToken();
        const response = await downloadUserBookingFile(
          idToken,
          booking.id,
          file.id
        );

        saveBlobAsFile(
          response.blob,
          response.filename || getPdfFilename(file, text)
        );
      } catch (_error) {
        setError(text.downloadError);
      } finally {
        setDownloadActionId("");
      }
    },
    [currentUser, text]
  );

  if (loading) {
    return (
      <PublicPageShell
        backgroundImage={backgroundThree}
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        compactHero
      >
        <LoadingBlock label={text.loading} />
      </PublicPageShell>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <PublicPageShell
      backgroundImage={backgroundThree}
      eyebrow={text.eyebrow}
      title={text.title}
      description={text.description}
      compactHero
    >
      <SEO
        title={`${text.title} | Around The World`}
        description={text.description}
        canonical={buildCanonicalUrl("/profile")}
        robots="noindex,nofollow"
      />

      <section className="space-y-6">
        <article className="flex flex-col gap-5 rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--aw-accent)] text-lg font-black text-slate-950">
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="[font-family:var(--font-display)] truncate text-2xl font-semibold text-white">
                {displayName}
              </h2>
              <p className="mt-1 break-words text-sm font-medium text-white/66">
                {text.email}: {currentUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:border-[var(--aw-accent)] hover:text-[var(--aw-accent)]"
          >
            {text.logout}
          </button>
        </article>

        {error ? (
          <p className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <ProfileTabs
          tabs={profileTabs}
          activeTab={activeProfileTab}
          onChange={setActiveProfileTab}
        />

        {activeProfileTab === "requests" ? (
          <ProfileDataSection
            title={text.bookingRequestsTitle}
            description={text.bookingRequestsDescription}
            emptyMessage={text.emptyRequests}
            isLoading={bookingsLoading}
            loadingLabel={text.loading}
            items={requestItems}
            renderItem={(request) => (
              <BookingRequestCard
                key={request.id}
                request={request}
                language={language}
                text={text}
              />
            )}
          />
        ) : null}

        {activeProfileTab === "active" ? (
          <ProfileDataSection
            title={text.activeBookingsTitle}
            description={text.activeBookingsDescription}
            emptyMessage={text.emptyActive}
            isLoading={bookingsLoading}
            loadingLabel={text.loading}
            items={activeBookings}
            renderItem={(booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                downloadActionId={downloadActionId}
                language={language}
                onDownloadFile={handleDownloadBookingFile}
                text={text}
              />
            )}
          />
        ) : null}

        {activeProfileTab === "completed" ? (
          <ProfileDataSection
            title={text.completedBookingsTitle}
            description={text.completedBookingsDescription}
            emptyMessage={text.emptyCompleted}
            isLoading={bookingsLoading}
            loadingLabel={text.loading}
            items={completedBookings}
            renderItem={(booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                downloadActionId={downloadActionId}
                language={language}
                onDownloadFile={handleDownloadBookingFile}
                text={text}
              />
            )}
          />
        ) : null}
      </section>
    </PublicPageShell>
  );
}

function ProfileTabs({ activeTab, onChange, tabs }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[1rem] border border-white/10 bg-[#202020] p-3 shadow-[0_30px_90px_-58px_rgba(0,0,0,0.9)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--aw-accent)] text-slate-950"
                : "border border-white/10 bg-white/7 text-white/72 hover:border-white/18 hover:text-white"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive
                  ? "bg-slate-950/12 text-slate-950"
                  : "bg-white/10 text-white/78"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProfileDataSection({
  title,
  description,
  emptyMessage,
  isLoading,
  loadingLabel,
  items,
  renderItem,
}) {
  return (
    <section className="rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] md:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--aw-accent)]">
          {title}
        </p>
        {description ? (
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
            {description}
          </p>
        ) : null}
      </div>

      {isLoading ? <LoadingBlock label={loadingLabel} compact /> : null}

      {!isLoading && items.length === 0 ? (
        <div className="mt-5 rounded-[1rem] border border-white/10 bg-[#171717] p-5 text-sm font-semibold text-white/72">
          {emptyMessage}
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="mt-5 grid gap-4">{items.map(renderItem)}</div>
      ) : null}
    </section>
  );
}

function BookingRequestCard({ request, language, text }) {
  const title = getFirstText(request, [
    "tourTitle",
    "serviceTitle",
    "title",
    "name",
  ]);
  const serviceType = getFirstText(request, ["serviceType", "type"]);
  const category = getFirstText(request, ["category"]);
  const email = getFirstText(request, ["email", "customerEmail"]);
  const phone = getFirstText(request, ["phone", "customerPhone"]);
  const message = getFirstText(request, ["message", "customerMessage"]);
  const adminNote = getFirstText(request, ["adminNote"]);
  const submittedDate = formatProfileDate(request.createdAt, language);

  return (
    <article className="rounded-[1rem] border border-white/10 bg-[#171717] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {title || text.requestFallbackTitle}
          </h3>
          <div className="mt-3 grid gap-2 text-sm text-white/64">
            <InlineMeta label={text.serviceType} value={serviceType} />
            <InlineMeta label={text.category} value={category} />
            <InlineMeta label={text.submittedDate} value={submittedDate} />
            <InlineMeta label={text.email} value={email} />
            <InlineMeta label={text.phone} value={phone} />
          </div>
        </div>
        {request.status ? (
          <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
            {text.status}: {request.status}
          </span>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 text-sm leading-7 text-white/68">
          {text.message}: {message}
        </p>
      ) : null}

      {adminNote ? (
        <p className="mt-4 rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {text.adminNote}: {adminNote}
        </p>
      ) : null}
    </article>
  );
}

function BookingCard({
  booking,
  downloadActionId = "",
  language,
  onDownloadFile,
  text,
}) {
  const title = getFirstText(booking, [
    "title",
    "tourTitle",
    "serviceTitle",
    "name",
    "type",
  ]);
  const serviceType = getFirstText(booking, ["type", "serviceType"]);
  const category = getFirstText(booking, ["category"]);
  const dateRange = [
    formatProfileDate(booking.startDate, language),
    formatProfileDate(booking.endDate, language),
  ]
    .filter(Boolean)
    .join(" - ");
  const total = formatBookingMoney(booking.totalPrice, booking.currency, language);
  const paid = formatBookingMoney(booking.paidAmount, booking.currency, language);
  const remaining = formatBookingMoney(
    booking.remainingAmount,
    booking.currency,
    language
  );
  const includes = normalizeList(booking.includes);
  const files = normalizeBookingFiles(booking.files);
  const notes = getFirstText(booking, ["notes", "description", "message"]);

  return (
    <article className="rounded-[1rem] border border-white/10 bg-[#171717] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {title || text.bookingFallbackTitle}
          </h3>
          <div className="mt-3 grid gap-2 text-sm text-white/64">
            <InlineMeta label={text.serviceType} value={serviceType} />
            <InlineMeta label={text.category} value={category} />
            <InlineMeta label={text.dateRange} value={dateRange} />
          </div>
        </div>
        {booking.status ? (
          <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            {text.status}: {booking.status}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ReadOnlyMeta label={text.total} value={total} />
        <ReadOnlyMeta label={text.paid} value={paid} />
        <ReadOnlyMeta label={text.remaining} value={remaining} />
        <ReadOnlyMeta label={text.currency} value={booking.currency} />
      </div>

      {files.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
            {text.documents}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onDownloadFile(booking, file)}
                disabled={downloadActionId === `${booking.id}:${file.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/72 transition hover:border-[var(--aw-accent)] hover:text-white"
              >
                <span>{text.pdf}</span>
                <span className="max-w-[12rem] truncate">
                  {getBookingFileLabel(file, text)}
                </span>
                <span>
                  {downloadActionId === `${booking.id}:${file.id}`
                    ? text.downloading
                    : text.download}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {includes.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
            {text.includes}
          </p>
          <ul className="mt-3 space-y-2">
            {includes.map((item) => (
              <li
                key={item}
                className="text-sm leading-6 text-white/68"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {notes ? (
        <p className="mt-4 text-sm leading-7 text-white/68">
          {text.notes}: {notes}
        </p>
      ) : null}
    </article>
  );
}

function InlineMeta({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <span>
      <span className="font-semibold text-white/84">
        {label}:
      </span>{" "}
      {value}
    </span>
  );
}

function ReadOnlyMeta({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
        {label}
      </p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingBlock({ label, compact = false }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[1rem] border border-white/10 bg-[#202020] text-white/72 ${
        compact ? "mt-5 min-h-[7rem]" : "min-h-[12rem]"
      }`}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/14 border-t-[var(--aw-accent)]" />
      <span className="ml-3 text-sm font-semibold">{label}</span>
    </div>
  );
}

function formatBookingMoney(value, currency, language) {
  if (typeof value === "number") {
    return formatCurrencyValue(value, currency || "USD", language);
  }

  return String(value || "").trim();
}
