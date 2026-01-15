import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DeleteTransactionDialogProps } from "./types";

export function DeleteTransactionDialog({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  isDeleting,
}: DeleteTransactionDialogProps) {
  if (!transaction) {
    return null;
  }

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-testid="delete-transaction-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń transakcję</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz usunąć tę transakcję?
            <br />
            <br />
            <strong>&bdquo;{transaction.description}&rdquo;</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} data-testid="delete-transaction-cancel-button">
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-transaction-confirm-button"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
