# API Endpoint Implementation Plan: POST /api/auth/login

<analysis>

## Podsumowanie kluczowych punktów specyfikacji API

- Endpoint służy do uwierzytelniania użytkownika i tworzenia sesji
- Metoda: POST
- Ścieżka: `/api/auth/login`
- Wymaga email i password w body żądania
- Zwraca 200 OK z danymi użytkownika i sesją po sukcesie
- Obsługuje błędy: 400, 401, 500
- Ważne: błąd 401 NIE ujawnia czy email istnieje (generic message)

## Wymagane i opcjonalne parametry

### Wymagane:

- `email` (string) - adres email użytkownika
- `password` (string) - hasło użytkownika

### Opcjonalne:

- Brak

## Niezbędne typy DTO i Command Modele

Z `src/types.ts`:

- `LoginCommand` - dane wejściowe logowania (email, password)
- `SessionDTO` - dane sesji (access_token, refresh_token, expires_at)
- `LoginResponseDTO` - odpowiedź z danymi użytkownika i sesją
- `ErrorResponseDTO` - struktura błędu

## Wyodrębnienie logiki do service

- Rozszerzenie `AuthService` w `src/lib/services/auth.service.ts`
- Nowa metoda `login(command: LoginCommand): Promise<LoginResponseDTO>`
- Service używa `supabase.auth.signInWithPassword()`

## Walidacja danych wejściowych

Schema Zod w `src/lib/schemas/auth.schema.ts`:

- Email - wymagany, format email
- Password - wymagany, string

## Potencjalne zagrożenia bezpieczeństwa

- Brute force attack - brak rate limitingu
- Timing attack - odpowiedź powinna być jednolita czasowo
- Enumeracja użytkowników - endpoint NIE powinien ujawniać czy email istnieje
- Session hijacking - tokeny muszą być bezpiecznie przechowywane po stronie klienta

## Scenariusze błędów

| Scenariusz                   | Kod | Typ błędu                         |
| ---------------------------- | --- | --------------------------------- |
| Brak email lub password      | 400 | VALIDATION_ERROR                  |
| Nieprawidłowy format email   | 400 | VALIDATION_ERROR                  |
| Nieprawidłowe dane logowania | 401 | UNAUTHORIZED                      |
| Email nie istnieje           | 401 | UNAUTHORIZED (ten sam komunikat!) |
| Błąd Supabase Auth           | 500 | INTERNAL_ERROR                    |

</analysis>

## 1. Przegląd punktu końcowego

Endpoint `POST /api/auth/login` umożliwia uwierzytelnienie użytkownika i utworzenie sesji w systemie SimpleBudget. Wykorzystuje Supabase Auth do weryfikacji danych logowania i generowania tokenów JWT. Po pomyślnym logowaniu zwraca dane użytkownika oraz tokeny sesji.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/auth/login`
- **Content-Type:** `application/json`

### Parametry:

#### Wymagane:

| Parametr   | Typ    | Opis                    | Walidacja                 |
| ---------- | ------ | ----------------------- | ------------------------- |
| `email`    | string | Adres email użytkownika | Poprawny format email     |
| `password` | string | Hasło użytkownika       | Wymagany, niepusty string |

#### Opcjonalne:

Brak

### Request Body:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

## 3. Wykorzystywane typy

### DTOs:

```typescript
// src/types.ts

/** Command for user login */
interface LoginCommand {
  email: string;
  password: string;
}

/** Session information returned after login */
interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/** Response after successful login */
interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: SessionDTO;
}
```

### Schema walidacji (do utworzenia):

```typescript
// src/lib/schemas/auth.schema.ts

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "v1.refresh_token_value...",
    "expires_at": 1704067200
  }
}
```

### Błąd walidacji (400 Bad Request):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Nieautoryzowany (401 Unauthorized):

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

**WAŻNE:** Komunikat błędu 401 jest generyczny i NIE ujawnia czy email istnieje w systemie.

### Błąd serwera (500 Internal Server Error):

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
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────────┐
│   Klient    │────▶│  API Route   │────▶│ AuthService │────▶│ Supabase Auth │
│             │     │   (login)    │     │             │     │  (auth.users) │
└─────────────┘     └──────────────┘     └─────────────┘     └───────────────┘
      │                    │                    │                    │
      │  POST /login       │                    │                    │
      │  {email,password}  │                    │                    │
      │───────────────────▶│                    │                    │
      │                    │  walidacja Zod     │                    │
      │                    │───────────────────▶│                    │
      │                    │                    │ signInWithPassword │
      │                    │                    │───────────────────▶│
      │                    │                    │                    │
      │                    │                    │◀───────────────────│
      │                    │◀───────────────────│  User + Session    │
      │◀───────────────────│  LoginResponseDTO  │                    │
      │  200 OK            │                    │                    │
```

### Kroki przepływu:

1. Klient wysyła żądanie POST z email i hasłem
2. API Route parsuje JSON body
3. Walidacja Zod sprawdza poprawność danych
4. AuthService wywołuje `supabase.auth.signInWithPassword()`
5. Supabase Auth weryfikuje dane i tworzy sesję
6. Service mapuje odpowiedź na `LoginResponseDTO`
7. API Route zwraca odpowiedź 200 z danymi użytkownika i sesją

## 6. Względy bezpieczeństwa

### Implementowane zabezpieczenia:

| Zabezpieczenie             | Implementacja                           | Status           |
| -------------------------- | --------------------------------------- | ---------------- |
| Walidacja email            | Zod schema z `.email()`                 | Do implementacji |
| Generyczny komunikat błędu | Ten sam komunikat dla złego email/hasła | Do implementacji |
| Bezpieczna sesja           | JWT tokens od Supabase                  | Automatyczne     |
| HTTPS                      | Wymuszane przez Supabase                | Automatyczne     |

