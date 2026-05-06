import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, {
  SITE_NAME,
  buildCanonicalUrl,
  toAbsoluteUrl,
  truncateSeoText,
} from "../components/SEO";
import TravelImage from "../components/TravelImage";
import backgroundFour from "../assets/background/background-4.webp";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchBlogBySlug } from "../lib/api";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";

function buildDescription(excerpt, content) {
  return truncateSeoText(excerpt || content || "", 160);
}

export default function BlogDetailPage() {
  const { slug } = useParams();
  const { language, t } = useLanguage();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlog = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchBlogBySlug(slug);
        setBlog(response?.blog || null);
      } catch (requestError) {
        setBlog(null);
        setError(
          requestError.response?.status === 404
            ? t("blog.notFoundMessage")
            : getFriendlyApiError(requestError, t("blog.errors.loadBlog"))
        );
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      void loadBlog();
    }
  }, [slug, t]);

  const title = getLocalized(blog?.title, language);
  const excerpt = getLocalized(blog?.excerpt, language);
  const content = getLocalized(blog?.content, language);
  const category = getLocalized(blog?.category, language);
  const canonical = buildCanonicalUrl(`/blog/${encodeURIComponent(blog?.slug || slug || "")}`);
  const seoDescription = buildDescription(excerpt, content);
  const seoImage = blog?.image ? toAbsoluteUrl(blog.image) : undefined;
  const jsonLd = useMemo(() => {
    if (!blog || !title) {
      return null;
    }

    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: seoDescription,
      image: seoImage ? [seoImage] : undefined,
      datePublished: blog.createdAt || undefined,
      dateModified: blog.updatedAt || blog.createdAt || undefined,
      author: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      mainEntityOfPage: canonical,
    };
  }, [blog, canonical, seoDescription, seoImage, title]);

  return (
    <PublicPageShell
      backgroundImage={backgroundFour}
      eyebrow={category || t("blog.sectionTitle")}
      title={title || t("blog.notFoundTitle")}
      description={excerpt || t("blog.heroDescription")}
      compactHero
    >
      <SEO
        title={title ? `${title} | Around The World` : t("blog.notFoundTitle")}
        description={seoDescription || t("blog.heroDescription")}
        canonical={canonical}
        ogUrl={canonical}
        ogType="article"
        ogImage={seoImage}
        jsonLd={jsonLd}
      />

      {loading ? <LoadingSkeleton count={1} className="xl:grid-cols-1" /> : null}

      {!loading && (!blog || error) ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] lg:p-8">
          <EmptyState
            title={t("blog.notFoundTitle")}
            message={error || t("blog.notFoundMessage")}
          />
          <Link
            to="/blog"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            {t("blog.backToBlog")}
          </Link>
        </div>
      ) : null}

      {!loading && blog ? (
        <article className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
          <TravelImage
            image={blog.image}
            title={title}
            subtitle={category}
            variant="blog"
            className="h-[20rem] md:h-[30rem]"
            loading="eager"
            fetchPriority="high"
          />

          <div className="space-y-8 p-6 md:p-8 bg-white dark:bg-[#071426]">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {category ? (
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-100">
                    {category}
                  </span>
                ) : null}
                {blog.createdAt ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {formatCalendarDate(blog.createdAt, language)}
                  </span>
                ) : null}
              </div>
              <h2 className="[font-family:var(--font-display)] text-3xl font-semibold leading-tight text-slate-950 dark:text-white md:text-5xl">
                {title}
              </h2>
              {excerpt ? (
                <p className="max-w-4xl text-base leading-8 text-slate-600 dark:text-slate-300">
                  {excerpt}
                </p>
              ) : null}
            </header>

            <div className="prose max-w-none whitespace-pre-line break-words text-base leading-8 text-slate-700 dark:text-slate-200">
              {content}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row">
              <Link
                to="/tours"
                className="inline-flex justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d83f45]"
              >
                {t("blog.viewTours")}
              </Link>
              <Link
                to="/contact"
                className="inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {t("blog.contactUs")}
              </Link>
              <Link
                to="/blog"
                className="inline-flex justify-center rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("blog.backToBlog")}
              </Link>
            </div>
          </div>
        </article>
      ) : null}
    </PublicPageShell>
  );
}
