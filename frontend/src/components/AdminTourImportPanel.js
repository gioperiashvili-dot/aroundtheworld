import { useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  createAdminTour,
  previewAdminTourImportDraft,
} from "../lib/api";
import {
  getFriendlyApiError,
  parseDatesInput,
} from "../lib/formatters";
import {
  createTourSlug,
  normalizeTourSlug,
} from "../lib/tourSlugs";

const inputClassName =
  "w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20";

const COPY = {
  ka: {
    eyebrow: "ტურის იმპორტი",
    title: "ტურის Draft-ის გენერაცია",
    description:
      "ჩასვი Facebook პოსტის ტექსტი ან ატვირთე screenshot. სისტემა ამოიღებს ტურის მონაცემებს და შექმნის შესამოწმებელ draft-ს.",
    textLabel: "Facebook პოსტის ტექსტი",
    textPlaceholder: "ჩასვი Facebook პოსტის ტექსტი...",
    uploadLabel: "Screenshot / ფოტო",
    generate: "Draft-ის გენერაცია",
    loading: "მონაცემების ამოღება...",
    save: "Draft-ად შენახვა",
    cancel: "გაუქმება",
    preview: "Review Draft",
    status: "სტატუსი",
    draft: "Draft",
    titleKa: "სათაური KA",
    titleEn: "სათაური EN",
    destinationKa: "მიმართულება KA",
    destinationEn: "მიმართულება EN",
    country: "ქვეყანა",
    city: "ქალაქი",
    price: "ფასი",
    currency: "ვალუტა",
    dates: "თარიღები",
    nights: "ღამეები",
    days: "დღეები",
    durationKa: "ხანგრძლივობა KA",
    durationEn: "ხანგრძლივობა EN",
    hotels: "სასტუმროები",
    includesKa: "შედის KA",
    includesEn: "შედის EN",
    descriptionKa: "აღწერა KA",
    descriptionEn: "აღწერა EN",
    seoTitleKa: "SEO სათაური KA",
    seoTitleEn: "SEO სათაური EN",
    seoDescriptionKa: "SEO აღწერა KA",
    seoDescriptionEn: "SEO აღწერა EN",
    slug: "Slug",
    warningsTitle: "გადასამოწმებელი ველები",
    missingTitle: "დაკლებული ინფორმაცია",
    confidenceTitle: "Confidence",
    emptyInput: "ჩასვი ტექსტი ან ატვირთე screenshot.",
    extractFailed:
      "ტურის მონაცემების ამოღება ვერ მოხერხდა. გადაამოწმე ტექსტი ან სცადე თავიდან.",
    saveFailed: "Draft-ის შენახვა ვერ მოხერხდა.",
    success: "Draft შეიქმნა. გადაამოწმე დეტალები გამოქვეყნებამდე.",
    helperHotels: "ერთი სასტუმრო თითო ხაზზე: სახელი | ვარსკვლავი | ბმული",
    helperDates: "გამოიყენე YYYY-MM-DD ფორმატი, მძიმით ან ახალი ხაზით.",
    noWarnings: "გაფრთხილებები არ არის.",
  },
  en: {
    eyebrow: "Tour import",
    title: "Generate tour draft",
    description:
      "Paste Facebook post text or upload a screenshot. The system extracts tour data into a draft for review.",
    textLabel: "Facebook post text",
    textPlaceholder: "Paste Facebook post text...",
    uploadLabel: "Screenshot / photo",
    generate: "Generate draft",
    loading: "Extracting data...",
    save: "Save as draft",
    cancel: "Cancel",
    preview: "Review Draft",
    status: "Status",
    draft: "Draft",
    titleKa: "Title KA",
    titleEn: "Title EN",
    destinationKa: "Destination KA",
    destinationEn: "Destination EN",
    country: "Country",
    city: "City",
    price: "Price",
    currency: "Currency",
    dates: "Dates",
    nights: "Nights",
    days: "Days",
    durationKa: "Duration KA",
    durationEn: "Duration EN",
    hotels: "Hotels",
    includesKa: "Includes KA",
    includesEn: "Includes EN",
    descriptionKa: "Description KA",
    descriptionEn: "Description EN",
    seoTitleKa: "SEO title KA",
    seoTitleEn: "SEO title EN",
    seoDescriptionKa: "SEO description KA",
    seoDescriptionEn: "SEO description EN",
    slug: "Slug",
    warningsTitle: "Fields to review",
    missingTitle: "Missing information",
    confidenceTitle: "Confidence",
    emptyInput: "Paste text or upload a screenshot.",
    extractFailed: "Unable to extract tour data. Check the text and try again.",
    saveFailed: "Unable to save draft.",
    success: "Draft created. Review details before publishing.",
    helperHotels: "One hotel per line: name | stars | link",
    helperDates: "Use YYYY-MM-DD format, separated by commas or new lines.",
    noWarnings: "No warnings.",
  },
};

