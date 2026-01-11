import { useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MonthPickerProps } from "./types";

const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function getCurrentMonthUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonth(monthStr: string): { year: number; month: number } {
  const [yearStr, monthStr2] = monthStr.split("-");
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr2, 10),
  };
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getPreviousMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  if (month === 1) {
    return formatMonth(year - 1, 12);
  }
  return formatMonth(year, month - 1);
}

function getNextMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  if (month === 12) {
    return formatMonth(year + 1, 1);
  }
  return formatMonth(year, month + 1);
}

function generateMonthOptions(): { value: string; label: string }[] {
  const currentMonth = getCurrentMonthUTC();
  const options: { value: string; label: string }[] = [];

  let { year, month } = parseMonth(currentMonth);

  // Generujemy 13 miesięcy: bieżący + 12 poprzednich
  for (let i = 0; i < 13; i++) {
    const value = formatMonth(year, month);
    const label = formatMonthLabel(value);
    options.push({ value, label });

    // Poprzedni miesiąc
    if (month === 1) {
      year -= 1;
      month = 12;
    } else {
      month -= 1;
    }
  }

  return options;
}

export function MonthPicker({ value, onChange, disabled }: MonthPickerProps) {
  const currentMonth = getCurrentMonthUTC();
  const isCurrentMonth = value >= currentMonth;

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const handlePreviousMonth = useCallback(() => {
    const prevMonth = getPreviousMonth(value);
    onChange(prevMonth);
  }, [value, onChange]);

  const handleNextMonth = useCallback(() => {
    const nextMonth = getNextMonth(value);
    onChange(nextMonth);
  }, [value, onChange]);

  const handleSelectChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousMonth}
        disabled={disabled}
        aria-label="Poprzedni miesiąc"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Select value={value} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]" aria-label="Wybierz miesiąc">
          <SelectValue>{formatMonthLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={disabled || isCurrentMonth}
        aria-label="Następny miesiąc"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
