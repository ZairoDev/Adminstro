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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { IQuery } from "@/util/type";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import Link from "next/link";

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

  return (
    <div className="">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead className="">Name</TableHead>
            <TableHead className="">Guests</TableHead>
            <TableHead className="">Budget</TableHead>
            <TableHead className="">Beds</TableHead>
            <TableHead className="">Location</TableHead>
            <TableHead className="">Term</TableHead>
            <TableHead className="">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries?.map((query, index) => (
            <TableRow key={query._id}>
              <TableCell>{query.name}</TableCell>
              <TableCell>{query.guest}</TableCell>
              <TableCell>€{query.budget}</TableCell>
              <TableCell>{query.noOfBeds} Beds</TableCell>
              <TableCell>{query.location}</TableCell>
              <TableCell>{query.bookingTerm}</TableCell>
              <TableCell>
                {/* <button onClick={() => openDialog(query)}>...</button> */}
                {/* <Button variant={'ghost'} >
                  <Ellipsis size={18}/>
                </Button> */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Ellipsis size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className=" cursor-pointer">
                      <span onClick={() => openDialog(query)}>Full View</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className=" cursor-pointer">
                      <span onClick={() => handleCreateRoom(index)}>
                        Create Room
                      </span>
                    </DropdownMenuItem>
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
                      {selectedQuery.name}
                    </CardTitle>

                    <Badge variant="outline" className="text-sm font-normal">
                      {selectedQuery.priority} Priority
                    </Badge>
                  </div>
                  <div className="flex items-center text-muted-foreground ">
                    <Link
                      href={`https://wa.me/${selectedQuery.phoneNo}?text=Hi%20${selectedQuery.name}%2C%20my%20name%20is%20Myself%2C%20and%20how%20are%20you%20doing%3F`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src="https://vacationsaga.b-cdn.net/assets/wsp.png"
                        alt="icon image"
                        className="h-10 w-10 mr-1 "
                      />
                    </Link>

                    {selectedQuery.phoneNo}
                  </div>
                </CardHeader>
                <CardContent className="pt-2 ">
                  <ScrollArea className="md:h-[400px] h-[300px] w-full border-none rounded-md border p-4">
                    <div className="flex flex-col gap-y-3">
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={MapPin}
                          label="Area"
                          value={selectedQuery.area}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Users}
                          label="Guests"
                          value={selectedQuery.guest}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={DollarSign}
                          label="Budget"
                          value={`€${selectedQuery.budget}`}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Bed}
                          label="Beds"
                          value={selectedQuery.noOfBeds}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Clock}
                          label="Term"
                          value={selectedQuery.bookingTerm}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={MapPin}
                          label="Location"
                          value={selectedQuery.location}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={ChartArea}
                          label="Zone"
                          value={selectedQuery.zone}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Receipt}
                          label="Bill Status"
                          value={selectedQuery.billStatus}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Home}
                          label="Property Type"
                          value={selectedQuery.typeOfProperty}
                        />
                      </div>
                      <div className="border px-3 py-2 rounded-lg">
                        <InfoItem
                          icon={Building}
                          label="Building Type"
                          value={selectedQuery.propertyType}
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
