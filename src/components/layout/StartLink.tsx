import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartLinkProps {
  className?: string;
}

export function StartLink({ className }: StartLinkProps) {
  return (
    <a
      href="/app"
      title="Start"
      aria-label="Przejdź do strony startowej"
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <Home className="size-5" aria-hidden="true" />
    </a>
  );
}
