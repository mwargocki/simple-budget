import type { SupabaseClient } from "../../db/supabase.client";
import type { CategoriesListDTO, CategoryDTO } from "../../types";

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
}
