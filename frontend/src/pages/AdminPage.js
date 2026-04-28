import { useCallback, useEffect, useState } from "react";
import AdminTourForm from "../components/AdminTourForm";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TravelImage from "../components/TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import {
  createAdminSession,
  createAdminTour,
  deleteAdminTour,
  fetchAdminTours,
  updateAdminTour,
} from "../lib/api";
import {
  formatCurrencyValue,
  formatDateTimeLabel,
  getFriendlyApiError,
  parseDatesInput,
} from "../lib/formatters";

const TOKEN_STORAGE_KEY = "around-the-world-admin-token";
const EXPIRY_STORAGE_KEY = "around-the-world-admin-expiry";
const EMPTY_FORM = {
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
};

function replaceToken(message, replacements) {
  return Object.entries(replacements).reduce(
    (value, [key, replacement]) => value.replace(`{${key}}`, replacement),
    message
  );
}

function toFormValues(tour) {
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
    image: tour?.image || "",
  };
}

export default function AdminPage() {
  const { language, t } = useLanguage();
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [tours, setTours] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setPassword("");
    setEditingId("");
    setForm(EMPTY_FORM);

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

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadAdminTours(token);
  }, [token, loadAdminTours]);

  const resetForm = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    const dates = parseDatesInput(form.dates);
    const invalidDate = dates.find((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date));
    const priceValue = Number(form.price);

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

    return null;
  };

  const buildPayload = () => ({
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
    category: form.category.trim(),
    image: form.image.trim(),
  });

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

    try {
      if (editingId) {
        await updateAdminTour(token, editingId, buildPayload());
        setSuccess(t("admin.success.updated"));
      } else {
        await createAdminTour(token, buildPayload());
        setSuccess(t("admin.success.created"));
      }

      resetForm();
      await loadAdminTours(token);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearSession();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.saveFailed"), {
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

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f5efe7] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
            onChange={(event) => {
              const { name, value } = event.target;
              setForm((previousForm) => ({
                ...previousForm,
                [name]: value,
              }));
            }}
            onSubmit={handleSubmit}
            onReset={resetForm}
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
                          image={tour.image}
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
