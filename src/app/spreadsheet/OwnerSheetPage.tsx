"use client";

import axios from "@/util/axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState, useRef, type ReactNode } from "react";
import type { unregisteredOwners } from "@/util/type";
import FilterBar, { type FiltersInterfaces } from "./FilterBar";
import { parseAllotedAreaForClient } from "@/util/ownerSheetLocationFilter";
import PaginationControls from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/AuthStore";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  OWNER_SHEET_LONG_TERM_CONFIG,
  OWNER_SHEET_SHORT_TERM_CONFIG,
  type OwnerSheetConfig,
} from "./ownerSheetConfig";
import { canAccessOwnerSheetVariant } from "@/util/employeeRentalTypeAccess";

const DEFAULT_LIMIT = 50;

const DEFAULT_FILTERS: FiltersInterfaces = {
  searchType: "",
  searchValue: "",
  propertyType: "",
  place: [],
  area: [],
  zone: "",
  metroZone: "",
  minPrice: 0,
  maxPrice: 0,
  beds: 0,
  dateRange: undefined,
};

function loadPersistedFilters(storageKey: string): FiltersInterfaces {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return DEFAULT_FILTERS;
    const saved = JSON.parse(raw) as {
      place?: string[];
      area?: string[];
    };
    return {
      ...DEFAULT_FILTERS,
      place: Array.isArray(saved.place) ? saved.place : [],
      area: Array.isArray(saved.area) ? saved.area : [],
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function SheetDataPanel({
  isLoading,
  total,
  children,
}: {
  isLoading: boolean;
  total: number;
  children: ReactNode;
}) {
  return (
    <>
      <div className="relative min-h-[min(50vh,420px)]">
        {children}
        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-background/80 backdrop-blur-[1px]"
            aria-busy="true"
            aria-label="Loading spreadsheet data"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading results…
            </p>
          </div>
        )}
      </div>
      {!isLoading && total === 0 && (
        <p className="text-center text-muted-foreground my-4">
          No records found
        </p>
      )}
    </>
  );
}

