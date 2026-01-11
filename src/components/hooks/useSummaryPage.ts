import { useState, useEffect, useCallback, useMemo } from "react";
import type { MonthlySummaryDTO } from "@/types";
import type { UseSummaryPageResult } from "@/components/summary/types";

function getCurrentMonthUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getInitialMonthFromURL(): string {
  if (typeof window === "undefined") {
    return getCurrentMonthUTC();
  }

  const params = new URLSearchParams(window.location.search);
  const monthParam = params.get("month");

  // Walidacja formatu miesiąca YYYY-MM
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return monthParam && monthRegex.test(monthParam) ? monthParam : getCurrentMonthUTC();
}

function updateURLParams(month: string): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();
  params.set("month", month);

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newURL);
}

export function useSummaryPage(accessToken: string): UseSummaryPageResult {
  // Stan danych
  const [summary, setSummary] = useState<MonthlySummaryDTO | null>(null);

  // Stan ładowania i błędów
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stan miesiąca
  const [month, setMonthState] = useState<string>(getInitialMonthFromURL);

  const handleUnauthorized = useCallback(() => {
    window.location.href = "/login?sessionExpired=true";
  }, []);

  // Pobieranie podsumowania
  const fetchSummaryInternal = useCallback(
    async (targetMonth: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("month", targetMonth);

        const response = await fetch(`/api/summary?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorized();
            return;
          }
          if (response.status === 400) {
            throw new Error("Nieprawidłowy format miesiąca");
          }
          throw new Error("Nie udało się załadować podsumowania");
        }

        const data: MonthlySummaryDTO = await response.json();
        setSummary(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się połączyć z serwerem";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, handleUnauthorized]
  );

  // Wrapper do pobierania z aktualnym miesiącem
  const fetchSummary = useCallback(async () => {
    await fetchSummaryInternal(month);
  }, [fetchSummaryInternal, month]);

  // Zmiana miesiąca
  const setMonth = useCallback((newMonth: string) => {
    setMonthState(newMonth);
  }, []);

  // Efekt przy zmianie miesiąca
  useEffect(() => {
    fetchSummaryInternal(month);
    updateURLParams(month);
  }, [fetchSummaryInternal, month]);

  // Memoizacja wyniku
  const result = useMemo<UseSummaryPageResult>(
    () => ({
      summary,
      isLoading,
      error,
      month,
      setMonth,
      fetchSummary,
    }),
    [summary, isLoading, error, month, setMonth, fetchSummary]
  );

  return result;
}
