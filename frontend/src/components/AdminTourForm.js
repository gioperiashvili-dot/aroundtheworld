import TravelImage from "./TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20";

export default function AdminTourForm({
  form,
  editing,
  saving,
  onChange,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
        <TravelImage
          image={form.image}
          title={previewTitle}
          subtitle={previewSubtitle}
          variant="tour"
          className="h-72"
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
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
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("common.cancel")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-[1.6rem] bg-slate-50 p-4 dark:bg-slate-800/70">
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

          <div className="space-y-4 rounded-[1.6rem] bg-slate-50 p-4 dark:bg-slate-800/70">
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
              {t("admin.imageUrl")}
            </span>
            <input
              name="image"
              value={form.image}
              onChange={onChange}
              placeholder="https://..."
              className={inputClassName}
            />
          </label>

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

        <button
          type="submit"
          disabled={saving}
          className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
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
