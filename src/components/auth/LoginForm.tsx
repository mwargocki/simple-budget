import { useId } from "react";
import { useLoginForm } from "@/components/hooks/useLoginForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { formState, errors, handleChange, handleBlur, handleSubmit } = useLoginForm(onLoginSuccess);

  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const generalErrorId = useId();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" data-testid="login-form">
      {formState.generalError && (
        <Alert variant="destructive" id={generalErrorId} role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <AlertDescription>{formState.generalError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor={emailId}>E-mail</Label>
        <Input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="jan@example.com"
          value={formState.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrorId : undefined}
          disabled={formState.isSubmitting}
          data-testid="login-email-input"
        />
        {errors.email && (
          <p id={emailErrorId} className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={passwordId}>Hasło</Label>
        <Input
          id={passwordId}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={formState.password}
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? passwordErrorId : undefined}
          disabled={formState.isSubmitting}
          data-testid="login-password-input"
        />
        {errors.password && (
          <p id={passwordErrorId} className="text-sm text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={formState.isSubmitting} data-testid="login-submit-button">
        {formState.isSubmitting ? (
          <>
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Logowanie...</span>
          </>
        ) : (
          "Zaloguj"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <a href="/register" className="text-primary underline-offset-4 hover:underline focus-visible:underline">
          Utwórz konto
        </a>
      </p>
    </form>
  );
}
