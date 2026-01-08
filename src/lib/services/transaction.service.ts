import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateTransactionCommand, TransactionDTO } from "../../types";

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
}
