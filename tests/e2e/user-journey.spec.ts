import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { TransactionsPage } from "./pages/TransactionsPage";

// Validate required environment variables
const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

if (!E2E_USERNAME || !E2E_PASSWORD) {
  throw new Error(
    "Missing required environment variables: E2E_USERNAME and E2E_PASSWORD must be set in .env.test file"
  );
}

// Test credentials from environment
const TEST_USER = {
  email: E2E_USERNAME,
  password: E2E_PASSWORD,
};

// Test data
const TEST_CATEGORY_NAME = `Test Category ${Date.now()}`;
const TODAY = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const TRANSACTION_1 = {
  amount: "100.50",
  type: "expense" as const,
  categoryName: TEST_CATEGORY_NAME,
  description: `Test Transaction 1 - ${Date.now()}`,
  date: TODAY,
};

const TRANSACTION_2 = {
  amount: "250.00",
  type: "income" as const,
  categoryName: TEST_CATEGORY_NAME,
  description: `Test Transaction 2 - ${Date.now()}`,
  date: TODAY,
};

test.describe("User Journey - Complete Flow", () => {
  test("should complete full user journey: login, add category, add transactions, delete transaction, logout", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const categoriesPage = new CategoriesPage(page);
    const transactionsPage = new TransactionsPage(page);

    // ============================================
    // STEP 1: Login
    // ============================================
    await test.step("Login with valid credentials", async () => {
      await loginPage.goto();
      await expect(loginPage.form).toBeVisible();

      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Verification: User sees dashboard at /app
      await expect(page).toHaveURL(/\/app$/);
      await expect(dashboardPage.container).toBeVisible();
    });

    // ============================================
    // STEP 2: Add new category
    // ============================================
    await test.step("Add new category", async () => {
      // Navigate to categories
      await dashboardPage.goToCategories();
      await expect(page).toHaveURL(/\/app\/categories/);
      await expect(categoriesPage.container).toBeVisible();

      // Add new category
      await categoriesPage.addCategory(TEST_CATEGORY_NAME);

      // Verification: Category appears on the list
      await expect(categoriesPage.categoriesList).toBeVisible();

      // Check that our category is visible (don't rely on exact count due to parallel tests)
      await expect(async () => {
        const isVisible = await categoriesPage.isCategoryVisible(TEST_CATEGORY_NAME);
        expect(isVisible).toBe(true);
      }).toPass({ timeout: 5000 });
    });

    // ============================================
    // STEP 3: Add two transactions
    // ============================================
    await test.step("Add two transactions", async () => {
      // Navigate to transactions via dashboard
      await page.goto("/app");
      await dashboardPage.goToTransactions();
      await expect(page).toHaveURL(/\/app\/transactions/);
      await expect(transactionsPage.container).toBeVisible();

      // Add first transaction
      await transactionsPage.addTransaction(TRANSACTION_1);

      // Verification: First transaction is visible (don't rely on exact count due to parallel tests)
      await expect(async () => {
        const isVisible = await transactionsPage.isTransactionVisible(TRANSACTION_1.description);
        expect(isVisible).toBe(true);
      }).toPass({ timeout: 5000 });

      // Add second transaction
      await transactionsPage.addTransaction(TRANSACTION_2);

      // Verification: Both transactions are visible on the list
      await expect(async () => {
        const isTransaction1Visible = await transactionsPage.isTransactionVisible(TRANSACTION_1.description);
        const isTransaction2Visible = await transactionsPage.isTransactionVisible(TRANSACTION_2.description);
        expect(isTransaction1Visible).toBe(true);
        expect(isTransaction2Visible).toBe(true);
      }).toPass({ timeout: 5000 });
    });

    // ============================================
    // STEP 4: Delete one transaction
    // ============================================
    await test.step("Delete one transaction", async () => {
      // Delete first transaction by its description
      await transactionsPage.deleteTransactionByDescription(TRANSACTION_1.description);

      // Verification: First transaction is gone, second transaction remains
      await expect(async () => {
        const isTransaction1Visible = await transactionsPage.isTransactionVisible(TRANSACTION_1.description);
        const isTransaction2Visible = await transactionsPage.isTransactionVisible(TRANSACTION_2.description);
        expect(isTransaction1Visible).toBe(false);
        expect(isTransaction2Visible).toBe(true);
      }).toPass({ timeout: 5000 });
    });

    // ============================================
    // STEP 5: Logout
    // ============================================
    await test.step("Logout", async () => {
      await transactionsPage.logout();

      // Verification: Redirect to /login
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.form).toBeVisible();
    });
  });
});
