import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import TourCard from "../components/TourCard";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTours } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";
import { aroundWorldPageBackground } from "../lib/pageBackgrounds";
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildWebPageStructuredData,
} from "../lib/structuredData";

const TOURS_LISTING_ID = "tours-listing";
const TOURS_SEO_DESCRIPTION =
  "აღმოაჩინე ტურები საქართველოდან Aroundworld.ge-ზე — დასასვენებელი, კულტურული, საოჯახო და მომლოცველთა ტურები. შეარჩიე მიმართულება და გააგზავნე ჯავშნის მოთხოვნა მარტივად.";

const TOURS_LANDING_COPY = {
  ka: {
    eyebrow: "ტურები საქართველოდან",
    title: "ტურები საქართველოდან — დაგეგმე მოგზაურობა Aroundworld-თან ერთად",
    description:
      "Aroundworld.ge გეხმარება მარტივად შეარჩიო დასასვენებელი, კულტურული, საოჯახო და მომლოცველთა ტურები სხვადასხვა მიმართულებით. დაათვალიერე შეთავაზებები, აირჩიე სასურველი ტური და გააგზავნე ჯავშნის მოთხოვნა პირდაპირ საიტიდან.",
    cta: {
      viewTours: "ტურების ნახვა",
      requestBooking: "ჯავშნის მოთხოვნა",
      flights: "ავიაბილეთების ძიება",
      hotels: "სასტუმროების ძიება",
      restaurants: "რესტორნების ძიება",
    },
    benefits: {
      title: "რატომ უნდა აირჩიო Aroundworld-ის ტურები?",
      items: [
        {
          title: "მარტივი ჯავშნის მოთხოვნა",
          text: "შეარჩიე ტური და გააგზავნე მოთხოვნა რამდენიმე წუთში — ჩვენი გუნდი დაგიკავშირდება დეტალების დასაზუსტებლად.",
        },
        {
          title: "პერსონალური კონსულტაცია",
          text: "მოგზაურობის დაგეგმვისას მიიღებ დახმარებას მიმართულების, სასტუმროს, თარიღებისა და პირობების შერჩევაში.",
        },
        {
          title: "სხვადასხვა ტიპის ტურები",
          text: "დასასვენებელი, კულტურული, საოჯახო, ჯგუფური და მომლოცველთა ტურები სხვადასხვა მიმართულებით.",
        },
        {
          title: "გამჭვირვალე პროცესი",
          text: "ჯავშნის მოთხოვნა არ ნიშნავს ავტომატურ გადახდას — საბოლოო პირობები ზუსტდება Aroundworld-ის გუნდთან კომუნიკაციის შემდეგ.",
        },
      ],
    },
    categories: {
      title: "ტურების მიმართულებები და ტიპები",
      items: [
        "დასასვენებელი ტურები",
        "კულტურული ტურები",
        "საოჯახო ტურები",
        "ჯგუფური ტურები",
        "მომლოცველთა ტურები",
        "საზღვაო ტურები",
        "ევროპული ტურები",
        "აზიის მიმართულებები",
      ],
    },
    listing: {
      title: "აქტუალური ტურები",
      intro:
        "დაათვალიერე Aroundworld-ის აქტუალური ტურები და აირჩიე შენთვის სასურველი მიმართულება.",
    },
    booking: {
      title: "როგორ მუშაობს ჯავშნის მოთხოვნა?",
      note:
        "საიტზე ჯავშნის მოთხოვნის გაგზავნა არ ნიშნავს ავტომატურ გადახდას. რეალური ჯავშანი სრულდება მხოლოდ დეტალების შეთანხმებისა და გადახდის შემდეგ.",
      steps: [
        "ირჩევ ტურს",
        "ავსებ საკონტაქტო ინფორმაციას",
        "აგზავნი ჯავშნის მოთხოვნას",
        "Aroundworld-ის გუნდი გიკავშირდება დეტალების დასაზუსტებლად",
      ],
    },
    directions: {
      title: "პოპულარული მიმართულებები ტურებისთვის",
      items: [
        {
          title: "სტამბოლი",
          text: "სტამბოლი ერთ-ერთი პოპულარული მიმართულებაა მოკლე კულტურული და დასასვენებელი მოგზაურობისთვის.",
        },
        {
          title: "ანტალია",
          text: "ანტალია შესაფერისია საზაფხულო დასვენებისთვის, ზღვისპირა სასტუმროებისა და ოჯახური მოგზაურობისთვის.",
        },
        {
          title: "პარიზი",
          text: "პარიზი ხშირად ირჩევა რომანტიკული, კულტურული და ქალაქური მოგზაურობისთვის.",
        },
        {
          title: "რომი",
          text: "რომი აერთიანებს ისტორიას, არქიტექტურას და ევროპული ქალაქის კლასიკურ ტურისტულ გამოცდილებას.",
        },
        {
          title: "დუბაი",
          text: "დუბაი პოპულარულია თანამედროვე დასვენებისთვის, სავაჭრო ცენტრებისა და საოჯახო აქტივობებისთვის.",
        },
        {
          title: "იერუსალიმი",
          text: "იერუსალიმი ხშირად ირჩევა მომლოცველთა ტურებისთვის და ისტორიულ-რელიგიური მარშრუტებისთვის.",
        },
      ],
    },
    why: {
      title: "Aroundworld — ტურისტული სააგენტო შენი მოგზაურობისთვის",
      text:
        "Aroundworld.ge აერთიანებს ტურების, ავიაბილეთების, სასტუმროებისა და რესტორნების ძიების შესაძლებლობას ერთ სივრცეში. მომხმარებელს შეუძლია დაათვალიეროს შეთავაზებები, შეარჩიოს სასურველი მიმართულება და გაგზავნოს ჯავშნის მოთხოვნა პირდაპირ საიტიდან.",
      partners:
        "Aroundworld იყენებს სერვისებსა და პარტნიორულ წყაროებს, როგორიცაა Skyscanner და Tripadvisor, რათა მომხმარებელს დაეხმაროს მოგზაურობის დაგეგმვაში.",
    },
    faq: {
      title: "ხშირად დასმული კითხვები ტურებზე",
      items: [
        {
          question: "როგორ გავაგზავნო ტურის ჯავშნის მოთხოვნა?",
          answer:
            "აირჩიე სასურველი ტური, შეავსე საკონტაქტო ინფორმაცია და გააგზავნე ჯავშნის მოთხოვნა. Aroundworld-ის გუნდი დაგიკავშირდება დეტალების დასაზუსტებლად.",
        },
        {
          question: "აუცილებელია რეგისტრაცია ჯავშნის მოთხოვნის გასაგზავნად?",
          answer:
            "არა, ჯავშნის მოთხოვნის გაგზავნა შესაძლებელია სტუმრის სტატუსითაც. რეგისტრირებულ მომხმარებელს დამატებით შეუძლია საკუთარი მოთხოვნების ნახვა პროფილში.",
        },
        {
          question: "ჯავშნის მოთხოვნა ავტომატურად ნიშნავს გადახდას?",
          answer:
            "არა. ჯავშნის მოთხოვნა არის ინტერესის დაფიქსირება. რეალური ჯავშანი სრულდება მხოლოდ დეტალების შეთანხმებისა და გადახდის შემდეგ.",
        },
        {
          question: "რა ტიპის ტურები შემიძლია ვიპოვო Aroundworld.ge-ზე?",
          answer:
            "შეგიძლია მოძებნო დასასვენებელი, კულტურული, საოჯახო, ჯგუფური და მომლოცველთა ტურები სხვადასხვა მიმართულებით.",
        },
        {
          question: "შემიძლია მივიღო დახმარება ტურის შერჩევაში?",
          answer:
            "დიახ. მოთხოვნის გაგზავნის შემდეგ Aroundworld-ის გუნდი დაგიკავშირდება და დაგეხმარება მიმართულების, თარიღების, სასტუმროსა და პირობების დაზუსტებაში.",
        },
        {
          question: "აქვს თუ არა Aroundworld-ს ავიაბილეთებისა და სასტუმროების ძიება?",
          answer:
            "დიახ. Aroundworld.ge-ზე შესაძლებელია ავიაბილეთების, სასტუმროებისა და რესტორნების ძიებაც, რაც მოგზაურობის დაგეგმვას უფრო მარტივს ხდის.",
        },
      ],
    },
    finalCta: {
      title: "აირჩიე ტური და დაიწყე მოგზაურობის დაგეგმვა",
      text:
        "დაათვალიერე აქტუალური ტურები, შეარჩიე მიმართულება და გააგზავნე ჯავშნის მოთხოვნა. Aroundworld-ის გუნდი დაგიკავშირდება დეტალების დასაზუსტებლად.",
    },
  },
  en: {
    eyebrow: "Tours from Georgia",
    title: "Tours from Georgia — plan your trip with Aroundworld",
    description:
      "Aroundworld.ge helps you choose holiday, cultural, family, group, and pilgrimage tours across different destinations. Browse offers, pick the tour you like, and send a booking request directly from the website.",
    cta: {
      viewTours: "View tours",
      requestBooking: "Send request",
      flights: "Search flights",
      hotels: "Search hotels",
      restaurants: "Search restaurants",
    },
    benefits: {
      title: "Why choose Aroundworld tours?",
      items: [
        {
          title: "Simple booking request",
          text: "Choose a tour and send a request in minutes. Our team will contact you to confirm the details.",
        },
        {
          title: "Personal consultation",
          text: "Get help choosing the destination, hotel, travel dates, and package conditions.",
        },
        {
          title: "Different tour styles",
          text: "Holiday, cultural, family, group, and pilgrimage tours across different destinations.",
        },
        {
          title: "Transparent process",
          text: "Submitting a request does not mean automatic payment. Final conditions are confirmed with the Aroundworld team.",
        },
      ],
    },
    categories: {
      title: "Tour directions and types",
      items: [
        "Holiday tours",
        "Cultural tours",
        "Family tours",
        "Group tours",
        "Pilgrimage tours",
        "Sea holidays",
        "European tours",
        "Asian destinations",
      ],
    },
    listing: {
      title: "Current tours",
      intro: "Browse current Aroundworld tours and choose your preferred destination.",
    },
    booking: {
      title: "How does a booking request work?",
      note:
        "Sending a booking request on the website does not mean automatic payment. A real booking is completed only after the details are agreed and payment is made.",
      steps: [
        "Choose a tour",
        "Fill in your contact information",
        "Send a booking request",
        "The Aroundworld team contacts you to confirm details",
      ],
    },
    directions: {
      title: "Popular tour ideas",
      items: [
        {
          title: "Istanbul",
          text: "Istanbul is a popular choice for short cultural and leisure trips.",
        },
        {
          title: "Antalya",
          text: "Antalya works well for summer holidays, seaside hotels, and family travel.",
        },
        {
          title: "Paris",
          text: "Paris is often chosen for romantic, cultural, and city-break travel.",
        },
        {
          title: "Rome",
          text: "Rome combines history, architecture, and a classic European travel experience.",
        },
        {
          title: "Dubai",
          text: "Dubai is popular for modern holidays, shopping, and family activities.",
        },
        {
          title: "Jerusalem",
          text: "Jerusalem is often chosen for pilgrimage tours and historic-religious routes.",
        },
      ],
    },
    why: {
      title: "Aroundworld — a travel agency for your journey",
      text:
        "Aroundworld.ge brings tours, flights, hotels, and restaurant search into one place. Visitors can browse offers, choose a destination, and send a booking request directly from the website.",
      partners:
        "Aroundworld uses services and partner sources such as Skyscanner and Tripadvisor to help customers plan travel.",
    },
    faq: {
      title: "Frequently asked questions about tours",
      items: [
        {
          question: "How do I send a tour booking request?",
          answer:
            "Choose a tour, fill in your contact information, and send a booking request. The Aroundworld team will contact you to confirm details.",
        },
        {
          question: "Do I need to register to send a booking request?",
          answer:
            "No. Guests can also send booking requests. Registered users can additionally view their requests in the profile area.",
        },
        {
          question: "Does a booking request automatically mean payment?",
          answer:
            "No. A booking request records your interest. A real booking is completed only after details are agreed and payment is made.",
        },
        {
          question: "What tour types can I find on Aroundworld.ge?",
          answer:
            "You can search holiday, cultural, family, group, and pilgrimage tours across different destinations.",
        },
        {
          question: "Can I get help choosing a tour?",
          answer:
            "Yes. After you send a request, the Aroundworld team will contact you and help clarify destination, dates, hotel, and conditions.",
        },
        {
          question: "Does Aroundworld offer flight and hotel search?",
          answer:
            "Yes. Aroundworld.ge also supports flight, hotel, and restaurant search, making travel planning easier.",
        },
      ],
    },
    finalCta: {
      title: "Choose a tour and start planning your trip",
      text:
        "Browse current tours, choose a destination, and send a booking request. The Aroundworld team will contact you to confirm details.",
    },
  },
};

