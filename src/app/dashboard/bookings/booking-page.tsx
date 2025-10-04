"use client";

import axios from "axios";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { BookingInterface } from "@/util/type";
import HandLoader from "@/components/HandLoader";
import { Toaster } from "@/components/ui/toaster";
import { FilterState } from "@/components/lead-component/NewLeadFilter";

import BookingTable from "./booking-table";

export const BookingPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // const [visits, setVisits] = useState<VisitInterface[]>([]);
  const [bookings, setBookings] = useState<BookingInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalBookings, setTotalBookings] = useState<number>(0);
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

  const filterBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/bookings/getBookings", {});
      setBookings(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalBookings(response.data.totalBookings);
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
    filterBookings();
  }, [filters, page]);

  return (
    <div className=" w-full">
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <Heading
          heading="All Leads"
          subheading="You will get the list of leads that created till now"
        />
      </div>
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="">
          <div className="mt-2 border rounded-lg min-h-[90vh]">
            {bookings.length > 0 && <BookingTable bookings={bookings} />}
          </div>
          <div className="flex items-center justify-between p-2 w-full">
            <p className="text-xs ">
              Page {page} of {totalPages} — {totalBookings} total results
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
