export default function EmptyState({ title, message }) {
  return (
    <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#202020] px-6 py-12 text-white shadow-[0_28px_90px_-60px_rgba(0,0,0,0.92)]">
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-[var(--aw-accent)] text-slate-950 shadow-lg shadow-black/20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" />
            <path d="M9 11.5l2 2 4-4" />
          </svg>
        </div>

        <h3 className="[font-family:var(--font-display)] mt-5 text-3xl font-semibold text-white">
          {title}
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/68 md:text-base">
          {message}
        </p>
      </div>
    </div>
  );
}
