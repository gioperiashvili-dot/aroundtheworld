import { Link } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundFour from "../assets/background/background-4.webp";
import logoMain from "../assets/AroundTheWorld_Logo_BGREMOVE_512.png";
import skyscannerLogo from "../assets/partners/skyscanner.jpg";
import tripadvisorLogo from "../assets/partners/tripadvisor.png";
import { useLanguage } from "../i18n/LanguageContext";

const ABOUT_CONTENT = {
  ka: {
    eyebrow: "Around The World",
    title: "ჩვენს შესახებ",
    description:
      "Around The World არის ტურისტული სააგენტო, რომელიც 2020 წელს დაარსდა და დარეგისტრირდა, როგორც შეზღუდული პასუხისმგებლობის საზოგადოება — შპს ერაუნდ ზი ვორლდ.",
    heroAside: {
      label: "ტურისტული სააგენტო",
      title: "მოგზაურობის დაგეგმვა მარტივად, უსაფრთხოდ და კომფორტულად.",
      stats: [
        { value: "2020", label: "დაარსების წელი" },
        { value: "შპს", label: "რეგისტრირებული კომპანია" },
        { value: "ერთ სივრცეში", label: "ტურები, ფრენები და სერვისები" },
      ],
    },
    intro: [
      "დაარსების დღიდან ჩვენი მიზანია, მომხმარებლებს მოგზაურობასთან დაკავშირებული სერვისები შევთავაზოთ მარტივად, უსაფრთხოდ და კომფორტულად. ჩვენ ვეხმარებით როგორც ინდივიდუალურ მოგზაურებს, ისე ოჯახებსა და ჯგუფებს, შეარჩიონ მათ სურვილებზე, ბიუჯეტსა და საჭიროებებზე მორგებული საუკეთესო სამოგზაურო გადაწყვეტილებები.",
    ],
    servicesSection: {
      eyebrow: "რას გთავაზობთ",
      title: "სრული ტურისტული მომსახურება",
      intro:
        "ჩვენი სააგენტო მომხმარებლებს სთავაზობს სრულ ტურისტულ მომსახურებას — მოგზაურობის დაგეგმვის პირველივე ეტაპიდან საბოლოო დეტალებამდე.",
    },
    services: [
      {
        title: "ავიაბილეთები",
        text: [
          "Around The World დაგეხმარებათ ავიაბილეთების მოძიებასა და შეძენაში სხვადასხვა მიმართულებით. ჩვენი მიზანია, მომხმარებელმა მარტივად შეარჩიოს მისთვის მოსახერხებელი რეისი, სასურველი დრო, ოპტიმალური მარშრუტი და მის საჭიროებებზე მორგებული ვარიანტი.",
          "საჭიროების შემთხვევაში, მომხმარებელს ასევე შეუძლია მიიღოს დამატებითი მომსახურება, მათ შორის დაზღვევა და მოგზაურობასთან დაკავშირებული კონსულტაცია.",
        ],
      },
      {
        title: "ტურები და ტურპაკეტები",
        text: [
          "ჩვენ გთავაზობთ როგორც მზა ტურპაკეტებს, ასევე ინდივიდუალურად აწყობილ ტურებს. შესაძლებელია ტურის შერჩევა სხვადასხვა მიმართულებით, სეზონის, ბიუჯეტის, მოგზაურობის სტილისა და მომხმარებლის სურვილების მიხედვით.",
          "იქნება ეს დასვენება ზღვაზე, ქალაქის ტური, ოჯახური მოგზაურობა, რომანტიკული გეგმა თუ აქტიური თავგადასავალი — ჩვენი გუნდი დაგეხმარებათ ისეთი ვარიანტის შერჩევაში, რომელიც თქვენს მოლოდინებს მაქსიმალურად შეესაბამება.",
        ],
      },
      {
        title: "სასტუმროები",
        text: [
          "ჩვენ ვეხმარებით მომხმარებლებს სასტუმროების მოძიებაში სხვადასხვა ქვეყანაში და სხვადასხვა ლოკაციაზე. არჩევისას ვითვალისწინებთ ბიუჯეტს, მდებარეობას, რეიტინგს, კომფორტს და მოგზაურობის მიზანს.",
          "მომხმარებელს შეუძლია მიიღოს როგორც ეკონომიური, ისე მაღალი კლასის განთავსების შეთავაზებები.",
        ],
      },
      {
        title: "რესტორნები და ადგილობრივი გამოცდილება",
        text: [
          "მოგზაურობა მხოლოდ გადაადგილება და განთავსება არ არის — ის გამოცდილებაა. სწორედ ამიტომ, ჩვენს ვებგვერდზე მომხმარებლებს შეუძლიათ მოიძიონ რესტორნები, კაფეები და ადგილობრივი გემოები პოპულარულ ქალაქებში.",
          "ეს ეხმარება მოგზაურებს უკეთ დაგეგმონ დრო, აღმოაჩინონ ახალი ადგილები და მიიღონ უფრო სრულყოფილი სამოგზაურო გამოცდილება.",
        ],
      },
      {
        title: "სავიზო მომსახურება",
        text: [
          "Around The World მომხმარებლებს სთავაზობს სავიზო პროცესთან დაკავშირებულ კონსულტაციასა და მხარდაჭერას. ჩვენ ვეხმარებით მომხმარებლებს საჭირო ინფორმაციის მიღებაში, დოკუმენტების მომზადებასა და პროცესის უკეთ გააზრებაში, რათა ვიზასთან დაკავშირებული ნაბიჯები იყოს უფრო მარტივი და კომფორტული.",
          "მნიშვნელოვანია აღინიშნოს, რომ ვიზის გაცემის საბოლოო გადაწყვეტილებას იღებს შესაბამისი საელჩო ან საკონსულო. ჩვენი მიზანია მომხმარებელს დავეხმაროთ პროცესის სწორად და ორგანიზებულად წარმართვაში.",
        ],
      },
    ],
    online: {
      eyebrow: "თანამედროვე ონლაინ სერვისები",
      title: "სამოგზაურო სერვისები ერთ სივრცეში",
      paragraphs: [
        "Around The World-ის ვებგვერდი შექმნილია იმისთვის, რომ მომხმარებელმა შეძლოს სამოგზაურო სერვისების მოძიება ერთ სივრცეში.",
      ],
      listLabel: "ვებგვერდზე ხელმისაწვდომია:",
      list: [
        "ავიარეისების ძიება live რეჟიმში;",
        "სასტუმროების მოძიება სხვადასხვა ლოკაციაზე;",
        "რესტორნებისა და კაფეების მოძიება პოპულარულ ქალაქებში;",
        "ტურების დათვალიერება და შერჩევა;",
        "სავიზო მომსახურების შესახებ ინფორმაციის მიღება;",
        "არჩეულ ავიარეისზე მოთხოვნის გაგზავნა ოპერატორთან დასაკავშირებლად.",
      ],
      footer:
        "ავიარეისების ძიების ფუნქციონალი მუშაობს პარტნიორი პლატფორმიდან მიღებულ მონაცემებზე, ხოლო სასტუმროებისა და რესტორნების ძიების ნაწილში გამოიყენება პარტნიორი სერვისებიდან მოწოდებული ინფორმაცია.",
      partnersLabel: "მონაცემების ინტეგრაცია",
      partners: {
        flights: "ავიარეისების მონაცემები",
        hotelsRestaurants: "სასტუმროებისა და რესტორნების მონაცემები",
      },
    },
    why: {
      eyebrow: "რატომ Around The World?",
      title: "მომხმარებელზე მორგებული მიდგომა",
      intro: [
        "ჩვენთვის მნიშვნელოვანია, რომ მომხმარებელმა მიიღოს არა მხოლოდ შეთავაზება, არამედ სწორი კონსულტაცია და ყურადღებიანი მომსახურება.",
        "ჩვენი მიდგომა ეფუძნება რამდენიმე მთავარ პრინციპს:",
      ],
      cards: [
        {
          title: "ინდივიდუალური მომსახურება",
          text: "ყოველი მომხმარებლის სურვილი, ბიუჯეტი და მოგზაურობის მიზანი განსხვავებულია. ამიტომ ვცდილობთ, თითოეული შეთავაზება მაქსიმალურად იყოს მორგებული კონკრეტულ საჭიროებაზე.",
        },
        {
          title: "კომფორტული პროცესი",
          text: "ჩვენ ვეხმარებით მომხმარებელს ყველა მნიშვნელოვან ეტაპზე — მიმართულების შერჩევიდან ბილეთამდე, სასტუმრომდე, დაზღვევამდე და დამატებით სერვისებამდე.",
        },
        {
          title: "თანამედროვე ვებგვერდი",
          text: "ჩვენი ვებგვერდი შექმნილია მარტივი, სწრაფი და მომხმარებელზე ორიენტირებული გამოცდილებისთვის. მომხმარებელს შეუძლია ერთ სივრცეში მოიძიოს ტურები, ფრენები, სასტუმროები, რესტორნები და სავიზო სერვისები.",
        },
        {
          title: "სანდო კომუნიკაცია",
          text: "ჩვენი გუნდი მზად არის, მომხმარებელს დაეხმაროს კითხვებზე პასუხის მიღებაში, დეტალების დაზუსტებასა და მოგზაურობის უკეთ დაგეგმვაში.",
        },
      ],
    },
    goal: {
      eyebrow: "ჩვენი მიზანი",
      title: "მოგზაურობის დაგეგმვა უფრო მარტივი და სასიამოვნო",
      paragraphs: [
        "ჩვენი მიზანია, მოგზაურობის დაგეგმვა გავხადოთ უფრო მარტივი, ხელმისაწვდომი და სასიამოვნო.",
        "Around The World აერთიანებს ტურისტულ გამოცდილებას, თანამედროვე ონლაინ ინსტრუმენტებსა და ადამიანურ კონსულტაციას, რათა მომხმარებელმა შეძლოს მისთვის სასურველი მოგზაურობის დაგეგმვა უფრო სწრაფად, კომფორტულად და თავდაჯერებულად.",
      ],
      tagline: "Around The World — იმოგზაურეთ მარტივად, ჩვენთან ერთად.",
    },
    cta: {
      tours: "ტურების ნახვა",
      contact: "დაგვიკავშირდით",
    },
  },
  en: {
    eyebrow: "Around The World",
    title: "About Us",
    description:
      "Around The World is a travel agency founded and registered in 2020 as a limited liability company, Around The World LLC.",
    heroAside: {
      label: "Travel agency",
      title: "Travel planning made simple, safe, and comfortable.",
      stats: [
        { value: "2020", label: "Founded" },
        { value: "LLC", label: "Registered company" },
        { value: "One place", label: "Tours, flights, and services" },
      ],
    },
    intro: [
      "Since day one, our goal has been to offer travel-related services in a simple, safe, and comfortable way. We help individual travelers, families, and groups choose travel solutions tailored to their wishes, budget, and practical needs.",
    ],
    servicesSection: {
      eyebrow: "What We Offer",
      title: "Complete Travel Services",
      intro:
        "Our agency provides full travel support from the first planning step to the final details.",
    },
    services: [
      {
        title: "Flight Tickets",
        text: [
          "Around The World helps customers search for and purchase flight tickets across different destinations. Our aim is to make it easy to choose a convenient flight, preferred time, optimal route, and option that fits the customer's needs.",
          "When needed, customers can also receive additional services, including insurance and travel-related consultation.",
        ],
      },
      {
        title: "Tours and Packages",
        text: [
          "We offer ready-made tour packages as well as individually planned tours. Trips can be selected by destination, season, budget, travel style, and customer preference.",
          "Whether it is a seaside holiday, city tour, family trip, romantic plan, or active adventure, our team helps customers choose an option that matches their expectations as closely as possible.",
        ],
      },
      {
        title: "Hotels",
        text: [
          "We help customers find hotels in different countries and locations. During selection, we consider budget, location, rating, comfort, and the purpose of the trip.",
          "Customers can receive both economical and higher-class accommodation options.",
        ],
      },
      {
        title: "Restaurants and Local Experiences",
        text: [
          "Travel is not only movement and accommodation. It is an experience. That is why our website helps customers discover restaurants, cafes, and local flavors in popular cities.",
          "This helps travelers plan their time better, discover new places, and create a fuller travel experience.",
        ],
      },
      {
        title: "Visa Services",
        text: [
          "Around The World offers consultation and support related to the visa process. We help customers get the information they need, prepare documents, and better understand the process so visa-related steps feel simpler and more comfortable.",
          "It is important to note that the final visa decision is made by the relevant embassy or consulate. Our role is to help customers approach the process correctly and in an organized way.",
        ],
      },
    ],
    online: {
      eyebrow: "Modern Online Services",
      title: "Travel services in one place",
      paragraphs: [
        "The Around The World website is designed so customers can search for travel services in one convenient place.",
      ],
      listLabel: "The website offers:",
      list: [
        "Live flight search;",
        "Hotel search across different locations;",
        "Restaurant and cafe search in popular cities;",
        "Tour browsing and selection;",
        "Information about visa services;",
        "A request flow for selected flights so an operator can contact the customer.",
      ],
      footer:
        "The flight search functionality uses data received from a partner platform, while the hotel and restaurant search sections use information provided by partner services.",
      partnersLabel: "Data integrations",
      partners: {
        flights: "Flight data",
        hotelsRestaurants: "Hotel and restaurant data",
      },
    },
    why: {
      eyebrow: "Why Around The World?",
      title: "A customer-focused approach",
      intro: [
        "For us, it is important that customers receive not only an offer, but also clear consultation and attentive service.",
        "Our approach is based on several key principles:",
      ],
      cards: [
        {
          title: "Individual Service",
          text: "Every customer's wishes, budget, and travel purpose are different. We try to make each offer as closely tailored as possible to specific needs.",
        },
        {
          title: "Comfortable Process",
          text: "We help customers through every important stage, from choosing a destination to flights, hotels, insurance, and additional services.",
        },
        {
          title: "Modern Website",
          text: "Our website is built for a simple, fast, customer-oriented experience. Customers can search tours, flights, hotels, restaurants, and visa services in one place.",
        },
        {
          title: "Reliable Communication",
          text: "Our team is ready to help customers get answers, clarify details, and plan their trip with more confidence.",
        },
      ],
    },
    goal: {
      eyebrow: "Our Goal",
      title: "Making travel planning easier and more enjoyable",
      paragraphs: [
        "Our goal is to make travel planning simpler, more accessible, and more pleasant.",
        "Around The World brings together travel experience, modern online tools, and human consultation so customers can plan the trip they want faster, more comfortably, and with more confidence.",
      ],
      tagline: "Around The World - travel simply, with us.",
    },
    cta: {
      tours: "View Tours",
      contact: "Contact Us",
    },
  },
};

