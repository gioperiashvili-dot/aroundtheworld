const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const blogsFilePath = path.resolve(__dirname, "../data/blogs.json");
const BLOG_STATUSES = new Set(["draft", "published"]);
const MAX_BLOG_PAYLOAD_BYTES = 256 * 1024;
const DEFAULT_BLOG_CATEGORY = {
  ka: "მოგზაურობის გზამკვლევი",
  en: "Travel Guide",
};
const TEXT_LIMITS = {
  title: 180,
  excerpt: 700,
  content: 30000,
  category: 120,
  slug: 120,
  image: 1000,
  author: 140,
  seoTitle: 180,
  seoDescription: 320,
  canonicalUrl: 1000,
  tag: 60,
  relatedSlug: 120,
  faqQuestion: 220,
  faqAnswer: 1200,
};

let writeQueue = Promise.resolve();

function createBlogsError(statusCode, error, details, code) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  requestError.code = code;
  return requestError;
}

async function ensureBlogsFile() {
  await fs.mkdir(path.dirname(blogsFilePath), { recursive: true });

  try {
    await fs.access(blogsFilePath);
  } catch (_error) {
    await fs.writeFile(blogsFilePath, "[]\n", "utf8");
  }
}

function normalizeSingleLine(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeMultiline(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeLocalizedField(value, maxLength, options = {}) {
  const normalizeValue = options.multiline ? normalizeMultiline : normalizeSingleLine;

  if (typeof value === "string") {
    return {
      ka: "",
      en: normalizeValue(value, maxLength),
    };
  }

  if (!value || typeof value !== "object") {
    return {
      ka: "",
      en: "",
    };
  }

  return {
    ka: normalizeValue(value.ka, maxLength),
    en: normalizeValue(value.en, maxLength),
  };
}

function hasLocalizedValue(value) {
  return Boolean(normalizeSingleLine(value?.ka, 1) || normalizeSingleLine(value?.en, 1));
}

function withLocalizedFallback(value, fallback) {
  return {
    ka: value.ka || fallback.ka || fallback.en || "",
    en: value.en || fallback.en || fallback.ka || "",
  };
}

function sanitizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TEXT_LIMITS.slug)
    .replace(/-+$/g, "");
}

function normalizeImage(value) {
  const source = normalizeSingleLine(value, TEXT_LIMITS.image);

  if (!source || /^data:/i.test(source)) {
    return "";
  }

  if (source.startsWith("/uploads/")) {
    return source;
  }

  try {
    const parsedUrl = new URL(source);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch (_error) {
    return "";
  }
}

function normalizeCanonicalUrl(value) {
  const source = normalizeSingleLine(value, TEXT_LIMITS.canonicalUrl);

  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.toString() : "";
  } catch (_error) {
    return "";
  }
}

