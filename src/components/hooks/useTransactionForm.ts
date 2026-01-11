import { useState, useCallback, useMemo } from "react";
import type { TransactionFormData, TransactionFormErrors, TransactionFormMode } from "@/components/transactions/types";

function getCurrentDateUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialFormData(mode: TransactionFormMode, initialData?: TransactionFormData): TransactionFormData {
  if (mode === "edit" && initialData) {
    return {
      amount: initialData.amount,
      type: initialData.type,
      category_id: initialData.category_id,
      description: initialData.description,
      occurred_at: initialData.occurred_at,
    };
  }

  return {
    amount: "",
    type: "expense",
    category_id: "",
    description: "",
    occurred_at: getCurrentDateUTC(),
  };
}

function normalizeAmount(value: string): string {
  // Zamiana przecinka na kropkę
  const normalized = value.replace(",", ".");

  // Parsowanie do liczby
  const num = parseFloat(normalized);

  if (isNaN(num)) {
    return value;
  }

  // Formatowanie do 2 miejsc po przecinku
  return num.toFixed(2);
}

function validateAmount(value: string): string | undefined {
  if (!value.trim()) {
    return "Kwota jest wymagana";
  }

  const normalized = value.replace(",", ".");
  const num = parseFloat(normalized);

  if (isNaN(num)) {
    return "Nieprawidłowy format kwoty";
  }

  if (num < 0.01) {
    return "Kwota musi być między 0,01 a 1 000 000,00";
  }

  if (num > 1000000) {
    return "Kwota musi być między 0,01 a 1 000 000,00";
  }

  return undefined;
}

function validateType(value: string): string | undefined {
  if (value !== "expense" && value !== "income") {
    return "Wybierz typ transakcji";
  }
  return undefined;
}

function validateCategoryId(value: string): string | undefined {
  if (!value.trim()) {
    return "Wybierz kategorię";
  }
  return undefined;
}

function validateDescription(value: string): string | undefined {
  if (!value.trim()) {
    return "Opis jest wymagany";
  }

  if (value.trim().length === 0) {
    return "Opis nie może składać się tylko z białych znaków";
  }

  if (value.length > 255) {
    return "Maksymalnie 255 znaków";
  }

  return undefined;
}

function validateOccurredAt(value: string): string | undefined {
  if (!value.trim()) {
    return "Data jest wymagana";
  }

  // Sprawdzenie formatu YYYY-MM-DD
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(value)) {
    return "Nieprawidłowa data";
  }

  // Sprawdzenie czy data jest prawidłowa
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return "Nieprawidłowa data";
  }

  return undefined;
}

interface UseTransactionFormResult {
  formData: TransactionFormData;
  errors: TransactionFormErrors;
  isSubmitting: boolean;
  setFieldValue: <K extends keyof TransactionFormData>(field: K, value: TransactionFormData[K]) => void;
  handleAmountBlur: () => void;
  validateField: (field: keyof TransactionFormData) => boolean;
  validateForm: () => boolean;
  handleSubmit: (onSubmit: (data: TransactionFormData) => Promise<void>) => Promise<void>;
  setGeneralError: (error: string | null) => void;
  resetForm: () => void;
}

export function useTransactionForm(
  mode: TransactionFormMode,
  initialData?: TransactionFormData
): UseTransactionFormResult {
  const [formData, setFormData] = useState<TransactionFormData>(() => getInitialFormData(mode, initialData));
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldValue = useCallback(<K extends keyof TransactionFormData>(field: K, value: TransactionFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Wyczyść błąd pola przy zmianie wartości
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleAmountBlur = useCallback(() => {
    if (formData.amount) {
      const normalized = normalizeAmount(formData.amount);
      setFormData((prev) => ({ ...prev, amount: normalized }));
    }
  }, [formData.amount]);

  const validateField = useCallback(
    (field: keyof TransactionFormData): boolean => {
      let error: string | undefined;

      switch (field) {
        case "amount":
          error = validateAmount(formData.amount);
          break;
        case "type":
          error = validateType(formData.type);
          break;
        case "category_id":
          error = validateCategoryId(formData.category_id);
          break;
        case "description":
          error = validateDescription(formData.description);
          break;
        case "occurred_at":
          error = validateOccurredAt(formData.occurred_at);
          break;
      }

      setErrors((prev) => ({ ...prev, [field]: error }));
      return !error;
    },
    [formData]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: TransactionFormErrors = {
      amount: validateAmount(formData.amount),
      type: validateType(formData.type),
      category_id: validateCategoryId(formData.category_id),
      description: validateDescription(formData.description),
      occurred_at: validateOccurredAt(formData.occurred_at),
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some((error) => error !== undefined);
  }, [formData]);

  const handleSubmit = useCallback(
    async (onSubmit: (data: TransactionFormData) => Promise<void>) => {
      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setErrors((prev) => ({ ...prev, general: undefined }));

      try {
        await onSubmit(formData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
        setErrors((prev) => ({ ...prev, general: message }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm]
  );

  const setGeneralError = useCallback((error: string | null) => {
    setErrors((prev) => ({ ...prev, general: error || undefined }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData(mode, initialData));
    setErrors({});
    setIsSubmitting(false);
  }, [mode, initialData]);

  const result = useMemo<UseTransactionFormResult>(
    () => ({
      formData,
      errors,
      isSubmitting,
      setFieldValue,
      handleAmountBlur,
      validateField,
      validateForm,
      handleSubmit,
      setGeneralError,
      resetForm,
    }),
    [
      formData,
      errors,
      isSubmitting,
      setFieldValue,
      handleAmountBlur,
      validateField,
      validateForm,
      handleSubmit,
      setGeneralError,
      resetForm,
    ]
  );

  return result;
}
