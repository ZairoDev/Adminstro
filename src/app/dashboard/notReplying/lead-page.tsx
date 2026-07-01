"use client";

import Pusher from "pusher-js";
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
import { Input } from "@/components/ui/input";
import QueryCard from "@/components/QueryCard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import LeadsFilter, {
  FilterState,
} from "@/components/lead-component/NewLeadFilter";
import { InfinityLoader } from "@/components/Loaders";
import LeadTable from "@/components/leadTable/LeadTable";
import HandLoader from "@/components/HandLoader";
import { useLeadList } from "@/hooks/useLeadList";
import { mergeLeadFilters } from "@/util/leadFilterUtils";

export const NotReplyingLeads = () => {
  const router = useRouter();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

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
    salesPriority: "NR",
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
    allotedArea: Array.isArray(token?.allotedArea) 
      ? token.allotedArea[0] || ""
      : String(token?.allotedArea || ""),
  };

  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters });

  const mergedFilters = useMemo(
    () => (area ? mergeLeadFilters(filters, area) : filters),
    [filters, area],
  );

  const {
    queries,
    setQueries,
    loading,
    totalPages,
    totalQueries: totalQuery,
  } = useLeadList({
    queryKey: "not-replying",
    endpoint: "/api/leads/notReplying",
    filters: mergedFilters,
    page,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    setPage(newPage);
  };

  const handlePriorityChange = () => {
    const priorityMap = {
      None: 1,
      Low: 2,
      High: 3,
    };
    // const sortedQueries = { ...queries };
    // console.log("sorting field: ", queries);

    if (sortingField && sortingField !== "None") {
      queries.sort((a, b) => {
        const priorityA =
          priorityMap[(a.salesPriority as keyof typeof priorityMap) || "None"];
        const priorityB =
          priorityMap[(b.salesPriority as keyof typeof priorityMap) || "None"];

        if (sortingField === "Asc") {
          return priorityA - priorityB;
        } else {
          return priorityB - priorityA;
        }
      });
    }
    // setQueries(sortedQueries);
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

  useEffect(() => {
    const pusher = new Pusher("1725fd164206c8aa520b", {
      cluster: "ap2",
    });
    const channel = pusher.subscribe("queries");
    channel.bind(`new-query-${allotedArea}`, (data: IQuery) => {
      setQueries((prevQueries) => [data, ...prevQueries]);
    });
    return () => {
      channel.unbind(`new-query-${allotedArea}`);
      pusher.unsubscribe("queries");
      pusher.disconnect();
    };
  }, [allotedArea]);

  const debouncedFilterLeads = React.useCallback(
    debounce(() => {
      setPage(1);
    }, 500),
    [],
  );

  return (
    <div className=" w-full">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading
            heading="All Leads"
            subheading="You will get the list of leads that created till now"
          />
        </div>
        <div className="flex md:flex-row flex-col-reverse gap-x-2 w-full">
          <div className="flex w-full items-center gap-x-2">
            {(token?.role == "SuperAdmin" ||
              token?.role === "Sales-TeamLead") && (
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
            <div className="">
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
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({ ...prev, searchTerm: value }));
                debouncedFilterLeads();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  debouncedFilterLeads.cancel();
                  setPage(1);
                }
              }}
            />
          </div>
          <div className="flex md:w-auto w-full justify-between  gap-x-2">
            <div className="">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <div className="flex-1 overflow-y-auto pb-6">
                    <LeadsFilter filters={filters} setFilters={setFilters} />
                  </div>

                  <SheetFooter className="flex flex-col gap-3 border-t border-border pt-4">
                    <SheetClose asChild>
                      <Button
                        onClick={() => {
                          const params = new URLSearchParams(
                            Object.entries(filters),
                          );
                          setPage(1);
                          router.push(`?${params.toString()}&page=1`);
                        }}
                        className="w-full"
                      >
                        Apply
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          router.push(`?page=1`);
                          setArea("");
                          setFilters({ ...defaultFilters });
                          setPage(1);
                        }}
                        className="w-full"
                      >
                        Clear
                      </Button>
                    </SheetClose>
                    <Select onValueChange={(value) => setView(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select View" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Table View">Table View</SelectItem>
                        <SelectItem value="Card View">Card View</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Fill in your search details, apply custom filters, and let
                      us bring you the most relevant results.
                    </p>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          {/* <InfinityLoader className=" h-20 w-28" /> */}
          <HandLoader />
        </div>
      ) : view === "Table View" ? (
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              <LeadTable queries={queries} setQueries={setQueries} page={page} />
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
                    // budget={query.budget}
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
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  );
};
