import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CircleAlert,
  Blend,
  CalendarIcon,
  FileDigitIcon,
  MapPin,
  Handshake,
  Grid2X2,
  ChartNetwork,
  Pilcrow,
  PilcrowRight,
  Phone,
  AreaChart,
  Users,
  Calendar,
  DollarSign,
  Bed,
  Clock,
  ChartArea,
  Receipt,
  Home,
  Building,
  DatabaseZapIcon,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface QueryCardProps {
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

export default function QueryCard(query: QueryCardProps) {
  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value: string | number;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex  gap-2 items-center rounded-full px-3 py-1">
            <Icon size={18} className="text-muted-foreground" />
            <p className="text-base font-medium line-clamp-1">
              <span className="mr-2 text-base text-muted-foreground ">
                {label}:
              </span>
              {value}
            </p>
          </div>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-green-500 border-green-600";
      case "Medium":
        return "text-yellow-600 border-yellow-600";
      case "Low":
        return "text-red-600 border-red-600";
      default:
        return "text-gray-600 border-gray-600";
    }
  };

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2 border-b">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold truncate">
            {query.name}
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-sm ${getPriorityColor(query.priority)}`}
          >
            {query.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid sm:grid-cols-2  gap-2">
          <InfoItem
            icon={CircleAlert}
            label="No of Guest"
            value={query.guest}
          />
          <InfoItem
            icon={Blend}
            label="Duration"
            value={`${query.duration} months`}
          />
          <InfoItem
            icon={CalendarIcon}
            label="Budget"
            value={`€${query.budget}`}
          />
          <InfoItem
            icon={FileDigitIcon}
            label="No of beds"
            value={query.noOfBeds}
          />
        </div>

        {/* Full View Button triggers dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="link"
              className="text-sm font-medium text-blue-500"
            >
              Full View
            </Button>
          </DialogTrigger>
          <DialogContent className=" ">
            <DialogHeader>
              <DialogTitle className="lg:text-2xl text-muted-foreground md:text-xl text-lg">
                Full Details about User
              </DialogTitle>
            </DialogHeader>

            <Card className="">
              <CardHeader className=" border-b pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-semibold truncate">
                    {query.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-sm font-normal">
                    {query.priority} Priority
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Phone size={14} className="mr-1" />
                  {query.phoneNo}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="">
                  <InfoItem icon={MapPin} label="Area" value={query.area} />
                  <InfoItem icon={Users} label="Guests" value={query.guest} />
                  <InfoItem
                    icon={Calendar}
                    label="Duration"
                    value={`${query.duration} months`}
                  />
                  <InfoItem
                    icon={DollarSign}
                    label="Budget"
                    value={`€${query.budget}`}
                  />
                  <InfoItem icon={Bed} label="Beds" value={query.noOfBeds} />
                  <InfoItem
                    icon={Clock}
                    label="Term"
                    value={query.bookingTerm}
                  />
                </div>

                <div className="">
                  <InfoItem
                    icon={MapPin}
                    label="Location"
                    value={query.location}
                  />
                  <InfoItem icon={ChartArea} label="Zone" value={query.zone} />
                  <InfoItem
                    icon={Receipt}
                    label="Bill Status"
                    value={query.billStatus}
                  />
                  <InfoItem
                    icon={Home}
                    label="Property Type"
                    value={query.typeOfProperty}
                  />
                  <InfoItem
                    icon={Building}
                    label="Building Type"
                    value={query.propertyType}
                  />
                  <InfoItem
                    icon={DatabaseZapIcon}
                    label="Date"
                    value={query.date}
                  />
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
