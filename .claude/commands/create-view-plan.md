# Create View Implementation Plan (project)

Jako starszy programista frontendu Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia nowego widoku w aplikacji internetowej. Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć widok.

Najpierw przejrzyj następujące informacje:

1. Product Requirements Document (PRD):
   <prd>
   @.ai/prd.md
   </prd>

2. Opis widoku:
   <view_description>
   ### Założenia nadrzędne (MVP)

- **Aplikacja webowa, desktop-only** (bez optymalizacji pod małe ekrany).
- **Strefa zalogowana** działa pod wspólnym prefiksem **`/app/*`** i ma **jeden wspólny layout** (nagłówek + globalne toasty).
- **Brak cache** danych: po wejściu na widok następuje **fetch z API**, a po mutacjach (create/update/delete) następuje **refetch** bieżącego widoku.
- **Daty i miesiące w UTC**:
  - w UI nie ma wyboru godziny; `occurred_at` traktowane jako **dzień**,
  - do API wysyłamy zawsze `YYYY-MM-DDT00:00:00Z`,
  - w UI wyświetlamy datę jako dzień w UTC (np. z `YYYY-MM-DD` → `dd/MM/yyyy`) **bez konwersji do strefy przeglądarki**,
  - wybór miesiąca i granice miesiąca są spójne z backendem (UTC).
- **Nawigacja w MVP** opiera się na **ekranie Start z kafelkami**; brak stałego menu 4 sekcji (poza linkiem Start w nagłówku).
- **Bezpieczeństwo i sesja**:
  - guard tras chronionych: **401 → `/login` + komunikat „Sesja wygasła”**,
  - **bez `returnTo`**: po zalogowaniu zawsze **`/app`**,
  - wylogowanie natychmiastowe (bez modala), czyści stan UI.

Dla widoków w strefie `/app/*` obowiązuje wspólny layout (nagłówek + toasty) oraz standard stanów: **loading / empty / error / data**.

### 2.6 Kategorie (lista + CRUD)

- **Ścieżka:** `/app/categories`
- **Główny cel:** zarządzanie kategoriami użytkownika.
- **Kluczowe informacje do wyświetlenia:**
  - Lista kategorii **alfabetycznie** (źródło prawdy: backend)
  - Wyróżnienie kategorii systemowej **„Brak”** (bez edycji/usuwania)
- **Kluczowe komponenty widoku:**
  - Lista kategorii:
    - Wiersz: nazwa, znacznik „systemowa” (dla „Brak”)
    - Akcje: „Edytuj”, „Usuń” (tylko dla niesystemowych)
  - CTA: „Dodaj kategorię” → modal/drawer (CategoryForm)
  - Usuwanie kategorii:
    - modal informacyjny o przeniesieniu transakcji do „Brak”
- **UX / dostępność / bezpieczeństwo:**
  - Walidacja nazwy: trim, brak pustych/whitespace-only, max 40, unikalność case-insensitive (obsługa 409).
  - Po usunięciu kategorii:
    - toast sukcesu,
    - w Transakcjach (jeśli filtr wskazywał usuniętą kategorię) filtr ma się przełączyć na „Wszystkie” przy kolejnej wizycie lub natychmiast (jeśli oba widoki współdzielą stan nawigacyjny/URL) — minimalnie: **nie zostawić filtra na nieistniejącej kategorii**.

## 4. Układ i struktura nawigacji

### 4.1 Strefa niezalogowana

- `/login` ↔ `/register`
- Po zalogowaniu zawsze → `/app`

### 4.2 Strefa zalogowana: wspólny layout `/app/*`

**Nagłówek globalny:**

- Lewa strona: e-mail użytkownika
- Środek: tytuł bieżącego widoku
- Element stały: ikona/link **Start** (tooltip „Start”) → `/app`
- Prawa strona: przycisk **Wyloguj** (bez modala)

**Nawigacja funkcjonalna:**

- Główna nawigacja: **kafelki na `/app`**
- Nawigacja kontekstowa:
  - w Podsumowaniu: klik kategorii → Transakcje z filtrami w URL
  - w Transakcjach: filtry (miesiąc zawsze w URL, kategoria opcjonalnie)
- URL odtwarzalny:
  - Transakcje: zawsze `month=YYYY-MM`, opcjonalnie `category_id`
  - Podsumowanie: zawsze `month=YYYY-MM`

