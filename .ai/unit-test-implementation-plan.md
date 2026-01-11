# Plan Implementacji Testów Jednostkowych - SimpleBudget

## 1. Podsumowanie Aplikacji

1. **SimpleBudget** - aplikacja webowa do zarządzania budżetem osobistym w PLN
2. **Architektura**: Astro 5 SSR + React 19 + TypeScript 5
3. **Backend**: Supabase (PostgreSQL, autentykacja, RLS)
4. **Główne moduły**: Autentykacja, Transakcje, Kategorie, Podsumowania, Profile
5. **Warstwy**: Prezentacja → API Endpoints → Serwisy → Supabase
6. **Walidacja**: Zod schemas dla wszystkich danych wejściowych
7. **Integracje zewnętrzne**: OpenRouter API (AI analysis)
8. **Stan testów**: Istnieje jeden test (`auth.schema.test.ts`), MSW skonfigurowane
9. **Środowisko testowe**: Vitest + jsdom, @testing-library/react, MSW
10. **Coverage wykluczenia**: node_modules, tests, shadcn/ui, typy

---

## 2. Inwentaryzacja "Co Testujemy"

### 2.1 Schematy Walidacji (Zod) - Czysty kod

| Plik | Odpowiedzialność | Typ |
|------|------------------|-----|
| `src/lib/schemas/auth.schema.ts` | Walidacja rejestracji, logowania, zmiany hasła, usunięcia konta | Czysty |
| `src/lib/schemas/transaction.schema.ts` | Walidacja tworzenia/edycji transakcji, query params | Czysty |
| `src/lib/schemas/category.schema.ts` | Walidacja tworzenia/edycji kategorii | Czysty |
| `src/lib/schemas/profile.schema.ts` | Walidacja aktualizacji profilu | Czysty |
| `src/lib/schemas/summary.schema.ts` | Walidacja query params podsumowania | Czysty |
| `src/lib/schemas/openrouter.schema.ts` | Walidacja opcji czatu AI | Czysty |

### 2.2 Serwisy Biznesowe - IO/Integracje

| Plik | Odpowiedzialność | Typ zależności |
|------|------------------|----------------|
| `src/lib/services/auth.service.ts` | Rejestracja, logowanie, wylogowanie, zmiana hasła, usunięcie konta | IO (Supabase Auth + Admin) |
| `src/lib/services/transaction.service.ts` | CRUD transakcji, filtrowanie, paginacja | IO (Supabase DB) |
| `src/lib/services/category.service.ts` | CRUD kategorii, ochrona systemowych, przenoszenie transakcji | IO (Supabase DB) |
| `src/lib/services/summary.service.ts` | Podsumowanie miesięczne, agregacja, obsługa stref czasowych | IO (Supabase DB) + logika obliczeń |
| `src/lib/services/profile.service.ts` | Pobieranie/aktualizacja profilu | IO (Supabase DB) |
| `src/lib/services/openrouter.service.ts` | Integracja z OpenRouter AI | Zewnętrzna integracja (HTTP) |

### 2.3 Utility Functions - Czysty kod

| Plik | Odpowiedzialność | Typ |
|------|------------------|-----|
| `src/lib/utils.ts` | Funkcja `cn()` do łączenia klas CSS | Czysty |

### 2.4 Klasy Błędów - Czysty kod

| Plik | Odpowiedzialność | Typ |
|------|------------------|-----|
| `src/lib/errors/openrouter.errors.ts` | Klasy błędów OpenRouter (5 typów) | Czysty |

### 2.5 Middleware - IO

| Plik | Odpowiedzialność | Typ |
|------|------------------|-----|
| `src/middleware/index.ts` | Przekierowania, zarządzanie sesją | IO (Supabase Auth) |

### 2.6 API Endpoints - IO

