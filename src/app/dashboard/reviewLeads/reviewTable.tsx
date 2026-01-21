import {
  Users,
  Euro,
  BookX,
  Loader2,
  Ellipsis,
  ThumbsUp,
  CircleDot,
  Info,
  BedSingle,
  ReceiptText,
  ArrowBigUpDash,
  ArrowBigDownDash,
  Mail,
  MailCheck,
  Image,
  Map,
  MailOpen,
  MessageSquare,
  MessageSquareText,
  MailX,
  MessageSquareX,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IQuery } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import VisitModal from "@/app/dashboard/goodtogoleads/visit-modal";
import { EditableCell } from "@/app/dashboard/goodtogoleads/EditableCell";
import { TooltipEditableCell } from "@/app/dashboard/goodtogoleads/ToolTipEditableProp";
import CustomTooltip from "@/components/CustomToolTip";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
// import { DropdownMenuItem } from "@/components/ui/dropdown-menu";



interface AreaType {
  _id: string;
  city: string;
  name: string;
}
interface TargetType {
  _id: string;
  city: string;
  areas: AreaType[];
}

export default function LeadTable({ queries ,setQueries}: { queries: IQuery[] ,setQueries:Function}) {
  const router = useRouter();
  const path = usePathname();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [activeModalRow, setActiveModalRow] = useState(-1);

  const [salesPriority, setSalesPriority] = useState<
    ("Low" | "High" | "Medium" | "None")[]
  >(Array.from({ length: queries?.length }, () => "None"));

  const [messageStatus, setMessageStatus] = useState<
    ("First" | "Second" | "Third" | "Fourth" | "None")[]
  >(Array.from({ length: queries?.length }, () => "None"));

  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    new Date(Date.now())
  );
  const [noteValue, setNoteValue] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [page, setPage] = useState(1);
  const [targets, setTargets] = useState<TargetType[]>([]);

  useEffect(() => {
    if (searchParams?.get("page")) {
      setPage(parseInt(searchParams.get("page") ?? "1") || 1);
    }
  }, []);

  const handleQualityChange = async (
    leadQualityByTeamLead: string,
    id: any,
    index: number
  ) => {
    setLoading(true);
    try {
      const response = axios.post("/api/sales/reviewByTeamLead", {
        id,
        leadQualityByTeamLead,
      });
      toast({
        description: "Status updated succefully",
      });
      queries[index].leadQualityByTeamLead = leadQualityByTeamLead;
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      toast({
        description: "Error occurred while updating status",
      });
    }
  };

