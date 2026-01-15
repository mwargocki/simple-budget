import type { Page, Locator } from "@playwright/test";

export class CategoriesPage {
  readonly page: Page;
  readonly container: Locator;
  readonly addCategoryButton: Locator;
  readonly categoriesList: Locator;
  readonly categoryItems: Locator;
  readonly logoutButton: Locator;

  // Dialog
  readonly formDialog: Locator;
  readonly categoryNameInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("categories-page");
    this.addCategoryButton = page.getByTestId("add-category-button");
    this.categoriesList = page.getByTestId("categories-list");
    this.categoryItems = page.getByTestId("category-list-item");
    this.logoutButton = page.getByTestId("logout-button");

    // Dialog
    this.formDialog = page.getByTestId("category-form-dialog");
    this.categoryNameInput = page.getByTestId("category-name-input");
    this.submitButton = page.getByTestId("category-submit-button");
    this.cancelButton = page.getByTestId("category-cancel-button");
  }

  async goto() {
    await this.page.goto("/app/categories");
  }

  async addCategory(name: string) {
    await this.addCategoryButton.click();
    await this.formDialog.waitFor({ state: "visible" });
    await this.categoryNameInput.fill(name);
    await this.submitButton.click();
    await this.formDialog.waitFor({ state: "hidden" });
  }

  async getCategoryCount(): Promise<number> {
    return this.categoryItems.count();
  }

  async getCategoryNames(): Promise<string[]> {
    const items = await this.categoryItems.all();
    const names: string[] = [];
    for (const item of items) {
      const name = await item.locator("span.font-medium").textContent();
      if (name) {
        names.push(name);
      }
    }
    return names;
  }

  async isCategoryVisible(name: string): Promise<boolean> {
    const names = await this.getCategoryNames();
    return names.includes(name);
  }

  async logout() {
    await this.logoutButton.click();
  }
}
