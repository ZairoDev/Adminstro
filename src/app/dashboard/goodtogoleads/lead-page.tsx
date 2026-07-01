"use client";

import axios from "@/util/axios";
import debounce from "lodash.debounce";
import { SlidersHorizontal } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
import PropertyQuickFilters from "@/components/lead-component/PropertyQuickFilters";
import HandLoader from "@/components/HandLoader";
import { mergeLeadFilters } from "@/util/leadFilterUtils";
import GoodTable from "./good-table";
import CreateLeadDialog from "./createLead";
import { useLeadSocket } from "@/hooks/useLeadSocket";
import { useLeadList } from "@/hooks/useLeadList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const GoodToGoLeads = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>("leads");
  const [brokers, setBrokers] = useState<IQuery[]>([]);
  const [brokersLoading, setBrokersLoading] = useState<boolean>(false);

  const [sortingField, setSortingField] = useState("");
  const [area, setArea] = useState("");
  const [page, setPage] = useState<number>(
    parseInt(searchParams?.get("page") ?? "1")
  );
  const [view, setView] = useState("Table View");
  // derive allotted area from token
  const allotedArea = token?.allotedArea ?? "";
  const areaList: string[] = Array.isArray(allotedArea)
    ? allotedArea
    : allotedArea
    ? [allotedArea as string]
    : [];

  const defaultFilters: FilterState = {
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
    typeOfProperty: "",
    quickPropertyFilters: [],
  };

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    ...defaultFilters,
  });
  const [filterDraft, setFilterDraft] = useState<FilterState>({
    ...defaultFilters,
  });
  const [searchInput, setSearchInput] = useState("");

  const mergedFilters = useMemo(
    () => mergeLeadFilters(appliedFilters, area),
    [appliedFilters, area],
  );

  const {
    queries,
    setQueries,
    loading,
    isFetching,
    totalPages,
    totalQueries: totalQuery,
    wordsCount,
  } = useLeadList({
    queryKey: "good-to-go",
    endpoint: "/api/leads/getGoodToGoLeads",
    filters: mergedFilters,
    page,
    enabled: activeTab === "leads",
  });

  useLeadSocket({
    disposition: "active",
    allotedArea,
    setQueries,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    setPage(newPage);
  };

  const renderPaginationItems = () => {
    let items = [];
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
  };

  // Fetch brokers and transform to IQuery format
  const fetchBrokers = async () => {
    try {
      setBrokersLoading(true);
      const response = await axios.get("/api/addons/brokers/getAllBrokers");
      const brokersData = response.data.data;
      
      // Transform brokers to IQuery format with minimal fields
      const transformedBrokers: IQuery[] = brokersData.map((broker: any) => ({
        _id: broker._id,
        name: broker.name,
        email: broker.email || "",
        phoneNo: broker.phone,
        minBudget: 0,
        maxBudget: 0,
        leadQualityByCreator: "",
        leadQualityByTeamLead: "",
        leadQualityByReviewer: "",
        area: "",
        guest: 0,
        noOfBeds: "",
        location: "",
        bookingTerm: "",
        zone: "",
        billStatus: "",
        typeOfProperty: "",
        propertyType: "",
        priority: "",
        salesPriority: "",
        reminder: "",
        duration: "",
        startDate: "",
        endDate: "",
        propertyShown: 0,
        roomDetails: [],
        isViewed: false,
      }));
      
      setBrokers(transformedBrokers);
    } catch (err: any) {
      console.log("error in getting brokers: ", err);
      toast({
        title: "Unable to fetch brokers",
        variant: "destructive",
      });
    } finally {
      setBrokersLoading(false);
    }
  };

  // Fetch brokers when brokers tab is active
  useEffect(() => {
    if (activeTab === "brokers") {
      fetchBrokers();
    }
  }, [activeTab]);
  
  const handleQuickFilterToggle = (key: string) => {
    const current = appliedFilters.quickPropertyFilters ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    const updated: FilterState = {
      ...appliedFilters,
      quickPropertyFilters: next,
      typeOfProperty: "",
      noOfBeds: "0",
    };
    setAppliedFilters(updated);
    setFilterDraft(updated);
    setPage(1);
  };

  const handleQuickFilterClear = () => {
    const updated: FilterState = {
      ...appliedFilters,
      quickPropertyFilters: [],
      typeOfProperty: "",
      noOfBeds: "0",
    };
    setAppliedFilters(updated);
    setFilterDraft(updated);
    setPage(1);
  };

  const debouncedApplySearch = React.useRef(
    debounce((term: string, searchType: string) => {
      setAppliedFilters((prev) => ({
        ...prev,
        searchTerm: term,
        searchType,
      }));
      setPage(1);
    }, 500),
  ).current;

  const applySheetFilters = () => {
    setAppliedFilters(filterDraft);
    setSearchInput(filterDraft.searchTerm ?? "");
    setPage(1);
  };

  const clearAllFilters = () => {
    router.push(`?page=1`);
    setArea("");
    setAppliedFilters({ ...defaultFilters });
    setFilterDraft({ ...defaultFilters });
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className=" w-full">
      <Toaster />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center md:flex-row flex-col justify-between w-full mb-4">
          <div className="flex items-center gap-4 w-full">
            <TabsList>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="brokers">Brokers</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="leads" className="mt-0">
      <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <Heading heading="Good To Go Leads" subheading="" />
        <PropertyQuickFilters
          wordsCount={wordsCount}
          selected={appliedFilters.quickPropertyFilters ?? []}
          onToggle={handleQuickFilterToggle}
          onClearAll={handleQuickFilterClear}
          className="md:justify-end"
        />
      </div>

      <div className="flex items-center md:flex-row flex-col justify-between w-full mt-3">
        <div className="flex md:flex-row flex-col-reverse gap-x-2 w-full">
          <div>
            <CreateLeadDialog />
          </div>
          <div className="flex w-full items-center gap-x-2">
            {(token?.role == "SuperAdmin" ||
              token?.email === "tyagimokshda@gmail.com" ||
              token?.email === "shailvinaprakash007@gmail.com" || token?.email === "pravleenkaur1233@gmail.com") && (
              <div className="w-[200px]">
                <Select
                  onValueChange={(value: string) => {
                    if (value === "all") {
                      setArea("");
                      setPage(1);
                    } else {
                      setArea(value);
                      setPage(1);
                    }
                  }}
                  value={area}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {token?.role === "SuperAdmin" ? (
                      <>
                      <SelectItem value="athens">Athens</SelectItem>
                        <SelectItem value="thessaloniki">Thessaloniki</SelectItem>
                        <SelectItem value="chania">Chania</SelectItem>
                        <SelectItem value="milan">Milan</SelectItem>
                      </>
                    ) : (
                      areaList.sort().map((area: string) => (
                        <SelectItem key={area} value={area}>
                          {area.charAt(0).toUpperCase() + area.slice(1) }
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* <div className="">
              <Select
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, searchType: value }))
                }
                value={filters.searchType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="phoneNo">Phone No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Search..."
              value={filters.searchTerm}
              onKeyDown={(e) => e.key === "Enter" && filterLeads(1, filters)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
            /> */}

        


<div className="relative w-full">
  <Input
    placeholder="Search by name, email, or phone..."
    value={searchInput}
    onChange={(e) => {
      const value = e.target.value;
      let detectedType = "name";
      if (value.includes("@")) {
        detectedType = "email";
      } else if (/^\d+$/.test(value)) {
        detectedType = "phoneNo";
      }
      setSearchInput(value);
      debouncedApplySearch(value, detectedType);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        debouncedApplySearch.cancel();
        let detectedType = "name";
        const value = searchInput;
        if (value.includes("@")) detectedType = "email";
        else if (/^\d+$/.test(value)) detectedType = "phoneNo";
        setAppliedFilters((prev) => ({
          ...prev,
          searchTerm: value,
          searchType: detectedType,
        }));
        setPage(1);
      }
    }}
    className="pr-24"
  />

  {/* Show detected type as a subtle indicator */}
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground capitalize">
    {(() => {
      if (searchInput.includes("@")) return "email";
      if (/^\d+$/.test(searchInput)) return "Phone";
      return "name";
    })()}
  </span>
</div>
          </div>

          <div className="flex md:w-auto w-full justify-between  gap-x-2">
            <div className="overflow-y-scroll">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <div className="flex-1 overflow-y-auto pb-6">
                    <LeadsFilter filters={filterDraft} setFilters={setFilterDraft} />
                  </div>

                  <SheetFooter className="flex flex-col gap-3 border-t border-border pt-4">
                    <div className="flex gap-3">
                      <SheetClose asChild>
                        <Button
                          onClick={() => {
                            const params = new URLSearchParams(
                              Object.entries(filterDraft),
                            );
                            router.push(`?${params.toString()}&page=1`);
                            applySheetFilters();
                          }}
                          className="w-1/2"
                        >
                          Apply
                        </Button>
                      </SheetClose>

                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          className="w-1/2"
                        >
                          Clear
                        </Button>
                      </SheetClose>
                    </div>

                    <Select onValueChange={(value) => setView(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select View" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Table View">Table View</SelectItem>
                        <SelectItem value="Card View">Card View</SelectItem>
                      </SelectContent>
                    </Select>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : view === "Table View" ? (
        <div className="relative">
          {isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 pointer-events-none">
              <HandLoader />
            </div>
          )}
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              {queries.length > 0 ? (
                <GoodTable queries={queries} setQueries={setQueries} isBroker={false} page={page} />
              ) : (
                <div className=" w-full h-[80vh] flex flex-col items-center justify-center">
                  <img
                    src="https://vacationsaga.b-cdn.net/assets/no-data-bg.png"
                    alt="Temporary Image"
                    className=" w-96 h-96 opacity-30"
                  />
                  <h1 className="text-muted-foreground text-3xl">No Leads</h1>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-2 w-full">
              <div className="">
                <p className="text-xs ">
                  Page {page} of {totalPages} — {totalQuery} total results
                </p>
              </div>
              <div>
                <Pagination className="flex items-center">
                  <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <div>
          <div className="min-h-screen">
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
              {queries.map((query) => (
                <div key={query._id}>
                  <QueryCard
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
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between p-2 w-full">
              <div>
                <p className="text-xs">
                  Page {page} of {totalPages} — {totalQuery} total results
                </p>
              </div>
              <div>
                <Pagination className="flex items-center">
                  <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="brokers" className="mt-0">
          <div className="mb-4">
            <Heading heading="Brokers" subheading="" />
          </div>
          {brokersLoading ? (
            <div className="flex mt-2 min-h-screen items-center justify-center">
              <HandLoader />
            </div>
          ) : (
            <div className="">
              <div>
                <div className="mt-2 border rounded-lg min-h-[90vh]">
                  {brokers.length > 0 ? (
                    <GoodTable queries={brokers} setQueries={setBrokers} isBroker={true} page={page} />
                  ) : (
                    <div className=" w-full h-[80vh] flex flex-col items-center justify-center">
                      <img
                        src="https://vacationsaga.b-cdn.net/assets/no-data-bg.png"
                        alt="Temporary Image"
                        className=" w-96 h-96 opacity-30"
                      />
                      <h1 className="text-muted-foreground text-3xl">No Brokers</h1>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  );
};
