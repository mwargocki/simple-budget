# API Endpoint Implementation Plan: POST /api/transactions

## 1. Przegląd punktu końcowego

Endpoint `POST /api/transactions` służy do tworzenia nowej transakcji (wydatku lub przychodu) dla uwierzytelnionego użytkownika. Transakcja jest przypisana do kategorii należącej do użytkownika. Endpoint wymaga autoryzacji poprzez token Bearer i zwraca utworzoną transakcję wraz z nazwą kategorii.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/transactions`
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`

### Parametry:

**Wymagane:**
| Pole | Typ | Opis |
|------|-----|------|
| `amount` | string/number | Kwota w PLN (zakres: 0.01 - 1,000,000.00) |
| `type` | string | Typ transakcji: "expense" lub "income" |
| `category_id` | uuid | ID kategorii należącej do bieżącego użytkownika |
| `description` | string | Opis transakcji (max 255 znaków, nie może być pusty ani składać się tylko z białych znaków) |

**Opcjonalne:**
| Pole | Typ | Opis |
|------|-----|------|
| `occurred_at` | string | Data/czas w formacie ISO 8601. Domyślnie: bieżący timestamp |

### Request Body:
```json
{
  "amount": "125.50",
  "type": "expense",
  "category_id": "uuid",
  "description": "Weekly groceries",
  "occurred_at": "2024-01-15T14:30:00Z"
}
```

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:
- `CreateTransactionCommand` - model komendy dla request body
- `TransactionDTO` - DTO odpowiedzi zawierające dane transakcji z `category_name`
- `TransactionType` - typ enum ("expense" | "income")
- `ErrorResponseDTO`, `ErrorDTO`, `ErrorDetailDTO` - typy błędów

### Nowe typy do utworzenia:

**Zod Schema (`src/lib/schemas/transaction.schema.ts`):**
```typescript
export const createTransactionSchema = z.object({
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === "string" ? parseFloat(val) : val)
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000000.00, {
      message: "Amount must be between 0.01 and 1,000,000.00"
    }),
  type: z.enum(["expense", "income"], {
    errorMap: () => ({ message: "Type must be 'expense' or 'income'" })
  }),
  category_id: z.string().uuid("Invalid category ID format"),
  description: z.string()
    .min(1, "Description is required")
    .max(255, "Description must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Description cannot be whitespace-only"
    }),
  occurred_at: z.string()
    .datetime({ message: "Invalid ISO 8601 datetime format" })
    .optional()
});
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created):
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

### Błędy:

**400 Bad Request:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "amount", "message": "Amount must be between 0.01 and 1,000,000.00" }
    ]
  }
}
```

**401 Unauthorized:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Category not found"
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────┐
│                     POST /api/transactions                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Walidacja Authorization header (Bearer token)                 │
│    - Brak lub nieprawidłowy → 401 UNAUTHORIZED                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Weryfikacja tokenu przez Supabase Auth                        │
│    - Błąd lub brak użytkownika → 401 UNAUTHORIZED               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Parsowanie JSON body                                          │
│    - Błąd parsowania → 400 VALIDATION_ERROR                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Walidacja Zod schema                                          │
│    - Błędy walidacji → 400 VALIDATION_ERROR z details           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. TransactionService.createTransaction()                        │
│    a) Weryfikacja kategorii (SELECT z categories)               │
│       - Nie znaleziono → 404 NOT_FOUND                          │
│    b) INSERT do transactions z JOIN na categories               │
│    c) Zwrot TransactionDTO z category_name                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Odpowiedź 201 Created z TransactionDTO                        │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:
- Wymagany Bearer token w nagłówku `Authorization`
- Token weryfikowany przez `locals.supabase.auth.getUser(token)`
- Utworzenie klienta Supabase z tokenem użytkownika dla RLS: `createSupabaseClientWithAuth(token)`

### Autoryzacja:
- RLS (Row Level Security) w Supabase zapewnia dostęp tylko do danych użytkownika
- Kompozytowy klucz obcy `(user_id, category_id) → categories(user_id, id)` gwarantuje, że transakcja nie może wskazywać kategorii innego użytkownika

### Walidacja danych wejściowych:
- Zod schema waliduje wszystkie pola przed operacją na bazie danych
- Zapobiega injection attacks przez parametryzowane zapytania Supabase
- Ograniczenia bazy danych (CHECK constraints) jako druga warstwa walidacji

### Ochrona przed atakami:
- Brak ujawniania szczegółów błędów wewnętrznych (500 zwraca ogólny komunikat)
- Walidacja UUID dla category_id zapobiega SQL injection
- Sanityzacja description przez sprawdzenie długości i białych znaków

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Kod błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak nagłówka Authorization | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy format Bearer | 401 | UNAUTHORIZED | No valid session |
| Token wygasł/nieprawidłowy | 401 | UNAUTHORIZED | No valid session |
| Nieprawidłowy JSON body | 400 | VALIDATION_ERROR | Invalid JSON body |
| Brak wymaganego pola | 400 | VALIDATION_ERROR | [field] is required |
| amount poza zakresem | 400 | VALIDATION_ERROR | Amount must be between 0.01 and 1,000,000.00 |
| type nieprawidłowy | 400 | VALIDATION_ERROR | Type must be 'expense' or 'income' |
| category_id nieprawidłowy UUID | 400 | VALIDATION_ERROR | Invalid category ID format |
| description pusta/whitespace | 400 | VALIDATION_ERROR | Description cannot be whitespace-only |
| description > 255 znaków | 400 | VALIDATION_ERROR | Description must not exceed 255 characters |
| occurred_at nieprawidłowy format | 400 | VALIDATION_ERROR | Invalid ISO 8601 datetime format |
| Kategoria nie istnieje | 404 | NOT_FOUND | Category not found |
| Kategoria należy do innego użytkownika | 404 | NOT_FOUND | Category not found |
| Błąd bazy danych | 500 | INTERNAL_ERROR | An unexpected error occurred |
| Nieoczekiwany błąd | 500 | INTERNAL_ERROR | An unexpected error occurred |

