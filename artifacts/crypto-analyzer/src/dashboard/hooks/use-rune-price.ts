/**
 * RUNE + EMBER price hook. Pre-launch, both tokens are not listed yet —
 * we hard-code the published target prices the protocol uses for accounting:
 *
 *   RUNE  = $0.028  (LP launch ratio: 2.8M USDT : 100M RUNE)
 *   EMBER = $0.038  (initial daily-burn reward valuation)
 *
 * Once the tokens are listed, swap the constants for an oracle/DB read
 * (the API surface here matches what the prior `useMaPrice` exposed so
 * callers don't have to change). See `use-ma-price.ts` history for the
 * Bitget-oracle wiring.
 */
const RUNE_PRICE_USDT = 0.028;
const EMBER_PRICE_USDT = 0.038;

function fmtCompact(amount: number, lang?: string) {
  const isZh = (lang || (typeof window !== "undefined" ? localStorage.getItem("taiclaw-lang") : "en")) === "zh"
    || (lang || "").startsWith("zh");
  if (isZh) {
    if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(2)}亿`;
    if (amount >= 10_000)      return `${(amount / 10_000).toFixed(2)}万`;
    return amount.toFixed(2);
  }
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(2);
}

export function useRunePrice() {
  const price = RUNE_PRICE_USDT;
  const emberPrice = EMBER_PRICE_USDT;

  const usdcToRune  = (usdc: number) => usdc / price;
  const usdcToEmber = (usdc: number) => usdc / emberPrice;

  const formatRune        = (usdc: number) => `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdcToRune(usdc))} RUNE`;
  const formatEmber       = (usdc: number) => `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdcToEmber(usdc))} EMBER`;
  const formatCompactRune  = (usdc: number) => `${fmtCompact(usdcToRune(usdc))} RUNE`;
  const formatCompactEmber = (usdc: number) => `${fmtCompact(usdcToEmber(usdc))} EMBER`;

  return {
    price,
    emberPrice,
    source: "PRELAUNCH" as const,
    isLoading: false,
    // ── RUNE helpers
    usdcToRune,
    formatRune,
    formatCompactRune,
    // ── EMBER helpers
    usdcToEmber,
    formatEmber,
    formatCompactEmber,
    // ── Back-compat aliases (old `useMaPrice` callers used these names)
    usdcToMA: usdcToRune,
    formatMA: formatRune,
    formatCompactMA: formatCompactRune,
  };
}
