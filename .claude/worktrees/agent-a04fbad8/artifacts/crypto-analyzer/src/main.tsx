import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
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

createRoot(document.getElementById("root")!).render(<App />);
