import type { Page, Locator } from "@playwright/test";

export interface TransactionData {
  amount: string;
  type: "expense" | "income";
  categoryName: string;
  description: string;
  date: string; // format: YYYY-MM-DD
}

export class TransactionsPage {
  readonly page: Page;
  readonly container: Locator;
  readonly addTransactionButton: Locator;
  readonly transactionsList: Locator;
  readonly transactionItems: Locator;
  readonly logoutButton: Locator;

  // Form Dialog
  readonly formDialog: Locator;
  readonly amountInput: Locator;
  readonly typeSelect: Locator;
  readonly categorySelect: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Delete Dialog
  readonly deleteDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("transactions-page");
    this.addTransactionButton = page.getByTestId("add-transaction-button");
    this.transactionsList = page.getByTestId("transactions-list");
    this.transactionItems = page.getByTestId("transaction-list-item");
    this.logoutButton = page.getByTestId("logout-button");

    // Form Dialog
    this.formDialog = page.getByTestId("transaction-form-dialog");
    this.amountInput = page.getByTestId("transaction-amount-input");
    this.typeSelect = page.getByTestId("transaction-type-select");
    this.categorySelect = page.getByTestId("transaction-category-select");
    this.descriptionInput = page.getByTestId("transaction-description-input");
    this.dateInput = page.getByTestId("transaction-date-input");
    this.submitButton = page.getByTestId("transaction-submit-button");
    this.cancelButton = page.getByTestId("transaction-cancel-button");

    // Delete Dialog
    this.deleteDialog = page.getByTestId("delete-transaction-dialog");
    this.deleteConfirmButton = page.getByTestId("delete-transaction-confirm-button");
    this.deleteCancelButton = page.getByTestId("delete-transaction-cancel-button");
  }

  async goto() {
    await this.page.goto("/app/transactions");
  }

  async addTransaction(data: TransactionData) {
    await this.addTransactionButton.click();
    await this.formDialog.waitFor({ state: "visible" });

    // Fill amount
    await this.amountInput.fill(data.amount);

    // Select type
    await this.typeSelect.click();
    const typeOption = data.type === "expense" ? "Wydatek" : "Przychód";
    await this.page.getByRole("option", { name: typeOption }).click();

    // Select category
    await this.categorySelect.click();
    await this.page.getByRole("option", { name: data.categoryName }).click();

    // Fill description
    await this.descriptionInput.fill(data.description);

    // Fill date
    await this.dateInput.fill(data.date);

    // Submit
    await this.submitButton.click();
    await this.formDialog.waitFor({ state: "hidden" });
  }

  async getTransactionCount(): Promise<number> {
    return this.transactionItems.count();
  }

  async getTransactionDescriptions(): Promise<string[]> {
    const items = await this.transactionItems.all();
    const descriptions: string[] = [];
    for (const item of items) {
      const desc = await item.locator("span.font-medium.truncate, span.flex-1.truncate").textContent();
      if (desc) {
        descriptions.push(desc.trim());
      }
    }
    return descriptions;
  }

  async isTransactionVisible(description: string): Promise<boolean> {
    const descriptions = await this.getTransactionDescriptions();
    return descriptions.includes(description);
  }

  async deleteTransactionByIndex(index: number) {
    const items = await this.transactionItems.all();
    if (index >= items.length) {
      throw new Error(`Transaction at index ${index} does not exist. Total: ${items.length}`);
    }

    const deleteButton = items[index].getByTestId("delete-transaction-button");
    await deleteButton.click();
    await this.deleteDialog.waitFor({ state: "visible" });
    await this.deleteConfirmButton.click();
    await this.deleteDialog.waitFor({ state: "hidden" });
  }

  async deleteFirstTransaction() {
    await this.deleteTransactionByIndex(0);
  }

  async deleteTransactionByDescription(description: string) {
    const items = await this.transactionItems.all();
    for (const item of items) {
      const desc = await item.locator("span.font-medium.truncate, span.flex-1.truncate").textContent();
      if (desc && desc.trim() === description) {
        const deleteButton = item.getByTestId("delete-transaction-button");
        await deleteButton.click();
        await this.deleteDialog.waitFor({ state: "visible" });
        await this.deleteConfirmButton.click();
        await this.deleteDialog.waitFor({ state: "hidden" });
        return;
      }
    }
    throw new Error(`Transaction with description "${description}" not found`);
  }

  async logout() {
    await this.logoutButton.click();
  }
}