function buildFaqStructuredData(items = []) {
  const mainEntity = items
    .map((item) => {
      const question = String(item?.question || "").trim();
      const answer = String(item?.answer || "").trim();

      if (!question || !answer) {
        return null;
      }

      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      };
    })
    .filter(Boolean);

  if (mainEntity.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesTourSearch(tour, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  const values = [
    tour?.title?.ka,
    tour?.title?.en,
    tour?.destination?.ka,
    tour?.destination?.en,
    tour?.description?.ka,
    tour?.description?.en,
  ];

  return values.some((value) => normalize(value).includes(normalizedQuery));
}

function parsePriceValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const source = String(value ?? "").trim();

  if (!source) {
    return null;
  }

  const match = source.match(/\d[\d\s.,]*/);

  if (!match) {
    return null;
  }

  let numericText = match[0].replace(/\s/g, "");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    const decimalIndex = Math.max(lastCommaIndex, lastDotIndex);
    const integerPart = numericText.slice(0, decimalIndex).replace(/[,.]/g, "");
    const decimalPart = numericText.slice(decimalIndex + 1).replace(/[,.]/g, "");
    numericText = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  } else if (lastCommaIndex > -1) {
    const parts = numericText.split(",");
    const decimalPart = parts[parts.length - 1];
    numericText =
      parts.length === 2 && decimalPart.length <= 2
        ? `${parts[0]}.${decimalPart}`
        : numericText.replace(/,/g, "");
  } else if (lastDotIndex > -1) {
    const parts = numericText.split(".");
    const decimalPart = parts[parts.length - 1];
    numericText =
      parts.length === 2 && decimalPart.length <= 2
        ? numericText
        : numericText.replace(/\./g, "");
  }

  const parsedValue = Number.parseFloat(numericText);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getTourPriceValue(tour) {
  return parsePriceValue(tour?.price);
}

