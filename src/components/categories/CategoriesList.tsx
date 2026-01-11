import { Card, CardContent } from "@/components/ui/card";
import { CategoryListItem } from "./CategoryListItem";
import type { CategoryDTO } from "@/types";

interface CategoriesListProps {
  categories: CategoryDTO[];
  onEdit: (category: CategoryDTO) => void;
  onDelete: (category: CategoryDTO) => void;
}

export function CategoriesList({ categories, onEdit, onDelete }: CategoriesListProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y px-4" aria-label="Lista kategorii">
          {categories.map((category) => (
            <CategoryListItem key={category.id} category={category} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
