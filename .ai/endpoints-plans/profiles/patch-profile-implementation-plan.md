# API Endpoint Implementation Plan: PATCH /api/profile

## 1. Przegląd punktu końcowego

Endpoint służy do aktualizacji profilu bieżącego użytkownika. Umożliwia zmianę strefy czasowej (`timezone`) przypisanej do konta użytkownika. Endpoint wymaga autoryzacji i pozwala użytkownikowi modyfikować wyłącznie własny profil.

## 2. Szczegóły żądania

- **Metoda HTTP**: PATCH
- **Struktura URL**: `/api/profile`
- **Parametry**:
  - Wymagane: brak (parametry URL)
  - Opcjonalne: brak
- **Nagłówki**:
  - `Authorization: Bearer <access_token>` (wymagany)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "timezone": "string (1-64 znaków)"
}
```

## 3. Wykorzystywane typy

### Istniejące typy (src/types.ts)

- `ProfileDTO` - reprezentacja profilu użytkownika zwracana w odpowiedzi
- `UpdateProfileCommand` - komenda do aktualizacji profilu (zawiera pole `timezone: string`)
- `ErrorResponseDTO` - standardowa struktura błędu API
- `ErrorDetailDTO` - szczegóły błędu walidacji pola

### Nowy schemat walidacji (src/lib/schemas/profile.schema.ts)

```typescript
import { z } from "zod";

