import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "./TransactionForm";
import type { TransactionFormDialogProps, TransactionFormData } from "./types";

function formatDateFromISO(isoString: string): string {
  return isoString.substring(0, 10);
}

export function TransactionFormDialog({
  isOpen,
  onClose,
  mode,
  transaction,
  categories,
  onSubmit,
}: TransactionFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreate = mode === "create";
  const title = isCreate ? "Dodaj transakcję" : "Edytuj transakcję";
  const description = isCreate ? "Wprowadź dane nowej transakcji." : "Zmień dane transakcji.";

  // Reset submitting state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const initialData: TransactionFormData | undefined = transaction
    ? {
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id,
        description: transaction.description,
        occurred_at: formatDateFromISO(transaction.occurred_at),
      }
    : undefined;

  const handleSubmit = useCallback(
    async (data: TransactionFormData) => {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <TransactionForm
          mode={mode}
          initialData={initialData}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
