# Plan implementacji poprawek widoków - Globalny nagłówek i wylogowanie

## 1. Przegląd

Niniejszy dokument opisuje plan implementacji brakujących komponentów strukturalnych aplikacji SimpleBudget, w szczególności:

1. **Globalny nagłówek aplikacji** (`AppHeader`) - stały element nawigacyjny dla wszystkich widoków `/app/*`
2. **Wylogowanie natychmiastowe** - przycisk wylogowania bez modala z natychmiastowym czyszczeniem stanu UI
3. **Wspólne layouty** (`AppLayout`, `AuthLayout`) - unifikacja struktury stron
4. **Ochrona tras** (`RouteGuard`) - obsługa błędów 401 z przekierowaniem i komunikatem "Sesja wygasła"

Zmiany bazują na nowych wymaganiach dotyczących nawigacji i struktury aplikacji.

---

## 2. Analiza nowych wymagań

### 2.1 Nagłówek globalny

Wymagana struktura nagłówka dla widoków `/app/*`:

| Pozycja       | Element                | Opis                                                |
| ------------- | ---------------------- | --------------------------------------------------- |
| Lewa strona   | E-mail użytkownika     | Wyświetlenie adresu e-mail zalogowanego użytkownika |
| Środek        | Tytuł bieżącego widoku | Dynamiczny tytuł zależny od aktywnej strony         |
| Stały element | Ikona/link Start       | Ikona Home z tooltipem "Start" → `/app`             |
| Prawa strona  | Przycisk Wyloguj       | Natychmiastowe wylogowanie bez modala               |

### 2.2 Wylogowanie (US-003)

Kryteria akceptacji:

- Dostępna jest akcja „Wyloguj"
- Po wylogowaniu użytkownik nie ma dostępu do ekranów wymagających autoryzacji
- Próba wejścia na chronione adresy URL po wylogowaniu wymaga ponownego zalogowania
- **Wylogowanie natychmiastowe** - bez modala potwierdzającego
- **Czyszczenie stanu UI** - usunięcie danych sesji z localStorage/pamięci

### 2.3 Layouty i RouteGuard

- **AppLayout**: wspólny layout dla `/app/*` zawierający nagłówek, miejsce na treść, globalne toasty
- **AuthLayout**: prosty layout dla `/login` i `/register`
- **RouteGuard**: ochrona tras `/app/*`; obsługa 401 → `/login` + „Sesja wygasła"

---

## 3. Struktura komponentów

### 3.1 Drzewo komponentów

```
src/
├── layouts/
│   ├── Layout.astro (bazowy, bez zmian)
│   ├── AppLayout.astro (NOWY - layout dla /app/*)
│   └── AuthLayout.astro (NOWY - layout dla /login, /register)
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx (NOWY - globalny nagłówek)
│   │   ├── LogoutButton.tsx (NOWY - przycisk wylogowania)
│   │   └── StartLink.tsx (NOWY - link do /app)
│   ├── hooks/
│   │   └── useLogout.ts (NOWY - hook wylogowania)
│   └── ...
└── pages/
    ├── login.astro (aktualizacja - użycie AuthLayout)
    ├── register.astro (aktualizacja - użycie AuthLayout)
    └── app/
        ├── index.astro (aktualizacja - użycie AppLayout)
        └── settings.astro (aktualizacja - użycie AppLayout)
```

### 3.2 Hierarchia komponentów dla widoku `/app/*`

```
AppLayout.astro
└── Layout.astro (bazowy)
    ├── AppHeader (React, client:load)
    │   ├── span (e-mail użytkownika)
    │   ├── h1 (tytuł widoku)
    │   ├── StartLink (link do /app)
    │   └── LogoutButton
    ├── main (slot dla treści strony)
    └── Toaster (globalne toasty)
```

---

## 4. Szczegóły komponentów

### 4.1 AppLayout.astro

**Lokalizacja:** `src/layouts/AppLayout.astro`

**Opis:** Layout dla wszystkich stron w katalogu `/app/*`. Zawiera globalny nagłówek, miejsce na treść i globalne toasty. Sprawdza sesję użytkownika i przekazuje dane do nagłówka.

**Główne elementy:**

- Import i osadzenie `Layout.astro` (bazowy)
- Sprawdzenie sesji użytkownika (server-side)
- Przekierowanie na `/login?sessionExpired=true` jeśli brak sesji
- Osadzenie `AppHeader` z `client:load`
- `<slot />` dla treści strony
- Osadzenie `Toaster` z `client:load`

