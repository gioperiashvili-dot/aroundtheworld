export default function LoadingSkeleton({ count = 3, className = "" }) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#202020] shadow-[0_32px_90px_-58px_rgba(0,0,0,0.92)]"
        >
          <div className="h-64 animate-pulse bg-gradient-to-br from-[#171717] via-[#242424] to-[#3a3016]" />
          <div className="space-y-4 p-5">
            <div className="h-5 w-24 animate-pulse rounded-full bg-white/12" />
            <div className="h-7 animate-pulse rounded-full bg-white/12" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/8" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 animate-pulse rounded-[1rem] bg-white/8" />
              <div className="h-20 animate-pulse rounded-[1rem] bg-white/8" />
            </div>
            <div className="h-4 animate-pulse rounded-full bg-white/8" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/8" />
            <div className="h-11 w-32 animate-pulse rounded-full bg-[rgba(245,184,0,0.18)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
