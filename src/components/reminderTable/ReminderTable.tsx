import {
  Euro,
  BookX,
  Users,
  Ellipsis,
  CircleDot,
  BedSingle,
  ReceiptText,
  ArrowBigUpDash,
  ArrowBigDownDash,
  Calendar as DateIcon,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import debounce from "lodash.debounce";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableHeader,
} from "@/components/ui/table";
import { IQuery } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CustomTooltip from "../CustomToolTip";


export default function ReminderTable({ queries }: { queries: IQuery[] }) {
  const { toast } = useToast();
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(null);
  const [salesPriority, setSalesPriority] = useState<
    ("Low" | "High" | "None")[]
  >(Array.from({ length: queries?.length ?? 0 }, () => "None"));
  const ellipsisRef = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(1);

  const startDate =
    selectedQuery?.startDate && !isNaN(Date.parse(selectedQuery?.startDate))
      ? new Date(selectedQuery?.startDate)
      : null;
  const endDate =
    selectedQuery?.endDate && !isNaN(Date.parse(selectedQuery.endDate))
      ? new Date(selectedQuery.endDate)
      : null;

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

  const remainingDays = (date: Date) => {
    const todayDate = new Date();
    const reminderDate = new Date(date);

    todayDate.setHours(0, 0, 0, 0);
    reminderDate.setHours(0, 0, 0, 0);

    const timeDiff: number = reminderDate.getTime() - todayDate.getTime();
    const daysDifference = timeDiff / (1000 * 3600 * 24);

    return Math.floor(daysDifference);
  };

  const addBackToLeads = async (leadId: string | undefined) => {
    if (!leadId) return;
    try {
      const response = await axios.post("/api/sales/reminders/addBackToLeads", {
        leadId,
      });
      queries.filter((query) => query._id !== leadId);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error in adding back to leads",
      });
    }
  };

  useEffect(() => {
    if (searchParams.get("page")) {
      setPage(parseInt(searchParams.get("page") ?? "1") || 1);
    }
  }, []);

  return (
    <div className=" w-full h-full">
      {queries?.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                <TableHead>Priority</TableHead>
              )}
              <TableHead>S. No.</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Location</TableHead>
              {/* {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
              <TableHead>Lead Quality</TableHead>
            )} */}
              {/* <TableHead>Contact</TableHead> */}
              <TableHead>Time To Go</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queries?.map((query, index) => (
              <TableRow
                key={query?._id}
                className={`
              ${
                query?.isViewed
                  ? "bg-transparent hover:bg-transparent"
                  : "bg-primary-foreground"
              }
            `}
              >
                <TableCell>{(page - 1) * 50 + index + 1}</TableCell>
                <TableCell
                  className=" cursor-pointer"
                  onClick={() => handleSalesPriority(query?._id, index)}
                >
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
                <TableCell className="">
                  <Badge
                    className={` ${
                      query.priority === "High"
                        ? "bg-green-500"
                        : query.priority === "Medium"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  >
                    <p className="text-white">{query?.name}</p>
                  </Badge>
                  <Badge className=" ml-1">
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
                      desc={`Location - ${query?.location} / Area - ${query?.area}`}
                    />
                    <div>|</div>
                    <Badge className="  ">
                      <CustomTooltip
                        text={query?.zone?.charAt(0)}
                        desc={query?.zone}
                      />
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <p>{remainingDays(query?.reminder)}&nbsp; Days To Go</p>
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
                        <DropdownMenuItem
                          onClick={() => addBackToLeads(query?._id)}
                        >
                          Add Back To Leads
                        </DropdownMenuItem>
                        <Link
                          onClick={() => IsView(query?._id, index)}
                          target="_blank"
                          href={`/dashboard/createquery/${query?._id}`}
                        >
                          <DropdownMenuItem>Detailed View</DropdownMenuItem>
                        </Link>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className=" w-full h-[80vh] flex flex-col justify-center items-center">
          <img
            src="https://vacationsaga.b-cdn.net/assets/no-data-bg.png"
            alt="Temporary Image"
            className=" w-96 h-96 opacity-30"
          />
          <h3 className=" text-4xl font-semibold uppercase opacity-30">
            No Reminders
          </h3>
        </div>
      )}
    </div>
  );
}
