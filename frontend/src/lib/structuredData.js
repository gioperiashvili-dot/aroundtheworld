import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  buildCanonicalUrl,
  toAbsoluteImageUrl,
} from "../components/SEO";
import { contactDetails } from "./contact";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function getNumericPrice(value) {
  const price = typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(price) && price >= 0 ? price : null;
}

function getCurrency(value) {
  const currency = cleanText(value).toUpperCase();

  return /^[A-Z]{3}$/.test(currency) ? currency : "";
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (Array.isArray(item)) {
        return item.length > 0;
      }

      return item !== undefined && item !== null && item !== "";
    })
  );
}

export function buildOrganizationStructuredData() {
  const sameAs = [contactDetails.facebook, contactDetails.instagram]
    .map(cleanText)
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: toAbsoluteImageUrl(DEFAULT_OG_IMAGE),
    telephone: cleanText(contactDetails.phone),
    email: cleanText(contactDetails.gmail),
    sameAs,
  };
}

export function buildWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function buildWebPageStructuredData({ name, title, description, url, canonical }) {
  return compactObject({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: cleanText(name || title),
    description: cleanText(description),
    url: buildCanonicalUrl(url || canonical),
    isPartOf: { "@id": WEBSITE_ID },
  });
}

export function buildBreadcrumbStructuredData(items = []) {
  const itemListElement = items
    .map((item, index) => {
      const name = cleanText(item?.name);
      const url = buildCanonicalUrl(item?.url);

      if (!name || !url) {
        return null;
      }

      return {
        "@type": "ListItem",
        position: index + 1,
        name,
        item: url,
      };
    })
    .filter(Boolean);

  if (itemListElement.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

export function buildTourProductStructuredData({
  title,
  description,
  images = [],
  canonical,
  price,
  currency,
}) {
  const name = cleanText(title);
  const url = buildCanonicalUrl(canonical);
  const image = images
    .map(toAbsoluteImageUrl)
    .filter(Boolean);
  const numericPrice = getNumericPrice(price);
  const priceCurrency = getCurrency(currency);
  const offers =
    numericPrice !== null && priceCurrency
      ? {
          "@type": "Offer",
          price: numericPrice,
          priceCurrency,
          url,
        }
      : undefined;

  if (!name || !url) {
    return null;
  }

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#tour`,
    name,
    description: cleanText(description),
    image,
    url,
    brand: { "@id": ORGANIZATION_ID },
    offers,
  });
}

export function buildBlogPostingStructuredData({
  title,
  description,
  image,
  canonical,
  datePublished,
  dateModified,
}) {
  const headline = cleanText(title);
  const url = buildCanonicalUrl(canonical);

  if (!headline || !url) {
    return null;
  }

  return compactObject({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#blog-posting`,
    headline,
    description: cleanText(description),
    image: image ? [toAbsoluteImageUrl(image)].filter(Boolean) : [],
    datePublished: formatDate(datePublished),
    dateModified: formatDate(dateModified),
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: url,
    url,
  });
}
