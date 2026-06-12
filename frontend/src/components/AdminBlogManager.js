import { useCallback, useEffect, useState } from "react";
import AdminToast from "./AdminToast";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import TravelImage from "./TravelImage";
import { useLanguage } from "../i18n/LanguageContext";
import {
  createAdminBlog,
  deleteAdminBlog,
  fetchAdminBlogs,
  updateAdminBlog,
  uploadAdminBlogImage,
} from "../lib/api";
import {
  BLOG_CATEGORIES,
  DEFAULT_BLOG_CATEGORY,
  createBlogSlug,
  formatCommaList,
  formatFaqLines,
  getBlogCategory,
  getBlogImage,
  getCategoryByKa,
  getCategoryKey,
  getLocalizedValue,
  parseCommaList,
  parseFaqLines,
  sortBlogPostsNewestFirst,
} from "../lib/blogs";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";

const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const inputClassName =
  "w-full rounded-[1.15rem] border border-[#eadfcc] bg-[#fffdf8] px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c26b45] focus:ring-4 focus:ring-[#c26b45]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-200 dark:focus:ring-orange-200/20";

function createEmptyBlogForm() {
  return {
    titleKa: "",
    titleEn: "",
    excerptKa: "",
    excerptEn: "",
    contentKa: "",
    contentEn: "",
    categoryKa: DEFAULT_BLOG_CATEGORY.ka,
    categoryEn: DEFAULT_BLOG_CATEGORY.en,
    tags: "",
    author: "Around The World",
    slug: "",
    status: "published",
    image: "",
    seoTitleKa: "",
    seoTitleEn: "",
    seoDescriptionKa: "",
    seoDescriptionEn: "",
    canonicalUrl: "",
    ogImage: "",
    faqKa: "",
    faqEn: "",
    relatedSlugs: "",
  };
}

function getLocalizedFieldValues(value) {
  return {
    ka: getLocalizedValue(value, "ka"),
    en: getLocalizedValue(value, "en"),
  };
}

function toBlogForm(blog) {
  const title = getLocalizedFieldValues(blog?.title);
  const excerpt = getLocalizedFieldValues(blog?.excerpt);
  const content = getLocalizedFieldValues(blog?.content);
  const category = getBlogCategory(blog);
  const seoTitle = getLocalizedFieldValues(blog?.seoTitle);
  const seoDescription = getLocalizedFieldValues(blog?.seoDescription);

  return {
    titleKa: title.ka,
    titleEn: title.en,
    excerptKa: excerpt.ka,
    excerptEn: excerpt.en,
    contentKa: content.ka,
    contentEn: content.en,
    categoryKa: category.ka,
    categoryEn: category.en,
    tags: formatCommaList(blog?.tags),
    author: blog?.author || "Around The World",
    slug: blog?.slug || "",
    status: blog?.status === "draft" ? "draft" : "published",
    image: getBlogImage(blog),
    seoTitleKa: seoTitle.ka,
    seoTitleEn: seoTitle.en,
    seoDescriptionKa: seoDescription.ka,
    seoDescriptionEn: seoDescription.en,
    canonicalUrl: blog?.canonicalUrl || "",
    ogImage: blog?.ogImage || "",
    faqKa: formatFaqLines(blog?.faq, "ka"),
    faqEn: formatFaqLines(blog?.faq, "en"),
    relatedSlugs: formatCommaList(blog?.relatedSlugs),
  };
}

