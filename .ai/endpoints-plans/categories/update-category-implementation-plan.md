# API Endpoint Implementation Plan: PATCH /api/categories/{id}

## 1. Przegląd punktu koncowego

Endpoint umozliwia aktualizacje nazwy istniejącej kategorii uzytkownika. Endpoint weryfikuje uprawnienia uzytkownika do kategorii, waliduje dane wejściowe oraz zapobiega modyfikacji kategorii systemowych (np. "Brak"). Zapewnia rowniez unikalność nazw kategorii w ramach konta uzytkownika (case-insensitive dzieki typowi `citext`).

## 2. Szczegoly zadania

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/categories/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter, uuid) - identyfikator kategorii do aktualizacji
  - **Opcjonalne:** brak
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "string" // wymagane, 1-40 znaków, bez wiodących/końcowych spacji
  }
  ```

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts):

- `CategoryDTO` - DTO zwracane w odpowiedzi (bez `user_id`)
- `UpdateCategoryCommand` - command model dla aktualizacji (juz zdefiniowany z polem `name: string`)
- `ErrorResponseDTO` - standardowa struktura bledow
- `ErrorDetailDTO` - szczegoly bledow walidacji

### Nowy schemat walidacji (src/lib/schemas/category.schema.ts):

```typescript
export const updateCategorySchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(40, "Name must not exceed 40 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace-only",
    })
    .refine((val) => val === val.trim(), {
      message: "Name must not have leading or trailing spaces",
    }),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