**Propsy:**

```typescript
interface AppLayoutProps {
  title: string; // Tytuł strony w <title>
  pageTitle: string; // Tytuł wyświetlany w nagłówku
}
```

**Dane przekazywane do AppHeader:**

```typescript
{
  userEmail: string; // Z sesji: session.user.email
  pageTitle: string; // Prop pageTitle
  accessToken: string; // Z sesji: session.access_token
}
```

### 4.2 AuthLayout.astro

**Lokalizacja:** `src/layouts/AuthLayout.astro`

**Opis:** Prosty layout dla stron logowania i rejestracji. Centralnie wyśrodkowany kontener z kartą formularza.

**Główne elementy:**

- Import i osadzenie `Layout.astro` (bazowy)
- Centrowany kontener flexbox
- `<slot />` dla treści (formularz)

**Propsy:**

```typescript
interface AuthLayoutProps {
  title: string; // Tytuł strony w <title>
}
```

### 4.3 AppHeader

**Lokalizacja:** `src/components/layout/AppHeader.tsx`

**Opis:** Globalny nagłówek aplikacji wyświetlany na wszystkich stronach `/app/*`. Zawiera e-mail użytkownika, tytuł strony, link do startu i przycisk wylogowania.

**Główne elementy:**

- `<header>` z klasami stylów (sticky top-0, shadow, tło)
- `<div>` kontener z layoutem flexbox
- `<span>` z e-mailem użytkownika (lewa strona)
- `<h1>` z tytułem strony (środek)
- `<StartLink>` z tooltipem "Start" (przy prawej stronie)
- `<LogoutButton>` (prawa strona)

**Propsy:**

```typescript
interface AppHeaderProps {
  userEmail: string;
  pageTitle: string;
  accessToken: string;
}
```

**Obsługiwane interakcje:**

- Kliknięcie `StartLink` → nawigacja do `/app`
- Kliknięcie `LogoutButton` → wylogowanie i przekierowanie do `/login`

### 4.4 LogoutButton

**Lokalizacja:** `src/components/layout/LogoutButton.tsx`

**Opis:** Przycisk wylogowania bez modala potwierdzającego. Natychmiast wywołuje API logout i przekierowuje na stronę logowania.

**Główne elementy:**

- `<Button>` z shadcn/ui (wariant `ghost` lub `outline`)
- Ikona `LogOut` z lucide-react
- Tekst "Wyloguj"
- Spinner podczas ładowania

**Propsy:**

```typescript
interface LogoutButtonProps {
  accessToken: string;
  className?: string;
}
```

**Obsługiwane interakcje:**

- `onClick` → wywołanie `useLogout` hook
- Blokada podwójnego kliknięcia podczas `isLoggingOut`

**Stany wizualne:**
| Stan | Opis |
|------|------|
| Domyślny | Ikona + tekst "Wyloguj" |
| Loading | Spinner + tekst "Wylogowywanie..." (disabled) |
| Hover | Delikatne podświetlenie tła |

### 4.5 StartLink

**Lokalizacja:** `src/components/layout/StartLink.tsx`

**Opis:** Link/ikona do strony głównej aplikacji (`/app`) z tooltipem "Start".

**Główne elementy:**

- `<a>` jako link do `/app`
- Ikona `Home` z lucide-react
- Tooltip z tekstem "Start" (używając shadcn/ui Tooltip)

**Propsy:**

```typescript
interface StartLinkProps {
  className?: string;
}
```

**Obsługiwane interakcje:**

- `onClick` / nawigacja → przekierowanie na `/app`
- `hover` → wyświetlenie tooltipa "Start"
- Nawigacja klawiaturą (Enter/Space)

### 4.6 useLogout hook

**Lokalizacja:** `src/components/hooks/useLogout.ts`

**Opis:** Hook zarządzający procesem wylogowania użytkownika. Wywołuje API, czyści stan UI i przekierowuje na stronę logowania.

**API:**

```typescript
interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  error: string | null;
}

function useLogout(accessToken: string): UseLogoutReturn;
```

**Logika:**

1. Ustawienie `isLoggingOut = true`
2. Wywołanie `POST /api/auth/logout` z tokenem
3. Sukces → czyszczenie localStorage (jeśli używane) → `window.location.assign("/login")`
4. Błąd → ustawienie `error` i `isLoggingOut = false`
5. Błąd 401 → przekierowanie na `/login?sessionExpired=true`

---

## 5. Typy

