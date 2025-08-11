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
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/AuthStore";
import { toast, useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { BookingInterface } from "@/util/type";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/CustomToolTip";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import axios from "axios";

export default function BookingTable({
  bookings,
}: {
  bookings: BookingInterface[];
}) {
  const searchParams = useSearchParams();

  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [activeModalRow, setActiveModalRow] = useState(-1);

  const [page, setPage] = useState(1);
  console.log("bookings: ", bookings);  

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
      bookings[index].payment.status = paymentStatus;
    } catch (err) {
      toast({
        title: "Unable to update payment status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (searchParams.get("page")) {
      setPage(parseInt(searchParams.get("page") ?? "1") || 1);
    }
  }, []);

  return (
    <div className=" w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Pitched Amount</TableHead>
            <TableHead>Final Amount</TableHead>
            <TableHead>Owner Payment</TableHead>
            <TableHead>Traveller Payment</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead>Actions </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings?.map((booking, index) => (
            <TableRow key={booking?._id}>
              <TableCell>{(page - 1) * 50 + index + 1}</TableCell>

              <TableCell>
                <Badge>{format(booking?.checkIn?.date, "MM-dd-yyyy")}</Badge>
                {"  "}
                <Badge>{booking?.checkIn?.time}</Badge>
              </TableCell>

              <TableCell>
                <Badge>{format(booking?.checkOut?.date, "MM-dd-yyyy")}</Badge>
                {"  "}
                <Badge>{booking?.checkOut?.time}</Badge>
              </TableCell>

              <TableCell>1000</TableCell>

              <TableCell>{booking?.finalAmount}</TableCell>

              <TableCell>
                <Badge>
                  <CustomTooltip
                    text={`${booking?.ownerPayment?.amountRecieved} / ${booking?.ownerPayment?.finalAmount}`}
                    desc="Received Amt. / Final Amt."
                  />
                </Badge>
              </TableCell>

              <TableCell>
                <Badge>
                  <CustomTooltip
                    text={`${booking?.travellerPayment?.amountRecieved} / ${booking?.travellerPayment?.finalAmount}`}
                    desc="Received Amt. / Final Amt."
                  />
                </Badge>
              </TableCell>

              <TableCell>
                {" "}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                      {booking?.payment.status?.toUpperCase()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handlePaymentStatus("pending", booking._id, index)
                      }
                    >
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handlePaymentStatus("partial", booking._id, index)
                      }
                    >
                      Partial
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handlePaymentStatus("failed", booking._id, index)
                      }
                    >
                      Failed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handlePaymentStatus("paid", booking._id, index)
                      }
                    >
                      Paid
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>

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
                  <DropdownMenuContent className="">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
