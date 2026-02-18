"use client";

import axios from "axios";
import { SlidersHorizontal } from "lucide-react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Sheet,
  SheetClose,
  SheetFooter,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { IQuery } from "@/util/type";
import Heading from "@/components/Heading";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import QueryCard from "@/components/QueryCard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import LeadsFilter, {
  FilterState,
} from "@/components/lead-component/NewLeadFilter";
import LeadTable from "@/components/leadTable/LeadTable";
import HandLoader from "@/components/HandLoader";
import { useSocket } from "@/hooks/useSocket";

// Constants
const DEBOUNCE_DELAY = 500;
const AUTHORIZED_EMAILS = [
  "tyagimokshda@gmail.com",
  "shailvinaprakash007@gmail.com",
  "pravleenkaur1233@gmail.com",
];

const AREAS = [
  { value: "all", label: "All" },
  { value: "chania", label: "Chania" },
  { value: "milan", label: "Milan" },
  { value: "rome", label: "Rome" },
  { value: "athens", label: "Athens" },
  { value: "chalkidiki", label: "Chalkidiki" },
  { value: "corfu", label: "Corfu" },
  { value: "thessaloniki", label: "Thessaloniki" },
];

const DEFAULT_FILTERS: FilterState = {
  searchType: "phoneNo",
  searchTerm: "",
  dateFilter: "all",
  customDays: "0",
  fromDate: undefined,
  toDate: undefined,
  sortBy: "None",
  status: "None",
  guest: "0",
  noOfBeds: "0",
  propertyType: "",
  billStatus: "",
  budgetFrom: "",
  budgetTo: "",
  leadQuality: "",
  allotedArea: "",
  rejectionReason: "Low Budget",
};

