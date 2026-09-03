"use client"

import axios from "axios"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import Heading from "@/components/Heading"
import { useToast } from "@/hooks/use-toast"
import HandLoader from "@/components/HandLoader"
import { Toaster } from "@/components/ui/toaster"
import {
  SearchBar,
  PhoneSearchBar,
  VisitStatusFilter,
  type VisitFilterState,
  type VisitSearchType,
  type VisitPhoneSearchType,
} from "@/app/dashboard/visits/visit-filter"
import type { VisitInterface } from "@/util/type"
import VisitTable from "./visit-table"
import {
  VISIT_CATEGORY_FILTER_OPTIONS,
  isVisitCategoryFilter,
  type VisitCategoryFilter,
} from "@/lib/visits/visitStatus"

const PAGE_LIMIT = 50

function getInitialStatusFilter(searchParams: URLSearchParams | null): VisitCategoryFilter {
  const status = searchParams?.get("status") ?? "all"
  return isVisitCategoryFilter(status) ? status : "all"
}

const VisitsPage = () => {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [visits, setVisits] = useState<VisitInterface[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [totalVisits, setTotalVisits] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)

  const [page, setPage] = useState<number>(
    Math.max(1, Number.parseInt(searchParams?.get("page") ?? "1") || 1)
  )

  const defaultFilters: VisitFilterState = {
    ownerName: "",
    ownerPhone: "",
    customerName: "",
    customerPhone: "",
    vsid: "",
    commissionFrom: "",
    commissionTo: "",
    visitStatus: getInitialStatusFilter(searchParams),
  }

  const [filters, setFilters] = useState<VisitFilterState>({ ...defaultFilters })

  const updatePageInUrl = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined)
    if (newPage <= 1) {
      params.delete("page")
    } else {
      params.set("page", newPage.toString())
    }
    syncUrlParams(params)
  }

  const syncUrlParams = (params: URLSearchParams) => {
    const query = params.toString()
    router.push(query ? `?${query}` : "?")
  }

  const updateStatusInUrl = (status: VisitCategoryFilter) => {
    const params = new URLSearchParams(searchParams ?? undefined)
    if (status === "all") {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    params.delete("page")
    syncUrlParams(params)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages) || newPage === page) {
      return
    }
    setPage(newPage)
    updatePageInUrl(newPage)
  }

  const applyFilters = (nextFilters: VisitFilterState) => {
    setFilters(nextFilters)
    updateStatusInUrl(nextFilters.visitStatus)
    if (page !== 1) {
      setPage(1)
      updatePageInUrl(1)
    }
  }

  const renderPaginationItems = () => {
    if (totalPages <= 1) return null

    const items = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          href="#"
          aria-disabled={page <= 1}
          className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          onClick={(e) => {
            e.preventDefault()
            handlePageChange(page - 1)
          }}
        />
      </PaginationItem>
    )

    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
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
        </PaginationItem>
      )
    }

    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    items.push(
      <PaginationItem key="next">
        <PaginationNext
          href="#"
          aria-disabled={page >= totalPages}
          className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
          onClick={(e) => {
            e.preventDefault()
            handlePageChange(page + 1)
          }}
        />
      </PaginationItem>
    )

    return items
  }

  const overdueOnly = searchParams?.get("overdue") === "1"

  const filterVisits = async () => {
    try {
      setLoading(true)
      const response = await axios.post("/api/visits/getVisits", {
        ...filters,
        visitCategory: filters.visitStatus,
        overdueOnly,
        page,
        limit: PAGE_LIMIT,
      })

      const nextTotalPages = response.data.totalPages ?? 0
      const safePage = response.data.page ?? page

      setVisits(response.data.data ?? [])
      setTotalPages(nextTotalPages)
      setTotalVisits(response.data.totalVisits ?? 0)

      if (safePage !== page) {
        setPage(safePage)
        updatePageInUrl(safePage)
      }
    } catch (err) {
      toast({
        title: "Unable to fetch visits",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (searchType: VisitSearchType, searchValue: string) => {
    applyFilters({
      ...filters,
      customerName: searchType === "customerName" ? searchValue : "",
      vsid: searchType === "vsid" ? searchValue : "",
      ownerName: searchType === "ownerName" ? searchValue : "",
    })
  }

  const handlePhoneSearch = (searchType: VisitPhoneSearchType, searchValue: string) => {
    applyFilters({
      ...filters,
      ownerPhone: searchType === "ownerPhone" ? searchValue : "",
      customerPhone: searchType === "customerPhone" ? searchValue : "",
    })
  }

  const getSearchType = (): VisitSearchType => {
    if (filters.vsid) return "vsid"
    if (filters.ownerName) return "ownerName"
    return "customerName"
  }

  const getSearchValue = () => filters.vsid || filters.ownerName || filters.customerName

  const getPhoneSearchType = (): VisitPhoneSearchType =>
    filters.customerPhone ? "customerPhone" : "ownerPhone"

  const getPhoneSearchValue = () => filters.ownerPhone || filters.customerPhone

  const getActiveFilters = () => {
    const active: Array<{ key: keyof VisitFilterState; label: string; value: string }> = []

    if (filters.visitStatus !== "all") {
      active.push({
        key: "visitStatus",
        label: "Status",
        value:
          VISIT_CATEGORY_FILTER_OPTIONS.find((o) => o.value === filters.visitStatus)?.label ??
          filters.visitStatus,
      })
    }
    if (filters.customerName) {
      active.push({ key: "customerName", label: "Guest", value: filters.customerName })
    }
    if (filters.vsid) {
      active.push({ key: "vsid", label: "VSID", value: filters.vsid })
    }
    if (filters.ownerName) {
      active.push({ key: "ownerName", label: "Owner", value: filters.ownerName })
    }
    if (filters.ownerPhone) {
      active.push({ key: "ownerPhone", label: "Owner phone", value: filters.ownerPhone })
    }
    if (filters.customerPhone) {
      active.push({ key: "customerPhone", label: "Customer phone", value: filters.customerPhone })
    }
    if (filters.commissionFrom || filters.commissionTo) {
      const commissionValue = `₹${filters.commissionFrom || "0"}–${filters.commissionTo || "∞"}`
      active.push({ key: "commissionFrom", label: "Commission", value: commissionValue })
    }

    return active
  }

  const removeFilter = (key: keyof VisitFilterState) => {
    const newFilters = { ...filters }

    if (key === "commissionFrom") {
      newFilters.commissionFrom = ""
      newFilters.commissionTo = ""
    } else if (key === "visitStatus") {
      newFilters.visitStatus = "all"
    } else if (
      key === "customerName" ||
      key === "vsid" ||
      key === "ownerName" ||
      key === "ownerPhone" ||
      key === "customerPhone"
    ) {
      newFilters[key] = ""
    } else {
      newFilters[key] = ""
    }

    applyFilters(newFilters)
  }

  const clearAllFilters = () => {
    applyFilters({ ...defaultFilters, visitStatus: "all" })
  }

  useEffect(() => {
    const urlPage = Math.max(1, Number.parseInt(searchParams?.get("page") ?? "1") || 1)
    setPage((prev) => (prev !== urlPage ? urlPage : prev))

    const urlStatus = getInitialStatusFilter(searchParams)
    setFilters((prev) =>
      prev.visitStatus !== urlStatus ? { ...prev, visitStatus: urlStatus } : prev
    )
  }, [searchParams])

  useEffect(() => {
    filterVisits()
  }, [filters, page, overdueOnly])

  const activeFilters = getActiveFilters()
  const rangeStart = totalVisits === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(page * PAGE_LIMIT, totalVisits)

  return (
    <div className="w-full">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full gap-4">
        <div className="w-full">
          <Heading
            heading={overdueOnly ? "Overdue Visits" : "All Visits"}
            subheading={
              overdueOnly
                ? "Visits past the 4-day close-out window that still need a final status"
                : "View and manage all visits created till now"
            }
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap flex-1">
          <SearchBar
            onSearch={handleSearch}
            initialSearchType={getSearchType()}
            initialSearchValue={getSearchValue()}
          />
          <PhoneSearchBar
            onSearch={handlePhoneSearch}
            initialSearchType={getPhoneSearchType()}
            initialSearchValue={getPhoneSearchValue()}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VisitStatusFilter
            value={filters.visitStatus}
            onChange={(visitStatus) => applyFilters({ ...filters, visitStatus })}
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => removeFilter(filter.key)}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <span className="text-foreground">{filter.label}:</span>
              <span>{filter.value}</span>
              <X size={12} />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="w-full mt-3">
        {loading ? (
          <div className="flex mt-2 min-h-screen items-center justify-center">
            <HandLoader />
          </div>
        ) : (
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              {visits.length > 0 ? (
                <VisitTable
                  visits={visits}
                  page={page}
                  pageSize={PAGE_LIMIT}
                  onVisitUpdated={filterVisits}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                  No visits found
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 w-full">
              <p className="text-xs text-muted-foreground">
                {totalVisits === 0
                  ? "0 results"
                  : `Showing ${rangeStart}–${rangeEnd} of ${totalVisits} results`}
                {totalPages > 0 ? ` · Page ${page} of ${totalPages}` : ""}
              </p>
              {totalPages > 1 && (
                <Pagination className="flex justify-end mx-0 w-auto">
                  <PaginationContent className="text-xs flex flex-wrap justify-end">
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VisitsPage
