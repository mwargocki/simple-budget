import { BarChart3 } from "lucide-react";
import type { SummaryEmptyStateProps } from "./types";

const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function formatMonthLabel(monthStr: string): string {
  const [yearStr, monthStr2] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr2, 10);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function EmptyState({ month }: SummaryEmptyStateProps) {
  const monthLabel = formatMonthLabel(month);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted" aria-hidden="true">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium">Brak transakcji w {monthLabel}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Dodaj transakcję w widoku Transakcje, aby zobaczyć podsumowanie.
      </p>
    </div>
  );
}