function getTimestampValue(value) {
  const parsedDate = new Date(value || "");
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function sortNewestFirst(blogs) {
  return [...blogs].sort((first, second) => {
    const secondTime = getTimestampValue(
      second.publishedAt || second.createdAt || second.updatedAt
    );
    const firstTime = getTimestampValue(
      first.publishedAt || first.createdAt || first.updatedAt
    );
    return secondTime - firstTime;
  });
}

function normalizeList(value, maxItemLength, options = {}) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seenItems = new Set();
  const maxItems = options.maxItems || 24;

  return rawItems
    .map((item) =>
      options.slug
        ? sanitizeSlug(item)
        : normalizeSingleLine(String(item || ""), maxItemLength)
    )
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seenItems.has(key)) {
        return false;
      }

      seenItems.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function normalizeFaq(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const question = normalizeLocalizedField(item?.question, TEXT_LIMITS.faqQuestion);
      const answer = normalizeLocalizedField(item?.answer, TEXT_LIMITS.faqAnswer, {
        multiline: true,
      });

      if (!hasLocalizedValue(question) || !hasLocalizedValue(answer)) {
        return null;
      }

      return { question, answer };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function countWords(value) {
  return String(value || "")
    .replace(/[#*_>`~[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function calculateReadingTime(content) {
  const wordCount = countWords(content?.ka) || countWords(content?.en);

  if (!wordCount) {
    return null;
  }

  return Math.max(1, Math.ceil(wordCount / 220));
}

function normalizeReadingTime(value, content) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0 && parsedValue <= 180) {
    return parsedValue;
  }

  return calculateReadingTime(content);
}

function getPublishedAt(record, status) {
  const publishedAt = normalizeSingleLine(record?.publishedAt, 80);

  if (publishedAt) {
    return publishedAt;
  }

  if (status === "published") {
    return record?.createdAt || record?.updatedAt || null;
  }

  return null;
}

function normalizeBlogRecord(record, index = 0) {
  const id = normalizeSingleLine(
    record?.id || record?.slug || `legacy-${index + 1}`,
    120
  );
  const title = normalizeLocalizedField(record?.title, TEXT_LIMITS.title);
  const excerpt = normalizeLocalizedField(record?.excerpt, TEXT_LIMITS.excerpt, {
    multiline: true,
  });
  const content = normalizeLocalizedField(record?.content, TEXT_LIMITS.content, {
    multiline: true,
  });
  const rawCategory = normalizeLocalizedField(record?.category, TEXT_LIMITS.category);
  const category = hasLocalizedValue(rawCategory)
    ? rawCategory
    : { ...DEFAULT_BLOG_CATEGORY };
  const seoTitle = normalizeLocalizedField(record?.seoTitle, TEXT_LIMITS.seoTitle);
  const seoDescription = normalizeLocalizedField(
    record?.seoDescription,
    TEXT_LIMITS.seoDescription,
    { multiline: true }
  );
  const status = BLOG_STATUSES.has(record?.status) ? record.status : "published";
  const slug =
    sanitizeSlug(record?.slug) ||
    sanitizeSlug(title.ka) ||
    sanitizeSlug(title.en) ||
    sanitizeSlug(id);
  const image = normalizeImage(record?.coverImage || record?.image);
  const ogImage = normalizeImage(record?.ogImage);

  return {
    id,
    slug,
    title,
    excerpt,
    content,
    category,
    tags: normalizeList(record?.tags, TEXT_LIMITS.tag, { maxItems: 24 }),
    author: normalizeSingleLine(record?.author, TEXT_LIMITS.author),
    image,
    coverImage: image,
    status,
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
    publishedAt: getPublishedAt(record, status),
    seoTitle: hasLocalizedValue(seoTitle) ? seoTitle : withLocalizedFallback(seoTitle, title),
    seoDescription: hasLocalizedValue(seoDescription)
      ? seoDescription
      : withLocalizedFallback(seoDescription, excerpt),
    canonicalUrl: normalizeCanonicalUrl(record?.canonicalUrl),
    ogImage,
    readingTime: normalizeReadingTime(record?.readingTime, content),
    faq: normalizeFaq(record?.faq),
    relatedSlugs: normalizeList(record?.relatedSlugs, TEXT_LIMITS.relatedSlug, {
      maxItems: 12,
      slug: true,
    }),
  };
}

function validateImageInput(input, fieldName) {
  const value = input?.[fieldName];

  if (typeof value === "string" && /^data:/i.test(value.trim())) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      `${fieldName} must not contain base64 image data. Upload the image first or use an external URL.`,
      "VALIDATION_ERROR"
    );
  }

  if (typeof value === "string" && value.trim() && !normalizeImage(value)) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      `${fieldName} must be an http(s) URL or an /uploads/ path.`,
      "VALIDATION_ERROR"
    );
  }
}

function validateBlogInput(input, id) {
  const rawStatus = normalizeSingleLine(input?.status || "published", 20);

  if (!BLOG_STATUSES.has(rawStatus)) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      "status must be draft or published.",
      "VALIDATION_ERROR"
    );
  }

  validateImageInput(input, "image");
  validateImageInput(input, "coverImage");
  validateImageInput(input, "ogImage");

  if (
    typeof input?.canonicalUrl === "string" &&
    input.canonicalUrl.trim() &&
    !normalizeCanonicalUrl(input.canonicalUrl)
  ) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      "canonicalUrl must be an absolute http(s) URL.",
      "VALIDATION_ERROR"
    );
  }

  const normalizedBlog = normalizeBlogRecord(
    {
      ...input,
      id,
      status: rawStatus,
    },
    0
  );

  if (!normalizedBlog.title.ka) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      "title.ka is required.",
      "VALIDATION_ERROR"
    );
  }

  if (!normalizedBlog.content.ka) {
    throw createBlogsError(
      400,
      "Invalid blog post",
      "content.ka is required.",
      "VALIDATION_ERROR"
    );
  }

  normalizedBlog.slug =
    sanitizeSlug(input?.slug) ||
    sanitizeSlug(normalizedBlog.title.ka) ||
    sanitizeSlug(normalizedBlog.title.en) ||
    sanitizeSlug(id);

  return normalizedBlog;
}

async function readBlogsFile() {
  await ensureBlogsFile();
  const fileContents = await fs.readFile(blogsFilePath, "utf8");

  try {
    const parsed = JSON.parse(fileContents);
    return Array.isArray(parsed)
      ? parsed.map((record, index) => normalizeBlogRecord(record, index))
      : [];
  } catch (_error) {
    throw createBlogsError(
      500,
      "Blogs data is invalid",
      "The blogs storage file could not be parsed.",
      "BLOGS_DATA_INVALID"
    );
  }
}

