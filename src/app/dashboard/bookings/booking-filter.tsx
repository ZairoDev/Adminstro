"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BookingFilter: React.FC<BookingFilterProps> = ({
  filters,
  onFilterChange,
  onReset,
  open,
  onOpenChange,
}) => {
  const [localFilters, setLocalFilters] = useState<BookingFilterState>(filters);

  // Sync local filters with parent filters when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

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
    onOpenChange(false);
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
    onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Bookings
          </SheetTitle>
          <SheetDescription>
            Apply filters to narrow down your booking results
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Property Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Property Name</label>
            <Input
              placeholder="Property name..."
              value={localFilters.propertyName}
              onChange={handleChange("propertyName")}
            />
          </div>

          {/* Booking ID */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Booking ID</label>
            <Input
              placeholder="Booking ID..."
              value={localFilters.bookingId}
              onChange={handleChange("bookingId")}
            />
          </div>

          {/* Check-in Dates */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Check-in Start Date</label>
            <Input
              type="date"
              value={localFilters.startDate ?? ""}
              onChange={handleChange("startDate")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Check-in End Date</label>
            <Input
              type="date"
              value={localFilters.endDate ?? ""}
              onChange={handleChange("endDate")}
            />
          </div>

          {/* Guest Phone */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Guest Phone</label>
            <Input
              placeholder="Phone number..."
              value={localFilters.guestPhone ?? ""}
              onChange={handleChange("guestPhone")}
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2 sm:gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 flex-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          )}
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
