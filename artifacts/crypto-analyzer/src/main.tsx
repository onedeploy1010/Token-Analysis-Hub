import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@rune/api-client-react";
import App from "./App";
import "./index.css";

/**
 * Point the Orval-generated API client at an explicit origin when one
 * is configured. Useful for hybrid deploys — e.g. a Cloudflare Pages
 * frontend talking back to a Replit-hosted api-server. When the env
 * var is empty we leave baseUrl unset, so requests stay same-origin.
 */
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) setBaseUrl(apiBase);

/**
 * Stale-deploy auto-reload guard.
 *
 * A user with a cached `index.html` from a previous deploy will keep
 * referring to chunk hashes that no longer exist on the server. With
 * `_redirects` returning a real 404 for missing /assets/* paths the
 * dynamic-import call now throws a TypeError ("Failed to fetch
 * dynamically imported module"). We catch it once at the window level
 * and reload with a cache-busting query param so the new index.html is
 * fetched and the user sees the current build.
 *
 * One-shot via sessionStorage so we never enter an infinite reload loop
 * if the failure is something else (network, real bug).
 */
const RELOAD_KEY = "rune-stale-deploy-reload";
function tryAutoReload(reason: string) {
  if (sessionStorage.getItem(RELOAD_KEY)) return; // already reloaded once this session
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  // eslint-disable-next-line no-console
  console.warn(`[stale-deploy] ${reason} — reloading with cache bust`);
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString(36));
  window.location.replace(url.toString());
}

window.addEventListener("error", (ev) => {
  const msg = String(ev.message || "");
  // Vite's "Failed to fetch dynamically imported module" signals a
  // missing chunk. Browsers also emit "error loading dynamically
  // imported module" with similar wording.
  if (/dynamically imported module/i.test(msg)) tryAutoReload(msg);
});
window.addEventListener("unhandledrejection", (ev) => {
  const msg = String((ev.reason as { message?: string } | undefined)?.message ?? ev.reason ?? "");
  if (/dynamically imported module/i.test(msg)) tryAutoReload(msg);
});

createRoot(document.getElementById("root")!).render(<App />);
