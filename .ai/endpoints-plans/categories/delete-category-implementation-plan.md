# API Endpoint Implementation Plan: DELETE /api/categories/{id}

## 1. Przegląd punktu końcowego

Endpoint służy do usuwania kategorii użytkownika. Przed usunięciem kategorii wszystkie powiązane transakcje zostają przeniesione do systemowej kategorii "Brak" (`system_key='none'`). Nie można usunąć kategorii systemowej.

## 2. Szczegóły żądania

- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/categories/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID kategorii do usunięcia
  - **Opcjonalne:** Brak
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` - wymagany
- **Request Body:** Brak

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

```typescript
/** Response after successful category deletion */
export interface DeleteCategoryResponseDTO {
  message: string;
  transactions_moved: number;
}
```

### Istniejące schematy walidacji (src/lib/schemas/category.schema.ts)

```typescript
export const categoryIdSchema = z.string().uuid("Invalid category ID format");
```

### Istniejące klasy błędów (src/lib/services/category.service.ts)

```typescript
export class CategoryNotFoundError extends Error { ... }
export class SystemCategoryError extends Error { ... }
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "message": "Category deleted successfully",
  "transactions_moved": 5
}
```

### Błędy

| Status | Kod błędu        | Opis                                                    |
| ------ | ---------------- | ------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Nieprawidłowy format UUID                               |
| 401    | UNAUTHORIZED     | Brak lub nieprawidłowy token                            |
| 403    | FORBIDDEN        | Próba usunięcia kategorii systemowej                    |
| 404    | NOT_FOUND        | Kategoria nie istnieje lub należy do innego użytkownika |
| 500    | INTERNAL_ERROR   | Nieoczekiwany błąd serwera                              |

## 5. Przepływ danych

```
Request → Walidacja Auth → Walidacja UUID → CategoryService.deleteCategory()
                                                    ↓
                                           1. Pobierz kategorię (sprawdź właściciela)
                                                    ↓
                                           2. Sprawdź czy nie systemowa
                                                    ↓
                                           3. Pobierz kategorię "Brak" użytkownika
                                                    ↓
                                           4. Policz transakcje do przeniesienia
                                                    ↓
                                           5. Przenieś transakcje do "Brak"
                                                    ↓
                                           6. Usuń kategorię
                                                    ↓
                                           7. Zwróć liczbę przeniesionych transakcji
```

## 6. Względy bezpieczeństwa

1. **Autoryzacja:** Weryfikacja tokenu Bearer przez Supabase Auth przed jakąkolwiek operacją
2. **Własność zasobu:** Sprawdzenie `user_id` kategorii przed operacją
3. **RLS:** Row Level Security na poziomie Supabase zapewnia dodatkową warstwę ochrony
4. **Walidacja UUID:** Zapobieganie SQL injection przez walidację formatu UUID
5. **Ochrona kategorii systemowej:** Blokada usunięcia kategorii z `is_system=true`

## 7. Obsługa błędów

| Scenariusz                  | Wyjątek/Warunek                         | Status | Odpowiedź                                                                        |
| --------------------------- | --------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Brak nagłówka Authorization | `!authHeader`                           | 401    | `{ error: { code: "UNAUTHORIZED", message: "No valid session" } }`               |
| Nieprawidłowy token         | `authError \|\| !user`                  | 401    | `{ error: { code: "UNAUTHORIZED", message: "No valid session" } }`               |
| Nieprawidłowy format UUID   | `!categoryIdSchema.safeParse().success` | 400    | `{ error: { code: "VALIDATION_ERROR", ... } }`                                   |
| Kategoria nie istnieje      | `CategoryNotFoundError`                 | 404    | `{ error: { code: "NOT_FOUND", message: "Category not found" } }`                |
| Kategoria systemowa         | `SystemCategoryError`                   | 403    | `{ error: { code: "FORBIDDEN", message: "Cannot delete system category" } }`     |
| Błąd bazy danych            | Inne wyjątki                            | 500    | `{ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }` |

## 8. Rozważania dotyczące wydajności

1. **Transakcje DB:** Operacje przeniesienia transakcji i usunięcia kategorii powinny być wykonane atomowo
2. **Indeksy:** Wykorzystanie istniejących indeksów na `category_id` w tabeli transactions
3. **Batch update:** Pojedyncze zapytanie UPDATE dla wszystkich transakcji zamiast wielu pojedynczych

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie CategoryService

Dodaj metodę `deleteCategory` do `src/lib/services/category.service.ts`:

```typescript
async deleteCategory(id: string, userId: string): Promise<{ transactions_moved: number }> {
  // 1. Pobierz kategorię i zweryfikuj właściciela
  const { data: category, error: fetchError } = await this.supabase
    .from("categories")
    .select("id, is_system, user_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !category) {
    throw new CategoryNotFoundError();
  }

  // 2. Sprawdź czy to kategoria systemowa
  if (category.is_system) {
    throw new SystemCategoryError();
  }

  // 3. Pobierz kategorię "Brak" użytkownika
  const { data: noneCategory, error: noneCategoryError } = await this.supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("system_key", "none")
    .single();

  if (noneCategoryError || !noneCategory) {
    throw new Error("System category 'Brak' not found");
  }

  // 4. Policz i przenieś transakcje do kategorii "Brak"
  const { data: transactions, error: countError } = await this.supabase
    .from("transactions")
    .select("id", { count: "exact" })
    .eq("category_id", id);

  if (countError) {
    throw countError;
  }

  const transactionsCount = transactions?.length ?? 0;

  if (transactionsCount > 0) {
    const { error: updateError } = await this.supabase
      .from("transactions")
      .update({ category_id: noneCategory.id })
      .eq("category_id", id);

    if (updateError) {
      throw updateError;
    }
  }

  // 5. Usuń kategorię
  const { error: deleteError } = await this.supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }

  return { transactions_moved: transactionsCount };
}
```

### Krok 2: Dodanie handlera DELETE do API route

Dodaj eksport `DELETE` do `src/pages/api/categories/[id].ts`:

```typescript
export const DELETE: APIRoute = async ({ params, request, locals }) => {
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

    // 2. Weryfikacja tokenu
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

    // 3. Walidacja parametru {id}
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

    // 4. Usunięcie kategorii
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const categoryService = new CategoryService(supabaseWithAuth);
    const result = await categoryService.deleteCategory(idValidation.data, user.id);

    const response: DeleteCategoryResponseDTO = {
      message: "Category deleted successfully",
      transactions_moved: result.transactions_moved,
    };

    return new Response(JSON.stringify(response), {
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
          message: "Cannot delete system category",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
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

### Krok 3: Aktualizacja importów

Dodaj import `DeleteCategoryResponseDTO` do pliku `[id].ts`:

```typescript
import type { CategoryDTO, ErrorResponseDTO, DeleteCategoryResponseDTO } from "../../../types";
```
