import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionsPage } from "@/components/hooks/useTransactionsPage";
import { TransactionsFilters } from "./TransactionsFilters";
import { TransactionsList } from "./TransactionsList";
import { LoadMoreButton } from "./LoadMoreButton";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";
import type { TransactionsViewProps, TransactionFormData } from "./types";

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

export function TransactionsView({ accessToken }: TransactionsViewProps) {
  const {
    transactions,
    categories,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    filters,
    formDialog,
    deleteDialog,
    setMonth,
    setCategoryId,
    fetchTransactions,
    loadMore,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeFormDialog,
    closeDeleteDialog,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionsPage(accessToken);

  // Generowanie kontekstowego komunikatu pustego stanu
  const emptyMessage = useMemo(() => {
    const monthLabel = formatMonthLabel(filters.month);

    if (filters.categoryId) {
      const category = categories.find((c) => c.id === filters.categoryId);
      const categoryName = category?.name || "wybranej kategorii";
      return `Brak transakcji w ${monthLabel} dla kategorii "${categoryName}"`;
    }

    return `Brak transakcji w ${monthLabel}`;
  }, [filters.month, filters.categoryId, categories]);

  const handleFormSubmit = useCallback(
    async (data: TransactionFormData) => {
      if (formDialog.mode === "create") {
        await createTransaction(data);
      } else if (formDialog.transaction) {
        await updateTransaction(formDialog.transaction.id, data);
      }
    },
    [formDialog.mode, formDialog.transaction, createTransaction, updateTransaction]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteDialog.transaction) {
      await deleteTransaction(deleteDialog.transaction.id);
    }
  }, [deleteDialog.transaction, deleteTransaction]);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* Header z filtrami i przyciskiem dodawania */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TransactionsFilters
            month={filters.month}
            categoryId={filters.categoryId}
            categories={categories}
            onMonthChange={setMonth}
            onCategoryChange={setCategoryId}
            isLoading={isLoading}
          />
          <Button onClick={openCreateDialog} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Dodaj transakcję
          </Button>
        </div>

        {/* Lista transakcji */}
        <TransactionsList
          transactions={transactions}
          isLoading={isLoading}
          error={error}
          onRetry={fetchTransactions}
          onAddClick={openCreateDialog}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
          emptyMessage={emptyMessage}
        />

        {/* Przycisk "Załaduj więcej" */}
        {!isLoading && !error && (
          <LoadMoreButton
            onClick={loadMore}
            isLoading={isLoadingMore}
            hasMore={pagination?.has_more ?? false}
            error={loadMoreError}
            onRetry={loadMore}
          />
        )}
      </div>

      {/* Dialog formularza (dodawanie/edycja) */}
      <TransactionFormDialog
        isOpen={formDialog.isOpen}
        onClose={closeFormDialog}
        mode={formDialog.mode}
        transaction={formDialog.transaction}
        categories={categories}
        onSubmit={handleFormSubmit}
      />

      {/* Dialog usuwania */}
      <DeleteTransactionDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        transaction={deleteDialog.transaction}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteDialog.isDeleting}
      />
    </main>
  );
}
