# Plan implementacji widoku Rejestracja

## 1. Przegląd

Widok rejestracji umożliwia użytkownikowi utworzenie nowego konta w aplikacji SimpleBudget poprzez podanie adresu e-mail, hasła oraz potwierdzenia hasła. Po pomyślnej rejestracji użytkownik jest przekierowywany do strony logowania. Widok implementuje walidację po stronie klienta (format e-mail, zgodność haseł, minimalna długość hasła) oraz wyświetla odpowiednie komunikaty błędów, w tym czytelny komunikat przy próbie rejestracji na zajęty adres e-mail.

## 2. Routing widoku

- **Ścieżka:** `/register`
- **Plik:** `src/pages/register.astro`
- **Typ renderowania:** SSR (Server-Side Rendering) z interaktywnością React

## 3. Struktura komponentów

```
register.astro (strona Astro)
└── Layout.astro
    └── RegisterPage (React, client:load)
        └── RegisterForm (React)
            ├── EmailField (shadcn Input + Label)
            ├── PasswordField (shadcn Input + Label)
            ├── PasswordConfirmField (shadcn Input + Label)
            ├── FormError (komunikat ogólnego błędu)
            ├── SubmitButton (shadcn Button)
            └── LoginLink (link do /login)
```

## 4. Szczegóły komponentów

### 4.1. RegisterPage

- **Opis:** Główny komponent React dla widoku rejestracji. Odpowiada za wyświetlenie karty z formularzem rejestracji oraz obsługę przekierowania po udanej rejestracji.
- **Główne elementy:**
  - `<main>` z centralnie wyśrodkowanym kontenerem
  - Komponent `Card` z nagłówkiem "Utwórz konto"
  - Komponent `RegisterForm`
- **Obsługiwane interakcje:**
  - Przekierowanie do `/login` po udanej rejestracji
- **Obsługiwana walidacja:** Brak (delegowana do RegisterForm)
- **Typy:** Brak propsów
- **Propsy:** Brak

### 4.2. RegisterForm

- **Opis:** Formularz rejestracji zawierający pola e-mail, hasło, potwierdzenie hasła, przycisk submit oraz link do logowania. Obsługuje walidację inline i komunikację z API.
- **Główne elementy:**
  - `<form>` z atrybutem `noValidate`
  - Pole `email` (Input typu email + Label + inline error)
  - Pole `password` (Input typu password + Label + inline error)
  - Pole `passwordConfirm` (Input typu password + Label + inline error)
  - Ogólny komunikat błędu (Alert z wariantem destructive)
  - Przycisk "Utwórz konto" (Button)
  - Link "Mam konto" prowadzący do `/login`
- **Obsługiwane interakcje:**
  - `onChange` na polach formularza - aktualizacja stanu
  - `onBlur` na polach formularza - walidacja pola (z wyjątkiem passwordConfirm, który waliduje się tylko przy submit)
  - `onSubmit` formularza - walidacja + wywołanie API
- **Obsługiwana walidacja:**
  - **Email:**
    - Wymagane pole (nie może być puste)
    - Format e-mail (walidacja zod)
    - Komunikat pustego: "E-mail jest wymagany"
    - Komunikat formatu: "Nieprawidłowy format e-mail"
  - **Hasło:**
    - Wymagane pole (nie może być puste)
    - Minimalna długość 8 znaków
    - Komunikat pustego: "Hasło jest wymagane"
    - Komunikat długości: "Hasło musi mieć co najmniej 8 znaków"
  - **Potwierdzenie hasła:**
    - Wymagane pole (nie może być puste)
    - Musi być identyczne z hasłem
    - Komunikat niezgodności: "Hasła nie są identyczne"
- **Typy:** `RegisterFormState`, `RegisterFormErrors`, `RegisterInput`
- **Propsy:**
  - `onRegisterSuccess?: () => void` - opcjonalny callback po udanej rejestracji

## 5. Typy

### 5.1. Typy z API (istniejące w `src/types.ts`)

```typescript
// Komenda rejestracji
interface RegisterCommand {
  email: string;
  password: string;
  passwordConfirm: string;
}

// Odpowiedź po udanej rejestracji
interface RegisterResponseDTO {
  user: {
    id: string;
    email: string;
  };
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
const registerSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

type RegisterInput = z.infer<typeof registerSchema>;
```

### 5.3. Nowe typy dla widoku (ViewModel)

