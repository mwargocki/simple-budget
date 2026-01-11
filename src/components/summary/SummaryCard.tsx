import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SummaryCardProps } from "./types";

function formatAmount(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function getValueColorClass(variant: SummaryCardProps["variant"], value: string): string {
  if (variant === "income") {
    return "text-green-600 dark:text-green-500";
  }

  if (variant === "expense") {
    return "text-red-600 dark:text-red-500";
  }

  // balance - zależny od wartości
  const num = parseFloat(value);
  if (num > 0) {
    return "text-green-600 dark:text-green-500";
  }
  if (num < 0) {
    return "text-red-600 dark:text-red-500";
  }
  return "text-muted-foreground";
}

export function SummaryCard({ label, value, variant, isLoading }: SummaryCardProps) {
  const valueColorClass = getValueColorClass(variant, value);

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <span className={cn("text-2xl font-bold", valueColorClass)}>{formatAmount(value)}</span>
        )}
      </CardContent>
    </Card>
  );
}
