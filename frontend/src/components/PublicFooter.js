import { useLanguage } from "../i18n/LanguageContext";
import { contactDetails, getEmailHref, getPhoneHref, getWhatsAppHref } from "../lib/contact";

export default function PublicFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const links = [
    { label: t("contact.gmail"), href: getEmailHref(), brand: "gmail" },
    { label: t("contact.facebook"), href: contactDetails.facebook, brand: "facebook" },
    { label: t("contact.instagram"), href: contactDetails.instagram, brand: "instagram" },
    { label: t("contact.whatsapp"), href: getWhatsAppHref(), brand: "whatsapp" },
  ];

  return (
    <footer className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6 lg:px-8">
      <div className="grid gap-5 rounded-[2rem] border border-white/16 bg-slate-950/44 px-6 py-6 text-white shadow-[0_26px_90px_-58px_rgba(15,23,42,0.85)] backdrop-blur-xl dark:bg-slate-950/58 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-[0.02em] text-white/88">
            Around The World - All Rights Reserved © {year}
          </p>
          <p className="text-sm text-white/72">
            {t("contact.address")}: {contactDetails.address}
          </p>
          <a
            href={getPhoneHref()}
            className="inline-flex text-sm font-semibold text-white/84 transition hover:text-white"
          >
            {t("contact.phone")}: {contactDetails.phone}
          </a>
          <a
            href={getEmailHref()}
            className="block break-words text-sm font-semibold text-white/84 transition hover:text-white"
          >
            {t("contact.gmail")}: {contactDetails.gmail}
          </a>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/14 hover:text-white"
            >
              <SocialMark brand={link.brand} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function SocialMark({ brand }) {
  return (
    <span className={getSocialMarkClass(brand)}>
      {brand === "facebook" ? <FacebookIcon /> : null}
      {brand === "instagram" ? <InstagramIcon /> : null}
      {brand === "whatsapp" ? <WhatsAppIcon /> : null}
      {brand === "gmail" ? <GmailIcon /> : null}
    </span>
  );
}

function getSocialMarkClass(brand) {
  const baseClass = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white";

  if (brand === "facebook") {
    return `${baseClass} bg-[#1877F2]`;
  }

  if (brand === "instagram") {
    return `${baseClass} bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)]`;
  }

  if (brand === "whatsapp") {
    return `${baseClass} bg-[#25D366]`;
  }

  if (brand === "gmail") {
    return `${baseClass} bg-white text-[#EA4335]`;
  }

  return `${baseClass} bg-white text-slate-950`;
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M14.2 8.1V6.7c0-.7.2-1.1 1.2-1.1h1.5V2.9c-.7-.1-1.5-.2-2.4-.2-2.4 0-4 1.5-4 4.1v1.3H7.8v3h2.7v7.7h3.2v-7.7h2.7l.4-3h-3.1Z" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path fill="#EA4335" d="M4.5 6.5 12 12.1l7.5-5.6v10.7a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V6.5Z" />
      <path fill="#FBBC04" d="M3 7.4c0-1 .8-1.9 1.9-1.9l7.1 5.3-7.5 5.5L3 15.1V7.4Z" />
      <path fill="#34A853" d="M21 7.4c0-1-.8-1.9-1.9-1.9L12 10.8l7.5 5.5 1.5-1.2V7.4Z" />
      <path fill="#4285F4" d="m4.5 16.3 7.5-5.5 7.5 5.5v.9a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8v-.9Z" />
      <path fill="#C5221F" d="M4.9 5.5h.4L12 10.4l6.7-4.9h.4c.8 0 1.5.5 1.8 1.2L12 13.4 3.1 6.7c.3-.7 1-1.2 1.8-1.2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M17.3 6.8h.01" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 3.1a8.6 8.6 0 0 0-7.3 13.2L3.6 20.9l4.7-1.1A8.6 8.6 0 1 0 12 3.1Zm0 15.7a7.1 7.1 0 0 1-3.6-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.1 7.1 0 1 1 12 18.8Zm4-5.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.8 5.8 0 0 1-2.9-2.5c-.2-.3 0-.4.1-.5l.4-.4c.1-.1.1-.2.2-.4.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.3-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  );
}
