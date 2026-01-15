/* eslint-disable no-console */
import { TestApiClient } from "./helpers/api-client";

/**
 * Global teardown for Playwright E2E tests
 * Cleans up test data created during test execution
 * Console statements are intentional for teardown logging
 */
async function globalTeardown() {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    console.log("[Teardown] Skipping cleanup - E2E_USERNAME or E2E_PASSWORD not set");
    return;
  }

  console.log("[Teardown] Starting test data cleanup...");

  const apiClient = new TestApiClient();

  try {
    // Login as test user
    await apiClient.login(username, password);
    console.log("[Teardown] Logged in successfully");

    // Clean up test data
    const result = await apiClient.cleanupTestData();

    console.log(`[Teardown] Cleanup complete:`);
    console.log(`  - Deleted ${result.deletedTransactions} test transactions`);
    console.log(`  - Deleted ${result.deletedCategories} test categories`);
  } catch (error) {
    console.error("[Teardown] Cleanup failed:", error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;
