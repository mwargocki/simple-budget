import { useState, useCallback, type FormEvent } from "react";
import { createCategorySchema } from "@/lib/schemas/category.schema";
import type { CategoryFormState, CategoryFormErrors } from "@/components/categories/types";

interface UseCategoryFormResult {
  formState: CategoryFormState;
  errors: CategoryFormErrors;
  handleChange: (value: string) => void;
  handleBlur: () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  resetForm: () => void;
  setApiError: (error: string | null) => void;
}

const initialFormState: CategoryFormState = {
  name: "",
  isSubmitting: false,
  generalError: null,
};

export function useCategoryForm(initialName = "", onSubmit: (name: string) => Promise<void>): UseCategoryFormResult {
  const [formState, setFormState] = useState<CategoryFormState>({
    ...initialFormState,
    name: initialName,
  });
  const [errors, setErrors] = useState<CategoryFormErrors>({});

  const validateField = useCallback((value: string): string | undefined => {
    if (!value || value.length === 0) {
      return "Nazwa jest wymagana";
    }

    if (value.trim().length === 0) {
      return "Nazwa nie może składać się tylko z białych znaków";
    }

    if (value.length > 40) {
      return "Nazwa nie może przekraczać 40 znaków";
    }

    if (value !== value.trim()) {
      return "Nazwa nie może zaczynać się ani kończyć spacją";
    }

    return undefined;
  }, []);

  const handleChange = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      name: value,
      generalError: null,
    }));
    setErrors({});
  }, []);

  const handleBlur = useCallback(() => {
    const error = validateField(formState.name);
    setErrors({ name: error });
  }, [formState.name, validateField]);

  const validateForm = useCallback((): boolean => {
    const result = createCategorySchema.safeParse({ name: formState.name });

    if (!result.success) {
      const error = validateField(formState.name);
      setErrors({ name: error || "Nieprawidłowa nazwa kategorii" });
      return false;
    }

    setErrors({});
    return true;
  }, [formState.name, validateField]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setFormState((prev) => ({
        ...prev,
        isSubmitting: true,
        generalError: null,
      }));

      try {
        await onSubmit(formState.name.trim());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";

        // Sprawdź czy to błąd związany z polem name (np. duplikat)
        if (message.includes("nazwa") || message.includes("istnieje")) {
          setErrors({ name: message });
        } else {
          setFormState((prev) => ({
            ...prev,
            generalError: message,
          }));
        }
      } finally {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    },
    [formState.name, validateForm, onSubmit]
  );

  const resetForm = useCallback(() => {
    setFormState({
      ...initialFormState,
      name: initialName,
    });
    setErrors({});
  }, [initialName]);

  const setApiError = useCallback((error: string | null) => {
    if (error) {
      setErrors({ name: error });
    } else {
      setErrors({});
    }
  }, []);

  return {
    formState,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setApiError,
  };
}
