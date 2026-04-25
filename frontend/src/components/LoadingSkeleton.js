export default function LoadingSkeleton({ count = 3, className = "" }) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_32px_90px_-58px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-slate-900/85 dark:shadow-[0_32px_90px_-58px_rgba(2,6,23,0.9)]"
        >
          <div className="h-64 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-stone-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
          <div className="space-y-4 p-5">
            <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-7 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-20 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-4 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-11 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
