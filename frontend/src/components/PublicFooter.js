import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { contactDetails, getEmailHref, getPhoneHref, getWhatsAppHref } from "../lib/contact";

const PRIVACY_POLICY_HREF = "/Around_The_World_Privacy_Policy.pdf";
const FOOTER_YEAR = 2026;
const FOOTER_ADDRESS = "თბილისი: სამამულო ომის გმირების ქუჩა #97";
const SECONDARY_PHONE = "+995 568 94 22 81";
const FOOTER_LINK_CLASS =
  "text-sm font-medium leading-6 text-slate-300 transition hover:text-white";

export default function PublicFooter() {
  const { language, t } = useLanguage();
  const isEnglish = language === "en";
  const pages = [
    { label: isEnglish ? "Home" : "მთავარი", href: "/" },
    { label: isEnglish ? "Tours" : "ტურები", href: "/tours" },
    { label: isEnglish ? "Flights" : "ფრენები", href: "/flights" },
    { label: isEnglish ? "Hotels" : "სასტუმროები", href: "/hotels" },
    { label: isEnglish ? "Restaurants" : "რესტორნები", href: "/restaurants" },
    {
      label: isEnglish ? "Visa Services" : "სავიზო მომსახურება",
      href: "/visa-services",
    },
  ];
  const legalLinks = [
    { label: isEnglish ? "About us" : "ჩვენს შესახებ", href: "/about" },
    { label: isEnglish ? "Contact" : "კონტაქტი", href: "/contact" },
    {
      label: isEnglish ? "Privacy Policy" : "კონფიდენციალურობის პოლიტიკა",
      href: PRIVACY_POLICY_HREF,
      external: true,
    },
  ];
  const socialLinks = [
    { label: t("contact.gmail"), href: getEmailHref(), brand: "gmail" },
    { label: t("contact.facebook"), href: contactDetails.facebook, brand: "facebook" },
    { label: t("contact.instagram"), href: contactDetails.instagram, brand: "instagram" },
    { label: t("contact.whatsapp"), href: getWhatsAppHref(), brand: "whatsapp" },
  ];

  return (
    <footer className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-t-[2.25rem] bg-[#071426] text-white shadow-[0_34px_120px_-56px_rgba(2,6,23,0.9)]">
        <div className="grid gap-10 border-b border-white/10 px-6 py-10 sm:px-8 lg:grid-cols-[1.2fr_0.8fr_0.9fr_1.15fr] lg:px-10">
          <div>
            <h2 className="[font-family:var(--font-display)] text-2xl font-semibold">
              Around The World
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              {isEnglish
                ? "Plan your trip easily with Around The World."
                : "იმოგზაურეთ მარტივად Around The World-თან ერთად."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.brand}
                  href={link.href}
                  target={link.href?.startsWith("http") ? "_blank" : undefined}
                  rel={link.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={link.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 transition hover:-translate-y-0.5 hover:bg-white/14"
                >
                  <SocialMark brand={link.brand} />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title={isEnglish ? "Pages" : "გვერდები"}>
            {pages.map((link) => (
              <FooterRouterLink key={link.href} to={link.href}>
                {link.label}
              </FooterRouterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={isEnglish ? "Other Pages" : "სხვა გვერდები"}>
            {legalLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={FOOTER_LINK_CLASS}
                >
                  {link.label}
                </a>
              ) : (
                <FooterRouterLink key={link.href} to={link.href}>
                  {link.label}
                </FooterRouterLink>
              )
            )}
          </FooterColumn>

          <FooterColumn title={isEnglish ? "Contact" : "კონტაქტი"}>
            <a href={getEmailHref()} className={`${FOOTER_LINK_CLASS} break-words`}>
              {contactDetails.gmail}
            </a>
            <a href={getPhoneHref(contactDetails.phone)} className={FOOTER_LINK_CLASS}>
              {contactDetails.phone}
            </a>
            <a href={getPhoneHref(SECONDARY_PHONE)} className={FOOTER_LINK_CLASS}>
              {SECONDARY_PHONE}
            </a>
            <p className="text-sm leading-7 text-slate-300">{FOOTER_ADDRESS}</p>
          </FooterColumn>
        </div>

        <div className="px-6 py-5 text-sm text-slate-400 sm:px-8 lg:px-10">
          Copyright © {FOOTER_YEAR} Around The World. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white">
        {title}
      </h3>
      <div className="mt-5 flex flex-col items-start gap-3">{children}</div>
    </div>
  );
}

function FooterRouterLink({ to, children }) {
  return (
    <Link to={to} className={FOOTER_LINK_CLASS}>
      {children}
    </Link>
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
