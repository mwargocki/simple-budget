import type { APIRoute } from "astro";
import { createSupabaseClientWithAuth } from "../../../db/supabase.client";
import { TransactionService } from "../../../lib/services/transaction.service";
import { OpenRouterService } from "../../../lib/services/openrouter.service";
import { summaryQuerySchema } from "../../../lib/schemas/summary.schema";
import type { ErrorResponseDTO, TransactionDTO } from "../../../types";
import { OpenRouterError } from "../../../lib/errors/openrouter.errors";

export const prerender = false;

interface AIAnalysisResponseDTO {
  analysis: string;
  month: string;
}

function formatTransactionsForPrompt(transactions: TransactionDTO[], month: string): string {
  if (transactions.length === 0) {
    return `Brak transakcji w miesiącu ${month}.`;
  }

  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const categoryExpenses = new Map<string, number>();
  const categoryIncomes = new Map<string, number>();

  for (const t of expenseTransactions) {
    const current = categoryExpenses.get(t.category_name) ?? 0;
    categoryExpenses.set(t.category_name, current + parseFloat(t.amount));
  }

  for (const t of incomeTransactions) {
    const current = categoryIncomes.get(t.category_name) ?? 0;
    categoryIncomes.set(t.category_name, current + parseFloat(t.amount));
  }

  let prompt = `Miesiąc: ${month}\n`;
  prompt += `Liczba transakcji: ${transactions.length}\n`;
  prompt += `Suma przychodów: ${totalIncome.toFixed(2)} PLN\n`;
  prompt += `Suma wydatków: ${totalExpenses.toFixed(2)} PLN\n`;
  prompt += `Bilans: ${(totalIncome - totalExpenses).toFixed(2)} PLN\n\n`;

  if (categoryIncomes.size > 0) {
    prompt += `Przychody według kategorii:\n`;
    for (const [category, amount] of categoryIncomes) {
      prompt += `- ${category}: ${amount.toFixed(2)} PLN\n`;
    }
    prompt += "\n";
  }

  if (categoryExpenses.size > 0) {
    prompt += `Wydatki według kategorii:\n`;
    for (const [category, amount] of categoryExpenses) {
      prompt += `- ${category}: ${amount.toFixed(2)} PLN\n`;
    }
    prompt += "\n";
  }

  prompt += `Lista transakcji:\n`;
  for (const t of transactions) {
    const typeLabel = t.type === "income" ? "+" : "-";
    prompt += `${typeLabel}${t.amount} PLN | ${t.category_name} | ${t.description} | ${t.occurred_at.split("T")[0]}\n`;
  }

  return prompt;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Extract and validate Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7);

    // 2. Validate token by getting user
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "No valid session",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Validate month parameter
    const validationResult = summaryQuerySchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid month format. Use YYYY-MM",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const month = validationResult.data.month;

    // 5. Fetch all transactions for the month
    const supabaseWithAuth = createSupabaseClientWithAuth(token);
    const transactionService = new TransactionService(supabaseWithAuth);

    // Fetch all transactions (using high limit to get all)
    const transactionsResult = await transactionService.getTransactions({ month, limit: 1000 }, user.id);

    // 6. Prepare prompt and call OpenRouter
    const transactionsPrompt = formatTransactionsForPrompt(transactionsResult.transactions, month);

    const openRouterService = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY,
      defaultModel: "openai/gpt-4o-mini",
      defaultTemperature: 0.7,
      defaultMaxTokens: 1024,
      siteName: "SimpleBudget",
    });

    const response = await openRouterService.chat({
      messages: [
        {
          role: "system",
          content: `Jesteś pomocnym asystentem finansowym. Analizujesz wydatki i przychody użytkownika i dajesz praktyczne porady. Odpowiadasz zawsze po polsku. Twoja odpowiedź powinna zawierać:
1. Krótkie podsumowanie finansów w danym miesiącu
2. Wskazanie kategorii z największymi wydatkami
3. Praktyczne porady dotyczące oszczędzania i inwestowania 
4. Ogólną ocenę kondycji finansowej

Formatuj odpowiedź używając markdown. Bądź zwięzły ale pomocny.`,
        },
        {
          role: "user",
          content: `Przeanalizuj moje finanse za podany miesiąc:\n\n${transactionsPrompt}`,
        },
      ],
    });

    const result: AIAnalysisResponseDTO = {
      analysis: response.content,
      month,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "INTERNAL_ERROR",
          message: `AI service error: ${error.message}`,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
