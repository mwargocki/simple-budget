import type { SupabaseClient } from "../../db/supabase.client";
import type { RegisterCommand, RegisterResponseDTO } from "../../types";

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  async register(command: RegisterCommand): Promise<RegisterResponseDTO> {
    const { data, error } = await this.supabase.auth.signUp({
      email: command.email,
      password: command.password,
    });

    if (error) {
      throw error;
    }

    if (!data.user || !data.user.email) {
      throw new Error("User creation failed");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }
}
