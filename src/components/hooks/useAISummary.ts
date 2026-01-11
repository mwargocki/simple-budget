import { useState, useCallback } from "react";
import type { AIAnalysisResponseDTO } from "@/types";

export interface UseAISummaryResult {
  analysis: string | null;
  isGenerating: boolean;
  error: string | null;
  generateAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
}

export function useAISummary(accessToken: string, month: string): UseAISummaryResult {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    window.location.href = "/login?sessionExpired=true";
  }, []);

  const generateAnalysis = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/summary/ai-analysis", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (response.status === 502) {
          throw new Error("Usługa AI jest chwilowo niedostępna. Spróbuj ponownie później.");
        }
        throw new Error("Nie udało się wygenerować analizy");
      }

      const data: AIAnalysisResponseDTO = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [accessToken, month, handleUnauthorized]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isGenerating,
    error,
    generateAnalysis,
    clearAnalysis,
  };
}
