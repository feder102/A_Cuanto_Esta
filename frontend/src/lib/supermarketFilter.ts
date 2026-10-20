import { useSyncExternalStore } from "react";

// El filtro de supermercados se guarda en el navegador además de la URL, así
// sobrevive a nuevas búsquedas y navegación entre páginas hasta que el usuario
// lo deseleccione. La URL (?super=) sigue siendo lo que usa /resultados para filtrar.
const STORAGE_KEY = "supermarketFilter";
const CHANGE_EVENT = "supermarketfilterchange";

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const parse = (raw: string): string[] => (raw ? raw.split(",") : []);

export function getSavedSupermarkets(): string[] {
  return typeof window === "undefined" ? [] : parse(readRaw());
}

export function saveSupermarkets(ids: Iterable<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, Array.from(ids).join(","));
  } catch {
    // sin localStorage el filtro solo vive en la URL
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Supermercados guardados (reactivo; vacío en el servidor y antes de hidratar). */
export function useSavedSupermarkets(): string[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return parse(raw);
}

/** URL de /resultados con q / categoria y los supermercados guardados. */
export function resultsUrl(opts: { q?: string; categoria?: string } = {}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.categoria) params.set("categoria", opts.categoria);
  for (const sm of getSavedSupermarkets()) params.append("super", sm);
  const qs = params.toString();
  return qs ? `/resultados?${qs}` : "/resultados";
}
