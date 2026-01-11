# Plan implementacji widoku Transakcje

## 1. Przegląd

Widok Transakcji to główny ekran do przeglądania, filtrowania i zarządzania transakcjami użytkownika. Umożliwia:

- Wyświetlanie listy transakcji posortowanych malejąco wg daty
- Filtrowanie transakcji po miesiącu (obowiązkowy parametr URL) i kategorii (opcjonalny)
- Dodawanie nowych transakcji przez modal/dialog
- Edycję i usuwanie istniejących transakcji
- Paginację typu "Load more" dla długich list

Widok jest częścią strefy zalogowanej `/app/*` i wykorzystuje wspólny layout z nagłówkiem oraz systemem toastów.

## 2. Routing widoku

**Ścieżka:** `/app/transactions`

**Parametry URL:**

- `month` (wymagany) - format `YYYY-MM`, np. `2026-01`. Jeśli brak, należy ustawić bieżący miesiąc UTC.
- `category_id` (opcjonalny) - UUID kategorii do filtrowania. Pominięcie oznacza "Wszystkie".

**Przykłady:**

- `/app/transactions?month=2026-01` - wszystkie transakcje ze stycznia 2026
- `/app/transactions?month=2026-01&category_id=abc-123` - transakcje z danej kategorii

## 3. Struktura komponentów

```
TransactionsPage (Astro)
└── TransactionsView (React, client:load)
    ├── TransactionsFilters
    │   ├── MonthPicker
    │   └── CategorySelect
    ├── TransactionsList
    │   ├── LoadingState
    │   ├── ErrorState
    │   ├── EmptyState
    │   └── TransactionListRow[] (dla każdej transakcji)
    │       └── TransactionRowActions (Edytuj, Usuń)
    ├── LoadMoreButton
    ├── TransactionFormDialog
    │   └── TransactionForm
    └── DeleteTransactionDialog
```

## 4. Szczegóły komponentów

### 4.1 TransactionsPage (Astro)

- **Opis:** Strona Astro obsługująca routing i przekazująca dane sesji do komponentu React.
- **Główne elementy:** Layout `AppLayout`, komponent `TransactionsView` z `client:load`
- **Lokalizacja:** `src/pages/app/transactions.astro`
- **Propsy przekazywane do React:** `accessToken: string`

### 4.2 TransactionsView

- **Opis:** Główny komponent React zarządzający całym widokiem transakcji. Koordynuje stan, filtry, pobieranie danych i interakcje użytkownika.
- **Główne elementy:**
  - `TransactionsFilters` - pasek filtrów
  - `TransactionsList` - lista transakcji z obsługą stanów
  - `LoadMoreButton` - przycisk do ładowania kolejnych
  - `TransactionFormDialog` - modal dodawania/edycji
  - `DeleteTransactionDialog` - modal potwierdzenia usunięcia
  - Przycisk "Dodaj transakcję" (CTA)
- **Obsługiwane interakcje:**
  - Zmiana miesiąca (aktualizacja URL + refetch)
  - Zmiana kategorii (aktualizacja URL + refetch)
  - Kliknięcie "Dodaj transakcję"
  - Kliknięcie "Załaduj więcej"
- **Typy:** `TransactionsViewProps`, `UseTransactionsPageResult`
- **Propsy:** `accessToken: string`

### 4.3 TransactionsFilters

- **Opis:** Pasek filtrów zawierający wybór miesiąca i kategorii. Pozycjonowany statycznie nad listą.
- **Główne elementy:**
  - `MonthPicker` - nawigacja miesięcy
  - `CategorySelect` - dropdown kategorii
- **Obsługiwane interakcje:**
  - Zmiana miesiąca → callback `onMonthChange`
  - Zmiana kategorii → callback `onCategoryChange`
- **Typy:** `TransactionsFiltersProps`
- **Propsy:**
  - `month: string` - aktualny miesiąc w formacie YYYY-MM
  - `categoryId: string | null` - aktualna kategoria lub null (Wszystkie)
  - `categories: CategoryDTO[]` - lista dostępnych kategorii
  - `onMonthChange: (month: string) => void`
  - `onCategoryChange: (categoryId: string | null) => void`
  - `isLoading: boolean` - blokada podczas ładowania

### 4.4 MonthPicker

