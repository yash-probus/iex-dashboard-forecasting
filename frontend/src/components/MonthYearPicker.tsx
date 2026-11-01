import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  value: string; // format: "YYYY-MM"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  disabledMonths?: string[];
}

const MONTHS = [
  { short: "Jan", full: "January", num: "01" },
  { short: "Feb", full: "February", num: "02" },
  { short: "Mar", full: "March", num: "03" },
  { short: "Apr", full: "April", num: "04" },
  { short: "May", full: "May", num: "05" },
  { short: "Jun", full: "June", num: "06" },
  { short: "Jul", full: "July", num: "07" },
  { short: "Aug", full: "August", num: "08" },
  { short: "Sep", full: "September", num: "09" },
  { short: "Oct", full: "October", num: "10" },
  { short: "Nov", full: "November", num: "11" },
  { short: "Dec", full: "December", num: "12" },
];

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Select month",
  className,
  disabled,
  disabledMonths,
}: MonthYearPickerProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value) {
      const [year] = value.split("-");
      return parseInt(year);
    }
    return currentDate.getFullYear();
  });
  const [open, setOpen] = useState(false);

  const selectedMonth = value ? value.split("-")[1] : null;

  const handleMonthSelect = (monthNum: string) => {
    if (disabled) return;
    onChange(`${selectedYear}-${monthNum}`);
    setOpen(false);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange("");
    setOpen(false);
  };

  const handleThisMonth = () => {
    if (disabled) return;
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    setSelectedYear(year);
    onChange(`${year}-${month}`);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const [year, month] = value.split("-");
    const monthData = MONTHS.find((m) => m.num === month);
    return `${monthData?.full || month} ${year}`;
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayValue()}
        </Button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent
          className="w-[280px] p-0 pointer-events-auto"
          align="start"
        >
          <div className="p-3">
            {/* Year Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg">{selectedYear}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((month) => {
                const isSelected =
                  selectedMonth === month.num &&
                  value?.startsWith(String(selectedYear));
                const isCurrentMonth =
                  currentDate.getFullYear() === selectedYear &&
                  currentDate.getMonth() + 1 === parseInt(month.num);

                const isFuture =
                  selectedYear > currentDate.getFullYear() ||
                  (selectedYear === currentDate.getFullYear() &&
                    parseInt(month.num) > currentDate.getMonth() + 1);

                const monthISO = `${selectedYear}-${month.num}`;
                const isAlreadyFilled = disabledMonths?.includes(monthISO);
                const isEntryDisabled = isFuture || isAlreadyFilled;

                return (
                  <Button
                    key={month.num}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    disabled={isEntryDisabled}
                    className={cn(
                      "h-9",
                      isSelected &&
                        "bg-accent text-accent-foreground hover:bg-accent/90",
                      isCurrentMonth &&
                        !isSelected &&
                        "border border-accent/50",
                      isEntryDisabled && "opacity-30 cursor-not-allowed",
                    )}
                    onClick={() => handleMonthSelect(month.num)}
                  >
                    {month.short}
                  </Button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-accent"
                onClick={handleThisMonth}
                disabled={disabled}
              >
                This month
              </Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