```

### Nowy schemat walidacji UUID (src/lib/schemas/category.schema.ts):

```typescript
export const categoryIdSchema = z.string().uuid("Invalid category ID format");
```

## 4. Szczegoly odpowiedzi

### Sukces (200 OK):

```json
{
  "id": "uuid",
  "name": "Public Transport",
  "is_system": false,
  "system_key": null,
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

### Bledy:

| Kod HTTP | Kod bledu        | Opis                                                                                                        |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| 400      | VALIDATION_ERROR | Nieprawidlowe dane wejsciowe (puste, tylko spacje, > 40 znaków, wiodące/końcowe spacje, nieprawidlowy UUID) |
| 401      | UNAUTHORIZED     | Brak lub nieprawidlowy token sesji                                                                          |
| 403      | FORBIDDEN        | Proba modyfikacji kategorii systemowej                                                                      |
| 404      | NOT_FOUND        | Kategoria nie istnieje lub nalezy do innego uzytkownika                                                     |
| 409      | CONFLICT         | Nazwa kategorii juz istnieje (case-insensitive)                                                             |
| 500      | INTERNAL_ERROR   | Nieoczekiwany blad serwera                                                                                  |

## 5. Przeplyw danych

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATCH Request                            │
│         /api/categories/{id} + Authorization header             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. Walidacja Authorization header                  │
│                   (Bearer token present?)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ Brak tokena           │
                    ▼                       ▼
            [401 UNAUTHORIZED]    ┌─────────────────────────────┐
                                  │ 2. Weryfikacja tokena       │
                                  │    supabase.auth.getUser()  │
                                  └─────────────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │ Nieprawidlowy token   │
                                    ▼                       ▼
                            [401 UNAUTHORIZED]    ┌─────────────────────────────┐
                                                  │ 3. Walidacja path param {id}│
                                                  │    (UUID format)            │
                                                  └─────────────────────────────┘
                                                                │
                                                    ┌───────────┴───────────┐
                                                    │ Nieprawidlowy UUID    │
                                                    ▼                       ▼
                                            [400 VALIDATION_ERROR] ┌─────────────────────────────┐
                                                                   │ 4. Parsowanie request body  │
                                                                   │    i walidacja Zod          │
                                                                   └─────────────────────────────┘
                                                                                │
                                                                    ┌───────────┴───────────┐
                                                                    │ Blad walidacji        │
                                                                    ▼                       ▼
                                                            [400 VALIDATION_ERROR] ┌─────────────────────────────┐
                                                                                   │ 5. CategoryService          │
                                                                                   │    .updateCategory()        │
                                                                                   └─────────────────────────────┘
                                                                                                │
                                                                                                ▼
                                                                                   ┌─────────────────────────────┐
                                                                                   │ 5a. Pobranie kategorii      │
                                                                                   │     z weryfikacja user_id   │
                                                                                   └─────────────────────────────┘
                                                                                                │
                                                                                    ┌───────────┴───────────┐
                                                                                    │ Nie znaleziono        │
                                                                                    ▼                       ▼
                                                                            [404 NOT_FOUND]     ┌─────────────────────────────┐
                                                                                                │ 5b. Sprawdzenie is_system   │
                                                                                                └─────────────────────────────┘
                                                                                                                │
                                                                                                    ┌───────────┴───────────┐
                                                                                                    │ is_system = true      │
                                                                                                    ▼                       ▼
                                                                                            [403 FORBIDDEN]     ┌─────────────────────────────┐
                                                                                                                │ 5c. UPDATE kategorii       │
                                                                                                                └─────────────────────────────┘
                                                                                                                                │
                                                                                                                    ┌───────────┴───────────┐
                                                                                                                    │ Duplikat nazwy (23505)│
                                                                                                                    ▼                       ▼
                                                                                                            [409 CONFLICT]      [200 OK + CategoryDTO]
```

## 6. Wzgledy bezpieczenstwa

1. **Uwierzytelnianie:**
   - Walidacja tokena Bearer przez `supabase.auth.getUser(token)`
   - Uzycie `createSupabaseClientWithAuth(token)` dla operacji bazodanowych z RLS

2. **Autoryzacja:**
   - Row Level Security (RLS) zapewnia dostep tylko do kategorii uzytkownika
   - Dodatkowa weryfikacja `user_id` w serwisie przed aktualizacja
   - Blokada modyfikacji kategorii systemowych (`is_system = true`)

3. **Walidacja danych:**
   - Walidacja UUID path parametru
   - Walidacja body przez schemat Zod
   - Baza danych dodatkowo wymusza:
     - `char_length(name::text) BETWEEN 1 AND 40`
     - `btrim(name::text) <> ''`
     - `name::text = btrim(name::text)`

4. **Ochrona przed atakami:**
   - Parametryzowane zapytania przez Supabase (SQL injection)
   - Walidacja typow zapobiega nieoczekiwanym wartościom
   - `user_id` nie jest eksponowany w odpowiedzi (CategoryDTO)

## 7. Obsluga bledow

| Scenariusz                        | Kod HTTP | ErrorCode        | Wiadomość                                                                              |
| --------------------------------- | -------- | ---------------- | -------------------------------------------------------------------------------------- |
| Brak Authorization header         | 401      | UNAUTHORIZED     | "No valid session"                                                                     |
| Nieprawidlowy/wygasly token       | 401      | UNAUTHORIZED     | "No valid session"                                                                     |
| Nieprawidlowy format UUID         | 400      | VALIDATION_ERROR | "Invalid category ID format"                                                           |
| Puste body lub nieprawidlowy JSON | 400      | VALIDATION_ERROR | "Invalid JSON body"                                                                    |
| Pusta nazwa                       | 400      | VALIDATION_ERROR | details: [{ field: "name", message: "Name cannot be empty" }]                          |
| Nazwa tylko ze spacjami           | 400      | VALIDATION_ERROR | details: [{ field: "name", message: "Name cannot be empty or whitespace-only" }]       |
| Nazwa > 40 znaków                 | 400      | VALIDATION_ERROR | details: [{ field: "name", message: "Name must not exceed 40 characters" }]            |
| Wiodące/końcowe spacje            | 400      | VALIDATION_ERROR | details: [{ field: "name", message: "Name must not have leading or trailing spaces" }] |
| Kategoria nie istnieje            | 404      | NOT_FOUND        | "Category not found"                                                                   |
| Kategoria innego uzytkownika      | 404      | NOT_FOUND        | "Category not found"                                                                   |
| Kategoria systemowa               | 403      | FORBIDDEN        | "Cannot modify system category"                                                        |
| Duplikat nazwy (PostgreSQL 23505) | 409      | CONFLICT         | "Category with this name already exists"                                               |
| Nieoczekiwany blad                | 500      | INTERNAL_ERROR   | "An unexpected error occurred"                                                         |

## 8. Rozważania dotyczące wydajności

1. **Optymalizacja zapytań:**
   - Pojedyncze zapytanie SELECT sprawdzajace istnienie i is_system
   - Pojedyncze zapytanie UPDATE z RETURNING dla zwrócenia zaktualizowanych danych
   - Wykorzystanie indeksów na (user_id, id) oraz (user_id, name)

2. **Unikalnosc nazwy:**
   - Wykorzystanie typu `citext` dla case-insensitive porównań bez dodatkowego indeksu
   - Constraint UNIQUE (user_id, name) wymuszany na poziomie bazy

3. **RLS:**
   - Row Level Security filtruje dane na poziomie bazy - minimalizacja transferu danych

## 9. Etapy wdrozenia

### Krok 1: Rozszerzenie schematow walidacji

**Plik:** `src/lib/schemas/category.schema.ts`

Dodaj:

```typescript
export const updateCategorySchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(40, "Name must not exceed 40 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or whitespace-only",
    })
    .refine((val) => val === val.trim(), {
      message: "Name must not have leading or trailing spaces",
    }),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdSchema = z.string().uuid("Invalid category ID format");
