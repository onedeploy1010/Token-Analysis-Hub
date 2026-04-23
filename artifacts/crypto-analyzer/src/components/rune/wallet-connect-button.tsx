import { ConnectButton, darkTheme } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { thirdwebClient, isThirdwebConfigured } from "@/lib/thirdweb/client";
import { runeChain, supportedChains } from "@/lib/thirdweb/chains";
import { AlertTriangle } from "lucide-react";

/**
 * Explicit wallet shortlist — covers the wallets the RUNE target users
 * actually have (MetaMask and TokenPocket are the two asked for, others
 * are bonus). ConnectButton still shows "More" for the long tail via
 * WalletConnect.
 */
const wallets = [
  createWallet("io.metamask"),
  createWallet("pro.tokenpocket"),          // TokenPocket
  createWallet("com.trustwallet.app"),
  createWallet("com.okex.wallet"),
  createWallet("walletConnect"),
];

/**
 * Amber-tinted ConnectButton that matches the rest of the RUNE page.
 * When thirdweb isn't configured we render an inert banner instead of a
 * button so the user gets a clear signal about what's missing.
 */
export function WalletConnectButton() {
  if (!isThirdwebConfigured()) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          Wallet disabled —{" "}
          <code className="font-mono text-foreground">VITE_THIRDWEB_CLIENT_ID</code> is not set.
        </span>
      </div>
    );
  }

  return (
    <ConnectButton
      client={thirdwebClient}
      chain={runeChain}
      chains={supportedChains}
      wallets={wallets}
      connectButton={{
        // "Connect" reads fine on mobile; desktop still has plenty of room.
        // Width is FIXED (not max-width) so the connected-state pill lands
        // at exactly the same footprint — no reflow of the header cluster
        // when the user signs in / signs out.
        label: "Connect",
        className: "!font-semibold !w-[130px] sm:!w-[200px]",
      }}
      // `detailsButton` matches the connect button's fixed width so the
      // pre/post-connect states occupy the same space; long addresses +
      // balances truncate inside the fixed box instead of growing it.
      detailsButton={{ className: "!w-[130px] sm:!w-[200px]" }}
      connectModal={{ size: "compact", showThirdwebBranding: false }}
      theme={darkTheme({
        colors: {
          accentText:       "hsl(38, 90%, 50%)",
          accentButtonBg:   "hsl(38, 90%, 50%)",
          accentButtonText: "hsl(230, 30%, 5%)",
          primaryButtonBg:  "hsl(38, 90%, 50%)",
          primaryButtonText:"hsl(230, 30%, 5%)",
          modalBg:          "hsl(230, 25%, 8%)",
          borderColor:      "hsl(230, 20%, 18%)",
        },
      })}
    />
  );
}
