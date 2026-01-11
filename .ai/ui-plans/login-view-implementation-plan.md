# Plan implementacji widoku Logowanie

## 1. Przegląd

Widok logowania umożliwia użytkownikowi uwierzytelnienie się w aplikacji SimpleBudget poprzez podanie adresu e-mail i hasła. Po pomyślnym zalogowaniu użytkownik jest przekierowywany do głównego widoku aplikacji (`/app`). Widok implementuje walidację po stronie klienta oraz wyświetla odpowiednie komunikaty błędów, dbając o bezpieczeństwo (nie ujawnia, czy dany e-mail istnieje w systemie).

## 2. Routing widoku

- **Ścieżka:** `/login`
- **Plik:** `src/pages/login.astro`
- **Typ renderowania:** SSR (Server-Side Rendering) z interaktywnością React

## 3. Struktura komponentów

```
login.astro (strona Astro)
└── Layout.astro
    └── LoginPage (React, client:load)
        ├── SessionExpiredToast (React, opcjonalny)
        └── LoginForm (React)
            ├── EmailField (shadcn Input + Label)
            ├── PasswordField (shadcn Input + Label)
            ├── FormError (komunikat ogólnego błędu)
            ├── SubmitButton (shadcn Button)
            └── RegisterLink (link do /register)
```

## 4. Szczegóły komponentów

### 4.1. LoginPage

- **Opis:** Główny komponent React dla widoku logowania. Zarządza stanem formularza, komunikacją z API i obsługą błędów. Wyświetla opcjonalny toast o wygaśnięciu sesji.
- **Główne elementy:**
  - `<main>` z centralnie wyśrodkowanym kontenerem
  - Nagłówek z tytułem "Zaloguj się"
  - Komponent `SessionExpiredToast` (renderowany warunkowo)
  - Komponent `LoginForm`
- **Obsługiwane interakcje:**
  - Odczyt parametru URL `?sessionExpired=true` do wyświetlenia toastu
- **Obsługiwana walidacja:** Brak (delegowana do LoginForm)
- **Typy:** `LoginPageProps`
- **Propsy:**
  - `sessionExpired?: boolean` - flaga wskazująca czy pokazać toast o wygaśnięciu sesji

### 4.2. SessionExpiredToast

- **Opis:** Komponent wyświetlający informację o wygaśnięciu sesji. Pojawia się gdy użytkownik został przekierowany z powodu błędu 401.
- **Główne elementy:**
  - Banner lub toast z komunikatem "Sesja wygasła. Zaloguj się ponownie."
  - Ikona ostrzeżenia
  - Przycisk zamknięcia (opcjonalnie)
- **Obsługiwane interakcje:**
  - Zamknięcie toastu (kliknięcie przycisku X lub automatyczne ukrycie po czasie)
- **Obsługiwana walidacja:** Brak
- **Typy:** `SessionExpiredToastProps`
- **Propsy:**
  - `visible: boolean` - czy toast jest widoczny
  - `onClose: () => void` - callback do zamknięcia toastu

### 4.3. LoginForm

- **Opis:** Formularz logowania zawierający pola e-mail i hasło, przycisk submit oraz link do rejestracji. Obsługuje walidację i komunikację z API.
- **Główne elementy:**
  - `<form>` z atrybutem `noValidate`
  - Pole `email` (Input + Label + inline error)
  - Pole `password` (Input typu password + Label + inline error)
  - Ogólny komunikat błędu logowania (FormError)
  - Przycisk "Zaloguj" (Button)
  - Link "Utwórz konto" prowadzący do `/register`
- **Obsługiwane interakcje:**
  - `onChange` na polach formularza - aktualizacja stanu
  - `onBlur` na polach formularza - walidacja pola
  - `onSubmit` formularza - walidacja + wywołanie API
- **Obsługiwana walidacja:**
  - **Email:**
    - Wymagane pole (nie może być puste)
    - Format e-mail (walidacja regex/zod)
    - Komunikat: "Nieprawidłowy format e-mail"
  - **Hasło:**
    - Wymagane pole (nie może być puste)
    - Komunikat: "Hasło jest wymagane"
- **Typy:** `LoginFormState`, `LoginFormErrors`, `LoginInput`
- **Propsy:**
  - `onLoginSuccess?: () => void` - opcjonalny callback po udanym logowaniu

## 5. Typy

