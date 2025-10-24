"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

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

export default function VisitFilter({ filters, setFilters }: VisitFilterProps) {
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
      customerName: "",
      customerPhone: "",
      vsid: "",
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
        <Label htmlFor="customerName">Customer Name</Label>
        <Input
          id="customerName"
          placeholder="Search by customer name..."
          value={inputValues.customerName}
          onChange={(e) => handleInputChange("customerName", e.target.value)}
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
        <Label htmlFor="vsid">VSID</Label>
        <Input
          id="vsid"
          placeholder="Search by VSID..."
          value={inputValues.vsid}
          onChange={(e) => handleInputChange("vsid", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Commission Range (€)</Label>
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