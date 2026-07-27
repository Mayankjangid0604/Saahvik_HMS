import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="py-16">
      <EmptyState
        icon={<Compass className="h-10 w-10" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/">
            <Button size="sm">Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
