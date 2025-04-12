import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation, useRoute } from "wouter";

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

  if (isMatchingRoute) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) {
      navigate("/auth");
      return null;
    }

    if (adminRequired && !user.isAdmin) {
      navigate("/");
      return null;
    }

    return <Component />;
  }

  return <Route path={path} component={Component} />;
}
