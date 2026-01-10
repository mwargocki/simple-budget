# Plan implementacji widoku Kategorie

## 1. Przegląd

Widok Kategorie (`/app/categories`) służy do zarządzania kategoriami użytkownika w aplikacji SimpleBudget. Umożliwia przeglądanie alfabetycznie posortowanej listy kategorii, dodawanie nowych kategorii, edycję nazw istniejących kategorii oraz usuwanie kategorii (z automatycznym przenoszeniem powiązanych transakcji do kategorii systemowej "Brak"). Kategoria systemowa "Brak" jest wyróżniona i nie może być edytowana ani usunięta.

## 2. Routing widoku

- **Ścieżka**: `/app/categories`
- **Plik strony Astro**: `src/pages/app/categories.astro`
- **Layout**: `AppLayout.astro` (wspólny dla wszystkich widoków `/app/*`)
- **Ochrona trasy**: Automatyczna przez `AppLayout` (redirect do `/login?sessionExpired=true` gdy brak sesji)

## 3. Struktura komponentów

```
src/pages/app/categories.astro
└── AppLayout.astro
    ├── AppHeader (istniejący)
    ├── CategoriesPage (React, client:load)
    │   ├── CategoriesHeader
    │   │   └── Button "Dodaj kategorię"
    │   ├── CategoriesContent
    │   │   ├── LoadingState (gdy isLoading)
    │   │   ├── ErrorState (gdy error)
    │   │   ├── EmptyState (gdy categories.length === 0)
    │   │   └── CategoriesList (gdy data)
    │   │       └── CategoryListItem[] (dla każdej kategorii)
    │   │           ├── CategoryName
    │   │           ├── SystemBadge (dla "Brak")
    │   │           └── CategoryActions (Edytuj/Usuń)
    │   ├── CategoryFormDialog (modal create/edit)
    │   │   └── CategoryForm
    │   └── DeleteCategoryDialog (modal potwierdzenia usunięcia)
    └── Toaster (istniejący)
```

## 4. Szczegóły komponentów

### 4.1 CategoriesPage

- **Opis**: Główny komponent React widoku kategorii. Zarządza stanem listy kategorii, modalami i operacjami CRUD.
- **Główne elementy**:
  - `<main>` z klasami container
  - `CategoriesHeader` - nagłówek z przyciskiem dodawania
  - `CategoriesContent` - dynamiczna zawartość (loading/error/empty/list)
  - `CategoryFormDialog` - modal formularza
  - `DeleteCategoryDialog` - modal potwierdzenia usunięcia
- **Obsługiwane interakcje**:
  - Inicjalne pobranie kategorii (fetch on mount)
  - Otwarcie modala dodawania kategorii
  - Otwarcie modala edycji kategorii
  - Otwarcie modala usuwania kategorii
  - Retry przy błędzie
- **Typy**: `CategoryDTO[]`, `CategoriesPageState`
- **Propsy**: `accessToken: string`

### 4.2 CategoriesHeader

- **Opis**: Nagłówek sekcji z przyciskiem CTA do dodawania nowej kategorii.
- **Główne elementy**:
  - `<div>` flex container
  - `Button` "Dodaj kategorię" z ikoną Plus
- **Obsługiwane interakcje**:
  - `onAddClick` - otwarcie modala dodawania
- **Typy**: brak dedykowanych
- **Propsy**: `onAddClick: () => void`

### 4.3 CategoriesContent

- **Opis**: Wrapper obsługujący różne stany widoku (loading, error, empty, data).
- **Główne elementy**:
  - Warunkowe renderowanie jednego z: `LoadingState`, `ErrorState`, `EmptyState`, `CategoriesList`
- **Obsługiwane interakcje**: brak bezpośrednich
- **Typy**: `CategoriesContentProps`
- **Propsy**:
  - `isLoading: boolean`
  - `error: string | null`
  - `categories: CategoryDTO[]`
  - `onRetry: () => void`
  - `onEdit: (category: CategoryDTO) => void`
  - `onDelete: (category: CategoryDTO) => void`

