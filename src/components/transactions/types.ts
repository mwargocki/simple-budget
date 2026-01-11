import type { TransactionDTO, CategoryDTO, PaginationDTO } from "@/types";

/** Tryb formularza transakcji */
export type TransactionFormMode = "create" | "edit";

/** Dane formularza transakcji */
export interface TransactionFormData {
  amount: string;
  type: "expense" | "income";
  category_id: string;
  description: string;
  occurred_at: string; // Format YYYY-MM-DD
}

/** Błędy walidacji formularza */
export interface TransactionFormErrors {
  amount?: string;
  type?: string;
  category_id?: string;
  description?: string;
  occurred_at?: string;
  general?: string;
}

/** Stan filtrów transakcji */
export interface TransactionsFiltersState {
  month: string; // Format YYYY-MM
  categoryId: string | null; // null = Wszystkie
}

/** Stan dialogów */
export interface TransactionDialogsState {
  form: {
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: TransactionDTO;
  };
  delete: {
    isOpen: boolean;
    transaction: TransactionDTO | null;
    isDeleting: boolean;
  };
}

/** Wynik hooka useTransactionsPage */
export interface UseTransactionsPageResult {
  // Dane
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  pagination: PaginationDTO | null;

  // Stany
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;

  // Filtry
  filters: TransactionsFiltersState;

  // Dialogi
  formDialog: TransactionDialogsState["form"];
  deleteDialog: TransactionDialogsState["delete"];

  // Akcje filtrów
  setMonth: (month: string) => void;
  setCategoryId: (categoryId: string | null) => void;

  // Akcje danych
  fetchTransactions: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Akcje dialogów
  openCreateDialog: () => void;
  openEditDialog: (transaction: TransactionDTO) => void;
  openDeleteDialog: (transaction: TransactionDTO) => void;
  closeFormDialog: () => void;
  closeDeleteDialog: () => void;

  // Operacje CRUD
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: TransactionFormData) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

/** Props dla TransactionsView */
export interface TransactionsViewProps {
  accessToken: string;
}

/** Props dla TransactionsFilters */
export interface TransactionsFiltersProps {
  month: string;
  categoryId: string | null;
  categories: CategoryDTO[];
  onMonthChange: (month: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  isLoading: boolean;
}

/** Props dla MonthPicker */
export interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
}

/** Props dla CategorySelect */
export interface CategorySelectProps {
  value: string | null;
  categories: CategoryDTO[];
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
}

/** Props dla TransactionsList */
export interface TransactionsListProps {
  transactions: TransactionDTO[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddClick: () => void;
  onEdit: (transaction: TransactionDTO) => void;
  onDelete: (transaction: TransactionDTO) => void;
  emptyMessage: string;
}

/** Props dla TransactionListRow */
export interface TransactionListRowProps {
  transaction: TransactionDTO;
  onEdit: () => void;
  onDelete: () => void;
}

/** Props dla LoadMoreButton */
export interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Props dla TransactionFormDialog */
export interface TransactionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TransactionFormMode;
  transaction?: TransactionDTO;
  categories: CategoryDTO[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

/** Props dla TransactionForm */
export interface TransactionFormProps {
  mode: TransactionFormMode;
  initialData?: TransactionFormData;
  categories: CategoryDTO[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

/** Props dla DeleteTransactionDialog */
export interface DeleteTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDTO | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

/** Props dla EmptyState (transakcje) */
export interface TransactionsEmptyStateProps {
  message: string;
  onAddClick: () => void;
}
