# Dokument wymagań produktu (PRD) - SimpleBudget (MVP)

## 1. Przegląd produktu

### 1.1 Cel produktu

SimpleBudget to webowa aplikacja do szybkiego rejestrowania wydatków i prostego analizowania ich w skali miesiąca kalendarzowego, bez rozbudowanej konfiguracji i nadmiaru funkcji.

### 1.2 Grupa docelowa

„Statystyczny człowiek” chcący kontrolować codzienne wydatki (np. zakupy spożywcze, drobne usługi) w sposób możliwie prosty i szybki.

### 1.3 Założenia MVP

- Aplikacja webowa (brak aplikacji mobilnych w MVP).
- Waluta: tylko PLN, 2 miejsca po przecinku.
- Analiza: miesiąc kalendarzowy w lokalnej strefie czasowej użytkownika.
- Dwa typy transakcji: Wydatek oraz Przychód.
- Minimum kroków do dodania transakcji, domyślnie data+godzina ustawione na „teraz”.

### 1.4 Kluczowe moduły MVP

- Konto użytkownika i dostęp (rejestracja/logowanie/wylogowanie/zmiana hasła/usunięcie konta).
- Kategorie wydatków (CRUD + domyślna kategoria „Brak”).
- Transakcje (CRUD + walidacje).
- Lista transakcji z filtrowaniem (miesiąc, kategoria) i paginacją/„load more”.
- Podsumowanie miesięczne (suma całości i suma per kategoria + nawigacja do listy po kliknięciu kategorii).

### 1.5 Zasady prywatności i dostępu do danych

- Kontrola dostępu jest obowiązkowa: każdy użytkownik ma dostęp wyłącznie do własnych danych (kategorie, transakcje).

---

## 2. Problem użytkownika

### 2.1 Główna potrzeba

Użytkownicy chcą kontrolować swoje wydatki, ale zniechęcają ich rozbudowane aplikacje finansowe wymagające skomplikowanej konfiguracji i oferujące funkcje wykraczające poza podstawowe potrzeby.

### 2.2 Ból użytkownika

- Zbyt duża złożoność i czas potrzebny na start w typowych aplikacjach budżetowych.
- Brak prostego narzędzia do:
  - szybkiego dodawania wydatków,
  - przeglądu transakcji w ujęciu miesięcznym,
  - czytelnego podsumowania miesięcznego (łącznie i per kategoria).

### 2.3 Jak MVP rozwiązuje problem

- Minimalny formularz transakcji (kwota, kategoria, opcjonalny opis, domyślny czas „teraz”).
- Proste filtrowanie i szybka analiza w ramach miesiąca.
- Jasne zasady kategorii (w tym domyślna „Brak” i automatyczne przenoszenie transakcji po usunięciu kategorii).

---

## 3. Wymagania funkcjonalne

### 3.1 Konto użytkownika i uwierzytelnianie

3.1.1 Rejestracja użytkownika

- Rejestracja przy użyciu e-mail i hasła.
- Hasło wpisywane 2 razy i musi być identyczne.
- Po rejestracji użytkownik może się zalogować.

  3.1.2 Logowanie i wylogowanie

- Logowanie: e-mail + hasło.
- Wylogowanie: dostępne dla zalogowanego użytkownika, kończy sesję.

  3.1.3 Kontrola dostępu (autoryzacja)

- Każdy użytkownik widzi i modyfikuje wyłącznie własne transakcje i kategorie.
- Próby dostępu do cudzych danych są blokowane (na poziomie backendu) i zwracają właściwy błąd.

  3.1.4 Zmiana hasła (bez resetu e-mail)

- Zmiana hasła wymaga:
  - podania aktualnego hasła,
  - podania nowego hasła 2 razy (muszą być identyczne).
- Brak funkcji resetu hasła przez e-mail w MVP.

  3.1.5 Usunięcie konta

- Użytkownik może usunąć konto.
- Usunięcie konta usuwa wszystkie jego transakcje i kategorie (włącznie z informacją o nich), zgodnie z zasadą „moje dane należą do mnie”.

  3.1.6 Bezpieczeństwo haseł (wymóg minimalny przed wdrożeniem)

