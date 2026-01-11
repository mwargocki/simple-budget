# Plan implementacji widoku Podsumowanie miesięczne

## 1. Przegląd

Widok Podsumowanie miesięczne (`/app/summary`) umożliwia użytkownikowi szybką analizę finansów w skali wybranego miesiąca kalendarzowego. Wyświetla trzy kluczowe wartości (całkowite przychody, całkowite wydatki, saldo) oraz listę kategorii z rozbiciem na przychody, wydatki i saldo per kategoria. Kliknięcie kategorii przenosi użytkownika do widoku transakcji z ustawionymi filtrami na wybrany miesiąc i kategorię.

## 2. Routing widoku

- **Ścieżka:** `/app/summary`
- **Parametry URL:** `?month=YYYY-MM` (opcjonalny, domyślnie bieżący miesiąc UTC)
- **Plik Astro:** `src/pages/app/summary.astro`

## 3. Struktura komponentów

```
summary.astro
└── SummaryView (React, client:load)
    ├── MonthPicker (reużywalny z transactions)
    ├── SummaryTotals
    │   ├── SummaryCard (x3: przychody, wydatki, saldo)
    └── SummaryCategoriesList
        ├── LoadingState
        ├── ErrorState
        ├── EmptyState
        └── SummaryCategoryRow (x N)
```

## 4. Szczegóły komponentów

### 4.1 SummaryView

- **Opis:** Główny komponent widoku podsumowania. Zarządza stanem, pobiera dane z API i koordynuje komponenty potomne.
- **Główne elementy:**
  - `<main>` z kontenerem
  - `MonthPicker` do wyboru miesiąca
  - `SummaryTotals` do wyświetlania sum całkowitych
  - `SummaryCategoriesList` do wyświetlania listy kategorii
- **Obsługiwane interakcje:**
  - Zmiana miesiąca poprzez `MonthPicker`
  - Nawigacja do transakcji po kliknięciu kategorii
- **Obsługiwana walidacja:** Brak walidacji formularzy (widok tylko do odczytu)
- **Typy:** `SummaryViewProps`, `UseSummaryPageResult`
- **Propsy:**
  - `accessToken: string` - token autoryzacyjny

### 4.2 MonthPicker

- **Opis:** Komponent do wyboru miesiąca. Reużywalny z widoku transakcji (`src/components/transactions/MonthPicker.tsx`).
- **Główne elementy:**
  - Przycisk poprzedni miesiąc
  - Select z listą 13 miesięcy
  - Przycisk następny miesiąc
- **Obsługiwane interakcje:**
  - Klik na strzałki nawigacji
  - Wybór miesiąca z dropdown
- **Obsługiwana walidacja:** Brak możliwości wyboru przyszłych miesięcy
- **Typy:** `MonthPickerProps`
- **Propsy:**
  - `value: string` - wybrany miesiąc w formacie YYYY-MM
  - `onChange: (month: string) => void`
  - `disabled?: boolean`

### 4.3 SummaryTotals

- **Opis:** Wyświetla trzy karty z sumarycznymi wartościami: przychody, wydatki, saldo.
- **Główne elementy:**
  - Trzy komponenty `SummaryCard`
- **Obsługiwane interakcje:** Brak (tylko wyświetlanie)
- **Obsługiwana walidacja:** Brak
- **Typy:** `SummaryTotalsProps`
- **Propsy:**
  - `totalIncome: string`
  - `totalExpenses: string`
  - `balance: string`
  - `isLoading: boolean`

### 4.4 SummaryCard

- **Opis:** Pojedyncza karta wyświetlająca etykietę i wartość kwoty.
- **Główne elementy:**
  - `<Card>` z Shadcn/ui
  - Etykieta (np. "Przychody")
  - Wartość sformatowana jako kwota
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** `SummaryCardProps`
- **Propsy:**
  - `label: string`
  - `value: string`
  - `variant: 'income' | 'expense' | 'balance'`
  - `isLoading: boolean`

### 4.5 SummaryCategoriesList

- **Opis:** Lista kategorii z ich wartościami finansowymi. Obsługuje stany loading/error/empty/data.
- **Główne elementy:**
  - `LoadingState` gdy `isLoading`
  - `ErrorState` gdy `error`
  - `EmptyState` gdy brak kategorii
  - Lista `SummaryCategoryRow` gdy są dane
- **Obsługiwane interakcje:**
  - Retry przy błędzie
  - Kliknięcie kategorii
- **Obsługiwana walidacja:** Brak
- **Typy:** `SummaryCategoriesListProps`
- **Propsy:**
  - `categories: CategorySummaryDTO[]`
  - `month: string`
  - `isLoading: boolean`
  - `error: string | null`
  - `onRetry: () => void`

### 4.6 SummaryCategoryRow

- **Opis:** Pojedynczy wiersz kategorii z danymi finansowymi. Klikalny - przenosi do transakcji.
- **Główne elementy:**
  - Nazwa kategorii
  - Przychody kategorii
  - Wydatki kategorii
  - Saldo kategorii
  - Liczba transakcji