| Katalog | Endpointy | Typ |
|---------|-----------|-----|
| `src/pages/api/auth/` | register, login, logout, change-password, account | IO |
| `src/pages/api/transactions/` | index (GET, POST), [id] (GET, PUT, DELETE) | IO |
| `src/pages/api/categories/` | index (GET, POST), [id] (GET, PUT, DELETE) | IO |
| `src/pages/api/summary/` | index, ai-analysis | IO |
| `src/pages/api/profile.ts` | GET, PUT | IO |

### 2.7 React Hooks - Logika kliencka

| Plik | Odpowiedzialność | Typ |
|------|------------------|-----|
| `src/components/hooks/useLoginForm.ts` | Logika formularza logowania | React + API |
| `src/components/hooks/useRegisterForm.ts` | Logika formularza rejestracji | React + API |
| `src/components/hooks/useChangePasswordForm.ts` | Logika zmiany hasła | React + API |
| `src/components/hooks/useDeleteAccountForm.ts` | Logika usunięcia konta | React + API |
| `src/components/hooks/useCategoryForm.ts` | Logika formularza kategorii | React + API |
| `src/components/hooks/useCategoriesPage.ts` | Zarządzanie stroną kategorii | React + API |
| `src/components/hooks/useTransactionForm.ts` | Logika formularza transakcji | React + API |
| `src/components/hooks/useTransactionsPage.ts` | Zarządzanie stroną transakcji | React + API |
| `src/components/hooks/useSummaryPage.ts` | Zarządzanie stroną podsumowania | React + API |
| `src/components/hooks/useAISummary.ts` | Integracja z analizą AI | React + API |
| `src/components/hooks/useLogout.ts` | Logika wylogowania | React + API |

---

## 3. Podział na Logiczne Grupy Testów

### GRUPA 1: Schematy Walidacji (Validation Schemas)

**Nazwa**: `validation-schemas`

**Zakres**:
- `src/lib/schemas/auth.schema.ts`
- `src/lib/schemas/transaction.schema.ts`
- `src/lib/schemas/category.schema.ts`
- `src/lib/schemas/profile.schema.ts`
- `src/lib/schemas/summary.schema.ts`
- `src/lib/schemas/openrouter.schema.ts`

**Co testujemy** (kluczowe przypadki):
1. `registerSchema` - walidacja email, hasła min 8 znaków, zgodność haseł *(już istnieje)*
2. `loginSchema` - walidacja email, wymagane hasło *(już istnieje)*
3. `changePasswordSchema` - nowe hasło różne od starego, zgodność potwierdzeń *(już istnieje)*
4. `deleteAccountSchema` - wymagane "DELETE" *(już istnieje)*
5. `createTransactionSchema` - kwota 0.01-1000000, typ expense/income, UUID kategorii, opis niepusty
6. `updateTransactionSchema` - przynajmniej jedno pole, walidacje częściowe
7. `transactionsQuerySchema` - format miesiąca YYYY-MM, limit 1-100, offset >= 0
8. `createCategorySchema` - nazwa 1-40 znaków, brak białych znaków na brzegach
9. `updateProfileSchema` - timezone niepusty, max 64 znaki
10. `summaryQuerySchema` - format miesiąca YYYY-MM opcjonalny
11. `chatOptionsSchema` - wymagane messages, walidacja temperature 0-2, maxTokens

**Mocking/stubbing**: Brak - czyste funkcje

**Dane testowe**:
- Poprawne dane (happy path)
- Puste stringi
- Zbyt krótkie/długie wartości
- Nieprawidłowe formaty (email, UUID, ISO date)
- Wartości graniczne (0.01, 1000000, 1, 40, 100)
- Białe znaki na brzegach

**Ryzyka**: Niskie - to czyste transformacje

**Szacunkowy nakład**: **S** (małe)

**Priorytet**: **P0** (krytyczny)

---

### GRUPA 2: Serwis Transakcji (Transaction Service)

**Nazwa**: `transaction-service`

**Zakres**:
- `src/lib/services/transaction.service.ts`

