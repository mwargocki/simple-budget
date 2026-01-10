import { useState, useCallback } from "react";
import type { ErrorResponseDTO } from "@/types";

interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  error: string | null;
}

export function useLogout(accessToken: string): UseLogoutReturn {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // 401 - sesja już wygasła, przekieruj
        if (response.status === 401) {
          window.location.assign("/login?sessionExpired=true");
          return;
        }

        const errorData: ErrorResponseDTO = await response.json();
        setError(errorData.error?.message || "Wystąpił błąd podczas wylogowania");
        setIsLoggingOut(false);
        return;
      }

      // Sukces - przekieruj na stronę logowania
      window.location.assign("/login");
    } catch {
      setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      setIsLoggingOut(false);
    }
  }, [accessToken]);

  return {
    logout,
    isLoggingOut,
    error,
  };
}
