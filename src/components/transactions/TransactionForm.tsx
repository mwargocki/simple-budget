import { useEffect, useId, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransactionForm } from "@/components/hooks/useTransactionForm";
import type { TransactionFormProps } from "./types";

export function TransactionForm({
  mode,
  initialData,
  categories,
  onSubmit,
  onCancel,
  isSubmitting,
}: TransactionFormProps) {
  const { formData, errors, setFieldValue, handleAmountBlur, validateField, handleSubmit, resetForm } =
    useTransactionForm(mode, initialData);

  // Generate unique IDs for accessibility
  const amountId = useId();
  const amountErrorId = useId();
  const typeId = useId();
  const typeErrorId = useId();
  const categoryId = useId();
  const categoryErrorId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const dateId = useId();
  const dateErrorId = useId();

  useEffect(() => {
    resetForm();
  }, [mode, resetForm]);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(onSubmit);
    },
    [handleSubmit, onSubmit]
  );

  const isCreate = mode === "create";
  const submitLabel = isCreate ? "Dodaj" : "Zapisz";

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Kwota */}
      <div className="space-y-2">
        <Label htmlFor={amountId}>Kwota (PLN)</Label>
        <Input
          id={amountId}
          type="text"
          inputMode="decimal"
          value={formData.amount}
          onChange={(e) => setFieldValue("amount", e.target.value)}
          onBlur={() => {
            handleAmountBlur();
            validateField("amount");
          }}
          placeholder="0.00"
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? amountErrorId : undefined}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p id={amountErrorId} className="text-sm text-destructive" role="alert">
            {errors.amount}
          </p>
        )}
      </div>

      {/* Typ */}
      <div className="space-y-2">
        <Label htmlFor={typeId}>Typ</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFieldValue("type", value as "expense" | "income")}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id={typeId}
            aria-invalid={!!errors.type}
            aria-describedby={errors.type ? typeErrorId : undefined}
          >
            <SelectValue placeholder="Wybierz typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Wydatek</SelectItem>
            <SelectItem value="income">Przychód</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p id={typeErrorId} className="text-sm text-destructive" role="alert">
            {errors.type}
          </p>
        )}
      </div>

      {/* Kategoria */}
      <div className="space-y-2">
        <Label htmlFor={categoryId}>Kategoria</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => setFieldValue("category_id", value)}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id={categoryId}
            aria-invalid={!!errors.category_id}
            aria-describedby={errors.category_id ? categoryErrorId : undefined}
          >
            <SelectValue placeholder="Wybierz kategorię" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.is_default ? <span className="italic">{category.name}</span> : category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && (
          <p id={categoryErrorId} className="text-sm text-destructive" role="alert">
            {errors.category_id}
          </p>
        )}
      </div>

      {/* Opis */}
      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Opis</Label>
        <Input
          id={descriptionId}
          type="text"
          value={formData.description}
          onChange={(e) => setFieldValue("description", e.target.value)}
          onBlur={() => validateField("description")}
          placeholder="Np. Zakupy spożywcze"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? descriptionErrorId : undefined}
          disabled={isSubmitting}
          maxLength={255}
        />
        {errors.description && (
          <p id={descriptionErrorId} className="text-sm text-destructive" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      {/* Data */}
      <div className="space-y-2">
        <Label htmlFor={dateId}>Data</Label>
        <Input
          id={dateId}
          type="date"
          value={formData.occurred_at}
          onChange={(e) => setFieldValue("occurred_at", e.target.value)}
          onBlur={() => validateField("occurred_at")}
          aria-invalid={!!errors.occurred_at}
          aria-describedby={errors.occurred_at ? dateErrorId : undefined}
          disabled={isSubmitting}
        />
        {errors.occurred_at && (
          <p id={dateErrorId} className="text-sm text-destructive" role="alert">
            {errors.occurred_at}
          </p>
        )}
      </div>

      {/* Ogólny błąd */}
      {errors.general && (
        <p className="text-sm text-destructive" role="alert">
          {errors.general}
        </p>
      )}

      {/* Przyciski */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Zapisywanie..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