export const updateProfileSchema = z.object({
  timezone: z.string().min(1, "Timezone is required").max(64, "Timezone must be at most 64 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "id": "uuid",
  "timezone": "America/New_York",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

### Błędy

| Kod | Opis                         | Struktura odpowiedzi                                        |
| --- | ---------------------------- | ----------------------------------------------------------- |
| 400 | Nieprawidłowe dane wejściowe | `ErrorResponseDTO` z `code: "VALIDATION_ERROR"` i `details` |
| 401 | Brak/nieprawidłowy token     | `ErrorResponseDTO` z `code: "UNAUTHORIZED"`                 |
| 404 | Profil nie znaleziony        | `ErrorResponseDTO` z `code: "NOT_FOUND"`                    |
| 500 | Błąd serwera                 | `ErrorResponseDTO` z `code: "INTERNAL_ERROR"`               |

## 5. Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│   Klient    │────▶│ API Endpoint │────▶│ ProfileService │────▶│   Supabase   │
│             │     │  (PATCH)     │     │                │     │   profiles   │
└─────────────┘     └──────────────┘     └────────────────┘     └──────────────┘
      │                    │                     │                      │
      │  1. Request        │                     │                      │
      │  + Bearer token    │                     │                      │
      │───────────────────▶│                     │                      │
      │                    │  2. Validate token  │                      │
      │                    │─────────────────────│─────────────────────▶│
      │                    │                     │  3. getUser()        │
      │                    │◀────────────────────│◀─────────────────────│
      │                    │                     │                      │
      │                    │  4. Validate body   │                      │
      │                    │  (Zod schema)       │                      │
      │                    │                     │                      │
      │                    │  5. updateProfile() │                      │
      │                    │────────────────────▶│                      │
      │                    │                     │  6. UPDATE profiles  │
      │                    │                     │─────────────────────▶│
      │                    │                     │◀─────────────────────│
      │                    │◀────────────────────│                      │
      │  7. Response       │                     │                      │
      │◀───────────────────│                     │                      │
```

1. Klient wysyła żądanie PATCH z tokenem Bearer i body zawierającym `timezone`
2. Endpoint weryfikuje obecność i format nagłówka Authorization
3. Walidacja tokenu poprzez `supabase.auth.getUser(token)`
4. Walidacja body żądania za pomocą schematu Zod
5. Utworzenie `ProfileService` z klientem Supabase z autoryzacją
6. Wywołanie `profileService.updateProfile(userId, command)`
7. Zwrócenie zaktualizowanego profilu lub odpowiedzi błędu

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymagany Bearer token w nagłówku Authorization
- Token weryfikowany przez Supabase Auth (`getUser`)
- Użycie `createSupabaseClientWithAuth(token)` dla operacji na bazie

### Autoryzacja

- Row Level Security (RLS) w Supabase zapewnia, że użytkownik może modyfikować tylko swój profil
- ID użytkownika pobierane z zweryfikowanego tokenu, nie z body żądania

### Walidacja danych

- Schemat Zod waliduje:
  - Obecność pola `timezone`
  - Długość 1-64 znaków (zgodnie z CHECK constraint w bazie)
- Baza danych posiada dodatkowy CHECK constraint jako zabezpieczenie

### Ochrona przed atakami

- Brak możliwości SQL injection - używany Supabase query builder
- Walidacja długości stringa zapobiega atakom buffer overflow

## 7. Obsługa błędów

| Scenariusz                  | Kod HTTP | Kod błędu        | Wiadomość                              |
| --------------------------- | -------- | ---------------- | -------------------------------------- |
| Brak nagłówka Authorization | 401      | UNAUTHORIZED     | No valid session                       |
| Nieprawidłowy format tokenu | 401      | UNAUTHORIZED     | No valid session                       |
| Token wygasły/nieważny      | 401      | UNAUTHORIZED     | No valid session                       |
| Brak pola timezone w body   | 400      | VALIDATION_ERROR | Validation failed + details            |
| Timezone pusty string       | 400      | VALIDATION_ERROR | Timezone is required                   |
| Timezone > 64 znaków        | 400      | VALIDATION_ERROR | Timezone must be at most 64 characters |
| Profil nie istnieje         | 404      | NOT_FOUND        | Profile not found                      |
| Błąd bazy danych            | 500      | INTERNAL_ERROR   | An unexpected error occurred           |

## 8. Rozważania dotyczące wydajności

- **Pojedyncze zapytanie**: Operacja UPDATE zwraca zaktualizowany rekord w jednym zapytaniu
- **Indeksowanie**: Kolumna `id` jest kluczem głównym, więc UPDATE jest szybki
- **Trigger updated_at**: Automatyczna aktualizacja `updated_at` przez trigger bazodanowy
- **Brak dodatkowych zapytań**: Nie ma potrzeby osobnego SELECT po UPDATE

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji

Utworzyć plik `src/lib/schemas/profile.schema.ts`:

```typescript
import { z } from "zod";

export const updateProfileSchema = z.object({
  timezone: z.string().min(1, "Timezone is required").max(64, "Timezone must be at most 64 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

### Krok 2: Rozszerzenie ProfileService

Dodać metodę `updateProfile` w `src/lib/services/profile.service.ts`:

```typescript
async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileDTO> {
  const { data, error } = await this.supabase
    .from("profiles")
    .update({ timezone: command.timezone })
    .eq("id", userId)
    .select("id, timezone, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ProfileNotFoundError();
    }
    throw error;
  }

  return data;
}
```

### Krok 3: Dodanie handlera PATCH w endpoint

Dodać eksport `PATCH` w `src/pages/api/profile.ts`:

1. Ekstrakcja i walidacja nagłówka Authorization
2. Weryfikacja tokenu przez `locals.supabase.auth.getUser(token)`
3. Parsowanie i walidacja body żądania przez `updateProfileSchema`
4. Utworzenie `ProfileService` z autoryzowanym klientem
5. Wywołanie `profileService.updateProfile(user.id, validatedData)`
6. Obsługa wyjątku `ProfileNotFoundError` → 404
7. Zwrócenie zaktualizowanego profilu (200) lub błędu

### Krok 4: Testy manualne

Przetestować endpoint za pomocą curl:

```bash
# Sukces
curl -X PATCH http://localhost:4321/api/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America/New_York"}'

# Błąd walidacji - pusty timezone
curl -X PATCH http://localhost:4321/api/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": ""}'

# Błąd walidacji - za długi timezone
curl -X PATCH http://localhost:4321/api/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "aaaa...65 znaków..."}'

# Brak autoryzacji
curl -X PATCH http://localhost:4321/api/profile \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Europe/Warsaw"}'
```
