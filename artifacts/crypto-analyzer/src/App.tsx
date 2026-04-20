import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
