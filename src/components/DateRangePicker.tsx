"use client";

import * as React from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { SelectRangeEventHandler } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


interface DateRangeProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  isDrawerOpen?: boolean;
}


export function DateRangePicker({
  className,
  date,
  setDate,
  isDrawerOpen = true,
}: DateRangeProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Reset calendar state when drawer closes
  React.useEffect(() => {
    if (!isDrawerOpen) {
      setIsCalendarOpen(false);
    }
  }, [isDrawerOpen]);

  const handleSelect: SelectRangeEventHandler = (
    selectedDate: DateRange | undefined
  ) => {
    setDate(selectedDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        modal={true}
      >
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
