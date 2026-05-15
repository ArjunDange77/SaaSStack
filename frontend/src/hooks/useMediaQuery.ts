import { useEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Viewport below md breakpoint (mobile layout). */
export function useIsMobile(): boolean {
  return !useMediaQuery(MD_QUERY);
}
