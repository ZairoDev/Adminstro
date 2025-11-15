"use client";

import axios from "axios";
import Pusher from "pusher-js";
import debounce from "lodash.debounce";
import { SlidersHorizontal } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { InfinityLoader } from "@/components/Loaders";
import HandLoader from "@/components/HandLoader";
import GoodTable from "./good-table";
import CreateLeadDialog from "./createLead";
import { useSocket } from "@/hooks/useSocket";

interface WordsCount {
  "1bhk": number;
  "2bhk": number;
  "3bhk": number;
  "4bhk": number;
  studio: number;
  sharedApartment: number;
}

export const GoodToGoLeads = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [wordsCount, setWordsCount] = useState<WordsCount[]>([]);
  const { socket, isConnected } = useSocket();

  const [sortingField, setSortingField] = useState("");
  const [area, setArea] = useState("");
  const [page, setPage] = useState<number>(
    parseInt(searchParams.get("page") ?? "1")
  );
  const [view, setView] = useState("Table View");
  // ✅ FIX: Changed to support both string and array
  const [allotedArea, setAllotedArea] = useState<string | string[]>("");

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
  };

  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);

    filterLeads(newPage, { ...filters, allotedArea: area });

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

  const filterLeads = async (newPage: number, filtersToUse?: FilterState) => {
    try {
      setLoading(true);
      const response = await axios.post("/api/leads/getGoodToGoLeads", {
        filters: filtersToUse ? filtersToUse : filters,
        page: newPage,
      });

      setQueries(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalQueries(response.data.totalQueries);
      setWordsCount(response.data.wordsCount);
    } catch (err: any) {
      console.log("error in getting leads: ", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial data fetch
  useEffect(() => {
    filterLeads(1, defaultFilters);
    setPage(parseInt(searchParams.get("page") ?? "1"));

    const getAllotedArea = async () => {
      try {
        const response = await axios.get("/api/getAreaFromToken");
        console.log("📍 Fetched allotedArea:", response.data.area);
        setAllotedArea(response.data.area);
      } catch (err: any) {
        console.log("error in getting area: ", err);
      }
    };
    getAllotedArea();
  }, []);

  // ✅ Socket.IO event handling - FIXED
  // Improved Socket.IO handler for Good To Go page

  const dispositionsToWatch = [
    "lead-active",
    "lead-fresh",
    "lead-rejected",
    "lead-declined",
  ];

  useEffect(() => {
    if (!socket) return;

    const disposition = "active"; // 👈 set based on page context
    const formattedDisposition = disposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // Normalize the areas into an array
    const areas = Array.isArray(allotedArea)
      ? allotedArea.filter((a) => a && a.trim())
      : allotedArea
      ? [allotedArea]
      : [];

    // 🟢 If no area assigned — join the global fallback room
    if (areas.length === 0) {
      const globalArea = "all";
      const room = { area: globalArea, disposition: formattedDisposition };
      socket.emit("join-room", room);
      console.log(
        `✅ Joined global room: area-all|disposition-${formattedDisposition}`
      );

      const event = `lead-${formattedDisposition}`;

      socket.on(event, (data: IQuery) => {
        setQueries((prev) => [data, ...prev]);
        console.log(`🆕 Global ${formattedDisposition} lead:`, data);
        toast({
          title: `New ${disposition} Lead`,
          description: `Lead from ${data.name || "Unknown"}`,
        });
      });

      return () => {
        socket.off(event);
        socket.emit("leave-room", room);
      };
    }

    // 🟣 Otherwise join each area-specific room
    areas.forEach((area) => {
      const formattedArea = area.trim().toLowerCase().replace(/\s+/g, "-");
      const room = { area: formattedArea, disposition: formattedDisposition };
      const event = `lead-${formattedDisposition}`;

      socket.emit("join-room", room);
      console.log(
        `✅ Joined room: area-${formattedArea}|disposition-${formattedDisposition}`
      );

      socket.on(event, (data: IQuery) => {
        const dataArea = data.location
          ?.trim()
          .toLowerCase()
          .replace(/\s+/g, "-");
        if (dataArea === formattedArea) {
          setQueries((prev) => [data, ...prev]);
          console.log(
            `🆕 ${formattedDisposition} lead in ${formattedArea}:`,
            data
          );
          toast({
            title: `New ${disposition} Lead (${area})`,
            description: `Lead from ${data.name || "Unknown"}`,
          });
        }
      });
    });

    // 🧹 Cleanup on unmount or dependency change
    return () => {
      const event = `lead-${formattedDisposition}`;
      areas.forEach((area) => {
        const formattedArea = area.trim().toLowerCase().replace(/\s+/g, "-");
        const room = { area: formattedArea, disposition: formattedDisposition };
        socket.off(event);
        socket.emit("leave-room", room);
        console.log(
          `🚪 Left room: area-${formattedArea}|disposition-${formattedDisposition}`
        );
      });
    };
  }, [socket, allotedArea]);
  
  const handlePropertyCountFilter = (
    typeOfProperty: string,
    noOfBeds?: string
  ) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      typeOfProperty: typeOfProperty,
      noOfBeds: noOfBeds ?? prevFilters.noOfBeds,
    }));

    filterLeads(1, {
      ...filters,
      typeOfProperty: typeOfProperty,
      noOfBeds: noOfBeds ?? filters.noOfBeds,
      allotedArea: area,
    });
  };

  return (
    <div className=" w-full">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full  flex ">
          {/* heading component where all leads is*/}
          <Heading heading="Good To Go Leads" subheading="" />
          <div className="w-full flex flex-wrap gap-2 justify-center">
            <div
              onClick={() => handlePropertyCountFilter("Apartment", "1")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-blue-100">
                {wordsCount[0]?.["1bhk"]}
              </p>
              <p className="text-white font-medium text-xs text-center group-hover:text-blue-100">
                1 BHK
              </p>
            </div>
            <div
              onClick={() => handlePropertyCountFilter("Apartment", "2")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-green-100">
                {wordsCount[0]?.["2bhk"]}
              </p>
              <p className="text-white font-medium text-xs text-center group-hover:text-green-100">
                2 BHK
              </p>
            </div>
            <div
              onClick={() => handlePropertyCountFilter("Apartment", "3")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-purple-100">
                {wordsCount[0]?.["3bhk"]}
              </p>
              <p className="text-white font-medium text-xs text-center group-hover:text-purple-100">
                3 BHK
              </p>
            </div>
            <div
              onClick={() => handlePropertyCountFilter("Apartment", "4")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-orange-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-orange-100">
                {wordsCount[0]?.["4bhk"]}
              </p>
              <p className="text-white font-medium text-xs text-center group-hover:text-orange-100">
                4 BHK
              </p>
            </div>
            <div
              onClick={() => handlePropertyCountFilter("Studio", "1")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 border-2 border-pink-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-pink-100">
                {wordsCount[0]?.["studio"]}
              </p>
              <p className="text-white font-medium text-xs text-center group-hover:text-pink-100">
                Studio
              </p>
            </div>
            <div
              onClick={() => handlePropertyCountFilter("Shared Apartment", "1")}
              className="min-w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-300 flex flex-col items-center justify-center p-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            >
              <p className="text-white font-bold text-lg leading-none group-hover:text-pink-100">
                {wordsCount[0]?.["sharedApartment"]}
              </p>
              <p
                className="text-white truncate font-medium text-xs  text-center group-hover:text-pink-100"
                title="Shared "
              >
                Shard
              </p>
            </div>
          </div>
        </div>
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
                      filterLeads(1, { ...filters, allotedArea: "" });
                    } else {
                      setArea(value);
                      filterLeads(1, { ...filters, allotedArea: value });
                    }
                  }}
                  value={area}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="chania">Chania</SelectItem>
                    <SelectItem value="milan">Milan</SelectItem>
                    <SelectItem value="rome">Rome</SelectItem>
                    <SelectItem value="athens">Athens</SelectItem>
                    <SelectItem value="chalkidiki">Chalkidiki</SelectItem>
                    <SelectItem value="corfu">Corfu</SelectItem>
                    <SelectItem value="thessaloniki">Thessaloniki</SelectItem>
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
              onKeyDown={(e) => e.key === "Enter" && filterLeads(1, filters)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
            />
          </div>

          <div className="flex md:w-auto w-full justify-between  gap-x-2">
            <div className="overflow-y-scroll">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  {/* Lead Filters */}
                  <div className=" flex flex-col items-center">
                    <LeadsFilter filters={filters} setFilters={setFilters} />
                  </div>

                  <SheetFooter className="flex flex-col gap-3 p-4 border-t border-gray-200">
                    {/* Buttons Row */}
                    <div className="flex gap-3">
                      <SheetClose asChild>
                        <Button
                          onClick={() => {
                            const params = new URLSearchParams(
                              Object.entries(filters)
                            );
                            setPage(1);
                            router.push(`?${params.toString()}&page=1`);
                            filterLeads(1, { ...filters, allotedArea: area });
                          }}
                          className="w-1/2 bg-white text-black hover:bg-gray-100 font-medium border border-gray-300"
                        >
                          Apply
                        </Button>
                      </SheetClose>

                      <SheetClose asChild>
                        <Button
                          onClick={() => {
                            router.push(`?page=1`);
                            setFilters({ ...defaultFilters });
                            setPage(1);
                            filterLeads(1, defaultFilters);
                          }}
                          className="w-1/2 bg-white text-black hover:bg-gray-100 font-medium border border-gray-300"
                        >
                          Clear
                        </Button>
                      </SheetClose>
                    </div>

                    {/* Select Dropdown */}
                    <div className="w-full">
                      <Select onValueChange={(value) => setView(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select View" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Table View">Table View</SelectItem>
                          <SelectItem value="Card View">Card View</SelectItem>
                        </SelectContent>
                      </Select>
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
          <HandLoader />
        </div>
      ) : view === "Table View" ? (
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              {queries.length > 0 ? (
                <GoodTable queries={queries} setQueries={setQueries} />
              ) : (
                <div className=" w-full h-[80vh] flex flex-col items-center justify-center">
                  <img
                    src="https://vacationsaga.b-cdn.net/assets/no-data-bg.png"
                    alt="Temporary Image"
                    className=" w-96 h-96 opacity-30"
                  />
                  <h1 className=" text-gray-600 text-3xl">No Leads</h1>
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
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  );
};
