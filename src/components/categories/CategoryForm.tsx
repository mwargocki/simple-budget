import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategoryForm } from "@/components/hooks/useCategoryForm";
import type { CategoryFormMode } from "./types";

interface CategoryFormProps {
  mode: CategoryFormMode;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({ mode, initialName = "", onSubmit, onCancel }: CategoryFormProps) {
  const { formState, errors, handleChange, handleBlur, handleSubmit, resetForm } = useCategoryForm(
    initialName,
    onSubmit
  );

  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    resetForm();
  }, [initialName, resetForm]);

  const isCreate = mode === "create";
  const submitLabel = isCreate ? "Dodaj" : "Zapisz";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="category-form">
      <div className="space-y-2">
        <Label htmlFor={inputId}>Nazwa kategorii</Label>
        <Input
          id={inputId}
          type="text"
          value={formState.name}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Np. Jedzenie, Transport, Rozrywka"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? errorId : undefined}
          disabled={formState.isSubmitting}
          data-testid="category-name-input"
        />
        {errors.name && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {formState.generalError && (
        <p className="text-sm text-destructive" role="alert">
          {formState.generalError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={formState.isSubmitting}
          data-testid="category-cancel-button"
        >
          Anuluj
        </Button>
        <Button type="submit" disabled={formState.isSubmitting} data-testid="category-submit-button">
          {formState.isSubmitting ? "Zapisywanie..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
