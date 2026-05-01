import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { SwapWidget } from "thirdweb/react";
import { runeChain } from "@/lib/thirdweb/chains";
import { thirdwebClient } from "@/lib/thirdweb/client";
import { PageEnter } from "@dashboard/components/page-enter";

/**
 * Token swap page — thirdweb's `SwapWidget` (the dedicated swap UI).
 * Defaults to whichever chain `runeChain` resolves to at build time
 * (bsc_mainnet on main bundle, bsc_testnet on testnet bundle); the
 * widget handles connect state, quote, slippage and approval txs on
 * its own. We just wrap it in the page chrome and amber-tinted card.
 */
export default function ProfileSwapPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <PageEnter>
      <div className="min-h-screen pb-24 lg:pb-8 lg:pt-4">
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-center relative mb-4 lg:justify-start">
            <button
              onClick={() => navigate("/profile")}
              className="absolute left-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors lg:hidden"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-white/80" />
            </button>
            <h1 className="text-[17px] font-bold tracking-wide text-foreground">
              {t("profile.swap", "Swap")}
            </h1>
          </div>
        </div>

        <div className="px-4 flex justify-center">
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden surface-3d"
            style={{
              background: "linear-gradient(140deg, rgba(40,30,8,0.65), rgba(20,15,8,0.85) 70%, rgba(10,8,4,0.92))",
              border: "1px solid rgba(251,191,36,0.30)",
              boxShadow:
                "inset 0 1px 0 rgba(251,191,36,0.20), 0 12px 32px -10px rgba(251,191,36,0.20), 0 28px 60px -24px rgba(0,0,0,0.55)",
            }}
          >
            <SwapWidget
              client={thirdwebClient}
              chain={runeChain}
              theme="dark"
            />
          </div>
        </div>
      </div>
    </PageEnter>
  );
}
