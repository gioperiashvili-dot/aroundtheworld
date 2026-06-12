export const DEFAULT_BLOG_CATEGORY = {
  ka: "მოგზაურობის გზამკვლევი",
  en: "Travel Guide",
};

export const BLOG_CATEGORIES = [
  { ka: "მოგზაურობის გზამკვლევი", en: "Travel Guide" },
  { ka: "მიმართულებები", en: "Destinations" },
  { ka: "ტურები", en: "Tours" },
  { ka: "ავიაბილეთები", en: "Flights" },
  { ka: "სასტუმროები", en: "Hotels" },
  { ka: "ვიზა და დოკუმენტები", en: "Visa and Documents" },
  { ka: "სიახლეები", en: "News" },
  { ka: "რჩევები მოგზაურებისთვის", en: "Travel Tips" },
];

export function createBlogSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

export function getBlogImage(blog) {
  return blog?.coverImage || blog?.image || "";
}

export function getBlogOgImage(blog) {
  return blog?.ogImage || getBlogImage(blog);
}

export function getBlogDate(blog) {
  return blog?.publishedAt || blog?.createdAt || blog?.updatedAt || "";
}

export function normalizeBlogListResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.blogs)) return response.blogs;
  if (Array.isArray(response?.posts)) return response.posts;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

export function getLocalizedValue(value, language = "ka") {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const localizedValue = value[language] || value.ka || value.en;

  if (typeof localizedValue === "string") {
    return localizedValue;
  }

  const fallbackValue = Object.values(value).find(
    (item) => typeof item === "string" && item.trim()
  );
  return fallbackValue || "";
}

export function getBlogCategory(blog) {
  if (blog?.category && typeof blog.category === "object") {
    return {
      ka: blog.category.ka || blog.category.en || DEFAULT_BLOG_CATEGORY.ka,
      en: blog.category.en || blog.category.ka || DEFAULT_BLOG_CATEGORY.en,
    };
  }

  if (typeof blog?.category === "string" && blog.category.trim()) {
    return {
      ka: blog.category.trim(),
      en: blog.category.trim(),
    };
  }

  return { ...DEFAULT_BLOG_CATEGORY };
}

export function getCategoryKey(category) {
  const value =
    typeof category === "string"
      ? category
      : category?.ka || category?.en || DEFAULT_BLOG_CATEGORY.ka;

  return String(value || DEFAULT_BLOG_CATEGORY.ka).trim().toLowerCase();
}

export function categoriesEqual(first, second) {
  return getCategoryKey(first) === getCategoryKey(second);
}

export function getCategoryByKa(value) {
  const key = getCategoryKey(value);
  return (
    BLOG_CATEGORIES.find((category) => getCategoryKey(category.ka) === key) ||
    DEFAULT_BLOG_CATEGORY
  );
}

export function getVisibleBlogPosts(blogs) {
  return sortBlogPostsNewestFirst(
    (Array.isArray(blogs) ? blogs : []).filter(
      (blog) => blog && blog.status !== "draft"
    )
  );
}

export function sortBlogPostsNewestFirst(blogs) {
  return (Array.isArray(blogs) ? blogs : []).filter(Boolean).sort((first, second) => {
    const secondTime = Date.parse(getBlogDate(second)) || 0;
    const firstTime = Date.parse(getBlogDate(first)) || 0;
    return secondTime - firstTime;
  });
}

export function getReadingTime(blog, content = "") {
  const parsedValue = Number.parseInt(blog?.readingTime, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  const wordCount = String(content || "")
    .replace(/[#*_>`~[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 220)) : null;
}

export function getReadingTimeLabel(minutes, language = "ka") {
  const value = Number.parseInt(minutes, 10);

  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return language === "ka" ? `${value} წთ საკითხავი` : `${value} min read`;
}

export function parseCommaList(value) {
  const seenValues = new Set();

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seenValues.has(key)) {
        return false;
      }

      seenValues.add(key);
      return true;
    });
}

export function formatCommaList(values) {
  return Array.isArray(values) ? values.filter(Boolean).join(", ") : "";
}

function parseFaqLine(line) {
  const [question, ...answerParts] = String(line || "").split("|");
  const answer = answerParts.join("|");

  return {
    question: question.trim(),
    answer: answer.trim(),
  };
}

export function parseFaqLines(kaValue, enValue) {
  const kaLines = String(kaValue || "").split("\n");
  const enLines = String(enValue || "").split("\n");
  const maxLength = Math.max(kaLines.length, enLines.length);
  const faq = [];

  for (let index = 0; index < maxLength; index += 1) {
    const kaItem = parseFaqLine(kaLines[index]);
    const enItem = parseFaqLine(enLines[index]);
    const hasQuestion = kaItem.question || enItem.question;
    const hasAnswer = kaItem.answer || enItem.answer;

    if (hasQuestion && hasAnswer) {
      faq.push({
        question: {
          ka: kaItem.question,
          en: enItem.question,
        },
        answer: {
          ka: kaItem.answer,
          en: enItem.answer,
        },
      });
    }
  }

  return faq;
}

export function formatFaqLines(faq, language) {
  return (Array.isArray(faq) ? faq : [])
    .map((item) => {
      const question =
        typeof item?.question === "string"
          ? item.question
          : item?.question?.[language] || "";
      const answer =
        typeof item?.answer === "string" ? item.answer : item?.answer?.[language] || "";

      return question && answer ? `${question} | ${answer}` : "";
    })
    .filter(Boolean)
    .join("\n");
}
