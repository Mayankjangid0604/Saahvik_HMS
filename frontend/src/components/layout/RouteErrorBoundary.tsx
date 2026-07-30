import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Router-level `errorElement`. Any error thrown while rendering a route
 * (a bad API shape, an undefined field, a genuine bug) is caught here and
 * shown as a recoverable screen instead of white-screening the whole app.
 * React Router itself recommends this over its bare default boundary.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <div>
        <p className="text-base font-semibold text-ink">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          This page hit an unexpected error. You can try again, or head back and continue working.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-3 max-w-md overflow-auto rounded-md bg-slate-100 p-3 text-left text-xs text-slate-600">
            {message}
          </pre>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