const CURRENCY_OPTIONS = ["GEL", "USD", "EUR"];

function getCopy(language) {
  return COPY[language] || COPY.ka;
}

function toLineList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : String(value || "")
        .split(/\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function formatHotelRows(hotels = []) {
  if (!Array.isArray(hotels)) {
    return "";
  }

  return hotels
    .map((hotel) =>
      [
        typeof hotel?.name === "string"
          ? hotel.name
          : hotel?.name?.ka || hotel?.name?.en || "",
        hotel?.stars || "",
        hotel?.link || "",
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean)
    .join("\n");
}

function parseHotelRows(value) {
  return String(value || "")
    .split("\n")
    .map((line, index) => {
      const [nameValue, starsValue, linkValue] = line
        .split("|")
        .map((entry) => entry.trim());
      const stars = Number(starsValue);
      const name = nameValue || "";

      if (!name) {
        return null;
      }

      return {
        id: createTourSlug(name, `hotel-${index + 1}`),
        name,
        stars: Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : "",
        link: /^https?:\/\//i.test(linkValue || "") ? linkValue : "",
        images: [],
      };
    })
    .filter(Boolean);
}

function getLocalizedValue(value, language) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return value[language] || value.ka || value.en || "";
}

function draftToForm(draft) {
  const titleSource = getLocalizedValue(draft?.title, "ka") ||
    getLocalizedValue(draft?.title, "en") ||
    getLocalizedValue(draft?.destination, "ka") ||
    getLocalizedValue(draft?.destination, "en") ||
    "tour draft";

  return {
    titleKa: draft?.title?.ka || "",
    titleEn: draft?.title?.en || "",
    destinationKa: draft?.destination?.ka || "",
    destinationEn: draft?.destination?.en || "",
    country: draft?.country || "",
    city: draft?.city || "",
    price: draft?.price ?? "",
    currency: draft?.currency || "GEL",
    dates: Array.isArray(draft?.dates) ? draft.dates.join(", ") : "",
    nights: draft?.nights ?? "",
    days: draft?.days ?? "",
    durationKa: draft?.duration?.ka || "",
    durationEn: draft?.duration?.en || "",
    hotels: formatHotelRows(draft?.hotels),
    includedKa: Array.isArray(draft?.included?.ka)
      ? draft.included.ka.join("\n")
      : "",
    includedEn: Array.isArray(draft?.included?.en)
      ? draft.included.en.join("\n")
      : "",
    descriptionKa: draft?.description?.ka || "",
    descriptionEn: draft?.description?.en || "",
    seoTitleKa: draft?.seoTitle?.ka || "",
    seoTitleEn: draft?.seoTitle?.en || "",
    seoDescriptionKa: draft?.seoDescription?.ka || "",
    seoDescriptionEn: draft?.seoDescription?.en || "",
    slug: normalizeTourSlug(draft?.slug) || createTourSlug(titleSource, "tour-draft"),
  };
}

function createEmptyDraftForm() {
  return draftToForm({
    title: {},
    destination: {},
    description: {},
    duration: {},
    included: {},
    seoTitle: {},
    seoDescription: {},
  });
}

function getNumericOrNull(value) {
  const source = String(value ?? "").trim();

  if (!source) {
    return null;
  }

  const numberValue = Number(source);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildDraftPayload(form, meta) {
  const destinationKa =
    form.destinationKa.trim() ||
    [form.country, form.city].map((value) => value.trim()).filter(Boolean).join(", ");
  const destinationEn = form.destinationEn.trim();
  const titleSource =
    form.titleKa.trim() ||
    form.titleEn.trim() ||
    destinationKa ||
    destinationEn ||
    "tour draft";

  return {
    title: {
      ka: form.titleKa.trim(),
      en: form.titleEn.trim(),
    },
    destination: {
      ka: destinationKa,
      en: destinationEn,
    },
    description: {
      ka: form.descriptionKa.trim(),
      en: form.descriptionEn.trim(),
    },
    price: getNumericOrNull(form.price),
    currency: String(form.currency || "GEL").trim().toUpperCase(),
    duration: {
      ka: form.durationKa.trim(),
      en: form.durationEn.trim(),
    },
    dates: parseDatesInput(form.dates),
    included: {
      ka: toLineList(form.includedKa),
      en: toLineList(form.includedEn),
    },
    notIncluded: {
      ka: [],
      en: [],
    },
    category: "",
    slug: normalizeTourSlug(form.slug) || createTourSlug(titleSource, "tour-draft"),
    image: "",
    images: [],
    hotels: parseHotelRows(form.hotels),
    status: "draft",
    seoTitle: {
      ka: form.seoTitleKa.trim(),
      en: form.seoTitleEn.trim(),
    },
    seoDescription: {
      ka: form.seoDescriptionKa.trim(),
      en: form.seoDescriptionEn.trim(),
    },
    canonicalUrl: "",
    days: getNumericOrNull(form.days),
    nights: getNumericOrNull(form.nights),
    importMeta: {
      confidence: meta.confidence || {},
      missingFields: meta.missingFields || [],
      warnings: meta.warnings || [],
      source: meta.source || {
        type: "facebook_import",
      },
    },
  };
}

export default function AdminTourImportPanel({
  token,
  onSaved,
  onUnauthorized,
}) {
  const { language } = useLanguage();
  const copy = getCopy(language);
  const [postText, setPostText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [draftForm, setDraftForm] = useState(createEmptyDraftForm);
  const [meta, setMeta] = useState({
    confidence: {},
    missingFields: [],
    warnings: [],
    source: null,
  });
  const [hasPreview, setHasPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const confidenceRows = useMemo(
    () => Object.entries(meta.confidence || {}),
    [meta.confidence]
  );

  const resetPreview = () => {
    setDraftForm(createEmptyDraftForm());
    setMeta({
      confidence: {},
      missingFields: [],
      warnings: [],
      source: null,
    });
    setHasPreview(false);
    setSuccess("");
    setError("");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!postText.trim() && !imageFile) {
      setError(copy.emptyInput);
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await previewAdminTourImportDraft(token, {
        postText,
        imageFile,
      });
      const draft = response?.draft || {};
      const nextMeta = {
        confidence: response?.confidence || draft?.importMeta?.confidence || {},
        missingFields:
          response?.missingFields || draft?.importMeta?.missingFields || [],
        warnings: response?.warnings || draft?.importMeta?.warnings || [],
        source: draft?.importMeta?.source || null,
      };

      setDraftForm(draftToForm(draft));
      setMeta(nextMeta);
      setHasPreview(true);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized?.();
      }

      setError(getFriendlyApiError(requestError, copy.extractFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;

    setDraftForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [name]: name === "slug" ? normalizeTourSlug(value) : value,
      };

      if ((name === "titleKa" || name === "titleEn") && !previousForm.slug.trim()) {
        nextForm.slug = createTourSlug(value, "tour-draft");
      }

      return nextForm;
    });
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await createAdminTour(
        token,
        buildDraftPayload(draftForm, meta)
      );

      setSuccess(copy.success);
      await onSaved?.(response?.tour);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onUnauthorized?.();
      }

      setError(getFriendlyApiError(requestError, copy.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/80 bg-[#0f172ae6] p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
              {copy.eyebrow}
            </p>
            <h3 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {copy.title}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {copy.description}
            </p>
          </div>
          <span className="inline-flex self-start rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
            {copy.status}: {copy.draft}
          </span>
        </div>

        <form onSubmit={handleGenerate} className="mt-6 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {copy.textLabel}
            </span>
            <textarea
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              placeholder={copy.textPlaceholder}
              rows={8}
              className={`${inputClassName} resize-none`}
            />
          </label>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {copy.uploadLabel}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] || null)
                }
                disabled={loading}
                className={inputClassName}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              {loading ? copy.loading : copy.generate}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-5 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
      </section>

      {hasPreview ? (
        <form
          onSubmit={handleSaveDraft}
          className="space-y-6 rounded-[2.1rem] border border-white/80 bg-[#fffdf8] p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
                {copy.preview}
              </p>
              <h3 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                {draftForm.titleKa || draftForm.titleEn || copy.draft}
              </h3>
            </div>
            <span className="inline-flex self-start rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
              {copy.status}: {copy.draft}
            </span>
          </div>

          <ReviewNotices
            copy={copy}
            warnings={meta.warnings}
            missingFields={meta.missingFields}
            confidenceRows={confidenceRows}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput label={copy.titleKa} name="titleKa" value={draftForm.titleKa} onChange={handleDraftChange} />
            <TextInput label={copy.titleEn} name="titleEn" value={draftForm.titleEn} onChange={handleDraftChange} />
            <TextInput label={copy.destinationKa} name="destinationKa" value={draftForm.destinationKa} onChange={handleDraftChange} />
            <TextInput label={copy.destinationEn} name="destinationEn" value={draftForm.destinationEn} onChange={handleDraftChange} />
            <TextInput label={copy.country} name="country" value={draftForm.country} onChange={handleDraftChange} />
            <TextInput label={copy.city} name="city" value={draftForm.city} onChange={handleDraftChange} />
            <TextInput label={copy.slug} name="slug" value={draftForm.slug} onChange={handleDraftChange} />
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {copy.currency}
              </span>
              <select
                name="currency"
                value={draftForm.currency}
                onChange={handleDraftChange}
                className={inputClassName}
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label={copy.price} name="price" value={draftForm.price} type="number" min="0" step="0.01" onChange={handleDraftChange} />
            <TextInput label={copy.days} name="days" value={draftForm.days} type="number" min="0" step="1" onChange={handleDraftChange} />
            <TextInput label={copy.nights} name="nights" value={draftForm.nights} type="number" min="0" step="1" onChange={handleDraftChange} />
            <TextInput label={copy.durationKa} name="durationKa" value={draftForm.durationKa} onChange={handleDraftChange} />
            <TextInput label={copy.durationEn} name="durationEn" value={draftForm.durationEn} onChange={handleDraftChange} />
          </div>

          <TextareaInput label={copy.dates} helper={copy.helperDates} name="dates" value={draftForm.dates} rows={3} onChange={handleDraftChange} />
          <TextareaInput label={copy.hotels} helper={copy.helperHotels} name="hotels" value={draftForm.hotels} rows={5} onChange={handleDraftChange} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextareaInput label={copy.includesKa} name="includedKa" value={draftForm.includedKa} rows={5} onChange={handleDraftChange} />
            <TextareaInput label={copy.includesEn} name="includedEn" value={draftForm.includedEn} rows={5} onChange={handleDraftChange} />
            <TextareaInput label={copy.descriptionKa} name="descriptionKa" value={draftForm.descriptionKa} rows={7} onChange={handleDraftChange} />
            <TextareaInput label={copy.descriptionEn} name="descriptionEn" value={draftForm.descriptionEn} rows={7} onChange={handleDraftChange} />
            <TextareaInput label={copy.seoTitleKa} name="seoTitleKa" value={draftForm.seoTitleKa} rows={2} onChange={handleDraftChange} />
            <TextareaInput label={copy.seoTitleEn} name="seoTitleEn" value={draftForm.seoTitleEn} rows={2} onChange={handleDraftChange} />
            <TextareaInput label={copy.seoDescriptionKa} name="seoDescriptionKa" value={draftForm.seoDescriptionKa} rows={3} onChange={handleDraftChange} />
            <TextareaInput label={copy.seoDescriptionEn} name="seoDescriptionEn" value={draftForm.seoDescriptionEn} rows={3} onChange={handleDraftChange} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              {saving ? copy.loading : copy.save}
            </button>
            <button
              type="button"
              onClick={resetPreview}
              disabled={saving}
              className="rounded-full border border-[#eadfcc] bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#d9c8ae] hover:bg-[#fff8ed] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ReviewNotices({ copy, warnings = [], missingFields = [], confidenceRows = [] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <NoticeBox
        tone="warning"
        title={copy.warningsTitle}
        items={warnings.length ? warnings : [copy.noWarnings]}
      />
      <NoticeBox
        tone="missing"
        title={copy.missingTitle}
        items={missingFields}
      />
      <NoticeBox
        tone="confidence"
        title={copy.confidenceTitle}
        items={confidenceRows.map(([field, level]) => `${field}: ${level}`)}
      />
    </div>
  );
}

function NoticeBox({ title, items = [], tone }) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
      : tone === "missing"
        ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-100"
        : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100";

  return (
    <section className={`rounded-[1.25rem] border px-4 py-3 text-sm ${toneClass}`}>
      <h4 className="font-bold">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2">-</p>
      )}
    </section>
  );
}

function TextInput({ label, name, value, onChange, type = "text", min, step }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        name={name}
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={onChange}
        className={inputClassName}
      />
    </label>
  );
}

function TextareaInput({ label, helper, name, value, rows, onChange }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className={`${inputClassName} resize-none`}
      />
      {helper ? (
        <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
          {helper}
        </span>
      ) : null}
    </label>
  );
}