export default function AdminBlogManager({ token, onUnauthorized }) {
  const { language, t } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(createEmptyBlogForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({ type: "success", message: "" });

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const handleUnauthorized = useCallback(() => {
    if (typeof onUnauthorized === "function") {
      onUnauthorized();
    }
  }, [onUnauthorized]);

  const loadBlogs = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const posts = await fetchAdminBlogs(token);
      setBlogs(sortBlogPostsNewestFirst(posts));
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleUnauthorized();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.blogsLoadFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, t, token]);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  useEffect(() => {
    if (error) {
      setToast({ type: "error", message: error });
      return;
    }

    if (success) {
      setToast({ type: "success", message: success });
    }
  }, [error, success]);

  const resetForm = () => {
    setEditingId("");
    setForm(createEmptyBlogForm());
    setImageFile(null);
    setImageInputKey((currentKey) => currentKey + 1);
    setSlugTouched(false);
  };

  const validateForm = () => {
    if (!form.titleKa.trim()) {
      return t("admin.errors.blogTitleKaRequired");
    }

    if (!form.contentKa.trim()) {
      return t("admin.errors.blogContentKaRequired");
    }

    if (!["draft", "published"].includes(form.status)) {
      return t("admin.errors.blogStatusInvalid");
    }

    const normalizedSlug = createBlogSlug(form.slug);
    const hasDuplicateSlug =
      normalizedSlug &&
      blogs.some(
        (blog) => blog.id !== editingId && createBlogSlug(blog.slug) === normalizedSlug
      );

    if (hasDuplicateSlug) {
      return t("admin.errors.blogSlugExists");
    }

    return null;
  };

  const buildPayload = (imageValue = form.image.trim()) => {
    const coverImage = imageValue.trim();

    return {
      slug: createBlogSlug(form.slug),
      title: {
        ka: form.titleKa.trim(),
        en: form.titleEn.trim(),
      },
      excerpt: {
        ka: form.excerptKa.trim(),
        en: form.excerptEn.trim(),
      },
      content: {
        ka: form.contentKa.trim(),
        en: form.contentEn.trim(),
      },
      category: {
        ka: form.categoryKa.trim() || DEFAULT_BLOG_CATEGORY.ka,
        en: form.categoryEn.trim() || DEFAULT_BLOG_CATEGORY.en,
      },
      tags: parseCommaList(form.tags),
      author: form.author.trim(),
      image: coverImage,
      coverImage,
      status: form.status,
      seoTitle: {
        ka: form.seoTitleKa.trim(),
        en: form.seoTitleEn.trim(),
      },
      seoDescription: {
        ka: form.seoDescriptionKa.trim(),
        en: form.seoDescriptionEn.trim(),
      },
      canonicalUrl: form.canonicalUrl.trim(),
      ogImage: form.ogImage.trim(),
      faq: parseFaqLines(form.faqKa, form.faqEn),
      relatedSlugs: parseCommaList(form.relatedSlugs).map(createBlogSlug).filter(Boolean),
    };
  };

  const clearSelectedImageFile = () => {
    setImageFile(null);
    setImageInputKey((currentKey) => currentKey + 1);
  };

  const handleImageFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) {
      clearSelectedImageFile();
      return;
    }

    if (!ALLOWED_IMAGE_UPLOAD_TYPES.has(nextFile.type)) {
      setError(t("admin.errors.invalidFileType"));
      setSuccess("");
      clearSelectedImageFile();
      return;
    }

    if (nextFile.size > IMAGE_UPLOAD_MAX_BYTES) {
      setError(t("admin.errors.fileTooLarge"));
      setSuccess("");
      clearSelectedImageFile();
      return;
    }

    setImageFile(nextFile);
    setError("");
    setSuccess("");
  };

  const getUploadErrorMessage = (requestError) => {
    const statusCode = requestError.response?.status;
    const apiCode = requestError.response?.data?.code;

    if (statusCode === 401) {
      return t("admin.errors.loginFailed");
    }

    if (apiCode === "INVALID_FILE_TYPE") {
      return t("admin.errors.invalidFileType");
    }

    if (apiCode === "FILE_TOO_LARGE" || statusCode === 413) {
      return t("admin.errors.fileTooLarge");
    }

    if (apiCode === "IMAGE_OPTIMIZATION_FAILED") {
      return t("admin.errors.imageOptimizationFailed");
    }

    return t("admin.errors.uploadFailed");
  };

  const getBlogSaveErrorMessage = (requestError) => {
    if (requestError.response?.data?.code === "SLUG_EXISTS") {
      return t("admin.errors.blogSlugExists");
    }

    if (requestError.response?.data?.code === "PAYLOAD_TOO_LARGE") {
      return t("admin.errors.blogPayloadTooLarge");
    }

    return getFriendlyApiError(requestError, t("admin.errors.blogSaveFailed"), {
      unauthorizedMessage: t("admin.errors.loginFailed"),
    });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => {
      const nextForm = {
        ...previousForm,
        [name]: value,
      };

      if (!editingId && !slugTouched && ["titleKa", "titleEn"].includes(name)) {
        nextForm.slug = createBlogSlug(nextForm.titleEn || nextForm.titleKa);
      }

      return nextForm;
    });
  };

  const handleSlugChange = (event) => {
    setSlugTouched(true);
    setForm((previousForm) => ({
      ...previousForm,
      slug: createBlogSlug(event.target.value),
    }));
  };

  const handleCategoryChange = (event) => {
    const nextCategory = getCategoryByKa(event.target.value);

    setForm((previousForm) => ({
      ...previousForm,
      categoryKa: nextCategory.ka,
      categoryEn: nextCategory.en,
    }));
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
      let imageUrl = form.image.trim();

      if (imageFile) {
        requestPhase = "upload";
        const uploadResponse = await uploadAdminBlogImage(token, imageFile);
        imageUrl = uploadResponse?.imageUrl || "";
        requestPhase = "save";
      }

      if (editingId) {
        await updateAdminBlog(token, editingId, buildPayload(imageUrl));
        setSuccess(t("admin.success.blogUpdated"));
      } else {
        await createAdminBlog(token, buildPayload(imageUrl));
        setSuccess(t("admin.success.blogCreated"));
      }

      resetForm();
      await loadBlogs();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleUnauthorized();
      }

      setError(
        requestPhase === "upload"
          ? getUploadErrorMessage(requestError)
          : getBlogSaveErrorMessage(requestError)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(t("admin.confirmBlogDelete"));

      if (!shouldDelete) {
        return;
      }
    }

    setActionId(id);
    setError("");
    setSuccess("");

    try {
      await deleteAdminBlog(token, id);

      if (editingId === id) {
        resetForm();
      }

      setSuccess(t("admin.success.blogDeleted"));
      await loadBlogs();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        handleUnauthorized();
      }

      setError(
        getFriendlyApiError(requestError, t("admin.errors.blogDeleteFailed"), {
          unauthorizedMessage: t("admin.errors.loginFailed"),
        })
      );
    } finally {
      setActionId("");
    }
  };

  const previewTitle =
    getLocalizedValue(
      {
        ka: form.titleKa,
        en: form.titleEn,
      },
      language
    ) || t("admin.blogPreviewTitle");
  const previewSubtitle =
    getLocalizedValue(
      {
        ka: form.categoryKa,
        en: form.categoryEn,
      },
      language
    ) || t("admin.blogPreviewSubtitle");
  const normalizedFormSlug = createBlogSlug(form.slug);
  const duplicateSlug = normalizedFormSlug
    ? blogs.find(
        (blog) => blog.id !== editingId && createBlogSlug(blog.slug) === normalizedFormSlug
      )
    : null;
  const categoryOptions = (() => {
    const optionsByKey = new Map(
      BLOG_CATEGORIES.map((category) => [getCategoryKey(category), category])
    );
    const currentCategory = {
      ka: form.categoryKa || DEFAULT_BLOG_CATEGORY.ka,
      en: form.categoryEn || DEFAULT_BLOG_CATEGORY.en,
    };

    optionsByKey.set(getCategoryKey(currentCategory), currentCategory);
    return Array.from(optionsByKey.values());
  })();
  const seoDescriptionKaLength = form.seoDescriptionKa.trim().length;
  const seoDescriptionEnLength = form.seoDescriptionEn.trim().length;

  return (
    <section className="space-y-6">
      <AdminToast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((currentToast) => ({ ...currentToast, message: "" }))}
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="overflow-hidden rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88">
          <TravelImage
            image={imagePreviewUrl || form.image}
            title={previewTitle}
            subtitle={previewSubtitle}
            variant="blog"
            className="h-72"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
                {editingId ? t("admin.editBlogPost") : t("admin.createBlogPost")}
              </p>
              <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                {t("admin.blogFormHeading")}
              </h3>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[#eadfcc] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d9c8ae] hover:bg-[#fff8ed] dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </button>
            ) : null}
          </div>

          {(error || success) && (
            <div className="space-y-3">
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

          <div className="grid gap-4 md:grid-cols-2">
            <LocalizedBlogFields
              title={t("admin.georgianContent")}
              fields={[
                { name: "titleKa", label: t("admin.titleKa"), value: form.titleKa },
              ]}
              excerptName="excerptKa"
              excerptLabel={t("admin.excerptKa")}
              excerptValue={form.excerptKa}
              contentName="contentKa"
              contentLabel={t("admin.contentKa")}
              contentValue={form.contentKa}
              saving={saving}
              onChange={handleFieldChange}
            />

            <LocalizedBlogFields
              title={t("admin.englishContent")}
              fields={[
                { name: "titleEn", label: t("admin.titleEn"), value: form.titleEn },
              ]}
              excerptName="excerptEn"
              excerptLabel={t("admin.excerptEn")}
              excerptValue={form.excerptEn}
              contentName="contentEn"
              contentLabel={t("admin.contentEn")}
              contentValue={form.contentEn}
              saving={saving}
              onChange={handleFieldChange}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.slug")}
              </span>
              <input
                name="slug"
                value={form.slug}
                onChange={handleSlugChange}
                disabled={saving}
                placeholder="travel-tips"
                className={inputClassName}
              />
              {duplicateSlug ? (
                <span className="block text-xs leading-6 text-amber-700 dark:text-amber-200">
                  {t("admin.blogDuplicateSlugWarning")}
                </span>
              ) : (
                <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                  {t("admin.blogSlugHelper")}
                </span>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.publishStatus")}
              </span>
              <select
                name="status"
                value={form.status}
                onChange={handleFieldChange}
                disabled={saving}
                className={inputClassName}
              >
                <option value="draft">{t("admin.draft")}</option>
                <option value="published">{t("admin.published")}</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.blogCategory")}
              </span>
              <select
                name="categoryKa"
                value={form.categoryKa}
                onChange={handleCategoryChange}
                disabled={saving}
                className={inputClassName}
              >
                {categoryOptions.map((category) => (
                  <option key={getCategoryKey(category)} value={category.ka}>
                    {getLocalizedValue(category, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.blogTags")}
              </span>
              <input
                name="tags"
                value={form.tags}
                onChange={handleFieldChange}
                disabled={saving}
                placeholder={t("admin.blogTagsPlaceholder")}
                className={inputClassName}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.blogTagsHelper")}
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.blogAuthor")}
              </span>
              <input
                name="author"
                value={form.author}
                onChange={handleFieldChange}
                disabled={saving}
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
                onChange={handleFieldChange}
                disabled={saving}
                placeholder="https://..."
                className={inputClassName}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.imageUrlHelper")}
              </span>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.uploadBlogImage")}
              </span>
              <label className="flex cursor-pointer flex-col gap-2 rounded-[1.25rem] border border-dashed border-[#d9c8ae] bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-[#c26b45] hover:bg-[#fff8ed] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-200 dark:hover:bg-orange-200/10">
                <span className="font-semibold">{t("admin.chooseImage")}</span>
                <span className="text-xs leading-6 text-slate-600 dark:text-slate-400">
                  {t("admin.imageUploadHelper")}
                </span>
                <input
                  key={imageInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  disabled={saving}
                  className="sr-only"
                />
              </label>
              {imageFile?.name ? (
                <div className="flex flex-col gap-2 rounded-[1.25rem] border border-[#efe4d4] bg-[#faf4ea] px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-semibold">{t("admin.selectedImage")}:</span>{" "}
                    {imageFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedImageFile}
                    disabled={saving}
                    className="self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950 sm:self-auto"
                  >
                    {t("admin.clearSelectedImage")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                {t("admin.blogSeoSection")}
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.seoTitleKa")}
              </span>
              <input
                name="seoTitleKa"
                value={form.seoTitleKa}
                onChange={handleFieldChange}
                disabled={saving}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.seoTitleEn")}
              </span>
              <input
                name="seoTitleEn"
                value={form.seoTitleEn}
                onChange={handleFieldChange}
                disabled={saving}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.seoDescriptionKa")}
              </span>
              <textarea
                name="seoDescriptionKa"
                value={form.seoDescriptionKa}
                onChange={handleFieldChange}
                disabled={saving}
                rows={3}
                className={`${inputClassName} resize-none`}
              />
              <span
                className={`block text-xs leading-6 ${
                  seoDescriptionKaLength > 160
                    ? "text-amber-700 dark:text-amber-200"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {t("admin.seoDescriptionHelper")} ({seoDescriptionKaLength}/160)
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.seoDescriptionEn")}
              </span>
              <textarea
                name="seoDescriptionEn"
                value={form.seoDescriptionEn}
                onChange={handleFieldChange}
                disabled={saving}
                rows={3}
                className={`${inputClassName} resize-none`}
              />
              <span
                className={`block text-xs leading-6 ${
                  seoDescriptionEnLength > 160
                    ? "text-amber-700 dark:text-amber-200"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {t("admin.seoDescriptionHelper")} ({seoDescriptionEnLength}/160)
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.canonicalUrl")}
              </span>
              <input
                name="canonicalUrl"
                value={form.canonicalUrl}
                onChange={handleFieldChange}
                disabled={saving}
                placeholder="https://aroundworld.ge/blog/travel-tips"
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.ogImage")}
              </span>
              <input
                name="ogImage"
                value={form.ogImage}
                onChange={handleFieldChange}
                disabled={saving}
                placeholder="https://..."
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid gap-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                {t("admin.blogExtrasSection")}
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.faqKa")}
              </span>
              <textarea
                name="faqKa"
                value={form.faqKa}
                onChange={handleFieldChange}
                disabled={saving}
                rows={4}
                placeholder={t("admin.faqPlaceholder")}
                className={`${inputClassName} resize-y`}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.faqHelper")}
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.faqEn")}
              </span>
              <textarea
                name="faqEn"
                value={form.faqEn}
                onChange={handleFieldChange}
                disabled={saving}
                rows={4}
                placeholder="Question | Answer"
                className={`${inputClassName} resize-y`}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.faqHelper")}
              </span>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.relatedSlugs")}
              </span>
              <input
                name="relatedSlugs"
                value={form.relatedSlugs}
                onChange={handleFieldChange}
                disabled={saving}
                placeholder="travel-planning, flight-tickets"
                className={inputClassName}
              />
              <span className="block text-xs leading-6 text-slate-600 dark:text-slate-400">
                {t("admin.relatedSlugsHelper")}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          >
            {saving
              ? t("admin.saving")
              : editingId
                ? t("admin.saveBlogUpdate")
                : t("admin.saveBlogCreate")}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-[2.4rem] border border-white/80 bg-[#fffdf8]/92 p-5 shadow-[0_30px_100px_-72px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-900/88 sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#c26b45] dark:text-orange-200">
              {t("admin.blogManagerLabel")}
            </p>
            <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
              {t("admin.blogManagerHeading")}
            </h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {blogs.length} {t("admin.blogCountSuffix")}
          </p>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton />
          ) : blogs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {blogs.map((blog, index) => {
                const title = getLocalizedValue(blog.title, language);
                const excerpt = getLocalizedValue(blog.excerpt, language);
                const category = getLocalizedValue(getBlogCategory(blog), language);
                const isBusy = actionId === blog.id;

                return (
                  <article
                    key={blog.id || blog.slug || `blog-${index}`}
                    className="overflow-hidden rounded-[1.9rem] border border-[#efe4d4] bg-white shadow-[0_22px_80px_-62px_rgba(72,52,34,0.72)] dark:border-white/10 dark:bg-slate-800/70"
                  >
                    <TravelImage
                      image={getBlogImage(blog)}
                      title={title}
                      subtitle={category}
                      variant="blog"
                      className="h-48"
                    />

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            blog.status !== "draft"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100"
                          }`}
                        >
                          {blog.status === "draft" ? t("admin.draft") : t("admin.published")}
                        </span>
                        {category ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200">
                            {category}
                          </span>
                        ) : null}
                        {Array.isArray(blog.tags)
                          ? blog.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[#faf4ea] px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200"
                              >
                                {tag}
                              </span>
                            ))
                          : null}
                      </div>

                      <div>
                        <h4 className="[font-family:var(--font-display)] text-2xl font-semibold text-slate-950 dark:text-white">
                          {title}
                        </h4>
                        {excerpt ? (
                          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {excerpt}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <BlogMeta label={t("admin.slug")} value={blog.slug} />
                        <BlogMeta label={t("admin.blogAuthor")} value={blog.author} />
                        <BlogMeta
                          label={t("common.updated")}
                          value={
                            blog.updatedAt
                              ? formatCalendarDate(blog.updatedAt, language)
                              : t("common.recent")
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(blog.id);
                            setForm(toBlogForm(blog));
                            setSlugTouched(true);
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
                          onClick={() => handleDelete(blog.id)}
                          disabled={isBusy}
                          className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                        >
                          {isBusy ? t("admin.reviewActionWorking") : t("admin.deleteAction")}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t("admin.noBlogsTitle")}
              message={t("admin.noBlogsMessage")}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function LocalizedBlogFields({
  contentLabel,
  contentName,
  contentValue,
  excerptLabel,
  excerptName,
  excerptValue,
  fields,
  onChange,
  saving,
  title,
}) {
  return (
    <div className="space-y-4 rounded-[1.6rem] border border-[#efe4d4] bg-[#faf4ea] p-4 dark:border-white/10 dark:bg-slate-800/70">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
        {title}
      </p>

      {fields.map((field) => (
        <label key={field.name} className="space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {field.label}
          </span>
          <input
            name={field.name}
            value={field.value}
            onChange={onChange}
            disabled={saving}
            className={inputClassName}
          />
        </label>
      ))}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {excerptLabel}
        </span>
        <textarea
          name={excerptName}
          value={excerptValue}
          onChange={onChange}
          disabled={saving}
          rows={3}
          className={`${inputClassName} resize-none`}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {contentLabel}
        </span>
        <textarea
          name={contentName}
          value={contentValue}
          onChange={onChange}
          disabled={saving}
          rows={8}
          className={`${inputClassName} resize-y`}
        />
      </label>
    </div>
  );
}

function BlogMeta({ label, value }) {
  return (
    <div className="rounded-[1.1rem] bg-[#faf4ea] p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value || "-"}
      </p>
    </div>
  );
}