---

## 5. Kluczowe komponenty

### 5.1 Komponenty strukturalne

- **AppLayout**: wspólny layout dla `/app/*` (nagłówek, miejsce na treść, globalne toasty).
- **AuthLayout** : prosty layout dla `/login` i `/register`.
- **RouteGuard**: ochrona tras `/app/*`; obsługa 401 → `/login` + „Sesja wygasła”.

### 5.2 Komponenty nawigacji i filtrów

- **StartTilesGrid**: 2×2 kafelki na `/app`.
- **MonthPicker**: wspólny dla Transakcji i Podsumowania (UTC, strzałki + dropdown z 13 miesiącami).
- **CategorySelect**: dropdown kategorii (w tym „Brak” jako systemowa); opcja „Wszystkie”.

### 5.3 Komponenty danych i stanów widoku

- **DataStateWrapper**: ujednolicone stany: loading / empty / error / data.
- **ErrorState**: komunikat + przycisk „Spróbuj ponownie” (refetch) dla Transakcji/Kategorii/Podsumowania.
- **EmptyState**: komunikat zależny od filtrów (np. „Brak transakcji w styczniu 2026 dla kategorii X”) + CTA.

### 5.4 Komponenty CRUD

- **TransactionListRow**: prezentacja transakcji + akcje Edytuj/Usuń.
- **TransactionFormModal/Drawer**: create/edit + walidacja inline + normalizacja kwoty + data jako dzień.
- **CategoryFormModal/Drawer**: create/edit nazwy kategorii + walidacja.
- **ConfirmDialog**:
  - dla usuwania transakcji: „Czy na pewno?”
  - dla usuwania kategorii: informacja o przeniesieniu do „Brak”

### 5.5 Komponenty pomocnicze

- **ToastSystem**: spójne komunikaty sukcesu i błędów mutacji.
- **LoadMoreButton**: loader, retry inline bez kasowania już pobranych elementów.
  </view_description>

3. User Stories:
   <user_stories>
   - ID: US-008
     Tytuł: Widoczność domyślnej kategorii „Brak”
     Opis: Jako użytkownik chcę mieć domyślną kategorię „Brak”, aby móc zapisać transakcję bez dopasowanej kategorii.
     Kryteria akceptacji:

- Po utworzeniu konta w systemie istnieje kategoria „Brak” przypisana do użytkownika.
- Kategoria „Brak” nie może zostać usunięta.

- ID: US-009
  Tytuł: Dodanie nowej kategorii
  Opis: Jako użytkownik chcę dodać kategorię, aby grupować wydatki.
  Kryteria akceptacji:
  - Użytkownik może utworzyć kategorię poprzez podanie nazwy.
  - System odrzuca nazwę dłuższą niż przyjęty limit (30–40 znaków).
  - System odrzuca nazwę, która już istnieje u użytkownika z uwzględnieniem case-insensitive.
  - Po dodaniu kategoria jest widoczna na liście kategorii.

- ID: US-010
  Tytuł: Wyświetlanie listy kategorii posortowanej
  Opis: Jako użytkownik chcę widzieć posortowaną listę kategorii, aby szybko znaleźć właściwą.
  Kryteria akceptacji:
  - Lista kategorii jest sortowana alfabetycznie.

- ID: US-011
  Tytuł: Edycja nazwy kategorii
  Opis: Jako użytkownik chcę zmienić nazwę kategorii, aby poprawić organizację danych.
  Kryteria akceptacji:
  - Użytkownik może zmienić nazwę kategorii (z wyjątkiem „Brak”).
  - System odrzuca zmianę na nazwę nieunikalną (case-insensitive) lub zbyt długą.
  - Po zmianie nazwy, transakcje przypisane do kategorii wyświetlają zaktualizowaną nazwę.

- ID: US-012
  Tytuł: Usunięcie kategorii i przeniesienie transakcji do „Brak”
  Opis: Jako użytkownik chcę usunąć kategorię, aby posprzątać listę kategorii, bez utraty transakcji.
  Kryteria akceptacji:
  - Użytkownik nie może usunąć kategorii „Brak”.
  - Przy usunięciu dowolnej innej kategorii wszystkie transakcje do niej przypisane są automatycznie przenoszone do „Brak”.
  - Po usunięciu kategoria znika z listy kategorii.

