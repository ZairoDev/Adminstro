"use client";

import axios from "axios";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/hooks/use-toast";

import { IQuery } from "@/util/type";
import { Input } from "@/components/ui/input";
import LeadTable from "@/components/leadTable/LeadTable";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { LucideLoader, SlidersHorizontal } from "lucide-react";
import { useAuthStore } from "@/AuthStore";
import { Toaster } from "@/components/ui/toaster";

export interface FetchQueryParams {
  searchTerm: string;
  searchType?: string;
  dateFilter?: string;
  sortingField?: string;
  customDays: string;
  customDateRange: { start: string; end: string };
}

const RejectedLeads = () => {
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [page, setPage] = useState(1);
  const limit = 12;
  const [totalPages, setTotalPages] = useState<number>(1);

  const [area, setArea] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDays, setCustomDays] = useState("");
  const [sortingField, setSortingField] = useState("");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const [rejectedLeads, setRejectedLeads] = useState<IQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // const fetchRejectedLeads = async () => {
  //   try {
  //     const response = await axios.post("/api/sales/getRejectedLeads", {
  //       page,
  //       skip,
  //     });
  //     setRejectedLeads(response.data.rejectedLeads);
  //     setTotalPages(Math.ceil(response.data.totalRejectedLeads / 10));
  //   } catch (err: any) {
  //     toast({
  //       variant: "destructive",
  //       description: err.message,
  //     });
  //   }
  // };

  const fetchFilteredRejectedLeads = useCallback(
    debounce(
      async ({
        searchTerm,
        searchType,
        dateFilter,
        sortingField,
        customDays,
        customDateRange,
      }: FetchQueryParams) => {
        try {
          setIsLoading(true);
          const response = await axios.post(
            "/api/sales/searchInRejectedLeads",
            {
              page,
              limit,
              searchTerm,
              searchType,
              dateFilter: dateFilter,
              sortingField,
              customDays,
              startDate: customDateRange.start,
              endDate: customDateRange.end,
              area,
              allocatedArea: area,
            }
          );
          setRejectedLeads(response.data.data);
          setTotalPages(response.data.totalPages);
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Error in fetching leads",
            description: err.message,
          });
        } finally {
          setIsLoading(false);
        }
      },
      2000
    ),
    [searchTerm, searchType, area, page]
  );

  const handleSearch = () => {
    fetchFilteredRejectedLeads({
      searchTerm,
      searchType,
      dateFilter,
      sortingField,
      customDays,
      customDateRange,
    });
  };

  useEffect(() => {
    fetchFilteredRejectedLeads({
      searchTerm,
      searchType,
      dateFilter,
      sortingField,
      customDays,
      customDateRange,
    });
  }, [searchTerm, searchType, area, page]);

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
              console.log("pageClicked: ", i);
              e.preventDefault();
              console.log("pageClickedagain: ", i);
              setPage(i);
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

  return (
    <div className="mt-2 border rounded-lg min-h-[90vh]">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading
            heading="Rejected Leads"
            subheading="You will get the list of rejected leads that created till now"
          />
        </div>
        <div className="flex md:flex-row flex-col-reverse gap-x-2 w-full">
          <div className="flex w-full items-center gap-x-2">
            <div className="w-[200px]">
              <Select
                onValueChange={(value: string) => {
                  setArea(value);
                  setSearchTerm("");
                }}
                value={area}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chania">Chania</SelectItem>
                  <SelectItem value="athens">Athens</SelectItem>
                  <SelectItem value="chalkidiki">Chalkidiki</SelectItem>
                  <SelectItem value="corfu">Corfu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="">
              <Select
                onValueChange={(value: string) => {
                  setSearchType(value);
                  setSearchTerm("");
                }}
                value={searchType}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle className="text-start">Data Filters</SheetTitle>
                    <SheetDescription className="flex flex-col gap-y-2">
                      <Select
                        onValueChange={(value) => setDateFilter(value)}
                        value={dateFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Date Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="lastDays">Last X Days</SelectItem>
                          <SelectItem value="customRange">
                            Custom Date Range
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {dateFilter === "lastDays" && (
                        <Input
                          placeholder="Enter number of days"
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                        />
                      )}
                      {dateFilter === "customRange" && (
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Start Date"
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) =>
                              setCustomDateRange({
                                ...customDateRange,
                                start: e.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="End Date"
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) =>
                              setCustomDateRange({
                                ...customDateRange,
                                end: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {/* <SheetClose asChild>
                        <Button
                          className="sm:w-auto w-full"
                          onClick={handleSearch}
                        >
                          Apply
                        </Button>
                      </SheetClose> */}
                    </SheetDescription>
                  </SheetHeader>

                  <SheetHeader className=" mt-4">
                    <SheetTitle className="text-start">Sort By</SheetTitle>
                    <SheetDescription className="flex flex-col gap-y-2">
                      <Select
                        onValueChange={(value) => setSortingField(value)}
                        value={sortingField}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Priority Order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Asc">
                            {" "}
                            Priority : &nbsp; Low To High
                          </SelectItem>
                          <SelectItem value="Desc">
                            {" "}
                            Priority : &nbsp; High To Low
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <SheetClose asChild>
                        <Button
                          className="sm:w-auto w-full mt-4"
                          onClick={handleSearch}
                        >
                          Apply
                        </Button>
                      </SheetClose>
                    </SheetDescription>
                    <SheetDescription></SheetDescription>
                  </SheetHeader>
                  <SheetFooter className="absolute text-pretty bottom-0 px-4 py-2 text-xs left-0 right-0">
                    <div className="flex flex-col gap-y-2">
                      <Select>
                        <SelectTrigger className="">
                          <SelectValue placeholder="Select View" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Table View">Table View</SelectItem>
                          <SelectItem value="Card View">Card View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="px-2">
                        Fill in your search details, apply custom filters, and
                        let us bring you the most relevant results with just a
                        click of the Apply button !
                      </p>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {rejectedLeads.length > 0 ? (
        <>
          <LeadTable queries={rejectedLeads} />
          <Pagination className="flex items-center">
            <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </>
      ) : isLoading ? (
        <div className=" w-full h-[80vh] flex justify-center items-center">
          <LucideLoader className=" animate-spin" />
        </div>
      ) : (
        <div className=" w-full flex justify-center mt-8">No Leads</div>
      )}
    </div>
  );
};

export default RejectedLeads;
