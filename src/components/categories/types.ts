import type { CategoryDTO } from "@/types";

/** Stan głównego komponentu strony */
export interface CategoriesPageState {
  categories: CategoryDTO[];
  isLoading: boolean;
  error: string | null;
}

/** Tryb formularza */
export type CategoryFormMode = "create" | "edit";

/** Stan formularza kategorii */
export interface CategoryFormState {
  name: string;
  isSubmitting: boolean;
  generalError: string | null;
}

/** Błędy walidacji formularza */
export interface CategoryFormErrors {
  name?: string;
}

/** Props dla CategoryFormDialog */
export interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CategoryFormMode;
  category?: CategoryDTO;
  onSuccess: () => void;
  accessToken: string;
}

/** Props dla DeleteCategoryDialog */
export interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryDTO | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

/** Stan modali w CategoriesPage */
export interface CategoriesModalsState {
  formDialog: {
    isOpen: boolean;
    mode: CategoryFormMode;
    category?: CategoryDTO;
  };
  deleteDialog: {
    isOpen: boolean;
    category: CategoryDTO | null;
  };
}
