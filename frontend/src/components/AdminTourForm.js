import TravelImage from "./TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { MAX_TOUR_IMAGES, RECOMMENDED_TOUR_IMAGES } from "../lib/tourImages";

const inputClassName =
  "w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20";

const TOUR_IMAGE_TEXT = {
  ka: {
    tourImages: "\u10E2\u10E3\u10E0\u10D8\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8",
    chooseImages: "\u10D0\u10D8\u10E0\u10E9\u10D8\u10D4\u10D7 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8",
    uploadHelper:
      "\u10E0\u10D4\u10D9\u10DD\u10DB\u10D4\u10DC\u10D3\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0 \u10DB\u10D8\u10DC\u10D8\u10DB\u10E3\u10DB 5 \u10E4\u10DD\u10E2\u10DD. \u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB 10. JPG, PNG \u10D0\u10DC WebP, \u10D7\u10D8\u10D7\u10DD\u10D4\u10E3\u10DA\u10D8 5MB-\u10DB\u10D3\u10D4.",
    selectedImages: "\u10D0\u10E0\u10E9\u10D4\u10E3\u10DA\u10D8 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8",
    galleryImages: "\u10D2\u10D0\u10DA\u10D4\u10E0\u10D4\u10D8\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8",
    removeImage: "\u10E4\u10DD\u10E2\u10DD\u10E1 \u10EC\u10D0\u10E8\u10DA\u10D0",
    makeCover: "\u10DB\u10D7\u10D0\u10D5\u10D0\u10E0 \u10E4\u10DD\u10E2\u10DD\u10D3 \u10D3\u10D0\u10E7\u10D4\u10DC\u10D4\u10D1\u10D0",
    coverImage: "\u10DB\u10D7\u10D0\u10D5\u10D0\u10E0\u10D8 \u10E4\u10DD\u10E2\u10DD",
    recommendedLabel: "\u10E0\u10D4\u10D9\u10DD\u10DB\u10D4\u10DC\u10D3\u10D4\u10D1\u10E3\u10DA\u10D8",
    maximumLabel: "\u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB\u10D8",
  },
  en: {
    tourImages: "Tour images",
    chooseImages: "Choose images",
    uploadHelper:
      "Recommended minimum 5 images. Maximum 10. JPG, PNG, or WebP, each up to 5MB.",
    selectedImages: "Selected images",
    galleryImages: "Gallery images",
    removeImage: "Remove image",
    makeCover: "Make cover",
    coverImage: "Cover image",
    recommendedLabel: "Recommended",
    maximumLabel: "Maximum",
  },
};

const TOUR_SLUG_TEXT = {
  ka: {
    label: "Slug",
    helper:
      "URL \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8, \u10DB\u10D0\u10D2\u10D0\u10DA\u10D8\u10D7\u10D0\u10D3: kutaisi-antalya",
  },
  en: {
    label: "Slug",
    helper: "URL address, for example: kutaisi-antalya",
  },
};

const CURRENCY_TEXT = {
  ka: {
    label: "\u10D5\u10D0\u10DA\u10E3\u10E2\u10D0",
    options: {
      GEL: "\u10DA\u10D0\u10E0\u10D8",
      USD: "\u10D0\u10E8\u10E8 \u10D3\u10DD\u10DA\u10D0\u10E0\u10D8",
      EUR: "\u10D4\u10D5\u10E0\u10DD",
    },
  },
  en: {
    label: "Currency",
    options: {
      GEL: "GEL",
      USD: "USD",
      EUR: "EUR",
    },
  },
};
const CURRENCY_OPTIONS = ["GEL", "USD", "EUR"];

