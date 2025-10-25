"use client";

import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface BookingFilterState {
  searchTerm: string;
  propertyName: string;
  bookingId: string;
  startDate?: string;
  endDate?: string;
  guestPhone?: string;
  travellerPaymentStatus?: "pending" | "partial" | "paid" | "";
}

interface BookingFilterProps {
  filters: BookingFilterState;
  onFilterChange: (filters: BookingFilterState) => void;
  onReset: () => void;
}

export const BookingFilter: React.FC<BookingFilterProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<BookingFilterState>(filters);

  const handleChange =
    (key: keyof BookingFilterState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setLocalFilters({
        ...localFilters,
        [key]: e.target.value,
      });
    };

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({
      searchTerm: "",
      propertyName: "",
      bookingId: "",
      startDate: "",
      endDate: "",
      guestPhone: "",
      travellerPaymentStatus: "",
    });
    onReset();
  };

  const hasActiveFilters = !!(
    localFilters.searchTerm ||
    localFilters.propertyName ||
    localFilters.bookingId ||
    localFilters.startDate ||
    localFilters.endDate ||
    localFilters.guestPhone ||
    localFilters.travellerPaymentStatus
  );

  return (
    <div className="p-5 bg-white dark:bg-stone-950 border rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">Filter Bookings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Search Term
          </label>
          <Input
            placeholder="Guest name, email, note..."
            value={localFilters.searchTerm}
            onChange={handleChange("searchTerm")}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Property Name
          </label>
          <Input
            placeholder="Property name..."
            value={localFilters.propertyName}
            onChange={handleChange("propertyName")}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Booking ID
          </label>
          <Input
            placeholder="Booking ID..."
            value={localFilters.bookingId}
            onChange={handleChange("bookingId")}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Check-in start
          </label>
          <Input
            type="date"
            value={localFilters.startDate ?? ""}
            onChange={handleChange("startDate")}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Check-in end
          </label>
          <Input
            type="date"
            value={localFilters.endDate ?? ""}
            onChange={handleChange("endDate")}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Guest phone
          </label>
          <Input
            placeholder="Phone..."
            value={localFilters.guestPhone ?? ""}
            onChange={handleChange("guestPhone")}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex gap-4 items-end">
        

        <div className="col-span-2 flex justify-end gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2 bg-transparent"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};
