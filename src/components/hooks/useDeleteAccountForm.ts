import { useState, useCallback, type FormEvent } from "react";
import { deleteAccountSchema } from "@/lib/schemas/auth.schema";
import type { DeleteAccountCommand, ErrorResponseDTO } from "@/types";
import { toast } from "sonner";

interface DeleteAccountFormState {
  confirmation: string;
  isSubmitting: boolean;
  error: string | null;
}

interface DeleteAccountFormErrors {
  confirmation?: string;
}

const initialFormState: DeleteAccountFormState = {
  confirmation: "",
  isSubmitting: false,
  error: null,
};

export function useDeleteAccountForm(accessToken: string) {
  const [formState, setFormState] = useState<DeleteAccountFormState>(initialFormState);
  const [errors, setErrors] = useState<DeleteAccountFormErrors>({});

  const handleChange = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      confirmation: value,
      error: null,
    }));
    setErrors({});
  }, []);

  const validateForm = useCallback((): boolean => {
    const result = deleteAccountSchema.safeParse({
      confirmation: formState.confirmation,
    });

    if (!result.success) {
      setErrors({
        confirmation: "Wpisz DELETE, aby potwierdzić usunięcie konta",
      });
      return false;
    }

    setErrors({});
    return true;
  }, [formState.confirmation]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setFormState((prev) => ({
        ...prev,
        isSubmitting: true,
        error: null,
      }));

      try {
        const command: DeleteAccountCommand = {
          confirmation: formState.confirmation,
        };

        const response = await fetch("/api/auth/account", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          let errorData: ErrorResponseDTO | null = null;
          try {
            errorData = await response.json();
          } catch {
            // JSON parsing failed
          }

          if (response.status === 401) {
            setFormState((prev) => ({
              ...prev,
              isSubmitting: false,
              error: "Sesja wygasła. Zaloguj się ponownie.",
            }));
            return;
          }

          if (response.status === 400 && errorData?.error?.details) {
            const confirmationError = errorData.error.details.find((d) => d.field === "confirmation");
            if (confirmationError) {
              setErrors({ confirmation: confirmationError.message });
              setFormState((prev) => ({
                ...prev,
                isSubmitting: false,
              }));
              return;
            }
          }

          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            error: errorData?.error?.message || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
          }));
          return;
        }

        toast.success("Konto zostało usunięte");
        window.location.assign("/login");
      } catch {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        }));
      }
    },
    [formState.confirmation, validateForm, accessToken]
  );

  return {
    formState,
    errors,
    handleChange,
    handleSubmit,
  };
}
