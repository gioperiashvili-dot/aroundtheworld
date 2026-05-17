import { useLanguage } from "../i18n/LanguageContext";
import gpiHoldingLogo from "../assets/partners/GPIHOLDING.png";
import imediLLogo from "../assets/partners/imediL.png";
import skyscannerLogo from "../assets/partners/skyscanner.png";
import tripadvisorLogo from "../assets/partners/tripadvisor-300.webp";

const GROUPS = [
  {
    title: {
      ka: "აკრედიტებული წევრი",
      en: "Accredited Member",
    },
    logos: [
      { name: "Skyscanner", src: skyscannerLogo, width: 320, height: 97 },
      { name: "TripAdvisor", src: tripadvisorLogo, width: 300, height: 169 },
    ],
  },
  {
    title: {
      ka: "პარტნიორი დაზღვევა",
      en: "Partner Insurance",
    },
    logos: [
      { name: "GPI Holding", src: gpiHoldingLogo, width: 842, height: 595 },
      { name: "Imedi L", src: imediLLogo, width: 275, height: 183 },
    ],
  },
];

export default function PartnersStrip({ className = "" }) {
  const { language } = useLanguage();

  return (
    <section
      className={`partners-strip overflow-hidden rounded-[1rem] border border-white/10 bg-[#f7f5ef] px-4 py-5 text-slate-950 shadow-[0_28px_80px_-58px_rgba(0,0,0,0.95)] sm:px-6 lg:px-8 ${className}`}
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
        {GROUPS.map((group) => (
          <div
            key={group.title.en}
            className="grid gap-4 sm:grid-cols-[minmax(10rem,0.55fr)_1fr] sm:items-center"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
              {group.title[language] || group.title.en}
            </h2>

            <div className="grid grid-cols-2 items-center gap-3">
              {group.logos.map((logo) => (
                <div
                  key={logo.name}
                  className="flex min-h-20 items-center justify-center rounded-[0.75rem] border border-slate-200 bg-white px-4 py-3"
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
