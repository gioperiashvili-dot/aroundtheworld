export default function EmptyState({ title, message }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 px-6 py-12 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/82 dark:shadow-[0_28px_90px_-60px_rgba(2,6,23,0.85)]">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-teal-100/70 blur-3xl" />
      <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-slate-950 text-white shadow-lg shadow-slate-950/20 dark:bg-white dark:text-slate-950">
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

        <h3 className="[font-family:var(--font-display)] mt-5 text-3xl font-semibold text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 md:text-base dark:text-slate-300">
          {message}
        </p>
      </div>
    </div>
  );
}
