import { useState, useCallback, type FormEvent } from "react";
import { z } from "zod";
import { registerSchema } from "@/lib/schemas/auth.schema";
import type { RegisterCommand, ErrorResponseDTO } from "@/types";

interface RegisterFormState {
  email: string;
  password: string;
  passwordConfirm: string;
  isSubmitting: boolean;
  generalError: string | null;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

const initialFormState: RegisterFormState = {
  email: "",
  password: "",
  passwordConfirm: "",
  isSubmitting: false,
  generalError: null,
};

// Partial schemas for single field validation (email and password only)
const emailSchema = z.string().email("Invalid email format");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export function useRegisterForm(onRegisterSuccess?: () => void) {
  const [formState, setFormState] = useState<RegisterFormState>(initialFormState);
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const validateField = useCallback((field: "email" | "password", value: string): string | undefined => {
    if (field === "email") {
      const result = emailSchema.safeParse(value);
      if (!result.success) {
        return value === "" ? "E-mail jest wymagany" : "Nieprawidłowy format e-mail";
      }
    }

    if (field === "password") {
      const result = passwordSchema.safeParse(value);
      if (!result.success) {
        return value === "" ? "Hasło jest wymagane" : "Hasło musi mieć co najmniej 8 znaków";
      }
    }

    return undefined;
  }, []);

  const handleChange = useCallback(
    (field: keyof Omit<RegisterFormState, "isSubmitting" | "generalError">, value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
        generalError: null,
      }));
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    },
    []
  );

  const handleBlur = useCallback(
    (field: "email" | "password") => {
      const value = field === "email" ? formState.email : formState.password;
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    },
    [formState.email, formState.password, validateField]
  );

  const validateForm = useCallback((): boolean => {
    const result = registerSchema.safeParse({
      email: formState.email,
      password: formState.password,
      passwordConfirm: formState.passwordConfirm,
    });

    if (!result.success) {
      const newErrors: RegisterFormErrors = {};

      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof RegisterFormErrors;

        if (field === "email") {
          newErrors.email = formState.email === "" ? "E-mail jest wymagany" : "Nieprawidłowy format e-mail";
        } else if (field === "password") {
          newErrors.password =
            formState.password === "" ? "Hasło jest wymagane" : "Hasło musi mieć co najmniej 8 znaków";
        } else if (field === "passwordConfirm") {
          newErrors.passwordConfirm =
            formState.passwordConfirm === "" ? "Potwierdzenie hasła jest wymagane" : "Hasła nie są identyczne";
        }
      });

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formState.email, formState.password, formState.passwordConfirm]);

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
        const registerData: RegisterCommand = {
          email: formState.email,
          password: formState.password,
          passwordConfirm: formState.passwordConfirm,
        };

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
        });

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();

          if (response.status === 409) {
            setFormState((prev) => ({
              ...prev,
              isSubmitting: false,
              generalError: "Ten adres e-mail jest już zarejestrowany",
            }));
            return;
          }

          if (response.status === 400 && errorData.error.details) {
            const newErrors: RegisterFormErrors = {};
            errorData.error.details.forEach((detail) => {
              if (detail.field === "email" || detail.field === "password" || detail.field === "passwordConfirm") {
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

        await response.json();

        if (onRegisterSuccess) {
          onRegisterSuccess();
        } else {
          window.location.assign("/login");
        }
      } catch {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          generalError: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        }));
      }
    },
    [formState.email, formState.password, formState.passwordConfirm, validateForm, onRegisterSuccess]
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