### Custom Errors w TransactionService:
```typescript
export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje:
- Pojedyncze zapytanie INSERT z SELECT dla pobrania category_name (można użyć subquery lub JOIN)
- Używanie indeksów w bazie danych (PK na id, FK na user_id, category_id)
- RLS policies wykorzystują indeksy na user_id

### Potencjalne wąskie gardła:
- Weryfikacja tokenu przy każdym żądaniu (nieuniknione dla bezpieczeństwa)
- Sprawdzenie istnienia kategorii przed INSERT (konieczne dla poprawnego błędu 404)

### Strategia:
- Użycie pojedynczego zapytania z JOIN zamiast dwóch osobnych zapytań:
  ```sql
  INSERT INTO transactions (...)
  SELECT ... FROM categories WHERE ...
  RETURNING ... , (SELECT name FROM categories WHERE id = category_id)
  ```

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod
**Plik:** `src/lib/schemas/transaction.schema.ts`

```typescript
import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000000.0, {
      message: "Amount must be between 0.01 and 1,000,000.00",
    }),
  type: z.enum(["expense", "income"], {
    errorMap: () => ({ message: "Type must be 'expense' or 'income'" }),
  }),
  category_id: z.string().uuid("Invalid category ID format"),
  description: z
    .string({ required_error: "Description is required" })
    .min(1, "Description is required")
    .max(255, "Description must not exceed 255 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Description cannot be whitespace-only",
    }),
  occurred_at: z
    .string()
    .datetime({ message: "Invalid ISO 8601 datetime format" })
    .optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
```

### Krok 2: Utworzenie TransactionService
**Plik:** `src/lib/services/transaction.service.ts`

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateTransactionCommand, TransactionDTO } from "../../types";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class TransactionService {
  constructor(private supabase: SupabaseClient) {}

  async createTransaction(
    command: CreateTransactionCommand,
    userId: string
  ): Promise<TransactionDTO> {
    // 1. Verify category exists and belongs to user
    const { data: category, error: categoryError } = await this.supabase
      .from("categories")
      .select("id, name")
      .eq("id", command.category_id)
      .eq("user_id", userId)
      .single();

    if (categoryError || !category) {
      throw new CategoryNotFoundError();
    }

    // 2. Prepare amount as number
    const amount =
      typeof command.amount === "string"
        ? parseFloat(command.amount)
        : command.amount;

    // 3. Insert transaction
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: command.category_id,
        amount: amount,
        type: command.type,
        description: command.description,
        occurred_at: command.occurred_at ?? new Date().toISOString(),
      })
      .select("id, amount, type, category_id, description, occurred_at, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    // 4. Return DTO with category_name and formatted amount
    return {
      id: data.id,
      amount: data.amount.toFixed(2),
      type: data.type,
      category_id: data.category_id,
      category_name: category.name,
      description: data.description,
      occurred_at: data.occurred_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
```

### Krok 3: Utworzenie endpointu API
**Plik:** `src/pages/api/transactions/index.ts`

```typescript
import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import { TransactionService, CategoryNotFoundError } from "../../../lib/services/transaction.service";
import { createTransactionSchema } from "../../../lib/schemas/transaction.schema";
import type { TransactionDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract and validate Authorization header
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

    // 2. Validate token by getting user
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser(token);

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

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Validate body with Zod schema
    const validationResult = createTransactionSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Create transaction
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);
    const result: TransactionDTO = await transactionService.createTransaction(
      validationResult.data,
      user.id
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle CategoryNotFoundError
    if (error instanceof CategoryNotFoundError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
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

### Krok 4: Testy jednostkowe i integracyjne

**Scenariusze do przetestowania:**

1. **Happy path:**
   - Utworzenie transakcji z wszystkimi wymaganymi polami
   - Utworzenie transakcji z opcjonalnym `occurred_at`
   - Weryfikacja formatu `amount` w odpowiedzi (string z 2 miejscami po przecinku)

2. **Walidacja:**
   - Brak wymaganych pól (amount, type, category_id, description)
   - amount poza zakresem (< 0.01, > 1,000,000.00)
   - amount jako string i number
   - type nieprawidłowy (np. "transfer")
   - category_id nieprawidłowy UUID
   - description pusta, tylko whitespace, > 255 znaków
   - occurred_at nieprawidłowy format

3. **Autoryzacja:**
   - Brak nagłówka Authorization
   - Nieprawidłowy format Bearer
   - Wygasły/nieprawidłowy token

4. **Logika biznesowa:**
   - Kategoria nie istnieje
   - Kategoria należy do innego użytkownika (powinna zwrócić 404, nie 403)

### Krok 5: Aktualizacja dokumentacji

- Dodanie endpointu do dokumentacji API
- Aktualizacja przykładów w dokumentacji deweloperskiej