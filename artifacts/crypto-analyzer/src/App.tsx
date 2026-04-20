import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { AuthGuard } from "@/components/admin/auth-guard";
import { AdminLayout } from "@/components/admin/admin-layout";
import Home from "@/pages/home";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Tools from "@/pages/tools";
import Rune from "@/pages/rune";
import B18 from "@/pages/b18";
import HyperLiquid from "@/pages/hyperliquid";
import LegendATM from "@/pages/legend-atm";
import Recruit from "@/pages/recruit";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminMaterials from "@/pages/admin/materials";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/** Public site — wraps every non-admin page in AppLayout (header, nav, footer). */
function PublicRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/rune" component={Rune} />
        <Route path="/projects/b18" component={B18} />
        <Route path="/projects/hyperliquid" component={HyperLiquid} />
        <Route path="/projects/legend-atm" component={LegendATM} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/tools" component={Tools} />
        <Route path="/recruit" component={Recruit} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

/** Admin area — its own shell, own auth guard, bypasses AppLayout. */
function AdminArea() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        {() => (
          <AuthGuard>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/materials">
        {() => (
          <AuthGuard>
            <AdminLayout>
              <AdminMaterials />
            </AdminLayout>
          </AuthGuard>
        )}
      </Route>
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      {/* Admin routes are matched first and render their own layout */}
      <Route path="/admin/:rest*" component={AdminArea} />
      {/* Everything else uses the public marketing layout */}
      <Route component={PublicRouter} />
    </Switch>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
