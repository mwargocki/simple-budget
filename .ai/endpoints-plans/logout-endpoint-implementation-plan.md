# API Endpoint Implementation Plan: POST /api/auth/logout

## 1. Przegląd punktu końcowego

Endpoint służy do zakończenia sesji zalogowanego użytkownika. Po wywołaniu unieważnia aktywną sesję w Supabase Auth, co powoduje utratę ważności tokenów dostępu i odświeżania.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/auth/logout`
- **Parametry:**
  - Wymagane: Nagłówek `Authorization: Bearer <access_token>`
  - Opcjonalne: Brak
- **Request Body:** Brak (endpoint nie wymaga żadnych danych w ciele żądania)

## 3. Wykorzystywane typy

Typy zdefiniowane w `src/types.ts`:

```typescript
/** Response after successful logout */
export interface LogoutResponseDTO {
  message: string;
}

/** Standard error response wrapper */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}
```

Nie jest wymagany Command Model, ponieważ endpoint nie przyjmuje danych wejściowych poza nagłówkiem autoryzacji.

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "message": "Logged out successfully"
}
```

### Błąd autoryzacji (401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No valid session"
  }
}
```

### Błąd serwera (500 Internal Server Error)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

1. Klient wysyła żądanie POST z nagłówkiem Authorization zawierającym Bearer token.
2. Endpoint wyodrębnia token z nagłówka Authorization.
3. Endpoint ustawia sesję w kliencie Supabase używając tokenu.
4. Wywołanie `AuthService.logout()` wykonuje `supabase.auth.signOut()`.
5. Supabase Auth unieważnia sesję po stronie serwera.
6. Endpoint zwraca odpowiedź z komunikatem potwierdzającym wylogowanie.

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Klient  │────▶│ API Endpoint │────▶│ AuthService │────▶│ Supabase Auth│
└─────────┘     └──────────────┘     └─────────────┘     └──────────────┘
     │                 │                    │                    │
     │  POST /logout   │                    │                    │
     │  + Bearer token │                    │                    │
     │                 │   setSession()     │                    │
     │                 │───────────────────▶│                    │
     │                 │                    │    signOut()       │
     │                 │                    │───────────────────▶│
     │                 │                    │                    │
     │                 │                    │◀───────────────────│
     │                 │◀───────────────────│                    │
     │◀────────────────│                    │                    │
     │  200 OK         │                    │                    │
```

## 6. Względy bezpieczeństwa

1. **Walidacja tokenu:** Token z nagłówka Authorization musi być walidowany przez Supabase przed wykonaniem operacji wylogowania.

2. **Ustawienie sesji:** Przed wywołaniem `signOut()` należy ustawić sesję w kliencie Supabase używając tokenu z nagłówka, aby operacja wykonała się w kontekście właściwego użytkownika.

3. **Brak wycieku informacji:** W przypadku błędu autoryzacji zwracany jest generyczny komunikat "No valid session" bez szczegółów technicznych.

4. **Scope wylogowania:** Użycie `scope: 'global'` w `signOut()` zapewnia unieważnienie wszystkich sesji użytkownika (rekomendowane dla pełnego bezpieczeństwa).

5. **HTTPS:** Endpoint powinien być dostępny tylko przez HTTPS w środowisku produkcyjnym (obsługiwane przez infrastrukturę).

## 7. Obsługa błędów

| Scenariusz                          | Kod statusu | ErrorCode      | Komunikat                    |
| ----------------------------------- | ----------- | -------------- | ---------------------------- |
| Brak nagłówka Authorization         | 401         | UNAUTHORIZED   | No valid session             |
| Nieprawidłowy format tokenu         | 401         | UNAUTHORIZED   | No valid session             |
| Token wygasł lub jest nieprawidłowy | 401         | UNAUTHORIZED   | No valid session             |
| Brak aktywnej sesji                 | 401         | UNAUTHORIZED   | No valid session             |
| Błąd Supabase Auth                  | 401         | UNAUTHORIZED   | No valid session             |
| Nieoczekiwany błąd serwera          | 500         | INTERNAL_ERROR | An unexpected error occurred |

## 8. Rozważania dotyczące wydajności

1. **Pojedyncze wywołanie API:** Endpoint wykonuje tylko jedno wywołanie do Supabase Auth (`signOut`), co minimalizuje opóźnienia.

2. **Brak operacji bazodanowych:** Wylogowanie nie wymaga bezpośrednich operacji na bazie danych poza wbudowaną logiką Supabase Auth.

3. **Brak potrzeby cache'owania:** Operacja wylogowania z natury nie korzysta z cache'u i powinna zawsze wykonywać się na żywo.

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie AuthService

Dodaj metodę `logout()` do `src/lib/services/auth.service.ts`:

```typescript
async logout(): Promise<LogoutResponseDTO> {
  const { error } = await this.supabase.auth.signOut({ scope: 'global' });

  if (error) {
    throw error;
  }

  return {
    message: "Logged out successfully",
  };
}
```

Zaktualizuj importy w pliku serwisu, dodając `LogoutResponseDTO`.

### Krok 2: Utworzenie pliku endpointu

Utwórz plik `src/pages/api/auth/logout.ts`:

```typescript
import type { APIRoute } from "astro";
import { AuthApiError } from "@supabase/supabase-js";
import { AuthService } from "../../../lib/services/auth.service";
import type { LogoutResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Extract Authorization header
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

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Set session in Supabase client
    const { error: sessionError } = await locals.supabase.auth.setSession({
      access_token: token,
      refresh_token: "", // Not needed for signOut
    });

    if (sessionError) {
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

    const authService = new AuthService(locals.supabase);
    const result: LogoutResponseDTO = await authService.logout();

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

### Krok 3: Testowanie

1. **Test pozytywny:** Wysłanie żądania POST z prawidłowym tokenem Bearer powinno zwrócić 200 OK z komunikatem.

2. **Test bez nagłówka:** Żądanie bez nagłówka Authorization powinno zwrócić 401.

3. **Test z nieprawidłowym tokenem:** Żądanie z nieprawidłowym lub wygasłym tokenem powinno zwrócić 401.

4. **Test z nieprawidłowym formatem:** Żądanie z nagłówkiem Authorization bez prefiksu "Bearer " powinno zwrócić 401.