export function OwnerSheetPage({ config }: { config: OwnerSheetConfig }) {
  const [data, setData] = useState<unregisteredOwners[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [notAvailableCount, setNotAvailableCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTab, setSelectedTab] = useState("available");
  const getDataAbortRef = useRef<AbortController | null>(null);
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);

  const [hasMounted, setHasMounted] = useState(false);
  const [filters, setFilters] = useState<FiltersInterfaces>(DEFAULT_FILTERS);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const role = hasMounted ? token?.role : undefined;
  const rentalType = hasMounted ? token?.rentalType : undefined;
  const isSalesInternOnly = role === "sales-intern";
  const otherSheetConfig =
    config.variant === "long-term"
      ? OWNER_SHEET_SHORT_TERM_CONFIG
      : OWNER_SHEET_LONG_TERM_CONFIG;
  const otherSheetHref =
    otherSheetConfig.variant === "long-term"
      ? "/spreadsheet"
      : "/spreadsheet-short-term";
  const canShowOtherSheet =
    !!role &&
    canAccessOwnerSheetVariant(rentalType, role, otherSheetConfig.variant);
  const canShowGeoSearch =
    !!role &&
    canAccessOwnerSheetVariant(rentalType, role, "long-term") &&
    !isSalesInternOnly;

  useEffect(() => {
    setFilters(loadPersistedFilters(config.filterStorageKey));
    setHasMounted(true);
  }, [config.filterStorageKey]);

  const getData = async (
    tab: string,
    currentPage: number,
    appliedFilters?: FiltersInterfaces,
    pageSize: number = limit,
  ) => {
    getDataAbortRef.current?.abort();
    const controller = new AbortController();
    getDataAbortRef.current = controller;

    try {
      setIsLoading(true);
      const endpoint =
        tab === "available"
          ? `${config.apiBasePath}/getAvailableList`
          : `${config.apiBasePath}/getNotAvailableList`;

      const effectiveFilters = { ...(appliedFilters ?? filters) };

      const response = await axios.post(
        endpoint,
        {
          filters: effectiveFilters,
          page: currentPage,
          limit: pageSize,
          upcomingOnly: tab === "upcoming",
        },
        { signal: controller.signal },
      );

      const newData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      setData(newData);
      setTotal(response.data.total || 0);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      console.error("Failed to fetch data:", error);
    } finally {
      if (getDataAbortRef.current === controller) {
        setIsLoading(false);
        getDataAbortRef.current = null;
      }
    }
  };

  const handleAvailabilityChange = () => {
    getData(selectedTab, page, undefined, limit);
    getCounts(filters as FiltersInterfaces);
  };

  const prevFiltersRef = useRef<string>("");
  const isMountedRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(
      config.filterStorageKey,
      JSON.stringify({
        place: filters.place,
        area: filters.area,
      }),
    );
  }, [config.filterStorageKey, filters.place, filters.area]);

  useEffect(() => {
    const syncAllotedArea = async () => {
      if (!token?.id) return;
      try {
        const response = await axios.post("/api/employee/getEmployeeDetails", {
          userId: token.id,
        });
        const fresh = parseAllotedAreaForClient(
          response.data?.data?.allotedArea,
        );
        const freshRentalType =
          response.data?.data?.rentalType ?? token.rentalType ?? null;
        const current = parseAllotedAreaForClient(token.allotedArea);
        const sameArea =
          fresh.length === current.length &&
          fresh.every((c, i) => c.toLowerCase() === current[i]?.toLowerCase());
        const sameRentalType = freshRentalType === (token.rentalType ?? null);
        if (!sameArea || !sameRentalType) {
          setToken({
            ...token,
            ...(sameArea ? {} : { allotedArea: fresh }),
            ...(sameRentalType ? {} : { rentalType: freshRentalType }),
          });
        }
      } catch {
        // Non-blocking: keep JWT allocations if refresh fails
      }
    };
    void syncAllotedArea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?.id]);

  const getCounts = async (appliedFilters: FiltersInterfaces) => {
    try {
      const response = await axios.post(`${config.apiBasePath}/getCounts`, {
        filters: appliedFilters,
      });
      setAvailableCount(response.data.availableCount || 0);
      setNotAvailableCount(response.data.notAvailableCount || 0);
      setUpcomingCount(response.data.upcomingCount || 0);
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  };

  useEffect(() => {
    if (!hasMounted) return;
    const filtersKey = JSON.stringify({
      variant: config.variant,
      selectedTab,
      limit,
      filters,
    });
    if (prevFiltersRef.current === filtersKey && isMountedRef.current) return;
    prevFiltersRef.current = filtersKey;
    isMountedRef.current = true;
    setPage(1);
    getData(selectedTab, 1, filters, limit);
    getCounts(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, config.variant, selectedTab, limit, filters]);

  useEffect(() => {
    if (!hasMounted || !isMountedRef.current) return;
    getData(selectedTab, page, filters, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, page, selectedTab, filters, limit, config.variant]);

  const serialOffset = (page - 1) * limit;

  const tableProps = {
    tableData: data,
    setTableData: setData,
    serialOffset,
    filterPlace: filters.place,
    onAvailabilityChange: handleAvailabilityChange,
    apiBasePath: config.apiBasePath,
  };

  return (
    <div className="m-4">
      <div className="flex items-center justify-between mb-6 gap-2">
        {!isSalesInternOnly ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            ← Back
          </Link>
        ) : (
          <div className="w-[88px]" aria-hidden />
        )}

        <h1 className="text-xl font-bold text-center flex-1">{config.title}</h1>

        <div className="flex items-center gap-2">
          {canShowOtherSheet ? (
            <Link
              href={otherSheetHref}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              {otherSheetConfig.title}
            </Link>
          ) : null}
          {canShowGeoSearch && config.geoSearchHref ? (
            <Link
              href={config.geoSearchHref}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              📍 Geo Search
            </Link>
          ) : null}
        </div>
      </div>

      {!hasMounted ? (
        <div
          className="relative flex min-h-[80vh] items-center justify-center rounded-lg border bg-background"
          aria-busy="true"
          aria-label={`Loading ${config.title}`}
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs
          value={selectedTab}
          onValueChange={(val) => {
            setSelectedTab(val);
            setPage(1);
          }}
          className="relative flex flex-col min-h-[80vh] border rounded-lg shadow-sm bg-background"
        >
          <div className="flex-1 px-2 pb-16 overflow-hidden">
            <TabsContent value="available" className="h-full">
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                selectedTab={selectedTab}
                isDataLoading={isLoading}
                apiBasePath={config.apiBasePath}
                filterStorageKey={config.filterStorageKey}
              />
              <SheetDataPanel isLoading={isLoading} total={total}>
                <SpreadsheetTable {...tableProps} />
              </SheetDataPanel>
            </TabsContent>

            <TabsContent value="notAvailable" className="h-full">
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                selectedTab={selectedTab}
                isDataLoading={isLoading}
                apiBasePath={config.apiBasePath}
                filterStorageKey={config.filterStorageKey}
              />
              <SheetDataPanel isLoading={isLoading} total={total}>
                <SpreadsheetTable {...tableProps} />
              </SheetDataPanel>
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

            <TabsContent value="upcoming" className="h-full">
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                selectedTab={selectedTab}
                isDataLoading={isLoading}
                apiBasePath={config.apiBasePath}
                filterStorageKey={config.filterStorageKey}
              />
              <SheetDataPanel isLoading={isLoading} total={total}>
                <SpreadsheetTable {...tableProps} />
              </SheetDataPanel>
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

          <div className="absolute bottom-0 left-0 right-0 border-t bg-muted/40 px-4 py-2 flex items-center justify-between">
            <TabsList className="flex gap-2 bg-transparent">
              <TabsTrigger
                value="available"
                className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-background/70"
              >
                Available{" "}
                <span className="ml-1 text-muted-foreground">
                  ({availableCount})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="notAvailable"
                className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-background/70"
              >
                Not Available{" "}
                <span className="ml-1 text-muted-foreground">
                  ({notAvailableCount})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-background/70"
              >
                Upcoming{" "}
                <span className="ml-1 text-muted-foreground">
                  ({upcomingCount})
                </span>
              </TabsTrigger>
            </TabsList>

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
      )}
    </div>
  );
}
