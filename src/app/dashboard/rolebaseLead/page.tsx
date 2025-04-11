"use client";

import axios from "axios";
import Pusher from "pusher-js";
import debounce from "lodash.debounce";
import { SlidersHorizontal } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { FilterInterface, IQuery } from "@/util/type";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import QueryCard from "@/components/QueryCard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import LeadTable from "@/components/leadTable/LeadTable";
import LeadFilter from "@/components/lead-component/LeadFilter";

interface ApiResponse {
  data: IQuery[];
  totalPages: number;
  totalQueries: number;
}
interface FetchQueryParams {
  searchTerm: string;
  searchType?: string;
  dateFilter?: string;
  sortingField?: string;
  customDays: string;
  customDateRange: { start: string; end: string };
}
const RolebasedLead = () => {
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dateFilter, setDateFilter] = useState("all");
  const [sortingField, setSortingField] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [area, setArea] = useState("");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("name");
  const [page, setPage] = useState<number>(1);
  const [view, setView] = useState("Table View");
  const { toast } = useToast();
  const limit: number = 12;
  const [allotedArea, setAllotedArea] = useState("");
  // const [filters, setFilters] = useState<FilterInterface>({
  //   beds: 0,
  //   guest: 0,
  //   billStatus: "",
  //   furnished: "Un-furnished",
  //   budgetFrom: 0,
  //   budgetTo: 0,
  //   // leadQuality: ""
  // });
  const [filters, setFilters] = useState({});

  const fetchQuery = useCallback(
    debounce(
      async ({
        searchTerm,
        searchType,
        dateFilter,
        sortingField,
        customDays,
        customDateRange,
      }: FetchQueryParams) => {
        setLoading(true);
        try {
          if (!dateFilter && !sortingField) return;

          // const cachedQueries = sessionStorage.getItem("queries");
          // const cachedTotalPages = sessionStorage.getItem("totalPages");
          // const cachedTotalQueries = sessionStorage.getItem("totalQueries");
          // const cachedPageNumber = JSON.parse(
          //   sessionStorage.getItem("currentPage") || "1"
          // );

          // const samePage = cachedPageNumber === page;
          // if (cachedQueries && cachedTotalPages && cachedTotalQueries && samePage) {
          //   setQueries(JSON.parse(cachedQueries));
          //   setTotalPages(JSON.parse(cachedTotalPages));
          //   setTotalQueries(JSON.parse(cachedTotalQueries));
          //   return;
          // }

          const response = await fetch(
            `/api/sales/getQueryByArea?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}&dateFilter=${dateFilter}&customDays=${customDays}&startDate=${customDateRange.start}&endDate=${customDateRange.end}&allotedArea=${area}&sortingField=${sortingField}`
          );
          const data: ApiResponse = await response.json();
          setQueries(data.data);
          setTotalPages(data.totalPages);
          setTotalQueries(data.totalQueries);
          // sessionStorage.setItem("queries", JSON.stringify(data.data));
          // sessionStorage.setItem("totalPages", JSON.stringify(data.totalPages));
          // sessionStorage.setItem("totalQueries", JSON.stringify(data.totalQueries));
          // sessionStorage.setItem("currentPage", JSON.stringify(page));
        } catch (err: any) {
          setLoading(false);
        } finally {
          setLoading(false);
        }
      },
      1000
    ),
    [area, searchType, page, limit]
  );

  const FilteredLeadSearch = async () => {
    if (Object.keys(filters).length === 0) return;
    try {
      const response = await axios.post("/api/leads", {
        filters,
      });
      console.log("filtered data: ", response.data);
      setQueries(response.data);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while filtering data",
      });
    }
  };

  const handleSearch = () => {
    fetchQuery({
      searchTerm,
      searchType,
      dateFilter,
      sortingField,
      customDays,
      customDateRange,
    });
    sessionStorage.clear();
  };

  useEffect(() => {
    fetchQuery({
      searchTerm,
      searchType,
      dateFilter,
      sortingField,
      customDays,
      customDateRange,
    });
  }, [area, searchTerm, searchType, page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePriorityChange = () => {
    const priorityMap = {
      None: 1,
      Low: 2,
      High: 3,
    };
    // const sortedQueries = { ...queries };
    console.log("sorting field: ", queries);

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

  useEffect(() => {
    const getAllotedArea = async () => {
      try {
        const response = await axios.get("/api/getAreaFromToken");
        setAllotedArea(response.data.area);
      } catch (err: any) {
        console.log("error in getting area: ", err);
      }
    };
    getAllotedArea();
  }, []);

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
    // channel.bind("new-query", (data: any) => {
    //   setQueries((prevQueries) => [data, ...prevQueries]);
    // });
    channel.bind(`new-query-${allotedArea}`, (data: any) => {
      setQueries((prevQueries) => [data, ...prevQueries]);
    });
    toast({
      title: "Query Created Successfully",
    });
    return () => {
      channel.unbind(`new-query-${allotedArea}`);
      pusher.unsubscribe("queries");
      pusher.disconnect();
    };
  }, [queries, allotedArea]);

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
            <div className="w-[200px]">
              <Select
                onValueChange={(value: string) => {
                  setArea(value);
                }}
                value={area}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chania">Chania</SelectItem>
                  <SelectItem value="athens">Athens</SelectItem>
                  <SelectItem value="chalkidiki">Chalkitiki</SelectItem>
                  <SelectItem value="corfu">Corfu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="">
              <Select
                onValueChange={(value: string) => setSearchType(value)}
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
                          <SelectItem value="customRange">Custom Date Range</SelectItem>
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
                      <SheetClose asChild>
                        <Button className="sm:w-auto w-full" onClick={handleSearch}>
                          Apply
                        </Button>
                      </SheetClose>
                    </SheetDescription>
                  </SheetHeader>

                  <SheetHeader className=" mt-4">
                    <SheetTitle className="text-start">Sort By</SheetTitle>
                    <SheetDescription className="flex flex-col gap-y-2">
                      <Select
                        // onValueChange={(value) => {
                        // setSortingField(value);
                        //   queries.sort((a: IQuery, b:IQuery) => )
                        // }}
                        onValueChange={(value) => {
                          handlePriorityChange();
                          setSortingField(value);
                        }}
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
                    </SheetDescription>
                    <SheetDescription></SheetDescription>
                  </SheetHeader>

                  {/* <Button className="w-full mb-4" onClick={handleSearch}>
                    Apply
                  </Button> */}

                  {/* Lead Filters */}
                  <div>
                    <h2 className=" font-semibold text-lg">Filters</h2>
                    <LeadFilter filters={filters} setFilters={setFilters} />
                  </div>

                  <SheetFooter>
                    <SheetClose asChild>
                      <Button className="w-full mt-4" onClick={FilteredLeadSearch}>
                        Apply
                      </Button>
                    </SheetClose>
                  </SheetFooter>

                  <SheetFooter className="absolute text-pretty bottom-0 px-4 py-2 text-xs left-0 right-0">
                    <div className="flex flex-col gap-y-2">
                      <Select onValueChange={(value) => setView(value)}>
                        <SelectTrigger className="">
                          <SelectValue placeholder="Select View" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Table View">Table View</SelectItem>
                          <SelectItem value="Card View">Card View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="px-2">
                        Fill in your search details, apply custom filters, and let us
                        bring you the most relevant results with just a click of the Apply
                        button !
                      </p>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <Loader />
        </div>
      ) : view === "Table View" ? (
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              <LeadTable queries={queries} />
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
                    leadQualityByReviwer={query.leadQualityByReviwer}
                    email={query.email}
                    duration={query.duration}
                    startDate={query.startDate}
                    endDate={query.endDate}
                    phoneNo={query.phoneNo}
                    area={query.area}
                    guest={query.guest}
                    budget={query.budget}
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
export default RolebasedLead;
