# Diagram Architektury UI - Moduł Autentykacji

<architecture_analysis>

## 1. Lista komponentów w module autentykacji

### Strony Astro
- `/src/pages/login.astro` - Strona logowania
- `/src/pages/register.astro` - Strona rejestracji

### Layouty
- `/src/layouts/AuthLayout.astro` - Layout dla stron autentykacji (logowanie, rejestracja)
- `/src/layouts/Layout.astro` - Bazowy layout aplikacji

### Komponenty React - Strony
- `LoginPage.tsx` - Kontener strony logowania z obsługą wygaśnięcia sesji
- `RegisterPage.tsx` - Kontener strony rejestracji
- `SettingsPage.tsx` - Strona ustawień (zawiera sekcje zmiany hasła i usunięcia konta)

### Komponenty React - Formularze
- `LoginForm.tsx` - Formularz logowania z polami email i hasło
- `RegisterForm.tsx` - Formularz rejestracji z polami email, hasło i potwierdzenie hasła
- `ChangePasswordForm.tsx` - Formularz zmiany hasła
- `DeleteAccountForm.tsx` - Formularz usunięcia konta

### Komponenty React - Sekcje i pomocnicze
- `SessionExpiredToast.tsx` - Powiadomienie o wygaśnięciu sesji
- `ChangePasswordSection.tsx` - Sekcja karty zmiany hasła
- `DeleteAccountSection.tsx` - Sekcja karty usunięcia konta
- `ProfileSection.tsx` - Sekcja profilu użytkownika
- `LogoutButton.tsx` - Przycisk wylogowania w nagłówku

### Hooki React (zarządzanie stanem)
- `useLoginForm.ts` - Stan i logika formularza logowania
- `useRegisterForm.ts` - Stan i logika formularza rejestracji
- `useLogout.ts` - Logika wylogowania
- `useChangePasswordForm.ts` - Stan i logika formularza zmiany hasła
- `useDeleteAccountForm.ts` - Stan i logika formularza usunięcia konta

### Schematy walidacji (Zod)
- `registerSchema` - Walidacja danych rejestracji
- `loginSchema` - Walidacja danych logowania
- `changePasswordSchema` - Walidacja danych zmiany hasła
- `deleteAccountSchema` - Walidacja potwierdzenia usunięcia konta

### Endpointy API
- `POST /api/auth/register` - Rejestracja użytkownika
- `POST /api/auth/login` - Logowanie użytkownika
- `POST /api/auth/logout` - Wylogowanie użytkownika
- `POST /api/auth/change-password` - Zmiana hasła
- `DELETE /api/auth/account` - Usunięcie konta

### Serwisy
- `AuthService` - Serwis autentykacji (register, login, logout, changePassword, deleteAccount)

### Middleware
- `onRequest` - Middleware Astro sprawdzający sesję i przekierowujący na odpowiednią stronę

