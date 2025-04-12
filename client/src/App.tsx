import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Transactions from "@/pages/transactions";
import Family from "@/pages/family";
import Analytics from "@/pages/analytics";
import AdminFamilies from "@/pages/admin/families";
import AdminUsers from "@/pages/admin/users";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/accounts" component={Accounts} />
      <ProtectedRoute path="/transactions" component={Transactions} />
      <ProtectedRoute path="/family" component={Family} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/admin/families" component={AdminFamilies} adminRequired={true} />
      <ProtectedRoute path="/admin/users" component={AdminUsers} adminRequired={true} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
