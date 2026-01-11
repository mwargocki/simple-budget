import { SummaryCard } from "./SummaryCard";
import type { SummaryTotalsProps } from "./types";

export function SummaryTotals({ totalIncome, totalExpenses, balance, isLoading }: SummaryTotalsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard label="Przychody" value={totalIncome} variant="income" isLoading={isLoading} />
      <SummaryCard label="Wydatki" value={totalExpenses} variant="expense" isLoading={isLoading} />
      <SummaryCard label="Saldo" value={balance} variant="balance" isLoading={isLoading} />
    </div>
  );
}
