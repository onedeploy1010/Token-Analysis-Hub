import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, RequireAdmin } from "@/contexts/admin-auth";
import AdminLayout from "@/components/admin-layout";
import HostGate from "@/components/host-gate";
import LoginPage from "@/pages/login";
import ResourcesList from "@/pages/resources-list";
import ResourceForm from "@/pages/resource-form";
// RUNE admin sub-pages — M1 stubs, M2/M3 will fill in Supabase queries.
import DashboardPage from "@/pages/admin/dashboard";
import MembersPage from "@/pages/admin/members";
import ReferralsPage from "@/pages/admin/referrals";
import OrdersPage from "@/pages/admin/orders";
import NodesPage from "@/pages/admin/nodes";
import RewardsPage from "@/pages/admin/rewards";
import ContractsPage from "@/pages/admin/contracts";
import SystemHealthPage from "@/pages/admin/system-health";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function AdminRoutes() {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/members" component={MembersPage} />
          <Route path="/referrals" component={ReferralsPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/nodes" component={NodesPage} />
          <Route path="/rewards" component={RewardsPage} />
          <Route path="/contracts" component={ContractsPage} />
          <Route path="/system-health" component={SystemHealthPage} />
          <Route path="/resources/new" component={ResourceForm} />
          <Route path="/resources/:id/edit" component={ResourceForm} />
          <Route path="/resources" component={ResourcesList} />
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
        </Switch>
      </AdminLayout>
    </RequireAdmin>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route component={AdminRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <HostGate>
      <AdminAuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AdminAuthProvider>
    </HostGate>
  );
}

export default App;
