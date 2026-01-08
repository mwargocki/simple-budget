import type { SupabaseClient } from "../../db/supabase.client";
import type { CategoriesListDTO, CategoryDTO, CreateCategoryCommand } from "../../types";

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
}
