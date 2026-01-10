import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SessionExpiredToastProps {
  visible: boolean;
  onClose: () => void;
}

export function SessionExpiredToast({ visible, onClose }: SessionExpiredToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <Alert className="flex items-center gap-3 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 pr-10">
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
        <AlertDescription>Sesja wygasła. Zaloguj się ponownie.</AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 size-6 text-amber-800 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:text-amber-100 dark:hover:bg-amber-900"
          onClick={onClose}
          aria-label="Zamknij powiadomienie"
        >
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </Alert>
    </div>
  );
}