### 4.4 LoadingState

- **Opis**: Stan ładowania z animowanym spinnerem.
- **Główne elementy**:
  - `<div>` flex center container
  - `Loader2` ikona z animacją spin
  - Tekst "Ładowanie kategorii..."
- **Obsługiwane interakcje**: brak
- **Typy**: brak
- **Propsy**: brak

### 4.5 ErrorState

- **Opis**: Stan błędu z komunikatem i przyciskiem retry.
- **Główne elementy**:
  - `<div>` container z Alert/Card
  - Ikona błędu
  - Komunikat błędu
  - `Button` "Spróbuj ponownie"
- **Obsługiwane interakcje**:
  - `onRetry` - ponowne pobranie danych
- **Typy**: brak dedykowanych
- **Propsy**:
  - `message: string`
  - `onRetry: () => void`

### 4.6 EmptyState

- **Opis**: Stan pustej listy z zachętą do dodania pierwszej kategorii.
- **Główne elementy**:
  - `<div>` container
  - Ikona Tag
  - Komunikat "Nie masz jeszcze żadnych kategorii"
  - `Button` "Dodaj pierwszą kategorię"
- **Obsługiwane interakcje**:
  - `onAddClick` - otwarcie modala dodawania
- **Typy**: brak dedykowanych
- **Propsy**: `onAddClick: () => void`

### 4.7 CategoriesList

- **Opis**: Lista kategorii w formie tabeli lub listy kart.
- **Główne elementy**:
  - `<ul>` lista z `role="list"`
  - `CategoryListItem` dla każdej kategorii
- **Obsługiwane interakcje**: delegowane do dzieci
- **Typy**: `CategoryDTO[]`
- **Propsy**:
  - `categories: CategoryDTO[]`
  - `onEdit: (category: CategoryDTO) => void`
  - `onDelete: (category: CategoryDTO) => void`

### 4.8 CategoryListItem

- **Opis**: Pojedynczy wiersz kategorii z nazwą, znacznikiem systemowym i akcjami.
- **Główne elementy**:
  - `<li>` z Card lub div
  - Nazwa kategorii
  - `Badge` "Systemowa" (gdy `is_system === true`)
  - `Button` "Edytuj" (ukryty dla systemowych)
  - `Button` "Usuń" (ukryty dla systemowych)
- **Obsługiwane interakcje**:
  - `onEdit` - kliknięcie przycisku edycji
  - `onDelete` - kliknięcie przycisku usunięcia
- **Walidacja**: Przyciski edycji/usunięcia niewidoczne dla kategorii systemowych
- **Typy**: `CategoryDTO`
- **Propsy**:
  - `category: CategoryDTO`
  - `onEdit: (category: CategoryDTO) => void`
  - `onDelete: (category: CategoryDTO) => void`

### 4.9 CategoryFormDialog

- **Opis**: Modal z formularzem do tworzenia lub edycji kategorii.
- **Główne elementy**:
  - `Dialog` (shadcn/ui lub custom)
  - `DialogHeader` z tytułem ("Dodaj kategorię" / "Edytuj kategorię")
  - `CategoryForm`
  - `DialogFooter` z przyciskami
- **Obsługiwane interakcje**:
  - Zamknięcie modala (X, Escape, klik poza modal)
  - Submit formularza
- **Walidacja**: delegowana do `CategoryForm`
- **Typy**: `CategoryFormDialogProps`, `CategoryFormMode`
- **Propsy**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `mode: 'create' | 'edit'`
  - `category?: CategoryDTO` (dla trybu edit)
  - `onSuccess: () => void`
  - `accessToken: string`

### 4.10 CategoryForm

- **Opis**: Formularz z polem nazwy kategorii i walidacją inline.
- **Główne elementy**:
  - `<form>` element
  - `Label` "Nazwa kategorii"
  - `Input` dla nazwy
  - Komunikat błędu walidacji (pod inputem)
  - `Button` "Zapisz" / "Dodaj"
  - `Button` "Anuluj"
