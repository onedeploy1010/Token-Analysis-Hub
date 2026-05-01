import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";

// Minimal mount — only the member-facing pages, no admin/provider (those
// folders weren't copied over). Lazy-loaded so a broken TAICLAW page can't
// break the rest of the mainnet bundle on initial load.

const Dashboard       = lazy(() => import("@dashboard/pages/dashboard"));
const Trade           = lazy(() => import("@dashboard/pages/trade"));
const Vault           = lazy(() => import("@dashboard/pages/vault"));
const StrategyPage    = lazy(() => import("@dashboard/pages/strategy"));
const Market          = lazy(() => import("@dashboard/pages/market"));
const CopyTrading     = lazy(() => import("@dashboard/pages/copy-trading"));
const Profile         = lazy(() => import("@dashboard/pages/profile"));
const ProfileReferral = lazy(() => import("@dashboard/pages/profile-referral"));
const ProfileNodes    = lazy(() => import("@dashboard/pages/profile-nodes"));
const ProfileVault    = lazy(() => import("@dashboard/pages/profile-vault"));
const ProfileSettings = lazy(() => import("@dashboard/pages/profile-settings"));

export function DashboardMount() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <Switch>
        <Route path="/app" component={Dashboard} />
        <Route path="/app/trade" component={Trade} />
        <Route path="/app/vault" component={Vault} />
        <Route path="/app/strategy" component={StrategyPage} />
        <Route path="/app/market" component={Market} />
        <Route path="/app/copy-trading" component={CopyTrading} />
        <Route path="/app/profile" component={Profile} />
        <Route path="/app/profile/referral" component={ProfileReferral} />
        <Route path="/app/profile/nodes" component={ProfileNodes} />
        <Route path="/app/profile/vault" component={ProfileVault} />
        <Route path="/app/profile/settings" component={ProfileSettings} />
      </Switch>
    </Suspense>
  );
}
