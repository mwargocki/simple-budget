/**
 * API Client for E2E test cleanup operations
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  session: SessionDTO;
}

export interface Category {
  id: string;
  name: string;
  is_system: boolean;
  system_key: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  category_id: string;
  user_id: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export class TestApiClient {
  private accessToken: string | null = null;

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as LoginResponseDTO;
    this.accessToken = data.session.access_token;
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call login() first.");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${BASE_URL}/api/categories`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get categories: ${response.status}`);
    }

    const data = (await response.json()) as { categories: Category[] };
    return data.categories;
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/categories/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete category ${id}: ${response.status}`);
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${BASE_URL}/api/transactions`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get transactions: ${response.status}`);
    }

    const data = (await response.json()) as { transactions: Transaction[] };
    return data.transactions;
  }

  async deleteTransaction(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/transactions/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete transaction ${id}: ${response.status}`);
    }
  }

  /**
   * Clean up test data - deletes categories and transactions matching test patterns
   */
  async cleanupTestData(): Promise<{ deletedCategories: number; deletedTransactions: number }> {
    let deletedCategories = 0;
    let deletedTransactions = 0;

    // Clean up test transactions first (before categories, as transactions reference categories)
    const transactions = await this.getTransactions();
    for (const transaction of transactions) {
      // Match test transaction pattern: "Test Transaction" prefix
      if (transaction.description.startsWith("Test Transaction")) {
        await this.deleteTransaction(transaction.id);
        deletedTransactions++;
      }
    }

    // Clean up test categories
    const categories = await this.getCategories();
    for (const category of categories) {
      // Match test category pattern: "Test Category" prefix
      // Skip system categories
      if (category.name.startsWith("Test Category") && !category.is_system) {
        await this.deleteCategory(category.id);
        deletedCategories++;
      }
    }

    return { deletedCategories, deletedTransactions };
  }
}
