import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { CategoryDTO, CategoriesListDTO, ErrorResponseDTO, DeleteCategoryResponseDTO } from "@/types";
import type { CategoryFormMode } from "@/components/categories/types";

interface UseCategoriesPageResult {
  // Stan danych
  categories: CategoryDTO[];
  isLoading: boolean;
  error: string | null;

  // Akcje danych
  fetchCategories: () => Promise<void>;

  // Stan modali
  formDialog: {
    isOpen: boolean;
    mode: CategoryFormMode;
    category?: CategoryDTO;
  };
  deleteDialog: {
    isOpen: boolean;
    category: CategoryDTO | null;
    isDeleting: boolean;
  };

  // Akcje modali
  openCreateDialog: () => void;
  openEditDialog: (category: CategoryDTO) => void;
  openDeleteDialog: (category: CategoryDTO) => void;
  closeFormDialog: () => void;
  closeDeleteDialog: () => void;

  // Operacje CRUD
  createCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export function useCategoriesPage(accessToken: string): UseCategoriesPageResult {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formDialog, setFormDialog] = useState<{
    isOpen: boolean;
    mode: CategoryFormMode;
    category?: CategoryDTO;
  }>({
    isOpen: false,
    mode: "create",
    category: undefined,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    category: CategoryDTO | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    category: null,
    isDeleting: false,
  });

  const handleUnauthorized = useCallback(() => {
    window.location.href = "/login?sessionExpired=true";
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Nie udało się załadować kategorii");
      }

      const data: CategoriesListDTO = await response.json();
      setCategories(data.categories);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się połączyć z serwerem";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, handleUnauthorized]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = useCallback(() => {
    setFormDialog({
      isOpen: true,
      mode: "create",
      category: undefined,
    });
  }, []);

  const openEditDialog = useCallback((category: CategoryDTO) => {
    setFormDialog({
      isOpen: true,
      mode: "edit",
      category,
    });
  }, []);

  const openDeleteDialog = useCallback((category: CategoryDTO) => {
    setDeleteDialog({
      isOpen: true,
      category,
      isDeleting: false,
    });
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const createCategory = useCallback(
    async (name: string) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const errorData: ErrorResponseDTO = await response.json();

        if (response.status === 409) {
          throw new Error("Kategoria o tej nazwie już istnieje");
        }

        if (response.status === 400 && errorData.error.details) {
          const fieldError = errorData.error.details.find((d) => d.field === "name");
          throw new Error(fieldError?.message || "Nieprawidłowe dane");
        }

        throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }

      toast.success("Kategoria dodana");
      closeFormDialog();
      await fetchCategories();
    },
    [accessToken, handleUnauthorized, closeFormDialog, fetchCategories]
  );

  const updateCategory = useCallback(
    async (id: string, name: string) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const errorData: ErrorResponseDTO = await response.json();

        if (response.status === 409) {
          throw new Error("Kategoria o tej nazwie już istnieje");
        }

        if (response.status === 403) {
          throw new Error("Nie można modyfikować kategorii systemowej");
        }

        if (response.status === 404) {
          toast.error("Kategoria nie została znaleziona");
          await fetchCategories();
          throw new Error("Kategoria nie została znaleziona");
        }

        if (response.status === 400 && errorData.error.details) {
          const fieldError = errorData.error.details.find((d) => d.field === "name");
          throw new Error(fieldError?.message || "Nieprawidłowe dane");
        }

        throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }

      toast.success("Kategoria zaktualizowana");
      closeFormDialog();
      await fetchCategories();
    },
    [accessToken, handleUnauthorized, closeFormDialog, fetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

      try {
        const response = await fetch(`/api/categories/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorized();
            return;
          }

          if (response.status === 403) {
            toast.error("Nie można usunąć kategorii systemowej");
            return;
          }

          if (response.status === 404) {
            toast.error("Kategoria nie została znaleziona");
            await fetchCategories();
            return;
          }

          toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
          return;
        }

        const data: DeleteCategoryResponseDTO = await response.json();
        const message =
          data.transactions_moved > 0
            ? `Kategoria usunięta. Przeniesiono ${data.transactions_moved} transakcji do kategorii Brak`
            : "Kategoria usunięta";
        toast.success(message);
        closeDeleteDialog();
        await fetchCategories();
      } finally {
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
      }
    },
    [accessToken, handleUnauthorized, closeDeleteDialog, fetchCategories]
  );

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    formDialog,
    deleteDialog,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeFormDialog,
    closeDeleteDialog,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
