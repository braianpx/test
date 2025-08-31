import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
import { navigate } from "wouter/use-browser-location";

export function ProtectedRoute({
  path,
  component: Component,
  role,
}: {
  path: string;
  component: () => React.JSX.Element;
  role?: string | string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Route>
    );
  }

  if (!user) {
      navigate("/auth");
  }
  // Verificar rol si está especificado
  else if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user?.role)) {
      user?.role === "surveyor"
      ? navigate("/surveys")
      : navigate("/")
    }
  }

  return (
    <Route path={path} component={Component} />
  );
}
