import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryErrorState({
  title = "We couldn't load this page",
  description = "Please check your connection and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive/70" />
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}