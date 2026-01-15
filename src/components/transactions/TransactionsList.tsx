import { useCallback } from "react";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { TransactionListRow } from "./TransactionListRow";
import type { TransactionsListProps } from "./types";
import type { TransactionDTO } from "@/types";

export function TransactionsList({
  transactions,
  isLoading,
  error,
  onRetry,
  onAddClick,
  onEdit,
  onDelete,
  emptyMessage,
}: TransactionsListProps) {
  const handleEdit = useCallback(
    (transaction: TransactionDTO) => () => {
      onEdit(transaction);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (transaction: TransactionDTO) => () => {
      onDelete(transaction);
    },
    [onDelete]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (transactions.length === 0) {
    return <EmptyState message={emptyMessage} onAddClick={onAddClick} />;
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Lista transakcji" data-testid="transactions-list">
      {transactions.map((transaction) => (
        <TransactionListRow
          key={transaction.id}
          transaction={transaction}
          onEdit={handleEdit(transaction)}
          onDelete={handleDelete(transaction)}
        />
      ))}
    </div>
  );
}