**Co testujemy**:
1. `createTransaction()` - utworzenie z poprawnymi danymi
2. `createTransaction()` - błąd gdy kategoria nie istnieje (`CategoryNotFoundError`)
3. `getTransactionById()` - pobranie istniejącej transakcji
4. `getTransactionById()` - błąd gdy transakcja nie istnieje (`TransactionNotFoundError`)
5. `getTransactions()` - lista z paginacją, has_more = true/false
6. `getTransactions()` - filtrowanie po miesiącu (calculateMonthRange)
7. `getTransactions()` - filtrowanie po kategorii
8. `updateTransaction()` - aktualizacja częściowa
9. `updateTransaction()` - błąd gdy transakcja nie istnieje
10. `deleteTransaction()` - usunięcie istniejącej transakcji

**Mocking/stubbing**:
- Mock `SupabaseClient` z metodami: `from().select().eq().single()`, `from().insert().select()`, etc.
- Użyć `vi.fn()` dla chainable API Supabase

**Dane testowe**:
- Transakcje różnych typów (expense/income)
- UUID dla id, category_id, user_id
- Różne kwoty (min, max, typowe)
- Różne occurred_at (bieżący miesiąc, poprzedni)
- Paginacja: limit=20, offset=0, offset=20

**Ryzyka**:
- Skomplikowany chainable API Supabase wymaga starannego mockowania
- Metoda `calculateMonthRange` jest prywatna - testować przez publiczne API

**Szacunkowy nakład**: **L** (duży)

**Priorytet**: **P0** (krytyczny - główna funkcjonalność)

---

### GRUPA 3: Serwis Kategorii (Category Service)

**Nazwa**: `category-service`

**Zakres**:
- `src/lib/services/category.service.ts`

**Co testujemy**:
1. `getCategories()` - pobranie listy kategorii
2. `createCategory()` - utworzenie nowej kategorii
3. `updateCategory()` - aktualizacja nazwy kategorii
4. `updateCategory()` - błąd gdy kategoria nie istnieje (`CategoryNotFoundError`)
5. `updateCategory()` - błąd dla kategorii systemowej (`SystemCategoryError`)
6. `deleteCategory()` - usunięcie kategorii bez transakcji
7. `deleteCategory()` - usunięcie kategorii z transakcjami (przeniesienie do "Brak")
8. `deleteCategory()` - błąd dla kategorii systemowej

**Mocking/stubbing**:
- Mock `SupabaseClient`
- Symulacja kategorii systemowej (is_system: true)
- Symulacja transakcji przypisanych do kategorii

**Dane testowe**:
- Kategorie użytkownika (is_system: false)
- Kategorie systemowe (is_system: true, system_key: "none")
- Kategorie z transakcjami i bez

**Ryzyka**:
- Logika przenoszenia transakcji wymaga mockowania wielu operacji

**Szacunkowy nakład**: **M** (średni)

**Priorytet**: **P0** (krytyczny)

---

### GRUPA 4: Serwis Autentykacji (Auth Service)

**Nazwa**: `auth-service`

**Zakres**:
- `src/lib/services/auth.service.ts`

**Co testujemy**:
1. `register()` - sukces rejestracji
2. `register()` - obsługa błędu Supabase (np. duplikat email)
3. `register()` - obsługa braku user/email w response
4. `login()` - sukces logowania z sesją
5. `login()` - błędne dane logowania
6. `logout()` - sukces wylogowania
7. `changePassword()` - sukces zmiany hasła
8. `changePassword()` - błędne aktualne hasło
9. `deleteAccount()` - sukces usunięcia konta

**Mocking/stubbing**:
- Mock `SupabaseClient.auth.signUp()`, `signInWithPassword()`, `signOut()`, `updateUser()`
- Mock dynamiczny import `supabaseAdmin` dla `deleteAccount()`
- Mock `supabaseAdmin.rpc()` i `supabaseAdmin.auth.admin.deleteUser()`