function getPriceFilterValue(value) {
  const parsedValue = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export default function ToursPage() {
  const { language, t } = useLanguage();
  const landingContent = TOURS_LANDING_COPY[language] || TOURS_LANDING_COPY.ka;
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const loadTours = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchTours();
        setTours(Array.isArray(response?.tours) ? response.tours : []);
      } catch (requestError) {
        setError(getFriendlyApiError(requestError, t("admin.errors.loadFailed")));
      } finally {
        setLoading(false);
      }
    };

    void loadTours();
  }, [t]);

  const selectedCategory = searchParams.get("category") || "__all";
  const activeQuery = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const minPriceValue = useMemo(() => getPriceFilterValue(minPrice), [minPrice]);
  const maxPriceValue = useMemo(() => getPriceFilterValue(maxPrice), [maxPrice]);
  const hasPriceFilter = minPriceValue !== null || maxPriceValue !== null;
  const categories = useMemo(
    () => [
      { key: "__all", label: t("common.all") },
      ...Array.from(new Set(tours.map((tour) => tour.category).filter(Boolean))).map(
        (category) => ({
          key: category,
          label: category,
        })
      ),
    ],
    [t, tours]
  );

  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const matchesCategory =
          selectedCategory === "__all" || tour.category === selectedCategory;
        const matchesSearch = matchesTourSearch(tour, activeQuery);

        if (!matchesCategory || !matchesSearch) {
          return false;
        }

        if (!hasPriceFilter) {
          return true;
        }

        const tourPrice = getTourPriceValue(tour);

        if (tourPrice === null) {
          return false;
        }

        if (minPriceValue !== null && tourPrice < minPriceValue) {
          return false;
        }

        if (maxPriceValue !== null && tourPrice > maxPriceValue) {
          return false;
        }

        return true;
      }),
    [
      activeQuery,
      hasPriceFilter,
      maxPriceValue,
      minPriceValue,
      selectedCategory,
      tours,
    ]
  );

  const hasActiveFilters =
    activeQuery ||
    selectedCategory !== "__all" ||
    minPrice ||
    maxPrice;

  const updateFilters = ({
    nextSearch = activeQuery,
    nextCategory = selectedCategory,
    nextMinPrice = minPrice,
    nextMaxPrice = maxPrice,
  } = {}) => {
    const params = new URLSearchParams();

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextCategory && nextCategory !== "__all") {
      params.set("category", nextCategory);
    }

    if (String(nextMinPrice || "").trim()) {
      params.set("minPrice", String(nextMinPrice).trim());
    }

    if (String(nextMaxPrice || "").trim()) {
      params.set("maxPrice", String(nextMaxPrice).trim());
    }

    setSearchParams(params);
  };

  const breadcrumbStructuredData = buildBreadcrumbStructuredData([
    { name: "Around The World", url: "/" },
    { name: "ტურები", url: "/tours" },
  ]);
  const webpageStructuredData = buildWebPageStructuredData({
    name: "ტურები საქართველოდან | Aroundworld",
    url: "/tours",
    description: TOURS_SEO_DESCRIPTION,
  });
  const faqStructuredData = buildFaqStructuredData(landingContent.faq.items);
  const toursStructuredData = [
    webpageStructuredData,
    buildOrganizationStructuredData(),
    breadcrumbStructuredData,
    faqStructuredData,
  ];

  return (
    <PublicPageShell
      eyebrow={landingContent.eyebrow}
      title={landingContent.title}
      description={landingContent.description}
      backgroundImage={aroundWorldPageBackground}
      heroBody={
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={`#${TOURS_LISTING_ID}`}
            className="inline-flex items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_48px_-30px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)]"
          >
            {landingContent.cta.viewTours}
          </a>
          <a
            href={`#${TOURS_LISTING_ID}`}
            className="inline-flex items-center justify-center rounded-full border border-white/14 bg-black/28 px-5 py-3 text-sm font-semibold text-white transition hover:border-[var(--aw-accent)] hover:text-[var(--aw-accent)]"
          >
            {landingContent.cta.requestBooking}
          </a>
          <Link
            to="/flights"
            className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/28 hover:text-white"
          >
            {landingContent.cta.flights}
          </Link>
          <Link
            to="/hotels"
            className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/28 hover:text-white"
          >
            {landingContent.cta.hotels}
          </Link>
        </div>
      }
      compactHero
    >
      <SEO {...PAGE_SEO.tours} structuredData={toursStructuredData} />

      <div className="space-y-10">
        <LandingSection title={landingContent.benefits.title}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {landingContent.benefits.items.map((benefit) => (
              <InfoCard key={benefit.title} title={benefit.title} text={benefit.text} />
            ))}
          </div>
        </LandingSection>

        <LandingSection title={landingContent.categories.title}>
          <div className="flex flex-wrap gap-3">
            {landingContent.categories.items.map((category) => (
              <span
                key={category}
                className="rounded-full border border-[rgba(245,184,0,0.24)] bg-[rgba(245,184,0,0.09)] px-4 py-2 text-sm font-semibold text-white/82"
              >
                {category}
              </span>
            ))}
          </div>
        </LandingSection>

        <section id={TOURS_LISTING_ID} className="scroll-mt-28 space-y-6">
          <LandingSection
            title={landingContent.listing.title}
            description={landingContent.listing.intro}
            className="!space-y-5"
          >
            {!loading ? (
              <div className="rounded-[1rem] border border-white/10 bg-[#202020] p-4 text-white shadow-[0_26px_86px_-58px_rgba(0,0,0,0.92)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--aw-accent)]">
                      {t("tours.resultsLabel")}
                    </p>
                    <p className="mt-2 text-sm text-white/66">
                      {visibleTours.length}
                      {activeQuery ? ` / ${activeQuery}` : ""}
                    </p>
                  </div>

                  <div className="relative w-full lg:w-80">
                    <button
                      type="button"
                      onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
                      className="flex min-h-11 w-full items-center justify-between rounded-[0.85rem] border border-white/12 bg-[#171717] px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[var(--aw-accent)] hover:bg-white/8"
                      aria-expanded={isFiltersOpen}
                    >
                      <span>{t("tours.filters.label")}</span>
                      <span className="h-2 w-2 rotate-45 border-b border-r border-[var(--aw-accent)]" />
                    </button>

                    {isFiltersOpen ? (
                      <div className="mt-3 grid gap-4 rounded-[1rem] border border-white/10 bg-[#171717] p-4 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] lg:absolute lg:right-0 lg:top-full lg:z-20 lg:w-80">
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                            {t("tours.filters.category")}
                          </span>
                          <select
                            value={selectedCategory}
                            onChange={(event) =>
                              updateFilters({ nextCategory: event.target.value })
                            }
                            className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                          >
                            {categories.map((category) => (
                              <option key={category.key} value={category.key}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <fieldset className="grid gap-3">
                          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                            {t("tours.filters.priceRange")}
                          </legend>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-white/64">
                                {t("tours.filters.minPrice")}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={minPrice}
                                onChange={(event) =>
                                  updateFilters({ nextMinPrice: event.target.value })
                                }
                                className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                              />
                            </label>

                            <label className="grid gap-2">
                              <span className="text-xs font-semibold text-white/64">
                                {t("tours.filters.maxPrice")}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={maxPrice}
                                onChange={(event) =>
                                  updateFilters({ nextMaxPrice: event.target.value })
                                }
                                className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                              />
                            </label>
                          </div>
                        </fieldset>

                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateFilters({
                                nextSearch: "",
                                nextCategory: "__all",
                                nextMinPrice: "",
                                nextMaxPrice: "",
                              })
                            }
                            className="rounded-[0.7rem] border border-white/12 px-4 py-3 text-sm font-semibold text-white/74 transition hover:border-[var(--aw-accent)] hover:text-white"
                          >
                            {t("tours.filters.clear")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {!loading && activeQuery ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateFilters({ nextSearch: "" })}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/74 transition hover:border-[var(--aw-accent)] hover:text-white"
                >
                  {t("tours.clearSearch")}
                </button>
              </div>
            ) : null}

            {loading ? <LoadingSkeleton /> : null}

            {!loading && visibleTours.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/58">
                    {t("tours.resultsLabel")}
                  </p>
                  <p className="text-sm text-white/70">{visibleTours.length}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {visibleTours.map((tour) => (
                    <TourCard key={tour.id} tour={tour} />
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && error ? (
              <EmptyState title={t("tours.noToursTitle")} message={error} />
            ) : null}

            {!loading && !error && tours.length === 0 ? (
              <EmptyState
                title={t("tours.noToursTitle")}
                message={t("tours.noToursMessage")}
              />
            ) : null}

            {!loading && !error && tours.length > 0 && visibleTours.length === 0 ? (
              <EmptyState
                title={t("tours.noMatchTitle")}
                message={t("tours.noMatchMessage")}
              />
            ) : null}
          </LandingSection>
        </section>

        <LandingSection title={landingContent.booking.title}>
          <div className="grid gap-4 md:grid-cols-4">
            {landingContent.booking.steps.map((step, index) => (
              <article
                key={step}
                className="rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white shadow-[0_24px_76px_-58px_rgba(0,0,0,0.92)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--aw-accent)] text-sm font-black text-slate-950">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{step}</h3>
              </article>
            ))}
          </div>
          <p className="rounded-[1rem] border border-[rgba(245,184,0,0.2)] bg-[rgba(245,184,0,0.08)] p-4 text-sm leading-7 text-white/78">
            {landingContent.booking.note}
          </p>
        </LandingSection>

        <LandingSection title={landingContent.directions.title}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {landingContent.directions.items.map((direction) => (
              <a
                key={direction.title}
                href={`#${TOURS_LISTING_ID}`}
                className="group rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white transition hover:-translate-y-0.5 hover:border-[var(--aw-accent)]"
              >
                <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
                  {direction.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{direction.text}</p>
              </a>
            ))}
          </div>
        </LandingSection>

        <LandingSection title={landingContent.why.title}>
          <div className="rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] md:p-8">
            <p className="text-base leading-8 text-white/78">{landingContent.why.text}</p>
            <p className="mt-4 text-sm leading-7 text-white/62">
              {landingContent.why.partners}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/flights"
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
              >
                {landingContent.cta.flights}
              </Link>
              <Link
                to="/hotels"
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
              >
                {landingContent.cta.hotels}
              </Link>
              <Link
                to="/restaurants"
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white"
              >
                {landingContent.cta.restaurants}
              </Link>
            </div>
          </div>
        </LandingSection>

        <LandingSection title={landingContent.faq.title}>
          <div className="grid gap-4 md:grid-cols-2">
            {landingContent.faq.items.map((item) => (
              <article
                key={item.question}
                className="rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white"
              >
                <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{item.answer}</p>
              </article>
            ))}
          </div>
        </LandingSection>

        <section className="rounded-[1.25rem] border border-[rgba(245,184,0,0.22)] bg-[linear-gradient(135deg,rgba(245,184,0,0.16),rgba(32,32,32,0.96)_42%,rgba(17,17,17,0.98))] p-6 text-white shadow-[0_34px_110px_-70px_rgba(0,0,0,0.95)] md:p-8">
          <h2 className="[font-family:var(--font-display)] text-3xl font-semibold text-white md:text-4xl">
            {landingContent.finalCta.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/76">
            {landingContent.finalCta.text}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`#${TOURS_LISTING_ID}`}
              className="inline-flex items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
            >
              {landingContent.cta.viewTours}
            </a>
            <Link
              to="/flights"
              className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:border-[var(--aw-accent)] hover:text-[var(--aw-accent)]"
            >
              {landingContent.cta.flights}
            </Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}

function LandingSection({ title, description, children, className = "" }) {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="max-w-3xl">
        <h2 className="[font-family:var(--font-display)] text-3xl font-semibold text-white md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-8 text-white/70">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white shadow-[0_24px_76px_-58px_rgba(0,0,0,0.92)]">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/68">{text}</p>
    </article>
  );
}