### Ochrona przed enumeracją użytkowników:

Endpoint MUSI zwracać identyczny komunikat błędu (`"Invalid credentials"`) zarówno dla:

- Nieistniejącego emaila
- Błędnego hasła dla istniejącego użytkownika

Supabase Auth domyślnie zwraca różne komunikaty, więc należy je ujednolicić w warstwie API.

## 7. Obsługa błędów

### Mapowanie błędów:

| Błąd źródłowy             | Kod HTTP | ErrorCode        | Komunikat                      |
| ------------------------- | -------- | ---------------- | ------------------------------ |
| Zod validation failed     | 400      | VALIDATION_ERROR | "Validation failed" + details  |
| Invalid email format      | 400      | VALIDATION_ERROR | "Invalid email format"         |
| Missing password          | 400      | VALIDATION_ERROR | "Password is required"         |
| Invalid login credentials | 401      | UNAUTHORIZED     | "Invalid credentials"          |
| Email not confirmed       | 401      | UNAUTHORIZED     | "Invalid credentials"          |
| User not found            | 401      | UNAUTHORIZED     | "Invalid credentials"          |
| Supabase error            | 500      | INTERNAL_ERROR   | "An unexpected error occurred" |

### Strategia obsługi błędów:

```typescript
try {
  // Parsowanie i walidacja
  // Wywołanie service
  // Sukces: 200
} catch (error) {
  if (error instanceof AuthApiError) {
    // Wszystkie błędy auth → 401 z generycznym komunikatem
    return 401 "Invalid credentials"
  }
  // 500 Internal Error (fallback)
}
```

## 8. Rozważania dotyczące wydajności

### Obecna implementacja:

- **Singleton Supabase Client:** Współdzielony przez middleware
- **Minimalne operacje:** Tylko `signInWithPassword` do Supabase Auth
- **Brak cache:** Sesje nie są cache'owane (zarządzane przez Supabase)

### Potencjalne wąskie gardła:

| Obszar                | Ryzyko    | Mitygacja               |
| --------------------- | --------- | ----------------------- |
| Supabase Auth latency | Niskie    | Supabase edge functions |
| Walidacja Zod         | Minimalne | Prosta schema           |
| Token generation      | Minimalne | Supabase optimized      |

## 9. Etapy wdrożenia

### Struktura plików:

```
src/
├── pages/api/auth/
│   ├── register.ts      # Istniejący
│   └── login.ts         # Do utworzenia
├── lib/
│   ├── schemas/
│   │   └── auth.schema.ts   # Rozszerzenie o loginSchema
│   └── services/
│       └── auth.service.ts  # Rozszerzenie o metodę login
└── types.ts                  # Istniejące typy
```

### Kroki implementacji:

#### 1. Rozszerzenie schema walidacji (src/lib/schemas/auth.schema.ts)

- [ ] Dodanie `loginSchema` z walidacją Zod
- [ ] Walidacja formatu email
- [ ] Walidacja obecności hasła (min. 1 znak)
- [ ] Eksport typu `LoginInput`

```typescript
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

#### 2. Rozszerzenie AuthService (src/lib/services/auth.service.ts)

- [ ] Implementacja metody `login(command: LoginCommand): Promise<LoginResponseDTO>`
- [ ] Wywołanie `supabase.auth.signInWithPassword()`
- [ ] Mapowanie odpowiedzi na `LoginResponseDTO`
- [ ] Obsługa błędów Supabase (przekazanie do API route)

```typescript
async login(command: LoginCommand): Promise<LoginResponseDTO> {
  const { data, error } = await this.supabase.auth.signInWithPassword({
    email: command.email,
    password: command.password,
  });

  if (error) {
    throw error;
  }

  if (!data.user || !data.user.email || !data.session) {
    throw new Error("Login failed");
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
    },
  };
}
```

#### 3. Utworzenie API Route (src/pages/api/auth/login.ts)

- [ ] Eksport `prerender = false`
- [ ] Handler `POST` zgodny z `APIRoute`
- [ ] Parsowanie JSON body
- [ ] Walidacja z użyciem `loginSchema`
- [ ] Wywołanie `AuthService.login()`
- [ ] Obsługa błędów auth → 401 z generycznym komunikatem
- [ ] Zwracanie poprawnych nagłówków `Content-Type`

```typescript
import type { APIRoute } from "astro";
import { loginSchema } from "../../../lib/schemas/auth.schema";
import { AuthService } from "../../../lib/services/auth.service";
import type { LoginResponseDTO, ErrorResponseDTO } from "../../../types";
import { AuthApiError } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    const validation = loginSchema.safeParse(body);
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

    const authService = new AuthService(locals.supabase);
    const result: LoginResponseDTO = await authService.login(validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Auth errors → 401 with generic message
    if (error instanceof AuthApiError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
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

## 10. Podsumowanie

Endpoint `POST /api/auth/login` wymaga implementacji następujących elementów:

1. **Schema walidacji:** `loginSchema` w `auth.schema.ts`
2. **Metoda service:** `login()` w `AuthService`
3. **API Route:** `login.ts` w `src/pages/api/auth/`

Kluczowe aspekty bezpieczeństwa:

- Generyczny komunikat błędu dla wszystkich problemów z autoryzacją
- Brak ujawniania istnienia emaila w systemie
- Wykorzystanie bezpiecznego uwierzytelniania Supabase Auth
