import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import "@dashboard/lib/i18n";
import { DesktopSidebar } from "@dashboard/components/desktop-sidebar";
import { BottomNav } from "@dashboard/components/bottom-nav";
import LangSwitcher from "@dashboard/components/lang-switcher";
import { WalletConnectButton } from "@/components/rune/wallet-connect-button";

const Dashboard       = lazy(() => import("@dashboard/pages/dashboard"));
const Trade           = lazy(() => import("@dashboard/pages/trade"));
const Vault           = lazy(() => import("@dashboard/pages/vault"));
const StrategyPage    = lazy(() => import("@dashboard/pages/strategy"));
const Market          = lazy(() => import("@dashboard/pages/market"));
const CopyTrading     = lazy(() => import("@dashboard/pages/copy-trading"));
const Profile         = lazy(() => import("@dashboard/pages/profile"));
const ProfileReferral = lazy(() => import("@dashboard/pages/profile-referral"));
const ProfileNodes    = lazy(() => import("@dashboard/pages/profile-nodes"));
const ProfileCommission = lazy(() => import("@dashboard/pages/profile-commission"));
const ProfileVault    = lazy(() => import("@dashboard/pages/profile-vault"));
const ProfileSettings = lazy(() => import("@dashboard/pages/profile-settings"));
const ProfileTransactions = lazy(() => import("@dashboard/pages/profile-transactions"));
const ProfileNotifications = lazy(() => import("@dashboard/pages/profile-notifications"));

/**
 * AnimatedRuneLogo — same animated halo + dual rotating arcs as mainnet's
 * AppLayout (`src/components/layout.tsx`). Kept locally inside the shell so
 * `/app/*` doesn't pull in the full mainnet AppLayout module graph.
 */
function AnimatedRuneLogo({ size = 36 }: { size?: number }) {
  const pad = size * 1.6;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: pad * 0.95, height: pad * 0.95, background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.08) 50%, transparent 72%)" }}
        animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full border border-amber-400/30"
        style={{ width: size * 0.9, height: size * 0.9 }}
        animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", repeatDelay: 0.4 }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: size * 1.25, height: size * 1.25, border: "1.5px solid transparent", borderTopColor: "rgba(251,191,36,0.55)", borderRightColor: "rgba(251,191,36,0.25)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: size * 1.05, height: size * 1.05, border: "1px solid transparent", borderBottomColor: "rgba(217,119,6,0.4)", borderLeftColor: "rgba(217,119,6,0.15)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />
      <motion.img
        src="/rune-logo-new.png"
        alt="RUNE"
        className="relative z-10 object-contain"
        style={{ width: size, height: size, filter: "brightness(1.12) contrast(1.05)" }}
        animate={{
          filter: [
            "brightness(1.05) contrast(1.05) drop-shadow(0 0 5px rgba(251,191,36,0.3))",
            "brightness(1.2) contrast(1.08) drop-shadow(0 0 14px rgba(251,191,36,0.7))",
            "brightness(1.05) contrast(1.05) drop-shadow(0 0 5px rgba(251,191,36,0.3))",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function ShellHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8 h-[53px] border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <Link href="/" className="flex items-center cursor-pointer shrink-0 gap-2">
        <AnimatedRuneLogo size={32} />
        <span className="font-display font-bold leading-tight flex-col hidden sm:flex">
          <span className="text-foreground text-xs lg:text-sm tracking-[0.2em]">RUNE</span>
          <span className="text-primary text-[0.55rem] lg:text-[0.6rem] tracking-[0.35em]">PROTOCOL</span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <WalletConnectButton />
        <LangSwitcher />
      </div>
    </header>
  );
}

function DashboardRoutes() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/trade" component={Trade} />
        <Route path="/vault" component={Vault} />
        <Route path="/strategy" component={StrategyPage} />
        <Route path="/market" component={Market} />
        <Route path="/copy-trading" component={CopyTrading} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/nodes" component={ProfileNodes} />
        <Route path="/profile/referral" component={ProfileReferral} />
        <Route path="/profile/commission" component={ProfileCommission} />
        <Route path="/profile/vault" component={ProfileVault} />
        <Route path="/profile/settings" component={ProfileSettings} />
        <Route path="/profile/transactions" component={ProfileTransactions} />
        <Route path="/profile/notifications" component={ProfileNotifications} />
      </Switch>
    </Suspense>
  );
}

/**
 * TAICLAW dashboard shell — mounted at `/app/*` from mainnet App.tsx.
 * Uses wouter `base="/app"` so TAICLAW pages' internal `<Link href="/profile">`
 * resolve to `/app/profile` without rewriting every link.
 *
 * Skips TAICLAW's WalletSync (which expected an api-server `authWallet` call) —
 * thirdweb ThirdwebProvider at the App.tsx level already supplies wallet state.
 */
export default function DashboardShell() {
  return (
    <WouterRouter base="/app">
      <div className="min-h-screen bg-background text-foreground">
        <ShellHeader />
        <div className="flex">
          <DesktopSidebar />
          <main className="flex-1 mx-auto max-w-lg lg:max-w-4xl w-full pb-20 lg:pb-8">
            <DashboardRoutes />
          </main>
        </div>
        <BottomNav />
      </div>
    </WouterRouter>
  );
}
