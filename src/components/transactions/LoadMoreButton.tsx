import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadMoreButtonProps } from "./types";

export function LoadMoreButton({ onClick, isLoading, hasMore, error, onRetry }: LoadMoreButtonProps) {
  if (!hasMore && !error) {
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={onRetry} size="sm">
          Ponów
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Ładowanie...
          </>
        ) : (
          "Załaduj więcej"
        )}
      </Button>
    </div>
  );
}
