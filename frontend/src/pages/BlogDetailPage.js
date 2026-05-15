import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, {
  buildCanonicalUrl,
  truncateSeoText,
} from "../components/SEO";
import TravelImage from "../components/TravelImage";
import backgroundFour from "../assets/background/background-4.webp";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchBlogBySlug } from "../lib/api";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";
import {
  buildBlogPostingStructuredData,
  buildBreadcrumbStructuredData,
} from "../lib/structuredData";

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
  const seoImage = blog?.image || undefined;
  const blogStructuredData =
    blog && title
      ? [
          buildBreadcrumbStructuredData([
            { name: "Around The World", url: "/" },
            { name: "ბლოგი", url: "/blog" },
            { name: title, url: canonical },
          ]),
          buildBlogPostingStructuredData({
            title,
            description: seoDescription,
            image: seoImage,
            canonical,
            datePublished: blog.createdAt,
            dateModified: blog.updatedAt,
          }),
        ]
      : undefined;

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
        type="article"
        image={seoImage}
        structuredData={blogStructuredData}
      />

      {loading ? <LoadingSkeleton count={1} className="xl:grid-cols-1" /> : null}

      {!loading && (!blog || error) ? (
        <div className="rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] lg:p-8">
          <EmptyState
            title={t("blog.notFoundTitle")}
            message={error || t("blog.notFoundMessage")}
          />
          <Link
            to="/blog"
            className="mt-5 inline-flex rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
          >
            {t("blog.backToBlog")}
          </Link>
        </div>
      ) : null}

      {!loading && blog ? (
        <article className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#202020] text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)]">
          <TravelImage
            image={blog.image}
            title={title}
            subtitle={category}
            variant="blog"
            className="h-[20rem] md:h-[30rem]"
            loading="eager"
            fetchPriority="high"
          />

          <div className="space-y-8 bg-[#202020] p-6 md:p-8">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {category ? (
                  <span className="rounded-full bg-[rgba(245,184,0,0.14)] px-3 py-1 text-xs font-semibold text-[var(--aw-accent)]">
                    {category}
                  </span>
                ) : null}
                {blog.createdAt ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    {formatCalendarDate(blog.createdAt, language)}
                  </span>
                ) : null}
              </div>
              <h2 className="[font-family:var(--font-display)] max-w-[72rem] text-3xl font-semibold leading-tight text-white md:text-5xl">
                {title}
              </h2>
              {excerpt ? (
                <p className="max-w-4xl text-base leading-8 text-white/70">
                  {excerpt}
                </p>
              ) : null}
            </header>

            <div className="prose max-w-none whitespace-pre-line break-words text-base leading-8 text-white/76">
              {content}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
              <Link
                to="/tours"
                className="inline-flex justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
              >
                {t("blog.viewTours")}
              </Link>
              <Link
                to="/contact"
                className="inline-flex justify-center rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
              >
                {t("blog.contactUs")}
              </Link>
              <Link
                to="/blog"
                className="inline-flex justify-center rounded-full border border-white/12 bg-[#171717] px-5 py-3 text-sm font-semibold text-white/72 transition hover:border-[var(--aw-accent)] hover:text-white"
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
