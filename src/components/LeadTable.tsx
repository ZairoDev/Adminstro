import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface LeadProperty {
  _id?: string;
  name: string;
  phoneNo: number;
  area: string;
  guest: number;
  duration: number;
  budget: number;
  noOfBeds: number;
  location: string;
  bookingTerm: string;
  zone: string;
  billStatus: string;
  typeOfProperty: string;
  propertyType: string;
  date: string;
  priority: string;
}

export default function LeadTable({ queries }: { queries: LeadProperty[] }) {
  const [selectedQuery, setSelectedQuery] = useState<LeadProperty | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = (query: LeadProperty) => {
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

  return (
    <div className="">
      <Table className="">
        <TableHeader>
          <TableRow>
            <TableHead className="">Name</TableHead>
            <TableHead className="">Guests</TableHead>
            <TableHead className="">Duration</TableHead>
            <TableHead className="">Budget</TableHead>
            <TableHead className="">No of Beds</TableHead>
            <TableHead className="">Location</TableHead>
            <TableHead className="">Booking Term</TableHead>
            <TableHead className="">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries?.map((query) => (
            <TableRow key={query._id}>
              <TableCell>{query.name}</TableCell>
              <TableCell>{query.guest}</TableCell>
              <TableCell>{query.duration} months</TableCell>
              <TableCell>€{query.budget}</TableCell>
              <TableCell>{query.noOfBeds} Beds</TableCell>
              <TableCell>{query.location}</TableCell>
              <TableCell>{query.bookingTerm}</TableCell>
              <TableCell>
                <button onClick={() => openDialog(query)}>...</button>
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
                      {selectedQuery.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-sm font-normal">
                      {selectedQuery.priority} Priority
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
                      icon={Calendar}
                      label="Duration"
                      value={`${selectedQuery.duration} months`}
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
                      label="Date"
                      value={selectedQuery.date}
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
