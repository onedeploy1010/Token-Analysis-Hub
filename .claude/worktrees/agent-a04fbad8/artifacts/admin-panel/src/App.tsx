import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, RequireAdmin } from "@/contexts/admin-auth";
import AdminLayout from "@/components/admin-layout";
import HostGate from "@/components/host-gate";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ResourcesList from "@/pages/resources-list";
import ResourceForm from "@/pages/resource-form";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function AdminRoutes() {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
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
