import { useState, useCallback, type FormEvent } from "react";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/schemas/auth.schema";
import type { ChangePasswordCommand, ErrorResponseDTO } from "@/types";
import { toast } from "sonner";

interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  isSubmitting: boolean;
  generalError: string | null;
}

interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
}

const initialFormState: ChangePasswordFormState = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
  isSubmitting: false,
  generalError: null,
};

export function useChangePasswordForm(accessToken: string, onSuccess?: () => void) {
  const [formState, setFormState] = useState<ChangePasswordFormState>(initialFormState);
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});

  const validateField = useCallback(
    (field: keyof ChangePasswordInput, value: string): string | undefined => {
      if (field === "currentPassword") {
        if (!value || value.length === 0) {
          return "Aktualne hasło jest wymagane";
        }
        return undefined;
      }

      if (field === "newPassword") {
        if (!value || value.length < 8) {
          return "Nowe hasło musi mieć co najmniej 8 znaków";
        }
        if (value === formState.currentPassword) {
          return "Nowe hasło musi być inne niż aktualne";
        }
        return undefined;
      }

      if (field === "newPasswordConfirm") {
        if (value !== formState.newPassword) {
          return "Hasła nie są identyczne";
        }
        return undefined;
      }

      return undefined;
    },
    [formState.currentPassword, formState.newPassword]
  );

  const handleChange = useCallback((field: keyof ChangePasswordInput, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      generalError: null,
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  const handleBlur = useCallback(
    (field: keyof ChangePasswordInput) => {
      const value =
        field === "currentPassword"
          ? formState.currentPassword
          : field === "newPassword"
            ? formState.newPassword
            : formState.newPasswordConfirm;

      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    },
    [formState.currentPassword, formState.newPassword, formState.newPasswordConfirm, validateField]
  );

  const validateForm = useCallback((): boolean => {
    const result = changePasswordSchema.safeParse({
      currentPassword: formState.currentPassword,
      newPassword: formState.newPassword,
      newPasswordConfirm: formState.newPasswordConfirm,
    });

    if (!result.success) {
      const newErrors: ChangePasswordFormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ChangePasswordFormErrors;
        if (field === "currentPassword") {
          newErrors[field] = "Aktualne hasło jest wymagane";
        } else if (field === "newPassword") {
          if (err.message.includes("different")) {
            newErrors[field] = "Nowe hasło musi być inne niż aktualne";
          } else {
            newErrors[field] = "Nowe hasło musi mieć co najmniej 8 znaków";
          }
        } else if (field === "newPasswordConfirm") {
          newErrors[field] = "Hasła nie są identyczne";
        }
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formState.currentPassword, formState.newPassword, formState.newPasswordConfirm]);

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
        const command: ChangePasswordCommand = {
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
          newPasswordConfirm: formState.newPasswordConfirm,
        };

        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();

          if (response.status === 401) {
            setFormState((prev) => ({
              ...prev,
              isSubmitting: false,
              generalError: "Aktualne hasło jest niepoprawne",
            }));
            return;
          }

          if (response.status === 400 && errorData.error.details) {
            const newErrors: ChangePasswordFormErrors = {};
            errorData.error.details.forEach((detail) => {
              if (
                detail.field === "currentPassword" ||
                detail.field === "newPassword" ||
                detail.field === "newPasswordConfirm"
              ) {
                newErrors[detail.field] = detail.message;
              }
            });
            setErrors(newErrors);
            setFormState((prev) => ({
              ...prev,
              isSubmitting: false,
            }));
            return;
          }

          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            generalError: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
          }));
          return;
        }

        toast.success("Hasło zostało zmienione");
        setFormState(initialFormState);
        setErrors({});

        if (onSuccess) {
          onSuccess();
        }
      } catch {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          generalError: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        }));
      }
    },
    [
      formState.currentPassword,
      formState.newPassword,
      formState.newPasswordConfirm,
      validateForm,
      accessToken,
      onSuccess,
    ]
  );

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setErrors({});
  }, []);

  return {
    formState,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}