### 5.1. Typy z API (istniejące w `src/types.ts`)

```typescript
// Komenda logowania
interface LoginCommand {
  email: string;
  password: string;
}

// Odpowiedź po udanym logowaniu
interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: SessionDTO;
}

interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Odpowiedź błędu
interface ErrorResponseDTO {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailDTO[];
  };
}

interface ErrorDetailDTO {
  field: string;
  message: string;
}

type ErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
```

### 5.2. Typy z walidacji (istniejące w `src/lib/schemas/auth.schema.ts`)

```typescript
// Schemat walidacji Zod
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;
```

### 5.3. Nowe typy dla widoku (ViewModel)

```typescript
// Stan formularza logowania
interface LoginFormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  generalError: string | null;
}

// Błędy walidacji pól formularza
interface LoginFormErrors {
  email?: string;
  password?: string;
}

// Propsy dla LoginPage
interface LoginPageProps {
  sessionExpired?: boolean;
}

// Propsy dla SessionExpiredToast
interface SessionExpiredToastProps {
  visible: boolean;
  onClose: () => void;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom hook: `useLoginForm`

Hook zarządzający całą logiką formularza logowania.

```typescript
function useLoginForm() {
  // Stan formularza
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    isSubmitting: false,
    generalError: null,
  });

  // Błędy walidacji
  const [errors, setErrors] = useState<LoginFormErrors>({});

  // Funkcje
  const handleChange: (field: keyof LoginInput, value: string) => void;
  const handleBlur: (field: keyof LoginInput) => void;
  const validateField: (field: keyof LoginInput) => boolean;
  const validateForm: () => boolean;
  const handleSubmit: (e: FormEvent) => Promise<void>;
  const resetForm: () => void;

  return {
    formState,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}