- **Opis:** Komponent do nawigacji między miesiącami. Zawiera strzałki poprzedni/następny oraz dropdown z 13 miesiącami (bieżący UTC + 12 poprzednich).
- **Główne elementy:**
  - Przycisk "poprzedni miesiąc" (strzałka w lewo)
  - Label z aktualnym miesiącem (np. "Styczeń 2026")
  - Przycisk "następny miesiąc" (strzałka w prawo) - zablokowany jeśli bieżący miesiąc
  - Opcjonalny dropdown z listą miesięcy
- **Obsługiwane interakcje:**
  - Klik strzałki ← → przejście do poprzedniego/następnego miesiąca
  - Wybór z dropdownu → skok do wybranego miesiąca
- **Walidacja:**
  - Strzałka "następny" zablokowana gdy `month >= currentMonthUTC`
  - Dropdown pokazuje tylko 13 miesięcy (bieżący + 12 poprzednich)
- **Typy:** `MonthPickerProps`
- **Propsy:**
  - `value: string` - aktualny miesiąc YYYY-MM
  - `onChange: (month: string) => void`
  - `disabled?: boolean`

### 4.5 CategorySelect

- **Opis:** Dropdown do wyboru kategorii filtrowania. Zawiera opcję "Wszystkie" oraz listę kategorii użytkownika (w tym "Brak" jako systemowa).
- **Główne elementy:**
  - Select/dropdown z opcjami
  - Opcja "Wszystkie" na górze
  - Kategoria "Brak" oznaczona jako systemowa (np. kursywą)
- **Obsługiwane interakcje:**
  - Wybór kategorii → callback `onChange`
- **Typy:** `CategorySelectProps`
- **Propsy:**
  - `value: string | null` - aktualne category_id lub null dla "Wszystkie"
  - `categories: CategoryDTO[]`
  - `onChange: (categoryId: string | null) => void`
  - `disabled?: boolean`

### 4.6 TransactionsList

- **Opis:** Kontener listy transakcji z obsługą stanów: loading, error, empty, data.
- **Główne elementy:**
  - `LoadingState` - skeleton/spinner podczas ładowania
  - `ErrorState` - komunikat błędu + przycisk "Spróbuj ponownie"
  - `EmptyState` - komunikat gdy brak transakcji + CTA
  - Lista `TransactionListRow` - gdy są dane
- **Obsługiwane interakcje:**
  - Retry przy błędzie
  - CTA przy pustym stanie → otwiera dialog dodawania
- **Typy:** `TransactionsListProps`
- **Propsy:**
  - `transactions: TransactionDTO[]`
  - `isLoading: boolean`
  - `error: string | null`
  - `onRetry: () => void`
  - `onAddClick: () => void`
  - `onEdit: (transaction: TransactionDTO) => void`
  - `onDelete: (transaction: TransactionDTO) => void`
  - `emptyMessage: string` - kontekstowy komunikat pustego stanu

### 4.7 TransactionListRow

- **Opis:** Pojedynczy wiersz transakcji wyświetlający wszystkie dane oraz akcje.
- **Główne elementy:**
  - Data (dzień, format dd/MM/yyyy)
  - Opis transakcji
  - Kategoria (nazwa)
  - Kwota (formatowana z PLN)
  - Badge typu (Wydatek/Przychód z różnicowaniem kolorów)
  - Przyciski akcji: Edytuj, Usuń
- **Obsługiwane interakcje:**
  - Klik "Edytuj" → callback `onEdit`
  - Klik "Usuń" → callback `onDelete`
- **Typy:** `TransactionListRowProps`
- **Propsy:**
  - `transaction: TransactionDTO`
  - `onEdit: () => void`
  - `onDelete: () => void`

### 4.8 LoadMoreButton

- **Opis:** Przycisk do ładowania kolejnej strony transakcji. Pokazuje loader podczas ładowania.
- **Główne elementy:**
  - Przycisk "Załaduj więcej"
  - Spinner podczas ładowania
  - Opcjonalnie: komunikat błędu inline + "Ponów"
- **Obsługiwane interakcje:**
  - Klik → callback `onClick`
  - Retry przy błędzie
- **Walidacja:**
  - Widoczny tylko gdy `hasMore === true`
