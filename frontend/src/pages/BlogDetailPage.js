import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, {
  buildCanonicalUrl,
  truncateSeoText,
} from "../components/SEO";
import TravelImage from "../components/TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchBlogBySlug, fetchBlogs } from "../lib/api";
import {
  categoriesEqual,
  createBlogSlug,
  getBlogCategory,
  getBlogDate,
  getBlogImage,
  getBlogOgImage,
  getReadingTime,
  getReadingTimeLabel,
  getVisibleBlogPosts,
} from "../lib/blogs";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";
import {
  buildBlogPostingStructuredData,
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../lib/structuredData";

function buildDescription(excerpt, content) {
  return truncateSeoText(excerpt || content || "", 160);
}

function formatIsoDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getFaqItems(faq, language) {
  return (Array.isArray(faq) ? faq : [])
    .map((item) => {
      const question = getLocalized(item?.question, language);
      const answer = getLocalized(item?.answer, language);

      return question && answer ? { question, answer } : null;
    })
    .filter(Boolean);
}

function createHeadingId(text, index) {
  return createBlogSlug(text) || `section-${index + 1}`;
}

function parseContentBlocks(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  const usedHeadingIds = new Map();
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
    paragraphLines = [];
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);

    if (!trimmedLine) {
      flushParagraph();
      return;
    }

    if (headingMatch) {
      flushParagraph();
      const baseId = createHeadingId(headingMatch[2], blocks.length);
      const usedCount = usedHeadingIds.get(baseId) || 0;
      const headingId = usedCount > 0 ? `${baseId}-${usedCount + 1}` : baseId;

      usedHeadingIds.set(baseId, usedCount + 1);
      blocks.push({
        type: "heading",
        level: headingMatch[1].length === 1 ? 2 : Math.min(3, headingMatch[1].length),
        text: headingMatch[2].trim(),
        id: headingId,
      });
      return;
    }

    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  return blocks;
}

function getRelatedPosts(blog, allBlogs) {
  const visibleBlogs = getVisibleBlogPosts(allBlogs).filter(
    (item) => item.slug && item.slug !== blog?.slug
  );
  const relatedSlugs = Array.isArray(blog?.relatedSlugs) ? blog.relatedSlugs : [];
  const relatedBySlug = relatedSlugs
    .map((relatedSlug) => visibleBlogs.find((item) => item.slug === relatedSlug))
    .filter(Boolean);
  const relatedByCategory = visibleBlogs.filter((item) =>
    categoriesEqual(getBlogCategory(item), getBlogCategory(blog))
  );
  const combinedPosts = [...relatedBySlug, ...relatedByCategory, ...visibleBlogs];
  const seenSlugs = new Set();

  return combinedPosts
    .filter((item) => {
      if (!item?.slug || seenSlugs.has(item.slug)) {
        return false;
      }

      seenSlugs.add(item.slug);
      return true;
    })
    .slice(0, 3);
}

