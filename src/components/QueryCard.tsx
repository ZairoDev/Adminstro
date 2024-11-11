import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CircleAlert,
  CalendarIcon,
  FileDigitIcon,
  MapPin,
  Phone,
  Users,
  DollarSign,
  Bed,
  Clock,
  ChartArea,
  Receipt,
  Home,
  Building,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IQuery } from "@/util/type";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";

export default function QueryCard(query: IQuery) {
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
          <div className="flex  gap-2 ">
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

  const startDate =
    query.startDate && !isNaN(Date.parse(query.startDate))
      ? new Date(query.startDate)
      : null;

  const endDate =
    query.endDate && !isNaN(Date.parse(query.endDate))
      ? new Date(query.endDate)
      : null;

  const formattedStartDate = startDate
    ? format(startDate, "dd-MM-yyyy")
    : "Invalid Date";
  const formattedEndDate = endDate
    ? format(endDate, "dd-MM-yyyy")
    : "Invalid Date";

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
          <DialogContent className="p-4 ">
            <DialogHeader>
              <DialogTitle className="text-xl p-0 font-normal">
                Lead Details
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
                <div className="flex  items-center text-sm text-muted-foreground mt-1">
                  <Link
                    href={`https://wa.me/${query.phoneNo}?text=Hi%20${query.name}%2C%20my%20name%20is%20Myself%2C%20and%20how%20are%20you%20doing%3F`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="https://vacationsaga.b-cdn.net/assets/wsp.png"
                      alt="icon image"
                      className="h-10 w-10 mr-1"
                    />
                  </Link>
                  {query.phoneNo}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ScrollArea className="md:h-[400px] h-[300px] w-full border-none rounded-md border p-4">
                  <div className="flex flex-col gap-y-3">
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem icon={MapPin} label="Area" value={query.area} />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Users}
                        label="Guests"
                        value={query.guest}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={DollarSign}
                        label="Budget"
                        value={`€${query.budget}`}
                      />
                    </div>{" "}
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Bed}
                        label="Beds"
                        value={query.noOfBeds}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Clock}
                        label="Term"
                        value={query.bookingTerm}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={MapPin}
                        label="Location"
                        value={query.location}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={ChartArea}
                        label="Zone"
                        value={query.zone}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Receipt}
                        label="Bill Status"
                        value={query.billStatus}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Home}
                        label="Property Type"
                        value={query.typeOfProperty}
                      />
                    </div>{" "}
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={Building}
                        label="Building Type"
                        value={query.propertyType}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={CalendarIcon}
                        label="Start Date"
                        value={formattedStartDate}
                      />
                    </div>
                    <div className="border px-3 py-2 rounded-lg">
                      <InfoItem
                        icon={CalendarIcon}
                        label="End Date"
                        value={formattedEndDate}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