- Pomimo decyzji tymczasowej o przechowywaniu haseł w czystym tekście, przed wdrożeniem na produkcję wymagane jest wdrożenie minimalnego standardu bezpieczeństwa:
  - hashowanie haseł w bazie danych,
  - ochrona przed atakami brute-force (np. ograniczanie prób logowania).
- W PRD traktowane jako blokujące wydanie produkcyjne.

### 3.2 Kategorie

3.2.1 Domyślna kategoria „Brak”

- Każdy użytkownik ma nieusuwalną domyślną kategorię „Brak”.

  3.2.2 CRUD kategorii

- Tworzenie kategorii: użytkownik może dodać nową kategorię.
- Odczyt: użytkownik widzi listę własnych kategorii.
- Edycja: użytkownik może zmienić nazwę kategorii (z wyjątkiem „Brak”).
- Usuwanie: użytkownik może usunąć kategorię (z wyjątkiem „Brak”).

  3.2.3 Reguły nazw kategorii

- Nazwy kategorii są unikalne per użytkownik (case-insensitive).
- Limit długości nazwy: 30–40 znaków (system ma wymuszać limit).
- Sortowanie kategorii: alfabetyczne

  3.2.4 Skutek usunięcia kategorii

- Przy usunięciu kategorii wszystkie transakcje przypisane do tej kategorii są automatycznie przenoszone do „Brak”.
- Jeżeli użytkownik miał ustawiony filtr listy transakcji na usuwaną kategorię, filtr jest automatycznie przełączany na „Wszystkie” lub „Brak” (zgodnie z implementacją UX; minimalnie: brak pozostawienia filtra na nieistniejącej kategorii).

### 3.3 Transakcje

3.3.1 Pola transakcji

- Kwota (PLN, 2 miejsca po przecinku).
- Data i godzina (date picker + opcjonalny time picker).
- Kategoria (wymagana; musi istnieć w katalogu użytkownika).
- Opis (opcjonalny).
- Typ transakcji: Wydatek lub Przychód.

  3.3.2 Domyślne wartości i UX

- Domyślnie data+godzina ustawione na moment dodawania.
- Użytkownik może edytować wszystkie pola, w tym datę i godzinę.

  3.3.3 Walidacje transakcji

- Kwota musi być w zakresie 0,01–1 000 000,00.
- Akceptowane separatory dziesiętne: „,” i „.”.
- Kwota przechowywana w bazie jako decimal.
- Data musi być poprawna; format wejściowy dd/MM/rrrr lub wybór z date pickera.
- Kategoria musi być jedną z kategorii użytkownika (brak możliwości wpisania dowolnej wartości).

  3.3.4 CRUD transakcji

- Tworzenie transakcji: zapis po przejściu walidacji.
- Odczyt: lista transakcji (z filtrowaniem i paginacją).
- Edycja transakcji: pełna edycja pól.
- Usuwanie transakcji: natychmiastowe, z potwierdzeniem użytkownika.

  3.3.5 Zasady podsumowań względem typu transakcji

- Wydatek pomniejsza saldo w podsumowaniu.
- Przychód zwiększa saldo w podsumowaniu.

### 3.4 Lista transakcji (przegląd)

- Sortowanie: po dacie malejąco.
- Paginacja: „load more” lub klasyczna paginacja (w MVP dopuszczalne „load more” jako preferowane).
- Filtry:
  - miesiąc kalendarzowy,
  - kategoria (w tym „Wszystkie” oraz „Brak”).
- W widoku listy wyświetlana jest data i godzina transakcji.
- Wyszukiwanie po opisie: poza MVP (nie implementować w MVP).

### 3.5 Podsumowanie miesięczne

- Użytkownik wybiera miesiąc kalendarzowy w lokalnej strefie czasowej.
- Widok podsumowania pokazuje:
  - sumę wszystkich transakcji (saldo uwzględniające typ: Wydatek minus, Przychód plus),
  - sumę per kategoria (również w logice salda).
