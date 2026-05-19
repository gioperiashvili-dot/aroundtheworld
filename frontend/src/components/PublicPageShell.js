import Navbar from "./Navbar";
import PublicFooter from "./PublicFooter";

export default function PublicPageShell({
  backgroundImage = "",
  title,
  description,
  highlights = [],
  heroAside = null,
  heroBody = null,
  heroAlignTop = false,
  compactHero = false,
  tightHero = false,
  children,
}) {
  const hasHeroAsideContent = Boolean(heroAside) || highlights.length > 0;
  const heroHeightClassName = compactHero
    ? tightHero
      ? "min-h-[17rem] pb-8 md:min-h-[18rem] md:pb-10"
      : "min-h-[21rem] pb-14 md:min-h-[23rem] md:pb-16"
    : "min-h-[34rem] pb-24";
  const mainOffsetClassName = compactHero
    ? tightHero
      ? "-mt-2 md:-mt-3"
      : "-mt-8 md:-mt-10"
    : "-mt-16";
  const backgroundImageHeightClassName = compactHero
    ? tightHero
      ? "h-[28rem] md:h-[31rem]"
      : "h-[32rem] md:h-[36rem]"
    : "h-[42rem] md:h-[48rem]";
  const hasBackgroundImage = Boolean(backgroundImage);
  const heroTextShadowClassName = hasBackgroundImage
    ? "[text-shadow:0_4px_24px_rgba(0,0,0,0.75),0_1px_2px_rgba(0,0,0,0.9)]"
    : "";

  return (
    <div className="aw-page-background relative isolate min-h-screen overflow-x-hidden text-white transition-colors">
      <div className="pointer-events-none absolute inset-0">
        {hasBackgroundImage ? (
          <div className={`absolute inset-x-0 top-0 overflow-hidden ${backgroundImageHeightClassName}`}>
            <img
              src={backgroundImage}
              alt=""
              width="1536"
              height="1024"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-full w-full object-cover object-center"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/64 sm:bg-black/56" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.74)_0%,rgba(0,0,0,0.46)_44%,rgba(0,0,0,0.18)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(7,8,8,0.88)_100%)]" />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,8,0.08)_0%,rgba(7,8,8,0.26)_42%,rgba(7,8,8,0.58)_100%)]" />
      </div>

      <section className="relative z-10">
        <div
          className={`mx-auto flex w-full max-w-[1500px] flex-col px-4 pt-6 sm:px-6 md:pt-8 lg:px-8 ${heroHeightClassName}`}
        >
          <Navbar variant="page" />

          <div
            className={`grid flex-1 gap-6 ${
              heroAlignTop ? "lg:items-start" : "lg:items-end"
            } ${
              hasHeroAsideContent ? "lg:grid-cols-[1.05fr_0.95fr]" : "lg:grid-cols-1"
            } ${
              compactHero ? "mt-7" : "mt-10"
            }`}
          >
            <div
              className={`space-y-5 pb-2 ${
                hasHeroAsideContent ? "max-w-4xl" : "max-w-[76rem]"
              }`}
            >
              {title ? (
                <h1 className={`[font-family:var(--font-display)] max-w-full text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl ${heroTextShadowClassName}`}>
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className={`max-w-3xl text-base leading-8 text-white/90 md:text-lg ${heroTextShadowClassName}`}>
                  {description}
                </p>
              ) : null}
              {heroBody}
            </div>

            {heroAside ? (
              heroAside
            ) : highlights.length > 0 ? (
              <div className="grid gap-4">
                {highlights.map((highlight) => (
                  <article
                    key={highlight.label}
                    className="rounded-[1rem] border border-white/10 bg-[var(--aw-panel-soft)] p-5 text-white shadow-[0_22px_80px_-54px_rgba(0,0,0,0.9)] backdrop-blur"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--aw-accent)]">
                      {highlight.label}
                    </p>
                    <h2 className="mt-3 [font-family:var(--font-display)] text-2xl font-semibold text-white">
                      {highlight.value}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/72">{highlight.text}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main
        className={`relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 ${mainOffsetClassName}`}
      >
        {children}
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(17,17,17,0)_0%,rgba(17,17,17,0.76)_100%)]" />
    </div>
  );
}
