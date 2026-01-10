import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted" aria-hidden="true">
        <Tag className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium">Nie masz jeszcze żadnych kategorii</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Dodaj pierwszą kategorię, aby lepiej organizować swoje transakcje.
      </p>
      <Button onClick={onAddClick} className="mt-6">
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Dodaj pierwszą kategorię
      </Button>
    </div>
  );
}
