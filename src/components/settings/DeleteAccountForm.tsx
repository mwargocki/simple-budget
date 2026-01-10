import { useId } from "react";
import { useDeleteAccountForm } from "@/components/hooks/useDeleteAccountForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteAccountFormProps {
  accessToken: string;
}

export function DeleteAccountForm({ accessToken }: DeleteAccountFormProps) {
  console.log("DeleteAccountForm - accessToken:", accessToken ? `${accessToken.substring(0, 30)}... (${accessToken.length} chars)` : "MISSING");
  const { formState, errors, handleChange, handleSubmit } = useDeleteAccountForm(accessToken);

  const confirmationId = useId();
  const confirmationErrorId = useId();
  const generalErrorId = useId();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Alert variant="destructive">
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <AlertDescription>
          Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte.
        </AlertDescription>
      </Alert>

      {formState.error && (
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
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor={confirmationId}>
          Wpisz <span className="font-mono font-bold">DELETE</span>, aby potwierdzić
        </Label>
        <Input
          id={confirmationId}
          type="text"
          name="confirmation"
          autoComplete="off"
          placeholder="DELETE"
          value={formState.confirmation}
          onChange={(e) => handleChange(e.target.value)}
          aria-invalid={!!errors.confirmation}
          aria-describedby={errors.confirmation ? confirmationErrorId : undefined}
          disabled={formState.isSubmitting}
        />
        {errors.confirmation && (
          <p id={confirmationErrorId} className="text-sm text-destructive" role="alert">
            {errors.confirmation}
          </p>
        )}
      </div>

      <Button type="submit" variant="destructive" className="w-full" disabled={formState.isSubmitting}>
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
            <span>Usuwanie konta...</span>
          </>
        ) : (
          "Usuń konto"
        )}
      </Button>
    </form>
  );
}
