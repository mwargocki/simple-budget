# Plan implementacji widoku Dashboard (Start)

## 1. Przegląd

Widok Dashboard stanowi główny punkt startowy aplikacji dla zalogowanych użytkowników. Jest to prosty widok nawigacyjny prezentujący 4 kafelki w układzie 2x2, które prowadzą do głównych modułów aplikacji: Transakcje, Kategorie, Podsumowanie i Ustawienia. Widok nie wymaga pobierania danych z API ani złożonej logiki biznesowej - jego głównym celem jest zapewnienie szybkiej i intuicyjnej nawigacji.

## 2. Routing widoku

- **Ścieżka:** `/app`
- **Plik:** `src/pages/app/index.astro`
- **Ochrona:** Widok wymaga uwierzytelnienia - niezalogowani użytkownicy powinni być przekierowani na stronę logowania

## 3. Struktura komponentów

```
src/pages/app/index.astro
└── Layout (Astro)
    └── DashboardPage (React, client:load)
        └── div.dashboard-grid
            ├── DashboardTile (Transakcje)
            ├── DashboardTile (Kategorie)
            ├── DashboardTile (Podsumowanie)
            └── DashboardTile (Ustawienia)
```

## 4. Szczegóły komponentów

### 4.1 Strona Astro (`src/pages/app/index.astro`)

- **Opis:** Strona Astro odpowiedzialna za sprawdzenie autoryzacji użytkownika i renderowanie głównego komponentu React.
- **Główne elementy:**
  - Import layoutu `Layout`
  - Sprawdzenie sesji użytkownika przez Supabase
  - Przekierowanie na `/login` jeśli brak sesji
  - Renderowanie `DashboardPage` z dyrektywą `client:load`
- **Obsługiwane interakcje:** Brak (logika autoryzacji wykonywana server-side)
- **Obsługiwana walidacja:** Weryfikacja istnienia sesji użytkownika
- **Typy:** Brak specyficznych typów
- **Propsy:** Brak

### 4.2 `DashboardPage` (`src/components/dashboard/DashboardPage.tsx`)

- **Opis:** Główny komponent React dla widoku Dashboard. Renderuje siatkę 2x2 z kafelkami nawigacyjnymi. Odpowiada za kompozycję layoutu i zarządzanie danymi kafelków.
- **Główne elementy:**
  - Element `main` jako kontener strony z centrowanym layoutem
  - Nagłówek z tytułem strony (opcjonalnie)
  - Siatka CSS Grid 2x2 z responsywnością (1 kolumna na mobile)
  - 4 komponenty `DashboardTile`
- **Obsługiwane interakcje:** Brak bezpośrednich - delegowane do dzieci
- **Obsługiwana walidacja:** Brak
- **Typy:** `DashboardTileData[]`
- **Propsy:** Brak

### 4.3 `DashboardTile` (`src/components/dashboard/DashboardTile.tsx`)

- **Opis:** Komponent kafelka nawigacyjnego. Wykorzystuje komponenty Card z shadcn/ui. Prezentuje ikonę, tytuł i opcjonalny opis. Cały kafelek jest klikalny i prowadzi do określonej ścieżki.
- **Główne elementy:**
  - Element `a` (link) opakowujący cały kafelek dla nawigacji
  - `Card` z shadcn/ui jako główny kontener
  - `CardHeader` z ikoną i tytułem
  - `CardTitle` z nazwą modułu
  - `CardDescription` z opcjonalnym opisem
  - Ikona SVG reprezentująca moduł
- **Obsługiwane interakcje:**
  - `onClick` / nawigacja - kliknięcie kafelka przekierowuje na docelową ścieżkę
  - `onKeyDown` - obsługa Enter/Space dla dostępności (natywne w `<a>`)
  - `hover` / `focus` - wizualne wyróżnienie kafelka
- **Obsługiwana walidacja:** Brak
- **Typy:** `DashboardTileProps`
- **Propsy:**
  - `title: string` - tytuł kafelka
  - `description?: string` - opcjonalny opis
  - `href: string` - ścieżka docelowa
  - `icon: React.ReactNode` - ikona do wyświetlenia