```typescript
// Stan formularza rejestracji
interface RegisterFormState {
  email: string;
  password: string;
  passwordConfirm: string;
  isSubmitting: boolean;
  generalError: string | null;
}

// Błędy walidacji pól formularza
interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom hook: `useRegisterForm`

Hook zarządzający całą logiką formularza rejestracji. Plik: `src/components/hooks/useRegisterForm.ts`

```typescript
function useRegisterForm(onRegisterSuccess?: () => void) {
  // Stan formularza
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    passwordConfirm: "",
    isSubmitting: false,
    generalError: null,
  });

  // Błędy walidacji
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  // Funkcje
  const handleChange: (field: keyof Omit<RegisterFormState, "isSubmitting" | "generalError">, value: string) => void;
  const handleBlur: (field: "email" | "password") => void;
  const validateField: (field: "email" | "password", value: string) => string | undefined;
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

### 6.2. Logika walidacji

- **handleChange:** Aktualizuje wartość pola i czyści błąd tego pola oraz generalError
- **handleBlur:** Waliduje pole email i password przy utracie focusu (passwordConfirm nie waliduje się przy blur, tylko przy submit)
- **validateField:** Waliduje pojedyncze pole używając fragmentu schematu zod
- **validateForm:** Waliduje cały formularz używając pełnego schematu registerSchema z refine

## 7. Integracja API

### 7.1. Endpoint

- **URL:** `POST /api/auth/register`
- **Content-Type:** `application/json`

### 7.2. Request

```typescript
interface RegisterCommand {
  email: string;
  password: string;
  passwordConfirm: string;
}
```

### 7.3. Response - sukces (201 Created)

```typescript
interface RegisterResponseDTO {
  user: {
    id: string;
    email: string;
  };
}
```

### 7.4. Response - błędy

- **400 Bad Request:** Błąd walidacji (hasła nie są identyczne, nieprawidłowy format email, hasło za krótkie)
- **409 Conflict:** Email już zarejestrowany

### 7.5. Implementacja wywołania

```typescript
async function registerUser(data: RegisterCommand): Promise<RegisterResponseDTO> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ErrorResponseDTO = await response.json();
    throw new RegisterError(response.status, errorData);
  }

  return response.json();
}
```

## 8. Interakcje użytkownika

### 8.1. Wprowadzanie danych

| Akcja                                      | Oczekiwany rezultat                                           |
| ------------------------------------------ | ------------------------------------------------------------- |
| Wpisanie tekstu w pole email               | Aktualizacja stanu `email`, usunięcie błędu pola              |
| Wpisanie tekstu w pole hasło               | Aktualizacja stanu `password`, usunięcie błędu pola           |
| Wpisanie tekstu w pole potwierdzenia hasła | Aktualizacja stanu `passwordConfirm`, usunięcie błędu pola    |
| Opuszczenie pola email (blur)              | Walidacja pola, wyświetlenie błędu inline jeśli nieprawidłowe |
| Opuszczenie pola hasło (blur)              | Walidacja pola, wyświetlenie błędu inline jeśli nieprawidłowe |

### 8.2. Wysłanie formularza

| Akcja                                              | Oczekiwany rezultat                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Kliknięcie "Utwórz konto" z pustymi polami         | Wyświetlenie błędów inline przy polach                                   |
| Kliknięcie "Utwórz konto" z nieprawidłowym emailem | Wyświetlenie błędu "Nieprawidłowy format e-mail"                         |
| Kliknięcie "Utwórz konto" z za krótkim hasłem      | Wyświetlenie błędu "Hasło musi mieć co najmniej 8 znaków"                |
| Kliknięcie "Utwórz konto" z różnymi hasłami        | Wyświetlenie błędu "Hasła nie są identyczne" przy polu passwordConfirm   |
| Kliknięcie "Utwórz konto" z prawidłowymi danymi    | Wyłączenie przycisku, loader, wywołanie API                              |
| Sukces rejestracji                                 | Przekierowanie do `/login`                                               |
| Błąd 409 (email zajęty)                            | Wyświetlenie "Ten adres e-mail jest już zarejestrowany" jako ogólny błąd |
| Błąd sieci/serwera                                 | Wyświetlenie "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."            |

### 8.3. Nawigacja

| Akcja                  | Oczekiwany rezultat        |
| ---------------------- | -------------------------- |
| Kliknięcie "Mam konto" | Przekierowanie do `/login` |

