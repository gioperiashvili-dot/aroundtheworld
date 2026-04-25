import PublicPageShell from "../components/PublicPageShell";
import backgroundThree from "../assets/background/background-3.jpg";
import { useLanguage } from "../i18n/LanguageContext";
import { contactDetails, getEmailHref, getPhoneHref, getWhatsAppHref } from "../lib/contact";

export default function ContactPage() {
  const { t } = useLanguage();

  const contactItems = [
    {
      label: t("contact.address"),
      value: contactDetails.address,
      icon: <AddressIcon />,
    },
    {
      label: t("contact.phone"),
      value: contactDetails.phone,
      href: getPhoneHref(),
      icon: <PhoneIcon />,
    },
    {
      label: t("contact.gmail"),
      value: contactDetails.gmail,
      href: getEmailHref(),
      brand: "gmail",
      icon: <GmailIcon />,
    },
    {
      label: t("contact.facebook"),
      value: "Facebook",
      href: contactDetails.facebook,
      brand: "facebook",
      icon: <FacebookIcon />,
    },
    {
      label: t("contact.instagram"),
      value: "Instagram",
      href: contactDetails.instagram,
      brand: "instagram",
      icon: <InstagramIcon />,
    },
    {
      label: t("contact.whatsapp"),
      value: contactDetails.whatsapp,
      href: getWhatsAppHref(),
      brand: "whatsapp",
      icon: <WhatsAppIcon />,
    },
  ];

  return (
    <PublicPageShell
      backgroundImage={backgroundThree}
      eyebrow={t("contact.eyebrow")}
      title={t("contact.title")}
      description={t("contact.description")}
    >
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
            Around The World
          </p>
          <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
            {t("contact.heading")}
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-slate-300">
            {t("contact.helper")}
          </p>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          {contactItems.map((item) => (
            <ContactCard key={item.label} item={item} />
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}

function ContactCard({ item }) {
  const content = (
    <>
      <span className={getIconShellClass(item.brand)}>
        {item.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          {item.label}
        </span>
        <span className="mt-2 block break-words text-base font-semibold text-slate-950 dark:text-white">
          {item.value}
        </span>
      </span>
    </>
  );

  const className =
    "flex min-h-[8rem] items-center gap-4 rounded-[2rem] border border-white/70 bg-white/92 p-5 text-left shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/88 dark:hover:bg-slate-900";

  if (item.href) {
    return (
      <a
        href={item.href}
        target={item.href.startsWith("http") ? "_blank" : undefined}
        rel={item.href.startsWith("http") ? "noreferrer" : undefined}
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

function getIconShellClass(brand) {
  const baseClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg";

  if (brand === "facebook") {
    return `${baseClass} bg-[#1877F2] text-white shadow-blue-950/20`;
  }

  if (brand === "instagram") {
    return `${baseClass} bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)] text-white shadow-fuchsia-950/20`;
  }

  if (brand === "whatsapp") {
    return `${baseClass} bg-[#25D366] text-white shadow-emerald-950/20`;
  }

  if (brand === "gmail") {
    return `${baseClass} bg-white text-[#EA4335] shadow-red-950/20 ring-1 ring-slate-200 dark:ring-white/20`;
  }

  return `${baseClass} bg-slate-950 text-white dark:bg-white dark:text-slate-950`;
}

function AddressIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M4.5 6.5 12 12.1l7.5-5.6v10.7a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V6.5Z" />
      <path fill="#FBBC04" d="M3 7.4c0-1 .8-1.9 1.9-1.9l7.1 5.3-7.5 5.5L3 15.1V7.4Z" />
      <path fill="#34A853" d="M21 7.4c0-1-.8-1.9-1.9-1.9L12 10.8l7.5 5.5 1.5-1.2V7.4Z" />
      <path fill="#4285F4" d="m4.5 16.3 7.5-5.5 7.5 5.5v.9a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8v-.9Z" />
      <path fill="#C5221F" d="M4.9 5.5h.4L12 10.4l6.7-4.9h.4c.8 0 1.5.5 1.8 1.2L12 13.4 3.1 6.7c.3-.7 1-1.2 1.8-1.2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M14.2 8.1V6.7c0-.7.2-1.1 1.2-1.1h1.5V2.9c-.7-.1-1.5-.2-2.4-.2-2.4 0-4 1.5-4 4.1v1.3H7.8v3h2.7v7.7h3.2v-7.7h2.7l.4-3h-3.1Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M17.3 6.8h.01" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3.1a8.6 8.6 0 0 0-7.3 13.2L3.6 20.9l4.7-1.1A8.6 8.6 0 1 0 12 3.1Zm0 15.7a7.1 7.1 0 0 1-3.6-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.1 7.1 0 1 1 12 18.8Zm4-5.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.8 5.8 0 0 1-2.9-2.5c-.2-.3 0-.4.1-.5l.4-.4c.1-.1.1-.2.2-.4.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.3-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  );
}