const handleSave = async (
  _id: string,
  key: keyof IQuery,
  newValue: string
) => {
  // keep previous snapshot
  const prev = [...queries];

  // optimistic update
  setQueries?.((q: IQuery[]) =>
    q.map((item: IQuery) =>
      item._id === _id ? { ...item, [key]: newValue } : item
    )
  );

  try {
    await axios.put(`/api/leads/updateData/${_id}`, {
      field: key,
      value: newValue,
    });
  } catch (error) {
    console.error("Update failed", error);
    // rollback if API fails
    setQueries?.(prev);
  }
};


  const IsView = async (id: any, index: any) => {
    try {
      await axios.post("/api/sales/queryStatusUpdate", {
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
    if (!queries[index].leadQualityByReviewer) {
      toast({
        description: "Please select lead quality first",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
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

  const handleDisposition = async (
    id: any,
    index: number,
    disposition: string,
    dispositionReason?: string
  ) => {
    setLoading(true);
    if (!queries[index].leadQualityByReviewer) {
      toast({
        description: "Please select lead quality first",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    try {
      axios.post("/api/leads/disposition", {
        id,
        disposition,
        dispositionReason,
      });
      toast({
        description: "Disposition updated succefully",
      });
      queries[index].leadStatus = disposition;
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
    } else if (newSalesPriorities[index] === "High") {
      newSalesPriorities[index] = "Medium";
      queries[index].salesPriority = "Medium";
    } else {
      newSalesPriorities[index] = "None";
      queries[index].salesPriority = "None";
    }
    setSalesPriority(newSalesPriorities);
    changeSalesPriority(leadId, newSalesPriorities[index]);
  };

  const handleMessageStatus = (leadId: string | undefined, index: number) => {
    if (!leadId) return;

    const newMessageStatus = [...messageStatus];
    const newMessage = newMessageStatus[index];
    if (newMessage === "None") {
      newMessageStatus[index] = "First";
      queries[index].messageStatus = "First";
    } else if (newMessageStatus[index] === "First") {
      newMessageStatus[index] = "Second";
      queries[index].messageStatus = "Second";
    } else if (newMessageStatus[index] === "Second") {
      newMessageStatus[index] = "Third";
      queries[index].messageStatus = "Third";
    } else if (newMessageStatus[index] === "Third") {
      newMessageStatus[index] = "Fourth";
      queries[index].messageStatus = "Fourth";
    } else {
      newMessageStatus[index] = "None";
      queries[index].messageStatus = "None";
    }

    setMessageStatus(newMessageStatus);
    changeMessageStatus(leadId, newMessageStatus[index]);
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

  const changeMessageStatus = useCallback(
    debounce(async (leadId: string, status: string) => {
      const response = await axios.post("/api/sales/updateMessageStatus", {
        leadId,
        changedStatus: status,
      });
    }, 1000),
    []
  );

  const addReminder = async (leadId: string | undefined, index: number) => {
    if (!leadId) return;
    if (!queries[index].leadQualityByReviewer) {
      toast({
        description: "Please select lead quality first",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
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
      queries[index] = response.data.data;
    } catch (error: any) {
      console.error("Error saving note:", error.message || error);
      setCreatingNote(false);
    }
  };

    const formatDuration = (duration: string , startDate: string) => {
    if(!duration || !startDate){
      return "";
    }

    let shortDuration = duration

    shortDuration = shortDuration
    .replace(/years?/gi, "(Y)")
    .replace(/months?/gi, "(M)")
    .replace(/days?/gi, "(D)")
    .replace(/\s+/g, "");

    const date = new Date(startDate);
    const month = date.toLocaleString("default", { month: "short" });

    return `${shortDuration} ${month}`;

  }
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        // const data = await res.json();
        setTargets(res.data.data);
        // console.log("targets: ", res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  // Add getRecommendations function
  const getRecommendations = (id: any, index: number) => {
    window.open(`/dashboard/recommendations/${id}`, "_blank");
  };

  return (
    <div className=" w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Location</TableHead>
            {/* {(token?.role === "Sales-TeamLead" ||
              token?.role === "SuperAdmin") && ( */}
            <TableHead>Lead Quality</TableHead>
            {/*  )}*/}
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
                query?.BoostID
                  ? "bg-orange-300/40"
                  : query?.isViewed
                  ? "bg-transparent hover:bg-transparent"
                  : "bg-neutral-700"
              }
              relative
            `}
            >
              <TableCell>{(page - 1) * 50 + index + 1}</TableCell>
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
                  <p className="text-white">{query?.name} </p>
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
              {/* <TableCell className="">
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
              </TableCell> */}

              <TableCell className="">
                <div className="flex gap-x-2">
                  <TooltipEditableCell
                    value={query?.guest.toString() ?? ""}
                    onSave={(val) => handleSave(query._id!, "guest", val)}
                    tooltipText="Number of guests"
                    icon={<Users size={18} />}
                    maxWidth="40px"
                  />
                  {/* <CustomTooltip
                    icon={<Users size={18} />}
                    content={query?.guest}
                    desc="Number of guests"
                  /> */}
                  <div> | </div>
                  {/* <CustomTooltip
                    icon={<BedSingle size={18} />}
                    content={query?.noOfBeds}
                    desc="Number of Beds"
                  /> */}
                  <TooltipEditableCell
                    value={query?.noOfBeds.toString() ?? ""}
                    onSave={(val) => handleSave(query._id!, "noOfBeds", val)}
                    tooltipText="Number of Beds"
                    icon={<BedSingle size={18} />}
                    maxWidth="40px"
                  />
                </div>
              </TableCell>

              <TableCell>
                <div className="flex gap-x-2">
                  <TooltipEditableCell
                    value={`€${query?.maxBudget.toString() ?? ""}`}
                    onSave={(val) => handleSave(query._id!, "maxBudget", val)}
                    tooltipText={`€ ${query.minBudget} - € ${query.maxBudget}`}
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
                          <BookX size={18} color="red" />
                        ) : (
                          <ReceiptText size={18} color="green" />
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
                {formatDuration(query?.duration, query?.startDate)}
              </TableCell>

              <TableCell>
                <div className=" flex gap-x-1">
                  {/* <TooltipEditableCell
                    value={query?.area ?? ""}
                    onSave={(val) => handleSave(query._id!, "area", val)}
                    tooltipText={`Location ->${query?.location} Area ->${query?.area}`}
                  /> */}
                  <AreaSelect
                    data={
                      targets
                        .find(
                          (target) =>
                            target.city.toLowerCase() ===
                            query.location.toLowerCase()
                        )
                        ?.areas.map((area) => ({
                          value: area.name,
                          label: area.name,
                        })) ?? []
                    }
                    value={query.area ?? ""}
                    save={(val) => handleSave(query._id!, "area", val)}
                    tooltipText={`Location ->${query?.location} Area ->${query?.area}`}
                    icon={<span className="text-green-500">✅</span>}
                    maxWidth="150px"
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
                          : query?.zone === "Center"
                          ? "C"
                          : query?.zone === "North-East"
                          ? "NE"
                          : query?.zone === "North-West"
                          ? "NW"
                          : query?.zone === "South-East"
                          ? "SE"
                          : query?.zone === "South-West"
                          ? "SW"
                          : "A"
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
                          : query?.zone === "Center"
                          ? "Center"
                          : query?.zone === "North-East"
                          ? "North-East"
                          : query?.zone === "North-West"
                          ? "North-West"
                          : query?.zone === "South-East"
                          ? "South-East"
                          : query?.zone === "South-West"
                          ? "South-West"
                          : query?.zone === "Anywhere"
                          ? "Anywhere"
                          : "All"
                      }
                    />
                  </Badge>
                </div>
              </TableCell>
              {/* {(token?.role === "Sales-TeamLead" ||
                token?.role === "SuperAdmin") && ( */}
              <TableCell className=" flex gap-x-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Button variant="ghost">
                        {query.leadQualityByTeamLead || "Review"}
                      </Button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    {(token?.role === "SuperAdmin" ||
                      token?.role === "Sales-TeamLead") && (
                      <DropdownMenuLabel>Lead Quality</DropdownMenuLabel>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handleQualityChange("Approved", query?._id, index)
                      }
                    >
                      Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() =>
                        handleQualityChange("Not Approved", query?._id, index)
                      }
                    >
                      Not Approved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              {/*)}*/}
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
                  onClick={() => {
                    navigator.clipboard.writeText(`${query?.phoneNo}`);
                    if (query.isViewed === false) {
                      IsView(query?._id, index);
                    }
                  }}
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
                      <Link
                        onClick={() => IsView(query?._id, index)}
                        href={`/dashboard/createquery/${query?._id}`}
                      >
                        <DropdownMenuItem>Detailed View</DropdownMenuItem>
                      </Link>
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
                          onClick={() =>
                            handleNote(query._id, noteValue, index)
                          }
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
