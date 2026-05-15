import { Helmet } from "react-helmet-async";
import defaultOgImage from "../assets/AroundTheWorld.png";

export const SITE_URL = "https://aroundworld.ge";
export const SITE_NAME = "Around The World";
export const PRODUCTION_API_URL = "https://api.aroundworld.ge";
export const DEFAULT_TITLE = "Around The World | ტურისტული სააგენტო";
export const DEFAULT_DESCRIPTION =
  "ტურისტული სააგენტო Around The World გთავაზობთ ტურებს, ავიაბილეთებს, სასტუმროებს, ტრანსფერებს და ინდივიდუალურ სამოგზაურო მომსახურებას.";
export const DEFAULT_OG_IMAGE = defaultOgImage;
export const TOUR_DETAIL_FALLBACK_DESCRIPTION =
  "დეტალური ინფორმაცია ტურის შესახებ, ფასები, თარიღები და ჯავშნის მოთხოვნა Around The World-ზე.";

export const PAGE_SEO = {
  home: {
    title: "Around The World | ტურისტული სააგენტო საქართველოში",
    description:
      "ტურისტული სააგენტო Around The World დაგეხმარებათ ტურების, ავიაბილეთების, სასტუმროების, ტრანსფერებისა და ინდივიდუალური მოგზაურობის დაგეგმვაში.",
    canonical: `${SITE_URL}/`,
  },
  tours: {
    title: "ტურები | Around The World",
    description:
      "აღმოაჩინეთ ტურები და სამოგზაურო პაკეტები Around The World-თან ერთად. შეარჩიეთ მიმართულება და გაგზავნეთ ჯავშნის მოთხოვნა მარტივად.",
    canonical: `${SITE_URL}/tours`,
  },
  flights: {
    title: "ავიაბილეთები | Around The World",
    description:
      "მოძებნეთ ავიაბილეთები Around The World-ის დახმარებით და დაგეგმეთ თქვენი მოგზაურობა მარტივად.",
    canonical: `${SITE_URL}/flights`,
  },
  hotels: {
    title: "სასტუმროები | Around The World",
    description:
      "მოძებნეთ სასტუმროები და საცხოვრებელი ვარიანტები Around The World-ის დახმარებით.",
    canonical: `${SITE_URL}/hotels`,
  },
  restaurants: {
    title: "რესტორნები | Around The World",
    description:
      "აღმოაჩინეთ რესტორნები და ადგილები Around The World-ის სამოგზაურო სერვისებთან ერთად.",
    canonical: `${SITE_URL}/restaurants`,
  },
  visaServices: {
    title: "სავიზო მომსახურება | Around The World",
    description:
      "მიიღეთ სავიზო კონსულტაცია და სამოგზაურო დოკუმენტებთან დაკავშირებული დახმარება Around The World-ისგან.",
    canonical: `${SITE_URL}/visa-services`,
  },
  blog: {
    title: "ბლოგი | Around The World",
    description:
      "წაიკითხეთ Around The World-ის ბლოგი, სამოგზაურო რჩევები, სიახლეები და მომხმარებლების შეფასებები.",
    canonical: `${SITE_URL}/blog`,
  },
  about: {
    title: "ჩვენ შესახებ | Around The World",
    description:
      "გაიგეთ მეტი ტურისტული სააგენტო Around The World-ის შესახებ და ნახეთ, როგორ გეხმარებით მოგზაურობის დაგეგმვაში.",
    canonical: `${SITE_URL}/about`,
  },
  contact: {
    title: "კონტაქტი | Around The World",
    description:
      "დაუკავშირდით Around The World-ს ტურების, ავიაბილეთების, სასტუმროების, ტრანსფერებისა და სხვა სამოგზაურო სერვისების შესახებ.",
    canonical: `${SITE_URL}/contact`,
  },
};

function normalizePathname(pathname) {
  const path = String(pathname || "/").trim() || "/";

  if (path === "/") {
    return "/";
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function cleanSeoText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\bSee less\b/gi, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMojibake(value) {
  return /(?:áƒ|ðŸ|âœ|â€|ï»¿)/.test(String(value || ""));
}

export function toAbsoluteUrl(value, baseUrl = SITE_URL) {
  const source = String(value || "").trim();

  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source, `${String(baseUrl).replace(/\/+$/, "")}/`);

    if (parsedUrl.hostname === "aroundworld.ge") {
      parsedUrl.protocol = "https:";
    }

    return parsedUrl.href;
  } catch (_error) {
    return "";
  }
}

