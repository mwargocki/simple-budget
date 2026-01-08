import type { SupabaseClient } from "../../db/supabase.client";
import type {
  RegisterCommand,
  RegisterResponseDTO,
  LoginCommand,
  LoginResponseDTO,
  LogoutResponseDTO,
  ChangePasswordCommand,
  ChangePasswordResponseDTO,
} from "../../types";

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

  async login(command: LoginCommand): Promise<LoginResponseDTO> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password,
    });

    if (error) {
      throw error;
    }

    if (!data.user || !data.user.email || !data.session) {
      throw new Error("Login failed");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? 0,
      },
    };
  }

  async logout(): Promise<LogoutResponseDTO> {
    const { error } = await this.supabase.auth.signOut({ scope: "global" });

    if (error) {
      throw error;
    }

    return {
      message: "Logged out successfully",
    };
  }

  async changePassword(command: ChangePasswordCommand, userEmail: string): Promise<ChangePasswordResponseDTO> {
    // Verify current password by attempting to sign in
    const { error: signInError } = await this.supabase.auth.signInWithPassword({
      email: userEmail,
      password: command.currentPassword,
    });

    if (signInError) {
      throw signInError;
    }

    // Update the password
    const { error: updateError } = await this.supabase.auth.updateUser({
      password: command.newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    return {
      message: "Password changed successfully",
    };
  }
}
