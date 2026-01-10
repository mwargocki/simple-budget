import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardTileProps {
  title: string;
  description?: string;
  href: string;
  icon: ReactNode;
  className?: string;
}

export function DashboardTile({ title, description, href, icon, className }: DashboardTileProps) {
  return (
    <a
      href={href}
      className={cn(
        "group block rounded-xl transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <Card
        className={cn(
          "h-full transition-all duration-200",
          "group-hover:shadow-md group-hover:-translate-y-0.5",
          "group-active:translate-y-0 group-active:shadow-sm"
        )}
      >
        <CardHeader className="flex flex-row items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            {icon}
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
      </Card>
    </a>
  );
}
