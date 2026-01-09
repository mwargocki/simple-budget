import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateTransactionCommand,
  TransactionDTO,
  TransactionsListDTO,
  TransactionsQueryParams,
} from "../../types";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transaction not found");
    this.name = "TransactionNotFoundError";
  }
}

export class TransactionService {
  constructor(private supabase: SupabaseClient) {}

  async createTransaction(command: CreateTransactionCommand, userId: string): Promise<TransactionDTO> {
    // 1. Verify category exists and belongs to user
    const { data: category, error: categoryError } = await this.supabase
      .from("categories")
      .select("id, name")
      .eq("id", command.category_id)
      .eq("user_id", userId)
      .single();

    if (categoryError || !category) {
      throw new CategoryNotFoundError();
    }

    // 2. Prepare amount as number
    const amount = typeof command.amount === "string" ? parseFloat(command.amount) : command.amount;

    // 3. Insert transaction
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: command.category_id,
        amount: amount,
        type: command.type,
        description: command.description,
        occurred_at: command.occurred_at ?? new Date().toISOString(),
      })
      .select("id, amount, type, category_id, description, occurred_at, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    // 4. Return DTO with category_name and formatted amount
    return {
      id: data.id,
      amount: data.amount.toFixed(2),
      type: data.type,
      category_id: data.category_id,
      category_name: category.name,
      description: data.description,
      occurred_at: data.occurred_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async getTransactionById(transactionId: string, userId: string): Promise<TransactionDTO> {
    const { data, error } = await this.supabase
      .from("transactions")
      .select(
        `
        id, amount, type, category_id, description,
        occurred_at, created_at, updated_at,
        categories!inner(name)
      `
      )
      .eq("id", transactionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new TransactionNotFoundError();
    }

    const categoryData = data.categories as unknown as { name: string };

    return {
      id: data.id,
      amount: data.amount.toFixed(2),
      type: data.type,
      category_id: data.category_id,
      category_name: categoryData.name,
      description: data.description,
      occurred_at: data.occurred_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async getTransactions(params: TransactionsQueryParams, userId: string): Promise<TransactionsListDTO> {
    // Calculate date range for month filter
    const { monthStart, monthEnd } = this.calculateMonthRange(params.month);

    // Build base query for counting
    let countQuery = this.supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);

    // Build base query for fetching data
    let dataQuery = this.supabase
      .from("transactions")
      .select(
        `
        id, amount, type, category_id, description,
        occurred_at, created_at, updated_at,
        categories!inner(name)
      `
      )
      .eq("user_id", userId)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);

    // Apply optional category filter
    if (params.category_id) {
      countQuery = countQuery.eq("category_id", params.category_id);
      dataQuery = dataQuery.eq("category_id", params.category_id);
    }

    // Apply sorting and pagination
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    dataQuery = dataQuery.order("occurred_at", { ascending: false }).range(offset, offset + limit - 1);

    // Execute queries
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      throw countResult.error;
    }

    if (dataResult.error) {
      throw dataResult.error;
    }

    const total = countResult.count ?? 0;

    // Map results to TransactionDTO[]
    const transactions: TransactionDTO[] = (dataResult.data ?? []).map((row) => {
      const categoryData = row.categories as unknown as { name: string };
      return {
        id: row.id,
        amount: row.amount.toFixed(2),
        type: row.type,
        category_id: row.category_id,
        category_name: categoryData.name,
        description: row.description,
        occurred_at: row.occurred_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return {
      transactions,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + transactions.length < total,
      },
    };
  }

  private calculateMonthRange(month?: string): { monthStart: string; monthEnd: string } {
    let year: number;
    let monthNum: number;

    if (month) {
      const [yearStr, monthStr] = month.split("-");
      year = parseInt(yearStr, 10);
      monthNum = parseInt(monthStr, 10);
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthNum = now.getUTCMonth() + 1;
    }

    // First day of the month at 00:00:00 UTC
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1)).toISOString();

    // First day of next month at 00:00:00 UTC
    const monthEnd = new Date(Date.UTC(year, monthNum, 1)).toISOString();

    return { monthStart, monthEnd };
  }
}