**Dane testowe**:
- Poprawne email/password
- Błędne hasło
- UUID dla userId

**Ryzyka**:
- Dynamiczny import `supabaseAdmin` w `deleteAccount()` - wymaga mockowania modułu
- Zależność od `signInWithPassword` do weryfikacji hasła w `changePassword`

**Szacunkowy nakład**: **M** (średni)

**Priorytet**: **P0** (krytyczny - bezpieczeństwo)

---

### GRUPA 5: Serwis Podsumowań (Summary Service)

**Nazwa**: `summary-service`

**Zakres**:
- `src/lib/services/summary.service.ts`

**Co testujemy**:
1. `getMonthlySummary()` - agregacja po kategoriach
2. `getMonthlySummary()` - obliczenia total_income, total_expenses, balance
3. `getMonthlySummary()` - formatowanie kwot (2 miejsca po przecinku)
4. `calculateMonthRangeWithTimezone()` - dla różnych stref czasowych
5. `calculateMonthRangeWithTimezone()` - dla bieżącego miesiąca (bez parametru)
6. `getUserTimezone()` - domyślny UTC gdy brak profilu
7. Obsługa przejścia roku (grudzień → styczeń)

**Mocking/stubbing**:
- Mock `SupabaseClient` dla transactions i profiles
- Symulacja transakcji z różnymi typami i kategoriami

**Dane testowe**:
- Transakcje różnych typów w jednej kategorii
- Wiele kategorii
- Różne strefy czasowe (UTC, Europe/Warsaw, America/New_York)
- Miesiące graniczne (styczeń, grudzień)
- Puste dane (brak transakcji)

**Ryzyka**:
- Złożona logika stref czasowych w `calculateMonthRangeWithTimezone`
- `getTimezoneOffset` używa `toLocaleString` - może się różnić między środowiskami

**Szacunkowy nakład**: **M** (średni)

**Priorytet**: **P1** (wysoki)

---

### GRUPA 6: Serwis Profilu (Profile Service)

**Nazwa**: `profile-service`

**Zakres**:
- `src/lib/services/profile.service.ts`

**Co testujemy**:
1. `getProfile()` - pobranie istniejącego profilu
2. `getProfile()` - zwrócenie null gdy profil nie istnieje (PGRST116)
3. `getProfile()` - propagacja innych błędów
4. `updateProfile()` - sukces aktualizacji
5. `updateProfile()` - błąd gdy profil nie istnieje (`ProfileNotFoundError`)

**Mocking/stubbing**:
- Mock `SupabaseClient`
- Symulacja błędu PGRST116

**Dane testowe**:
- Poprawne timezone (np. "Europe/Warsaw")
- UUID dla userId

**Ryzyka**: Niskie - prosty serwis

**Szacunkowy nakład**: **S** (mały)

**Priorytet**: **P2** (niski)

---

### GRUPA 7: Serwis OpenRouter (OpenRouter Service)

**Nazwa**: `openrouter-service`

**Zakres**:
- `src/lib/services/openrouter.service.ts`
- `src/lib/errors/openrouter.errors.ts`

**Co testujemy**:
1. Konstruktor - wymaga API key (`OpenRouterAuthError`)
2. Konstruktor - domyślne wartości konfiguracji
3. `chat()` - sukces z poprawną odpowiedzią
4. `chat()` - obsługa błędu 401 (`OpenRouterAuthError`)
5. `chat()` - obsługa błędu 429 (`OpenRouterRateLimitError`)
6. `chat()` - obsługa błędu 403 (`OpenRouterModerationError`)
7. `chat()` - obsługa timeout (`OpenRouterError` TIMEOUT)
8. `chatWithSchema()` - parsowanie JSON response
9. `chatWithSchema()` - błąd parsowania (`OpenRouterSchemaError`)
10. `chatStream()` - parsowanie chunków SSE