```

### Krok 2: Rozszerzenie CategoryService

**Plik:** `src/lib/services/category.service.ts`

Dodaj import:

```typescript
import type { UpdateCategoryCommand } from "../../types";
```

Dodaj nową klasę błędu lub użyj niestandardowych wyjątków:

```typescript
export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class SystemCategoryError extends Error {
  constructor() {
    super("Cannot modify system category");
    this.name = "SystemCategoryError";
  }
}
```

Dodaj metodę:

```typescript
async updateCategory(
  id: string,
  command: UpdateCategoryCommand,
  userId: string
): Promise<CategoryDTO> {
  // 1. Pobierz kategorię i sprawdź uprawnienia
  const { data: existingCategory, error: fetchError } = await this.supabase
    .from("categories")
    .select("id, is_system, user_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existingCategory) {
    throw new CategoryNotFoundError();
  }

  // 2. Sprawdź czy kategoria systemowa
  if (existingCategory.is_system) {
    throw new SystemCategoryError();
  }

  // 3. Aktualizuj kategorię
  const { data, error } = await this.supabase
    .from("categories")
    .update({ name: command.name })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, name, is_system, system_key, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as CategoryDTO;
}
```

### Krok 3: Utworzenie endpointu API

**Plik:** `src/pages/api/categories/[id].ts`

```typescript
import type { APIRoute } from "astro";
import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import { CategoryService, CategoryNotFoundError, SystemCategoryError } from "../../../lib/services/category.service";
import { updateCategorySchema, categoryIdSchema } from "../../../lib/schemas/category.schema";
import type { CategoryDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja Authorization header
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

    // 2. Weryfikacja tokena
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

    // 3. Walidacja path parametru {id}
    const idValidation = categoryIdSchema.safeParse(params.id);

    if (!idValidation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [{ field: "id", message: "Invalid category ID format" }],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Parsowanie request body
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

    // 5. Walidacja body schematem Zod
    const validationResult = updateCategorySchema.safeParse(body);

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

    // 6. Aktualizacja kategorii
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const categoryService = new CategoryService(supabaseWithAuth);
    const result: CategoryDTO = await categoryService.updateCategory(idValidation.data, validationResult.data, user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa błędu: kategoria nie znaleziona
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

    // Obsługa błędu: kategoria systemowa
    if (error instanceof SystemCategoryError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "FORBIDDEN",
          message: "Cannot modify system category",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Obsługa błędu: duplikat nazwy (unique constraint violation)
    if ((error as PostgrestError).code === "23505") {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "CONFLICT",
          message: "Category with this name already exists",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Obsługa nieoczekiwanych błędów
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

### Krok 4: Testy manualne

Scenariusze do przetestowania:

1. Pomyslna aktualizacja kategorii (200)
2. Brak Authorization header (401)
3. Nieprawidlowy token (401)
4. Nieprawidlowy UUID w path (400)
5. Puste body JSON (400)
6. Nieprawidlowy JSON (400)
7. Pusta nazwa (400)
8. Nazwa ze spacjami (400)
9. Nazwa > 40 znaków (400)
10. Wiodące/końcowe spacje w nazwie (400)
11. Kategoria nie istnieje (404)
12. Kategoria innego uzytkownika (404)
13. Kategoria systemowa "Brak" (403)
14. Duplikat nazwy istniejącej kategorii (409)
