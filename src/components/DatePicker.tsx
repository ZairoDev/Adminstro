import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface dateProps {
  date: Date;
  setDate: (date: Date) => void;
  disabled?: boolean;
}

export function DatePicker({ date, setDate, disabled }: dateProps) {
  // const [date, setDate] = useState<Date>();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close the calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative border border-neutral-600 rounded-md" ref={containerRef}>
      <Button
        variant="outline"
        className={`w-full justify-start text-left font-normal ${
          !date ? "text-muted-foreground" : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={(disabled && disabled === true) || false}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {date ? formatDate(date) : <span>Pick a date</span>}
      </Button>

      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[9999] rounded-md border bg-popover p-0 shadow-md"
          style={{ minWidth: "max-content" }}
        >
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            disabled={false}
            className="rounded-md"
          />
        </div>
      )}
    </div>
  );
}

export default DatePicker;
