import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/components/providers/websocket-provider";

// Pages
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Marketplaces from "@/pages/marketplaces";
import Analytics from "@/pages/analytics";
import Stores from "@/pages/stores";
import Payments from "@/pages/payments";
import Donations from "@/pages/donations";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/marketplaces" component={Marketplaces} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/stores" component={Stores} />
      <ProtectedRoute path="/payments" component={Payments} />
      <ProtectedRoute path="/donations" component={Donations} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <WebSocketProvider>
          <Router />
          <Toaster />
        </WebSocketProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