- **Obsługiwane interakcje**:
  - Zmiana wartości pola (onChange)
  - Blur pola (walidacja)
  - Submit formularza
  - Anulowanie (zamknięcie modala)
- **Walidacja**:
  - Pole wymagane (nie może być puste)
  - Nie może zawierać tylko białych znaków
  - Maksymalnie 40 znaków
  - Brak spacji na początku/końcu (trim)
  - Unikalność nazwy (obsługa błędu 409 z API)
- **Typy**: `CategoryFormState`, `CategoryFormErrors`
- **Propsy**:
  - `mode: 'create' | 'edit'`
  - `initialName?: string`
  - `onSubmit: (name: string) => Promise<void>`
  - `onCancel: () => void`
  - `isSubmitting: boolean`
  - `apiError?: string`

### 4.11 DeleteCategoryDialog

- **Opis**: Modal potwierdzenia usunięcia kategorii z informacją o przeniesieniu transakcji.
- **Główne elementy**:
  - `AlertDialog` (shadcn/ui lub custom)
  - Tytuł "Usuń kategorię"
  - Treść z informacją o przeniesieniu transakcji do "Brak"
  - Nazwa kategorii do usunięcia
  - `Button` "Usuń" (destructive)
  - `Button` "Anuluj"
- **Obsługiwane interakcje**:
  - Potwierdzenie usunięcia
  - Anulowanie (zamknięcie modala)
- **Typy**: `DeleteCategoryDialogProps`
- **Propsy**:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `category: CategoryDTO | null`
  - `onConfirm: () => Promise<void>`
  - `isDeleting: boolean`

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

```typescript
// CategoryDTO - z API
interface CategoryDTO {
  id: string;
  name: string;
  is_system: boolean;
  system_key: string | null;
  created_at: string;
  updated_at: string;
}

// CategoriesListDTO - odpowiedź z GET /api/categories
interface CategoriesListDTO {
  categories: CategoryDTO[];
}

// CreateCategoryCommand - żądanie POST /api/categories
interface CreateCategoryCommand {
  name: string;
}

// UpdateCategoryCommand - żądanie PATCH /api/categories/{id}
interface UpdateCategoryCommand {
  name: string;
}

// DeleteCategoryResponseDTO - odpowiedź z DELETE /api/categories/{id}
interface DeleteCategoryResponseDTO {
  message: string;
  transactions_moved: number;
}

// ErrorResponseDTO - odpowiedź błędu
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
```

### 5.2 Nowe typy ViewModel (do utworzenia)

```typescript
// src/components/categories/types.ts

// Stan głównego komponentu strony
interface CategoriesPageState {
  categories: CategoryDTO[];
  isLoading: boolean;
  error: string | null;
}

// Tryb formularza
type CategoryFormMode = "create" | "edit";

// Stan formularza kategorii
interface CategoryFormState {
  name: string;
  isSubmitting: boolean;
  generalError: string | null;
}

// Błędy walidacji formularza
interface CategoryFormErrors {
  name?: string;
}

// Props dla CategoryFormDialog
interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CategoryFormMode;
  category?: CategoryDTO;
  onSuccess: () => void;
  accessToken: string;
}

// Props dla DeleteCategoryDialog
interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryDTO | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

// Stan modali w CategoriesPage
interface CategoriesModalsState {
  formDialog: {
    isOpen: boolean;
    mode: CategoryFormMode;
    category?: CategoryDTO;
  };
  deleteDialog: {
    isOpen: boolean;
    category: CategoryDTO | null;
  };
}
```

## 6. Zarządzanie stanem

### 6.1 Hook `useCategoriesPage`

Główny hook zarządzający logiką widoku kategorii.