async function writeBlogsFile(blogs) {
  await ensureBlogsFile();
  const serializedBlogs = `${JSON.stringify(blogs, null, 2)}\n`;
  await fs.writeFile(blogsFilePath, serializedBlogs, "utf8");
}

function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function createUniqueSlug(blogs, baseSlug, id) {
  const fallbackSlug = sanitizeSlug(id) || String(id);
  const cleanBaseSlug = baseSlug || fallbackSlug;
  let nextSlug = cleanBaseSlug;
  let suffix = 2;

  while (blogs.some((blog) => blog.slug === nextSlug && blog.id !== id)) {
    nextSlug = `${cleanBaseSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

function assertUniqueProvidedSlug(blogs, slug, id) {
  const duplicate = blogs.find((blog) => blog.slug === slug && blog.id !== id);

  if (duplicate) {
    throw createBlogsError(
      409,
      "Slug already exists",
      "Choose a unique blog slug.",
      "SLUG_EXISTS"
    );
  }
}

async function getBlogs() {
  const blogs = await readBlogsFile();
  return sortNewestFirst(blogs);
}

async function getPublishedBlogs() {
  const blogs = await readBlogsFile();
  return sortNewestFirst(blogs.filter((blog) => blog.status === "published"));
}

async function getBlogById(id) {
  const blogs = await readBlogsFile();
  return blogs.find((blog) => blog.id === String(id)) || null;
}

async function getPublishedBlogBySlug(slug) {
  const safeSlug = sanitizeSlug(slug);
  const blogs = await readBlogsFile();
  return (
    blogs.find((blog) => blog.slug === safeSlug && blog.status === "published") || null
  );
}

async function createBlog(input) {
  const id = randomUUID();
  const nextBlog = validateBlogInput(input, id);
  const hasProvidedSlug = Boolean(normalizeSingleLine(input?.slug, TEXT_LIMITS.slug));

  return queueWrite(async () => {
    const blogs = await readBlogsFile();
    nextBlog.slug = hasProvidedSlug
      ? nextBlog.slug
      : createUniqueSlug(blogs, nextBlog.slug, id);
    assertUniqueProvidedSlug(blogs, nextBlog.slug, id);

    const timestamp = new Date().toISOString();
    const createdBlog = {
      ...nextBlog,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt:
        nextBlog.status === "published" ? nextBlog.publishedAt || timestamp : null,
    };

    blogs.unshift(createdBlog);
    await writeBlogsFile(blogs);
    return createdBlog;
  });
}

async function updateBlog(id, input) {
  const nextBlog = validateBlogInput(input, String(id));
  const hasProvidedSlug = Boolean(normalizeSingleLine(input?.slug, TEXT_LIMITS.slug));

  return queueWrite(async () => {
    const blogs = await readBlogsFile();
    const existingIndex = blogs.findIndex((blog) => blog.id === String(id));

    if (existingIndex === -1) {
      throw createBlogsError(
        404,
        "Blog post not found",
        "The requested blog post does not exist.",
        "BLOG_NOT_FOUND"
      );
    }

    nextBlog.slug = hasProvidedSlug
      ? nextBlog.slug
      : createUniqueSlug(blogs, nextBlog.slug, String(id));
    assertUniqueProvidedSlug(blogs, nextBlog.slug, String(id));

    const existingBlog = blogs[existingIndex];
    const timestamp = new Date().toISOString();
    const updatedBlog = {
      ...existingBlog,
      ...nextBlog,
      id: existingBlog.id,
      createdAt: existingBlog.createdAt,
      updatedAt: timestamp,
      publishedAt:
        nextBlog.status === "published"
          ? nextBlog.publishedAt || existingBlog.publishedAt || timestamp
          : nextBlog.publishedAt || existingBlog.publishedAt || null,
    };

    blogs[existingIndex] = updatedBlog;
    await writeBlogsFile(blogs);
    return updatedBlog;
  });
}

async function deleteBlog(id) {
  return queueWrite(async () => {
    const blogs = await readBlogsFile();
    const existingIndex = blogs.findIndex((blog) => blog.id === String(id));

    if (existingIndex === -1) {
      throw createBlogsError(
        404,
        "Blog post not found",
        "The requested blog post does not exist.",
        "BLOG_NOT_FOUND"
      );
    }

    const [removedBlog] = blogs.splice(existingIndex, 1);
    await writeBlogsFile(blogs);
    return removedBlog;
  });
}

module.exports = {
  BLOG_STATUSES,
  DEFAULT_BLOG_CATEGORY,
  MAX_BLOG_PAYLOAD_BYTES,
  createBlog,
  deleteBlog,
  getBlogById,
  getBlogs,
  getPublishedBlogBySlug,
  getPublishedBlogs,
  sanitizeSlug,
  updateBlog,
};
