import { useLanguage } from "../i18n/LanguageContext";
import gpiHoldingLogo from "../assets/partners/GPIHOLDING-240.webp";
import imediLLogo from "../assets/partners/imediL.png";
import skyscannerLogo from "../assets/partners/skyscanner-320.webp";
import tripadvisorLogo from "../assets/partners/tripadvisor-220.webp";

const GROUPS = [
  {
    title: {
      ka: "სერვის პარტნიორები",
      en: "service partners",
    },
    logos: [
      { name: "Skyscanner", src: skyscannerLogo, width: 320, height: 97 },
      { name: "TripAdvisor", src: tripadvisorLogo, width: 220, height: 124 },
    ],
  },
  {
    title: {
      ka: "პარტნიორი დაზღვევა",
      en: "Partner Insurance",
    },
    logos: [
      { name: "GPI Holding", src: gpiHoldingLogo, width: 240, height: 170 },
      { name: "Imedi L", src: imediLLogo, width: 275, height: 183 },
    ],
  },
];

export default function PartnersStrip({ className = "" }) {
  const { language } = useLanguage();

  return (
    <section
      className={`partners-strip aw-glass-panel overflow-hidden rounded-[1.25rem] px-4 py-5 text-white sm:px-6 lg:px-8 ${className}`}
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
        {GROUPS.map((group) => (
          <div
            key={group.title.en}
            className="grid gap-4 sm:grid-cols-[minmax(10rem,0.55fr)_1fr] sm:items-center"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white/62">
              {group.title[language] || group.title.en}
            </h2>

            <div className="grid grid-cols-2 items-center gap-3">
              {group.logos.map((logo) => (
                <div
                  key={logo.name}
                  className="flex min-h-20 items-center justify-center rounded-[0.95rem] border border-white/18 bg-[#fffaf0]/95 px-4 py-3 shadow-[0_18px_44px_-36px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    width={logo.width}
                    height={logo.height}
                    loading="lazy"
                    decoding="async"
                    className="max-h-12 w-auto max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
