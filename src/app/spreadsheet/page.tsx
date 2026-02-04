"use client";
import axios from "axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState, useRef } from "react";
import type { unregisteredOwners } from "@/util/type";
// import type { FilteredPropertiesInterface } from "../newproperty/filteredProperties/page"
import FilterBar, { type FiltersInterfaces } from "./FilterBar";
import PaginationControls from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/AuthStore";
import Link from "next/link";

const DEFAULT_LIMIT = 50;

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([]);
  //   const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([])
  const [availableCount, setAvailableCount] = useState(0);
  const [notAvailableCount, setNotAvailableCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTab, setSelectedTab] = useState("available");
  const observerRef = useRef<HTMLDivElement | null>(null);
  const observerInstance = useRef<IntersectionObserver | null>(null);
  const token = useAuthStore((state) => state.token);

  const role = token?.role;
  const allocations = token?.allotedArea || [];
  const parsedAllocations =
    typeof allocations === "string"
      ? allocations.split(",").filter(Boolean)
      : allocations;

  const [filters, setFilters] = useState<FiltersInterfaces>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    place:
      parsedAllocations.length === 1
        ? [parsedAllocations[0]]
        : parsedAllocations.length > 1
        ? parsedAllocations
        : [],
    area: [],
    zone: "",
    metroZone: "",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    dateRange: undefined,
    isImportant:false,
    isPinned:false
  });

  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const getData = async (
    tab: string,
    currentPage: number,
    appliedFilters?: FiltersInterfaces,
    pageSize: number = limit
  
  ) => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const endpoint =
        tab === "available"
          ? "/api/unregisteredOwners/getAvailableList"
          : "/api/unregisteredOwners/getNotAvailableList";

      const effectiveFilters = { ...(appliedFilters ?? filters) };
      if (parsedAllocations.length > 0 && effectiveFilters.place.length === 0) {
        effectiveFilters.place = parsedAllocations;
      }

      const response = await axios.post(endpoint, {
        filters: effectiveFilters,
        page: currentPage,
        limit: pageSize,
      });

      const newData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      setData(newData);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvailabilityChange = () => {
    getData(selectedTab, page, undefined, limit);
    getCounts(filters as FiltersInterfaces);
  };

  const prevFiltersRef = useRef<string>("");
  const isMountedRef = useRef(false);

  const getCounts = async (appliedFilters: FiltersInterfaces) => {
    try {
      let effectiveFilters = { ...appliedFilters };
      if (parsedAllocations.length > 0 && effectiveFilters.place.length === 0) {
        effectiveFilters.place = parsedAllocations;
      }
      const response = await axios.post("/api/unregisteredOwners/getCounts", {
        filters: effectiveFilters,
      });
      setAvailableCount(response.data.availableCount || 0);
      setNotAvailableCount(response.data.notAvailableCount || 0);
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  };

  useEffect(() => {
    const filtersKey = JSON.stringify({ selectedTab, limit, filters });
    if (prevFiltersRef.current === filtersKey && isMountedRef.current) return;
    prevFiltersRef.current = filtersKey;
    isMountedRef.current = true;
    setPage(1);
    getData(selectedTab, 1, filters, limit);
    getCounts(filters);
  }, [selectedTab, limit, filters]);

  useEffect(() => {
    if (page > 1) {
      getData(selectedTab, page, filters, limit);
    }
  }, [page]);

  const serialOffset = (page - 1) * limit;

  return (
    <div className="m-4">
      <div className="flex items-center justify-between mb-6">
  {/* Left section - Back button */}
  <Link
    href="/dashboard"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium 
    text-foreground hover:bg-muted transition-colors"
  >
    ← Back
  </Link>

  {/* Center section - Title */}
  <h1 className="text-xl font-bold text-center flex-1">Owner Sheet</h1>

  {/* Spacer for symmetry */}
  <div className="w-[70px]" />
</div>

      <Tabs
        value={selectedTab}
        onValueChange={(val) => {
          setSelectedTab(val);
          setPage(1);
          // setData([]);
        }}
        className="relative flex flex-col min-h-[80vh] border rounded-lg shadow-sm bg-background"
      >
        {/* Tab Content Area */}
        <div className="flex-1 px-2  pb-16 overflow-auto">
          {/* Available Tab */}
          <TabsContent value="available" className="h-full">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              selectedTab={selectedTab}
            />
            <SpreadsheetTable
              tableData={data}
              setTableData={setData}
              {...({ serialOffset } as any)}
              onAvailabilityChange={handleAvailabilityChange}
            />
            {isLoading && <p className="text-center mt-4">Loading...</p>}
            {!isLoading && total === 0 && (
              <p className="text-center text-muted-foreground my-2">
                No records found
              </p>
            )}
            {/* <div className="flex items-center justify-between mt-4 gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Rows per page:</label>
          <select
            value={limit}
            onChange={(e) => {
              const next = Number(e.target.value)
              setLimit(next)
              setPage(1)
            }}
            className="border rounded px-2 py-1 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Rows per page"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div> */}
          </TabsContent>

          {/* Not Available Tab */}
          <TabsContent value="notAvailable" className="h-full">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              selectedTab={selectedTab}
            />
            <SpreadsheetTable
              tableData={data}
              setTableData={setData}
              {...({ serialOffset } as any)}
              onAvailabilityChange={handleAvailabilityChange}
            />
            {isLoading && <p className="text-center mt-4">Loading...</p>}
            {!isLoading && total === 0 && (
              <p className="text-center text-muted-foreground my-2">
                No records found
              </p>
            )}
            <div className="flex items-center justify-between mt-4 gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">
                  Rows per page:
                </label>
                <select
                  value={limit}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setLimit(next);
                    setPage(1);
                  }}
                  className="border rounded px-2 py-1 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Rows per page"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </TabsContent>
        </div>

        {/* Bottom Bar: Tabs + Pagination (Excel-like) */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-muted/40 px-4 py-2 flex items-center justify-between">
          {/* Tabs on the left */}
          <TabsList className="flex gap-2 bg-transparent">
            <TabsTrigger
              value="available"
              className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 
        data-[state=active]:bg-background data-[state=active]:shadow-sm 
        data-[state=active]:text-primary hover:bg-background/70"
            >
              Available{" "}
              <span className="ml-1 text-muted-foreground">
                ({availableCount})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="notAvailable"
              className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 
        data-[state=active]:bg-background data-[state=active]:shadow-sm 
        data-[state=active]:text-primary hover:bg-background/70"
            >
              Not Available{" "}
              <span className="ml-1 text-muted-foreground">
                ({notAvailableCount})
              </span>
            </TabsTrigger>
            {/* <TabsTrigger
              value="Broker"
              className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 
        data-[state=active]:bg-background data-[state=active]:shadow-sm 
        data-[state=active]:text-primary hover:bg-background/70"
            >
              Broker{" "}
              <span className="ml-1 text-muted-foreground"></span>
            </TabsTrigger> */}
          </TabsList>

          {/* Pagination on the right */}
          <div className="flex items-center gap-4">
            <PaginationControls
              currentPage={page}
              total={total}
              pageSize={limit}
              onPageChange={(p) => setPage(p)}
              isLoading={isLoading}
            />
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Spreadsheet;
