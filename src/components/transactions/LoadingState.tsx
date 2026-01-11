import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 text-sm text-muted-foreground">Ładowanie transakcji...</p>
    </div>
  );
}
