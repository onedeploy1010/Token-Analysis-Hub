import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
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

function ShellHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8 h-[53px] border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <Link href="/" className="flex items-center cursor-pointer shrink-0">
        <img src="/rune-logo-new.png" alt="RUNE" className="h-8 lg:h-9 rounded-full object-cover" />
        <span className="font-display font-bold ml-2 leading-tight flex-col hidden sm:flex">
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
