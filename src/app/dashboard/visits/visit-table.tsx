"use client";

import { useState } from "react";
import Link from "next/link";
import { Ellipsis, ClipboardCopy } from "lucide-react";
import { useRef } from "react";

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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { VisitInterface } from "@/util/type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/CustomToolTip";
import { VisitStatusBadge } from "./visit-status-badge";
import { RescheduleVisitModal } from "./reschedule-visit-modal";
import BookingModal from "./booking-modal";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import {
  VISIT_CANCEL_REASONS,
  VISIT_NO_SHOW_REASONS,
  getVisitDaysOverdue,
  isVisitOverdue,
  type VisitStatus,
} from "@/lib/visits/visitStatus";
import { useVisitCloseActions } from "@/hooks/useVisitCloseActions";
import { cn } from "@/lib/utils";

const tableHeadClass =
  "h-10 text-xs font-semibold uppercase tracking-wide text-foreground/80";

function CopyButton({ value }: { value: string }) {
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied!" });
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <ClipboardCopy size={16} />
    </Button>
  );
}

export default function VisitTable({
  visits,
  page = 1,
  pageSize = 50,
  onVisitUpdated,
}: {
  visits: VisitInterface[];
  page?: number;
  pageSize?: number;
  onVisitUpdated?: () => void;
}) {
  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [rescheduleVisit, setRescheduleVisit] = useState<VisitInterface | null>(null);
  const [bookingVisit, setBookingVisit] = useState<VisitInterface | null>(null);
  const { loadingId, complete, cancel, noShow } = useVisitCloseActions(onVisitUpdated);

  const isActionable = (status: VisitStatus | string) =>
    status === "scheduled" || status === "rescheduled";

  return (
    <div className="w-full">
      <Table>
        <TableHeader className="bg-muted/70 border-b border-border">
          <TableRow className="border-b-0 hover:bg-muted/70">
            <TableHead className={tableHeadClass}>S.No.</TableHead>
            <TableHead className={tableHeadClass}>Owner Name</TableHead>
            <TableHead className={tableHeadClass}>Owner Phone</TableHead>
            <TableHead className={tableHeadClass}>Customer Name</TableHead>
            <TableHead className={tableHeadClass}>Customer Phone</TableHead>
            <TableHead className={tableHeadClass}>Visit Type</TableHead>
            <TableHead className={tableHeadClass}>Agent Name</TableHead>
            <TableHead className={tableHeadClass}>Commission</TableHead>
            <TableHead className={tableHeadClass}>VSID</TableHead>
            <TableHead className={tableHeadClass}>Created By</TableHead>
            <TableHead className={tableHeadClass}>Visit Status</TableHead>
            <TableHead className={tableHeadClass}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits?.map((visit, index) => {
            const overdue = isVisitOverdue(
              visit.visitStatus,
              visit.schedule,
              visit.createdAt,
            );
            const daysOverdue = getVisitDaysOverdue(
              visit.visitStatus,
              visit.schedule,
              visit.createdAt,
            );

            return (
              <TableRow
                key={visit?._id}
                className={cn(
                  overdue && "bg-amber-50 dark:bg-amber-950/30",
                )}
              >
                <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                <TableCell>{visit.ownerName}</TableCell>
                <TableCell>
                  <CopyButton value={visit.ownerPhone} />
                </TableCell>
                <TableCell>{visit.lead?.name}</TableCell>
                <TableCell>
                  <CopyButton value={visit.lead?.phoneNo?.toString() ?? ""} />
                </TableCell>
                <TableCell>{visit.visitType}</TableCell>
                <TableCell>{visit.agentName}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-x-1 justify-center">
                    <Badge>
                      <CustomTooltip
                        text={`€${visit?.ownerCommission + visit?.travellerCommission}`}
                        desc={`Owner: €${visit?.ownerCommission}\nTraveller: €${visit?.travellerCommission}`}
                      />
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`https://www.vacationsaga.com/listing-stay-detail/${visit.propertyId}`}
                    target="_blank"
                    className=" p-2 bg-neutral-500 rounded-md"
                  >
                    {visit.VSID || "No VSID"}
                  </Link>
                </TableCell>
                <TableCell
                  className="max-w-[180px] truncate"
                  title={visit.createdByName || visit.createdBy}
                >
                  {visit.createdByName || visit.createdBy || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <VisitStatusBadge
                      status={visit.visitStatus}
                      outcome={visit.outcome}
                    />
                    {overdue && (
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        ref={ellipsisRef}
                        onClick={(e) => e.stopPropagation()}
                        disabled={loadingId === visit._id}
                        aria-label="Visit actions"
                      >
                        <Ellipsis size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <Link href={`/dashboard/createquery/${visit.lead?._id}`}>
                          <DropdownMenuItem>View Lead</DropdownMenuItem>
                        </Link>
                        <Link href={`/dashboard/visits/${visit?._id}`} target="_blank">
                          <DropdownMenuItem>Detailed View</DropdownMenuItem>
                        </Link>
                        {visit.lead?._id && (
                          <DropdownMenuItem
                            onClick={() => setBookingVisit(visit)}
                          >
                            Create Booking
                          </DropdownMenuItem>
                        )}
                        {isActionable(visit.visitStatus) && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setRescheduleVisit(visit)}
                            >
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void complete(visit._id)}
                            >
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="cursor-pointer">
                                Cancel Visit
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {VISIT_CANCEL_REASONS.map((reason) => (
                                  <DropdownMenuItem
                                    key={reason}
                                    onClick={() => void cancel(visit._id, reason)}
                                    className="cursor-pointer"
                                  >
                                    {reason}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="cursor-pointer">
                                Mark No-show
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {VISIT_NO_SHOW_REASONS.map((reason) => (
                                  <DropdownMenuItem
                                    key={reason}
                                    onClick={() => void noShow(visit._id, reason)}
                                    className="cursor-pointer"
                                  >
                                    {reason}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </>
                        )}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <RescheduleVisitModal
        visit={rescheduleVisit}
        open={Boolean(rescheduleVisit)}
        onOpenChange={(open) => {
          if (!open) setRescheduleVisit(null);
        }}
        onSuccess={onVisitUpdated}
      />

      <AlertDialog
        open={Boolean(bookingVisit)}
        onOpenChange={(open) => {
          if (!open) setBookingVisit(null);
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {bookingVisit && (
            <BookingModal
              visit={bookingVisit}
              onOpenChange={() => setBookingVisit(null)}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
