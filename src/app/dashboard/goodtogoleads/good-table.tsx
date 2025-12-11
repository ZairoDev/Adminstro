import {
  Users,
  Euro,
  BookX,
  Loader2,
  Ellipsis,
  ThumbsUp,
  CircleDot,
  BedSingle,
  ReceiptText,
  ArrowBigUpDash,
  ArrowBigDownDash,
  Plus,
  Minus,
  Image,
  Map,
  Mail,
  MailCheck,
  MailX,
  MessageSquareX,
  MessageSquareOff,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import debounce from "lodash.debounce";
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
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IQuery, unregisteredOwners } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
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
} from "../../../components/ui/dropdown-menu";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";
import { Textarea } from "../../../components/ui/textarea";
import CustomTooltip from "../../../components/CustomToolTip";
import VisitModal from "@/app/dashboard/goodtogoleads/visit-modal";
import { EditableCell } from "@/app/spreadsheet/components/cells/EditableCell";
import { TooltipEditableCell } from "./ToolTipEditableProp";
import { AreaSelect } from "@/components/leadTableSearch/page";
import { options } from "@fullcalendar/core/preact.js";

interface Timers {
  current: { [key: string]: NodeJS.Timeout };
}

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

export default function GoodTable({
  queries,
  setQueries,
  isBroker = false,
}: {
  queries: IQuery[];
  setQueries: React.Dispatch<React.SetStateAction<IQuery[]>>;
  isBroker?: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [activeModalRow, setActiveModalRow] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    new Date(Date.now())
  );
  const [recommendationData, setRecommendationData] = useState<
    unregisteredOwners[]
  >([]);
  const [noteValue, setNoteValue] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(() =>
    queries.map((q: IQuery) => ({
      leadId: q._id,
      propertyShown: q["propertyShown"] || 0,
    }))
  );
  const [targets, setTargets] = useState<TargetType[]>([]);

  //   const timers:Timers = useRef({});

  useEffect(() => {
    if (searchParams.get("page")) {
      setPage(parseInt(searchParams.get("page") ?? "1") || 1);
    }
  }, []);

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

  const getRecommendations = (id: any, index: number) => {
    window.open(`/dashboard/recommendations/${id}`, "_blank");
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

  const handleSave = async (
    _id: string,
    key: keyof IQuery,
    newValue: string
  ) => {
    // optimistic UI update
    const prev = queries;
    const updatedData = queries.map((item) =>
      item._id === _id ? { ...item, [key]: newValue } : item
    );
    setQueries(updatedData);
    try {
      await axios.put(`/api/leads/updateData/${_id}`, {
        field: key,
        value: newValue,
      });
    } catch (error) {
      console.error("Update failed", error);
      // rollback if API fails
      setQueries(prev);
    }
  };

  const handleMessageStatus = async (leadId: string | undefined, index: number) => {
    if (!leadId || updatingStatusId === leadId) return;

    const currentStatus = queries[index].messageStatus;
    let newStatus: string;

    // Cycle for Good To Go leads: None → Options → Visit → None
    if (!currentStatus || currentStatus === "None") {
      newStatus = "Options";
    } else if (currentStatus === "Options") {
      newStatus = "Visit";
    } else {
      newStatus = "None";
    }

    // Optimistic update
    const prevQueries = [...queries];
    setQueries((q: IQuery[]) =>
      q.map((item: IQuery) =>
        item._id === leadId ? { ...item, messageStatus: newStatus } : item
      )
    );

    setUpdatingStatusId(leadId);
    try {
      await axios.post("/api/sales/updateMessageStatus", {
        leadId,
        changedStatus: newStatus,
      });
      toast({
        description: "Status updated successfully",
      });
    } catch (error) {
      console.error("Failed to update message status", error);
      // Rollback on failure
      setQueries(prevQueries);
      toast({
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSalesPriority = async (leadId: string | undefined, index: number) => {
    if (!leadId || updatingStatusId === leadId) return;

    const currentPriority = queries[index].salesPriority;
    let newPriority: string;

    // Cycle for Good To Go leads: None → Low → High → NR → None
    if (!currentPriority || currentPriority === "None") {
      newPriority = "Low";
    } else if (currentPriority === "Low") {
      newPriority = "High";
    } else if (currentPriority === "High") {
      newPriority = "NR";
    } else {
      newPriority = "None";
    }

    // Optimistic update
    const prevQueries = [...queries];
    setQueries((q: IQuery[]) =>
      q.map((item: IQuery) =>
        item._id === leadId ? { ...item, salesPriority: newPriority } : item
      )
    );

    setUpdatingStatusId(leadId);
    try {
      await axios.post("/api/sales/updateSalesPriority", {
        leadId,
        changedPriority: newPriority,
      });
      toast({
        description: "Priority updated successfully",
      });
    } catch (error) {
      console.error("Failed to update sales priority", error);
      // Rollback on failure
      setQueries(prevQueries);
      toast({
        description: "Failed to update priority. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };


  const debouncersRef = useRef<{ [leadId: string]: Function }>({});

  const debouncedUpdate = (leadId: string, value: number, type: string) => {
    setQueries((prev: IQuery[]) => {
      return prev.map((q) =>
        q._id === leadId ? { ...q, propertyShown: value } : q
      );
    });
    // If a debouncer doesn't exist for this lead, create one
    if (!debouncersRef.current[leadId]) {
      debouncersRef.current[leadId] = debounce(
        async (leadId: string, value: number, type: string) => {
          try {
            const res = await axios.post("/api/sales/updatePropertyShown", {
              leadId,
              value,
              type,
            });

          } catch (err) {
            console.error("API error for leadId:", leadId, err);
            toast({
              variant: "destructive",
              title: "Error",
              description:
                "Unable to update property shown! Please try again later.",
            });
          }
        },
        500, // debounce delay (ms)
        { leading: false, trailing: true }
      );
    }

    // Call the debounced function
    debouncersRef.current[leadId](leadId, value, type);
  };

  const Increase = (leadId: string, current: number, index: number) => {
    // updatePropertyShown(leadId, current,"increase");
    // setQueries((prevRows) => {
    //   const newRows = [...prevRows];
    //   newRows[index].propertyShown = current + 1;
    //   return newRows;
    // });
    debouncedUpdate(leadId, current + 1, "increase");
  };

  const Decrease = (leadId: string, current: number, index: number) => {
    // updatePropertyShown(leadId, Math.max(0, current),"decrease");
    // setQueries((prev)=>{
    //   const newRows = [...prev];
    //   newRows[index].propertyShown = Math.max(0, current - 1);
    //   return newRows;
    // })
    debouncedUpdate(leadId, Math.max(0, current - 1), "decrease");
  };

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

  // Creating Note
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

  const formatDuration = (duration: string, startDate: string) => {
    if (!duration || !startDate) {
      return "";
    }

    let shortDuration = duration;

    shortDuration = shortDuration
      .replace(/years?/gi, "(Y)")
      .replace(/months?/gi, "(M)")
      .replace(/days?/gi, "(D)")
      .replace(/\s+/g, "");

    const date = new Date(startDate);
    const month = date.toLocaleString("default", { month: "short" });

    return `${shortDuration} ${month}`;
  };
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        // const data = await res.json();
        setTargets(res.data.data);

      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  return (
    <div className=" w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No.</TableHead>
            {(token?.role === "Sales" ||
              token?.role === "Sales-TeamLead" ||
              token?.role === "SuperAdmin") && <TableHead>Status</TableHead>}
            {(token?.role === "Sales" ||
              token?.role === "Sales-TeamLead" ||
              token?.role === "SuperAdmin") && <TableHead>Response</TableHead>}
            <TableHead>Name</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Location</TableHead>
            {/* {(token?.role === "Sales-TeamLead" ||
              token?.role === "SuperAdmin") && ( */}
            <TableHead>Property Shown</TableHead>
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
                query?.messageStatus === "Visit"
                  ? "bg-cyan-400/10"
                  : query?.isViewed
                  ? "bg-transparent hover:bg-transparent"
                  : "bg-neutral-700"
              }
              relative
            `}
            >
              <TableCell>{(page - 1) * 50 + index + 1}</TableCell>

              {(token?.role === "Sales" ||
                token?.role === "Sales-TeamLead" ||
                token?.role === "SuperAdmin") && (
                <TableCell
                  className=" cursor-pointer relative "
                  onClick={() => handleMessageStatus(query?._id, index)}
                >
                  {query?.reminder === null && (
                    <div className=" h-[70px] w-4 absolute top-0 left-0 bg-gradient-to-t from-[#0f2027] via-[#203a43] to-[#2c5364]">
                      <p className=" rotate-90 text-xs font-semibold mt-1">
                        Reminder
                      </p>
                    </div>
                  )}
                  {query.messageStatus === "First" ? (
                    <CustomTooltip
                      icon={<Mail color="green" />}
                      desc="First Message"
                    />
                  ) : query.messageStatus === "Second" ? (
                    <CustomTooltip
                      icon={<MailCheck color="yellow" />}
                      desc="Second Message"
                    />
                  ) : query.messageStatus === "Third" ? (
                    <CustomTooltip
                      icon={<MailX color="magenta" />}
                      desc="Third Message"
                    />
                  ) : query.messageStatus === "Fourth" ? (
                    <CustomTooltip
                      icon={<MessageSquareX color="red" />}
                      desc="Fourth Message"
                    />
                  ) : query.messageStatus === "Options" ? (
                    <CustomTooltip
                      icon={<Image color="cyan" />}
                      desc="Shared Options"
                    />
                  ) : query.messageStatus === "Visit" ? (
                    <CustomTooltip
                      icon={<Map color="lightgreen" />}
                      desc="Visit Scheduled"
                    />
                  ) : (
                    <CustomTooltip
                      icon={<CircleDot fill="" color="gray" />}
                      desc="No Status"
                    />
                  )}
                </TableCell>
              )}

              {(token?.role === "Sales" ||
                token?.role === "Sales-TeamLead" ||
                token?.role === "SuperAdmin") && (
                <TableCell
                  className=" cursor-pointer relative "
                  onClick={() => handleSalesPriority(query?._id, index)}
                >
                  {query?.reminder === null && (
                    <div className=" h-[70px] w-4 absolute top-0 left-0 bg-gradient-to-t from-[#0f2027] via-[#203a43] to-[#2c5364]">
                      <p className=" rotate-90 text-xs font-semibold mt-1">
                        Reminder
                      </p>
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
                  ) : query.salesPriority === "NR" ? (
                    <CustomTooltip
                      icon={<MessageSquareOff fill="" color="yellow" />}
                      desc="Not Replying"
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
                  {/* <CustomTooltip
                    icon={<Users size={18} />}
                    content={query?.guest}
                    desc="Number of guests"
                  /> */}
                  <TooltipEditableCell
                    value={query?.guest.toString() ?? ""}
                    onSave={(val) => handleSave(query._id!, "guest", val)}
                    tooltipText="Number of guests"
                    icon={<Users size={18} />}
                    maxWidth="40px"
                  />
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
                  €
                  {/* <EditableCell
                    value={query?.maxBudget.toString()}
                    onSave={() =>
                      handleSave(
                        query?._id!,
                        "maxBudget",
                        query?.maxBudget.toString()
                      )
                    }
                    maxWidth="40px"
                  /> */}
                  <TooltipEditableCell
                    value={query?.maxBudget.toString() ?? ""}
                    onSave={(val) => handleSave(query._id!, "maxBudget", val)}
                    tooltipText={`€ ${query.minBudget} - € ${query.maxBudget}`}
                  />
                  {/* <CustomTooltip
                    // icon={<Euro size={18} />}  
                    text={`€ ${query.maxBudget}`}
                    desc={`€ ${query?.minBudget} - € ${query.maxBudget}`}
                  /> */}
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
                  {/* <CustomTooltip
                    text={`${query?.area?.slice(0, 8)}...`}
                    desc={`Location ->${query?.location} Area ->${query?.area}`}
                  /> */}
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
                          label: area.name.toLowerCase(),
                        })) ?? []
                    }
                    value={query.area ?? ""}
                    save={(val) => handleSave(query._id!, "area", val)}
                    tooltipText={`Location ->${query?.location} Area ->${query?.area}`}
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
                <div className="flex gap-1 items-center justify-center">
                  <button
                    onClick={() =>
                      Decrease(
                        query?._id || "",
                        query?.propertyShown || 0,
                        index
                      )
                    }
                    className="bg-gray-500 rounded-full p-1"
                  >
                    <Minus size={18} />
                  </button>
                  <button>{query?.propertyShown || 0}</button>
                  <button
                    onClick={() =>
                      Increase(
                        query?._id || "",
                        query?.propertyShown || 0,
                        index
                      )
                    }
                    className="bg-gray-500 rounded-full p-1"
                  >
                    <Plus size={18} />
                  </button>
                </div>
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
                      {isBroker ? (
                        // For brokers, only show Set Visit
                        <>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setActiveModalRow(index);
                            }}
                          >
                            Set Visit
                          </DropdownMenuItem>

                          <AlertDialog open={activeModalRow === index}>
                            <AlertDialogContent>
                              <VisitModal
                                leadId={query._id!}
                                onOpenChange={() => {
                                  setActiveModalRow(-1);
                                }}
                              />
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        // For leads, show all actions
                        <>
                      {(token?.role === "Sales" ||
                        token?.role === "Sales-TeamLead" ||
                        token?.role === "SuperAdmin") && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleCreateRoom(index)}
                          >
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
                            <div
                              onClick={(e) => {
                                e.preventDefault(); // Prevent dropdown click default behavior
                                e.stopPropagation(); // Stop the event from bubbling
                              }}
                            >
                              <AlertDialog
                                onOpenChange={(isOpen) => {
                                  if (!isOpen) ellipsisRef.current?.focus();
                                }}
                              >
                                <AlertDialogTrigger
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  asChild
                                >
                                  <button type="button">Set Reminder</button>
                                </AlertDialogTrigger>
                                <AlertDialogContent
                                  className=" flex flex-col items-center"
                                  onCloseAutoFocus={(event) => {
                                    event.preventDefault(); // Prevent default focus-restoring behavior if needed
                                    document.body.style.pointerEvents = "";
                                  }}
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
                                        onClick={() =>
                                          addReminder(query?._id, index)
                                        }
                                      >
                                        Continue
                                      </AlertDialogAction>
                                    </div>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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
                      {path.toString().trim().split("/")[2] ===
                        "goodtogoleads" && (
                        <>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setActiveModalRow(index);
                            }}
                          >
                            Set Visit
                          </DropdownMenuItem>

                          <AlertDialog open={activeModalRow === index}>
                            <AlertDialogContent>
                              <VisitModal
                                leadId={query._id!}
                                onOpenChange={() => {
                                  setActiveModalRow(-1);
                                }}
                              />
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            getRecommendations(query._id, index);
                          }}
                        >
                          Get Recommendation
                        </DropdownMenuItem>

                        <AlertDialog open={activeModalRow === index}>
                          <AlertDialogContent>
                            <VisitModal
                              leadId={query._id!}
                              // loading={loading}
                              // data={recommendationData}
                              onOpenChange={() => {
                                setActiveModalRow(-1);
                                setRecommendationData([]); // Clear previous data
                              }}
                            />
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                        </>
                      )}
                    </DropdownMenuGroup>
                    {!isBroker && (
                      <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        {/* {(token?.role === "SuperAdmin" ||
                          token?.role === "Sales-TeamLead") && ( */}
                        <>
                          {path.toString().trim().split("/")[2] ===
                            "rolebaseLead" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleDisposition(query?._id, index, "active")
                              }
                              className=" flex items-center gap-x-2"
                            >
                              Good To Go <ThumbsUp size={16} />
                            </DropdownMenuItem>
                          )}
                          {path.toString().trim().split("/")[2] ===
                            "rolebaseLead" && (
                            <DropdownMenuSubTrigger className="w-40 truncate">
                              Rej re:
                              <span className="ml-2">
                                {query.rejectionReason}
                              </span>
                            </DropdownMenuSubTrigger>
                          )}
                          {path.toString().trim().split("/")[2] ===
                            "goodtogoleads" && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                Decline
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {[
                                    "Blocked on whatsapp",
                                    "Late Response",
                                    "Delayed the travelling",
                                    "Already got it",
                                    "Didn't like the option",
                                    "Different Area",
                                    "Agency Fees",
                                  ].map((declineReason, ind) => (
                                    <DropdownMenuItem
                                      key={ind}
                                      onClick={() =>
                                        handleDisposition(
                                          query?._id,
                                          index,
                                          "declined",
                                          `${declineReason}`
                                        )
                                      }
                                    >
                                      {`${declineReason}`}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            // <DropdownMenuItem
                            //   onClick={() =>
                            //     handleDisposition(
                            //       query?._id,
                            //       index,
                            //       "declined"
                            //     )
                            //   }
                            //   className=" flex items-center gap-x-2"
                            // >
                            //   Decline
                            // </DropdownMenuItem>
                          )}
                        </>
                        {/* )}*/}
                        {path.toString().trim().split("/")[2] ===
                          "rolebaseLead" && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Reject
                            </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {[
                              "Not on whatsapp",
                              "Not Replying",
                              "Low Budget",
                              "Blocked on whatsapp",
                              "Late Response",
                              "Delayed the travelling",
                              "Off Location",
                              "Number of people exceeded",
                              "Already got it",
                              "Different Area",
                              "Agency Fees",
                            ].map((reason, ind) => (
                              <DropdownMenuItem
                                key={ind}
                                onClick={() =>
                                  handleRejectionReason(
                                    `${reason}`,
                                    query?._id,
                                    index
                                  )
                                }
                              >
                                {`${reason}`}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                          </DropdownMenuSub>
                        )}
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                      </>
                    )}
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
