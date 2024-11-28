import { useState } from "react";
import { format } from "date-fns";
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone,
  User,
  MapPin,
  Users,
  Calendar,
  DollarSign,
  Bed,
  Clock,
  Receipt,
  Home,
  Building,
  Calendar as DateIcon,
  Flag,
  ChartArea,
  Ellipsis,
  User,
  BedSingle,
  Euro,
  ReceiptText,
  Check,
  BookX,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

import { IQuery } from "@/util/type";
import { Button } from "../ui/button";

import axios from "axios";
import Link from "next/link";
import { Badge } from "../ui/badge";
import CustomTooltip from "../CustomToolTip";
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";

export default function LeadTable({ queries }: { queries: IQuery[] }) {
  const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = (query: IQuery) => {
    setSelectedQuery(query);
    setIsDialogOpen(true);
  };

  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
  }) => (
    <div className="flex gap-2 items-center">
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

  return (
    <div className="">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead className="">Name</TableHead>
            <TableHead className="">Guests</TableHead>
            <TableHead className="">Budget</TableHead>
            <TableHead className="">No of Beds</TableHead>
            <TableHead className="">Location</TableHead>
            <TableHead className="">Booking Term</TableHead>
            <TableHead className="">Actions</TableHead>
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
                    desc={`Location - ${query?.area}`}
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
                    <Button variant="ghost">Quality</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuLabel>Lead Quality</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className=" cursor-pointer">
                      Good
                    </DropdownMenuItem>
                    <DropdownMenuItem className=" cursor-pointer">
                      Bad
                    </DropdownMenuItem>
                    <DropdownMenuItem className=" cursor-pointer">
                      Average
                    </DropdownMenuItem>
                    <DropdownMenuItem>Below Average</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="lg:text-2xl text-muted-foreground md:text-xl text-xl">
                Full details about the user
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
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Phone size={14} className="mr-1" />
                    {selectedQuery.phoneNo}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="">
                    <InfoItem
                      icon={MapPin}
                      label="Area"
                      value={selectedQuery.area}
                    />
                    <InfoItem
                      icon={Users}
                      label="Guests"
                      value={selectedQuery.guest}
                    />
                    <InfoItem
                      icon={DollarSign}
                      label="Budget"
                      value={`€${selectedQuery.budget}`}
                    />
                    <InfoItem
                      icon={Bed}
                      label="Beds"
                      value={selectedQuery.noOfBeds}
                    />
                    <InfoItem
                      icon={Clock}
                      label="Term"
                      value={selectedQuery.bookingTerm}
                    />
                  </div>
                  <div className="">
                    <InfoItem
                      icon={MapPin}
                      label="Location"
                      value={selectedQuery.location}
                    />
                    <InfoItem
                      icon={ChartArea}
                      label="Zone"
                      value={selectedQuery.zone}
                    />
                    <InfoItem
                      icon={Receipt}
                      label="Bill Status"
                      value={selectedQuery.billStatus}
                    />
                    <InfoItem
                      icon={Home}
                      label="Property Type"
                      value={selectedQuery.typeOfProperty}
                    />
                    <InfoItem
                      icon={Building}
                      label="Building Type"
                      value={selectedQuery.propertyType}
                    />
                    <InfoItem
                      icon={DateIcon}
                      label="Start Date"
                      value={formattedStartDate}
                    />
                    <InfoItem
                      icon={DateIcon}
                      label="End Date"
                      value={formattedEndDate}
                    />
                  </div>
                </CardContent>
              </Card>
            </DialogDescription>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
