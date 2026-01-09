# API Endpoint Implementation Plan: GET /api/profile

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania profilu aktualnie zalogowanego użytkownika. Profil zawiera informacje aplikacyjne użytkownika, takie jak preferowana strefa czasowa. Każdy użytkownik ma dokładnie jeden profil (relacja 1:1 z `auth.users`).

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/profile`
- **Parametry:**
  - Wymagane: Brak parametrów URL/query
  - Opcjonalne: Brak
- **Request Headers:**
  - `Authorization: Bearer <access_token>` (wymagany)
- **Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTO dla profilu - wszystkie pola z tabeli profiles
export type ProfileDTO = Omit<ProfileRow, never>;
// Zawiera: id, timezone, created_at, updated_at

// Standardowa odpowiedź błędu
export interface ErrorResponseDTO {
  error: ErrorDTO;
}

export interface ErrorDTO {
  code: ErrorCode;
  message: string;
  details?: ErrorDetailDTO[];
}
```

### Nowe typy - nie wymagane

Endpoint nie wymaga nowych typów - wykorzystuje istniejący `ProfileDTO`.

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "id": "uuid",
  "timezone": "Europe/Warsaw",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Błędy:

| Kod statusu | Kod błędu      | Opis                                                |
| ----------- | -------------- | --------------------------------------------------- |
| 401         | UNAUTHORIZED   | Brak nagłówka Authorization lub nieprawidłowy token |
| 404         | NOT_FOUND      | Profil nie został znaleziony dla użytkownika        |
| 500         | INTERNAL_ERROR | Nieoczekiwany błąd serwera                          |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Klient    │────▶│  API Endpoint    │────▶│ ProfileService  │────▶│   Supabase   │
│             │     │  (profile.ts)    │     │                 │     │  (profiles)  │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
      │                     │                        │                      │
      │ Authorization       │                        │                      │
      │ Bearer token        │ 1. Walidacja           │                      │
      │────────────────────▶│    tokena              │                      │
      │                     │                        │                      │
      │                     │ 2. getUser()           │                      │
      │                     │───────────────────────▶│                      │
      │                     │                        │                      │
      │                     │ 3. getProfile()        │                      │
      │                     │───────────────────────▶│                      │
      │                     │                        │ 4. SELECT            │
      │                     │                        │    from profiles     │
      │                     │                        │─────────────────────▶│
      │                     │                        │                      │
      │                     │                        │ 5. ProfileDTO        │
      │                     │◀───────────────────────│◀─────────────────────│
      │                     │                        │                      │
      │ 6. Response         │                        │                      │
      │◀────────────────────│                        │                      │
```

1. Klient wysyła żądanie GET z tokenem autoryzacji
2. Endpoint waliduje nagłówek Authorization
3. Endpoint weryfikuje token poprzez `supabase.auth.getUser(token)`
4. ProfileService pobiera profil użytkownika z bazy danych
5. Endpoint zwraca ProfileDTO lub odpowiedni błąd

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:

- Wymagany nagłówek `Authorization` z tokenem Bearer
- Token jest weryfikowany poprzez `locals.supabase.auth.getUser(token)`
- Brak lub nieprawidłowy token skutkuje odpowiedzią 401

### Autoryzacja:

- Użytkownik może pobrać tylko swój własny profil
- Profil jest identyfikowany przez `user.id` z zweryfikowanego tokena
- RLS (Row Level Security) na poziomie bazy danych zapewnia dodatkową warstwę ochrony

### Walidacja danych:

- Brak parametrów wejściowych do walidacji (endpoint bez parametrów)
- Jedyna walidacja to sprawdzenie formatu i ważności tokena

### Ochrona przed atakami:

- Token jest wymagany dla każdego żądania
- Brak możliwości dostępu do profilu innego użytkownika (izolacja danych)

## 7. Obsługa błędów

### Scenariusze błędów:

| Scenariusz                            | Kod HTTP | Kod błędu      | Wiadomość                    |
| ------------------------------------- | -------- | -------------- | ---------------------------- |
| Brak nagłówka Authorization           | 401      | UNAUTHORIZED   | No valid session             |
| Nagłówek nie zaczyna się od "Bearer " | 401      | UNAUTHORIZED   | No valid session             |
| Nieprawidłowy/wygasły token           | 401      | UNAUTHORIZED   | No valid session             |
| Profil nie istnieje dla użytkownika   | 404      | NOT_FOUND      | Profile not found            |
| Błąd bazy danych                      | 500      | INTERNAL_ERROR | An unexpected error occurred |
| Nieoczekiwany wyjątek                 | 500      | INTERNAL_ERROR | An unexpected error occurred |

### Implementacja obsługi błędów:

```typescript
// Przykład struktury odpowiedzi błędu
const errorResponse: ErrorResponseDTO = {
  error: {
    code: "NOT_FOUND",
    message: "Profile not found",
  },
};
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje:

- Proste zapytanie SELECT z pojedynczą tabelą - minimalne obciążenie bazy
- Indeks na kluczu głównym `id` (UUID) zapewnia szybkie wyszukiwanie
- Brak JOIN-ów ani złożonych agregacji

### Potencjalne wąskie gardła:

- Walidacja tokena przez Supabase Auth (zewnętrzne wywołanie)
- Rozwiązanie: Token jest już zweryfikowany w middleware (jeśli istnieje)

### Rozmiar odpowiedzi:

- Minimalna odpowiedź (~150-200 bajtów JSON)
- Brak potrzeby paginacji ani limitowania

## 9. Etapy wdrożenia

### Krok 1: Utworzenie ProfileService

Utwórz plik `src/lib/services/profile.service.ts`:

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { ProfileDTO } from "../../types";

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<ProfileDTO | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, timezone, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  }
}
```

### Krok 2: Utworzenie endpointu API

Utwórz plik `src/pages/api/profile.ts`:

```typescript
import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../db/supabase.client";
import { ProfileService } from "../../lib/services/profile.service";
import type { ProfileDTO, ErrorResponseDTO } from "../../types";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
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

    // 3. Get user profile
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const profileService = new ProfileService(supabaseWithAuth);
    const profile: ProfileDTO | null = await profileService.getProfile(user.id);

    if (!profile) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: "Profile not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
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

### Krok 3: Weryfikacja typów

Upewnij się, że `ProfileDTO` w `src/types.ts` jest poprawnie zdefiniowany:

- Sprawdź, czy zawiera wszystkie wymagane pola: `id`, `timezone`, `created_at`, `updated_at`
- Typ jest już zdefiniowany jako `Omit<ProfileRow, never>` - zawiera wszystkie pola

### Krok 4: Testy manualne

Przetestuj endpoint używając curl lub Postman:

```bash
# Test bez autoryzacji (oczekiwany 401)
curl -X GET http://localhost:4321/api/profile

# Test z nieprawidłowym tokenem (oczekiwany 401)
curl -X GET http://localhost:4321/api/profile \
  -H "Authorization: Bearer invalid-token"

# Test z prawidłowym tokenem (oczekiwany 200)
curl -X GET http://localhost:4321/api/profile \
  -H "Authorization: Bearer <valid-token>"
```

### Krok 5: Lint i formatowanie

```bash
npm run lint:fix
npm run format
```