## 5. Typy

### 5.1 `DashboardTileData`

Typ definiujący dane pojedynczego kafelka nawigacyjnego:

```typescript
interface DashboardTileData {
  /** Unikalny identyfikator kafelka */
  id: string;
  /** Tytuł wyświetlany na kafelku */
  title: string;
  /** Opcjonalny opis pod tytułem */
  description?: string;
  /** Ścieżka docelowa nawigacji */
  href: string;
  /** Nazwa ikony lub komponent ikony */
  icon: React.ReactNode;
}
```

### 5.2 `DashboardTileProps`

Propsy komponentu `DashboardTile`:

```typescript
interface DashboardTileProps {
  /** Tytuł kafelka */
  title: string;
  /** Opcjonalny opis */
  description?: string;
  /** Ścieżka docelowa */
  href: string;
  /** Ikona do wyświetlenia */
  icon: React.ReactNode;
  /** Opcjonalne dodatkowe klasy CSS */
  className?: string;
}
```

### 5.3 Stałe konfiguracyjne

```typescript
const DASHBOARD_TILES: DashboardTileData[] = [
  {
    id: "transactions",
    title: "Transakcje",
    description: "Zarządzaj wydatkami i przychodami",
    href: "/app/transactions",
    icon: <WalletIcon />,
  },
  {
    id: "categories",
    title: "Kategorie",
    description: "Organizuj swoje transakcje",
    href: "/app/categories",
    icon: <TagIcon />,
  },
  {
    id: "summary",
    title: "Podsumowanie",
    description: "Analizuj swoje finanse",
    href: "/app/summary",
    icon: <ChartIcon />,
  },
  {
    id: "settings",
    title: "Ustawienia",
    description: "Konfiguruj swoje konto",
    href: "/app/settings",
    icon: <SettingsIcon />,
  },
];
```

## 6. Zarządzanie stanem

Widok Dashboard nie wymaga złożonego zarządzania stanem:

- **Brak stanu lokalnego:** Kafelki są statyczne i nie zmieniają się w czasie działania aplikacji
- **Brak custom hooków:** Widok nie wymaga dedykowanych hooków
- **Brak kontekstu React:** Nie jest potrzebny globalny stan

Dane kafelków są zdefiniowane jako stała (`DASHBOARD_TILES`) w pliku komponentu `DashboardPage` lub w osobnym pliku konfiguracyjnym.

## 7. Integracja API

Widok Dashboard nie wymaga integracji z API:

- **Brak wywołań API:** Widok prezentuje tylko statyczne dane nawigacyjne
- **Sprawdzenie sesji:** Wykonywane server-side w pliku Astro przed renderowaniem

### Sprawdzenie autoryzacji (server-side)

```typescript
// W src/pages/app/index.astro
const {
  data: { session },
} = await Astro.locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}
```

## 8. Interakcje użytkownika

### 8.1 Nawigacja przez kliknięcie kafelka

| Interakcja                        | Element         | Rezultat                              |
| --------------------------------- | --------------- | ------------------------------------- |
| Kliknięcie kafelka "Transakcje"   | `DashboardTile` | Przekierowanie na `/app/transactions` |
| Kliknięcie kafelka "Kategorie"    | `DashboardTile` | Przekierowanie na `/app/categories`   |
| Kliknięcie kafelka "Podsumowanie" | `DashboardTile` | Przekierowanie na `/app/summary`      |
| Kliknięcie kafelka "Ustawienia"   | `DashboardTile` | Przekierowanie na `/app/settings`     |

### 8.2 Nawigacja klawiaturą

| Interakcja  | Element             | Rezultat                                |
| ----------- | ------------------- | --------------------------------------- |
| Tab         | Cały widok          | Przemieszczanie fokusa między kafelkami |
| Enter/Space | Sfokusowany kafelek | Nawigacja do docelowej ścieżki          |

### 8.3 Stany wizualne

| Stan     | Opis wizualny                            |
| -------- | ---------------------------------------- |
| Domyślny | Kafelek z cieniem, jasne tło             |
| Hover    | Delikatne powiększenie lub zmiana cienia |
| Focus    | Widoczny outline dla dostępności         |
| Active   | Lekkie wciśnięcie (transform)            |