### 5.1 Istniejące typy (bez zmian)

```typescript
// src/types.ts
interface LogoutResponseDTO {
  message: string;
}

interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailDTO[];
  };
}
```

### 5.2 Nowe typy ViewModel

```typescript
// src/components/layout/types.ts

/** Propsy dla globalnego nagłówka aplikacji */
interface AppHeaderProps {
  /** E-mail zalogowanego użytkownika */
  userEmail: string;
  /** Tytuł bieżącej strony */
  pageTitle: string;
  /** Token dostępu do API */
  accessToken: string;
}

/** Propsy dla przycisku wylogowania */
interface LogoutButtonProps {
  /** Token dostępu do API */
  accessToken: string;
  /** Opcjonalne klasy CSS */
  className?: string;
}

/** Propsy dla linku do strony startowej */
interface StartLinkProps {
  /** Opcjonalne klasy CSS */
  className?: string;
}

/** Zwracany obiekt z hooka useLogout */
interface UseLogoutReturn {
  /** Funkcja wykonująca wylogowanie */
  logout: () => Promise<void>;
  /** Flaga oznaczająca trwające wylogowanie */
  isLoggingOut: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;
}
```

---

## 6. Zarządzanie stanem

### 6.1 Hook useLogout

**Lokalizacja:** `src/components/hooks/useLogout.ts`

```typescript
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
```

### 6.2 Stan globalny

Aplikacja nie wymaga globalnego stanu React (Context/Redux) dla funkcjonalności wylogowania. Dane sesji są zarządzane przez Supabase i przekazywane jako propsy z poziomu Astro.

---

## 7. Integracja API

### 7.1 Endpoint wylogowania

**Endpoint:** `POST /api/auth/logout`

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Response (401 Unauthorized):**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
  }
}
```

### 7.2 Implementacja wywołania (w useLogout)

```typescript
const response = await fetch("/api/auth/logout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!response.ok) {
  if (response.status === 401) {
    // Sesja wygasła - przekieruj z komunikatem
    window.location.assign("/login?sessionExpired=true");
    return;
  }
  throw new Error("Logout failed");
}

// Sukces - przekieruj na login
window.location.assign("/login");
```

---

## 8. Interakcje użytkownika

### 8.1 Wylogowanie

| Akcja                          | Element                   | Rezultat                                                          |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------- |
| Kliknięcie "Wyloguj"           | `LogoutButton`            | Natychmiastowe wywołanie API, spinner, przekierowanie na `/login` |
| Kliknięcie podczas ładowania   | `LogoutButton` (disabled) | Brak akcji (przycisk zablokowany)                                 |
| Wylogowanie z wygasłą sesją    | `LogoutButton`            | Przekierowanie na `/login?sessionExpired=true`                    |
| Błąd sieci podczas wylogowania | `LogoutButton`            | Toast z komunikatem błędu                                         |

### 8.2 Nawigacja w nagłówku

| Akcja                           | Element     | Rezultat                                          |
| ------------------------------- | ----------- | ------------------------------------------------- |
| Kliknięcie ikony Home           | `StartLink` | Przekierowanie na `/app`                          |
| Hover na ikonie Home            | `StartLink` | Wyświetlenie tooltipa "Start"                     |
| Fokus klawiaturą na ikonie Home | `StartLink` | Widoczny outline, możliwość aktywacji Enter/Space |

### 8.3 Stany widoku nagłówka

| Strona              | Tytuł w nagłówku |
| ------------------- | ---------------- |
| `/app`              | "Start"          |
| `/app/transactions` | "Transakcje"     |
| `/app/categories`   | "Kategorie"      |
| `/app/summary`      | "Podsumowanie"   |
| `/app/settings`     | "Ustawienia"     |

---

## 9. Walidacja i warunki

### 9.1 Walidacja autoryzacji (AppLayout)

| Warunek             | Miejsce sprawdzenia             | Efekt                                          |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| Brak sesji          | `AppLayout.astro` (server-side) | Przekierowanie na `/login`                     |
| Sesja wygasła       | `AppLayout.astro` (server-side) | Przekierowanie na `/login?sessionExpired=true` |
| Token nieprawidłowy | Endpoint API                    | Zwrot 401, obsługa w hooku                     |

### 9.2 Walidacja w komponencie LogoutButton

| Warunek                 | Efekt                         |
| ----------------------- | ----------------------------- |
| `isLoggingOut === true` | Przycisk disabled, spinner    |
| `accessToken` pusty     | Przycisk disabled (edge case) |

---

## 10. Obsługa błędów

### 10.1 Błędy wylogowania

| Scenariusz   | Obsługa                                                              |
| ------------ | -------------------------------------------------------------------- |
| Sukces (200) | Przekierowanie na `/login`                                           |
| Błąd 401     | Przekierowanie na `/login?sessionExpired=true`                       |
| Błąd 500     | Toast z komunikatem "Wystąpił nieoczekiwany błąd"                    |
| Błąd sieci   | Toast z komunikatem "Wystąpił nieoczekiwany błąd. Spróbuj ponownie." |

### 10.2 Scenariusze brzegowe

| Scenariusz                    | Obsługa                                |
| ----------------------------- | -------------------------------------- |
| Podwójne kliknięcie przycisku | Blokowane przez `isLoggingOut`         |
| Wylogowanie podczas operacji  | Przerwa operacji, przekierowanie       |
| Brak tokenu                   | Przycisk disabled, logowanie w konsoli |

---

## 11. Aktualizacje istniejących plików

### 11.1 Strony Astro wymagające zmian

| Plik                           | Zmiana                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| `src/pages/app/index.astro`    | Zamiana `Layout` na `AppLayout`, dodanie `pageTitle="Start"`      |
| `src/pages/app/settings.astro` | Zamiana `Layout` na `AppLayout`, dodanie `pageTitle="Ustawienia"` |
| `src/pages/login.astro`        | Zamiana `Layout` na `AuthLayout`                                  |
| `src/pages/register.astro`     | Zamiana `Layout` na `AuthLayout`                                  |

### 11.2 Komponenty React wymagające zmian

| Plik                                         | Zmiana                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/components/dashboard/DashboardPage.tsx` | Usunięcie `<h1>` (przeniesione do nagłówka)                                      |
| `src/components/settings/SettingsPage.tsx`   | Usunięcie `<h1>` (przeniesione do nagłówka), usunięcie `<Toaster>` (w AppLayout) |

