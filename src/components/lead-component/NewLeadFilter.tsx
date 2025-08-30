"use client";

import { Dispatch, SetStateAction, useState } from "react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FilterState {
  searchType?: string;
  searchTerm?: string;
  dateFilter: string;
  customDays: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy: string;
  guest: string;
  noOfBeds: string;
  propertyType: string;
  billStatus: string;
  budgetFrom: string;
  budgetTo: string;
  leadQuality: string;
  allotedArea: string;
  typeOfProperty?: string;
  rejectionReason?: string;
}

interface FilterProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

export default function LeadsFilter({ filters, setFilters }: FilterProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-[350px] dark:text-white p-4 rounded-lg space-y-4">
      <h2 className="text-lg font-semibold mb-4">Data Filters</h2>

      {/* Data filters Dropdown */}
      <div className="space-y-2">
        <Select
          value={filters.dateFilter}
          onValueChange={(value) => updateFilter("dateFilter", value)}
        >
          <SelectTrigger className="w-full  border-gray-700 text-white">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All" className="text-white hover:bg-gray-700">
              <div className="flex items-center">All</div>
            </SelectItem>
            <SelectItem value="Today" className="text-white hover:bg-gray-700">
              Today
            </SelectItem>
            <SelectItem
              value="Yesterday"
              className="text-white hover:bg-gray-700"
            >
              Yesterday
            </SelectItem>
            <SelectItem
              value="Last X Days"
              className="text-white hover:bg-gray-700"
            >
              Last X Days
            </SelectItem>
            <SelectItem
              value="Custom Date Range"
              className="text-white hover:bg-gray-700"
            >
              Custom Date Range
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Conditional inputs based on selection */}
        {filters.dateFilter === "Last X Days" && (
          <Input
            placeholder="Enter number of days"
            value={filters.customDays}
            onChange={(e) => updateFilter("customDays", e.target.value)}
            className=" border-gray-700 text-white placeholder-gray-400"
          />
        )}

        {filters.dateFilter === "Custom Date Range" && (
          <div className="flex space-x-2">
            <Input
              placeholder="Start Date"
              type="date"
              // value={filters.fromDate?.toISOString().split("T")[0]}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  fromDate: new Date(e.target.value),
                }))
              }
            />
            <Input
              placeholder="End Date"
              type="date"
              // value={filters.toDate?.toISOString().split("T")[0]}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  toDate: new Date(e.target.value),
                }))
              }
            />
          </div>
        )}
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sort By</h3>
        <Select
          value={filters.sortBy}
          onValueChange={(value) => updateFilter("sortBy", value)}
        >
          <SelectTrigger className="w-full  border-gray-700 text-white">
            <SelectValue placeholder="Select Priority Order" />
          </SelectTrigger>
          <SelectContent className=" border-gray-700">
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Asc" className="text-white hover:bg-gray-700">
              Priority : &nbsp; Low To High
            </SelectItem>
            <SelectItem value="Desc" className="text-white hover:bg-gray-700">
              Priority : &nbsp; High To Low
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* filters Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Guest filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Guest filters</Label>
          <Input
            value={filters.guest}
            onChange={(e) => updateFilter("guest", e.target.value)}
            className=" border-gray-700 text-white"
          />
        </div>

        {/* Beds filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Beds filters</Label>
          <Input
            value={filters.noOfBeds}
            onChange={(e) => updateFilter("noOfBeds", e.target.value)}
            className=" border-gray-700 text-white"
          />
        </div>

        {/* Furnished filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Furnished filters</Label>
          <Select
            value={filters.propertyType}
            onValueChange={(value) => updateFilter("propertyType", value)}
          >
            <SelectTrigger className=" border-gray-700 text-white">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent className=" border-gray-700">
              <SelectItem
                value="Furnished"
                className="text-white hover:bg-gray-700"
              >
                Furnished
              </SelectItem>
              <SelectItem
                value="Unfurnished"
                className="text-white hover:bg-gray-700"
              >
                Unfurnished
              </SelectItem>
              <SelectItem
                value="Semi-furnished"
                className="text-white hover:bg-gray-700"
              >
                Semi-Furnished
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bill filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Bill filters</Label>
          <Select
            value={filters.billStatus}
            onValueChange={(value) => updateFilter("billStatus", value)}
          >
            <SelectTrigger className=" border-gray-700 text-white">
              <SelectValue placeholder="Bill" />
            </SelectTrigger>
            <SelectContent className=" border-gray-700">
              <SelectItem
                value="With Bill"
                className="text-white hover:bg-gray-700"
              >
                With Bill
              </SelectItem>
              <SelectItem
                value="Without Bill"
                className="text-white hover:bg-gray-700"
              >
                Without Bill
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Budget filters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Budget filters</Label>
        <div className="flex space-x-2">
          <Input
            placeholder="From"
            value={filters.budgetFrom}
            onChange={(e) => updateFilter("budgetFrom", e.target.value)}
            className=" border-gray-700 text-white placeholder-gray-400"
          />
          <Input
            placeholder="To"
            value={filters.budgetTo}
            onChange={(e) => updateFilter("budgetTo", e.target.value)}
            className=" border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Lead Quality */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Lead Quality</Label>
        <Select
          value={filters.leadQuality}
          onValueChange={(value) => updateFilter("leadQuality", value)}
        >
          <SelectTrigger className=" border-gray-700 text-white">
            <SelectValue placeholder="Lead Quality" />
          </SelectTrigger>
          <SelectContent className=" border-gray-700">
            <SelectItem value="Good" className="text-white hover:bg-gray-700">
              Good
            </SelectItem>
            <SelectItem
              value="Very Good"
              className="text-white hover:bg-gray-700"
            >
              Very Good
            </SelectItem>
            <SelectItem
              value="Average"
              className="text-white hover:bg-gray-700"
            >
              Average
            </SelectItem>
            <SelectItem
              value="Below Average"
              className="text-white hover:bg-gray-700"
            >
              Below Average
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Rejection Reason</Label>
        <Select
          value={filters.rejectionReason}
          onValueChange={(value) => updateFilter("rejectionReason", value)}
        >
          <SelectTrigger className=" border-gray-700 text-white">
            <SelectValue placeholder="Rejection Reason" />
          </SelectTrigger>
          <SelectContent className=" border-gray-700">
            <SelectItem
              value="Allready got it"
              className="text-white hover:bg-gray-700"
            >
              Allready got it
            </SelectItem>
            <SelectItem
              value="Number of people exceeded"
              className="text-white hover:bg-gray-700"
            >
              Number of people exceeded
            </SelectItem>
            <SelectItem
              value="Low Budget"
              className="text-white hover:bg-gray-700"
            >
              Low Budget
            </SelectItem>
            <SelectItem
              value="Not Replying"
              className="text-white hover:bg-gray-700"
            >
              Not Replying
            </SelectItem>
            <SelectItem
              value="Late Response"
              className="text-white hover:bg-gray-700"
            >
              Late Response
            </SelectItem>
            <SelectItem
              value="Blocked on whatsapp"
              className="text-white hover:bg-gray-700"
            >
              Blocked on whatsapp
            </SelectItem>
            <SelectItem
              value="Not on whatsapp"
              className="text-white hover:bg-gray-700"
            >
              Not on whatsapp
            </SelectItem>
            <SelectItem
              value="Delayed the Traveling"
              className="text-white hover:bg-gray-700"
            >
              Delayed the Traveling
            </SelectItem>
            <SelectItem
              value="Didn't like the option"
              className="text-white hover:bg-gray-700"
            >
              Didn&apos;t like the option
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
