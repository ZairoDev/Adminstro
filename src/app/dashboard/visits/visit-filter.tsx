"use client"

import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  VISIT_CATEGORY_FILTER_OPTIONS,
  type VisitCategoryFilter,
} from "@/lib/visits/visitStatus"

export interface VisitFilterState {
  ownerName: string
  ownerPhone: string
  customerName: string
  customerPhone: string
  vsid: string
  commissionFrom: string
  commissionTo: string
  visitStatus: VisitCategoryFilter
}

const inputClass = "h-9 text-sm"

interface VisitStatusFilterProps {
  value: VisitCategoryFilter
  onChange: (value: VisitCategoryFilter) => void
}

export function VisitStatusFilter({ value, onChange }: VisitStatusFilterProps) {
  const selectedLabel =
    value === "all"
      ? "Visit Status"
      : (VISIT_CATEGORY_FILTER_OPTIONS.find((option) => option.value === value)?.label ??
        "Visit Status")

  return (
    <Select value={value} onValueChange={(next: VisitCategoryFilter) => onChange(next)}>
      <SelectTrigger className={`w-[150px] ${inputClass}`}>
        <span className="truncate">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent>
        {VISIT_CATEGORY_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface VisitFiltersBarProps {
  filters: VisitFilterState
  onChange: (filters: VisitFilterState) => void
}

export function VisitFiltersBar({ filters, onChange }: VisitFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Commission range filters — hidden for now
      <Input
        className={`w-full sm:w-[100px] ${inputClass}`}
        placeholder="₹ Min"
        type="number"
        value={filters.commissionFrom}
        onChange={(e) => onChange({ ...filters, commissionFrom: e.target.value })}
      />
      <Input
        className={`w-full sm:w-[100px] ${inputClass}`}
        placeholder="₹ Max"
        type="number"
        value={filters.commissionTo}
        onChange={(e) => onChange({ ...filters, commissionTo: e.target.value })}
      />
      */}
    </div>
  )
}

export type VisitSearchType = "customerName" | "vsid" | "ownerName"

interface SearchBarProps {
  onSearch: (searchType: VisitSearchType, searchValue: string) => void
  initialSearchType?: VisitSearchType
  initialSearchValue?: string
}

export function SearchBar({
  onSearch,
  initialSearchType = "customerName",
  initialSearchValue = "",
}: SearchBarProps) {
  const [searchType, setSearchType] = useState<VisitSearchType>(initialSearchType)
  const [searchValue, setSearchValue] = useState(initialSearchValue)

  useEffect(() => {
    setSearchType(initialSearchType)
    setSearchValue(initialSearchValue)
  }, [initialSearchType, initialSearchValue])

  const handleSearch = () => {
    onSearch(searchType, searchValue)
  }

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <Select
        value={searchType}
        onValueChange={(value: VisitSearchType) => setSearchType(value)}
      >
        <SelectTrigger className="h-9 w-[130px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="customerName">Guest</SelectItem>
          <SelectItem value="vsid">VSID</SelectItem>
          <SelectItem value="ownerName">Owner</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1 sm:w-[220px]">
        <Input
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-9 pr-9 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Search size={16} />
        </button>
      </div>
    </div>
  )
}

export type VisitPhoneSearchType = "ownerPhone" | "customerPhone"

interface PhoneSearchBarProps {
  onSearch: (searchType: VisitPhoneSearchType, searchValue: string) => void
  initialSearchType?: VisitPhoneSearchType
  initialSearchValue?: string
}

export function PhoneSearchBar({
  onSearch,
  initialSearchType = "ownerPhone",
  initialSearchValue = "",
}: PhoneSearchBarProps) {
  const [searchType, setSearchType] = useState<VisitPhoneSearchType>(initialSearchType)
  const [searchValue, setSearchValue] = useState(initialSearchValue)

  useEffect(() => {
    setSearchType(initialSearchType)
    setSearchValue(initialSearchValue)
  }, [initialSearchType, initialSearchValue])

  const handleSearch = () => {
    onSearch(searchType, searchValue)
  }

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <Select
        value={searchType}
        onValueChange={(value: VisitPhoneSearchType) => setSearchType(value)}
      >
        <SelectTrigger className="h-9 w-[150px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ownerPhone">Owner phone</SelectItem>
          <SelectItem value="customerPhone">Customer phone</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1 sm:w-[180px]">
        <Input
          placeholder="Phone..."
          type="tel"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-9 pr-9 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <Search size={16} />
        </button>
      </div>
    </div>
  )
}