---

## 12. Kroki implementacji

### Krok 1: Utworzenie hooka useLogout

1. Utworzyć plik `src/components/hooks/useLogout.ts`
2. Zaimplementować stan `isLoggingOut` i `error`
3. Zaimplementować funkcję `logout` z wywołaniem API
4. Obsłużyć sukces (przekierowanie na `/login`)
5. Obsłużyć błędy (401 → `/login?sessionExpired=true`, inne → toast)

### Krok 2: Utworzenie komponentu StartLink

1. Utworzyć plik `src/components/layout/StartLink.tsx`
2. Zaimplementować link z ikoną Home
3. Dodać Tooltip z shadcn/ui z tekstem "Start"
4. Zapewnić dostępność (focus, keyboard navigation)

### Krok 3: Utworzenie komponentu LogoutButton

1. Utworzyć plik `src/components/layout/LogoutButton.tsx`
2. Użyć hooka `useLogout`
3. Zaimplementować Button z ikoną LogOut
4. Dodać spinner podczas ładowania
5. Obsłużyć stan disabled

### Krok 4: Utworzenie komponentu AppHeader

1. Utworzyć plik `src/components/layout/AppHeader.tsx`
2. Zaimplementować layout nagłówka (flexbox)
3. Dodać e-mail użytkownika (lewa strona)
4. Dodać tytuł strony (środek)
5. Dodać StartLink i LogoutButton (prawa strona)
6. Stylować z Tailwind (sticky, shadow, responsywność)

### Krok 5: Utworzenie AuthLayout.astro

1. Utworzyć plik `src/layouts/AuthLayout.astro`
2. Osadzić bazowy Layout
3. Dodać centrowany kontener flexbox
4. Dodać slot dla treści

### Krok 6: Utworzenie AppLayout.astro

1. Utworzyć plik `src/layouts/AppLayout.astro`
2. Osadzić bazowy Layout
3. Sprawdzić sesję użytkownika (getSession)
4. Przekierować jeśli brak sesji
5. Osadzić AppHeader z danymi sesji
6. Dodać slot dla treści
7. Osadzić Toaster

### Krok 7: Aktualizacja stron /app/\*

1. Zaktualizować `src/pages/app/index.astro`:
   - Zamienić Layout na AppLayout
   - Dodać prop `pageTitle="Start"`
   - Usunąć sprawdzanie sesji (przeniesione do layoutu)