- **Obsługiwane interakcje:**
  - Kliknięcie → nawigacja do `/app/transactions?month=YYYY-MM&category_id=UUID`
- **Obsługiwana walidacja:** Brak
- **Typy:** `SummaryCategoryRowProps`
- **Propsy:**
  - `category: CategorySummaryDTO`
  - `month: string`

### 4.7 LoadingState (summary)

- **Opis:** Stan ładowania dla widoku podsumowania. Podobny do istniejącego w transactions.
- **Główne elementy:**
  - Spinner
  - Tekst "Ładowanie podsumowania..."
- **Obsługiwane interakcje:** Brak
- **Typy:** Brak (bezpropowy)

### 4.8 ErrorState (summary)

- **Opis:** Stan błędu z możliwością ponowienia. Reużywalny wzorzec z transactions.
- **Główne elementy:**
  - Alert z komunikatem błędu
  - Przycisk "Spróbuj ponownie"
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku retry
- **Typy:** `ErrorStateProps`
- **Propsy:**
  - `message: string`
  - `onRetry: () => void`

### 4.9 EmptyState (summary)

- **Opis:** Stan pustego podsumowania (brak transakcji w miesiącu).
- **Główne elementy:**
  - Ikona
  - Komunikat "Brak transakcji w [miesiąc]"
  - Opcjonalny przycisk CTA do dodania transakcji
- **Obsługiwane interakcje:**
  - Kliknięcie CTA (opcjonalne)
- **Typy:** `SummaryEmptyStateProps`
- **Propsy:**
  - `month: string`

## 5. Typy

### 5.1 Typy z API (istniejące w `src/types.ts`)

```typescript
/** Query parameters for monthly summary */
interface SummaryQueryParams {
  month?: string;
}

/** Summary data for a single category */
interface CategorySummaryDTO {
  category_id: string;
  category_name: string;
  income: string;
  expenses: string;
  balance: string;
  transaction_count: number;
}

/** Monthly financial summary response */
interface MonthlySummaryDTO {
  month: string;
  total_income: string;
  total_expenses: string;
  balance: string;
  categories: CategorySummaryDTO[];
}
```

### 5.2 Nowe typy komponentów (do utworzenia w `src/components/summary/types.ts`)

```typescript
/** Props dla SummaryView */
interface SummaryViewProps {
  accessToken: string;
}

/** Wynik hooka useSummaryPage */
interface UseSummaryPageResult {
  // Dane
  summary: MonthlySummaryDTO | null;

  // Stany
  isLoading: boolean;
  error: string | null;

  // Filtr
  month: string;

  // Akcje
  setMonth: (month: string) => void;
  fetchSummary: () => Promise<void>;
}

/** Props dla SummaryTotals */
interface SummaryTotalsProps {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  isLoading: boolean;
}

/** Props dla SummaryCard */
interface SummaryCardProps {
  label: string;
  value: string;
  variant: "income" | "expense" | "balance";
  isLoading: boolean;
}

/** Props dla SummaryCategoriesList */
interface SummaryCategoriesListProps {
  categories: CategorySummaryDTO[];
  month: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Props dla SummaryCategoryRow */
interface SummaryCategoryRowProps {
  category: CategorySummaryDTO;
  month: string;
}

/** Props dla EmptyState (summary) */
interface SummaryEmptyStateProps {
  month: string;
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useSummaryPage`

Hook `useSummaryPage` zarządza całym stanem widoku podsumowania:

**Stan:**

- `summary: MonthlySummaryDTO | null` - dane podsumowania
- `isLoading: boolean` - stan ładowania
- `error: string | null` - komunikat błędu
- `month: string` - wybrany miesiąc (inicjalizowany z URL lub bieżący UTC)

**Logika:**

1. Inicjalizacja miesiąca z parametru URL `?month=YYYY-MM` lub bieżący miesiąc UTC
2. Przy zmianie miesiąca:
   - Aktualizacja URL przez `history.replaceState`
   - Fetch danych z API
3. Obsługa błędu 401 - przekierowanie do `/login?sessionExpired=true`
4. Retry - ponowne pobranie danych

**Zależności:**

- `accessToken` z propsów

## 7. Integracja API

### 7.1 Endpoint

**GET `/api/summary`**

**Request:**

- Header: `Authorization: Bearer <access_token>`
- Query: `?month=YYYY-MM` (opcjonalny)

**Response (200):**

```typescript
MonthlySummaryDTO;
```

**Błędy:**

- `400` - nieprawidłowy format miesiąca
- `401` - brak sesji

### 7.2 Implementacja fetch

