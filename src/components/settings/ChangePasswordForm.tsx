import { useId } from "react";
import { useChangePasswordForm } from "@/components/hooks/useChangePasswordForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChangePasswordFormProps {
  accessToken: string;
  onSuccess?: () => void;
}

export function ChangePasswordForm({ accessToken, onSuccess }: ChangePasswordFormProps) {
  const { formState, errors, handleChange, handleBlur, handleSubmit } = useChangePasswordForm(accessToken, onSuccess);

  const currentPasswordId = useId();
  const newPasswordId = useId();
  const newPasswordConfirmId = useId();
  const currentPasswordErrorId = useId();
  const newPasswordErrorId = useId();
  const newPasswordConfirmErrorId = useId();
  const generalErrorId = useId();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
        <Label htmlFor={currentPasswordId}>Aktualne hasło</Label>
        <Input
          id={currentPasswordId}
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          placeholder="••••••••"
          value={formState.currentPassword}
          onChange={(e) => handleChange("currentPassword", e.target.value)}
          onBlur={() => handleBlur("currentPassword")}
          aria-invalid={!!errors.currentPassword}
          aria-describedby={errors.currentPassword ? currentPasswordErrorId : undefined}
          disabled={formState.isSubmitting}
        />
        {errors.currentPassword && (
          <p id={currentPasswordErrorId} className="text-sm text-destructive" role="alert">
            {errors.currentPassword}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={newPasswordId}>Nowe hasło</Label>
        <Input
          id={newPasswordId}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          value={formState.newPassword}
          onChange={(e) => handleChange("newPassword", e.target.value)}
          onBlur={() => handleBlur("newPassword")}
          aria-invalid={!!errors.newPassword}
          aria-describedby={errors.newPassword ? newPasswordErrorId : undefined}
          disabled={formState.isSubmitting}
        />
        {errors.newPassword && (
          <p id={newPasswordErrorId} className="text-sm text-destructive" role="alert">
            {errors.newPassword}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={newPasswordConfirmId}>Potwierdź nowe hasło</Label>
        <Input
          id={newPasswordConfirmId}
          type="password"
          name="newPasswordConfirm"
          autoComplete="new-password"
          placeholder="••••••••"
          value={formState.newPasswordConfirm}
          onChange={(e) => handleChange("newPasswordConfirm", e.target.value)}
          onBlur={() => handleBlur("newPasswordConfirm")}
          aria-invalid={!!errors.newPasswordConfirm}
          aria-describedby={errors.newPasswordConfirm ? newPasswordConfirmErrorId : undefined}
          disabled={formState.isSubmitting}
        />
        {errors.newPasswordConfirm && (
          <p id={newPasswordConfirmErrorId} className="text-sm text-destructive" role="alert">
            {errors.newPasswordConfirm}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
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
            <span>Zmiana hasła...</span>
          </>
        ) : (
          "Zmień hasło"
        )}
      </Button>
    </form>
  );
}
