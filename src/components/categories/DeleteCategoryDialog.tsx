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
import type { CategoryDTO } from "@/types";

interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryDTO | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteCategoryDialog({ isOpen, onClose, category, onConfirm, isDeleting }: DeleteCategoryDialogProps) {
  if (!category) {
    return null;
  }

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń kategorię</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz usunąć kategorię <strong>&bdquo;{category.name}&rdquo;</strong>?
            <br />
            <br />
            Wszystkie transakcje przypisane do tej kategorii zostaną przeniesione do kategorii &bdquo;Brak&rdquo;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