**Mocking/stubbing**:
- Mock globalny `fetch` z `vi.stubGlobal()`
- Symulacja różnych HTTP responses
- Symulacja ReadableStream dla streaming

**Dane testowe**:
- Poprawne API responses
- Błędne HTTP status codes
- Niepoprawny JSON
- SSE format data

**Ryzyka**:
- Streaming z `ReadableStream` wymaga starannego mockowania
- `fetchWithTimeout` używa `AbortController`

**Szacunkowy nakład**: **L** (duży)

**Priorytet**: **P1** (wysoki - integracja AI)

---

### GRUPA 8: Klasy Błędów i Utilities

**Nazwa**: `errors-and-utils`

**Zakres**:
- `src/lib/errors/openrouter.errors.ts`
- `src/lib/utils.ts`

**Co testujemy**:
1. `cn()` - łączenie klas CSS
2. `cn()` - usuwanie duplikatów (twMerge)
3. `cn()` - obsługa conditional classes (clsx)
4. `OpenRouterError` - poprawne ustawienie code, statusCode, metadata
5. `OpenRouterAuthError` - domyślny message i statusCode 401
6. `OpenRouterRateLimitError` - retryAfter
7. `OpenRouterSchemaError` - receivedData
8. `OpenRouterModerationError` - flaggedInput, reasons

**Mocking/stubbing**: Brak - czyste klasy

**Dane testowe**:
- Różne kombinacje klas CSS
- Conflicting Tailwind classes
- Różne wartości dla error metadata

**Ryzyka**: Niskie

**Szacunkowy nakład**: **S** (mały)

**Priorytet**: **P2** (niski)

---

### GRUPA 9: API Endpoints - Auth

**Nazwa**: `api-auth-endpoints`

