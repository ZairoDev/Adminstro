"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import type { BookingInterface } from "@/util/type";
import HandLoader from "@/components/HandLoader";
import { Toaster } from "@/components/ui/toaster";
import { Filter, Search } from "lucide-react";

import { BookingFilter, type BookingFilterState } from "./booking-filter";
import BookingTable from "./booking-table";

const BookingPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<BookingInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [page, setPage] = useState<number>(
    Number.parseInt(searchParams.get("page") ?? "1")
  );

  // ✅ Only two tabs: pending | paid
  const [paymentTab, setPaymentTab] = useState<"pending" | "paid">(
    (searchParams.get("tab") as "pending" | "paid") || "pending"
  );

  const defaultFilters: BookingFilterState = {
    searchTerm: "",
    propertyName: "",
    bookingId: "",
  };

  const [filters, setFilters] = useState<BookingFilterState>({
    ...defaultFilters,
  });

  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  /* ------------------------- Handlers ------------------------- */
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    setPage(newPage);
  };

  const handleTabChange = (tab: "pending" | "paid") => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
    setPaymentTab(tab);
    setPage(1);
  };

  const handleFilterChange = (newFilters: BookingFilterState) => {
    setFilters(newFilters);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setFilters({ ...defaultFilters });
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  /* ------------------------- Pagination Render ------------------------- */
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
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

  /* ------------------------- API Call ------------------------- */
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/bookings/getBookings", {
        page,
        travellerPaymentStatus: paymentTab, // ✅ Updated key
        filters,
      });
      console.log("Bookings response:", response.data.data);
      setBookings(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalBookings(response.data.totalBookings || 0);
    } catch (err) {
      toast({
        title: "Unable to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------- Effects ------------------------- */
  useEffect(() => {
    setPage(Number.parseInt(searchParams.get("page") ?? "1"));
    setPaymentTab((searchParams.get("tab") as "pending" | "paid") || "pending");
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filters, page, paymentTab]);

  /* ------------------------- UI ------------------------- */
  return (
    <div className="w-full">
      <Toaster />

      <div className="flex items-center md:flex-row flex-col justify-between w-full gap-4">
        <Heading
          heading="Bookings"
          subheading="Manage and track all your bookings and traveller payments"
        />
        <Button
          variant="outline"
          onClick={() => setFilterSidebarOpen(true)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Input
            placeholder="Search by guest name, email, or note..."
            value={filters.searchTerm}
            onChange={(e) =>
              handleFilterChange({ ...filters, searchTerm: e.target.value })
            }
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <BookingFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        open={filterSidebarOpen}
        onOpenChange={setFilterSidebarOpen}
      />

      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="mt-4">
          <Tabs
            value={paymentTab}
            onValueChange={(value) =>
              handleTabChange(value as "pending" | "paid")
            }
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pending">Pending Payments</TabsTrigger>
              <TabsTrigger value="paid">Paid Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <div className="border rounded-lg min-h-[80vh]">
                {bookings.length > 0 ? (
                  <BookingTable bookings={bookings} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    No pending bookings found.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              <div className="border rounded-lg min-h-[80vh]">
                {bookings.length > 0 ? (
                  <BookingTable bookings={bookings} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    No paid bookings found.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between p-2 w-full mt-4">
            <p className="text-xs">
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
    </div>
  );
};

export default BookingPage;
