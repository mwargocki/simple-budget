# API Endpoint Implementation Plan: GET /api/transactions/{id}

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania szczegółów pojedynczej transakcji na podstawie jej identyfikatora UUID. Zwraca pełne dane transakcji wraz z nazwą kategorii. Dostęp do transakcji jest ograniczony tylko do właściciela (użytkownika, który ją utworzył).

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/transactions/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID transakcji
  - **Opcjonalne:** brak
- **Request Headers:**
  - `Authorization: Bearer <access_token>` - wymagany
- **Request Body:** brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

```typescript
// DTO odpowiedzi - linie 138-148
interface TransactionDTO {
  id: string;
  amount: string;
  type: TransactionType;
  category_id: string;
  category_name: string;
  description: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

// DTO błędów - linie 262-264
interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

### Nowe typy

Brak - wszystkie potrzebne typy już istnieją.

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "uuid",
  "amount": "125.50",
  "type": "expense",
  "category_id": "uuid",
  "category_name": "Food",
  "description": "Weekly groceries",
  "occurred_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T14:35:00Z",
  "updated_at": "2024-01-15T14:35:00Z"
}
```

### Błędy

| Kod | Opis | Struktura odpowiedzi |
|-----|------|---------------------|
| 400 | Nieprawidłowy format UUID | `{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid transaction ID format" } }` |
| 401 | Brak lub nieprawidłowy token | `{ "error": { "code": "UNAUTHORIZED", "message": "No valid session" } }` |
| 404 | Transakcja nie istnieje lub należy do innego użytkownika | `{ "error": { "code": "NOT_FOUND", "message": "Transaction not found" } }` |
| 500 | Błąd serwera | `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐     ┌──────────┐
│   Klient    │────▶│  API Endpoint    │────▶│ TransactionService  │────▶│ Supabase │
│             │     │  [id].ts         │     │ getTransactionById  │     │    DB    │
└─────────────┘     └──────────────────┘     └─────────────────────┘     └──────────┘
      │                     │                         │                       │
      │  GET /api/          │                         │                       │
      │  transactions/{id}  │                         │                       │
      │  + Bearer token     │                         │                       │
      │────────────────────▶│                         │                       │
      │                     │  1. Walidacja tokenu    │                       │
      │                     │─────────────────────────────────────────────────▶│
      │                     │                         │    auth.getUser()     │
      │                     │◀─────────────────────────────────────────────────│
      │                     │                         │                       │
      │                     │  2. Walidacja UUID      │                       │
      │                     │                         │                       │
      │                     │  3. Wywołanie serwisu   │                       │
      │                     │────────────────────────▶│                       │
      │                     │                         │  4. Zapytanie SQL     │
      │                     │                         │  z JOIN na categories │
      │                     │                         │──────────────────────▶│
      │                     │                         │◀──────────────────────│
      │                     │◀────────────────────────│                       │
      │                     │                         │                       │
      │  5. Odpowiedź JSON  │                         │                       │
      │◀────────────────────│                         │                       │
```

### Szczegóły zapytania SQL

```sql
SELECT
  t.id, t.amount, t.type, t.category_id,
  c.name as category_name,
  t.description, t.occurred_at, t.created_at, t.updated_at
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.id = :transaction_id AND t.user_id = :user_id
```

## 6. Względy bezpieczeństwa

1. **Autoryzacja:** Weryfikacja Bearer tokenu przez Supabase Auth
2. **Izolacja danych:** Transakcja musi należeć do zalogowanego użytkownika (filtrowanie po `user_id`)
3. **Walidacja UUID:** Sprawdzenie poprawności formatu UUID przed wykonaniem zapytania
4. **Row Level Security (RLS):** Supabase RLS jako dodatkowa warstwa ochrony
5. **Brak ujawniania informacji:** Odpowiedź 404 zarówno gdy transakcja nie istnieje, jak i gdy należy do innego użytkownika (zapobiega enumeracji)

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | ErrorCode | Wiadomość |
|------------|----------|-----------|-----------|
| Brak nagłówka Authorization | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy format tokenu | 401 | UNAUTHORIZED | No valid session |
| Token wygasł/nieprawidłowy | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy format UUID | 400 | VALIDATION_ERROR | Invalid transaction ID format |
| Transakcja nie istnieje | 404 | NOT_FOUND | Transaction not found |
| Transakcja należy do innego użytkownika | 404 | NOT_FOUND | Transaction not found |
| Błąd bazy danych | 500 | INTERNAL_ERROR | An unexpected error occurred |
| Nieoczekiwany wyjątek | 500 | INTERNAL_ERROR | An unexpected error occurred |

## 8. Rozważania dotyczące wydajności

1. **Pojedyncze zapytanie:** Użycie JOIN zamiast dwóch oddzielnych zapytań
2. **Indeksy:**
   - `transactions.id` - Primary Key (automatyczny indeks)
   - `transactions.user_id` - Foreign Key (powinien mieć indeks)
3. **Minimalne dane:** Pobieranie tylko potrzebnych kolumn
4. **Brak N+1:** Jedno zapytanie na żądanie

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji UUID

Utworzenie/rozszerzenie pliku `src/lib/schemas/transaction.schema.ts`:

```typescript
import { z } from "zod";

export const transactionIdSchema = z.string().uuid("Invalid transaction ID format");
```

### Krok 2: Dodanie błędu TransactionNotFoundError

Rozszerzenie `src/lib/services/transaction.service.ts`:

```typescript
export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transaction not found");
    this.name = "TransactionNotFoundError";
  }
}
```

### Krok 3: Implementacja metody w TransactionService

Dodanie metody `getTransactionById` w `src/lib/services/transaction.service.ts`:

```typescript
async getTransactionById(transactionId: string, userId: string): Promise<TransactionDTO> {
  const { data, error } = await this.supabase
    .from("transactions")
    .select(`
      id, amount, type, category_id, description,
      occurred_at, created_at, updated_at,
      categories!inner(name)
    `)
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new TransactionNotFoundError();
  }

  return {
    id: data.id,
    amount: data.amount.toFixed(2),
    type: data.type,
    category_id: data.category_id,
    category_name: data.categories.name,
    description: data.description,
    occurred_at: data.occurred_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
```

### Krok 4: Utworzenie endpointu API

Utworzenie pliku `src/pages/api/transactions/[id].ts`:

```typescript
import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import { TransactionService, TransactionNotFoundError } from "../../../lib/services/transaction.service";
import { transactionIdSchema } from "../../../lib/schemas/transaction.schema";
import type { TransactionDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja nagłówka Authorization
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7);

    // 2. Walidacja tokenu
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Walidacja parametru id
    const idValidation = transactionIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid transaction ID format",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Pobranie transakcji
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);
    const result: TransactionDTO = await transactionService.getTransactionById(
      idValidation.data,
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof TransactionNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Transaction not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 5: Testy

1. **Testy jednostkowe TransactionService.getTransactionById:**
   - Sukces - zwraca TransactionDTO
   - Transakcja nie istnieje - rzuca TransactionNotFoundError
   - Transakcja należy do innego użytkownika - rzuca TransactionNotFoundError

2. **Testy integracyjne endpointu:**
   - 200 OK - poprawne pobranie transakcji
   - 401 - brak tokenu
   - 401 - nieprawidłowy token
   - 400 - nieprawidłowy format UUID
   - 404 - transakcja nie istnieje
   - 404 - transakcja należy do innego użytkownika