export const LeadPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  // State management
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [page, setPage] = useState<number>(
    parseInt(searchParams?.get("page") ?? "1")
  );
  const [view, setView] = useState<string>("Table View");
  const allotedArea = token?.allotedArea ?? "";
  const areaList: string[] = Array.isArray(allotedArea)
    ? allotedArea
    : allotedArea
    ? [allotedArea as string]
    : [];
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });

  // Memoized values
  const isAuthorizedUser = useMemo(() => {
    return (
      token?.role === "SuperAdmin" ||
      token?.role === "Sales-TeamLead" ||
      AUTHORIZED_EMAILS.includes(token?.email || "")
    );
  }, [token]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.searchTerm !== DEFAULT_FILTERS.searchTerm) {
        handleFilterLeads(1);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [filters.searchTerm]);

  // Fetch allotted area on mount
  useEffect(() => {
    // allotedArea derived from token
    handleFilterLeads(1, DEFAULT_FILTERS);
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!socket || !allotedArea) return;

    const disposition = "rejected";
    const formattedDisposition = disposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // Normalize areas
    const areas = Array.isArray(allotedArea)
      ? allotedArea.filter((a) => a?.trim())
      : allotedArea
      ? [allotedArea]
      : [];

    const eventName = `lead-${formattedDisposition}`;

    // Join rooms based on areas
    if (areas.length === 0) {
      const globalRoom = { area: "all", disposition: formattedDisposition };
      socket.emit("join-room", globalRoom);
      console.log(
        `✅ Joined global room: area-all|disposition-${formattedDisposition}`
      );

      const handleGlobalLead = (data: IQuery) => {
        setQueries((prev) => [data, ...prev]);
        setTotalQueries((prev) => prev + 1);

        toast({
          title: `New ${disposition} Lead`,
          description: `Lead from ${data.name || "Unknown"}`,
        });
      };

      socket.on(eventName, handleGlobalLead);

      return () => {
        socket.off(eventName, handleGlobalLead);
        socket.emit("leave-room", globalRoom);
      };
    }

    // Join area-specific rooms
    const handleLeadUpdate = (data: IQuery) => {
      const dataArea = data.location?.trim().toLowerCase().replace(/\s+/g, "-");

      const matchesArea = areas.some(
        (area) => area.trim().toLowerCase().replace(/\s+/g, "-") === dataArea
      );

      if (matchesArea) {
        setQueries((prev) => [data, ...prev]);
        setTotalQueries((prev) => prev + 1);

        toast({
          title: `New ${disposition} Lead`,
          description: `Lead from ${data.name || "Unknown"} in ${
            data.location
          }`,
        });
      }
    };

    areas.forEach((area) => {
      const formattedArea = area.trim().toLowerCase().replace(/\s+/g, "-");
      const room = { area: formattedArea, disposition: formattedDisposition };

      socket.emit("join-room", room);
      console.log(
        `✅ Joined room: area-${formattedArea}|disposition-${formattedDisposition}`
      );
    });

    socket.on(eventName, handleLeadUpdate);

    return () => {
      socket.off(eventName, handleLeadUpdate);
      areas.forEach((area) => {
        const formattedArea = area.trim().toLowerCase().replace(/\s+/g, "-");
        const room = { area: formattedArea, disposition: formattedDisposition };
        socket.emit("leave-room", room);
      });
    };
  }, [socket, allotedArea, toast]);

  // Filter leads function
  const handleFilterLeads = useCallback(
    async (newPage: number, filtersToUse?: FilterState) => {
      try {
        setLoading(true);
        const activeFilters = filtersToUse || filters;

        const response = await axios.post("/api/leads/getRejectedLeads", {
          filters: {
            ...activeFilters,
            allotedArea: selectedArea || activeFilters.allotedArea,
          },
          page: newPage,
        });

        setQueries(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalQueries(response.data.totalQueries);
      } catch (err) {
        console.error("Error fetching leads:", err);
        toast({
          title: "Error",
          description: "Failed to fetch leads. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, selectedArea, toast]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("page", newPage.toString());
      router.push(`?${params.toString()}`);

      setPage(newPage);
      handleFilterLeads(newPage);
    },
    [searchParams, router, handleFilterLeads]
  );

  // Handle area change
  const handleAreaChange = useCallback(
    (value: string) => {
      const areaValue = value === "all" ? "" : value;
      setSelectedArea(areaValue);
      setPage(1);
      handleFilterLeads(1, { ...filters, allotedArea: areaValue });
    },
    [filters, handleFilterLeads]
  );

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, value]) => value)
    );
    params.set("page", "1");

    router.push(`?${params.toString()}`);
    setPage(1);
    handleFilterLeads(1, { ...filters, allotedArea: selectedArea });
  }, [filters, selectedArea, router, handleFilterLeads]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    router.push("?page=1");
    setFilters({ ...DEFAULT_FILTERS });
    setSelectedArea("");
    setPage(1);
    handleFilterLeads(1, DEFAULT_FILTERS);
  }, [router, handleFilterLeads]);

  // Render pagination items
  const renderPaginationItems = useCallback(() => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    return items;
  }, [page, totalPages, handlePageChange]);

  return (
    <div className="w-full">
      <Toaster />

      {/* Header Section */}
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading
            heading="Low Budget Leads"
            subheading="Manage and review all rejected leads"
          />
        </div>

        {/* Filters Section */}
        <div className="flex md:flex-row flex-col-reverse gap-x-2 w-full">
          <div className="flex w-full items-center gap-x-2">
            {/* Area Selector - Only for authorized users */}
            {isAuthorizedUser && (
              <div className="w-[200px]">
                <Select
                  onValueChange={handleAreaChange}
                  value={selectedArea || "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {token?.role === "SuperAdmin" ? (
                      <>
                        <SelectItem value="athens">Athens</SelectItem>
                        <SelectItem value="thessaloniki">
                          Thessaloniki
                        </SelectItem>
                        <SelectItem value="chania">Chania</SelectItem>
                        <SelectItem value="milan">Milan</SelectItem>
                      </>
                    ) : (
                      areaList.sort().map((area: string) => (
                        <SelectItem key={area} value={area}>
                          {area.charAt(0).toUpperCase() + area.slice(1)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search Type Selector */}
            <div className="w-[150px]">
              <Select
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, searchType: value }))
                }
                value={filters.searchType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Search By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phoneNo">Phone No</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <Input
              placeholder={`Search by ${filters.searchType}...`}
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="flex-1"
            />
          </div>

          {/* Filter Button */}
          <div className="flex md:w-auto w-full justify-between gap-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal size={18} className="mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col items-center">
                  <LeadsFilter filters={filters} setFilters={setFilters} />
                </div>

                <SheetFooter className="flex flex-col gap-2 mt-4">
                  <SheetClose asChild>
                    <Button
                      onClick={handleApplyFilters}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Apply Filters
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      onClick={handleClearFilters}
                      variant="outline"
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </SheetClose>

                  {/* View Selector */}
                  <div className="mt-4 w-full">
                    <Select onValueChange={setView} value={view}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select View" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Table View">Table View</SelectItem>
                        <SelectItem value="Card View">Card View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Fill in your search details, apply custom filters, and let
                    us bring you the most relevant results with just a click of
                    the Apply button!
                  </p>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : view === "Table View" ? (
        <div>
          <div className="mt-2 border rounded-lg min-h-[90vh]">
            <LeadTable queries={queries} setQueries={setQueries} />
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-2 w-full">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} — {totalQuery} total results
            </p>
            <Pagination className="flex items-center">
              <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      ) : (
        <div>
          <div className="min-h-screen">
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
              {queries.map((query) => (
                <QueryCard
                  key={query._id}
                  name={query.name}
                  leadQualityByReviewer={query.leadQualityByReviewer}
                  email={query.email}
                  duration={query.duration}
                  startDate={query.startDate}
                  endDate={query.endDate}
                  phoneNo={query.phoneNo}
                  area={query.area}
                  guest={query.guest}
                  minBudget={query.minBudget}
                  maxBudget={query.maxBudget}
                  noOfBeds={query.noOfBeds}
                  location={query.location}
                  bookingTerm={query.bookingTerm}
                  zone={query.zone}
                  billStatus={query.billStatus}
                  typeOfProperty={query.typeOfProperty}
                  propertyType={query.propertyType}
                  priority={query.priority}
                  salesPriority={query.salesPriority}
                  reminder={query.reminder}
                  roomDetails={query.roomDetails}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-2 w-full">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} — {totalQuery} total results
            </p>
            <Pagination className="flex items-center">
              <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
};