### Komponenty UI (Shadcn/ui)
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Input`, `Label`, `Button`
- `Alert`, `AlertDescription`

## 2. Główne strony i odpowiadające komponenty

### Strona Logowania (`/login`)
- login.astro → AuthLayout → LoginPage → LoginForm
- Obsługuje: wygaśnięcie sesji (SessionExpiredToast)
- Hook: useLoginForm
- API: POST /api/auth/login

### Strona Rejestracji (`/register`)
- register.astro → AuthLayout → RegisterPage → RegisterForm
- Hook: useRegisterForm
- API: POST /api/auth/register

### Strona Ustawień (`/app/settings`) - powiązana z auth
- SettingsPage → ProfileSection, ChangePasswordSection, DeleteAccountSection
- ChangePasswordSection → ChangePasswordForm
- DeleteAccountSection → DeleteAccountForm
- Hooki: useChangePasswordForm, useDeleteAccountForm
- API: POST /api/auth/change-password, DELETE /api/auth/account

### Nagłówek aplikacji (wylogowanie)
- AppHeader → LogoutButton
- Hook: useLogout
- API: POST /api/auth/logout

## 3. Przepływ danych między komponentami

### Logowanie
1. LoginForm zbiera dane → useLoginForm waliduje lokalnie
2. useLoginForm wysyła POST /api/auth/login
3. API waliduje przez loginSchema → AuthService.login()
4. Sukces: przekierowanie do /app
5. Błąd: wyświetlenie komunikatu w formularzu

### Rejestracja
1. RegisterForm zbiera dane → useRegisterForm waliduje lokalnie
2. useRegisterForm wysyła POST /api/auth/register
3. API waliduje przez registerSchema → AuthService.register()
4. Sukces: przekierowanie do /login
5. Błąd: wyświetlenie komunikatu (np. email zajęty)

### Wylogowanie
1. LogoutButton → useLogout
2. useLogout wysyła POST /api/auth/logout z tokenem
3. API wywołuje AuthService.logout()
4. Sukces: przekierowanie do /login

### Zmiana hasła
1. ChangePasswordForm → useChangePasswordForm
2. Hook wysyła POST /api/auth/change-password z tokenem
3. API waliduje przez changePasswordSchema → AuthService.changePassword()
4. Sukces: toast z potwierdzeniem

### Usunięcie konta
1. DeleteAccountForm → useDeleteAccountForm
2. Hook wysyła DELETE /api/auth/account z tokenem
3. API waliduje przez deleteAccountSchema → AuthService.deleteAccount()
4. Sukces: przekierowanie do /login

## 4. Opis funkcjonalności komponentów

### Strony Astro
- **login.astro**: Renderuje stronę logowania, przekazuje parametr sessionExpired
- **register.astro**: Renderuje stronę rejestracji

### Layouty
- **AuthLayout**: Centruje formularz na ekranie, stosuje ciemne tło
- **Layout**: Bazowy layout z meta tagami

### Komponenty stron
- **LoginPage**: Zarządza wyświetlaniem toastu o wygaśnięciu sesji
- **RegisterPage**: Prosty kontener dla formularza rejestracji
- **SettingsPage**: Organizuje sekcje ustawień konta

### Formularze
- **LoginForm**: Pola email/hasło, walidacja, link do rejestracji
- **RegisterForm**: Pola email/hasło/potwierdzenie, walidacja, link do logowania
- **ChangePasswordForm**: Pola aktualne hasło/nowe hasło/potwierdzenie
- **DeleteAccountForm**: Pole potwierdzenia (wpisz DELETE)

### Pomocnicze
- **SessionExpiredToast**: Automatycznie znika po 5 sekundach
- **LogoutButton**: Pokazuje spinner podczas wylogowania

### Hooki
- Wszystkie hooki zarządzają: stanem formularza, błędami, walidacją, wysyłaniem requestów

### Serwis
- **AuthService**: Komunikacja z Supabase Auth API

### Middleware
- Sprawdza sesję przy wejściu na /
- Przekierowuje zalogowanych do /app, niezalogowanych do /login

</architecture_analysis>

<mermaid_diagram>

```mermaid
flowchart TD
    subgraph "Warstwa Routingu"
        MW[("Middleware<br/>Sprawdzenie sesji")]
        ROOT["/"]
        MW --> ROOT
        ROOT -->|"Zalogowany"| APP_REDIRECT["/app"]
        ROOT -->|"Niezalogowany"| LOGIN_REDIRECT["/login"]
    end

    subgraph "Strony Autentykacji"
        subgraph "Strona Logowania"
            LOGIN_ASTRO["login.astro"]
            AUTH_LAYOUT_LOGIN["AuthLayout"]
            LOGIN_PAGE["LoginPage"]
            LOGIN_FORM["LoginForm"]
            SESSION_TOAST["SessionExpiredToast"]

            LOGIN_ASTRO --> AUTH_LAYOUT_LOGIN
            AUTH_LAYOUT_LOGIN --> LOGIN_PAGE
            LOGIN_PAGE --> LOGIN_FORM
            LOGIN_PAGE --> SESSION_TOAST
        end

        subgraph "Strona Rejestracji"
            REGISTER_ASTRO["register.astro"]
            AUTH_LAYOUT_REG["AuthLayout"]
            REGISTER_PAGE["RegisterPage"]
            REGISTER_FORM["RegisterForm"]

            REGISTER_ASTRO --> AUTH_LAYOUT_REG
            AUTH_LAYOUT_REG --> REGISTER_PAGE
            REGISTER_PAGE --> REGISTER_FORM
        end
    end

    subgraph "Zarządzanie Kontem"
        subgraph "Strona Ustawien"
            SETTINGS_PAGE["SettingsPage"]
            PROFILE_SECTION["ProfileSection"]
            CHANGE_PWD_SECTION["ChangePasswordSection"]
            DELETE_ACC_SECTION["DeleteAccountSection"]
            CHANGE_PWD_FORM["ChangePasswordForm"]
            DELETE_ACC_FORM["DeleteAccountForm"]

            SETTINGS_PAGE --> PROFILE_SECTION
            SETTINGS_PAGE --> CHANGE_PWD_SECTION
            SETTINGS_PAGE --> DELETE_ACC_SECTION
            CHANGE_PWD_SECTION --> CHANGE_PWD_FORM
            DELETE_ACC_SECTION --> DELETE_ACC_FORM
        end

        subgraph "Naglowek Aplikacji"
            APP_HEADER["AppHeader"]
            LOGOUT_BTN["LogoutButton"]

            APP_HEADER --> LOGOUT_BTN
        end
    end

    subgraph "Hooki Zarzadzania Stanem"
        USE_LOGIN["useLoginForm"]
        USE_REGISTER["useRegisterForm"]
        USE_LOGOUT["useLogout"]
        USE_CHANGE_PWD["useChangePasswordForm"]
        USE_DELETE_ACC["useDeleteAccountForm"]
    end

    subgraph "Walidacja Zod"
        LOGIN_SCHEMA["loginSchema"]
        REGISTER_SCHEMA["registerSchema"]
        CHANGE_PWD_SCHEMA["changePasswordSchema"]
        DELETE_ACC_SCHEMA["deleteAccountSchema"]
    end

    subgraph "Warstwa API"
        API_LOGIN["POST /api/auth/login"]
        API_REGISTER["POST /api/auth/register"]
        API_LOGOUT["POST /api/auth/logout"]
        API_CHANGE_PWD["POST /api/auth/change-password"]
        API_DELETE_ACC["DELETE /api/auth/account"]
    end

    subgraph "Warstwa Serwisow"
        AUTH_SERVICE["AuthService"]
        SUPABASE["Supabase Auth"]

        AUTH_SERVICE --> SUPABASE
    end

    subgraph "Komponenty UI Wspoldzielone"
        UI_CARD["Card"]
        UI_INPUT["Input"]
        UI_BUTTON["Button"]
        UI_ALERT["Alert"]
        UI_LABEL["Label"]
    end

    %% Połączenia formularzy z hookami
    LOGIN_FORM -.-> USE_LOGIN
    REGISTER_FORM -.-> USE_REGISTER
    LOGOUT_BTN -.-> USE_LOGOUT
    CHANGE_PWD_FORM -.-> USE_CHANGE_PWD
    DELETE_ACC_FORM -.-> USE_DELETE_ACC

    %% Połączenia hooków z API
    USE_LOGIN -->|"POST"| API_LOGIN
    USE_REGISTER -->|"POST"| API_REGISTER
    USE_LOGOUT -->|"POST"| API_LOGOUT
    USE_CHANGE_PWD -->|"POST"| API_CHANGE_PWD
    USE_DELETE_ACC -->|"DELETE"| API_DELETE_ACC

    %% Połączenia API z walidacją
    API_LOGIN -.-> LOGIN_SCHEMA
    API_REGISTER -.-> REGISTER_SCHEMA
    API_CHANGE_PWD -.-> CHANGE_PWD_SCHEMA
    API_DELETE_ACC -.-> DELETE_ACC_SCHEMA

    %% Połączenia API z serwisem
    API_LOGIN --> AUTH_SERVICE
    API_REGISTER --> AUTH_SERVICE
    API_LOGOUT --> AUTH_SERVICE
    API_CHANGE_PWD --> AUTH_SERVICE
    API_DELETE_ACC --> AUTH_SERVICE

    %% Nawigacja między stronami
    LOGIN_FORM -.->|"Link"| REGISTER_ASTRO
    REGISTER_FORM -.->|"Link"| LOGIN_ASTRO

    %% Przekierowania po akcjach
    USE_LOGIN ==>|"Sukces"| APP_REDIRECT
    USE_REGISTER ==>|"Sukces"| LOGIN_ASTRO
    USE_LOGOUT ==>|"Sukces"| LOGIN_ASTRO
    USE_DELETE_ACC ==>|"Sukces"| LOGIN_ASTRO

    %% Użycie komponentów UI
    LOGIN_FORM -.-> UI_CARD
    LOGIN_FORM -.-> UI_INPUT
    LOGIN_FORM -.-> UI_BUTTON
    LOGIN_FORM -.-> UI_ALERT
    REGISTER_FORM -.-> UI_CARD
    REGISTER_FORM -.-> UI_INPUT
    REGISTER_FORM -.-> UI_BUTTON
    CHANGE_PWD_FORM -.-> UI_INPUT
    CHANGE_PWD_FORM -.-> UI_BUTTON
    DELETE_ACC_FORM -.-> UI_INPUT
    DELETE_ACC_FORM -.-> UI_BUTTON

    %% Style
    classDef astroPage fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff;
    classDef reactComponent fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#fff;
    classDef hook fill:#45b7d1,stroke:#333,stroke-width:2px,color:#fff;
    classDef api fill:#96ceb4,stroke:#333,stroke-width:2px,color:#fff;
    classDef service fill:#dda0dd,stroke:#333,stroke-width:2px,color:#fff;
    classDef schema fill:#ffeaa7,stroke:#333,stroke-width:2px,color:#333;
    classDef ui fill:#a8e6cf,stroke:#333,stroke-width:2px,color:#333;
    classDef middleware fill:#ff9ff3,stroke:#333,stroke-width:2px,color:#fff;

    class LOGIN_ASTRO,REGISTER_ASTRO astroPage;
    class AUTH_LAYOUT_LOGIN,AUTH_LAYOUT_REG,LOGIN_PAGE,REGISTER_PAGE,LOGIN_FORM,REGISTER_FORM,SESSION_TOAST,SETTINGS_PAGE,PROFILE_SECTION,CHANGE_PWD_SECTION,DELETE_ACC_SECTION,CHANGE_PWD_FORM,DELETE_ACC_FORM,APP_HEADER,LOGOUT_BTN reactComponent;
    class USE_LOGIN,USE_REGISTER,USE_LOGOUT,USE_CHANGE_PWD,USE_DELETE_ACC hook;
    class API_LOGIN,API_REGISTER,API_LOGOUT,API_CHANGE_PWD,API_DELETE_ACC api;
    class AUTH_SERVICE,SUPABASE service;
    class LOGIN_SCHEMA,REGISTER_SCHEMA,CHANGE_PWD_SCHEMA,DELETE_ACC_SCHEMA schema;
    class UI_CARD,UI_INPUT,UI_BUTTON,UI_ALERT,UI_LABEL ui;
    class MW middleware;
```

</mermaid_diagram>

## Legenda

| Kolor | Typ komponentu |
|-------|----------------|
| Czerwony | Strony Astro |
| Turkusowy | Komponenty React |
| Niebieski | Hooki React |
| Zielony | Endpointy API |
| Fioletowy | Serwisy |
| Żółty | Schematy walidacji Zod |
| Jasnozielony | Komponenty UI (Shadcn) |
| Różowy | Middleware |

## Typy połączeń

| Typ linii | Znaczenie |
|-----------|-----------|
| `-->` | Renderowanie / Zawieranie |
| `-.->` | Użycie / Zależność |
| `==>` | Przekierowanie po akcji |
