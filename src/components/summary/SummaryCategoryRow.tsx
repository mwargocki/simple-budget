import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryCategoryRowProps } from "./types";

function formatAmount(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function getBalanceColorClass(balance: string): string {
  const num = parseFloat(balance);
  if (num > 0) {
    return "text-green-600 dark:text-green-500";
  }
  if (num < 0) {
    return "text-red-600 dark:text-red-500";
  }
  return "text-muted-foreground";
}

export function SummaryCategoryRow({ category, month }: SummaryCategoryRowProps) {
  const href = useMemo(() => {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("category_id", category.category_id);
    return `/app/transactions?${params.toString()}`;
  }, [category.category_id, month]);

  const balanceColorClass = getBalanceColorClass(category.balance);

  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Kategoria ${category.category_name}, saldo ${formatAmount(category.balance)}, ${category.transaction_count} transakcji. Kliknij, aby zobaczyć transakcje.`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">{category.category_name}</span>
        <span className="text-sm text-muted-foreground">
          {category.transaction_count} {category.transaction_count === 1 ? "transakcja" : "transakcji"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-4">
            <span className="text-green-600 dark:text-green-500">+{formatAmount(category.income)}</span>
            <span className="text-red-600 dark:text-red-500">-{formatAmount(category.expenses)}</span>
          </div>
          <span className={cn("font-semibold", balanceColorClass)}>{formatAmount(category.balance)}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
    </a>
  );
}
