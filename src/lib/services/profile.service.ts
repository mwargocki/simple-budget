import type { SupabaseClient } from "../../db/supabase.client";
import type { ProfileDTO, UpdateProfileCommand } from "../../types";

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Profile not found");
    this.name = "ProfileNotFoundError";
  }
}

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<ProfileDTO | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, timezone, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  }

  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileDTO> {
    const { data, error } = await this.supabase
      .from("profiles")
      .update({ timezone: command.timezone })
      .eq("id", userId)
      .select("id, timezone, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ProfileNotFoundError();
      }
      throw error;
    }

    return data;
  }
}
