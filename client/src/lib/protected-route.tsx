import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation, useRoute } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  adminRequired = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminRequired?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const [isMatchingRoute] = useRoute(path);
  const [, navigate] = useLocation();

  // Handle navigation using effects instead of during render
  useEffect(() => {
    if (isMatchingRoute && !isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (adminRequired && !user.isAdmin) {
        navigate("/");
      }
    }
  }, [isMatchingRoute, isLoading, user, adminRequired, navigate]);

  if (isMatchingRoute) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user || (adminRequired && !user.isAdmin)) {
      return null;
    }

    return <Component />;
  }

  return <Route path={path} component={Component} />;
}
