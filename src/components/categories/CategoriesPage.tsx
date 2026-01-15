import { useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategoriesPage } from "@/components/hooks/useCategoriesPage";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { CategoriesList } from "./CategoriesList";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

interface CategoriesPageProps {
  accessToken: string;
}

export function CategoriesPage({ accessToken }: CategoriesPageProps) {
  const {
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
  } = useCategoriesPage(accessToken);

  const handleFormSubmit = useCallback(
    async (name: string) => {
      if (formDialog.mode === "create") {
        await createCategory(name);
      } else if (formDialog.category) {
        await updateCategory(formDialog.category.id, name);
      }
    },
    [formDialog.mode, formDialog.category, createCategory, updateCategory]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteDialog.category) {
      await deleteCategory(deleteDialog.category.id);
    }
  }, [deleteDialog.category, deleteCategory]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={fetchCategories} />;
    }

    if (categories.length === 0) {
      return <EmptyState onAddClick={openCreateDialog} />;
    }

    return <CategoriesList categories={categories} onEdit={openEditDialog} onDelete={openDeleteDialog} />;
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8" data-testid="categories-page">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Zarządzaj kategoriami swoich transakcji.</p>
          <Button onClick={openCreateDialog} disabled={isLoading} data-testid="add-category-button">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Dodaj kategorię
          </Button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Form Dialog */}
      <CategoryFormDialog
        isOpen={formDialog.isOpen}
        onClose={closeFormDialog}
        mode={formDialog.mode}
        category={formDialog.category}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Dialog */}
      <DeleteCategoryDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        category={deleteDialog.category}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteDialog.isDeleting}
      />
    </main>
  );
}
