import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import SurveysPage from "@/pages/surveys-page";
import UsersPage from "@/pages/users-page";
import ZonesPage from "@/pages/zones-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" role={["admin", "supervisor"]} component={DashboardPage} />
      <ProtectedRoute path="/surveys" component={SurveysPage} />
      <ProtectedRoute path="/surveys/create" component={SurveysPage} />
      <ProtectedRoute path="/surveys/:id" component={SurveysPage} />
      <ProtectedRoute path="/surveys/:id/edit" component={SurveysPage} />
      <ProtectedRoute path="/surveys/:id/take" component={SurveysPage} />
      <ProtectedRoute path="/users" component={UsersPage} role={["admin"]} />
      <ProtectedRoute path="/zones" component={ZonesPage} role={["admin", "supervisor"]} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
