import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  return (
    <div className="">
      <Table className="max-w-7xl overflow-x-auto">
        <TableHeader className="">
          <TableRow className="">
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[200px]">Phone No</TableHead>
            <TableHead className="w-[200px]">Area</TableHead>
            <TableHead className="w-[200px]">Guest</TableHead>
            <TableHead className="w-[200px]">Duration</TableHead>
            <TableHead className="w-[200px]">Budget</TableHead>
            <TableHead className="w-[200px]">No of Beds</TableHead>
            <TableHead className="w-[200px]">Bill Status</TableHead>
            <TableHead className="w-[200px]">Type of Property</TableHead>
            <TableHead className="w-[200px]">Property Type</TableHead>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead className="w-[200px]">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="">
          {queries?.map((query: LeadProperty) => (
            <TableRow key={query._id}>
              <TableCell className="w-[200px]">{query.name}</TableCell>
              <TableCell className="w-[200px]">{query.phoneNo}</TableCell>
              <TableCell className="w-[200px]">{query.area}</TableCell>
              <TableCell className="w-[200px]">{query.guest}</TableCell>
              <TableCell className="w-[200px]">
                {query.duration} months
              </TableCell>
              <TableCell className="w-[200px]">€{query.budget}</TableCell>
              <TableCell className="w-[200px]">{query.noOfBeds}</TableCell>
              <TableCell className="w-[200px]">{query.billStatus}</TableCell>
              <TableCell className="w-[200px]">
                {query.typeOfProperty}
              </TableCell>
              <TableCell className="w-[200px]">{query.propertyType}</TableCell>
              <TableCell className="w-[200px]">{query.date}</TableCell>
              <TableCell className="w-[200px]">{query.priority}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
