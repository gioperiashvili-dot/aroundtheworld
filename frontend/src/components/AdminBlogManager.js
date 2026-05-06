import { useCallback, useEffect, useState } from "react";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import TravelImage from "./TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import {
  createAdminBlog,
  deleteAdminBlog,
  fetchAdminBlogs,
  updateAdminBlog,
  uploadAdminBlogImage,
} from "../lib/api";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";

const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20";

function createEmptyBlogForm() {
  return {
    titleKa: "",
    titleEn: "",
    excerptKa: "",
    excerptEn: "",
    contentKa: "",
    contentEn: "",
    categoryKa: "",
    categoryEn: "",
    slug: "",
    status: "draft",
    image: "",
  };
}

function toBlogForm(blog) {
  return {
    titleKa: blog?.title?.ka || "",
    titleEn: blog?.title?.en || "",
    excerptKa: blog?.excerpt?.ka || "",
    excerptEn: blog?.excerpt?.en || "",
    contentKa: blog?.content?.ka || "",
    contentEn: blog?.content?.en || "",
    categoryKa: blog?.category?.ka || "",
    categoryEn: blog?.category?.en || "",
    slug: blog?.slug || "",
    status: blog?.status === "published" ? "published" : "draft",
    image: blog?.image || "",
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const response = await fetchAdminBlogs(token);
      setBlogs(Array.isArray(response?.blogs) ? response.blogs : []);
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

  const resetForm = () => {
    setEditingId("");
    setForm(createEmptyBlogForm());
    setImageFile(null);
    setImageInputKey((currentKey) => currentKey + 1);
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

    return null;
  };

  const buildPayload = (imageValue = form.image.trim()) => ({
    slug: form.slug.trim(),
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
      ka: form.categoryKa.trim(),
      en: form.categoryEn.trim(),
    },
    image: imageValue.trim(),
    status: form.status,
  });

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
    getLocalized(
      {
        ka: form.titleKa,
        en: form.titleEn,
      },
      language
    ) || t("admin.blogPreviewTitle");
  const previewSubtitle =
    getLocalized(
      {
        ka: form.categoryKa,
        en: form.categoryEn,
      },
      language
    ) || t("admin.blogPreviewSubtitle");

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
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
          className="space-y-5 rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
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
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                {
                  name: "categoryKa",
                  label: t("admin.categoryKa"),
                  value: form.categoryKa,
                },
              ]}
              excerptName="excerptKa"
              excerptLabel={t("admin.excerptKa")}
              excerptValue={form.excerptKa}
              contentName="contentKa"
              contentLabel={t("admin.contentKa")}
              contentValue={form.contentKa}
              saving={saving}
              onChange={(event) => {
                const { name, value } = event.target;
                setForm((previousForm) => ({
                  ...previousForm,
                  [name]: value,
                }));
              }}
            />

            <LocalizedBlogFields
              title={t("admin.englishContent")}
              fields={[
                { name: "titleEn", label: t("admin.titleEn"), value: form.titleEn },
                {
                  name: "categoryEn",
                  label: t("admin.categoryEn"),
                  value: form.categoryEn,
                },
              ]}
              excerptName="excerptEn"
              excerptLabel={t("admin.excerptEn")}
              excerptValue={form.excerptEn}
              contentName="contentEn"
              contentLabel={t("admin.contentEn")}
              contentValue={form.contentEn}
              saving={saving}
              onChange={(event) => {
                const { name, value } = event.target;
                setForm((previousForm) => ({
                  ...previousForm,
                  [name]: value,
                }));
              }}
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
                onChange={(event) =>
                  setForm((previousForm) => ({
                    ...previousForm,
                    slug: event.target.value,
                  }))
                }
                placeholder="travel-tips"
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.publishStatus")}
              </span>
              <select
                name="status"
                value={form.status}
                onChange={(event) =>
                  setForm((previousForm) => ({
                    ...previousForm,
                    status: event.target.value,
                  }))
                }
                className={inputClassName}
              >
                <option value="draft">{t("admin.draft")}</option>
                <option value="published">{t("admin.published")}</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("admin.imageUrl")}
              </span>
              <input
                name="image"
                value={form.image}
                onChange={(event) =>
                  setForm((previousForm) => ({
                    ...previousForm,
                    image: event.target.value,
                  }))
                }
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
              <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-500/10">
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
                <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800/70 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between">
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

          <button
            type="submit"
            disabled={saving}
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          >
            {saving
              ? t("admin.saving")
              : editingId
                ? t("admin.saveBlogUpdate")
                : t("admin.saveBlogCreate")}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
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
              {blogs.map((blog) => {
                const title = getLocalized(blog.title, language);
                const excerpt = getLocalized(blog.excerpt, language);
                const category = getLocalized(blog.category, language);
                const isBusy = actionId === blog.id;

                return (
                  <article
                    key={blog.id}
                    className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-slate-50 shadow-[0_22px_80px_-60px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-800/70 dark:shadow-[0_22px_80px_-60px_rgba(2,6,23,0.85)]"
                  >
                    <TravelImage
                      image={blog.image}
                      title={title}
                      subtitle={category}
                      variant="blog"
                      className="h-48"
                    />

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            blog.status === "published"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100"
                          }`}
                        >
                          {blog.status === "published"
                            ? t("admin.published")
                            : t("admin.draft")}
                        </span>
                        {category ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200">
                            {category}
                          </span>
                        ) : null}
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
    <div className="space-y-4 rounded-[1.6rem] bg-slate-50 p-4 dark:bg-slate-800/70">
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
    <div className="rounded-[1.1rem] bg-white p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value || "-"}
      </p>
    </div>
  );
}