## 9. Warunki i walidacja

### 9.1. Walidacja pola email

| Warunek              | Komunikat błędu               | Moment walidacji |
| -------------------- | ----------------------------- | ---------------- |
| Pole puste           | "E-mail jest wymagany"        | onBlur, onSubmit |
| Nieprawidłowy format | "Nieprawidłowy format e-mail" | onBlur, onSubmit |

### 9.2. Walidacja pola hasło

| Warunek            | Komunikat błędu                        | Moment walidacji |
| ------------------ | -------------------------------------- | ---------------- |
| Pole puste         | "Hasło jest wymagane"                  | onBlur, onSubmit |
| Mniej niż 8 znaków | "Hasło musi mieć co najmniej 8 znaków" | onBlur, onSubmit |

### 9.3. Walidacja pola potwierdzenia hasła

| Warunek        | Komunikat błędu                     | Moment walidacji |
| -------------- | ----------------------------------- | ---------------- |
| Pole puste     | "Potwierdzenie hasła jest wymagane" | onSubmit         |
| Różne od hasła | "Hasła nie są identyczne"           | onSubmit         |

### 9.4. Walidacja ogólna formularza

- Formularz może być wysłany tylko gdy wszystkie pola przechodzą walidację
- Przycisk submit jest wyłączony podczas wysyłania (`isSubmitting`)

## 10. Obsługa błędów

### 10.1. Błędy walidacji (klient)

- Wyświetlane inline pod odpowiednim polem formularza
- Pole z błędem oznaczone atrybutem `aria-invalid="true"`
- Błąd powiązany z polem przez `aria-describedby`
- Tekst błędu w kolorze destructive (czerwony)

### 10.2. Błąd konfliktu email (409)

- Wyświetlenie ogólnego komunikatu "Ten adres e-mail jest już zarejestrowany" nad formularzem w komponencie Alert
- Formularz pozostaje wypełniony (użytkownik może zmienić email)

### 10.3. Błąd walidacji z API (400)

- Mapowanie błędów `details` na odpowiednie pola formularza
- Wyświetlenie inline pod polami

### 10.4. Błąd serwera (500) / błąd sieci

- Wyświetlenie ogólnego komunikatu "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
- Możliwość ponownego wysłania formularza

## 11. Kroki implementacji

1. **Utworzenie struktury plików:**
   - `src/pages/register.astro` - strona Astro
   - `src/components/auth/RegisterPage.tsx` - główny komponent React
   - `src/components/auth/RegisterForm.tsx` - komponent formularza
   - `src/components/hooks/useRegisterForm.ts` - custom hook

2. **Implementacja custom hook `useRegisterForm`:**
   - Stan formularza i błędów (email, password, passwordConfirm, isSubmitting, generalError)
   - Walidacja pojedynczych pól (email, password) przy onBlur
   - Walidacja całego formularza z użyciem `registerSchema` z `auth.schema.ts`
   - Obsługa wysyłki formularza z wywołaniem API `/api/auth/register`
   - Obsługa błędów API (400, 409, 500)
   - Przekierowanie do `/login` po sukcesie

3. **Implementacja komponentu `RegisterForm`:**
   - Trzy pola formularza (email, password, passwordConfirm) z walidacją inline
   - Ogólny komunikat błędu nad formularzem (Alert)
   - Przycisk submit z loaderem podczas wysyłania
   - Link do logowania
   - Integracja z hookiem `useRegisterForm`
   - Unikalne ID dla pól (useId) dla dostępności

4. **Implementacja komponentu `RegisterPage`:**
   - Layout centralny z Card
   - Nagłówek "Utwórz konto" i opis
   - Renderowanie `RegisterForm`

5. **Implementacja strony `register.astro`:**
   - Import Layout
   - Renderowanie `RegisterPage` z `client:load`

6. **Styling z Tailwind:**
   - Responsywny layout (mobile-first)
   - Stany focus, hover, disabled
   - Spójność z widokiem logowania

7. **Dostępność (a11y):**
   - Poprawne etykiety pól (`<label>` powiązane z `<input>` przez htmlFor)
   - ARIA atrybuty dla błędów (`aria-invalid`, `aria-describedby`)
   - Unikalne ID dla pól i komunikatów błędów (useId)
   - Atrybuty autocomplete: email, new-password
   - Role alert dla komunikatów błędów
