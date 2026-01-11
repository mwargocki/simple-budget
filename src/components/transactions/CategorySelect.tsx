import { useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategorySelectProps } from "./types";

const ALL_CATEGORIES_VALUE = "__all__";

export function CategorySelect({ value, categories, onChange, disabled }: CategorySelectProps) {
  const handleChange = useCallback(
    (newValue: string) => {
      if (newValue === ALL_CATEGORIES_VALUE) {
        onChange(null);
      } else {
        onChange(newValue);
      }
    },
    [onChange]
  );

  return (
    <Select value={value ?? ALL_CATEGORIES_VALUE} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]" aria-label="Filtruj po kategorii">
        <SelectValue placeholder="Wszystkie kategorie" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CATEGORIES_VALUE}>Wszystkie kategorie</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.is_default ? <span className="italic">{category.name}</span> : category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