- **Typy:** `LoadMoreButtonProps`
- **Propsy:**
  - `onClick: () => void`
  - `isLoading: boolean`
  - `hasMore: boolean`
  - `error?: string | null`
  - `onRetry?: () => void`

### 4.9 TransactionFormDialog

- **Opis:** Modal/Dialog do tworzenia i edycji transakcji. Tryb określany przez prop `mode`.
- **Główne elementy:**
  - Nagłówek (tytuł zależny od trybu)
  - `TransactionForm` - formularz wewnętrzny
- **Obsługiwane interakcje:**
  - Zamknięcie modala
  - Submit formularza
- **Typy:** `TransactionFormDialogProps`, `TransactionFormMode`
- **Propsy:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `mode: "create" | "edit"`
  - `transaction?: TransactionDTO` - dane do edycji
  - `categories: CategoryDTO[]`
  - `onSubmit: (data: TransactionFormData) => Promise<void>`

### 4.10 TransactionForm

- **Opis:** Formularz transakcji z polami, walidacją inline i obsługą błędów API.
- **Główne elementy:**
  - Input: kwota (z normalizacją separatorów)
  - Select: typ (Wydatek/Przychód)
  - Select: kategoria
  - Input: opis
  - DatePicker: data (tylko dzień, bez godziny)
  - Przyciski: Zapisz, Anuluj
- **Obsługiwane interakcje:**
  - Zmiana wartości pól
  - Blur na kwocie (normalizacja)
  - Submit formularza
  - Anulowanie
- **Walidacja (inline):**
  - `amount`: 0.01 - 1,000,000.00, akceptuje "," i "."
  - `type`: wymagany, "expense" lub "income"
  - `category_id`: wymagany, UUID z listy
  - `description`: wymagany, 1-255 znaków, nie może być tylko whitespace
  - `occurred_at`: poprawna data
- **Typy:** `TransactionFormProps`, `TransactionFormData`, `TransactionFormErrors`
- **Propsy:**
  - `mode: "create" | "edit"`
  - `initialData?: TransactionFormData`
  - `categories: CategoryDTO[]`
  - `onSubmit: (data: TransactionFormData) => Promise<void>`
  - `onCancel: () => void`
  - `isSubmitting: boolean`

### 4.11 DeleteTransactionDialog

- **Opis:** Modal potwierdzenia usunięcia transakcji.
- **Główne elementy:**
  - Tytuł "Usuń transakcję"
  - Pytanie "Czy na pewno chcesz usunąć tę transakcję?"
  - Podgląd opisu transakcji
  - Przyciski: Anuluj, Usuń
- **Obsługiwane interakcje:**
  - Potwierdzenie usunięcia
  - Anulowanie
- **Typy:** `DeleteTransactionDialogProps`
- **Propsy:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `transaction: TransactionDTO | null`
  - `onConfirm: () => Promise<void>`
  - `isDeleting: boolean`

### 4.12 EmptyState (dla transakcji)

- **Opis:** Stan pusty z kontekstowym komunikatem zależnym od aktywnych filtrów.
- **Główne elementy:**
  - Ikona (np. Receipt)
  - Nagłówek kontekstowy
  - Opis
  - CTA "Dodaj transakcję"
- **Obsługiwane interakcje:**
  - Klik CTA → otwiera dialog dodawania
- **Typy:** `TransactionsEmptyStateProps`
- **Propsy:**
  - `message: string`
  - `onAddClick: () => void`

### 4.13 LoadingState (dla transakcji)

- **Opis:** Stan ładowania - skeleton lub spinner.
- **Główne elementy:**
  - Skeleton rows lub centralny spinner
- **Typy:** brak propsów

## 5. Typy

### 5.1 Typy z API (już istniejące w `src/types.ts`)

```typescript
// DTO z API
interface TransactionDTO {
  id: string;
  amount: string;
  type: "expense" | "income";
  category_id: string;
  category_name: string;
  description: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface TransactionsListDTO {
  transactions: TransactionDTO[];
  pagination: PaginationDTO;
}

interface CategoryDTO {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5.2 Nowe typy dla widoku

```typescript
// src/components/transactions/types.ts

/** Tryb formularza transakcji */
type TransactionFormMode = "create" | "edit";

