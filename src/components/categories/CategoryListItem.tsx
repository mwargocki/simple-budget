import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CategoryDTO } from "@/types";

interface CategoryListItemProps {
  category: CategoryDTO;
  onEdit: (category: CategoryDTO) => void;
  onDelete: (category: CategoryDTO) => void;
}

export function CategoryListItem({ category, onEdit, onDelete }: CategoryListItemProps) {
  const isSystem = category.is_system;

  return (
    <li className="flex items-center justify-between border-b py-3 last:border-b-0" data-testid="category-list-item">
      <div className="flex items-center gap-3">
        <span className="font-medium" data-testid="category-name">
          {category.name}
        </span>
        {isSystem && (
          <Badge variant="secondary" className="text-xs">
            Systemowa
          </Badge>
        )}
      </div>

      {!isSystem && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            aria-label={`Edytuj kategorię ${category.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only md:ml-2">Edytuj</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            aria-label={`Usuń kategorię ${category.name}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only md:ml-2">Usuń</span>
          </Button>
        </div>
      )}
    </li>
  );
}