export default function BlogDetailPage() {
  const { slug } = useParams();
  const { language, t } = useLanguage();
  const [blog, setBlog] = useState(null);
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlog = async () => {
      setLoading(true);
      setError("");

      try {
        const [blogResponse, blogsResponse] = await Promise.all([
          fetchBlogBySlug(slug),
          fetchBlogs().catch(() => []),
        ]);

        setBlog(blogResponse?.blog || null);
        setAllBlogs(Array.isArray(blogsResponse) ? blogsResponse : []);
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
  const category = getLocalized(getBlogCategory(blog), language);
  const canonical = blog?.canonicalUrl
    ? blog.canonicalUrl
    : buildCanonicalUrl(`/blog/${encodeURIComponent(blog?.slug || slug || "")}`);
  const seoTitle = getLocalized(blog?.seoTitle, language) || title;
  const seoDescription =
    getLocalized(blog?.seoDescription, language) || buildDescription(excerpt, content);
  const seoImage = blog ? getBlogOgImage(blog) : "";
  const publishedDate = getBlogDate(blog);
  const modifiedDate = blog?.updatedAt || publishedDate;
  const readingTime = getReadingTimeLabel(getReadingTime(blog, content), language);
  const faqItems = useMemo(() => getFaqItems(blog?.faq, language), [blog?.faq, language]);
  const contentBlocks = useMemo(() => parseContentBlocks(content), [content]);
  const contentHeadings = contentBlocks.filter((block) => block.type === "heading");
  const relatedPosts = useMemo(() => getRelatedPosts(blog, allBlogs), [allBlogs, blog]);
  const blogStructuredData =
    blog && title
      ? [
          buildBreadcrumbStructuredData([
            { name: "Aroundworld", url: "/" },
            { name: "ბლოგი", url: "/blog" },
            { name: title, url: canonical },
          ]),
          buildBlogPostingStructuredData({
            title,
            description: seoDescription,
            image: seoImage,
            canonical,
            datePublished: publishedDate,
            dateModified: modifiedDate,
            author: blog.author,
          }),
          buildFaqStructuredData(faqItems),
        ]
      : undefined;

  return (
    <PublicPageShell
      eyebrow={category || t("blog.sectionTitle")}
      title={title || t("blog.notFoundTitle")}
      description={excerpt || t("blog.heroDescription")}
      compactHero
    >
      <SEO
        title={seoTitle ? `${seoTitle} | Aroundworld` : t("blog.notFoundTitle")}
        description={seoDescription || t("blog.heroDescription")}
        canonical={canonical}
        type="article"
        image={seoImage}
        useDefaultImage={false}
        twitterCard={seoImage ? "summary_large_image" : "summary"}
        publishedTime={formatIsoDate(publishedDate)}
        modifiedTime={formatIsoDate(modifiedDate)}
        structuredData={blogStructuredData}
      />

      {loading ? <LoadingSkeleton count={1} className="xl:grid-cols-1" /> : null}

      {!loading && (!blog || error) ? (
        <div className="rounded-[1rem] border border-white/10 bg-[#10232a] p-6 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] lg:p-8">
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
        <div className="space-y-8">
          <article className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#10232a] text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)]">
            <TravelImage
              image={getBlogImage(blog)}
              title={title}
              subtitle={category}
              variant="blog"
              className="h-[20rem] md:h-[30rem]"
              loading="eager"
              fetchPriority="high"
            />

            <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0 space-y-8">
                <header className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[rgba(245,184,0,0.14)] px-3 py-1 text-xs font-semibold text-[var(--aw-accent)]">
                      {category}
                    </span>
                    {publishedDate ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                        {formatCalendarDate(publishedDate, language)}
                      </span>
                    ) : null}
                    {blog.author ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                        {blog.author}
                      </span>
                    ) : null}
                    {readingTime ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                        {readingTime}
                      </span>
                    ) : null}
                  </div>
                  {excerpt ? (
                    <p className="max-w-4xl text-base leading-8 text-white/76 md:text-lg md:leading-9">
                      {excerpt}
                    </p>
                  ) : null}
                </header>

                {contentHeadings.length > 0 ? (
                  <TableOfContents headings={contentHeadings} title={t("blog.tableOfContents")} />
                ) : null}

                <ContentRenderer blocks={contentBlocks} />

                {faqItems.length > 0 ? (
                  <FaqSection title={t("blog.faqTitle")} items={faqItems} />
                ) : null}

                {Array.isArray(blog.tags) && blog.tags.length > 0 ? (
                  <TagList title={t("blog.tagsTitle")} tags={blog.tags} />
                ) : null}

                <PlanningCta t={t} />
              </div>

              <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                {contentHeadings.length > 0 ? (
                  <TableOfContents
                    headings={contentHeadings}
                    title={t("blog.tableOfContents")}
                    compact
                  />
                ) : null}

                <div className="rounded-[1rem] border border-white/10 bg-[#07161b] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--aw-accent)]">
                    {t("blog.planningTitle")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/70">
                    {t("blog.ctaText")}
                  </p>
                  <div className="mt-5 grid gap-2">
                    <Link
                      to="/tours"
                      className="rounded-full bg-[var(--aw-accent)] px-4 py-2 text-center text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
                    >
                      {t("blog.viewTours")}
                    </Link>
                    <Link
                      to="/flights"
                      className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-center text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
                    >
                      {t("blog.searchFlights")}
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </article>

          {relatedPosts.length > 0 ? (
            <section className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-[var(--aw-accent)]">
                  {t("blog.relatedLabel")}
                </p>
                <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-white">
                  {t("blog.relatedPosts")}
                </h2>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <RelatedPostCard
                    key={relatedPost.id || relatedPost.slug}
                    blog={relatedPost}
                    language={language}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </PublicPageShell>
  );
}

function TableOfContents({ compact = false, headings, title }) {
  return (
    <nav
      aria-label={title}
      className={`rounded-[1rem] border border-white/10 bg-[#07161b] ${
        compact ? "hidden p-5 lg:block" : "p-5 lg:hidden"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--aw-accent)]">
        {title}
      </p>
      <ol className="mt-4 space-y-2">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="text-sm leading-6 text-white/70 transition hover:text-white"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ContentRenderer({ blocks }) {
  if (!blocks.length) {
    return null;
  }

  return (
    <div className="max-w-none space-y-5 break-words text-base leading-8 text-white/78">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level === 3 ? "h3" : "h2";

          return (
            <HeadingTag
              key={`${block.id}-${index}`}
              id={block.id}
              className="[font-family:var(--font-display)] scroll-mt-24 pt-2 text-2xl font-semibold leading-tight text-white md:text-3xl"
            >
              {block.text}
            </HeadingTag>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="text-white/78">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function FaqSection({ items, title }) {
  return (
    <section className="space-y-4 border-t border-white/10 pt-7">
      <h2 className="[font-family:var(--font-display)] text-3xl font-semibold text-white">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.question} className="rounded-[1rem] border border-white/10 bg-[#07161b] p-5">
            <h3 className="text-base font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TagList({ tags, title }) {
  return (
    <section className="border-t border-white/10 pt-7">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--aw-accent)]">
        {title}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[rgba(245,184,0,0.22)] bg-[rgba(245,184,0,0.1)] px-3 py-1 text-xs font-semibold text-[var(--aw-accent)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function PlanningCta({ t }) {
  return (
    <section className="rounded-[1rem] border border-[rgba(245,184,0,0.22)] bg-[rgba(245,184,0,0.1)] p-5">
      <h2 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
        {t("blog.planningTitle")}
      </h2>
      <p className="mt-3 text-sm leading-7 text-white/74">{t("blog.ctaText")}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/tours"
          className="inline-flex justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
        >
          {t("blog.viewTours")}
        </Link>
        <Link
          to="/flights"
          className="inline-flex justify-center rounded-full border border-white/12 bg-[#07161b] px-5 py-3 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
        >
          {t("blog.searchFlights")}
        </Link>
      </div>
    </section>
  );
}

function RelatedPostCard({ blog, language }) {
  const title = getLocalized(blog.title, language);
  const excerpt = getLocalized(blog.excerpt, language);
  const category = getLocalized(getBlogCategory(blog), language);

  return (
    <article className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#10232a] text-white transition hover:-translate-y-1 hover:border-white/18">
      <Link to={`/blog/${blog.slug}`} className="block">
        <TravelImage
          image={getBlogImage(blog)}
          title={title}
          subtitle={category}
          variant="blog"
          className="h-40"
        />
      </Link>
      <div className="p-5">
        <span className="rounded-full bg-[rgba(245,184,0,0.14)] px-3 py-1 text-xs font-semibold text-[var(--aw-accent)]">
          {category}
        </span>
        <h3 className="[font-family:var(--font-display)] mt-4 text-xl font-semibold leading-tight text-white">
          <Link to={`/blog/${blog.slug}`} className="transition hover:text-[var(--aw-accent)]">
            {title}
          </Link>
        </h3>
        {excerpt ? (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/68">{excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}
