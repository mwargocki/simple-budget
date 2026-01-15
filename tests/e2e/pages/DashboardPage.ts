import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly container: Locator;
  readonly transactionsTile: Locator;
  readonly categoriesTile: Locator;
  readonly summaryTile: Locator;
  readonly settingsTile: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("dashboard-page");
    this.transactionsTile = page.getByTestId("dashboard-tile-transactions");
    this.categoriesTile = page.getByTestId("dashboard-tile-categories");
    this.summaryTile = page.getByTestId("dashboard-tile-summary");
    this.settingsTile = page.getByTestId("dashboard-tile-settings");
    this.logoutButton = page.getByTestId("logout-button");
  }

  async goto() {
    await this.page.goto("/app");
  }

  async goToTransactions() {
    await this.transactionsTile.click();
  }

  async goToCategories() {
    await this.categoriesTile.click();
  }

  async goToSummary() {
    await this.summaryTile.click();
  }

  async goToSettings() {
    await this.settingsTile.click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
