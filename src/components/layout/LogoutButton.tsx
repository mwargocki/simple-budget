import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/components/hooks/useLogout";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  accessToken: string;
  className?: string;
}

export function LogoutButton({ accessToken, className }: LogoutButtonProps) {
  const { logout, isLoggingOut } = useLogout(accessToken);

  return (
    <Button
      variant="ghost"
      onClick={logout}
      disabled={isLoggingOut || !accessToken}
      aria-label="Wyloguj się z aplikacji"
      aria-busy={isLoggingOut}
      className={cn("gap-2", className)}
      data-testid="logout-button"
    >
      {isLoggingOut ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="hidden sm:inline">Wylogowywanie...</span>
        </>
      ) : (
        <>
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Wyloguj</span>
        </>
      )}
    </Button>
  );
}
