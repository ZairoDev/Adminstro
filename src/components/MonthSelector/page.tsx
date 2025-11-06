import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const generateMonthsList = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(month);
    }
    
    return months;
  };

  const months = generateMonthsList();

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const isCurrentMonth = (date: Date) => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const isSameMonth = (date1: Date, date2: Date) => {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    
    // Don't allow future months
    if (nextMonth <= now) {
      onMonthChange(nextMonth);
    }
  };

  const canGoNext = () => {
    const now = new Date();
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    return nextMonth.getMonth() <= now.getMonth() || nextMonth.getFullYear() < now.getFullYear();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousMonth}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[200px] justify-start gap-2"
          >
            <Calendar className="h-4 w-4" />
            {formatMonth(selectedMonth)}
            {isCurrentMonth(selectedMonth) && (
              <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                Current
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <div className="max-h-[300px] overflow-y-auto">
            {months.map((month, index) => (
              <button
                key={index}
                onClick={() => {
                  onMonthChange(month);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2.5 hover:bg-muted transition-colors
                  ${isSameMonth(month, selectedMonth) ? "bg-muted font-semibold" : ""}
                  ${isCurrentMonth(month) ? "border-l-4 border-emerald-500" : ""}
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{formatMonth(month)}</span>
                  {isCurrentMonth(month) && (
                    <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={!canGoNext()}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}