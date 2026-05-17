export const PAGE_LOADER_CYCLE_MS = 1550;
export const PAGE_LOADER_REDUCED_MOTION_MS = 400;

export function prefersReducedPageLoaderMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getPageLoaderMinimumDuration() {
  return prefersReducedPageLoaderMotion()
    ? PAGE_LOADER_REDUCED_MOTION_MS
    : PAGE_LOADER_CYCLE_MS;
}

export function waitForPageLoaderCycle(startedAt = Date.now()) {
  const elapsed = Date.now() - startedAt;
  const delay = Math.max(0, getPageLoaderMinimumDuration() - elapsed);

  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}
