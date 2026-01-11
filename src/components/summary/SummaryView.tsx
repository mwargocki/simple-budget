import { useSummaryPage } from "@/components/hooks/useSummaryPage";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { SummaryTotals } from "./SummaryTotals";
import { SummaryCategoriesList } from "./SummaryCategoriesList";
import type { SummaryViewProps } from "./types";

export function SummaryView({ accessToken }: SummaryViewProps) {
  const { summary, isLoading, error, month, setMonth, fetchSummary } = useSummaryPage(accessToken);

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <MonthPicker value={month} onChange={setMonth} disabled={isLoading} />
      </div>

      <SummaryTotals
        totalIncome={summary?.total_income ?? "0"}
        totalExpenses={summary?.total_expenses ?? "0"}
        balance={summary?.balance ?? "0"}
        isLoading={isLoading}
      />

      <SummaryCategoriesList
        categories={summary?.categories ?? []}
        month={month}
        isLoading={isLoading}
        error={error}
        onRetry={fetchSummary}
      />
    </main>
  );
}
