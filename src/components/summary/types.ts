import type { MonthlySummaryDTO, CategorySummaryDTO } from "@/types";

/** Props dla SummaryView */
export interface SummaryViewProps {
  accessToken: string;
}

/** Wynik hooka useSummaryPage */
export interface UseSummaryPageResult {
  // Dane
  summary: MonthlySummaryDTO | null;

  // Stany
  isLoading: boolean;
  error: string | null;

  // Filtr
  month: string;

  // Akcje
  setMonth: (month: string) => void;
  fetchSummary: () => Promise<void>;
}

/** Props dla SummaryTotals */
export interface SummaryTotalsProps {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  isLoading: boolean;
}

/** Props dla SummaryCard */
export interface SummaryCardProps {
  label: string;
  value: string;
  variant: "income" | "expense" | "balance";
  isLoading: boolean;
}

/** Props dla SummaryCategoriesList */
export interface SummaryCategoriesListProps {
  categories: CategorySummaryDTO[];
  month: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Props dla SummaryCategoryRow */
export interface SummaryCategoryRowProps {
  category: CategorySummaryDTO;
  month: string;
}

/** Props dla EmptyState (summary) */
export interface SummaryEmptyStateProps {
  month: string;
}
