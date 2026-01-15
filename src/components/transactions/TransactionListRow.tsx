import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TransactionListRowProps } from "./types";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(num);
}

function TransactionListRowComponent({ transaction, onEdit, onDelete }: TransactionListRowProps) {
  const isExpense = transaction.type === "expense";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4" data-testid="transaction-list-item">
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        {/* Data */}
        <span className="w-24 shrink-0 text-sm text-muted-foreground">{formatDate(transaction.occurred_at)}</span>

        {/* Opis */}
        <span className="flex-1 truncate font-medium">{transaction.description}</span>

        {/* Kategoria */}
        <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">{transaction.category_name}</span>

        {/* Kwota i typ */}
        <div className="flex items-center gap-2">
          <span className={`w-28 text-right font-medium ${isExpense ? "text-destructive" : "text-green-600"}`}>
            {isExpense ? "-" : "+"}
            {formatAmount(transaction.amount)}
          </span>
          <Badge variant={isExpense ? "destructive" : "default"} className={isExpense ? "" : "bg-green-600"}>
            {isExpense ? "Wydatek" : "Przychód"}
          </Badge>
        </div>
      </div>

      {/* Akcje */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Edytuj transakcję: ${transaction.description}`}
          data-testid="edit-transaction-button"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={`Usuń transakcję: ${transaction.description}`}
          className="text-destructive hover:text-destructive"
          data-testid="delete-transaction-button"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export const TransactionListRow = memo(TransactionListRowComponent);
