import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { SummaryCategoryRow } from "./SummaryCategoryRow";
import type { SummaryCategoriesListProps } from "./types";

export function SummaryCategoriesList({ categories, month, isLoading, error, onRetry }: SummaryCategoriesListProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (categories.length === 0) {
    return <EmptyState month={month} />;
  }

  return (
    <section aria-label="Lista kategorii">
      <h2 className="mb-4 text-lg font-semibold">Kategorie</h2>
      <div className="flex flex-col gap-3">
        {categories.map((category) => (
          <SummaryCategoryRow key={category.category_id} category={category} month={month} />
        ))}
      </div>
    </section>
  );
}