- Kliknięcie kategorii w podsumowaniu przenosi użytkownika do listy transakcji z ustawionym filtrem na tę kategorię i ten sam miesiąc.
- Wykres (kołowy/słupkowy): opcjonalny, decyzja pozostaje otwarta (nie blokuje MVP).

---

## 4. Granice produktu

### 4.1 Co wchodzi w zakres MVP

- Webowa aplikacja do rejestrowania i analizowania wydatków w skali miesiąca.
- Rejestracja/logowanie/wylogowanie.
- Kontrola dostępu do danych użytkownika.
- Zmiana hasła z użyciem aktualnego hasła.
- Usuwanie konta wraz z danymi.
- Kategorie: pełny CRUD + domyślna nieusuwalna „Brak” + zasady unikalności i przenoszenie transakcji przy usunięciu.
- Transakcje: pełny CRUD + typ Wydatek/Przychód + walidacje kwoty, daty i kategorii.
- Lista transakcji: filtrowanie po miesiącu i kategorii + sortowanie + paginacja/„load more”.
- Podsumowanie miesięczne: suma całości i suma per kategoria + nawigacja do listy po kliknięciu.

### 4.2 Co nie wchodzi w zakres MVP

- Import transakcji z banków lub plików (CSV, PDF).
- Obsługa wielu walut.
- Planowanie budżetów i limity wydatków.
- Współdzielenie konta między użytkownikami.
- Integracje z zewnętrznymi systemami finansowymi.
- Aplikacje mobilne.
- Wyszukiwanie po opisie (opcjonalne rozważenie po MVP).

### 4.3 Otwarte kwestie (do decyzji)

- Wykresy w podsumowaniu: czy w MVP, oraz czy kołowy czy słupkowy, i jakie dokładnie dane wizualizować.
- Minimalny standard bezpieczeństwa haseł: wymagane przed produkcją (hash + ochrona brute-force), mimo wcześniejszej decyzji tymczasowej.

---

## 5. Historyjki użytkowników

Poniżej zebrano komplet historyjek dla MVP, obejmujących scenariusze podstawowe, alternatywne i skrajne.

### 5.1 Konto użytkownika i dostęp

- ID: US-001
  Tytuł: Rejestracja konta
  Opis: Jako użytkownik chcę utworzyć konto za pomocą e-mail i hasła, aby móc zapisywać własne transakcje i kategorie.
  Kryteria akceptacji:
  - Formularz rejestracji zawiera pola: e-mail, hasło, powtórz hasło.
  - System odrzuca rejestrację, jeśli hasła nie są identyczne.
  - System odrzuca rejestrację, jeśli e-mail jest pusty lub w oczywiście niepoprawnym formacie.
  - System odrzuca rejestrację, jeśli e-mail jest już zarejestrowany.
  - Po poprawnej rejestracji użytkownik może się zalogować na utworzone konto.

- ID: US-002
  Tytuł: Logowanie do aplikacji
  Opis: Jako użytkownik chcę zalogować się e-mailem i hasłem, aby uzyskać dostęp do moich danych.
  Kryteria akceptacji:
  - Formularz logowania zawiera pola: e-mail i hasło.
  - System odrzuca logowanie dla niepoprawnych danych logowania i nie ujawnia, czy istnieje konto dla danego e-maila.
  - Po poprawnym logowaniu użytkownik widzi swoje dane (np. listę transakcji lub ekran startowy aplikacji).

- ID: US-003
  Tytuł: Wylogowanie z aplikacji
  Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję.
  Kryteria akceptacji:
  - Dostępna jest akcja „Wyloguj”.
  - Po wylogowaniu użytkownik nie ma dostępu do ekranów wymagających autoryzacji.
  - Próba wejścia na chronione adresy URL po wylogowaniu wymaga ponownego zalogowania.

- ID: US-004
  Tytuł: Kontrola dostępu do danych użytkownika
  Opis: Jako użytkownik chcę mieć pewność, że widzę wyłącznie swoje dane, aby zachować prywatność.
  Kryteria akceptacji:
  - Użytkownik widzi na liście kategorii wyłącznie własne kategorie (w tym „Brak”).
  - Użytkownik widzi na liście transakcji wyłącznie własne transakcje.
  - Próba odczytu/edycji/usunięcia zasobu innego użytkownika (np. przez manipulację identyfikatorem) jest blokowana przez backend i zwraca błąd autoryzacji.

