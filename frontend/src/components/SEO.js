import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://aroundworld.ge";
export const SITE_NAME = "Around The World";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.ico`;

export const PAGE_SEO = {
  home: {
    title: "Around The World | ტურები, ავიაბილეთები და მოგზაურობა საქართველოში",
    description:
      "Around The World დაგეხმარებათ ტურების, ავიაბილეთების, სასტუმროების, რესტორნებისა და სავიზო მომსახურების მარტივად მოძიებაში.",
    canonical: `${SITE_URL}/`,
  },
  tours: {
    title: "ტურები საქართველოდან | Around The World",
    description:
      "დაათვალიერეთ ტურები, შეარჩიეთ მიმართულება და დაგეგმეთ მოგზაურობა Around The World-ის დახმარებით.",
    canonical: `${SITE_URL}/tours`,
  },
  flights: {
    title: "ავიაბილეთების ძიება | Around The World",
    description:
      "მოძებნეთ ავიაბილეთები სასურველ მიმართულებაზე და შეარჩიეთ თქვენთვის მოსახერხებელი რეისი.",
    canonical: `${SITE_URL}/flights`,
  },
  hotels: {
    title: "სასტუმროების ძიება | Around The World",
    description:
      "მოძებნეთ სასტუმროები ქალაქის, ბიუჯეტის და მოგზაურობის სტილის მიხედვით.",
    canonical: `${SITE_URL}/hotels`,
  },
  restaurants: {
    title: "რესტორნების ძიება | Around The World",
    description:
      "აღმოაჩინეთ პოპულარული რესტორნები და შეარჩიეთ ადგილი სასიამოვნო გამოცდილებისთვის.",
    canonical: `${SITE_URL}/restaurants`,
  },
  visaServices: {
    title: "სავიზო მომსახურება | Around The World",
    description:
      "მიიღეთ კონსულტაცია სავიზო პროცესთან დაკავშირებით და მოამზადეთ მოგზაურობისთვის საჭირო დოკუმენტები.",
    canonical: `${SITE_URL}/visa-services`,
  },
  about: {
    title: "ჩვენს შესახებ | Around The World",
    description:
      "Around The World არის ტურისტული სააგენტო, რომელიც მომხმარებლებს სთავაზობს ტურებს, ავიაბილეთებს, სასტუმროებს და სამოგზაურო კონსულტაციას.",
    canonical: `${SITE_URL}/about`,
  },
  contact: {
    title: "კონტაქტი | Around The World",
    description:
      "დაუკავშირდით Around The World-ს ტურების, ავიაბილეთების, სასტუმროების და სავიზო მომსახურების შესახებ.",
    canonical: `${SITE_URL}/contact`,
  },
};

export const TRAVEL_AGENCY_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: SITE_NAME,
  url: SITE_URL,
  email: "info@aroundworld.ge",
  telephone: "+995595475533",
  address: {
    "@type": "PostalAddress",
    addressLocality: "თბილისი",
    addressCountry: "GE",
  },
};

export function toAbsoluteUrl(value, baseUrl = SITE_URL) {
  const source = String(value || "").trim();

  if (!source) {
    return "";
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(source)) {
    return source;
  }

  if (source.startsWith("//")) {
    return `https:${source}`;
  }

  return new URL(source, `${baseUrl}/`).href;
}

export function buildCanonicalUrl(path) {
  return toAbsoluteUrl(path);
}

export function truncateSeoText(value, maxLength = 160) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function buildTourSeoDescription({ description, destination, duration }) {
  const descriptionText = truncateSeoText(description);

  if (descriptionText) {
    return descriptionText;
  }

  return truncateSeoText(
    [destination, duration].filter(Boolean).join(" | ") ||
      "დაათვალიერეთ ტურის დეტალები და დაგეგმეთ მოგზაურობა Around The World-ის დახმარებით."
  );
}

export default function SEO({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogUrl,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = "summary_large_image",
  robots,
  jsonLd,
}) {
  const metaTitle = title || SITE_NAME;
  const metaDescription = description || "";
  const openGraphDescription = ogDescription || metaDescription;
  const canonicalUrl = canonical ? toAbsoluteUrl(canonical) : "";
  const openGraphUrl = toAbsoluteUrl(ogUrl || canonicalUrl || SITE_URL);
  const openGraphImage = toAbsoluteUrl(ogImage || DEFAULT_OG_IMAGE);
  const structuredDataItems = Array.isArray(jsonLd)
    ? jsonLd.filter(Boolean)
    : jsonLd
      ? [jsonLd]
      : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{metaTitle}</title>
      {metaDescription ? <meta name="description" content={metaDescription} /> : null}
      {robots ? <meta name="robots" content={robots} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={ogTitle || metaTitle} />
      {openGraphDescription ? (
        <meta property="og:description" content={openGraphDescription} />
      ) : null}
      <meta property="og:url" content={openGraphUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={openGraphImage} />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={ogTitle || metaTitle} />
      {openGraphDescription ? (
        <meta name="twitter:description" content={openGraphDescription} />
      ) : null}
      <meta name="twitter:image" content={openGraphImage} />

      {structuredDataItems.map((structuredData, index) => (
        <script key={`json-ld-${index}`} type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ))}
    </Helmet>
  );
}