**Zakres**:
- `src/pages/api/auth/register.ts`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/change-password.ts`
- `src/pages/api/auth/account.ts`

**Co testujemy**:
1. `POST /api/auth/register` - walidacja + wywołanie serwisu
2. `POST /api/auth/login` - walidacja + wywołanie serwisu + ustawienie cookies
3. `POST /api/auth/logout` - wywołanie serwisu
4. `POST /api/auth/change-password` - wymaga sesji + walidacja
5. `DELETE /api/auth/account` - wymaga sesji + potwierdzenie "DELETE"
6. Obsługa błędów walidacji (400)
7. Obsługa braku sesji (401)

**Mocking/stubbing**:
- Mock `AuthService`
- Mock `context.locals.supabase`
- Mock `Astro.cookies`

**Dane testowe**:
- Poprawne i niepoprawne request bodies
- Zalogowany/niezalogowany użytkownik

**Ryzyka**:
- Astro API context trudny do mockowania
- Interakcja z cookies

**Szacunkowy nakład**: **L** (duży)

**Priorytet**: **P1** (wysoki)

---

### GRUPA 10: API Endpoints - Transactions

**Nazwa**: `api-transaction-endpoints`

**Zakres**:
- `src/pages/api/transactions/index.ts`
- `src/pages/api/transactions/[id].ts`

**Co testujemy**:
1. `GET /api/transactions` - paginacja, filtrowanie
2. `POST /api/transactions` - tworzenie transakcji
3. `GET /api/transactions/[id]` - pobieranie pojedynczej
4. `PUT /api/transactions/[id]` - aktualizacja
5. `DELETE /api/transactions/[id]` - usunięcie
6. Obsługa błędów (404, 400, 401)

**Mocking/stubbing**:
- Mock `TransactionService`
- Mock `context.locals.supabase`

**Dane testowe**:
- Query params dla GET
- Request bodies dla POST/PUT
- UUID dla [id]

**Ryzyka**: Jak GRUPA 9

**Szacunkowy nakład**: **M** (średni)

**Priorytet**: **P1** (wysoki)

---

### GRUPA 11: API Endpoints - Categories & Other

**Nazwa**: `api-other-endpoints`

**Zakres**:
- `src/pages/api/categories/index.ts`
- `src/pages/api/categories/[id].ts`
- `src/pages/api/summary.ts`
- `src/pages/api/summary/ai-analysis.ts`
- `src/pages/api/profile.ts`

**Co testujemy**:
1. `GET/POST /api/categories`
2. `GET/PUT/DELETE /api/categories/[id]`
3. `GET /api/summary`
4. `GET /api/summary/ai-analysis`
5. `GET/PUT /api/profile`

**Mocking/stubbing**:
- Mock odpowiednich serwisów
- Mock `context.locals.supabase`

**Dane testowe**: Podobne do poprzednich grup

**Ryzyka**: Jak GRUPA 9-10

**Szacunkowy nakład**: **M** (średni)

**Priorytet**: **P1** (wysoki)

---

### GRUPA 12: React Hooks (Opcjonalna)

**Nazwa**: `react-hooks`

**Zakres**:
- `src/components/hooks/*.ts`

**Co testujemy**:
1. Stan początkowy hooków
2. Obsługa submit formularzy
3. Obsługa błędów
4. Aktualizacja stanu po API call

**Mocking/stubbing**:
- Mock `fetch` dla API calls
- `@testing-library/react` z `renderHook`

**Dane testowe**:
- Poprawne/niepoprawne formularze
- Sukces/błąd API

**Ryzyka**:
- Hooks mogą wymagać React Context (np. dla toastów)
- Asynchroniczna logika wymaga `waitFor`

**Szacunkowy nakład**: **L** (duży)

**Priorytet**: **P2** (niski - UI testy E2E pokrywają te scenariusze)

---

## 4. Plan Wykonania Krok po Kroku

### Kolejność realizacji (uzasadnienie):

1. **GRUPA 1: Schematy Walidacji** - fundament, zerowe zależności, szybkie wdrożenie
2. **GRUPA 8: Errors & Utils** - podstawowe utilities, proste
3. **GRUPA 6: Profile Service** - najprostszy serwis, nauka mockowania Supabase
4. **GRUPA 3: Category Service** - średnia złożoność, przygotowanie do Transaction
5. **GRUPA 2: Transaction Service** - kluczowy, najczęściej używany
6. **GRUPA 4: Auth Service** - krytyczny dla bezpieczeństwa
7. **GRUPA 5: Summary Service** - złożona logika dat
8. **GRUPA 7: OpenRouter Service** - zewnętrzna integracja
9. **GRUPY 9-11: API Endpoints** - integracja warstw
10. **GRUPA 12: React Hooks** - opcjonalnie, jeśli czas pozwoli

### Top 3 grupy na start:

| Kolejność | Grupa | Uzasadnienie |
|-----------|-------|--------------|
| **1** | **GRUPA 1: Schematy Walidacji** | Już istnieje test `auth.schema.test.ts` - wzorzec gotowy. Czyste funkcje, brak zależności. Szybki sukces, buduje momentum. |
| **2** | **GRUPA 8: Errors & Utils** | Małe, proste, zerowe zależności. Pozwala zweryfikować setup testów. |
| **3** | **GRUPA 6: Profile Service** | Najprostszy serwis (2 metody). Pozwala wypracować wzorzec mockowania Supabase przed bardziej złożonymi serwisami. |

---

## 5. Ryzyka i Propozycje Refaktorów

### 5.1 Mockowanie Supabase Client

**Problem**: Chainable API Supabase (`from().select().eq().single()`) jest trudne do mockowania.

**Propozycja**:
```typescript
// tests/mocks/supabase.mock.ts
export function createMockSupabaseClient(overrides = {}) {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ...overrides,
  };

  return {
    from: vi.fn(() => mockChain),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
  };
}
```

### 5.2 Dynamiczny Import w AuthService.deleteAccount

**Problem**: `deleteAccount()` używa dynamicznego importu `supabaseAdmin`.

**Rozwiązanie**: Mock modułu przez `vi.mock()`:
```typescript
vi.mock("../../db/supabase.admin", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));
```

### 5.3 Prywatne Metody w Serwisach

**Problem**: `calculateMonthRange()`, `calculateMonthRangeWithTimezone()`, `getTimezoneOffset()` są prywatne.

**Rozwiązanie**: Testować przez publiczne API. Ewentualnie wyekstrahować do osobnego modułu `date-utils.ts` jeśli logika się rozrośnie.

### 5.4 Astro API Context

**Problem**: Endpointy Astro używają `APIContext` który jest trudny do symulacji.

**Propozycja**: Stworzyć helper:
```typescript
// tests/helpers/astro-context.mock.ts
export function createMockAPIContext(overrides = {}) {
  return {
    request: new Request("http://localhost/api/test"),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    locals: {
      supabase: createMockSupabaseClient(),
    },
    url: new URL("http://localhost/api/test"),
    params: {},
    ...overrides,
  };
}
```

### 5.5 Strefy Czasowe w Testach

**Problem**: `SummaryService` używa `Intl.DateTimeFormat` i `toLocaleString` które mogą się różnić między środowiskami.

**Propozycja**: Mockować `Date` i `Intl` w testach lub testować tylko względne różnice.

---

## 6. Struktura Katalogów Testowych

```
tests/
├── setup.ts                          # Global setup (już istnieje)
├── mocks/
│   ├── handlers.ts                   # MSW handlers (już istnieje)
│   ├── server.ts                     # MSW server (już istnieje)
│   ├── supabase.mock.ts              # Helper do mockowania Supabase
│   └── astro-context.mock.ts         # Helper do mockowania Astro Context
├── helpers/
│   ├── test-data.ts                  # Fabryki danych testowych
│   └── assertions.ts                 # Custom assertions
└── unit/
    ├── schemas/
    │   ├── auth.schema.test.ts       # (już istnieje)
    │   ├── transaction.schema.test.ts
    │   ├── category.schema.test.ts
    │   ├── profile.schema.test.ts
    │   ├── summary.schema.test.ts
    │   └── openrouter.schema.test.ts
    ├── services/
    │   ├── auth.service.test.ts
    │   ├── transaction.service.test.ts
    │   ├── category.service.test.ts
    │   ├── summary.service.test.ts
    │   ├── profile.service.test.ts
    │   └── openrouter.service.test.ts
    ├── errors/
    │   └── openrouter.errors.test.ts
    ├── utils/
    │   └── utils.test.ts
    └── api/
        ├── auth/
        │   ├── register.test.ts
        │   ├── login.test.ts
        │   ├── logout.test.ts
        │   ├── change-password.test.ts
        │   └── account.test.ts
        ├── transactions/
        │   ├── index.test.ts
        │   └── [id].test.ts
        ├── categories/
        │   ├── index.test.ts
        │   └── [id].test.ts
        ├── summary/
        │   ├── index.test.ts
        │   └── ai-analysis.test.ts
        └── profile.test.ts
```

---

## 7. Podsumowanie Priorytetów

| Priorytet | Grupy | Opis |
|-----------|-------|------|
| **P0** | 1, 2, 3, 4 | Krytyczne: walidacja, transakcje, kategorie, auth |
| **P1** | 5, 7, 9, 10, 11 | Wysokie: podsumowania, OpenRouter, API endpoints |
| **P2** | 6, 8, 12 | Niskie: profil, utils/errors, React hooks |

---

## 8. Metryki Sukcesu

- **Cel coverage**: 80%+ dla `src/lib/services/`, `src/lib/schemas/`
- **Coverage wykluczenia**: `src/components/ui/`, `src/pages/` (pokryte przez E2E)
- **Wszystkie testy przechodzące**: 100%
- **Czas wykonania testów jednostkowych**: < 30s
