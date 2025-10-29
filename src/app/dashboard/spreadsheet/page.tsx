"use client"
import axios from "axios"
import { SpreadsheetTable } from "./spreadsheetTable"
import { useEffect, useState, useRef } from "react"
import type { unregisteredOwners } from "@/util/type"
import type { FilteredPropertiesInterface } from "../newproperty/filteredProperties/page"
import FilterBar, { type FiltersInterfaces } from "./FilterBar"
import PaginationControls from "@/components/pagination-controls"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthStore } from "@/AuthStore"

const DEFAULT_LIMIT = 50

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([])
  const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([])
  const [availableCount, setAvailableCount] = useState(0)
  const [notAvailableCount, setNotAvailableCount] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedTab, setSelectedTab] = useState("available")
  const observerRef = useRef<HTMLDivElement | null>(null)
  const observerInstance = useRef<IntersectionObserver | null>(null)
  const token = useAuthStore((state) => state.token)

  const role = token?.role
  const allocations = token?.allotedArea || []
  const parsedAllocations = typeof allocations === "string" ? allocations.split(",").filter(Boolean) : allocations

  const [filters, setFilters] = useState<FiltersInterfaces>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    place:
      parsedAllocations.length === 1 ? [parsedAllocations[0]] : parsedAllocations.length > 1 ? parsedAllocations : [],
    area: [],
    zone: "",
    metroZone: "",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    dateRange: undefined,
  })

  const [limit, setLimit] = useState(DEFAULT_LIMIT)

  const getData = async (
    tab: string,
    currentPage: number,
    appliedFilters?: FiltersInterfaces,
    pageSize: number = limit,
  ) => {
    if (isLoading) return
    try {
      setIsLoading(true)
      const endpoint =
        tab === "available" ? "/api/unregisteredOwners/getAvailableList" : "/api/unregisteredOwners/getNotAvailableList"

      const effectiveFilters = { ...(appliedFilters ?? filters) }
      if (parsedAllocations.length > 0 && effectiveFilters.place.length === 0) {
        effectiveFilters.place = parsedAllocations
      }

      const response = await axios.post(endpoint, {
        filters: effectiveFilters,
        page: currentPage,
        limit: pageSize,
      })

      const newData = Array.isArray(response.data.data) ? response.data.data : [response.data.data]

      setData(newData)
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = () => {
    setPage(1)
    getData(selectedTab, 1, undefined, limit)
  }

  const handleAvailabilityChange = () => {
    getData(selectedTab, page, undefined, limit);
  getCounts();
  }

  const handleClear = () => {
    const resetFilters = {
      searchType: "",
      searchValue: "",
      propertyType: "",
      place:
        parsedAllocations.length === 1 ? [parsedAllocations[0]] : parsedAllocations.length > 1 ? parsedAllocations : [],
      area: [],
      zone: "",
      metroZone: "",
      minPrice: 0,
      maxPrice: 0,
      beds: 0,
      dateRange: undefined,
    }

    setFilters(resetFilters)
    setPage(1)
    setData([])
    getData(selectedTab, 1, resetFilters, limit)
  }

  useEffect(() => {
    setPage(1)
    getData(selectedTab, 1, undefined, limit)
  }, [selectedTab, limit])

  useEffect(() => {
    if (page > 1 || page === 1) {
      getData(selectedTab, page, undefined, limit)
    }
  }, [page, selectedTab, limit])

  const getCounts = async () => {
    try {
      let effectiveFilters = { ...filters }
      if (parsedAllocations.length > 0 && effectiveFilters.place.length === 0) {
        effectiveFilters = {
          ...effectiveFilters,
          place: parsedAllocations,
        }
      }

      const [availRes, notAvailRes] = await Promise.all([
        axios.post("/api/unregisteredOwners/getAvailableList", {
          filters: effectiveFilters,
          page: 1,
          limit: 1, // only need total
        }),
        axios.post("/api/unregisteredOwners/getNotAvailableList", {
          filters: effectiveFilters,
          page: 1,
          limit: 1,
        }),
      ])

      setAvailableCount(availRes.data.total || 0)
      setNotAvailableCount(notAvailRes.data.total || 0)
    } catch (error) {
      console.error("Failed to fetch counts:", error)
    }
  }

  useEffect(() => {
    getCounts()
  }, [filters, parsedAllocations])

  const serialOffset = (page - 1) * limit

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Spreadsheet</h1>

      <Tabs
        value={selectedTab}
        onValueChange={(val) => {
          setSelectedTab(val)
          setPage(1)
          setData([])
        }}
      >
        <TabsList>
          <TabsTrigger value="available">
            Available <span>({availableCount})</span>
          </TabsTrigger>
          <TabsTrigger value="notAvailable">
            Not Available <span>({notAvailableCount})</span>
          </TabsTrigger>
        </TabsList>

        {/* Available Tab */}
        <TabsContent value="available">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            handleSubmit={handleSubmit}
            handleClear={handleClear}
            selectedTab={selectedTab}
          />
          <SpreadsheetTable tableData={data} setTableData={setData} {...({ serialOffset } as any)} onAvailabilityChange={handleAvailabilityChange} />
          {isLoading && <p className="text-center">Loading...</p>}
          {!isLoading && total === 0 && <p className="text-center text-muted-foreground my-2">No records found</p>}
          <div className="flex items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Rows per page:</label>
              <select
                value={limit}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setLimit(next)
                  setPage(1)
                }}
                className="border rounded px-2 py-1 bg-background text-foreground text-sm"
                aria-label="Rows per page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <PaginationControls
              currentPage={page}
              total={total}
              pageSize={limit}
              onPageChange={(p) => setPage(p)}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        {/* Not Available Tab */}
        <TabsContent value="notAvailable">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            handleSubmit={handleSubmit}
            handleClear={handleClear}
            selectedTab={selectedTab}
          />
          <SpreadsheetTable tableData={data} setTableData={setData} {...({ serialOffset } as any)}  onAvailabilityChange={handleAvailabilityChange} />
          {isLoading && <p className="text-center">Loading...</p>}
          {!isLoading && total === 0 && <p className="text-center text-muted-foreground my-2">No records found</p>}
          <div className="flex items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Rows per page:</label>
              <select
                value={limit}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setLimit(next)
                  setPage(1)
                }}
                className="border rounded px-2 py-1 bg-background text-foreground text-sm"
                aria-label="Rows per page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <PaginationControls
              currentPage={page}
              total={total}
              pageSize={limit}
              onPageChange={(p) => setPage(p)}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Spreadsheet
