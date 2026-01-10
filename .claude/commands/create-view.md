# Create View Implementation (project)

Twoim zadaniem jest zaimplementowanie widoku frontendu w oparciu o podany plan implementacji i zasady implementacji. Twoim celem jest stworzenie szczegółowej i dokładnej implementacji, która jest zgodna z dostarczonym planem, poprawnie reprezentuje strukturę komponentów, integruje się z API i obsługuje wszystkie określone interakcje użytkownika.

Najpierw przejrzyj plan implementacji:

<implementation_plan>
{{implementation-plan}} <- zamień na referencję do planu implementacji widoku (np. @generations-view-implementation-plan.md)
</implementation_plan>

Teraz przejrzyj zasady implementacji:

<implementation_rules>

### General Guidelines

- Use Astro components (.astro) for static content and layout
- Implement framework components in React only when interactivity is needed

### Guidelines for Styling

#### Tailwind

- Use the @layer directive to organize styles into components, utilities, and base layers
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus-visible:, active:, etc.) for interactive elements

### Guidelines for Accessibility

#### ARIA Best Practices

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements

### Guidelines for Astro

- Leverage View Transitions API for smooth page transitions (use ClientRouter)
- Use content collections with type safety for blog posts, documentation, etc.
- Leverage Server Endpoints for API routes
- Use POST, GET - uppercase format for endpoint handlers
- Use `export const prerender = false` for API routes
- Use zod for input validation in API routes
- Extract logic into services in `src/lib/services`
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

### Guidelines for React

- Use functional components with hooks instead of class components
- Never use "use client" and other Next.js directives as we use React with Astro
- Extract logic into custom hooks in `src/components/hooks`
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

# Shadcn UI Components

Ten projekt wykorzystuje @shadcn/ui dla komponentów interfejsu użytkownika. Są to pięknie zaprojektowane, dostępne komponenty, które można dostosować do swojej aplikacji.

## Odszukiwanie zainstalowanych komponentów

Komponenty są dostępne w folderze `src/components/ui`, zgodnie z aliasami z pliku `components.json`

## Wykorzystanie komponentu

Zaimportuj komponent zgodnie ze skonfigurowanym aliasem `@/`

```tsx
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
```

Przykładowe wykorzsytanie komponnetów:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

## Instalowanie dodatkowych komponentów

Wiele innych komponentów jest dostępnych, ale nie są one obecnie zainstalowane. Pełną listę można znaleźć na stronie https://ui.shadcn.com/r

Aby zainstalować nowy komponent, wykorzystaj shadcn CLI

```bash
npx shadcn@latest add [component-name]
```

Przykładowo, aby dodać komponent accordion

```bash
npx shadcn@latest add accordion
```

Ważne: `npx shadcn-ui@latest` zostało wycofane, korzystaj z `npx shadcn@latest`

Niektóre popularne komponenty to:

- Accordion
- Alert
- AlertDialog
- AspectRatio
- Avatar
- Calendar
- Checkbox
- Collapsible
- Command
- ContextMenu
- DataTable
- DatePicker
- Dropdown Menu
- Form
- Hover Card
- Menubar
- Navigation Menu
- Popover
- Progress
- Radio Group
- ScrollArea
- Select
- Separator
- Sheet
- Skeleton
- Slider
- Switch
- Table
- Textarea
- Sonner (previously Toast)
- Toggle
- Tooltip

## Component Styling

Ten projekt wykorzystuje wariant stylu „new-york” z kolorem bazowym "neutral" i zmiennymi CSS do tworzenia motywów, zgodnie z konfiguracją w sekcji `components.json`.

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers
- `./src/assets` - static internal assets
- `./public` - public assets
  </implementation_rules>

Przejrzyj zdefiniowane typy:

<types>
@src/types.ts
</types>

Wdrażaj plan zgodnie z następującym podejściem:

<implementation_approach>
Realizuj maksymalnie 3 kroki planu implementacji, podsumuj krótko co zrobiłeś i opisz plan na 3 kolejne działania - zatrzymaj w tym momencie pracę i czekaj na mój feedback.
</implementation_approach>

Dokładnie przeanalizuj plan wdrożenia i zasady. Zwróć szczególną uwagę na strukturę komponentów, wymagania dotyczące integracji API i interakcje użytkownika opisane w planie.

Wykonaj następujące kroki, aby zaimplementować zmiany:

1. Struktura komponentów:
   - Zidentyfikuj wszystkie komponenty wymienione w planie wdrożenia.
   - Utwórz hierarchiczną strukturę tych komponentów.
   - Upewnij się, że obowiązki i relacje każdego komponentu są jasno zdefiniowane.

2. Integracja API:
   - Zidentyfikuj wszystkie endpointy API wymienione w planie.
   - Wdróż niezbędne wywołania API dla każdego endpointa.
   - Obsłuż odpowiedzi z API i odpowiednio aktualizacji stan komponentów.

3. Interakcje użytkownika:
   - Wylistuj wszystkie interakcje użytkownika określone w planie wdrożenia.
   - Wdróż obsługi zdarzeń dla każdej interakcji.
   - Upewnij się, że każda interakcja wyzwala odpowiednią akcję lub zmianę stanu.

4. Zarządzanie stanem:
   - Zidentyfikuj wymagany stan dla każdego komponentu.
   - Zaimplementuj zarządzanie stanem przy użyciu odpowiedniej metody (stan lokalny, custom hook, stan współdzielony).
   - Upewnij się, że zmiany stanu wyzwalają niezbędne ponowne renderowanie.

5. Stylowanie i layout:
   - Zastosuj określone stylowanie i layout, jak wspomniano w planie wdrożenia.
   - Zapewnienie responsywności, jeśli wymaga tego plan.

6. Obsługa błędów i przypadki brzegowe:
   - Wdrożenie obsługi błędów dla wywołań API i interakcji użytkownika.
   - Rozważ i obsłuż potencjalne edge case'y wymienione w planie.

7. Optymalizacja wydajności:
   - Wdrożenie wszelkich optymalizacji wydajności określonych w planie lub zasadach.
   - Zapewnienie wydajnego renderowania i minimalnej liczby niepotrzebnych ponownych renderowań.

W trakcie całego procesu implementacji należy ściśle przestrzegać dostarczonych zasad implementacji. Zasady te mają pierwszeństwo przed wszelkimi ogólnymi najlepszymi praktykami, które mogą być z nimi sprzeczne.

Upewnij się, że twoja implementacja dokładnie odzwierciedla dostarczony plan implementacji i przestrzega wszystkich określonych zasad. Zwróć szczególną uwagę na strukturę komponentów, integrację API i obsługę interakcji użytkownika.
