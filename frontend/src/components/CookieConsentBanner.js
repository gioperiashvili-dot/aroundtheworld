import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  COOKIE_SETTINGS_EVENT_NAME,
  DEFAULT_COOKIE_CONSENT,
  applyCookieConsent,
  getCookieConsent,
  saveCookieConsent,
} from "../lib/cookieConsent";

const COPY = {
  ka: {
    title: "ქუქიების გამოყენება",
    text:
      "ჩვენ ვიყენებთ ქუქიებს ვებგვერდის სწორად მუშაობისთვის, გამოცდილების გაუმჯობესებისა და საჭირო სერვისების უზრუნველსაყოფად. შეგიძლიათ დაეთანხმოთ ყველა ქუქის ან მართოთ არჩევანი.",
    acceptAll: "ყველას მიღება",
    reject: "უარყოფა",
    manage: "მართვა",
    modalTitle: "ქუქიების პარამეტრები",
    modalText:
      "აირჩიეთ რომელი არასავალდებულო ქუქიების გამოყენებას ეთანხმებით. აუცილებელი ქუქიები ყოველთვის ჩართულია.",
    save: "შენახვა",
    close: "დახურვა",
    categories: {
      essential: {
        title: "აუცილებელი",
        text:
          "საჭიროა ვებგვერდის უსაფრთხო და გამართული მუშაობისთვის. ამ კატეგორიის გამორთვა ბანერიდან შეუძლებელია.",
      },
      functional: {
        title: "ფუნქციური",
        text: "ეხმარება ენის, სესიის, ინტერფეისის და გამოყენების არჩევანის დამახსოვრებას.",
      },
      analytics: {
        title: "ანალიტიკური",
        text:
          "Google Analytics და TOP.GE გვეხმარება გავიგოთ ვებგვერდის გამოყენების საერთო ტენდენციები და გავაუმჯობესოთ გამოცდილება.",
      },
    },
  },
  en: {
    title: "Cookie use",
    text:
      "We use cookies to keep the website working properly, improve your experience, and support necessary services. You can accept all cookies or manage your preferences.",
    acceptAll: "Accept all",
    reject: "Reject",
    manage: "Manage",
    modalTitle: "Cookie preferences",
    modalText:
      "Choose which optional cookies you allow. Essential cookies are always enabled.",
    save: "Save",
    close: "Close",
    categories: {
      essential: {
        title: "Essential",
        text:
          "Required for secure and proper website operation. This category cannot be disabled through the banner.",
      },
      functional: {
        title: "Functional",
        text: "Supports language, session, interface, and experience preferences.",
      },
      analytics: {
        title: "Analytics",
        text:
          "Google Analytics and TOP.GE help us understand general website usage trends and improve the experience.",
      },
    },
  },
};

function getConsentDraft(consent) {
  return {
    ...DEFAULT_COOKIE_CONSENT,
    ...(consent || {}),
    essential: true,
    marketing: false,
  };
}

export default function CookieConsentBanner() {
  const { language } = useLanguage();
  const text = COPY[language] || COPY.ka;
  const [consent, setConsent] = useState(() => getCookieConsent());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState(() => getConsentDraft(consent));
  const showBanner = !consent && !isModalOpen;
  const categories = useMemo(() => ["essential", "functional", "analytics"], []);

  useEffect(() => {
    applyCookieConsent(consent || DEFAULT_COOKIE_CONSENT);
  }, [consent]);

  useEffect(() => {
    const handleOpenSettings = () => {
      const storedConsent = getCookieConsent();
      setConsent(storedConsent);
      setDraft(getConsentDraft(storedConsent));
      setIsModalOpen(true);
    };

    window.addEventListener(COOKIE_SETTINGS_EVENT_NAME, handleOpenSettings);

    return () => {
      window.removeEventListener(COOKIE_SETTINGS_EVENT_NAME, handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  const saveConsent = (preferences) => {
    const nextConsent = saveCookieConsent(preferences);
    setConsent(nextConsent);
    setDraft(getConsentDraft(nextConsent));
    setIsModalOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      marketing: false,
    });
  };

  const handleReject = () => {
    saveConsent({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  const handleManage = () => {
    setDraft(getConsentDraft(consent));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    saveConsent(draft);
  };

  const toggleDraft = (key) => {
    if (key === "essential") {
      return;
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: !currentDraft[key],
      essential: true,
    }));
  };

  return (
    <>
      {showBanner ? (
        <section className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 rounded-[1.1rem] border border-[rgba(245,184,0,0.28)] bg-[#171717]/96 p-4 text-white shadow-[0_24px_90px_-36px_rgba(0,0,0,0.95)] backdrop-blur md:flex-row md:items-center md:justify-between md:p-5">
            <div className="max-w-4xl">
              <h2 className="[font-family:var(--font-display)] text-lg font-semibold text-white">
                {text.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-white/72">{text.text}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
              <button type="button" onClick={handleReject} className={secondaryButtonClass}>
                {text.reject}
              </button>
              <button type="button" onClick={handleManage} className={secondaryButtonClass}>
                {text.manage}
              </button>
              <button type="button" onClick={handleAcceptAll} className={primaryButtonClass}>
                {text.acceptAll}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/62 px-4 py-5 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <section
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[1.15rem] border border-white/12 bg-[#171717] p-5 text-white shadow-[0_34px_120px_-48px_rgba(0,0,0,0.96)] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="cookie-preferences-title"
                  className="[font-family:var(--font-display)] text-2xl font-semibold"
                >
                  {text.modalTitle}
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/68">{text.modalText}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-white/12 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                autoFocus
              >
                {text.close}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {categories.map((category) => {
                const categoryText = text.categories[category];
                const isEssential = category === "essential";
                const checked = Boolean(draft[category]);

                return (
                  <article
                    key={category}
                    className="flex flex-col gap-4 rounded-[0.95rem] border border-white/10 bg-[#202020] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {categoryText.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-white/64">
                        {categoryText.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      disabled={isEssential}
                      onClick={() => toggleDraft(category)}
                      className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
                        checked
                          ? "border-[rgba(245,184,0,0.7)] bg-[rgba(245,184,0,0.82)]"
                          : "border-white/16 bg-white/10"
                      } ${isEssential ? "cursor-not-allowed opacity-75" : ""}`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                          checked ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsModalOpen(false)} className={secondaryButtonClass}>
                {text.close}
              </button>
              <button type="button" onClick={handleAcceptAll} className={secondaryButtonClass}>
                {text.acceptAll}
              </button>
              <button type="button" onClick={handleSave} className={primaryButtonClass}>
                {text.save}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

const primaryButtonClass =
  "rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-extrabold text-[#101010] shadow-[0_12px_30px_-16px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)]";

const secondaryButtonClass =
  "rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/14";
