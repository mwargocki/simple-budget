import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryForm } from "./CategoryForm";
import type { CategoryFormMode } from "./types";
import type { CategoryDTO } from "@/types";

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CategoryFormMode;
  category?: CategoryDTO;
  onSubmit: (name: string) => Promise<void>;
}

export function CategoryFormDialog({ isOpen, onClose, mode, category, onSubmit }: CategoryFormDialogProps) {
  const isCreate = mode === "create";
  const title = isCreate ? "Dodaj kategorię" : "Edytuj kategorię";
  const description = isCreate ? "Podaj nazwę nowej kategorii." : "Zmień nazwę kategorii.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CategoryForm mode={mode} initialName={category?.name || ""} onSubmit={onSubmit} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