2. Zaktualizować `src/pages/app/settings.astro`:
   - Zamienić Layout na AppLayout
   - Dodać prop `pageTitle="Ustawienia"`
   - Usunąć sprawdzanie sesji (przeniesione do layoutu)

### Krok 8: Aktualizacja komponentów React

1. Zaktualizować `src/components/dashboard/DashboardPage.tsx`:
   - Usunąć `<h1>` (jest teraz w AppHeader)
   - Dostosować marginesy
2. Zaktualizować `src/components/settings/SettingsPage.tsx`:
   - Usunąć `<h1>` (jest teraz w AppHeader)
   - Usunąć `<Toaster>` (jest teraz w AppLayout)
   - Dostosować marginesy

### Krok 9: Aktualizacja stron auth

1. Zaktualizować `src/pages/login.astro`:
   - Zamienić Layout na AuthLayout
2. Zaktualizować `src/pages/register.astro`:
   - Zamienić Layout na AuthLayout

### Krok 10: Instalacja/dodanie komponentów shadcn/ui

1. Sprawdzić czy Tooltip jest zainstalowany
2. Jeśli nie - dodać: `npx shadcn@latest add tooltip`

### Krok 11: Testowanie

1. Przetestować wylogowanie z każdej strony `/app/*`
2. Sprawdzić przekierowanie po wylogowaniu
3. Przetestować komunikat "Sesja wygasła"
4. Sprawdzić nawigację przez StartLink
5. Przetestować responsywność nagłówka
6. Sprawdzić dostępność (keyboard navigation, screen reader)
7. Przetestować double-click na przycisk wylogowania
8. Sprawdzić błąd sieci podczas wylogowania

---

## 13. Mapowanie User Stories do implementacji

### US-003: Wylogowanie z aplikacji

| Kryterium akceptacji                                                              | Implementacja                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Dostępna jest akcja „Wyloguj"                                                     | `LogoutButton` w `AppHeader` na każdej stronie `/app/*`            |
| Po wylogowaniu użytkownik nie ma dostępu do ekranów wymagających autoryzacji      | `AppLayout` sprawdza sesję server-side, przekierowanie na `/login` |
| Próba wejścia na chronione adresy URL po wylogowaniu wymaga ponownego zalogowania | `AppLayout` sprawdza sesję przy każdym request                     |

---

## 14. Dostępność (a11y)

### 14.1 AppHeader

- Semantyczny element `<header>` z `role="banner"`
- `<nav>` dla nawigacji z `aria-label="Nawigacja główna"`
- Fokus klawiaturą na wszystkich interaktywnych elementach
- Widoczny outline przy fokusie

### 14.2 LogoutButton

- `aria-label="Wyloguj się z aplikacji"`
- `aria-busy="true"` podczas ładowania
- `aria-disabled="true"` gdy disabled
- Czytelny tekst dla screen readerów

### 14.3 StartLink

- `aria-label="Przejdź do strony startowej"`
- Tooltip widoczny również dla screen readerów (aria-describedby)
- Fokus klawiaturą z widocznym outline

---

## 15. Stylowanie

### 15.1 AppHeader

```css
/* Tailwind classes */
header {
  @apply sticky top-0 z-50;
  @apply bg-background border-b shadow-sm;
  @apply px-4 py-3;
}

.header-container {
  @apply container mx-auto max-w-6xl;
  @apply flex items-center justify-between;
}

.header-left {
  @apply flex items-center gap-2;
  @apply text-sm text-muted-foreground;
}

.header-center {
  @apply flex-1 text-center;
  @apply text-lg font-semibold;
}

.header-right {
  @apply flex items-center gap-2;
}
```

### 15.2 Responsywność

| Breakpoint              | Zmiana                                                   |
| ----------------------- | -------------------------------------------------------- |
| Mobile (< 640px)        | E-mail użytkownika ukryty lub skrócony, ikony bez tekstu |
| Tablet (640px - 1024px) | Pełny layout                                             |
| Desktop (> 1024px)      | Pełny layout                                             |

---

## 16. Zależności

### 16.1 Nowe zależności

Brak nowych zależności npm. Wszystkie wymagane pakiety są już zainstalowane:

- `lucide-react` - ikony (Home, LogOut)
- `@radix-ui/react-tooltip` (przez shadcn/ui)
- `sonner` - toasty

### 16.2 Komponenty shadcn/ui do sprawdzenia/dodania

- `Tooltip` - może wymagać instalacji
- `Button` - już zainstalowany
- `Toaster` (sonner) - już zainstalowany