/** Dane formularza transakcji */
interface TransactionFormData {
  amount: string; // Przechowywane jako string, normalizowane na blur
  type: "expense" | "income";
  category_id: string;
  description: string;
  occurred_at: string; // Format YYYY-MM-DD (tylko data)
}

/** Błędy walidacji formularza */
interface TransactionFormErrors {
  amount?: string;
  type?: string;
  category_id?: string;
  description?: string;
  occurred_at?: string;
  general?: string; // Błąd ogólny z API
}

/** Stan filtrów transakcji */
interface TransactionsFiltersState {
  month: string; // Format YYYY-MM
  categoryId: string | null; // null = Wszystkie
}

/** Stan dialogów */
interface TransactionDialogsState {
  form: {
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: TransactionDTO;
  };
  delete: {
    isOpen: boolean;
    transaction: TransactionDTO | null;
    isDeleting: boolean;
  };
}

/** Wynik hooka useTransactionsPage */
interface UseTransactionsPageResult {
  // Dane
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  pagination: PaginationDTO | null;

  // Stany
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;

  // Filtry
  filters: TransactionsFiltersState;

  // Dialogi
  formDialog: TransactionDialogsState["form"];
  deleteDialog: TransactionDialogsState["delete"];

  // Akcje filtrów
  setMonth: (month: string) => void;
  setCategoryId: (categoryId: string | null) => void;

  // Akcje danych
  fetchTransactions: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Akcje dialogów
  openCreateDialog: () => void;
  openEditDialog: (transaction: TransactionDTO) => void;
  openDeleteDialog: (transaction: TransactionDTO) => void;
  closeFormDialog: () => void;
  closeDeleteDialog: () => void;

  // Operacje CRUD
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: TransactionFormData) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useTransactionsPage`

Hook centralny zarządzający całym stanem widoku transakcji.

**Lokalizacja:** `src/components/hooks/useTransactionsPage.ts`

**Odpowiedzialności:**

1. **Zarządzanie URL** - synchronizacja filtrów z query params
2. **Pobieranie danych** - fetch transakcji i kategorii
3. **Paginacja** - obsługa "Load more" z zachowaniem offsetu w stanie
4. **Dialogi** - stan otwarcia/zamknięcia modali
5. **Operacje CRUD** - create, update, delete z obsługą błędów
6. **Obsługa 401** - redirect do `/login?sessionExpired=true`

**Stan wewnętrzny:**

```typescript
const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
const [categories, setCategories] = useState<CategoryDTO[]>([]);
const [pagination, setPagination] = useState<PaginationDTO | null>(null);
const [offset, setOffset] = useState(0); // Reset przy zmianie filtrów
const [isLoading, setIsLoading] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [error, setError] = useState<string | null>(null);
const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
```

**Synchronizacja z URL:**

- Przy montowaniu: odczyt `month` i `category_id` z URL
- Przy zmianie filtrów: aktualizacja URL przez `history.replaceState`
- Domyślny `month`: bieżący miesiąc UTC jeśli brak w URL

### 6.2 Custom Hook: `useTransactionForm`

Hook do zarządzania logiką formularza transakcji.

**Lokalizacja:** `src/components/hooks/useTransactionForm.ts`

**Odpowiedzialności:**

1. Stan formularza (wartości pól)
2. Walidacja inline (przy blur/submit)
3. Normalizacja kwoty (zamiana "," na ".", formatowanie do 2 miejsc)
4. Mapowanie błędów API na pola formularza
5. Reset formularza

## 7. Integracja API

### 7.1 Pobieranie transakcji

**Endpoint:** `GET /api/transactions`

**Request:**

```typescript
const params = new URLSearchParams();
params.set("month", month); // YYYY-MM
if (categoryId) params.set("category_id", categoryId);
params.set("limit", "20");
params.set("offset", offset.toString());

