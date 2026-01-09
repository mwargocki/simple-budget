import type { SupabaseClient } from "../../db/supabase.client";
import type { MonthlySummaryDTO, CategorySummaryDTO } from "../../types";

interface CategoryAggregation {
  category_id: string;
  category_name: string;
  income: number;
  expenses: number;
  transaction_count: number;
}

export class SummaryService {
  constructor(private supabase: SupabaseClient) {}

  async getMonthlySummary(month: string | undefined, userId: string): Promise<MonthlySummaryDTO> {
    // 1. Fetch user's timezone from profiles
    const timezone = await this.getUserTimezone(userId);

    // 2. Calculate month range using user's timezone
    const { monthStart, monthEnd, monthString } = this.calculateMonthRangeWithTimezone(month, timezone);

    // 3. Query transactions with aggregation by category
    const { data, error } = await this.supabase
      .from("transactions")
      .select(
        `
        category_id,
        amount,
        type,
        categories!inner(name)
      `
      )
      .eq("user_id", userId)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);

    if (error) {
      throw error;
    }

    // 4. Aggregate data by category in memory
    const categoryMap = new Map<string, CategoryAggregation>();

    for (const row of data ?? []) {
      const categoryData = row.categories as unknown as { name: string };
      const categoryId = row.category_id;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: categoryData.name,
          income: 0,
          expenses: 0,
          transaction_count: 0,
        });
      }

      const agg = categoryMap.get(categoryId);
      if (!agg) continue;
      agg.transaction_count++;

      if (row.type === "income") {
        agg.income += row.amount;
      } else {
        agg.expenses += row.amount;
      }
    }

    // 5. Calculate totals and format response
    let totalIncome = 0;
    let totalExpenses = 0;

    const categories: CategorySummaryDTO[] = Array.from(categoryMap.values()).map((agg) => {
      totalIncome += agg.income;
      totalExpenses += agg.expenses;

      const balance = agg.income - agg.expenses;

      return {
        category_id: agg.category_id,
        category_name: agg.category_name,
        income: agg.income.toFixed(2),
        expenses: agg.expenses.toFixed(2),
        balance: balance.toFixed(2),
        transaction_count: agg.transaction_count,
      };
    });

    const totalBalance = totalIncome - totalExpenses;

    return {
      month: monthString,
      total_income: totalIncome.toFixed(2),
      total_expenses: totalExpenses.toFixed(2),
      balance: totalBalance.toFixed(2),
      categories,
    };
  }

  private async getUserTimezone(userId: string): Promise<string> {
    const { data, error } = await this.supabase.from("profiles").select("timezone").eq("id", userId).single();

    if (error || !data) {
      // Default to UTC if profile not found
      return "UTC";
    }

    return data.timezone;
  }

  private calculateMonthRangeWithTimezone(
    month: string | undefined,
    timezone: string
  ): { monthStart: string; monthEnd: string; monthString: string } {
    let year: number;
    let monthNum: number;

    if (month) {
      const [yearStr, monthStr] = month.split("-");
      year = parseInt(yearStr, 10);
      monthNum = parseInt(monthStr, 10);
    } else {
      // Get current date in user's timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
      });
      const parts = formatter.formatToParts(now);
      const yearPart = parts.find((p) => p.type === "year");
      const monthPart = parts.find((p) => p.type === "month");
      year = yearPart ? parseInt(yearPart.value, 10) : now.getUTCFullYear();
      monthNum = monthPart ? parseInt(monthPart.value, 10) : now.getUTCMonth() + 1;
    }

    // Create month string in YYYY-MM format
    const monthString = `${year}-${monthNum.toString().padStart(2, "0")}`;

    // Calculate month boundaries in user's timezone, then convert to UTC
    // First day of month at 00:00:00 in user's timezone
    const monthStartLocal = new Date(`${year}-${monthNum.toString().padStart(2, "0")}-01T00:00:00`);

    // First day of next month
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const monthEndLocal = new Date(`${nextYear}-${nextMonth.toString().padStart(2, "0")}-01T00:00:00`);

    // Convert to timezone-aware ISO strings
    // Using the timezone offset to calculate UTC times
    const startOffset = this.getTimezoneOffset(monthStartLocal, timezone);
    const endOffset = this.getTimezoneOffset(monthEndLocal, timezone);

    const monthStart = new Date(monthStartLocal.getTime() - startOffset * 60000).toISOString();
    const monthEnd = new Date(monthEndLocal.getTime() - endOffset * 60000).toISOString();

    return { monthStart, monthEnd, monthString };
  }

  private getTimezoneOffset(date: Date, timezone: string): number {
    // Get offset in minutes for a specific timezone at a specific date
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  }
}
