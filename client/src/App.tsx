import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./lib/queryClient";

// Pages
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Marketplaces from "@/pages/marketplaces";
import Analytics from "@/pages/analytics";
import Stores from "@/pages/stores";
import Payments from "@/pages/payments";
import Donations from "@/pages/donations";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/marketplaces" component={Marketplaces} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/stores" component={Stores} />
        <Route path="/payments" component={Payments} />
        <Route path="/donations" component={Donations} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route>
        <Login />
      </Route>
    </Switch>
  );
}

function App() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      {user ? <AuthenticatedApp /> : <UnauthenticatedApp />}
    </TooltipProvider>
  );
}

export default App;