```

### 6.2. Stan toastu sesji wygasłej

Zarządzany lokalnie w komponencie `LoginPage`:

```typescript
const [showSessionExpiredToast, setShowSessionExpiredToast] = useState(sessionExpired);
```

## 7. Integracja API

### 7.1. Endpoint

- **URL:** `POST /api/auth/login`
- **Content-Type:** `application/json`

### 7.2. Request

```typescript
interface LoginCommand {
  email: string;
  password: string;
}
```

### 7.3. Response - sukces (200 OK)

```typescript
interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
```

### 7.4. Response - błędy

- **400 Bad Request:** Błąd walidacji (brakujące pola)
- **401 Unauthorized:** Nieprawidłowe dane logowania (generyczny komunikat)

### 7.5. Implementacja wywołania

```typescript
async function loginUser(credentials: LoginCommand): Promise<LoginResponseDTO> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData: ErrorResponseDTO = await response.json();
    throw new LoginError(errorData.error.code, errorData.error.message);
  }

  return response.json();
}
```

## 8. Interakcje użytkownika

### 8.1. Wprowadzanie danych

| Akcja                        | Oczekiwany rezultat                                           |
| ---------------------------- | ------------------------------------------------------------- |
| Wpisanie tekstu w pole email | Aktualizacja stanu `email`, usunięcie błędu pola              |
| Wpisanie tekstu w pole hasło | Aktualizacja stanu `password`, usunięcie błędu pola           |
| Opuszczenie pola (blur)      | Walidacja pola, wyświetlenie błędu inline jeśli nieprawidłowe |

### 8.2. Wysłanie formularza

| Akcja                                         | Oczekiwany rezultat                                           |
| --------------------------------------------- | ------------------------------------------------------------- |
| Kliknięcie "Zaloguj" z pustymi polami         | Wyświetlenie błędów inline przy polach                        |
| Kliknięcie "Zaloguj" z nieprawidłowym emailem | Wyświetlenie błędu "Nieprawidłowy format e-mail"              |
| Kliknięcie "Zaloguj" z prawidłowymi danymi    | Wyłączenie przycisku, loader, wywołanie API                   |
| Sukces logowania                              | Przekierowanie do `/app`                                      |
| Błąd 401                                      | Wyświetlenie "Nieprawidłowe dane logowania" jako ogólny błąd  |
| Błąd sieci/serwera                            | Wyświetlenie "Wystąpił nieoczekiwany błąd. Spróbuj ponownie." |

### 8.3. Nawigacja

| Akcja                            | Oczekiwany rezultat           |
| -------------------------------- | ----------------------------- |
| Kliknięcie "Utwórz konto"        | Przekierowanie do `/register` |
| Zamknięcie toastu sesji wygasłej | Ukrycie toastu                |

## 9. Warunki i walidacja

### 9.1. Walidacja pola email

| Warunek              | Komunikat błędu               | Moment walidacji |
| -------------------- | ----------------------------- | ---------------- |
| Pole puste           | "E-mail jest wymagany"        | onBlur, onSubmit |
| Nieprawidłowy format | "Nieprawidłowy format e-mail" | onBlur, onSubmit |

### 9.2. Walidacja pola hasło

| Warunek    | Komunikat błędu       | Moment walidacji |
| ---------- | --------------------- | ---------------- |
| Pole puste | "Hasło jest wymagane" | onBlur, onSubmit |

### 9.3. Walidacja ogólna formularza

- Formularz może być wysłany tylko gdy wszystkie pola przechodzą walidację
- Przycisk submit jest wyłączony podczas wysyłania (`isSubmitting`)

## 10. Obsługa błędów

### 10.1. Błędy walidacji (klient)

- Wyświetlane inline pod odpowiednim polem formularza
- Czerwona ramka na polu z błędem
- Ikona błędu (opcjonalnie)
- Tekst błędu w kolorze czerwonym

### 10.2. Błąd uwierzytelnienia (401)

- Wyświetlenie ogólnego komunikatu "Nieprawidłowe dane logowania" nad formularzem
- NIE ujawniamy czy e-mail istnieje w systemie
- Formularz pozostaje wypełniony (użytkownik może poprawić dane)

### 10.3. Błąd walidacji z API (400)

- Mapowanie błędów `details` na odpowiednie pola formularza
- Wyświetlenie inline pod polami

### 10.4. Błąd serwera (500) / błąd sieci

- Wyświetlenie ogólnego komunikatu "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
- Możliwość ponownego wysłania formularza

### 10.5. Sesja wygasła

- Toast/banner z komunikatem "Sesja wygasła. Zaloguj się ponownie."
- Wyświetlany gdy URL zawiera parametr `?sessionExpired=true`
- Automatyczne ukrycie po 5 sekundach lub kliknięcie X

## 11. Kroki implementacji

1. **Utworzenie struktury plików:**
   - `src/pages/login.astro` - strona Astro
   - `src/components/auth/LoginPage.tsx` - główny komponent React
   - `src/components/auth/LoginForm.tsx` - komponent formularza
   - `src/components/auth/SessionExpiredToast.tsx` - komponent toastu
   - `src/components/hooks/useLoginForm.ts` - custom hook

2. **Instalacja brakujących komponentów shadcn/ui:**
   - Input
   - Label
   - Card (opcjonalnie, dla layoutu)
   - Alert (dla komunikatów błędów)
   - Toast (dla SessionExpiredToast)

3. **Implementacja custom hook `useLoginForm`:**
   - Stan formularza i błędów
   - Walidacja z użyciem `loginSchema` z `auth.schema.ts`
   - Obsługa wysyłki formularza
   - Integracja z API `/api/auth/login`

4. **Implementacja komponentu `SessionExpiredToast`:**
   - Stylowanie z Tailwind
   - Auto-hide po 5 sekundach
   - Przycisk zamknięcia

5. **Implementacja komponentu `LoginForm`:**
   - Pola formularza z walidacją inline
   - Obsługa stanów (loading, error)
   - Link do rejestracji
   - Integracja z hookiem `useLoginForm`

6. **Implementacja komponentu `LoginPage`:**
   - Layout centralny
   - Odczyt parametru `sessionExpired` z URL
   - Renderowanie toastu i formularza
   - Obsługa przekierowania po sukcesie

7. **Implementacja strony `login.astro`:**
   - Import Layout
   - Odczyt parametru query `sessionExpired`
   - Renderowanie `LoginPage` z `client:load`

8. **Styling z Tailwind:**
   - Responsywny layout (mobile-first)
   - Stany focus, hover, disabled
   - Tryb ciemny (dark mode)

9. **Dostępność (a11y):**
   - Poprawne etykiety pól (`<label>` powiązane z `<input>`)
   - ARIA atrybuty dla błędów (`aria-invalid`, `aria-describedby`)
   - Focus management po błędzie
   - Czytelne komunikaty błędów dla screen readerów
