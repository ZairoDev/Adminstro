import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

  
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
} from "lucide-react";

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
          <div className="flex items-center gap-2 rounded-full px-3 py-1">
            <Icon size={16} className="text-gray-500" />
            <span className="text-sm font-medium truncate">{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {label}: {value}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-green-500  border-green-600";
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
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <Phone size={14} className="mr-1" />
          {query.phoneNo}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
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
          <InfoItem icon={MapPin} label="Location" value={query.location} />
          <InfoItem icon={Handshake} label="Term" value={query.bookingTerm} />
          <InfoItem icon={Grid2X2} label="Zone" value={query.zone} />
          <InfoItem
            icon={ChartNetwork}
            label="Bill Status"
            value={query.billStatus}
          />
          <InfoItem
            icon={Pilcrow}
            label="Type of Property"
            value={query.typeOfProperty}
          />
          <InfoItem
            icon={PilcrowRight}
            label="Property Type"
            value={query.propertyType}
          />
          <InfoItem icon={PilcrowRight} label="Date" value={query.date} />
          <InfoItem icon={AreaChart} label="Area" value={query.area} />
        </div>
      </CardContent>
    </Card>
  );
}
