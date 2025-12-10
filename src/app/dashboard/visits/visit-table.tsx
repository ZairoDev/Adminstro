import axios from "axios";
import Link from "next/link";
import { Ellipsis, ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

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
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { VisitInterface } from "@/util/type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/CustomToolTip";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import BookingModal from "./booking-modal";

function CopyButton({ value }: { value: string }) {
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied!"});
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <ClipboardCopy size={16} />
    </Button>
  );
}

export default function VisitTable({ visits }: { visits: VisitInterface[] }) {
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [activeModalRow, setActiveModalRow] = useState(-1);

  const [salesPriority, setSalesPriority] = useState<
    ("Low" | "High" | "None")[]
  >(Array.from({ length: visits?.length }, () => "None"));
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    new Date(Date.now())
  );
  const [noteValue, setNoteValue] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (searchParams.get("page")) {
      setPage(parseInt(searchParams.get("page") ?? "1") || 1);
    }
  }, []);

  const handleNote = async (
    id: any,
    noteValue: string | undefined,
    index: number
  ) => {
    if (!noteValue) return;

    try {
      setCreatingNote(true);
      const response = await axios.post("/api/sales/createNote", {
        id,
        note: noteValue,
      });
      setCreatingNote(false);
      setNoteValue("");
      visits[index] = response.data.data;
    } catch (error: any) {
      console.error("Error saving note:", error.message || error);
      setCreatingNote(false);
    }
  };

  // Add rejection handler
  const handleRejectionReason = async (
    rejectionReason: string,
    id: any,
    index: number
  ) => {
    setLoading(true);
    try {
      await axios.post("/api/visits/rejectVisit", {
        id,
        rejectionReason,
        status: "rejected",
      });
      toast({
        description: "Visit rejected successfully",
      });
      // Optionally update visit object locally
      visits[index].visitStatus = "rejected";
      visits[index].rejectionReason = rejectionReason;
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast({
        description: "Error occurred while updating status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className=" w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>Owner Name</TableHead>
            <TableHead>Owner Phone</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Customer Phone</TableHead>
            <TableHead>Visit Type</TableHead>
            <TableHead>Agent Name</TableHead>
            <TableHead className="">Commission</TableHead>
            <TableHead>VSID</TableHead>
            <TableHead>Visit Status</TableHead>
            <TableHead>Actions </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits?.map((visit, index) => (
            <TableRow key={visit?._id}>
              <TableCell>{(page - 1) * 50 + index + 1}</TableCell>

              <TableCell>{visit.ownerName}</TableCell>

              <TableCell>
                <CopyButton value={visit.ownerPhone} />
              </TableCell>

              <TableCell>{visit.lead?.name }</TableCell>

              <TableCell>
                <CopyButton value={visit.lead?.phoneNo.toString() ?? ""} />
              </TableCell>

              <TableCell>{visit.visitType}</TableCell>

              <TableCell>{visit.agentName}</TableCell>

              <TableCell className="text-center">
                <div className="flex gap-x-1 justify-center">
                  <Badge>
                    <CustomTooltip
                      text={`€${
                        visit?.ownerCommission + visit?.travellerCommission
                      }`}
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

              <TableCell>{visit.visitStatus}</TableCell>

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
                      <Link href={`/dashboard/createquery/${visit.lead?._id}`}>
                        <DropdownMenuItem>View Lead</DropdownMenuItem>
                      </Link>
                      <Link
                        href={`/dashboard/visits/${visit?._id}`}
                        target="_blank"
                      >
                        <DropdownMenuItem>Detailed View</DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setActiveModalRow(index);
                        }}
                      >
                        Add Booking
                      </DropdownMenuItem>
                      {/* --- Add Reject option with sub-dropdown --- */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          Reject
                        </DropdownMenuSubTrigger>

                        <DropdownMenuSubContent>
                          {[
                            "Blocked on whatsapp",
                            "Late Response",
                            "Delayed the travelling",
                            "Already got it",
                            "Didn't like the option",
                            "Different Area",
                            "Agency Fees",
                          ].map((reason, ind) => (
                            <DropdownMenuItem
                              key={ind}
                              onClick={() =>
                                handleRejectionReason(reason, visit._id, index)
                              }
                              className="cursor-pointer"
                            >
                              {reason}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      {/* --- End Reject option --- */} 
                    </DropdownMenuGroup>
                    <AlertDialog open={activeModalRow === index}>
                      <AlertDialogContent>
                        {/* <VisitModal
                          leadId={query._id!}
                          onOpenChange={() => {
                            setActiveModalRow(-1);
                          }}
                        /> */}
                        <BookingModal
                          lead={visit.lead?._id!}
                          visit={visit._id!}
                          onOpenChange={() => {
                            setActiveModalRow(-1);
                          }}
                        />
                      </AlertDialogContent>
                    </AlertDialog>
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
