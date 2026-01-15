# API Endpoint Implementation Plan: Delete Account

## 1. Przegląd punktu końcowego

Endpoint DELETE `/api/auth/account` umożliwia uwierzytelnionemu użytkownikowi trwałe usunięcie swojego konta wraz ze wszystkimi powiązanymi danymi (profil, kategorie, transakcje). Operacja wymaga jawnego potwierdzenia poprzez przesłanie ciągu "DELETE" w celu zapobieżenia przypadkowym usunięciom.

## 2. Szczegóły żądania

- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/auth/account`
- **Nagłówki:**
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Parametry:**
  - Wymagane: brak parametrów URL
  - Opcjonalne: brak
- **Request Body:**
  ```json
  {
    "confirmation": "DELETE"
  }
  ```

## 3. Wykorzystywane typy

Typy już zdefiniowane w `src/types.ts`:

```typescript
/** Command for deleting user account */
export interface DeleteAccountCommand {
  confirmation: string;
}

/** Response after successful account deletion */
export interface DeleteAccountResponseDTO {
  message: string;
}

/** Standard error response wrapper */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "message": "Account deleted successfully"
}
```

### Błędy

| Kod statusu | Kod błędu        | Opis                                                |
| ----------- | ---------------- | --------------------------------------------------- |
| 400         | VALIDATION_ERROR | Brak pola `confirmation` lub nieprawidłowa wartość  |
| 401         | UNAUTHORIZED     | Brak nagłówka Authorization lub nieprawidłowy token |
| 500         | INTERNAL_ERROR   | Błąd podczas usuwania konta w Supabase              |

## 5. Przepływ danych

```
┌─────────────────┐
│  Klient HTTP    │
└────────┬────────┘
         │ DELETE /api/auth/account
         │ Authorization: Bearer <token>
         │ Body: { "confirmation": "DELETE" }
         ▼
┌─────────────────┐
│  API Route      │
│  (account.ts)   │
└────────┬────────┘
         │ 1. Walidacja nagłówka Authorization
         │ 2. Weryfikacja tokena (supabase.auth.getUser)
         │ 3. Walidacja body (Zod schema)
         ▼
┌─────────────────┐
│  AuthService    │
│  deleteAccount()│
└────────┬────────┘
         │ 4. Usunięcie użytkownika
         ▼
┌─────────────────┐
│  Supabase Admin │
│  auth.admin.    │
│  deleteUser()   │
└────────┬────────┘
         │ CASCADE DELETE
         │ (profiles, categories,
         │  transactions)
         ▼
