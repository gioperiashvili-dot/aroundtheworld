const { getTours } = require("./tours");
const { getPublishedBlogs } = require("./blogs");

const SITE_URL = "https://aroundworld.ge";

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tours", changefreq: "weekly", priority: "0.9" },
  { path: "/flights", changefreq: "weekly", priority: "0.8" },
  { path: "/hotels", changefreq: "weekly", priority: "0.8" },
  { path: "/restaurants", changefreq: "weekly", priority: "0.8" },
  { path: "/visa-services", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
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
    .filter((tour) => tour?.id)
    .map((tour) =>
      buildUrlXml({
        loc: buildAbsoluteUrl(`/tours/${encodeURIComponent(tour.id)}`),
        lastmod: formatLastmod(tour.updatedAt || tour.createdAt),
        changefreq: "weekly",
        priority: "0.7",
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