- ID: US-005
  Tytuł: Zmiana hasła z użyciem aktualnego hasła
  Opis: Jako użytkownik chcę zmienić hasło podając aktualne hasło, aby utrzymać kontrolę nad kontem bez resetu e-mail.
  Kryteria akceptacji:
  - Formularz zawiera pola: aktualne hasło, nowe hasło, powtórz nowe hasło.
  - System odrzuca zmianę hasła, gdy aktualne hasło jest niepoprawne.
  - System odrzuca zmianę hasła, gdy nowe hasło i jego powtórzenie nie są identyczne.
  - Po poprawnej zmianie hasła użytkownik może się zalogować nowym hasłem, a logowanie starym hasłem nie działa.

- ID: US-006
  Tytuł: Usunięcie konta użytkownika wraz z danymi
  Opis: Jako użytkownik chcę usunąć konto i wszystkie moje dane, aby mieć kontrolę nad prywatnością.
  Kryteria akceptacji:
  - Dostępna jest akcja „Usuń konto”.
  - System wymaga potwierdzenia usunięcia konta.
  - Po usunięciu konta wszystkie transakcje i kategorie użytkownika są usunięte.
  - Po usunięciu konta użytkownik nie może się zalogować na to konto.

- ID: US-007
  Tytuł: Bezpieczne przechowywanie haseł i ochrona logowania (wymóg wydania)
  Opis: Jako właściciel produktu chcę, aby hasła były przechowywane bezpiecznie i aby logowanie było odporne na ataki brute-force, aby chronić użytkowników.
  Kryteria akceptacji:
  - Hasła są przechowywane w bazie w postaci hasha (nie w czystym tekście).
  - System ogranicza liczbę nieudanych prób logowania (np. czasowa blokada lub opóźnienie po kolejnych porażkach).
  - Po wdrożeniu zmian logowanie i rejestracja nadal działają zgodnie z US-001 i US-002.
  - W logach aplikacji rejestrowane są nieudane próby logowania (co najmniej licznik zdarzeń), bez logowania haseł.

### 5.2 Kategorie

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

### 5.3 Transakcje (dodawanie, edycja, usuwanie)

- ID: US-014
  Tytuł: Dodanie transakcji z minimalną liczbą pól
  Opis: Jako użytkownik chcę szybko dodać transakcję, aby nie tracić czasu na skomplikowane formularze.
  Kryteria akceptacji:
  - Formularz dodania transakcji zawiera: kwota, kategoria, typ (Wydatek/Przychód), opis (opcjonalny), data (domyślnie „dzisiaj”), godzina (domyślnie „teraz”).
  - Jeśli użytkownik nie zmieni daty i godziny, system zapisuje bieżący moment jako datę+godzinę transakcji.
  - Po poprawnym zapisie transakcja jest widoczna na liście transakcji.

- ID: US-015
  Tytuł: Walidacja kwoty transakcji
  Opis: Jako użytkownik chcę, aby system sprawdzał poprawność kwoty, aby uniknąć błędów w podsumowaniach.
  Kryteria akceptacji:
  - System odrzuca kwotę mniejszą niż 0,01 lub większą niż 1 000 000,00.
  - System akceptuje separator „,” oraz „.”.
  - System zapisuje kwotę z dokładnością do 2 miejsc po przecinku.
  - W przypadku błędu użytkownik widzi komunikat walidacyjny i transakcja nie jest zapisywana.

- ID: US-016
  Tytuł: Walidacja kategorii w transakcji
  Opis: Jako użytkownik chcę wybierać tylko istniejące kategorie, aby mieć spójne dane.
  Kryteria akceptacji:
  - Pole kategorii pozwala wybrać tylko kategorie użytkownika.
  - System odrzuca próbę zapisu transakcji z kategorią nieistniejącą (np. przez manipulację żądaniem).

