import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="alert" aria-live="assertive">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button onClick={onRetry} variant="outline" className="mt-4">
        Spróbuj ponownie
      </Button>
    </div>
  );
}
