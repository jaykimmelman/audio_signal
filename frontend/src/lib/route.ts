import { useEffect, useState } from "react";

/** Tiny hash-based router: returns the current hash without the leading #. */
export function useHashRoute(): string {
  const [hash, setHash] = useState<string>(() =>
    typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, ""),
  );
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}
