import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { LanguageProvider } from "@/contexts/language-context";
import { RuneOnboarding } from "@/components/rune/rune-onboarding";
import Home from "@/pages/home";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Tools from "@/pages/tools";
// Per user 2026-04-29: rune-v2 is now the canonical /projects/rune.
// The old rune.tsx is kept on disk as historical reference, but not routed.
import RuneV2 from "@/pages/rune-v2";
import B18 from "@/pages/b18";
import HyperLiquid from "@/pages/hyperliquid";
import LegendATM from "@/pages/legend-atm";
import Recruit from "@/pages/recruit";
import Resources from "@/pages/resources";
import Dashboard from "@/pages/dashboard";
import Tutorial from "@/pages/tutorial";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/rune" component={RuneV2} />
        <Route path="/projects/rune-v2" component={RuneV2} />
        <Route path="/projects/b18" component={B18} />
        <Route path="/projects/hyperliquid" component={HyperLiquid} />
        <Route path="/projects/hyperliquid/:address" component={HyperLiquid} />
        <Route path="/projects/legend-atm" component={LegendATM} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/tools" component={Tools} />
        <Route path="/resources" component={Resources} />
        <Route path="/recruit" component={Recruit} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/tutorial" component={Tutorial} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThirdwebProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              {/* Global wallet onboarding. Runs on every page so the moment
                  the header's Connect button succeeds we read referrerOf +
                  getUserPurchaseData and decide: bind modal, purchase modal,
                  or redirect to /dashboard. See components/rune/rune-onboarding. */}
              <RuneOnboarding />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThirdwebProvider>
  );
}

export default App;
