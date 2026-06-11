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
  createdBy?: string;
  salesPriority?: string;
  searchType?: string;
  searchTerm?: string;
  dateFilter: string;
  customDays: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy: string;
  status?: string;
  guest: string;
  noOfBeds: string;
  propertyType: string;
  billStatus: string;
  budgetFrom: string;
  budgetTo: string;
  leadQuality: string;
  allotedArea: string;
  typeOfProperty?: string;
  quickPropertyFilters?: string[];
  rejectionReason?: string;
  leadQualityByTeamLead?: string;
}

interface FilterProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
}

export default function LeadsFilter({ filters, setFilters }: FilterProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateMessageStatusFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-[350px] text-foreground p-4 rounded-lg space-y-4">
      <h2 className="text-lg font-semibold mb-4">Data Filters</h2>

      {/* Data filters Dropdown */}
      <div className="space-y-2">
        <Select
          value={filters.dateFilter}
          onValueChange={(value) => updateFilter("dateFilter", value)}
        >
          <SelectTrigger className="w-full  border-input text-foreground">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All" className="hover:bg-accent hover:text-accent-foreground">
              <div className="flex items-center">All</div>
            </SelectItem>
            <SelectItem value="Today" className="hover:bg-accent hover:text-accent-foreground">
              Today
            </SelectItem>
            <SelectItem
              value="Yesterday"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Yesterday
            </SelectItem>
            <SelectItem
              value="Last X Days"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Last X Days
            </SelectItem>
            <SelectItem
              value="Custom Date Range"
              className="hover:bg-accent hover:text-accent-foreground"
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
            className=" border-input text-foreground placeholder:text-muted-foreground"
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
        <h3 className="text-sm font-medium">Sort By Response</h3>
        <Select
          value={filters.sortBy}
          onValueChange={(value) => updateFilter("sortBy", value)}
        >
          <SelectTrigger className="w-full  border-input text-foreground">
            <SelectValue placeholder="Select Priority Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Asc" className="hover:bg-accent hover:text-accent-foreground">
              Response : &nbsp; waiting for reply to send reply
            </SelectItem>
            <SelectItem value="Desc" className="hover:bg-accent hover:text-accent-foreground">
              Response : &nbsp; send reply to waiting for reply
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sort By Message Status</h3>
        <Select
          value={filters.status}
          onValueChange={(value) => updateMessageStatusFilter("status", value)}
        >
          <SelectTrigger className="w-full  border-input text-foreground">
            <SelectValue placeholder="Select Priority Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Default" className="hover:bg-accent hover:text-accent-foreground">
              Status : &nbsp; Default Order
            </SelectItem>
            <SelectItem value="Reverse" className="hover:bg-accent hover:text-accent-foreground">
              Status : &nbsp; Reverse Order
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
            className=" border-input text-foreground"
          />
        </div>

        {/* Beds filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Beds filters</Label>
          <Input
            value={filters.noOfBeds}
            onChange={(e) => updateFilter("noOfBeds", e.target.value)}
            className=" border-input text-foreground"
          />
        </div>

        {/* Furnished filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Furnished filters</Label>
          <Select
            value={filters.propertyType}
            onValueChange={(value) => updateFilter("propertyType", value)}
          >
            <SelectTrigger className=" border-input text-foreground">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="Furnished"
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Furnished
              </SelectItem>
              <SelectItem
                value="Unfurnished"
                className="hover:bg-accent hover:text-accent-foreground"
              >
                Unfurnished
              </SelectItem>
              <SelectItem
                value="Semi-furnished"
                className="hover:bg-accent hover:text-accent-foreground"
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
            <SelectTrigger className=" border-input text-foreground">
              <SelectValue placeholder="Bill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="With Bill"
                className="hover:bg-accent hover:text-accent-foreground"
              >
                With Bill
              </SelectItem>
              <SelectItem
                value="Without Bill"
                className="hover:bg-accent hover:text-accent-foreground"
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
            className=" border-input text-foreground placeholder:text-muted-foreground"
          />
          <Input
            placeholder="To"
            value={filters.budgetTo}
            onChange={(e) => updateFilter("budgetTo", e.target.value)}
            className=" border-input text-foreground placeholder:text-muted-foreground"
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
          <SelectTrigger className=" border-input text-foreground">
            <SelectValue placeholder="Lead Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Good" className="hover:bg-accent hover:text-accent-foreground">
              Good
            </SelectItem>
            <SelectItem
              value="Very Good"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Very Good
            </SelectItem>
            <SelectItem
              value="Average"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Average
            </SelectItem>
            <SelectItem
              value="Below Average"
              className="hover:bg-accent hover:text-accent-foreground"
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
          <SelectTrigger className=" border-input text-foreground">
            <SelectValue placeholder="Rejection Reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="Allready got it"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Allready got it
            </SelectItem>
            <SelectItem
              value="Number of people exceeded"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Number of people exceeded
            </SelectItem>
            <SelectItem
              value="Low Budget"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Low Budget
            </SelectItem>
            <SelectItem
              value="Not Replying"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Not Replying
            </SelectItem>
            <SelectItem
              value="Late Response"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Late Response
            </SelectItem>
            <SelectItem
              value="Blocked on whatsapp"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Blocked on whatsapp
            </SelectItem>
            <SelectItem
              value="Not on whatsapp"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Not on whatsapp
            </SelectItem>
            <SelectItem
              value="Delayed the Traveling"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Delayed the Traveling
            </SelectItem>
            <SelectItem
              value="Didn't like the option"
              className="hover:bg-accent hover:text-accent-foreground"
            >
              Didn&apos;t like the option
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