- ID: US-017
  Tytuł: Ustawienie i edycja daty oraz godziny transakcji
  Opis: Jako użytkownik chcę ustawić lub skorygować datę i godzinę transakcji, aby zachować poprawną chronologię.
  Kryteria akceptacji:
  - Użytkownik może wybrać datę z date pickera.
  - Użytkownik może opcjonalnie wybrać godzinę z time pickera (lub edytować pole czasu).
  - Lista transakcji wyświetla datę i godzinę transakcji.
  - System odrzuca niepoprawny format daty, jeśli data jest wpisywana ręcznie (dd/MM/rrrr).

- ID: US-018
  Tytuł: Dodanie opisu do transakcji (opcjonalnie)
  Opis: Jako użytkownik chcę dodać opis, aby pamiętać kontekst wydatku lub przychodu.
  Kryteria akceptacji:
  - Opis jest polem opcjonalnym.
  - Brak opisu nie blokuje zapisu transakcji.
  - Po zapisaniu opis jest widoczny w szczegółach transakcji (lub w wierszu listy, jeśli tak zaprojektowano).

- ID: US-019
  Tytuł: Edycja transakcji
  Opis: Jako użytkownik chcę edytować transakcję, aby poprawić błędy lub zaktualizować informacje.
  Kryteria akceptacji:
  - Użytkownik może edytować: kwotę, typ, datę+godzinę, kategorię oraz opis.
  - Edycja podlega tym samym walidacjom co tworzenie.
  - Po zapisaniu zmian transakcja na liście odzwierciedla zaktualizowane dane.

- ID: US-020
  Tytuł: Usunięcie transakcji z potwierdzeniem
  Opis: Jako użytkownik chcę usunąć transakcję, aby usuwać błędne wpisy.
  Kryteria akceptacji:
  - Przy próbie usunięcia system wyświetla potwierdzenie.
  - Po potwierdzeniu transakcja jest usunięta i znika z listy.
  - Usunięcie wpływa na podsumowanie miesięczne (wartości aktualizują się).

- ID: US-021
  Tytuł: Ustawienie typu transakcji: Wydatek lub Przychód
  Opis: Jako użytkownik chcę oznaczyć transakcję jako Wydatek lub Przychód, aby saldo miesięczne było policzone poprawnie.
  Kryteria akceptacji:
  - Transakcja ma pole typu z wartościami: Wydatek, Przychód.
  - Wydatek jest liczony jako wartość ujemna w saldzie podsumowania.
  - Przychód jest liczony jako wartość dodatnia w saldzie podsumowania.
  - Zmiana typu transakcji aktualizuje podsumowanie.

### 5.4 Lista transakcji (filtrowanie, sortowanie, paginacja)

- ID: US-022
  Tytuł: Wyświetlanie listy transakcji posortowanej po dacie malejąco
  Opis: Jako użytkownik chcę widzieć najnowsze transakcje na górze, aby szybciej sprawdzać bieżące wpisy.
  Kryteria akceptacji:
  - Domyślne sortowanie listy to data+godzina malejąco.
  - Po dodaniu nowej transakcji jest ona widoczna na górze listy dla danego miesiąca (jeśli pasuje do filtrów).

- ID: US-023
  Tytuł: Filtrowanie transakcji po miesiącu kalendarzowym
  Opis: Jako użytkownik chcę filtrować transakcje po miesiącu, aby analizować wydatki w skali miesięcznej.
  Kryteria akceptacji:
  - Użytkownik może wybrać miesiąc (np. „Styczeń 2026”).
  - Lista transakcji pokazuje tylko transakcje z wybranego miesiąca w lokalnej strefie czasowej.
  - Zmiana miesiąca odświeża listę transakcji.

- ID: US-024
  Tytuł: Filtrowanie transakcji po kategorii
  Opis: Jako użytkownik chcę filtrować transakcje po kategorii, aby zobaczyć wydatki w danym obszarze.
  Kryteria akceptacji:
  - Użytkownik może wybrać kategorię lub „Wszystkie”.
  - Lista transakcji pokazuje tylko transakcje pasujące do wybranego filtra kategorii.
  - Jeśli użytkownik wybierze „Brak”, widzi transakcje przypisane do kategorii „Brak”.