```typescript
// src/components/hooks/useCategoriesPage.ts

interface UseCategoriesPageResult {
  // Stan danych
  categories: CategoryDTO[];
  isLoading: boolean;
  error: string | null;

  // Akcje danych
  fetchCategories: () => Promise<void>;

  // Stan modali
  formDialog: {
    isOpen: boolean;
    mode: CategoryFormMode;
    category?: CategoryDTO;
  };
  deleteDialog: {
    isOpen: boolean;
    category: CategoryDTO | null;
    isDeleting: boolean;
  };

  // Akcje modali
  openCreateDialog: () => void;
  openEditDialog: (category: CategoryDTO) => void;
  openDeleteDialog: (category: CategoryDTO) => void;
  closeFormDialog: () => void;
  closeDeleteDialog: () => void;

  // Operacje CRUD
  createCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}
```

**Logika hooka**:

1. Stan `categories`, `isLoading`, `error` dla listy
2. Stan `formDialog` i `deleteDialog` dla modali
3. Stan `isDeleting` dla operacji usuwania
4. `useEffect` z fetchem kategorii przy montowaniu
5. Funkcje otwierania/zamykania modali
6. Funkcje CRUD z obsługą błędów i toastami
7. Refetch po każdej mutacji

### 6.2 Hook `useCategoryForm`

Hook do obsługi formularza kategorii (podobny do istniejących hooków formularzy).

```typescript
// src/components/hooks/useCategoryForm.ts

interface UseCategoryFormResult {
  formState: CategoryFormState;
  errors: CategoryFormErrors;
  handleChange: (value: string) => void;
  handleBlur: () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  resetForm: () => void;
  setApiError: (error: string | null) => void;
}
```

**Logika hooka**:

1. Stan `name`, `isSubmitting`, `generalError`
2. Walidacja z użyciem schematu Zod (reużycie `createCategorySchema`)
3. Funkcje `handleChange`, `handleBlur`, `handleSubmit`
4. Reset formularza przy zamknięciu modala

## 7. Integracja API

### 7.1 GET /api/categories

**Kiedy**: Przy montowaniu komponentu, po każdej mutacji (create/update/delete)

**Żądanie**:

```typescript
const response = await fetch("/api/categories", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});
```

**Odpowiedź sukcesu (200)**:

```typescript
const data: CategoriesListDTO = await response.json();
// data.categories - posortowana alfabetycznie lista
```

**Obsługa błędów**:

- 401: Redirect do `/login?sessionExpired=true`
- Inne: Wyświetlenie `ErrorState` z komunikatem

### 7.2 POST /api/categories

**Kiedy**: Submit formularza w trybie `create`

**Żądanie**:

```typescript
const command: CreateCategoryCommand = { name: trimmedName };
const response = await fetch("/api/categories", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(command),
});
```

**Odpowiedź sukcesu (201)**: `CategoryDTO`

**Obsługa błędów**:

- 400: Wyświetlenie błędów walidacji w formularzu
- 401: Redirect do `/login?sessionExpired=true`
- 409: Komunikat "Kategoria o tej nazwie już istnieje"

### 7.3 PATCH /api/categories/{id}

**Kiedy**: Submit formularza w trybie `edit`

**Żądanie**:

```typescript
const command: UpdateCategoryCommand = { name: trimmedName };
const response = await fetch(`/api/categories/${categoryId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(command),
});
```

**Odpowiedź sukcesu (200)**: `CategoryDTO`

**Obsługa błędów**:

- 400: Wyświetlenie błędów walidacji
- 401: Redirect do `/login?sessionExpired=true`
- 403: Komunikat "Nie można modyfikować kategorii systemowej"
- 404: Komunikat "Kategoria nie została znaleziona"
- 409: Komunikat "Kategoria o tej nazwie już istnieje"

### 7.4 DELETE /api/categories/{id}

**Kiedy**: Potwierdzenie w `DeleteCategoryDialog`

**Żądanie**:

```typescript
const response = await fetch(`/api/categories/${categoryId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

**Odpowiedź sukcesu (200)**: `DeleteCategoryResponseDTO`

**Obsługa błędów**:

- 401: Redirect do `/login?sessionExpired=true`
- 403: Komunikat "Nie można usunąć kategorii systemowej"
- 404: Komunikat "Kategoria nie została znaleziona"

## 8. Interakcje użytkownika

### 8.1 Przeglądanie listy kategorii

1. Użytkownik wchodzi na `/app/categories`
2. System wyświetla stan ładowania (spinner)
3. Po załadowaniu wyświetla listę kategorii posortowaną alfabetycznie
4. Kategoria "Brak" ma znacznik "Systemowa"
5. Dla kategorii niesystemowych widoczne są przyciski Edytuj/Usuń

### 8.2 Dodawanie nowej kategorii

1. Użytkownik klika "Dodaj kategorię"
2. Otwiera się modal z pustym formularzem
3. Użytkownik wpisuje nazwę
4. Walidacja inline przy blur (komunikaty pod polem)
5. Klik "Dodaj" → submit
6. Sukces: toast "Kategoria dodana", zamknięcie modala, odświeżenie listy
7. Błąd 409: komunikat "Kategoria o tej nazwie już istnieje"

### 8.3 Edycja kategorii

1. Użytkownik klika "Edytuj" przy kategorii
2. Otwiera się modal z wypełnionym formularzem (aktualna nazwa)
3. Użytkownik modyfikuje nazwę
4. Walidacja inline przy blur
5. Klik "Zapisz" → submit
6. Sukces: toast "Kategoria zaktualizowana", zamknięcie modala, odświeżenie listy
7. Błąd 409: komunikat o duplikacie

### 8.4 Usuwanie kategorii

1. Użytkownik klika "Usuń" przy kategorii
2. Otwiera się modal z ostrzeżeniem o przeniesieniu transakcji
3. Użytkownik klika "Usuń" (przycisk destructive)
4. Sukces: toast "Kategoria usunięta. Przeniesiono X transakcji do kategorii Brak"
5. Zamknięcie modala, odświeżenie listy

### 8.5 Obsługa błędów ładowania

1. Błąd przy pobieraniu kategorii → `ErrorState`
2. Komunikat "Nie udało się załadować kategorii"
3. Przycisk "Spróbuj ponownie" → retry fetch

## 9. Warunki i walidacja

### 9.1 Walidacja nazwy kategorii (frontend)

| Warunek                  | Komunikat błędu                                     |
| ------------------------ | --------------------------------------------------- |
| Pole puste               | "Nazwa jest wymagana"                               |
| Tylko białe znaki        | "Nazwa nie może składać się tylko z białych znaków" |
| Więcej niż 40 znaków     | "Nazwa nie może przekraczać 40 znaków"              |
| Spacje na początku/końcu | "Nazwa nie może zaczynać się ani kończyć spacją"    |

### 9.2 Walidacja z API (backend)

| Kod HTTP | Warunek             | Komunikat w UI                                      |
| -------- | ------------------- | --------------------------------------------------- |
| 400      | Nieprawidłowe dane  | Wyświetlenie szczegółów z `details`                 |
| 409      | Duplikat nazwy      | "Kategoria o tej nazwie już istnieje"               |
| 403      | Kategoria systemowa | "Nie można modyfikować/usunąć kategorii systemowej" |
| 404      | Nie znaleziono      | "Kategoria nie została znaleziona"                  |

### 9.3 Warunki wyświetlania

| Element           | Warunek                                           |
| ----------------- | ------------------------------------------------- |
| Przycisk "Edytuj" | `category.is_system === false`                    |
| Przycisk "Usuń"   | `category.is_system === false`                    |
| Badge "Systemowa" | `category.is_system === true`                     |
| `EmptyState`      | `categories.length === 0 && !isLoading && !error` |

## 10. Obsługa błędów

### 10.1 Błąd sieci / timeout

- Stan: `ErrorState` z komunikatem "Nie udało się połączyć z serwerem"
- Akcja: Przycisk "Spróbuj ponownie"

### 10.2 Błąd 401 (sesja wygasła)

- Wszystkie endpointy
- Akcja: Redirect do `/login?sessionExpired=true`
- Toast na stronie logowania: "Sesja wygasła. Zaloguj się ponownie."

### 10.3 Błąd 409 (duplikat nazwy)

- POST i PATCH
- Komunikat w formularzu: "Kategoria o tej nazwie już istnieje"
- Pole `name` podświetlone jako błędne

### 10.4 Błąd 403 (kategoria systemowa)

- PATCH i DELETE
- Toast error: "Nie można modyfikować/usunąć kategorii systemowej"
- Teoretycznie niemożliwe przy poprawnym UI (przyciski ukryte)

### 10.5 Błąd 404 (nie znaleziono)

- PATCH i DELETE
- Toast error: "Kategoria nie została znaleziona"
- Odświeżenie listy (kategoria mogła zostać usunięta w innej zakładce)

### 10.6 Błąd 500 (wewnętrzny błąd serwera)

- Toast error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
- Dla listy: `ErrorState` z retry

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzyć `src/pages/app/categories.astro`
2. Utworzyć katalog `src/components/categories/`
3. Utworzyć plik typów `src/components/categories/types.ts`

### Krok 2: Implementacja strony Astro

1. Utworzyć stronę `categories.astro` analogicznie do `settings.astro`
2. Użyć `AppLayout` z `pageTitle="Kategorie"`
3. Przekazać `accessToken` do komponentu React

### Krok 3: Implementacja hooka `useCategoriesPage`

1. Utworzyć `src/components/hooks/useCategoriesPage.ts`
2. Zaimplementować logikę fetcha kategorii
3. Zaimplementować zarządzanie stanami modali
4. Zaimplementować operacje CRUD z obsługą błędów
5. Dodać integrację z toastami (sonner)

### Krok 4: Implementacja hooka `useCategoryForm`

1. Utworzyć `src/components/hooks/useCategoryForm.ts`
2. Wykorzystać wzorzec z `useChangePasswordForm`
3. Zaimplementować walidację z Zod (reużycie `createCategorySchema`)
4. Obsłużyć błędy API (409, 400)

### Krok 5: Implementacja komponentów stanu

1. Utworzyć `LoadingState.tsx` - spinner z tekstem
2. Utworzyć `ErrorState.tsx` - komunikat + retry button
3. Utworzyć `EmptyState.tsx` - zachęta + CTA

### Krok 6: Implementacja listy kategorii

1. Utworzyć `CategoriesList.tsx` - wrapper listy
2. Utworzyć `CategoryListItem.tsx` - pojedynczy wiersz
3. Zaimplementować warunkowe wyświetlanie akcji (edytuj/usuń)
4. Dodać badge "Systemowa" dla kategorii `is_system`

### Krok 7: Implementacja modali

1. Utworzyć `CategoryFormDialog.tsx` - modal z formularzem
2. Utworzyć `CategoryForm.tsx` - formularz z walidacją
3. Utworzyć `DeleteCategoryDialog.tsx` - modal potwierdzenia

### Krok 8: Implementacja głównego komponentu

1. Utworzyć `CategoriesPage.tsx`
2. Połączyć wszystkie komponenty
3. Użyć hooka `useCategoriesPage`
4. Zaimplementować `CategoriesHeader` z przyciskiem dodawania
5. Zaimplementować `CategoriesContent` z obsługą stanów

### Krok 9: Testy manualne

1. Przetestować ładowanie listy kategorii
2. Przetestować dodawanie nowej kategorii
3. Przetestować edycję kategorii
4. Przetestować usuwanie kategorii
5. Przetestować walidację formularza
6. Przetestować obsługę błędów (409, sieć)
7. Przetestować że kategoria "Brak" nie ma akcji edycji/usunięcia

### Krok 10: Dostępność i UX

1. Dodać odpowiednie atrybuty ARIA
2. Zapewnić nawigację klawiaturową w modalach
3. Dodać focus management przy otwieraniu/zamykaniu modali
4. Przetestować z czytnikiem ekranu
