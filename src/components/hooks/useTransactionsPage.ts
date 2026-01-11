import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type {
  TransactionDTO,
  CategoryDTO,
  PaginationDTO,
  TransactionsListDTO,
  CategoriesListDTO,
  ErrorResponseDTO,
} from "@/types";
import type {
  TransactionFormMode,
  TransactionFormData,
  UseTransactionsPageResult,
  TransactionsFiltersState,
} from "@/components/transactions/types";

const DEFAULT_LIMIT = 20;

function getCurrentMonthUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getInitialFiltersFromURL(): TransactionsFiltersState {
  if (typeof window === "undefined") {
    return { month: getCurrentMonthUTC(), categoryId: null };
  }

  const params = new URLSearchParams(window.location.search);
  const monthParam = params.get("month");
  const categoryIdParam = params.get("category_id");

  // Walidacja formatu miesiąca YYYY-MM
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  const month = monthParam && monthRegex.test(monthParam) ? monthParam : getCurrentMonthUTC();

  return {
    month,
    categoryId: categoryIdParam || null,
  };
}

function updateURLParams(filters: TransactionsFiltersState): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();
  params.set("month", filters.month);
  if (filters.categoryId) {
    params.set("category_id", filters.categoryId);
  }

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newURL);
}

export function useTransactionsPage(accessToken: string): UseTransactionsPageResult {
  // Stan danych
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationDTO | null>(null);
  const [offset, setOffset] = useState(0);

  // Stan ładowania i błędów
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // Stan filtrów
  const [filters, setFilters] = useState<TransactionsFiltersState>(getInitialFiltersFromURL);

  // Stan dialogów
  const [formDialog, setFormDialog] = useState<{
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: TransactionDTO;
  }>({
    isOpen: false,
    mode: "create",
    transaction: undefined,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    transaction: TransactionDTO | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    transaction: null,
    isDeleting: false,
  });

  const handleUnauthorized = useCallback(() => {
    window.location.href = "/login?sessionExpired=true";
  }, []);

  // Pobieranie kategorii
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Nie udało się załadować kategorii");
      }

      const data: CategoriesListDTO = await response.json();
      setCategories(data.categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, [accessToken, handleUnauthorized]);

  // Pobieranie transakcji - stabilna referencja do refetch
  const fetchTransactionsInternal = useCallback(
    async (month: string, categoryId: string | null, currentOffset: number, isReset: boolean) => {
      if (isReset) {
        setIsLoading(true);
        setOffset(0);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("month", month);
        if (categoryId) {
          params.set("category_id", categoryId);
        }
        params.set("limit", String(DEFAULT_LIMIT));
        params.set("offset", isReset ? "0" : String(currentOffset));

        const response = await fetch(`/api/transactions?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorized();
            return;
          }
          throw new Error("Nie udało się załadować transakcji");
        }

        const data: TransactionsListDTO = await response.json();

        if (isReset) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się połączyć z serwerem";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, handleUnauthorized]
  );

  // Wrapper do pobierania transakcji z aktualnymi filtrami
  const fetchTransactions = useCallback(
    async (resetOffset = true) => {
      await fetchTransactionsInternal(filters.month, filters.categoryId, offset, resetOffset);
    },
    [fetchTransactionsInternal, filters.month, filters.categoryId, offset]
  );

  // Load more
  const loadMore = useCallback(async () => {
    if (!pagination?.has_more || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const newOffset = offset + DEFAULT_LIMIT;

    try {
      const params = new URLSearchParams();
      params.set("month", filters.month);
      if (filters.categoryId) {
        params.set("category_id", filters.categoryId);
      }
      params.set("limit", String(DEFAULT_LIMIT));
      params.set("offset", String(newOffset));

      const response = await fetch(`/api/transactions?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Nie udało się załadować więcej transakcji");
      }

      const data: TransactionsListDTO = await response.json();
      setTransactions((prev) => [...prev, ...data.transactions]);
      setPagination(data.pagination);
      setOffset(newOffset);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się załadować więcej transakcji";
      setLoadMoreError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [accessToken, handleUnauthorized, filters.month, filters.categoryId, pagination?.has_more, isLoadingMore, offset]);

  // Inicjalne ładowanie
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTransactionsInternal(filters.month, filters.categoryId, 0, true);
    updateURLParams(filters);
  }, [fetchTransactionsInternal, filters]);

  // Akcje filtrów
  const setMonth = useCallback((month: string) => {
    setFilters((prev) => ({ ...prev, month }));
  }, []);

  const setCategoryId = useCallback((categoryId: string | null) => {
    setFilters((prev) => ({ ...prev, categoryId }));
  }, []);

  // Akcje dialogów
  const openCreateDialog = useCallback(() => {
    setFormDialog({
      isOpen: true,
      mode: "create",
      transaction: undefined,
    });
  }, []);

  const openEditDialog = useCallback((transaction: TransactionDTO) => {
    setFormDialog({
      isOpen: true,
      mode: "edit",
      transaction,
    });
  }, []);

  const openDeleteDialog = useCallback((transaction: TransactionDTO) => {
    setDeleteDialog({
      isOpen: true,
      transaction,
      isDeleting: false,
    });
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Operacje CRUD
  const createTransaction = useCallback(
    async (data: TransactionFormData) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          description: data.description,
          occurred_at: `${data.occurred_at}T00:00:00Z`,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const errorData: ErrorResponseDTO = await response.json();

        if (response.status === 400 && errorData.error.details) {
          const fieldErrors: Record<string, string> = {};
          errorData.error.details.forEach((detail) => {
            fieldErrors[detail.field] = detail.message;
          });
          const firstError = errorData.error.details[0];
          throw new Error(firstError?.message || "Nieprawidłowe dane");
        }

        if (response.status === 404) {
          throw new Error("Wybrana kategoria nie istnieje");
        }

        throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }

      toast.success("Transakcja dodana");
      closeFormDialog();
      await fetchTransactions(true);
    },
    [accessToken, handleUnauthorized, closeFormDialog, fetchTransactions]
  );

  const updateTransaction = useCallback(
    async (id: string, data: TransactionFormData) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          type: data.type,
          category_id: data.category_id,
          description: data.description,
          occurred_at: `${data.occurred_at}T00:00:00Z`,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const errorData: ErrorResponseDTO = await response.json();

        if (response.status === 400 && errorData.error.details) {
          const firstError = errorData.error.details[0];
          throw new Error(firstError?.message || "Nieprawidłowe dane");
        }

        if (response.status === 404) {
          toast.error("Transakcja nie została znaleziona");
          await fetchTransactions(true);
          throw new Error("Transakcja nie została znaleziona");
        }

        throw new Error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }

      toast.success("Zapisano");
      closeFormDialog();
      await fetchTransactions(true);
    },
    [accessToken, handleUnauthorized, closeFormDialog, fetchTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

      try {
        const response = await fetch(`/api/transactions/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleUnauthorized();
            return;
          }

          if (response.status === 404) {
            toast.error("Transakcja nie została znaleziona");
            await fetchTransactions(true);
            return;
          }

          toast.error("Nie udało się usunąć transakcji");
          return;
        }

        toast.success("Transakcja usunięta");
        closeDeleteDialog();
        await fetchTransactions(true);
      } finally {
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }));
      }
    },
    [accessToken, handleUnauthorized, closeDeleteDialog, fetchTransactions]
  );

  // Memoizacja wyniku
  const result = useMemo<UseTransactionsPageResult>(
    () => ({
      transactions,
      categories,
      pagination,
      isLoading,
      isLoadingMore,
      error,
      loadMoreError,
      filters,
      formDialog,
      deleteDialog,
      setMonth,
      setCategoryId,
      fetchTransactions: () => fetchTransactions(true),
      loadMore,
      openCreateDialog,
      openEditDialog,
      openDeleteDialog,
      closeFormDialog,
      closeDeleteDialog,
      createTransaction,
      updateTransaction,
      deleteTransaction,
    }),
    [
      transactions,
      categories,
      pagination,
      isLoading,
      isLoadingMore,
      error,
      loadMoreError,
      filters,
      formDialog,
      deleteDialog,
      setMonth,
      setCategoryId,
      fetchTransactions,
      loadMore,
      openCreateDialog,
      openEditDialog,
      openDeleteDialog,
      closeFormDialog,
      closeDeleteDialog,
      createTransaction,
      updateTransaction,
      deleteTransaction,
    ]
  );

  return result;
}