- ID: US-025
  Tytuł: Ładowanie kolejnych transakcji (paginacja/Load more)
  Opis: Jako użytkownik chcę ładować kolejne transakcje, aby przeglądać długą listę bez problemów wydajnościowych.
  Kryteria akceptacji:
  - Lista wyświetla ograniczoną liczbę transakcji na ekranie początkowo.
  - Użytkownik może załadować kolejne pozycje (np. przyciskiem „Załaduj więcej”).
  - Kolejne ładowanie zachowuje aktywne filtry (miesiąc, kategoria).

### 5.5 Podsumowanie miesięczne i nawigacja analityczna

- ID: US-026
  Tytuł: Wyświetlenie podsumowania miesięcznego (saldo całości)
  Opis: Jako użytkownik chcę zobaczyć sumę miesięczną, aby wiedzieć, ile łącznie wydałem i ile zarobiłem w danym miesiącu.
  Kryteria akceptacji:
  - Podsumowanie pokazuje saldo dla wybranego miesiąca, uwzględniając typ transakcji (Wydatek minus, Przychód plus).
  - Zmiana miesiąca aktualizuje wartości w podsumowaniu.
  - Wartości są liczone na podstawie transakcji użytkownika wyłącznie z danego miesiąca.

- ID: US-027
  Tytuł: Wyświetlenie podsumowania miesięcznego per kategoria
  Opis: Jako użytkownik chcę zobaczyć sumy per kategoria, aby zrozumieć strukturę wydatków i przychodów.
  Kryteria akceptacji:
  - Podsumowanie pokazuje listę kategorii wraz z kwotą salda per kategoria dla wybranego miesiąca.
  - Kategorie są prezentowane w sposób czytelny (np. lista), a „Brak” jest widoczna zgodnie z zasadami listy kategorii.
  - Suma per kategoria wynika z transakcji przypisanych do danej kategorii w wybranym miesiącu.

- ID: US-028
  Tytuł: Przejście z podsumowania do listy transakcji po kliknięciu kategorii
  Opis: Jako użytkownik chcę kliknąć kategorię w podsumowaniu i zobaczyć pasujące transakcje, aby szybko przejść od analizy do szczegółów.
  Kryteria akceptacji:
  - Kliknięcie kategorii w podsumowaniu przenosi do listy transakcji.
  - Lista transakcji ma ustawiony filtr miesiąca zgodny z podsumowaniem oraz filtr kategorii na klikniętą kategorię.
  - Użytkownik widzi transakcje odpowiadające wybranym filtrom.

- ID: US-029
  Tytuł: Aktualizacja podsumowania po zmianach w transakcjach
  Opis: Jako użytkownik chcę, aby podsumowanie aktualizowało się po dodaniu/edycji/usunięciu transakcji, aby dane były spójne.
  Kryteria akceptacji:
  - Po dodaniu transakcji w danym miesiącu wartości w podsumowaniu dla tego miesiąca uwzględniają nową transakcję.
  - Po edycji transakcji (kwota/typ/kategoria/data) wartości w podsumowaniu aktualizują się zgodnie ze zmianą.
  - Po usunięciu transakcji wartości w podsumowaniu nie uwzględniają usuniętej pozycji.

- ID: US-030
  Tytuł: Opcjonalna wizualizacja (wykres) w podsumowaniu
  Opis: Jako użytkownik chcę zobaczyć wykres struktury wydatków, aby szybciej zrozumieć rozkład kategorii, jeśli funkcja zostanie dodana.
  Kryteria akceptacji:
  - Jeśli wykres jest wdrożony, przedstawia dane dla wybranego miesiąca.
  - Wykres nie zmienia logiki obliczeń sum (jest tylko wizualizacją).
  - Jeśli wykres nie jest wdrożony w MVP, brak tej sekcji nie blokuje korzystania z podsumowania listowego.

### 5.6 Walidacje, błędy i scenariusze skrajne

