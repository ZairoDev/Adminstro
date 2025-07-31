"use client";

import axios from "axios";
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
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import HandLoader from "@/components/HandLoader";
import { Toaster } from "@/components/ui/toaster";
import LeadsFilter, {
  FilterState,
} from "@/components/lead-component/NewLeadFilter";
import { IQuery, VisitInterface } from "@/util/type";

import VisitTable from "./visit-table";

export const VisitsPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [visits, setVisits] = useState<VisitInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [page, setPage] = useState<number>(
    parseInt(searchParams.get("page") ?? "1")
  );
  const [allotedArea, setAllotedArea] = useState("");

  const defaultFilters: FilterState = {
    searchType: "phoneNo",
    searchTerm: "",
    dateFilter: "all",
    customDays: "0",
    fromDate: undefined,
    toDate: undefined,
    sortBy: "None",
    guest: "0",
    noOfBeds: "0",
    propertyType: "",
    billStatus: "",
    budgetFrom: "",
    budgetTo: "",
    leadQuality: "",
    allotedArea: "",
  };

  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    // filterLeads(newPage, { ...filters, allotedArea: area });

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

  const filterVisits = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/visits/getVisits", {});
      setVisits(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalVisits(response.data.totalVisits);
    } catch (err) {
      toast({
        title: "Unable to fetch visits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(parseInt(searchParams.get("page") ?? "1"));
    const getAllotedArea = async () => {
      try {
        const response = await axios.get("/api/getAreaFromToken");
        setAllotedArea(response.data.area);
      } catch (err: any) {
        console.log("error in getting area: ", err);
        toast({
          title: "Unable to Apply Filters",
          variant: "destructive",
        });
      }
    };
    getAllotedArea();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [filters.searchTerm]);

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
        <div className="flex md:flex-row flex-col-reverse gap-x-2 justify-between  w-full md:w-auto">
          {/* <div className="flex w-full items-center gap-x-2">
            {(token?.role == "SuperAdmin" ||
              token?.role === "Sales-TeamLead") && (
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
              onChange={(e) => {
                if (filters.searchType === "phoneNo") {
                  const formattedValue = e.target.value.replace(/\D/g, "");
                  setFilters((prev) => ({
                    ...prev,
                    searchTerm: formattedValue,
                  }));
                } else {
                  setFilters((prev) => ({
                    ...prev,
                    searchTerm: e.target.value,
                  }));
                }
              }}
            />
          </div> */}

          {/* <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal size={18} />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className=" flex flex-col items-center">
                <LeadsFilter filters={filters} setFilters={setFilters} />
              </div>

              <SheetFooter className=" flex flex-col">
                <SheetClose asChild>
                  <Button
                    onClick={() => {
                      const params = new URLSearchParams(
                        Object.entries(filters)
                      );
                      setPage(1);
                      router.push(`?${params.toString()}&page=1`);
                    }}
                    className="w-full bg-white text-black hover:bg-gray-100 font-medium mx-auto"
                  >
                    Apply
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    onClick={() => {
                      router.push(`?page=1`);
                      console.log("default filters: ", defaultFilters);
                      setFilters({ ...defaultFilters });
                      setPage(1);
                    }}
                    className="w-full bg-white text-black hover:bg-gray-100 font-medium mx-auto"
                  >
                    Clear
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet> */}
        </div>
      </div>
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="">
          <div className="mt-2 border rounded-lg min-h-[90vh]">
            {visits.length > 0 && <VisitTable visits={visits} />}
          </div>
          <div className="flex items-center justify-between p-2 w-full">
            <p className="text-xs ">
              Page {page} of {totalPages} — {totalVisits} total results
            </p>
            <Pagination className="flex justify-end">
              <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  );
};