## 9. Warunki i walidacja

### 9.1 Walidacja autoryzacji

| Warunek                | Miejsce sprawdzenia         | Efekt                                          |
| ---------------------- | --------------------------- | ---------------------------------------------- |
| Brak sesji użytkownika | `src/pages/app/index.astro` | Przekierowanie na `/login`                     |
| Sesja wygasła          | `src/pages/app/index.astro` | Przekierowanie na `/login?sessionExpired=true` |

### 9.2 Walidacja danych kafelków

Walidacja odbywa się na poziomie typów TypeScript:

- Każdy kafelek musi mieć zdefiniowane wymagane pola (`title`, `href`, `icon`)
- Ścieżki `href` muszą być poprawnymi ścieżkami względnymi

## 10. Obsługa błędów

### 10.1 Błędy autoryzacji

| Scenariusz                             | Obsługa                                       |
| -------------------------------------- | --------------------------------------------- |
| Brak sesji                             | Przekierowanie na `/login`                    |
| Błąd sprawdzenia sesji                 | Przekierowanie na `/login` z parametrem błędu |
| Wygaśnięcie sesji podczas przeglądania | Obsługa przez middleware Astro                |

### 10.2 Błędy nawigacji

| Scenariusz                     | Obsługa                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Nieistniejąca ścieżka docelowa | Strona 404 (obsługiwana przez router Astro)              |
| Błąd JavaScript                | Graceful degradation - linki działają jako natywne `<a>` |

### 10.3 Stany brzegowe

- **Brak JavaScript:** Kafelki jako natywne linki `<a>` działają bez JavaScript
- **Wolne połączenie:** Widok jest statyczny, ładuje się szybko

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów

Utworzenie wymaganych katalogów:

- `src/pages/app/`
- `src/components/dashboard/`

### Krok 2: Implementacja komponentu `DashboardTile`

1. Utworzenie pliku `src/components/dashboard/DashboardTile.tsx`
2. Zdefiniowanie interfejsu `DashboardTileProps`
3. Implementacja komponentu z użyciem `Card` z shadcn/ui
4. Dodanie stylów hover/focus z Tailwind
5. Zapewnienie dostępności (semantyczny HTML, ARIA)

### Krok 3: Implementacja komponentu `DashboardPage`

1. Utworzenie pliku `src/components/dashboard/DashboardPage.tsx`
2. Zdefiniowanie stałej `DASHBOARD_TILES` z konfiguracją kafelków
3. Utworzenie ikony dla każdego modułu (lub użycie biblioteki ikon)
4. Implementacja layoutu siatki 2x2 z responsywnością
5. Renderowanie komponentów `DashboardTile`

### Krok 4: Utworzenie strony Astro

1. Utworzenie pliku `src/pages/app/index.astro`
2. Import i użycie `Layout`
3. Implementacja sprawdzenia sesji użytkownika
4. Dodanie przekierowania dla niezalogowanych użytkowników
5. Renderowanie `DashboardPage` z `client:load`

### Krok 5: Dodanie ikon

1. Wybór biblioteki ikon (Lucide React jest zalecana dla shadcn/ui)
2. Instalacja pakietu jeśli nie jest dostępny: `npm install lucide-react`
3. Import i użycie odpowiednich ikon dla każdego kafelka

### Krok 6: Stylowanie i responsywność

1. Implementacja stylów siatki CSS Grid
2. Dodanie breakpointów dla mobile (1 kolumna) i desktop (2 kolumny)
3. Stylowanie stanów interaktywnych kafelków
4. Weryfikacja kontrastu i dostępności

### Krok 7: Testowanie

1. Sprawdzenie nawigacji do wszystkich modułów
2. Testowanie responsywności na różnych rozdzielczościach
3. Weryfikacja dostępności (nawigacja klawiaturą, screen reader)
4. Testowanie przekierowania dla niezalogowanych użytkowników
5. Sprawdzenie działania bez JavaScript (progressive enhancement)
