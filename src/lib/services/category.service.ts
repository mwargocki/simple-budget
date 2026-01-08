import type { SupabaseClient } from "../../db/supabase.client";
import type { CategoriesListDTO, CategoryDTO, CreateCategoryCommand, UpdateCategoryCommand } from "../../types";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class SystemCategoryError extends Error {
  constructor() {
    super("Cannot modify system category");
    this.name = "SystemCategoryError";
  }
}

export class CategoryService {
  constructor(private supabase: SupabaseClient) {}

  async getCategories(): Promise<CategoriesListDTO> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("id, name, is_system, system_key, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      categories: (data ?? []) as CategoryDTO[],
    };
  }

  async createCategory(command: CreateCategoryCommand, userId: string): Promise<CategoryDTO> {
    const { data, error } = await this.supabase
      .from("categories")
      .insert({ name: command.name, user_id: userId })
      .select("id, name, is_system, system_key, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return data as CategoryDTO;
  }

  async updateCategory(id: string, command: UpdateCategoryCommand, userId: string): Promise<CategoryDTO> {
    // 1. Fetch category and verify ownership
    const { data: existingCategory, error: fetchError } = await this.supabase
      .from("categories")
      .select("id, is_system, user_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingCategory) {
      throw new CategoryNotFoundError();
    }

    // 2. Check if system category
    if (existingCategory.is_system) {
      throw new SystemCategoryError();
    }

    // 3. Update category
    const { data, error } = await this.supabase
      .from("categories")
      .update({ name: command.name })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, name, is_system, system_key, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return data as CategoryDTO;
  }
}