const PARTNER_LOGOS = [
  {
    key: "skyscanner",
    name: "Skyscanner",
    logo: skyscannerLogo,
    labelKey: "flights",
  },
  {
    key: "tripadvisor",
    name: "TripAdvisor",
    logo: tripadvisorLogo,
    labelKey: "hotelsRestaurants",
  },
];

export default function AboutPage() {
  const { language } = useLanguage();
  const content = ABOUT_CONTENT[language] || ABOUT_CONTENT.ka;

  return (
    <PublicPageShell
      backgroundImage={backgroundFour}
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      heroAside={<AboutHeroAside content={content.heroAside} />}
      compactHero
    >
      <SEO {...PAGE_SEO.about} />

      <section className="space-y-6">
        <article className="grid gap-6 rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] md:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <span className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-slate-950/5 p-4 ring-1 ring-slate-200/80 dark:bg-white/5 dark:ring-white/10 sm:h-40 sm:w-40">
              <img
                src={logoMain}
                alt="Around The World"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </span>
          </div>

          <div className="space-y-4">
            {content.intro.map((paragraph) => (
              <p
                key={paragraph}
                className="text-base leading-8 text-slate-700 dark:text-slate-300"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <section className="space-y-5">
          <SectionHeading
            eyebrow={content.servicesSection.eyebrow}
            title={content.servicesSection.title}
            description={content.servicesSection.intro}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            {content.services.map((service, index) => (
              <ServiceCard key={service.title} service={service} index={index} />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <SectionHeading
                eyebrow={content.online.eyebrow}
                title={content.online.title}
                description={content.online.paragraphs.join(" ")}
                compact
              />

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/88 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {content.online.listLabel}
                </p>
                <ul className="mt-4 space-y-3">
                  {content.online.list.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300"
                    >
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-5 text-sm leading-8 text-slate-700 dark:text-slate-300">
                {content.online.footer}
              </p>
            </div>

            <aside className="rounded-[1.8rem] border border-slate-200 bg-slate-50/88 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                {content.online.partnersLabel}
              </p>

              <div className="mt-5 grid gap-4">
                {PARTNER_LOGOS.map((partner) => (
                  <PartnerCard
                    key={partner.key}
                    partner={partner}
                    label={content.online.partners[partner.labelKey]}
                  />
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading
            eyebrow={content.why.eyebrow}
            title={content.why.title}
            description={content.why.intro.join(" ")}
          />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {content.why.cards.map((card, index) => (
              <HighlightCard key={card.title} card={card} index={index} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-[0_32px_100px_-58px_rgba(15,23,42,0.78)] dark:border-white/10 dark:bg-white dark:text-slate-950">
          <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300 dark:text-emerald-700">
                {content.goal.eyebrow}
              </p>
              <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                {content.goal.title}
              </h2>
              <div className="mt-5 space-y-4">
                {content.goal.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-8 text-white/78 dark:text-slate-700"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              <p className="mt-6 [font-family:var(--font-display)] text-xl font-semibold text-white dark:text-slate-950">
                {content.goal.tagline}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/tours"
                className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-[#ff5a5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#ff4a50]"
              >
                {content.cta.tours}
                <ArrowIcon />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] border border-white/22 bg-white/10 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/16 dark:border-slate-300 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
              >
                {content.cta.contact}
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      </section>
    </PublicPageShell>
  );
}

function AboutHeroAside({ content }) {
  return (
    <aside className="rounded-[1.8rem] border border-white/70 bg-white p-5 text-slate-900 shadow-[0_22px_80px_-54px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-[#071426] dark:text-white dark:shadow-[0_22px_80px_-54px_rgba(15,23,42,0.9)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
        {content.label}
      </p>
      <h2 className="[font-family:var(--font-display)] mt-3 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
        {content.title}
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {content.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[1.2rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
          >
            <p className="[font-family:var(--font-display)] text-xl font-semibold text-slate-950 dark:text-white">
              {stat.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/68">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function SectionHeading({ eyebrow, title, description, compact = false }) {
  return (
    <div className={compact ? "" : "max-w-4xl"}>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
        {eyebrow}
      </p>
      <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold leading-tight text-slate-950 dark:text-white md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-sm leading-8 text-slate-700 dark:text-slate-300">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ServiceCard({ service, index }) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_24px_80px_-56px_rgba(2,6,23,0.8)]">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h3 className="[font-family:var(--font-display)] text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
            {service.title}
          </h3>
          <div className="mt-4 space-y-4">
            {service.text.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-8 text-slate-700 dark:text-slate-300"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function PartnerCard({ partner, label }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-44px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white">
      <div className="flex min-h-[4.5rem] items-center justify-center">
        <img
          src={partner.logo}
          alt={partner.name}
          loading="lazy"
          decoding="async"
          className="h-12 w-full max-w-[13rem] object-contain"
        />
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-slate-700">
        {label}
      </p>
    </article>
  );
}

function HighlightCard({ card, index }) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_24px_80px_-56px_rgba(2,6,23,0.8)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff5a5f]/10 text-sm font-bold text-[#d83f45] dark:bg-[#ff5a5f]/18 dark:text-[#ff8c90]">
        {index + 1}
      </span>
      <h3 className="[font-family:var(--font-display)] mt-5 text-xl font-semibold leading-tight text-slate-950 dark:text-white">
        {card.title}
      </h3>
      <p className="mt-4 text-sm leading-8 text-slate-700 dark:text-slate-300">
        {card.text}
      </p>
    </article>
  );
}

function CheckIcon() {
  return (
    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-200">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="m5 12 4 4 10-10" />
      </svg>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
