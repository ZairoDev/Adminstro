import { useState } from "react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Phone,
  MapPin,
  Users,
  DollarSign,
  Bed,
  Clock,
  Receipt,
  Home,
  Building,
  Calendar as DateIcon,
  ChartArea,
  Ellipsis,
  User,
  BedSingle,
  Euro,
  ReceiptText,
  Check,
  BookX,
  Star,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

import { IQuery } from "@/util/type";
import { Button } from "../ui/button";

import Link from "next/link";
import { Badge } from "../ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function LeadTable({ queries }: { queries: IQuery[] }) {
  const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
  }) => (
    <div className="flex gap-2 ">
      <Icon size={18} className="text-muted-foreground" />
      <p className="text-base">
        <span className="text-base text-muted-foreground mr-2">{label}:</span>
        {value}
      </p>
    </div>
  );
  const startDate =
    selectedQuery?.startDate && !isNaN(Date.parse(selectedQuery?.startDate))
      ? new Date(selectedQuery?.startDate)
      : null;
  const endDate =
    selectedQuery?.endDate && !isNaN(Date.parse(selectedQuery.endDate))
      ? new Date(selectedQuery.endDate)
      : null;
  const formattedStartDate = startDate
    ? format(startDate, "dd-MM-yyyy")
    : "Invalid Date";
  const formattedEndDate = endDate
    ? format(endDate, "dd-MM-yyyy")
    : "Invalid Date";

  const handleCreateRoom = async (index: number) => {
    try {
      const response = await axios.post("/api/room/createRoom", {
        lead: queries[index],
      });
      console.log("response: ", response.data);
    } catch (err: unknown) {
      console.log("err: ", err);
    }
  };

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

  console.log(queries, "Data will print here");

  return (
    <div className="">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Lead Quality</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries?.map((query, index) => (
            <TableRow key={query?._id}>
              <TableCell className="flex gap-x-1">
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
                    content={query?.budget}
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
                    text={`${query?.location?.slice(0, 8)}...`}
                    desc={`Location - ${query?.location}`}
                  />
                  <div>|</div>
                  {/* <CustomTooltip text={query?.area} desc={"Customer area"} /> */}
                  <CustomTooltip
                    text={`${query?.area?.slice(0, 8)}...`}
                    desc={`Area - ${query?.area}`}
                  />
                  <div>|</div>
                  <Badge className=" bg-white">
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
                      onClick={() =>
                        handleQualityChange("Good", query?._id, index)
                      }
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
                      onClick={() =>
                        handleQualityChange("Average", query?._id, index)
                      }
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
              <TableCell>
                <Link
                  className=""
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
                </Link>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                      <Ellipsis size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>Create Room</DropdownMenuItem>
                      <DropdownMenuItem>Join Room</DropdownMenuItem>
                      <Link href={`/dashboard/createquery/${query?._id}`}>
                        <DropdownMenuItem>Detailed View</DropdownMenuItem>
                      </Link>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          Reject Lead
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem>Achi nhi lgi</DropdownMenuItem>
                            <DropdownMenuItem>Mja nhi aya</DropdownMenuItem>
                            <DropdownMenuItem>
                              Bilkul Bakwas thi
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Customer bekar tha
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Dialog for Full Details */}
      {selectedQuery && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="p-4">
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl p-0 font-normal">
                Lead Details
              </DialogTitle>
            </DialogHeader>
            <DialogDescription>
              <Card className="">
                <CardHeader className="border-b ">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-semibold truncate">
                      {selectedQuery?.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-sm font-normal">
                      {selectedQuery?.priority} Priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 ">
                  <ScrollArea className="md:h-[400px] h-[300px] w-full border-none rounded-md border p-4">
                    <div className="flex flex-col gap-y-3">
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={MapPin}
                          label="Area"
                          value={selectedQuery?.area}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Users}
                          label="Guests"
                          value={selectedQuery?.guest}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={DollarSign}
                          label="Budget"
                          value={`€${selectedQuery?.budget}`}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Bed}
                          label="Beds"
                          value={selectedQuery?.noOfBeds}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Clock}
                          label="Term"
                          value={selectedQuery?.bookingTerm}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={MapPin}
                          label="Location"
                          value={selectedQuery?.location}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={ChartArea}
                          label="Zone"
                          value={selectedQuery?.zone}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Receipt}
                          label="Bill Status"
                          value={selectedQuery?.billStatus}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Home}
                          label="Property Type"
                          value={selectedQuery?.typeOfProperty}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Building}
                          label="Building Type"
                          value={selectedQuery?.propertyType}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={DateIcon}
                          label="Start Date"
                          value={formattedStartDate}
                        />
                      </div>{" "}
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={DateIcon}
                          label="End Date"
                          value={formattedEndDate}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
