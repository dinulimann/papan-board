import { useEffect, useState } from "react";

export type View = "board" | "list";
export interface Loc { project: string; view: View; params: URLSearchParams; }

function read(): Loc {
  const [path, query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const [project = "kasir", view] = path.split("/");
  return { project, view: view === "list" ? "list" : "board", params: new URLSearchParams(query) };
}

export function useLoc(): Loc {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return loc;
}

export const href = (project: string, view: View, params?: URLSearchParams) => {
  const q = params?.toString();
  return `#/${project}/${view}${q ? `?${q}` : ""}`;
};

/** Updates query params in place (null removes a key) without adding history entries. */
export function setParams(next: Record<string, string | null>) {
  const loc = read();
  for (const [k, v] of Object.entries(next)) (v === null || v === "" ? loc.params.delete(k) : loc.params.set(k, v));
  history.replaceState(null, "", href(loc.project, loc.view, loc.params));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
