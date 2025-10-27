"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface VisitFilterState {
  ownerName: string
  ownerPhone: string
  customerName: string
  customerPhone: string
  vsid: string
  commissionFrom: string
  commissionTo: string
}

interface VisitFilterProps {
  filters: VisitFilterState
  setFilters: (filters: VisitFilterState) => void
}

// Updated VisitFilter component (without customer name and VSID)
export function VisitFilter({ filters, setFilters }: VisitFilterProps) {
  const [inputValues, setInputValues] = useState<VisitFilterState>(filters)

  const handleInputChange = (field: keyof VisitFilterState, value: string) => {
    setInputValues({
      ...inputValues,
      [field]: value,
    })
  }

  const handleApply = () => {
    setFilters(inputValues)
  }

  const handleReset = () => {
    const emptyFilters: VisitFilterState = {
      ownerName: "",
      ownerPhone: "",
      customerName: filters.customerName, // Preserve search bar filters
      customerPhone: "",
      vsid: filters.vsid, // Preserve search bar filters
      commissionFrom: "",
      commissionTo: "",
    }
    setInputValues(emptyFilters)
    setFilters(emptyFilters)
  }

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ownerName">Owner Name</Label>
        <Input
          id="ownerName"
          placeholder="Search by owner name..."
          value={inputValues.ownerName}
          onChange={(e) => handleInputChange("ownerName", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerPhone">Owner Phone</Label>
        <Input
          id="ownerPhone"
          placeholder="Search by owner phone..."
          value={inputValues.ownerPhone}
          onChange={(e) => handleInputChange("ownerPhone", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerPhone">Customer Phone</Label>
        <Input
          id="customerPhone"
          placeholder="Search by customer phone..."
          value={inputValues.customerPhone}
          onChange={(e) => handleInputChange("customerPhone", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Commission Range (₹)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="From"
            type="number"
            value={inputValues.commissionFrom}
            onChange={(e) => handleInputChange("commissionFrom", e.target.value)}
          />
          <Input
            placeholder="To"
            type="number"
            value={inputValues.commissionTo}
            onChange={(e) => handleInputChange("commissionTo", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          onClick={handleApply}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// New SearchBar component
interface SearchBarProps {
  onSearch: (searchType: 'customerName' | 'vsid', searchValue: string) => void
  initialSearchType?: 'customerName' | 'vsid'
  initialSearchValue?: string
}

export function SearchBar({ onSearch, initialSearchType = 'customerName', initialSearchValue = '' }: SearchBarProps) {
  const [searchType, setSearchType] = useState<'customerName' | 'vsid'>(initialSearchType)
  const [searchValue, setSearchValue] = useState(initialSearchValue)

  const handleSearch = () => {
    onSearch(searchType, searchValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex gap-2 w-full md:w-auto">
      <Select value={searchType} onValueChange={(value: 'customerName' | 'vsid') => setSearchType(value)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="customerName">Guest Name</SelectItem>
          <SelectItem value="vsid">VSID</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="relative flex-1 md:w-[300px]">
        <Input
          placeholder={`Search by ${searchType === 'customerName' ? 'guest' : 'VSID'}...`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pr-10"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
        >
          <Search size={18} />
        </button>
      </div>
    </div>
  )
}