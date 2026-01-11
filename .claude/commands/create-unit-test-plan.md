Plan testów jednostkowych (iteracyjnie, z podziałem na grupy)

## Rola i cel
Jesteś **Senior QA** z dużym doświadczeniem w projektowaniu testów jednostkowych w projektach TypeScript/JavaScript.
Twoim celem jest przygotować **plan implementacji testów jednostkowych** dla tej aplikacji.

## Tech stck
@.ai/tech-stack

## Kontekst wejściowy
Przeanalizuj dokładnie:
- `@.ai/test-plan.md`
- cały kod w `@src/`

## Zasady / ograniczenia
- **Nie pisz jeszcze testów.** Najpierw przygotuj **plan i podział na logiczne grupy**, żebyśmy mogli generować testy grupami i nie przekroczyć limitu kontekstu.
- Opieraj się wyłącznie na tym, co realnie istnieje w repo (**nie zgaduj** brakujących plików/architektury).
- Jeśli czegoś brakuje (np. brak DI, trudne mockowanie, brak separacji warstw), wypisz **ryzyka i propozycje minimalnych refaktorów** ułatwiających testowanie.
- Priorytetyzuj wg **ryzyka biznesowego**, krytyczności, złożoności i częstości zmian.

## Co masz dostarczyć (format odpowiedzi)

### 1) Szybkie podsumowanie aplikacji (maks 10 punktów)
- jakie są główne moduły, przepływy, zależności zewnętrzne, integracje

### 2) Inwentaryzacja „co testujemy”
- lista kluczowych komponentów: funkcje, serwisy, moduły, utilsy, walidacje, mapery, itp.
- dla każdego: **plik/ścieżka**, odpowiedzialność, typ zależności (**czysty kod / IO / integracje**)

### 3) Podział na logiczne grupy testów (iteracyjne)
Zaproponuj **6–12** grup. Dla każdej grupy podaj:
- **Nazwa grupy**
- **Zakres** (jakie katalogi/pliki, jakie odpowiedzialności)
- **Co konkretnie testujemy** (3–10 kluczowych przypadków)
- **Mocking/stubbing**: co mockujemy i dlaczego
- **Dane testowe**: jakie boundary/edge cases
- **Ryzyka**: co może pójść źle / trudne miejsca
- **Szacunkowy nakład** (S/M/L)
- **Priorytet** (P0/P1/P2)

### 4) Plan wykonania krok po kroku
- w jakiej kolejności realizować grupy (uzasadnij)
- I zaproponuj **2–3 najlepsze grupy na start**.

## Styl odpowiedzi
- Konkret, listy, krótkie sekcje
- Zero lania wody
- Jeśli coś jest niepewne, zaznacz to jako hipotezę i wskaż gdzie w kodzie to weryfikujesz.

Wynik końcowy zapisz w pliku `.ai/unit-test-implementation-plan.md` w formacie markdown.