- ID: US-013
  Tytuł: Obsługa filtra kategorii po usunięciu kategorii
  Opis: Jako użytkownik chcę, aby filtr kategorii nie wskazywał nieistniejącej kategorii po jej usunięciu, aby uniknąć pustych lub błędnych widoków.
  Kryteria akceptacji:
  - Jeśli w liście transakcji aktywny jest filtr na kategorię, która zostaje usunięta, system automatycznie przełącza filtr na „Wszystkie” lub „Brak”.
  - Lista transakcji po przełączeniu filtra ładuje się poprawnie i nie odwołuje się do usuniętej kategorii.
    </user_stories>

4. Endpoint Description:
   <endpoint_description>
   #### GET /api/categories

List all categories for current user (sorted alphabetically).

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Brak",
      "is_system": true,
      "system_key": "none",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "name": "Food",
      "is_system": false,
      "system_key": null,
      "created_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session

---

#### POST /api/categories

Create a new category.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "name": "Transport"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "name": "Transport",
  "is_system": false,
  "system_key": null,
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Name empty, whitespace-only, exceeds 40 characters, or has leading/trailing spaces
- `401 Unauthorized` - No valid session
- `409 Conflict` - Category name already exists (case-insensitive)

---

#### PATCH /api/categories/{id}

Update category name.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Category ID

**Request Body:**

```json
{
  "name": "Public Transport"
}
```

**Response (200 OK):**

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

**Error Responses:**

- `400 Bad Request` - Name empty, whitespace-only, exceeds 40 characters, or has leading/trailing spaces
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Cannot modify system category ("Brak")
- `404 Not Found` - Category not found or belongs to another user
- `409 Conflict` - Category name already exists (case-insensitive)

---

#### DELETE /api/categories/{id}

