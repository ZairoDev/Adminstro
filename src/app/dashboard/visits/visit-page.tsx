"use client"

import axios from "axios"
import { SlidersHorizontal, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import Heading from "@/components/Heading"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import HandLoader from "@/components/HandLoader"
import { Toaster } from "@/components/ui/toaster"
import VisitFilter, { type VisitFilterState } from "@/app/dashboard/visits/visit-filter"
import type { VisitInterface } from "@/util/type"

import VisitTable from "./visit-table"

const VisitsPage = () => {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [visits, setVisits] = useState<VisitInterface[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [totalVisits, setTotalVisits] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  const [page, setPage] = useState<number>(Number.parseInt(searchParams.get("page") ?? "1"))
  const [allotedArea, setAllotedArea] = useState("")

  const defaultFilters: VisitFilterState = {
    ownerName: "",
    ownerPhone: "",
    customerName: "",
    customerPhone: "",
    vsid: "",
    commissionFrom: "",
    commissionTo: "",
  }

  const [filters, setFilters] = useState<VisitFilterState>({ ...defaultFilters })

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`?${params.toString()}`)
    setPage(newPage)
  }

  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(i)
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      )
    }
    return items
  }

  const filterVisits = async () => {
    try {
      setLoading(true)
      const response = await axios.post("/api/visits/getVisits", filters)
      setVisits(response.data.data)
      setTotalPages(response.data.totalPages)
      setTotalVisits(response.data.totalVisits)
    } catch (err) {
      toast({
        title: "Unable to fetch visits",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get active filters
  const getActiveFilters = () => {
    const active: Array<{ key: keyof VisitFilterState; label: string; value: string }> = []
    
    if (filters.ownerName) {
      active.push({ key: "ownerName", label: "Owner Name", value: filters.ownerName })
    }
    if (filters.ownerPhone) {
      active.push({ key: "ownerPhone", label: "Owner Phone", value: filters.ownerPhone })
    }
    if (filters.customerName) {
      active.push({ key: "customerName", label: "Customer Name", value: filters.customerName })
    }
    if (filters.customerPhone) {
      active.push({ key: "customerPhone", label: "Customer Phone", value: filters.customerPhone })
    }
    if (filters.vsid) {
      active.push({ key: "vsid", label: "VSID", value: filters.vsid })
    }
    if (filters.commissionFrom || filters.commissionTo) {
      const commissionValue = `€${filters.commissionFrom || "0"} - €${filters.commissionTo || "∞"}`
      active.push({ key: "commissionFrom", label: "Commission", value: commissionValue })
    }
    
    return active
  }

  // Remove a specific filter
  const removeFilter = (key: keyof VisitFilterState) => {
    const newFilters = { ...filters }
    
    if (key === "commissionFrom") {
      newFilters.commissionFrom = ""
      newFilters.commissionTo = ""
    } else {
      newFilters[key] = ""
    }
    
    setFilters(newFilters)
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({ ...defaultFilters })
  }

  useEffect(() => {
    setPage(Number.parseInt(searchParams.get("page") ?? "1"))
    const getAllotedArea = async () => {
      try {
        const response = await axios.get("/api/getAreaFromToken")
        setAllotedArea(response.data.area)
      } catch (err: any) {
        console.log("error in getting area: ", err)
        toast({
          title: "Unable to Apply Filters",
          variant: "destructive",
        })
      }
    }
    getAllotedArea()
  }, [])

  useEffect(() => {
    filterVisits()
  }, [filters])

  const activeFilters = getActiveFilters()

  return (
    <div className="w-full">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading heading="All Leads" subheading="You will get the list of leads that created till now" />
        </div>
        <div className="flex md:flex-row flex-col-reverse gap-x-2 justify-between w-full md:w-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col items-center">
                <VisitFilter filters={filters} setFilters={setFilters} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span className="font-medium">{filter.label}:</span>
              <span>{filter.value}</span>
              <button
                onClick={() => removeFilter(filter.key)}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium underline"
          >
            Clear All
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="">
          <div className="mt-2 border rounded-lg min-h-[90vh]">
            {visits.length > 0 && <VisitTable visits={visits} />}
          </div>
          <div className="flex items-center justify-between p-2 w-full">
            <p className="text-xs">
              Page {page} of {totalPages} — {totalVisits} total results
            </p>
            <Pagination className="flex justify-end">
              <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  )
}

export default VisitsPage