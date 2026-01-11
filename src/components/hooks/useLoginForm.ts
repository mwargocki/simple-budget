import { useState, useCallback, type FormEvent } from "react";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth.schema";
import type { LoginCommand, ErrorResponseDTO } from "@/types";

interface LoginFormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  generalError: string | null;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

const initialFormState: LoginFormState = {
  email: "",
  password: "",
  isSubmitting: false,
  generalError: null,
};

export function useLoginForm(onLoginSuccess?: () => void) {
  const [formState, setFormState] = useState<LoginFormState>(initialFormState);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const validateField = useCallback((field: keyof LoginInput, value: string): string | undefined => {
    const fieldSchema = loginSchema.shape[field];
    const result = fieldSchema.safeParse(value);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message;
      if (field === "email") {
        return value === "" ? "E-mail jest wymagany" : "Nieprawidłowy format e-mail";
      }
      if (field === "password") {
        return "Hasło jest wymagane";
      }
      return errorMessage;
    }
    return undefined;
  }, []);

  const handleChange = useCallback((field: keyof LoginInput, value: string) => {
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
    (field: keyof LoginInput) => {
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
    const result = loginSchema.safeParse({
      email: formState.email,
      password: formState.password,
    });

    if (!result.success) {
      const newErrors: LoginFormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginFormErrors;
        if (field === "email") {
          newErrors[field] = formState.email === "" ? "E-mail jest wymagany" : "Nieprawidłowy format e-mail";
        } else if (field === "password") {
          newErrors[field] = "Hasło jest wymagane";
        }
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formState.email, formState.password]);

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
        const credentials: LoginCommand = {
          email: formState.email,
          password: formState.password,
        };

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();

          if (response.status === 401) {
            setFormState((prev) => ({
              ...prev,
              isSubmitting: false,
              generalError: "Nieprawidłowe dane logowania",
            }));
            return;
          }

          if (response.status === 400 && errorData.error.details) {
            const newErrors: LoginFormErrors = {};
            errorData.error.details.forEach((detail) => {
              if (detail.field === "email" || detail.field === "password") {
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

        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.location.assign("/app");
        }
      } catch {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          generalError: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        }));
      }
    },
    [formState.email, formState.password, validateForm, onLoginSuccess]
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
