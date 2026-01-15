import type { ReactNode } from "react";
import { Wallet, Tag, BarChart3, Settings } from "lucide-react";
import { DashboardTile } from "./DashboardTile";

interface DashboardTileData {
  id: string;
  title: string;
  description?: string;
  href: string;
  icon: ReactNode;
}

const DASHBOARD_TILES: DashboardTileData[] = [
  {
    id: "transactions",
    title: "Transakcje",
    description: "Zarządzaj wydatkami i przychodami",
    href: "/app/transactions",
    icon: <Wallet className="h-6 w-6" />,
  },
  {
    id: "categories",
    title: "Kategorie",
    description: "Zarządzaj kategoriami",
    href: "/app/categories",
    icon: <Tag className="h-6 w-6" />,
  },
  {
    id: "summary",
    title: "Podsumowanie",
    description: "Analizuj swoje finanse",
    href: "/app/summary",
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    id: "settings",
    title: "Ustawienia",
    description: "Konfiguruj swoje konto",
    href: "/app/settings",
    icon: <Settings className="h-6 w-6" />,
  },
];

export function DashboardPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8" data-testid="dashboard-page">
      <nav aria-label="Główna nawigacja aplikacji">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DASHBOARD_TILES.map((tile) => (
            <DashboardTile
              key={tile.id}
              id={tile.id}
              title={tile.title}
              description={tile.description}
              href={tile.href}
              icon={tile.icon}
            />
          ))}
        </div>
      </nav>
    </main>
  );
}