- ID: US-031
  Tytuł: Czytelne komunikaty błędów walidacji
  Opis: Jako użytkownik chcę otrzymać jasny komunikat, co jest niepoprawne, aby szybko poprawić dane.
  Kryteria akceptacji:
  - Przy błędnej kwocie system pokazuje komunikat wskazujący dozwolony zakres i wymagany format (2 miejsca po przecinku).
  - Przy błędnej dacie system pokazuje komunikat o wymaganym formacie dd/MM/rrrr lub konieczności wyboru z date pickera.
  - Przy nieprawidłowej kategorii system pokazuje komunikat, że należy wybrać kategorię z listy.
  - Komunikaty nie ujawniają danych technicznych (np. stack trace) użytkownikowi.

- ID: US-032
  Tytuł: Obsługa pustych stanów (brak danych)
  Opis: Jako użytkownik chcę widzieć sensowny komunikat, gdy nie mam transakcji, aby wiedzieć co zrobić dalej.
  Kryteria akceptacji:
  - Jeśli w wybranym miesiącu nie ma transakcji, lista pokazuje stan pusty z zachętą do dodania pierwszej transakcji.
  - Podsumowanie miesięczne dla miesiąca bez transakcji pokazuje 0,00 PLN dla sum oraz czytelny stan pusty dla listy per kategoria (lub listę kategorii z 0,00).

- ID: US-033
  Tytuł: Spójność danych po usunięciu kategorii użytej w podsumowaniu
  Opis: Jako użytkownik chcę, aby podsumowanie i lista nie „psuły się” po usunięciu kategorii, aby zachować ciągłość analizy.
  Kryteria akceptacji:
  - Po usunięciu kategorii, jej transakcje są widoczne jako przypisane do „Brak”.
  - Podsumowanie per kategoria po odświeżeniu nie zawiera usuniętej kategorii i uwzględnia transakcje w „Brak”.
  - Nawigacja z podsumowania do listy nie pozwala ustawić filtra na nieistniejącą kategorię.

### 5.7 Instrumentacja do metryk (wspierające sukces produktu)

- ID: US-034
  Tytuł: Zliczanie transakcji użytkownika w pierwszych 30 dniach od rejestracji
  Opis: Jako właściciel produktu chcę mierzyć aktywację, aby sprawdzić czy użytkownicy faktycznie używają aplikacji.
  Kryteria akceptacji:
  - System pozwala określić liczbę transakcji utworzonych przez użytkownika w oknie 30 dni od daty rejestracji.
  - Dane do pomiaru są dostępne w bazie danych (np. created_at transakcji + created_at użytkownika).

- ID: US-035
  Tytuł: Logowanie otwarć kluczowych ekranów (lista i podsumowanie)
  Opis: Jako właściciel produktu chcę wiedzieć, które ekrany są używane, aby rozumieć zachowania użytkowników.
  Kryteria akceptacji:
  - System rejestruje otwarcia co najmniej ekranów: lista transakcji, podsumowanie miesięczne.
  - Zdarzenia zawierają identyfikator użytkownika oraz znacznik czasu.
  - Zdarzenia można agregować w celu analizy użycia.

---

## 6. Metryki sukcesu

### 6.1 Aktywacja

- Cel: użytkownik dodaje co najmniej 20 transakcji w ciągu pierwszego miesiąca korzystania.
- Definicja: liczba transakcji utworzonych przez użytkownika w ciągu 30 dni od daty rejestracji.
- Pomiar:
  - źródło: baza danych,
  - warunek: transakcje powiązane z użytkownikiem, o timestamp w oknie 30 dni od user.created_at.

---

Lista kontrolna (przegląd PRD)

- Każdą historię użytkownika można przetestować: tak, kryteria akceptacji są obserwowalne i mierzalne.
- Kryteria akceptacji są jasne i konkretne: tak, zawierają warunki wejścia/wyjścia i zachowania systemu.
- Czy mamy wystarczająco dużo historyjek, aby zbudować w pełni funkcjonalną aplikację: tak, obejmują pełny zakres MVP (konto, kategorie, transakcje, lista, podsumowanie, walidacje, instrumentacja).
- Czy uwzględniliśmy wymagania dot. uwierzytelniania i autoryzacji: tak (US-001 do US-007), w tym wymóg bezpieczeństwa blokujący wydanie produkcyjne.
