import axios from "axios";
import Link from "next/link";
import debounce from "lodash.debounce";
import { useCallback, useRef, useState } from "react";
import {
  Users,
  Ellipsis,
  BedSingle,
  Euro,
  ReceiptText,
  BookX,
  Loader2,
  ArrowBigUpDash,
  ArrowBigDownDash,
  CircleDot,
} from "lucide-react";

import { IQuery } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Textarea } from "../ui/textarea";
import CustomTooltip from "../CustomToolTip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { useRouter } from "next/navigation";

export default function LeadTable({ queries }: { queries: IQuery[] }) {
  const { toast } = useToast();
  const { token } = useAuthStore();
  const router = useRouter();

  const ellipsisRef = useRef<HTMLButtonElement>(null);

  const [salesPriority, setSalesPriority] = useState<("Low" | "High" | "None")[]>(
    Array.from({ length: queries?.length }, () => "None")
  );
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    new Date(Date.now())
  );
  const [noteValue, setNoteValue] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);

  const handleQualityChange = async (
    leadQualityByReviwer: string,
    id: any,
    index: number
  ) => {
    setLoading(true);
    try {
      const response = axios.post("/api/sales/reviewLeadQuality", {
        id,
        leadQualityByReviwer,
      });
      toast({
        description: "Status updated succefully",
      });
      queries[index].leadQualityByReviwer = leadQualityByReviwer;
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast({
        description: "Error occurred while updating status",
      });
    }
  };

  const IsView = async (id: any, index: any) => {
    try {
      const ApiRespone = await axios.post("/api/sales/queryStatusUpdate", {
        id,
      });
      toast({
        description: "Status updated succefully",
      });
      queries[index].isViewed = true;
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleRejectionReason = async (
    rejectionReason: string,
    id: any,
    index: number
  ) => {
    setLoading(true);
    try {
      const response = axios.post("/api/sales/rejectionReason", {
        id,
        rejectionReason,
      });
      toast({
        description: "Rejection reason saved succefully",
      });
      queries[index].rejectionReason = rejectionReason;
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast({
        description: "Error occurred while updating status",
      });
    }
  };

  const handleCreateRoom = async (index: number) => {
    try {
      const response = await axios.post("/api/room/createRoom", {
        lead: queries[index],
      });
      setRoomId(response.data.room._id);
      setRoomPassword(response.data.room.password);
      alert(
        `Room created successfully with id: ${response.data.room._id} and password: ${response.data.room.password}`
      );
    } catch (err: unknown) {
      console.log("err: ", err);
    }
  };

  const handleSalesPriority = (leadId: string | undefined, index: number) => {
    if (!leadId) return;
    const newSalesPriorities = [...salesPriority];
    const newSalesPriority = newSalesPriorities[index];
    if (newSalesPriority === "None") {
      newSalesPriorities[index] = "Low";
      queries[index].salesPriority = "Low";
    } else if (newSalesPriorities[index] === "Low") {
      newSalesPriorities[index] = "High";
      queries[index].salesPriority = "High";
    } else {
      newSalesPriorities[index] = "None";
      queries[index].salesPriority = "None";
    }

    setSalesPriority(newSalesPriorities);

    changeSalesPriority(leadId, newSalesPriorities[index]);
  };

  const changeSalesPriority = useCallback(
    debounce(async (leadId: string, priority: string) => {
      const response = await axios.post("/api/sales/updateSalesPriority", {
        leadId,
        changedPriority: priority,
      });
    }, 1000),
    []
  );

  const addReminder = async (leadId: string | undefined) => {
    if (!leadId) return;
    try {
      const response = await axios.post("/api/sales/reminders/addReminder", {
        leadId,
        reminderDate,
      });
      toast({
        variant: "default",
        title: "Reminder Added",
        description: `Reminder addded for ${new Date(
          response.data.reminderDate
        ).toLocaleDateString("en-GB")} (${new Date(
          response.data.reminderDate
        ).toLocaleDateString("en-GB", { weekday: "long" })})`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to add Reminder!",
      });
    }
  };

  // Creating Note
  const handleNote = async (id: any, noteValue: string | undefined, index: number) => {
    if (!noteValue) return;

    try {
      setCreatingNote(true);
      const response = await axios.post("/api/sales/createNote", {
        id,
        note: noteValue,
      });
      setCreatingNote(false);
      queries[index] = response.data.data;
    } catch (error: any) {
      console.error("Error saving note:", error.message || error);
      setCreatingNote(false);
    }
  };

  return (
    <div className=" w-full">
      <Table>
        <TableHeader>
          <TableRow>
            {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
              <TableHead>Priority</TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Location</TableHead>
            {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
              <TableHead>Lead Quality</TableHead>
            )}
            <TableHead>Contact</TableHead>
            <TableHead>Actions </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries?.map((query, index) => (
            <TableRow
              key={query?._id}
              className={`
              ${
                query?.isViewed ? "bg-transparent hover:bg-transparent" : "bg-neutral-700"
              }
              relative
            `}
            >
              {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                <TableCell
                  className=" cursor-pointer relative "
                  onClick={() => handleSalesPriority(query?._id, index)}
                >
                  {query?.reminder === null && (
                    <div className=" h-[70px] w-4 absolute top-0 left-0 bg-gradient-to-t from-[#0f2027] via-[#203a43] to-[#2c5364]">
                      <p className=" rotate-90 text-xs font-semibold mt-1">Reminder</p>
                    </div>
                  )}
                  {query.salesPriority === "High" ? (
                    <CustomTooltip
                      icon={<ArrowBigUpDash fill="green" color="green" />}
                      desc="High Priority"
                    />
                  ) : query.salesPriority === "Low" ? (
                    <CustomTooltip
                      icon={<ArrowBigDownDash fill="red" color="red" />}
                      desc="Low Priority"
                    />
                  ) : (
                    <CustomTooltip
                      icon={<CircleDot fill="" color="gray" />}
                      desc="No Priority"
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="flex gap-x-1">
                <Badge
                  className={` ${
                    query.priority === "ASAP"
                      ? "bg-green-950"
                      : query.priority === "High"
                      ? "bg-green-500"
                      : query.priority === "Medium"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  } relative`}
                >
                  <p className="text-white">{query?.name}</p>
                </Badge>
                <Badge>
                  <CustomTooltip
                    text={
                      query?.bookingTerm === "Long Term"
                        ? "L"
                        : query?.bookingTerm === "Mid Term"
                        ? "M"
                        : "S"
                    }
                    desc={
                      query?.bookingTerm === "Long Term"
                        ? "Long Term"
                        : query?.bookingTerm === "Mid Term"
                        ? "Mid Term"
                        : "Short Term"
                    }
                  />
                </Badge>
              </TableCell>
              <TableCell className="">
                <div className="flex gap-x-2">
                  <CustomTooltip
                    icon={<Users size={18} />}
                    content={query?.guest}
                    desc="Number of guests"
                  />
                  <div> | </div>
                  <CustomTooltip
                    icon={<BedSingle size={18} />}
                    content={query?.noOfBeds}
                    desc="Number of Beds"
                  />
                </div>
              </TableCell>

              <TableCell>
                <div className="flex gap-x-2">
                  <CustomTooltip
                    icon={<Euro size={18} />}
                    text={query?.budget}
                    desc="Guest Budget"
                  />
                  <div>|</div>
                  <Badge>
                    <CustomTooltip
                      text={
                        query?.propertyType === "Furnished"
                          ? "F"
                          : query?.propertyType === "Semi-furnished"
                          ? "SF"
                          : "UF"
                      }
                      desc={
                        query?.propertyType === "Furnished"
                          ? "Furnished"
                          : query?.propertyType === "Semi-furnished"
                          ? "Semi Furnished"
                          : "Un Furnished"
                      }
                    />
                  </Badge>
                  <div>|</div>
                  <Badge>
                    <CustomTooltip
                      icon={
                        query?.billStatus === "Without Bill" ? (
                          <BookX size={18} />
                        ) : (
                          <ReceiptText size={18} />
                        )
                      }
                      desc={
                        query?.billStatus === "Without Bill"
                          ? "Without Bill"
                          : "With Bill"
                      }
                    />
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className=" flex gap-x-1">
                  <CustomTooltip
                    text={`${query?.area?.slice(0, 8)}...`}
                    desc={`Location ->${query?.location} Area ->${query?.area}`}
                  />
                  <div>|</div>
                  <Badge>
                    <CustomTooltip
                      text={
                        query?.zone === "East"
                          ? "E"
                          : query?.zone === "West"
                          ? "W"
                          : query?.zone === "North"
                          ? "N"
                          : query?.zone === "South"
                          ? "S"
                          : "C"
                      }
                      desc={
                        query?.zone === "East"
                          ? "East"
                          : query?.zone === "West"
                          ? "West"
                          : query?.zone === "North"
                          ? "North"
                          : query?.zone === "South"
                          ? "South"
                          : "Center"
                      }
                    />
                  </Badge>
                </div>
              </TableCell>
              {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                <TableCell className=" flex gap-x-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Button variant="ghost">
                          {query.leadQualityByReviwer || "Review"}
                        </Button>
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuLabel>Lead Quality</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => handleQualityChange("Good", query?._id, index)}
                      >
                        Good
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          handleQualityChange("Very Good", query?._id, index)
                        }
                      >
                        Very Good
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => handleQualityChange("Average", query?._id, index)}
                      >
                        Average
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          handleQualityChange("Below Average", query?._id, index)
                        }
                      >
                        Below Average
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
              <TableCell>
                {/* <Link
                  href={`https://wa.me/${
                    query?.phoneNo
                  }?text=${encodeURIComponent(
                    `Hello, ${query?.name}, how are you doing?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="https://vacationsaga.b-cdn.net/assets/wsp.png"
                    alt="icon image"
                    className="h-8 w-8"
                  />
                </Link> */}
                <p
                  className=" p-1 border border-neutral-600 rounded-md bg-neutral-700/40 cursor-pointer flex justify-center"
                  onClick={() =>
                    navigator.clipboard.writeText(`${query?.phoneNo}`)
                  }
                >
                  Details
                </p>
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
                      {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                        <>
                          <DropdownMenuItem onClick={() => handleCreateRoom(index)}>
                            Create Room
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              sessionStorage.setItem(
                                "previousPath",
                                window.location.pathname
                              );
                              router.push(
                                `${process.env.NEXT_PUBLIC_URL}/dashboard/room/${query?.roomDetails?.roomId}-${query?.roomDetails?.roomPassword}`
                              );
                            }}
                          >
                            Join Room
                          </DropdownMenuItem>

                          <DropdownMenuItem>
                            <AlertDialog
                              onOpenChange={(isOpen) => {
                                if (!isOpen) ellipsisRef.current?.focus();
                              }}
                            >
                              <AlertDialogTrigger
                                onClick={(e) => e.stopPropagation()}
                                asChild
                              >
                                <p>Set Reminder</p>
                              </AlertDialogTrigger>
                              <AlertDialogContent
                                className=" flex flex-col items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className=" z-10">
                                  <Calendar
                                    mode="single"
                                    selected={reminderDate}
                                    onSelect={(date) => {
                                      setReminderDate(date);
                                    }}
                                    className="rounded-md border shadow"
                                  />
                                  <div className=" flex justify-between w-full gap-x-4 mt-2">
                                    <AlertDialogCancel className=" w-1/2">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className=" w-1/2"
                                      onClick={() => addReminder(query?._id)}
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </div>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuItem>
                        </>
                      )}
                      <Link
                        onClick={() => IsView(query?._id, index)}
                        // target="_blank"
                        href={`/dashboard/createquery/${query?._id}`}
                      >
                        <DropdownMenuItem>Detailed View</DropdownMenuItem>
                      </Link>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="w-40 truncate">
                          Rej re:
                          <span className="ml-2">{query.rejectionReason}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason("Not Replying", query?._id, index)
                              }
                            >
                              Not Replying
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Blocked on whatsapp",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Blocked on whatsapp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Not on whatsapp",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Not on whatsapp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason("Late Response", query?._id, index)
                              }
                            >
                              Late Response
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Delayed the Traveling",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Delayed the Traveling
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason("Off Location", query?._id, index)
                              }
                            >
                              Off Location
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Number of people exceeded",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Number of people exceeded
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason("Low Budget", query?._id, index)
                              }
                            >
                              Low Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Allready got it",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Allready got it
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason("Low Budget", query?._id, index)
                              }
                            >
                              Low Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRejectionReason(
                                  "Didn't like the option",
                                  query?._id,
                                  index
                                )
                              }
                            >
                              Didn&apos;t like the option
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className=" absolute right-0 top-1.5">
                  <Dialog>
                    <DialogTrigger>
                      <p
                        className={` h-[65px] w-5 flex items-center justify-center rounded-xl ${
                          query?.note && query?.note?.length > 0
                            ? "bg-gradient-to-b from-[#99f2c8] to-[#1f4037] text-slate-900"
                            : "bg-white/20 text-white"
                        } text-sm font-bold `}
                      >
                        {/* <span>N</span>
                        <span>O</span>
                        <span>T</span>
                        <span>E</span> */}
                        <p className=" rotate-90">Note</p>
                      </p>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Note</DialogTitle>
                        <Textarea
                          className="h-20"
                          placeholder="Write a note here..."
                          value={noteValue}
                          onChange={(e) => {
                            setNoteValue(e.target.value);
                          }}
                        />
                        <p className="text-xl text-foreground font-bold">
                          Previous Notes
                        </p>
                        {query?.note?.map((note, index) => (
                          <p
                            key={index}
                            className=" text-sm flex justify-between items-center w-full "
                          >
                            {" "}
                            <span>{note.noteData}</span>
                            <span className=" text-xs">{note.createOn}</span>
                            <span className=" text-xs w-20 truncate">
                              {note.createdBy}
                            </span>
                          </p>
                        ))}
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          onClick={() => handleNote(query._id, noteValue, index)}
                          className="w-auto"
                          disabled={!noteValue.trim() || creatingNote}
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