const HOTEL_MANAGER_TEXT = {
  ka: {
    title: "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D4\u10D1\u10D8",
    helper:
      "\u10D3\u10D0\u10D0\u10DB\u10D0\u10E2\u10D4\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D4\u10D1\u10D8, \u10EA\u10D5\u10D4\u10DC\u10D4\u10D1\u10D8\u10E1 \u10DE\u10D8\u10E0\u10DD\u10D1\u10D4\u10D1\u10D8 \u10D3\u10D0 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8 \u10E2\u10E3\u10E0\u10D8\u10E1 \u10D3\u10D4\u10E2\u10D0\u10DA\u10E3\u10E0 \u10D2\u10D5\u10D4\u10E0\u10D3\u10D6\u10D4 \u10E1\u10D0\u10E9\u10D5\u10D4\u10DC\u10D4\u10D1\u10DA\u10D0\u10D3.",
    addHotel: "+ \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D0",
    removeHotel: "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10EC\u10D0\u10E8\u10DA\u10D0",
    id: "ID",
    name: "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E1\u10D0\u10EE\u10D4\u10DA\u10D8",
    location: "\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D0",
    mealPlan: "\u10D9\u10D5\u10D4\u10D1\u10D0",
    stars: "\u10D5\u10D0\u10E0\u10E1\u10D9\u10D5\u10DA\u10D0\u10D5\u10D4\u10D1\u10D8",
    link: "\u10D1\u10DB\u10E3\u10DA\u10D8",
    images: "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10E1 \u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8",
    chooseImages: "\u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0",
    uploadAfterSave:
      "\u10E4\u10DD\u10E2\u10DD\u10D4\u10D1\u10D8\u10E1 \u10D0\u10E2\u10D5\u10D8\u10E0\u10D7\u10D5\u10D0 \u10E8\u10D4\u10E1\u10D0\u10EB\u10DA\u10D4\u10D1\u10D4\u10DA\u10D8 \u10D8\u10E5\u10DC\u10D4\u10D1\u10D0 \u10E2\u10E3\u10E0\u10D8\u10E1 \u10E8\u10D4\u10DC\u10D0\u10EE\u10D5\u10D8\u10E1 \u10E8\u10D4\u10DB\u10D3\u10D4\u10D2.",
    uploadHelper:
      "\u10DB\u10D0\u10E5\u10E1\u10D8\u10DB\u10E3\u10DB 12 \u10E4\u10DD\u10E2\u10DD \u10D4\u10E0\u10D7 \u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D6\u10D4. JPG, JPEG, PNG \u10D0\u10DC WebP.",
    removeImage: "\u10E4\u10DD\u10E2\u10DD\u10E1 \u10EC\u10D0\u10E8\u10DA\u10D0",
    noHotels:
      "\u10E1\u10D0\u10E1\u10E2\u10E3\u10DB\u10E0\u10DD\u10D4\u10D1\u10D8 \u10EF\u10D4\u10E0 \u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10E3\u10DA\u10D8.",
    uploading: "\u10D8\u10E2\u10D5\u10D8\u10E0\u10D7\u10D4\u10D1\u10D0...",
  },
  en: {
    title: "Hotel Options",
    helper: "Add hotels, meal plans, and photos for the public tour detail page.",
    addHotel: "+ Add hotel",
    removeHotel: "Remove hotel",
    id: "ID",
    name: "Hotel name",
    location: "Location",
    mealPlan: "Meal plan",
    stars: "Stars",
    link: "Link",
    images: "Hotel images",
    chooseImages: "Upload images",
    uploadAfterSave: "Photo upload will be available after saving the tour.",
    uploadHelper: "Maximum 12 photos per hotel. JPG, JPEG, PNG, or WebP.",
    removeImage: "Remove image",
    noHotels: "No hotels added yet.",
    uploading: "Uploading...",
  },
};

function getTourImageText(language, key) {
  return TOUR_IMAGE_TEXT[language]?.[key] || TOUR_IMAGE_TEXT.en[key] || key;
}

function getTourSlugText(language, key) {
  return TOUR_SLUG_TEXT[language]?.[key] || TOUR_SLUG_TEXT.en[key] || key;
}

function getCurrencyText(language) {
  return CURRENCY_TEXT[language] || CURRENCY_TEXT.en;
}

function getHotelManagerText(language, key) {
  return HOTEL_MANAGER_TEXT[language]?.[key] || HOTEL_MANAGER_TEXT.en[key] || key;
}

