import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.registerLink = page.getByRole("link", { name: /register|zarejestruj|utwórz konto/i });
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto("/login");
    // Wait for React hydration - form should be interactive
    await this.form.waitFor({ state: "visible" });
    await this.submitButton.waitFor({ state: "visible" });
    // Additional wait for React hydration
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string) {
    // Ensure form is ready for interaction
    await this.emailInput.waitFor({ state: "visible" });

    // Clear and fill email
    await this.emailInput.clear();
    await this.emailInput.fill(email);

    // Clear and fill password
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);

    // Wait a moment for React state to update
    await this.page.waitForTimeout(100);

    // Click submit and wait for response
    await this.submitButton.click();

    // Wait for either navigation to /app or error message
    await Promise.race([
      this.page.waitForURL(/\/app/, { timeout: 10000 }),
      this.errorMessage.waitFor({ state: "visible", timeout: 10000 }),
    ]).catch(() => {
      // If neither happens, continue anyway
    });
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}
