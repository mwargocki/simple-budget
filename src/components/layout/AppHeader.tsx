import { StartLink } from "./StartLink";
import { LogoutButton } from "./LogoutButton";

interface AppHeaderProps {
  userEmail: string;
  pageTitle: string;
  accessToken: string;
}

export function AppHeader({ userEmail, pageTitle, accessToken }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background shadow-sm" role="banner">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{userEmail}</span>
          <span className="sm:hidden">{userEmail.split("@")[0]}</span>
        </div>

        <h1 className="flex-1 text-center text-lg font-semibold">{pageTitle}</h1>

        <nav className="flex items-center gap-1" aria-label="Nawigacja nagłówka">
          <StartLink />
          <LogoutButton accessToken={accessToken} />
        </nav>
      </div>
    </header>
  );
}
