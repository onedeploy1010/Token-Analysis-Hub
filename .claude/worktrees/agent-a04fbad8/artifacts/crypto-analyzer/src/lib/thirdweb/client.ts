import { createThirdwebClient, type ThirdwebClient } from "thirdweb";

/**
 * Single thirdweb client for the whole app. The clientId is read from
 * VITE_THIRDWEB_CLIENT_ID — it's public-safe to ship in the bundle.
 *
 * When the env var is missing we still export a fallback client so the
 * frontend doesn't crash at import time; the wallet-connect UI handles
 * the "not configured" state separately.
 */
const clientId = (import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined) ?? "";

export const thirdwebClient: ThirdwebClient = createThirdwebClient({
  // `clientId: ""` is tolerated by thirdweb at client-creation time — reads
  // that need a real key (wallet connect, infra RPC) will surface a clear
  // error which we propagate to the user.
  clientId: clientId || "missing-client-id",
});

export const isThirdwebConfigured = () => clientId.length > 0;
