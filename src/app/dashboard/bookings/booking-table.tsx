"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Ellipsis } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { BookingInterface } from "@/util/type";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/CustomToolTip";

type Props = {
  bookings: BookingInterface[];
  onUpdate?: (updated: BookingInterface[]) => void; // optional callback to let parent update
};

export default function BookingTable({ bookings, onUpdate }: Props) {
  const searchParams = useSearchParams();
  const ellipsisRef = useRef<HTMLButtonElement>(null);

  const [page, setPage] = useState(1);

  // ✅ Sync page with URL params
  useEffect(() => {
    setPage(parseInt(searchParams.get("page") ?? "1") || 1);
  }, [searchParams]);

  // ✅ Update payment status safely
  const handlePaymentStatus = async (
    paymentStatus: "pending" | "paid" | "failed" | "partial",
    bookingId: string,
    index: number
  ) => {
    try {
      await axios.patch("/api/bookings/changePaymentStatus", {
        paymentStatus,
        bookingId,
      });

      toast({
        title: "Payment status updated successfully",
      });

      // ✅ immutably update
      if (onUpdate) {
        const updatedBookings = bookings.map((b, i) =>
          i === index
            ? { ...b, payment: { ...b.travellerPayment, status: paymentStatus } }
            : b
        );
        onUpdate(updatedBookings);
      }
    } catch (err) {
      toast({
        title: "Unable to update payment status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            {/* <TableHead>Pitched Amount</TableHead> */}
            <TableHead>Final Amount</TableHead>
            <TableHead>Owner Payment</TableHead>
            <TableHead>Traveller Payment</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings?.map((booking, index) => (
            <TableRow key={booking?._id}>
              {/* Serial Number */}
              <TableCell>{(page - 1) * 50 + index + 1}</TableCell>

              {/* Check In */}
              <TableCell>
                <Badge>
                  {booking?.checkIn?.date
                    ? format(new Date(booking.checkIn.date), "MM-dd-yyyy")
                    : "N/A"}
                </Badge>{" "}
                <Badge>{booking?.checkIn?.time || "N/A"}</Badge>
              </TableCell>

              {/* Check Out */}
              <TableCell>
                <Badge>
                  {booking?.checkOut?.date
                    ? format(new Date(booking.checkOut.date), "MM-dd-yyyy")
                    : "N/A"}
                </Badge>{" "}
                <Badge>{booking?.checkOut?.time || "N/A"}</Badge>
              </TableCell>

              {/* Pitched Amount */}
              {/* <TableCell>{booking?.pitchedAmount ?? "—"}</TableCell> */}

              {/* Final Amount */}
              <TableCell>{booking?.travellerPayment?.finalAmount ?? "—"}</TableCell>

              {/* Owner Payment */}
              <TableCell>
                <Badge>
                  <CustomTooltip
                    text={`${booking?.ownerPayment?.amountReceived ?? 0} / ${
                      booking?.ownerPayment?.totalAmount ?? 0
                    }`}
                    desc="Received Amt. / Final Amt."
                  />
                </Badge>
              </TableCell>

              {/* Traveller Payment */}
              <TableCell>
                <Badge>
                  <CustomTooltip
                    text={`${
                      booking?.travellerPayment?.amountReceived ?? 0
                    } / ${booking?.travellerPayment?.finalAmount ?? 0}`}
                    desc="Received Amt. / Final Amt."
                  />
                </Badge>
              </TableCell>

              {/* Payment Status Dropdown */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                      {booking?.travellerPayment?.status?.toUpperCase() ??
                        "UNKNOWN"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["pending", "partial", "failed", "paid"].map((status) => (
                      <DropdownMenuItem
                        key={status}
                        className="cursor-pointer"
                        onClick={() =>
                          handlePaymentStatus(
                            status as "pending" | "partial" | "failed" | "paid",
                            booking?.bookingId || booking._id!,
                            index
                          )
                        }
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      ref={ellipsisRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Ellipsis size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <Link href={`/dashboard/createquery/${booking._id}`}>
                        <DropdownMenuItem>View Booking</DropdownMenuItem>
                      </Link>
                      <Link
                        href={`/dashboard/bookings/${booking?._id}`}
                        target="_blank"
                      >
                        <DropdownMenuItem>Detailed View</DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem>Generate Invoice</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
