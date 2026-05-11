#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { getPublishedBlogs } = require("../backend/services/blogs");
const { getTours } = require("../backend/services/tours");
const {
  createTourSlug,
  normalizeTourSlug,
} = require("../backend/services/tourSlugs");

const SITE_URL = "https://aroundworld.ge";
const OUTPUT_PATH = path.resolve(__dirname, "../frontend/public/sitemap.xml");
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

function normalizePathname(pathname) {
  const pathValue = String(pathname || "/").trim() || "/";

  if (pathValue === "/") {
    return "/";
  }

  return `/${pathValue.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function buildAbsoluteUrl(pathname) {
  const normalizedPath = normalizePathname(pathname);
  return `${SITE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`;
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

function createUrlEntry({ loc, lastmod, changefreq, priority }) {
  const lines = ["  <url>", `    <loc>${escapeXml(loc)}</loc>`];

  if (lastmod) {
    lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  }

  if (changefreq) {
    lines.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
  }

  if (priority) {
    lines.push(`    <priority>${escapeXml(priority)}</priority>`);
  }

  lines.push("  </url>");
  return lines.join("\n");
}

function addEntry(entriesByLoc, entry) {
  const loc = String(entry?.loc || "").trim();

  if (!loc || !loc.startsWith(SITE_URL) || loc.includes("?")) {
    return;
  }

  if (!entriesByLoc.has(loc)) {
    entriesByLoc.set(loc, entry);
  }
}

async function generateSitemap() {
  const [tours, blogs] = await Promise.all([getTours(), getPublishedBlogs()]);
  const entriesByLoc = new Map();
  const skippedTours = [];

  STATIC_ROUTES.forEach((route) => {
    addEntry(entriesByLoc, {
      loc: buildAbsoluteUrl(route.path),
      changefreq: route.changefreq,
      priority: route.priority,
    });
  });

  tours.forEach((tour) => {
    const slug = getTourSitemapSlug(tour);

    if (!slug) {
      skippedTours.push(tour?.id || "unknown tour");
      return;
    }

    addEntry(entriesByLoc, {
      loc: buildAbsoluteUrl(`/tours/${encodeURIComponent(slug)}`),
      lastmod: formatLastmod(tour.updatedAt || tour.createdAt),
      changefreq: "weekly",
      priority: "0.8",
    });
  });

  blogs.forEach((blog) => {
    const slug = String(blog?.slug || "").trim();

    if (!slug) {
      return;
    }

    addEntry(entriesByLoc, {
      loc: buildAbsoluteUrl(`/blog/${encodeURIComponent(slug)}`),
      lastmod: formatLastmod(blog.updatedAt || blog.createdAt),
      changefreq: "weekly",
      priority: "0.7",
    });
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(entriesByLoc.values()).map(createUrlEntry).join("\n")}
</urlset>
`;

  await fs.writeFile(OUTPUT_PATH, sitemapXml, "utf8");

  console.log(`[sitemap] Wrote ${entriesByLoc.size} URLs to ${OUTPUT_PATH}`);

  if (skippedTours.length > 0) {
    console.warn(
      `[sitemap] Skipped ${skippedTours.length} tour(s) without a usable slug: ${skippedTours.join(", ")}`
    );
  }
}

generateSitemap().catch((error) => {
  console.error("[sitemap] Failed to generate sitemap.xml");
  console.error(error);
  process.exit(1);
});