export default function AdminTourForm({
  form,
  editing,
  saving,
  galleryImages = [],
  hotelImageActionId = "",
  persistedHotelIds = [],
  imageFileNames = [],
  imagePreviewUrls = [],
  imageInputKey,
  onChange,
  onImageFileChange,
  onClearImageFile,
  onRemoveGalleryImage,
  onMakeCoverImage,
  onRemovePendingImage,
  onLocalizedItemChange,
  onAddLocalizedItem,
  onRemoveLocalizedItem,
  onAddHotel,
  onRemoveHotel,
  onHotelFieldChange,
  onHotelImagesUpload,
  onRemoveHotelImage,
  onSubmit,
  onReset,
}) {
  const { language, t } = useLanguage();
  const previewTitle =
    getLocalized(
      {
        ka: form.titleKa,
        en: form.titleEn,
      },
      language
    ) || t("admin.previewTitle");
  const previewSubtitle =
    getLocalized(
      {
        ka: form.destinationKa,
        en: form.destinationEn,
      },
      language
    ) || t("admin.previewSubtitle");
  const previewImages = [...galleryImages, ...imagePreviewUrls];
  const hasSelectedImages = imagePreviewUrls.length > 0;
  const currencyText = getCurrencyText(language);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[2.4rem] border border-white/80 bg-white p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88">
        <div className="grid grid-cols-2 gap-4">
          {previewImages.length > 0 ? (
            previewImages.slice(0, 7).map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="overflow-hidden rounded-[1.15rem] border border-[#efe4d4] dark:border-slate-700"
              >
                <TravelImage
                  image={image}
                  title={previewTitle}
                  subtitle={previewSubtitle}
                  variant="tour"
                  className="h-40"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 overflow-hidden rounded-[1.15rem] border border-[#efe4d4] dark:border-slate-700">
              <TravelImage
                image={form.image}
                title={previewTitle}
                subtitle={previewSubtitle}
                variant="tour"
                className="h-72"
              />
            </div>
          )}

          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.15rem] border border-dashed border-[#d9c8ae] bg-[#e8e5d8] text-sm font-semibold text-slate-600 transition hover:border-[#c26b45] hover:bg-[#fff8ed] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-400/50">
              +
            </span>
            <span>{getTourImageText(language, "chooseImages")}</span>
            <input
              key={`preview-${imageInputKey}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onImageFileChange}
              disabled={saving}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
              {editing ? t("admin.editTour") : t("admin.createTour")}
            </p>
            <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
              {t("admin.formHeading")}
            </h3>
          </div>

          {editing ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-[#eadfcc] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d9c8ae] hover:bg-[#fff8ed] dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("common.cancel")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                {t("admin.georgianContent")}
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.titleKa")}
              </span>
              <input
                name="titleKa"
                value={form.titleKa}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.destinationKa")}
              </span>
              <input
                name="destinationKa"
                value={form.destinationKa}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.durationKa")}
              </span>
              <input
                name="durationKa"
                value={form.durationKa}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.descriptionKa")}
              </span>
              <textarea
                name="descriptionKa"
                value={form.descriptionKa}
                onChange={onChange}
                rows={5}
                className={`${inputClassName} resize-none`}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.descriptionHelper")}
              </span>
            </label>
          </div>

          <div className="space-y-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                {t("admin.englishContent")}
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.titleEn")}
              </span>
              <input
                name="titleEn"
                value={form.titleEn}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.destinationEn")}
              </span>
              <input
                name="destinationEn"
                value={form.destinationEn}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.durationEn")}
              </span>
              <input
                name="durationEn"
                value={form.durationEn}
                onChange={onChange}
                className={inputClassName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.descriptionEn")}
              </span>
              <textarea
                name="descriptionEn"
                value={form.descriptionEn}
                onChange={onChange}
                rows={5}
                className={`${inputClassName} resize-none`}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.descriptionHelper")}
              </span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("admin.price")}
            </span>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={onChange}
              className={inputClassName}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("admin.category")}
            </span>
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              className={inputClassName}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {currencyText.label}
            </span>
            <select
              name="currency"
              value={form.currency || "GEL"}
              onChange={onChange}
              disabled={saving}
              className={inputClassName}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyText.options[currency]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {getTourSlugText(language, "label")}
            </span>
            <input
              name="slug"
              value={form.slug}
              onChange={onChange}
              placeholder="kutaisi-antalya"
              className={inputClassName}
            />
            <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
              {getTourSlugText(language, "helper")}
            </span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("admin.imageUrl")}
            </span>
            <input
              name="image"
              value={form.image}
              onChange={onChange}
              placeholder="https://..."
              className={inputClassName}
            />
            <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
              {t("admin.imageUrlHelper")}
            </span>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {getTourImageText(language, "tourImages")}
            </span>
            <label className="flex cursor-pointer flex-col gap-2 rounded-[1.25rem] border border-dashed border-[#d9c8ae] bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-[#c26b45] hover:bg-[#fff8ed] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-200 dark:hover:bg-orange-200/10">
              <span className="font-semibold">
                {getTourImageText(language, "chooseImages")}
              </span>
              <span className="text-xs leading-6 text-slate-600 dark:text-slate-400">
                {getTourImageText(language, "uploadHelper")}
              </span>
              <input
                key={imageInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onImageFileChange}
                disabled={saving}
                className="sr-only"
              />
            </label>
            <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
              {getTourImageText(language, "recommendedLabel")}:{" "}
              {RECOMMENDED_TOUR_IMAGES}. {getTourImageText(language, "maximumLabel")}:{" "}
              {MAX_TOUR_IMAGES}.
            </span>
            {galleryImages.length > 0 ? (
              <ImagePreviewGrid
                title={getTourImageText(language, "galleryImages")}
                images={galleryImages}
                titleFallback={previewTitle}
                subtitleFallback={previewSubtitle}
                saving={saving}
                coverLabel={getTourImageText(language, "coverImage")}
                removeLabel={getTourImageText(language, "removeImage")}
                makeCoverLabel={getTourImageText(language, "makeCover")}
                onRemove={onRemoveGalleryImage}
                onMakeCover={onMakeCoverImage}
              />
            ) : null}
            {hasSelectedImages ? (
              <div className="space-y-3 rounded-[1.25rem] border border-[#efe4d4] bg-[#faf4ea] px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">
                    {getTourImageText(language, "selectedImages")}: {imageFileNames.length}
                  </span>
                  <button
                    type="button"
                    onClick={onClearImageFile}
                    disabled={saving}
                    className="self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950 sm:self-auto"
                  >
                    {t("admin.clearSelectedImage")}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {imagePreviewUrls.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-[1.25rem] border border-[#efe4d4] bg-white dark:border-slate-700 dark:bg-slate-900"
                    >
                      <TravelImage
                        image={image}
                        title={previewTitle}
                        subtitle={previewSubtitle}
                        variant="tour"
                        className="h-28"
                      />
                      <div className="space-y-2 p-3">
                        <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {imageFileNames[index] || getTourImageText(language, "selectedImages")}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemovePendingImage(index)}
                          disabled={saving}
                          className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                        >
                          {getTourImageText(language, "removeImage")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("admin.dates")}
            </span>
            <textarea
              name="dates"
              value={form.dates}
              onChange={onChange}
              rows={3}
              placeholder={t("admin.datesPlaceholder")}
              className={`${inputClassName} resize-none`}
            />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <LocalizedItemsEditor
            title={t("tours.includedTitle")}
            addLabel={t("admin.addIncludedItem")}
            examples={t("admin.includedExamples")}
            rows={form.included}
            section="included"
            saving={saving}
            onChange={onLocalizedItemChange}
            onAdd={onAddLocalizedItem}
            onRemove={onRemoveLocalizedItem}
            t={t}
          />

          <LocalizedItemsEditor
            title={t("tours.notIncludedTitle")}
            addLabel={t("admin.addNotIncludedItem")}
            examples={t("admin.notIncludedExamples")}
            rows={form.notIncluded}
            section="notIncluded"
            saving={saving}
            onChange={onLocalizedItemChange}
            onAdd={onAddLocalizedItem}
            onRemove={onRemoveLocalizedItem}
            t={t}
          />
        </div>

        <HotelOptionsEditor
          hotels={form.hotels}
          language={language}
          saving={saving}
          editing={editing}
          persistedHotelIds={persistedHotelIds}
          hotelImageActionId={hotelImageActionId}
          onAddHotel={onAddHotel}
          onRemoveHotel={onRemoveHotel}
          onHotelFieldChange={onHotelFieldChange}
          onHotelImagesUpload={onHotelImagesUpload}
          onRemoveHotelImage={onRemoveHotelImage}
        />

        <button
          type="submit"
          disabled={saving}
          className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          {saving
            ? t("admin.saving")
            : editing
              ? t("admin.saveUpdate")
              : t("admin.saveCreate")}
        </button>
      </form>
    </div>
  );
}

function ImagePreviewGrid({
  title,
  images,
  titleFallback,
  subtitleFallback,
  saving,
  coverLabel,
  removeLabel,
  makeCoverLabel,
  onRemove,
  onMakeCover,
}) {
  return (
    <div className="space-y-3 rounded-[1.25rem] border border-[#efe4d4] bg-[#faf4ea] px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200">
      <p className="font-semibold">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="overflow-hidden rounded-[1.25rem] border border-[#efe4d4] bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="relative">
              <TravelImage
                image={image}
                title={titleFallback}
                subtitle={subtitleFallback}
                variant="tour"
                className="h-28"
              />
              {index === 0 ? (
                <span className="absolute left-3 top-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {coverLabel}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => onMakeCover(image)}
                  disabled={saving}
                  className="rounded-full bg-[#fff8ed] px-3 py-1.5 text-xs font-semibold text-[#9a5435] transition hover:bg-[#f4e6d3] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-200/10 dark:text-orange-100 dark:hover:bg-orange-200/20"
                >
                  {makeCoverLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(image)}
                disabled={saving}
                className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
              >
                {removeLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocalizedItemsEditor({
  title,
  addLabel,
  examples,
  rows = [],
  section,
  saving,
  onChange,
  onAdd,
  onRemove,
  t,
}) {
  const visibleRows = rows.length > 0 ? rows : [{ ka: "", en: "" }];
  const exampleItems = Array.isArray(examples) ? examples : [];

  return (
    <section className="space-y-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70">
      <div>
        <h4 className="[font-family:var(--font-display)] text-xl font-semibold text-slate-950 dark:text-white">
          {title}
        </h4>
        {exampleItems.length > 0 ? (
          <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-400">
            {t("admin.examplesLabel")}: {exampleItems.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {visibleRows.map((row, index) => (
          <div
            key={`${section}-${index}`}
            className="rounded-[1.25rem] border border-[#efe4d4] bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  KA
                </span>
                <input
                  value={row.ka}
                  onChange={(event) =>
                    onChange(section, index, "ka", event.target.value)
                  }
                  disabled={saving}
                  className={inputClassName}
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  EN
                </span>
                <input
                  value={row.en}
                  onChange={(event) =>
                    onChange(section, index, "en", event.target.value)
                  }
                  disabled={saving}
                  className={inputClassName}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => onRemove(section, index)}
              disabled={saving}
              className="mt-3 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
            >
              {t("admin.removeItem")}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAdd(section)}
        disabled={saving}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
      >
        {addLabel}
      </button>
    </section>
  );
}

function HotelOptionsEditor({
  hotels = [],
  language,
  saving,
  editing,
  persistedHotelIds = [],
  hotelImageActionId,
  onAddHotel,
  onRemoveHotel,
  onHotelFieldChange,
  onHotelImagesUpload,
  onRemoveHotelImage,
}) {
  const visibleHotels = Array.isArray(hotels) ? hotels : [];
  const persistedIds = new Set(persistedHotelIds);

  return (
    <section className="space-y-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="[font-family:var(--font-display)] text-xl font-semibold text-slate-950 dark:text-white">
            {getHotelManagerText(language, "title")}
          </h4>
          <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-400">
            {getHotelManagerText(language, "helper")}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddHotel}
          disabled={saving}
          className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
        >
          {getHotelManagerText(language, "addHotel")}
        </button>
      </div>

      {visibleHotels.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[#d9c8ae] bg-white px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {getHotelManagerText(language, "noHotels")}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleHotels.map((hotel, hotelIndex) => {
            const images = Array.isArray(hotel.images) ? hotel.images : [];
            const isUploading = hotelImageActionId === hotel.id;
            const canUploadImages = editing && persistedIds.has(hotel.id);

            return (
              <article
                key={hotel.id || hotelIndex}
                className="space-y-4 rounded-[1.35rem] border border-[#efe4d4] bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {getHotelManagerText(language, "title")} #{hotelIndex + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveHotel?.(hotel.id)}
                    disabled={saving}
                    className="self-start rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20 sm:self-auto"
                  >
                    {getHotelManagerText(language, "removeHotel")}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <HotelInput
                    label={getHotelManagerText(language, "id")}
                    value={hotel.id}
                    disabled={saving || persistedIds.has(hotel.id)}
                    onChange={(value) => onHotelFieldChange?.(hotel.id, "id", value)}
                  />
                  <HotelInput
                    label={getHotelManagerText(language, "name")}
                    value={hotel.name}
                    disabled={saving}
                    onChange={(value) => onHotelFieldChange?.(hotel.id, "name", value)}
                  />
                  <HotelInput
                    label={getHotelManagerText(language, "location")}
                    value={hotel.location}
                    disabled={saving}
                    onChange={(value) =>
                      onHotelFieldChange?.(hotel.id, "location", value)
                    }
                  />
                  <HotelInput
                    label={getHotelManagerText(language, "mealPlan")}
                    value={hotel.mealPlan}
                    disabled={saving}
                    onChange={(value) =>
                      onHotelFieldChange?.(hotel.id, "mealPlan", value)
                    }
                  />

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {getHotelManagerText(language, "stars")}
                    </span>
                    <select
                      value={hotel.stars || ""}
                      onChange={(event) =>
                        onHotelFieldChange?.(hotel.id, "stars", event.target.value)
                      }
                      disabled={saving}
                      className={inputClassName}
                    >
                      <option value="">-</option>
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <option key={stars} value={stars}>
                          {stars}
                        </option>
                      ))}
                    </select>
                  </label>

                  <HotelInput
                    label={getHotelManagerText(language, "link")}
                    value={hotel.link}
                    disabled={saving}
                    placeholder="https://..."
                    onChange={(value) => onHotelFieldChange?.(hotel.id, "link", value)}
                  />
                </div>

                <div className="space-y-3 rounded-[1.15rem] border border-[#efe4d4] bg-[#faf4ea] p-3 dark:border-white/10 dark:bg-slate-800/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {getHotelManagerText(language, "images")}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">
                        {canUploadImages
                          ? getHotelManagerText(language, "uploadHelper")
                          : getHotelManagerText(language, "uploadAfterSave")}
                      </p>
                    </div>

                    <label className={`inline-flex shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      canUploadImages && !saving
                        ? "cursor-pointer bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                        : "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                    }`}>
                      {isUploading
                        ? getHotelManagerText(language, "uploading")
                        : getHotelManagerText(language, "chooseImages")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        disabled={!canUploadImages || saving || isUploading}
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          void onHotelImagesUpload?.(hotel.id, files);
                          event.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {images.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {images.map((image) => {
                        const isDeleting = hotelImageActionId === `${hotel.id}:${image}`;

                        return (
                          <div
                            key={image}
                            className="overflow-hidden rounded-[1rem] border border-[#efe4d4] bg-white dark:border-slate-700 dark:bg-slate-900"
                          >
                            <TravelImage
                              image={image}
                              title={hotel.name}
                              subtitle={hotel.location}
                              variant="tour"
                              className="h-28"
                            />
                            <div className="space-y-2 p-3">
                              <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {image}
                              </p>
                              <button
                                type="button"
                                onClick={() => onRemoveHotelImage?.(hotel.id, image)}
                                disabled={saving || isDeleting}
                                className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                              >
                                {isDeleting
                                  ? getHotelManagerText(language, "uploading")
                                  : getHotelManagerText(language, "removeImage")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HotelInput({ label, value, disabled, placeholder = "", onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClassName}
      />
    </label>
  );
}