fetch(`/api/transactions?${params}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

**Response:** `TransactionsListDTO`

### 7.2 Pobieranie kategorii

**Endpoint:** `GET /api/categories`

**Request:**

```typescript
fetch("/api/categories", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

**Response:** `CategoriesListDTO`

### 7.3 Tworzenie transakcji

**Endpoint:** `POST /api/transactions`

**Request Body:**

```typescript
interface CreateTransactionRequest {
  amount: string; // np. "125.50"
  type: "expense" | "income";
  category_id: string; // UUID
  description: string;
  occurred_at: string; // ISO 8601, np. "2026-01-15T00:00:00Z"
}
```

**Response:** `TransactionDTO` (201 Created)

### 7.4 Aktualizacja transakcji

**Endpoint:** `PATCH /api/transactions/{id}`

**Request Body:** Częściowy `CreateTransactionRequest` (wszystkie pola opcjonalne)

**Response:** `TransactionDTO` (200 OK)

### 7.5 Usuwanie transakcji

**Endpoint:** `DELETE /api/transactions/{id}`

**Response:** `{ message: string }` (200 OK)

### 7.6 Obsługa błędów API

| Status | Kod błędu        | Akcja                                               |
| ------ | ---------------- | --------------------------------------------------- |
| 400    | VALIDATION_ERROR | Mapowanie na pola formularza                        |
| 401    | UNAUTHORIZED     | Redirect do `/login?sessionExpired=true`            |
| 404    | NOT_FOUND        | Toast "Transakcja nie została znaleziona" + refetch |
| 500    | INTERNAL_ERROR   | Toast "Wystąpił nieoczekiwany błąd"                 |

## 8. Interakcje użytkownika

### 8.1 Zmiana miesiąca

1. Użytkownik klika strzałkę lub wybiera z dropdownu
2. URL aktualizowany (`month=YYYY-MM`)
3. Reset `offset` do 0
4. Refetch transakcji
5. Scroll do góry listy

### 8.2 Zmiana kategorii

1. Użytkownik wybiera z dropdownu
2. URL aktualizowany (dodanie/usunięcie `category_id`)
3. Reset `offset` do 0
4. Refetch transakcji

### 8.3 Dodawanie transakcji

1. Klik "Dodaj transakcję" → otwarcie dialogu
2. Wypełnienie formularza (domyślna data: dziś UTC)
3. Walidacja inline przy blur
4. Submit:
   - Sukces: Toast "Transakcja dodana", zamknięcie dialogu, refetch, scroll do góry
   - Błąd: Komunikaty przy polach lub toast

### 8.4 Edycja transakcji

1. Klik "Edytuj" w wierszu → otwarcie dialogu z danymi
2. Modyfikacja pól
3. Submit:
   - Sukces: Toast "Zapisano", zamknięcie dialogu, refetch (zachowanie scrolla)
   - Jeśli transakcja nie pasuje do filtrów po edycji: Toast "Zapisano", refetch (transakcja znika z listy)

### 8.5 Usuwanie transakcji

1. Klik "Usuń" → otwarcie dialogu potwierdzenia
2. Potwierdzenie:
   - Sukces: Toast "Transakcja usunięta", zamknięcie dialogu, refetch (zachowanie scrolla)
3. Anulowanie: zamknięcie dialogu

### 8.6 Load more

1. Klik "Załaduj więcej" → loader w przycisku
2. Sukces: dołączenie nowych transakcji do listy, aktualizacja `offset`
3. Błąd: komunikat inline + przycisk "Ponów"

## 9. Warunki i walidacja

### 9.1 Walidacja formularza (frontend)

| Pole        | Warunek                  | Komunikat błędu                                    |
| ----------- | ------------------------ | -------------------------------------------------- |
| amount      | >= 0.01 && <= 1000000.00 | "Kwota musi być między 0,01 a 1 000 000,00"        |
| amount      | poprawny format liczby   | "Nieprawidłowy format kwoty"                       |
| type        | "expense" \| "income"    | "Wybierz typ transakcji"                           |
| category_id | niepusty UUID            | "Wybierz kategorię"                                |
| description | niepusty, max 255 znaków | "Opis jest wymagany" / "Maksymalnie 255 znaków"    |
| description | nie tylko whitespace     | "Opis nie może składać się tylko z białych znaków" |
| occurred_at | poprawna data            | "Nieprawidłowa data"                               |

### 9.2 Walidacja filtrów

| Filtr       | Warunek                                 | Zachowanie                         |
| ----------- | --------------------------------------- | ---------------------------------- |
| month       | format YYYY-MM                          | Fallback do bieżącego miesiąca UTC |
| month       | nie w przyszłości (strzałka "następny") | Przycisk zablokowany               |
| category_id | UUID lub brak                           | Brak = "Wszystkie"                 |

### 9.3 Normalizacja kwoty

1. Przy wpisywaniu: akceptacja "," i "."
2. Przy blur:
   - Zamiana "," na "."
   - Parsowanie do liczby
   - Formatowanie do 2 miejsc po przecinku
   - Przykład: "1234,5" → "1234.50"

## 10. Obsługa błędów

### 10.1 Błąd ładowania listy

- Wyświetlenie `ErrorState` z komunikatem
- Przycisk "Spróbuj ponownie" → refetch

### 10.2 Błąd "Load more"

- Zachowanie istniejących transakcji
- Komunikat błędu inline pod listą
- Przycisk "Ponów" przy komunikacie

### 10.3 Błąd tworzenia/edycji transakcji

- 400 z `details`: mapowanie na konkretne pola formularza
- 404 (kategoria): "Wybrana kategoria nie istnieje"
- Inne: Toast z ogólnym komunikatem

### 10.4 Błąd usuwania transakcji

- 404: Toast "Transakcja nie została znaleziona" + refetch
- Inne: Toast "Nie udało się usunąć transakcji"

### 10.5 Sesja wygasła (401)

- Redirect do `/login?sessionExpired=true`
- Na stronie logowania: Toast "Sesja wygasła. Zaloguj się ponownie."

### 10.6 Puste stany kontekstowe

| Filtry              | Komunikat                                                 |
| ------------------- | --------------------------------------------------------- |
| Tylko miesiąc       | "Brak transakcji w [miesiąc] [rok]"                       |
| Miesiąc + kategoria | "Brak transakcji w [miesiąc] [rok] dla kategorii [nazwa]" |

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. `src/pages/app/transactions.astro` - strona Astro
2. `src/components/transactions/` - katalog komponentów:
   - `TransactionsView.tsx`
   - `TransactionsFilters.tsx`
   - `MonthPicker.tsx`
   - `CategorySelect.tsx`
   - `TransactionsList.tsx`
   - `TransactionListRow.tsx`
   - `LoadMoreButton.tsx`
   - `TransactionFormDialog.tsx`
   - `TransactionForm.tsx`
   - `DeleteTransactionDialog.tsx`
   - `EmptyState.tsx`
   - `LoadingState.tsx`
   - `types.ts`
3. `src/components/hooks/useTransactionsPage.ts`
4. `src/components/hooks/useTransactionForm.ts`

### Krok 2: Implementacja typów

1. Utworzenie `src/components/transactions/types.ts` z typami widoku

### Krok 3: Implementacja hooków

1. `useTransactionsPage` - logika pobierania, filtrów, CRUD
2. `useTransactionForm` - logika formularza z walidacją

### Krok 4: Implementacja komponentów filtrów

1. `MonthPicker` - nawigacja miesięcy z dropdownem
2. `CategorySelect` - dropdown kategorii
3. `TransactionsFilters` - kompozycja filtrów

### Krok 5: Implementacja komponentów listy

1. `LoadingState` - skeleton/spinner
2. `EmptyState` - stan pusty z kontekstowym komunikatem
3. `TransactionListRow` - wiersz transakcji z akcjami
4. `LoadMoreButton` - przycisk paginacji
5. `TransactionsList` - kontener z obsługą stanów

### Krok 6: Implementacja komponentów formularza i dialogów

1. `TransactionForm` - formularz z walidacją
2. `TransactionFormDialog` - modal dodawania/edycji
3. `DeleteTransactionDialog` - modal potwierdzenia usunięcia

### Krok 7: Implementacja głównego widoku

1. `TransactionsView` - kompozycja wszystkich komponentów
2. Integracja z hookiem `useTransactionsPage`

### Krok 8: Implementacja strony Astro

1. `transactions.astro` - routing, przekazanie `accessToken`
2. Użycie `AppLayout`

### Krok 9: Testy i poprawki

1. Testy scenariuszy z user stories
2. Weryfikacja obsługi błędów
3. Testy dostępności (ARIA, focus management)
4. Responsywność (desktop-only, ale sensowne minimum)

### Krok 10: Integracja z nawigacją

1. Dodanie kafelka "Transakcje" na stronie Start (`/app`)
2. Ewentualne linki z widoku Podsumowania
