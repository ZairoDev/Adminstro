"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Ellipsis } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingInterface } from "@/util/type";

type Props = {
  bookings: BookingInterface[];
  onUpdate?: (updated: BookingInterface[]) => void;
};

// ✅ Helper for date formatting
const formatDate = (date?: Date | string) => {
  if (!date) return "N/A";
  try {
    return format(new Date(date), "dd MMM yyyy");
  } catch {
    return "Invalid date";
  }
};

// ✅ Helper for safe field access
const safeValue = (value?: string | number | null) =>
  value !== undefined && value !== null && value !== "" ? value : "N/A";

export default function BookingTable({ bookings, onUpdate }: Props) {
  const searchParams = useSearchParams();
  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(parseInt(searchParams.get("page") ?? "1") || 1);
  }, [searchParams]);

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[70px]">#</TableHead>
            <TableHead>Booking ID</TableHead>
            <TableHead>Stay Dates</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Final Amount</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {bookings?.length > 0 ? (
            bookings.map((booking, index) => (
              <TableRow
                key={booking._id}
                className="hover:bg-muted/30 transition-colors"
              >
                {/* Serial Number */}
                <TableCell className="font-medium">
                  {(page - 1) * 50 + index + 1}
                </TableCell>

                {/* Booking ID */}
                <TableCell className="font-mono">
                  {safeValue(booking.bookingId)}
                </TableCell>

                {/* Stay Dates */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {formatDate(booking?.checkIn?.date)}
                    </Badge>
                    <span>—</span>
                    <Badge variant="secondary">
                      {formatDate(booking?.checkOut?.date)}
                    </Badge>
                  </div>
                </TableCell>

                {/* Owner */}
                <TableCell>
                  {safeValue(
                    (booking.visit as any)?.ownerName ||
                      (booking as any).ownerName
                  )}
                </TableCell>

                {/* Customer */}
                <TableCell>{safeValue((booking.lead as any)?.name)}</TableCell>

                {/* Final Amount */}
                <TableCell className="text-right font-medium">
                  {booking?.travellerPayment?.finalAmount
                    ? `€ ${booking.travellerPayment.finalAmount.toLocaleString()}`
                    : "—"}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        ref={ellipsisRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Ellipsis size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/createquery/${booking._id}`}
                          className="w-full"
                        >
                          View Booking
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/bookings/${booking._id}`}
                          target="_blank"
                          className="w-full"
                        >
                          Detailed View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Generate Invoice</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-6 text-muted-foreground"
              >
                No bookings found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
