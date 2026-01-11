import { MonthPicker } from "./MonthPicker";
import { CategorySelect } from "./CategorySelect";
import type { TransactionsFiltersProps } from "./types";

export function TransactionsFilters({
  month,
  categoryId,
  categories,
  onMonthChange,
  onCategoryChange,
  isLoading,
}: TransactionsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <MonthPicker value={month} onChange={onMonthChange} disabled={isLoading} />
      <CategorySelect value={categoryId} categories={categories} onChange={onCategoryChange} disabled={isLoading} />
    </div>
  );
}