export function toAbsoluteImageUrl(value) {
  const source = String(value || DEFAULT_OG_IMAGE).trim();

  if (!source) {
    return "";
  }

  try {
    const parsedUrl = new URL(source, `${SITE_URL}/`);
    const isUpload = parsedUrl.pathname.startsWith("/uploads/");
    const isLocalApiHost =
      parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

    if (
      isUpload &&
      (source.startsWith("/uploads/") ||
        isLocalApiHost ||
        parsedUrl.hostname === "api.aroundworld.ge")
    ) {
      return `${PRODUCTION_API_URL}${parsedUrl.pathname}${parsedUrl.search}`;
    }

    if (parsedUrl.hostname === "aroundworld.ge") {
      parsedUrl.protocol = "https:";
    }

    if (parsedUrl.hostname === "api.aroundworld.ge") {
      parsedUrl.protocol = "https:";
    }

    return parsedUrl.href;
  } catch (_error) {
    return "";
  }
}

export function buildCanonicalUrl(path = "/") {
  const source = String(path || "/").trim() || "/";

  try {
    const parsedUrl = new URL(source, `${SITE_URL}/`);
    return `${SITE_URL}${normalizePathname(parsedUrl.pathname)}`;
  } catch (_error) {
    return `${SITE_URL}/`;
  }
}

export function truncateSeoText(value, maxLength = 160) {
  const text = cleanSeoText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function buildTourSeoDescription({
  shortDescription,
  description,
  maxLength = 160,
} = {}) {
  const cleanedShortDescription = cleanSeoText(shortDescription);

  if (cleanedShortDescription && !hasMojibake(cleanedShortDescription)) {
    return truncateSeoText(cleanedShortDescription, maxLength);
  }

  const cleanedDescription = cleanSeoText(description);

  if (
    cleanedDescription &&
    cleanedDescription.length >= 40 &&
    !hasMojibake(cleanedDescription)
  ) {
    return truncateSeoText(cleanedDescription, maxLength);
  }

  return TOUR_DETAIL_FALLBACK_DESCRIPTION;
}

function getStructuredDataItems(structuredData) {
  const values = Array.isArray(structuredData) ? structuredData : [structuredData];

  return values.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      Object.keys(item).length > 0
  );
}

function serializeStructuredData(structuredData) {
  return JSON.stringify(structuredData).replace(/</g, "\\u003c");
}

export default function SEO({
  title,
  description,
  canonical = "/",
  image,
  type,
  noindex = false,
  locale = "ka_GE",
  ogTitle,
  ogDescription,
  ogUrl,
  ogType,
  ogImage,
  twitterCard = "summary_large_image",
  robots,
  structuredData,
}) {
  const metaTitle = cleanSeoText(title) || DEFAULT_TITLE;
  const metaDescription =
    truncateSeoText(description || DEFAULT_DESCRIPTION, 220) || DEFAULT_DESCRIPTION;
  const canonicalUrl = buildCanonicalUrl(canonical);
  const openGraphTitle = cleanSeoText(ogTitle) || metaTitle;
  const openGraphDescription =
    truncateSeoText(ogDescription || metaDescription, 220) || metaDescription;
  const openGraphUrl = buildCanonicalUrl(ogUrl || canonicalUrl);
  const openGraphType = type || ogType || "website";
  const openGraphImage = toAbsoluteImageUrl(image || ogImage || DEFAULT_OG_IMAGE);
  const robotsContent = noindex ? "noindex,nofollow" : robots;
  const structuredDataItems = getStructuredDataItems(structuredData);

  return (
    <Helmet prioritizeSeoTags>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      {robotsContent ? <meta name="robots" content={robotsContent} /> : null}
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={openGraphTitle} />
      <meta property="og:description" content={openGraphDescription} />
      <meta property="og:type" content={openGraphType} />
      <meta property="og:url" content={openGraphUrl} />
      {openGraphImage ? <meta property="og:image" content={openGraphImage} /> : null}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={openGraphTitle} />
      <meta name="twitter:description" content={openGraphDescription} />
      {openGraphImage ? <meta name="twitter:image" content={openGraphImage} /> : null}

      {structuredDataItems.map((item, index) => (
        <script key={`structured-data-${index}`} type="application/ld+json">
          {serializeStructuredData(item)}
        </script>
      ))}
    </Helmet>
  );
}
