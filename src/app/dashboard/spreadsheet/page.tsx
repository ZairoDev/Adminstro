"use client";
import axios from "axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState, useRef, useCallback } from "react";
import { unregisteredOwners } from "@/util/type";
import { FilteredPropertiesInterface, FiltersInterface } from "../newproperty/filteredProperties/page";
import FilterBar, { FiltersInterfaces } from "./FilterBar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuthStore } from "@/AuthStore";

const LIMIT = 50;

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([]);
  const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
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
     place: parsedAllocations.length === 1
    ? [parsedAllocations[0]]
    : parsedAllocations.length > 1
    ? parsedAllocations
    : [],
    area: "",
    zone: "",
    metroZone: "",
    rentalType: "Short Term",
    minPrice:  0,
    maxPrice:  0,
    beds: 0,
    bedrooms: 0,
    bathroom: 0,
    dateRange: undefined,
  });

  

  const getData = async (tab: string, currentPage: number) => {
    try {
      setIsLoading(true);
      const endpoint =
        tab === "available"
          ? "/api/unregisteredOwners/getAvailableList"
          : "/api/unregisteredOwners/getNotAvailableList";

           let effectiveFilters = { ...filters };
    if (parsedAllocations.length > 0 && effectiveFilters.place.length === 0) {
      effectiveFilters = {
        ...effectiveFilters,
        place: parsedAllocations,
      };
    }  

      const response = await axios.post(endpoint, {
        filters: effectiveFilters,
        page: currentPage,
        limit: LIMIT,
      });

      const newData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      setData((prev) => (currentPage === 1 ? newData : [...prev, ...newData]));
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    setPage(1);
    getData(selectedTab, 1);
  };

  const handleClear = () => {
    setFilters({
      searchType: "",
      searchValue: "",
      propertyType: "",
      place: [],
      area: "",
      zone: "",
      metroZone: "",
      rentalType: "Short Term",
      minPrice: 0,
      maxPrice: 0,
      beds: 0,
      bedrooms: 0,
      bathroom: 0,
      dateRange: undefined,
    });
    setPage(1);
    getData(selectedTab, 1);
  };

  useEffect(() => {
    setPage(1);
    getData(selectedTab, 1);
  }, [selectedTab]);

  const loadMore = useCallback(() => {
    if (isLoading || data.length >= total) return; 
    const nextPage = page + 1;
    setPage(nextPage);
    getData(selectedTab, nextPage);
  }, [isLoading, data, total, page, selectedTab]);

  useEffect(() => {
    if (!observerRef.current) return;

    if (observerInstance.current) {
      observerInstance.current.disconnect();
    }

    observerInstance.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      {
        root: null, 
        rootMargin: "200px", 
        threshold: 0, 
      }
    );

    observerInstance.current.observe(observerRef.current);

    return () => {
      if (observerInstance.current) observerInstance.current.disconnect();
    };
  }, [loadMore, isLoading]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Spreadsheet</h1>

      <Tabs
        defaultValue="available"
        value={selectedTab}
        onValueChange={setSelectedTab}
      >
        <TabsList>
          <TabsTrigger value="available">Available <span>(35)</span></TabsTrigger>
          <TabsTrigger value="notAvailable">Not Available <span>(35)</span></TabsTrigger>
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
          <SpreadsheetTable tableData={data} setTableData={setData} />
          {isLoading && <p className="text-center">Loading...</p>}
          <div ref={observerRef} className="h-10" />
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
          <SpreadsheetTable tableData={data} setTableData={setData} />
          {isLoading && <p className="text-center">Loading...</p>}
          <div ref={observerRef} className="h-10" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Spreadsheet;

