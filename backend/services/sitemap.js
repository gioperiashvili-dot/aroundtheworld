const { getTours } = require("./tours");
const { getPublishedBlogs } = require("./blogs");
const { createTourSlug, normalizeTourSlug } = require("./tourSlugs");

const SITE_URL = "https://aroundworld.ge";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tours", changefreq: "weekly", priority: "0.9" },
  { path: "/flights", changefreq: "weekly", priority: "0.7" },
  { path: "/hotels", changefreq: "weekly", priority: "0.7" },
  { path: "/restaurants", changefreq: "weekly", priority: "0.7" },
  { path: "/visa-services", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
];

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildAbsoluteUrl(path) {
  return `${SITE_URL}${path === "/" ? "/" : path}`;
}

function getLocalizedText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return String(value.ka || value.en || "").trim();
}

function getTourSitemapSlug(tour) {
  const existingSlug = normalizeTourSlug(tour?.slug);

  if (existingSlug && !UUID_PATTERN.test(existingSlug)) {
    return existingSlug;
  }

  const fallbackSource =
    getLocalizedText(tour?.title) || getLocalizedText(tour?.destination);
  const generatedSlug = createTourSlug(fallbackSource, "");

  if (generatedSlug && !UUID_PATTERN.test(generatedSlug)) {
    return generatedSlug;
  }

  return "";
}

function formatLastmod(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function buildUrlXml({ loc, changefreq, priority, lastmod }) {
  const lastmodXml = lastmod
    ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>`
    : "";

  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodXml}
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;
}

async function buildSitemapXml() {
  const [tours, blogs] = await Promise.all([getTours(), getPublishedBlogs()]);
  const staticEntries = STATIC_ROUTES.map((route) =>
    buildUrlXml({
      loc: buildAbsoluteUrl(route.path),
      changefreq: route.changefreq,
      priority: route.priority,
    })
  );
  const tourEntries = tours
    .map((tour) => ({
      tour,
      slug: getTourSitemapSlug(tour),
    }))
    .filter(({ slug }) => slug)
    .map(({ tour, slug }) =>
      buildUrlXml({
        loc: buildAbsoluteUrl(`/tours/${encodeURIComponent(slug)}`),
        lastmod: formatLastmod(tour.updatedAt || tour.createdAt),
        changefreq: "weekly",
        priority: "0.8",
      })
    );
  const blogEntries = blogs
    .filter((blog) => blog?.slug)
    .map((blog) =>
      buildUrlXml({
        loc: buildAbsoluteUrl(`/blog/${encodeURIComponent(blog.slug)}`),
        lastmod: formatLastmod(blog.updatedAt || blog.createdAt),
        changefreq: "weekly",
        priority: "0.7",
      })
    );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...tourEntries, ...blogEntries].join("\n")}
</urlset>
`;
}

module.exports = {
  buildSitemapXml,
};
