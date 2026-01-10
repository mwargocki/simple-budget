# Create Missing View components Plan (project)

Jako starszy programista frontendu Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia poprawek do istniejących widokow.
Poniewaz nieco zmienily sie wymagania lub zapomniano o pewnych aspektach podczas pierwotnej implementacji, Twoim celem jest zidentyfikowanie brakujących komponentów widoku i stworzenie planu ich wdrożenia.
Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć widok.

1. Product Requirements Document (PRD):
   <prd>
   @.ai/prd.md
   </prd>

2. Plany wdrożenia istniejacych widoków:
   <view_description>
   @.ai/ui-plans/
   </view_description>

3. User Stories:
   <user_stories>
   ID: US-003
   Tytuł: Wylogowanie z aplikacji
   Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję.
   Kryteria akceptacji:

- Dostępna jest akcja „Wyloguj”.
- Po wylogowaniu użytkownik nie ma dostępu do ekranów wymagających autoryzacji.
- Próba wejścia na chronione adresy URL po wylogowaniu wymaga ponownego zalogowania.
  </user_stories>

4. Endpoint Description:
   <endpoint_description>
   POST /api/auth/logout

End user session.

**Request Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - No valid session
  </endpoint_description>

5. Endpoint Implementation:
   <endpoint_implementation>
   @src/pages/api/auth/logout.ts
   </endpoint_implementation>

6. Type Definitions:
   <type_definitions>
   @src/types.ts
   </type_definitions>

7. Tech Stack:
   <tech_stack>
   @.ai/tech-stack.md
   </tech_stack>

8. New requirements:
   <new_requirements>
   - wylogowanie natychmiastowe (bez modala), czyści stan UI.
   - **Nagłówek globalny:**

- Lewa strona: e-mail użytkownika
- Środek: tytuł bieżącego widoku
- Element stały: ikona/link **Start** (tooltip „Start”) → `/app`
- Prawa strona: przycisk **Wyloguj** (bez modala)

- ## 5. Kluczowe komponenty

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

  </new_requirements>

Przed utworzeniem ostatecznego planu wdrożenia przeprowadź analizę i planowanie wewnątrz tagów <implementation_breakdown> w swoim bloku myślenia. Ta sekcja może być dość długa, ponieważ ważne jest, aby być dokładnym.

1. Dla każdej sekcji wejściowej:

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

Rozpocznij analizę i planowanie już teraz. Twój ostateczny wynik powinien składać się wyłącznie z planu wdrożenia w języku polskim w formacie markdown, który zapiszesz w pliku .ai/ui-plans/fix-views-implementation-plan.md i nie powinien powielać ani powtarzać żadnej pracy wykonanej w podziale implementacji.