┌─────────────────┐
│  auth.users     │
│  (deleted)      │
└─────────────────┘
```

## 6. Względy bezpieczeństwa

1. **Uwierzytelnienie:** Endpoint wymaga prawidłowego tokena JWT w nagłówku Authorization.

2. **Potwierdzenie operacji:** Użytkownik musi jawnie potwierdzić usunięcie, przesyłając `"confirmation": "DELETE"`. Zapobiega to przypadkowym usunięciom.

3. **Autoryzacja:** Użytkownik może usunąć tylko własne konto - ID użytkownika pobierane jest z tokena, nie z parametrów żądania.

4. **Admin API:** Do usunięcia użytkownika wymagany jest Supabase Admin Client z kluczem service_role. Należy upewnić się, że:
   - Klucz service_role jest przechowywany bezpiecznie w zmiennych środowiskowych
   - Nie jest eksponowany na frontendzie

5. **Cascade Delete:** Supabase automatycznie usunie powiązane dane dzięki kluczom obcym z `ON DELETE CASCADE`:
   - `profiles.id` → referencja do `auth.users.id`
   - `categories.user_id` → referencja do `auth.users.id`
   - `transactions.user_id` → referencja do `auth.users.id`

## 7. Obsługa błędów

| Scenariusz                                     | Kod HTTP | Kod błędu        | Komunikat                     |
| ---------------------------------------------- | -------- | ---------------- | ----------------------------- |
| Brak nagłówka Authorization                    | 401      | UNAUTHORIZED     | No valid session              |
| Nieprawidłowy format nagłówka (brak "Bearer ") | 401      | UNAUTHORIZED     | No valid session              |
| Nieprawidłowy/wygasły token                    | 401      | UNAUTHORIZED     | No valid session              |
| Brak pola `confirmation` w body                | 400      | VALIDATION_ERROR | Validation failed             |
| Wartość `confirmation` ≠ "DELETE"              | 400      | VALIDATION_ERROR | Confirmation must be "DELETE" |
| Błąd parsowania JSON                           | 400      | VALIDATION_ERROR | Invalid JSON body             |
| Błąd Supabase Admin API                        | 500      | INTERNAL_ERROR   | An unexpected error occurred  |

## 8. Rozważania dotyczące wydajności

1. **Pojedyncze wywołanie API:** Usunięcie użytkownika wymaga tylko jednego wywołania do Supabase Admin API.

2. **Cascade Delete:** Usuwanie powiązanych danych odbywa się po stronie bazy danych, co jest wydajniejsze niż wielokrotne wywołania API.

3. **Brak operacji blokujących:** Endpoint nie wymaga dodatkowych operacji takich jak wysyłanie e-maili czy czyszczenie cache.

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

Dodać do `src/lib/schemas/auth.schema.ts`:

```typescript
export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: 'Confirmation must be "DELETE"' }),
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
```

### Krok 2: Utworzenie Supabase Admin Client

Sprawdzić czy istnieje admin client w `src/db/`. Jeśli nie, utworzyć `src/db/supabase.admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### Krok 3: Rozszerzenie AuthService

Dodać metodę `deleteAccount` do `src/lib/services/auth.service.ts`:

```typescript
import { supabaseAdmin } from "../../db/supabase.admin";

async deleteAccount(userId: string): Promise<DeleteAccountResponseDTO> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }

  return {
    message: "Account deleted successfully",
  };
}
```

**Uwaga:** Metoda wymaga przekazania `userId` zamiast pobierania go z sesji, ponieważ admin client nie ma kontekstu sesji użytkownika.

### Krok 4: Utworzenie endpointu API

Utworzyć `src/pages/api/auth/account.ts`:

```typescript
import type { APIRoute } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { deleteAccountSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { DeleteAccountResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, locals }) => {
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

    // 2. Weryfikacja tokena
    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser(token);

    if (userError || !user) {
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

    // 3. Parsowanie i walidacja body
    const body = await request.json();

    const validation = deleteAccountSchema.safeParse(body);
    if (!validation.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.error.errors.map((err) => ({
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

    // 4. Usunięcie konta
    const authService = new AuthService(locals.supabase);
    const result: DeleteAccountResponseDTO = await authService.deleteAccount(user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
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

### Krok 5: Obsługa błędu parsowania JSON

Dodać obsługę wyjątku `SyntaxError` dla nieprawidłowego JSON w body:

```typescript
} catch (error) {
  if (error instanceof SyntaxError) {
    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON body",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  // ... pozostałe bloki catch
}
```

### Krok 6: Testy manualne

Wykonać testy z użyciem curl:

```bash
# Test 1: Brak Authorization header → 401
curl -X DELETE http://localhost:4321/api/auth/account \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE"}'

# Test 2: Brak confirmation → 400
curl -X DELETE http://localhost:4321/api/auth/account \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 3: Nieprawidłowa wartość confirmation → 400
curl -X DELETE http://localhost:4321/api/auth/account \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "delete"}'

# Test 4: Poprawne usunięcie → 200
curl -X DELETE http://localhost:4321/api/auth/account \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE"}'
```

### Krok 7: Weryfikacja zmiennych środowiskowych

Upewnić się, że w `.env` są zdefiniowane:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Uwaga:** `SUPABASE_SERVICE_ROLE_KEY` to klucz z pełnymi uprawnieniami i musi być traktowany jako poufny.