```typescript
const fetchSummary = async (month: string): Promise<MonthlySummaryDTO> => {
  const params = new URLSearchParams();
  params.set("month", month);

  const response = await fetch(`/api/summary?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/login?sessionExpired=true";
      throw new Error("Sesja wygasła");
    }
    if (response.status === 400) {
      throw new Error("Nieprawidłowy format miesiąca");
    }
    throw new Error("Nie udało się załadować podsumowania");
  }

  return response.json();
};
```

## 8. Interakcje użytkownika

| Interakcja                    | Komponent          | Akcja                                                           |
| ----------------------------- | ------------------ | --------------------------------------------------------------- |
| Zmiana miesiąca (strzałki)    | MonthPicker        | `setMonth()` → fetch danych → aktualizacja URL                  |
| Zmiana miesiąca (dropdown)    | MonthPicker        | `setMonth()` → fetch danych → aktualizacja URL                  |
| Kliknięcie kategorii          | SummaryCategoryRow | Nawigacja do `/app/transactions?month=YYYY-MM&category_id=UUID` |
| Kliknięcie "Spróbuj ponownie" | ErrorState         | `fetchSummary()`                                                |

## 9. Warunki i walidacja

### 9.1 Walidacja parametru miesiąca

- **Warunek:** Format `YYYY-MM` (regex: `/^\d{4}-(0[1-9]|1[0-2])$/`)
- **Komponent:** `useSummaryPage` (przy inicjalizacji z URL)
- **Zachowanie:** Jeśli nieprawidłowy format, użyj bieżącego miesiąca UTC

### 9.2 Blokada przyszłych miesięcy

- **Warunek:** Wybrany miesiąc <= bieżący miesiąc UTC
- **Komponent:** `MonthPicker`
- **Zachowanie:** Przycisk "następny miesiąc" wyłączony gdy wybrany miesiąc >= bieżący

## 10. Obsługa błędów

| Scenariusz                          | Obsługa                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Błąd 401 (brak sesji)               | Przekierowanie do `/login?sessionExpired=true`                                      |
| Błąd 400 (nieprawidłowy miesiąc)    | Wyświetlenie ErrorState z komunikatem + możliwość retry                             |
| Błąd sieci                          | Wyświetlenie ErrorState z komunikatem + możliwość retry                             |
| Błąd 500                            | Wyświetlenie ErrorState z ogólnym komunikatem                                       |
| Brak danych (pusta lista kategorii) | Wyświetlenie EmptyState z komunikatem "Brak transakcji w [miesiąc]" + wartości 0,00 |

## 11. Kroki implementacji

1. **Utworzenie struktury plików:**
   - `src/pages/app/summary.astro`
   - `src/components/summary/types.ts`
   - `src/components/summary/SummaryView.tsx`
   - `src/components/summary/SummaryTotals.tsx`
   - `src/components/summary/SummaryCard.tsx`
   - `src/components/summary/SummaryCategoriesList.tsx`
   - `src/components/summary/SummaryCategoryRow.tsx`
   - `src/components/summary/LoadingState.tsx`
   - `src/components/summary/ErrorState.tsx`
   - `src/components/summary/EmptyState.tsx`
   - `src/components/hooks/useSummaryPage.ts`

2. **Implementacja typów** (`types.ts`):
   - Zdefiniowanie wszystkich interfejsów propsów
   - Eksport typów

3. **Implementacja hooka `useSummaryPage`:**
   - Stan miesiąca z inicjalizacją z URL
   - Logika fetch z obsługą błędów
   - Aktualizacja URL przy zmianie miesiąca
   - Obsługa 401

4. **Implementacja komponentów stanowych:**
   - `LoadingState` - spinner + tekst
   - `ErrorState` - alert + przycisk retry
   - `EmptyState` - komunikat o braku danych

5. **Implementacja `SummaryCard`:**
   - Stylowanie zależne od wariantu (income=zielony, expense=czerwony, balance=neutralny/zielony/czerwony)
   - Skeleton loader gdy `isLoading`

6. **Implementacja `SummaryTotals`:**
   - Trzy karty w układzie grid
   - Przekazanie propsów do `SummaryCard`

7. **Implementacja `SummaryCategoryRow`:**
   - Klikalny wiersz z danymi kategorii
   - Nawigacja przez `window.location.href`
   - Formatowanie kwot

8. **Implementacja `SummaryCategoriesList`:**
   - Renderowanie warunkowe stanów
   - Sortowanie kategorii malejąco po `balance` (robione przez API)
   - Lista wierszy kategorii

9. **Implementacja `SummaryView`:**
   - Użycie `useSummaryPage`
   - Kompozycja komponentów potomnych
   - Reużycie `MonthPicker` z transactions

10. **Implementacja strony Astro:**
    - Import `AppLayout`
    - Pobranie `accessToken` z sesji
    - Renderowanie `SummaryView` z `client:load`

11. **Testy manualne:**
    - Zmiana miesiąca
    - Nawigacja do transakcji
    - Stany loading/error/empty
    - Obsługa wygaśnięcia sesji

12. **Przegląd kodu i refaktoryzacja:**
    - Sprawdzenie zgodności z wzorcami z transactions
    - Dostępność (ARIA)
    - Responsywność (desktop-only, ale sensowne breakpointy)