Delete category and move associated transactions to "Brak".

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` (uuid) - Category ID

**Response (200 OK):**

```json
{
  "message": "Category deleted successfully",
  "transactions_moved": 5
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
- `403 Forbidden` - Cannot delete system category ("Brak")
- `404 Not Found` - Category not found or belongs to another user
  </endpoint_description>

5. Endpoint Implementation:
   <endpoint_implementation>
   @src/pages/api/categories/[id].ts, @src/pages/api/categories/index.ts
   </endpoint_implementation>

6. Type Definitions:
   <type_definitions>
   @src/types.ts
   </type_definitions>

7. Tech Stack:
   <tech_stack>
   @.ai/tech-stack.md
   </tech_stack>

Przed utworzeniem ostatecznego planu wdrożenia przeprowadź analizę i planowanie wewnątrz tagów <implementation_breakdown> w swoim bloku myślenia. Ta sekcja może być dość długa, ponieważ ważne jest, aby być dokładnym.
Część komponentów wspólnych dla różnych widoków już powinna być zaimplementowana więc możesz je ponownie wykorzystać.

W swoim podziale implementacji wykonaj następujące kroki:

1. Dla każdej sekcji wejściowej (PRD, User Stories, Endpoint Description, Endpoint Implementation, Type Definitions, Tech Stack):

- Podsumuj kluczowe punkty
- Wymień wszelkie wymagania lub ograniczenia
- Zwróć uwagę na wszelkie potencjalne wyzwania lub ważne kwestie

2. Wyodrębnienie i wypisanie kluczowych wymagań z PRD
3. Wypisanie wszystkich potrzebnych głównych komponentów, wraz z krótkim opisem ich opisu, potrzebnych typów, obsługiwanych zdarzeń i warunków walidacji
4. Stworzenie wysokopoziomowego diagramu drzewa komponentów
5. Zidentyfikuj wymagane DTO i niestandardowe typy ViewModel dla każdego komponentu widoku. Szczegółowo wyjaśnij te nowe typy, dzieląc ich pola i powiązane typy.
6. Zidentyfikuj potencjalne zmienne stanu i niestandardowe hooki, wyjaśniając ich cel i sposób ich użycia
7. Wymień wymagane wywołania API i odpowiadające im akcje frontendowe
8. Zmapuj każdej historii użytkownika do konkretnych szczegółów implementacji, komponentów lub funkcji
9. Wymień interakcje użytkownika i ich oczekiwane wyniki
10. Wymień warunki wymagane przez API i jak je weryfikować na poziomie komponentów
11. Zidentyfikuj potencjalne scenariusze błędów i zasugeruj, jak sobie z nimi poradzić
12. Wymień potencjalne wyzwania związane z wdrożeniem tego widoku i zasugeruj możliwe rozwiązania

Po przeprowadzeniu analizy dostarcz plan wdrożenia w formacie Markdown z następującymi sekcjami:

1. Przegląd: Krótkie podsumowanie widoku i jego celu.
2. Routing widoku: Określenie ścieżki, na której widok powinien być dostępny.
3. Struktura komponentów: Zarys głównych komponentów i ich hierarchii.
4. Szczegóły komponentu: Dla każdego komponentu należy opisać:

- Opis komponentu, jego przeznaczenie i z czego się składa
- Główne elementy HTML i komponenty dzieci, które budują komponent
- Obsługiwane zdarzenia
- Warunki walidacji (szczegółowe warunki, zgodnie z API)
- Typy (DTO i ViewModel) wymagane przez komponent
- Propsy, które komponent przyjmuje od rodzica (interfejs komponentu)

5. Typy: Szczegółowy opis typów wymaganych do implementacji widoku, w tym dokładny podział wszelkich nowych typów lub modeli widoku według pól i typów.
6. Zarządzanie stanem: Szczegółowy opis sposobu zarządzania stanem w widoku, określenie, czy wymagany jest customowy hook.
7. Integracja API: Wyjaśnienie sposobu integracji z dostarczonym punktem końcowym. Precyzyjnie wskazuje typy żądania i odpowiedzi.
8. Interakcje użytkownika: Szczegółowy opis interakcji użytkownika i sposobu ich obsługi.
9. Warunki i walidacja: Opisz jakie warunki są weryfikowane przez interfejs, których komponentów dotyczą i jak wpływają one na stan interfejsu
10. Obsługa błędów: Opis sposobu obsługi potencjalnych błędów lub przypadków brzegowych.
11. Kroki implementacji: Przewodnik krok po kroku dotyczący implementacji widoku.

Upewnij się, że Twój plan jest zgodny z PRD, historyjkami użytkownika i uwzględnia dostarczony stack technologiczny.

Ostateczne wyniki powinny być w języku polskim i zapisane w pliku o nazwie .ai/ui-plans/{view-name}-view-implementation-plan.md. Nie uwzględniaj żadnej analizy i planowania w końcowym wyniku.

Oto przykład tego, jak powinien wyglądać plik wyjściowy (treść jest do zastąpienia):

```markdown
# Plan implementacji widoku [Nazwa widoku]

## 1. Przegląd

[Krótki opis widoku i jego celu]

## 2. Routing widoku

[Ścieżka, na której widok powinien być dostępny]

## 3. Struktura komponentów

[Zarys głównych komponentów i ich hierarchii]

## 4. Szczegóły komponentów

### [Nazwa komponentu 1]

- Opis komponentu [opis]
- Główne elementy: [opis]
- Obsługiwane interakcje: [lista]
- Obsługiwana walidacja: [lista, szczegółowa]
- Typy: [lista]
- Propsy: [lista]

### [Nazwa komponentu 2]

[...]

## 5. Typy

[Szczegółowy opis wymaganych typów]

## 6. Zarządzanie stanem

[Opis zarządzania stanem w widoku]

## 7. Integracja API

[Wyjaśnienie integracji z dostarczonym endpointem, wskazanie typów żądania i odpowiedzi]

## 8. Interakcje użytkownika

[Szczegółowy opis interakcji użytkownika]

## 9. Warunki i walidacja

[Szczegółowy opis warunków i ich walidacji]

## 10. Obsługa błędów

[Opis obsługi potencjalnych błędów]

## 11. Kroki implementacji

1. [Krok 1]
2. [Krok 2]
3. [...]
```

Rozpocznij analizę i planowanie już teraz. Twój ostateczny wynik powinien składać się wyłącznie z planu wdrożenia w języku polskim w formacie markdown, który zapiszesz w pliku .ai/ui-plans/{view-name}-view-implementation-plan.md i nie powinien powielać ani powtarzać żadnej pracy wykonanej w podziale implementacji.
