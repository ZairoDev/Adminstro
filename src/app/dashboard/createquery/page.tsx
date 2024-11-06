"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Heading from "@/components/Heading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge,
  Blend,
  CalendarIcon,
  ChartArea,
  ChartNetwork,
  CircleAlert,
  ClockIcon,
  Expand,
  FileDigitIcon,
  FolderPen,
  Grid2X2,
  Handshake,
  Mail,
  MapPin,
  MessageSquareHeart,
  Pilcrow,
  PilcrowRight,
  Plus,
  SearchX,
  TagIcon,
  UserIcon,
  X,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { CiMoneyBill } from "react-icons/ci";
import Loader from "@/components/loader";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import QueryCard from "@/components/QueryCard";
import LeadTable from "@/components/LeadTable";

interface ApiResponse {
  data: IQuery[];
  totalPages: number;
}

interface IQuery {
  _id?: string;
  date: string;
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
  priority: string;
}

const SalesDashboard = () => {
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [formData, setFormData] = useState<IQuery>({
    date: "",
    name: "",
    phoneNo: 0,
    area: "",
    guest: 0,
    duration: 0,
    budget: 0,
    noOfBeds: 0,
    location: "",
    bookingTerm: "",
    zone: "",
    billStatus: "",
    typeOfProperty: "",
    propertyType: "",
    priority: "",
  });

  const limit: number = 12;

  const handleSubmit = async () => {
    try {
      setSubmitQuery(true);
      const response = await fetch("/api/sales/createquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        const newQuery = result.data;
        setQueries((prevQueries) => [newQuery, ...prevQueries]);
        setIsDialogOpen(false);
        setFormData({
          date: "",
          name: "",
          phoneNo: 0,
          area: "",
          guest: 0,
          duration: 0,
          budget: 0,
          noOfBeds: 0,
          location: "",
          bookingTerm: "",
          zone: "",
          billStatus: "",
          typeOfProperty: "",
          propertyType: "",
          priority: "",
        });
      } else {
        console.error("Failed to create query");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSubmitQuery(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };
  const fetchQuery = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sales/getquery?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        if (response.ok) {
          setQueries(data.data);
          setTotalPages(data.totalPages);
        } else {
          throw new Error("Failed to fetch properties");
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    [page, searchType, limit]
  );

  useEffect(() => {
    fetchQuery(searchTerm);
  }, [fetchQuery, searchTerm]);

  console.log(queries, "Queries will print here");

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const renderPaginationItems = () => {
    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    return items;
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "j") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div>
      <h1>Sales Dashboard</h1>
      <Heading
        heading="All Leads"
        subheading="You will get the list of leads that created till now"
      />
      <div className="flex lg:mt-0 items-center gap-x-2">
        <div className="sm:max-w-[180px] max-w-[100px] w-full">
          <Select
            onValueChange={(value: string) => setSearchType(value)}
            value={searchType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            ref={searchInputRef}
            className="max-w-xl"
          />
        </div>

        <div>
          <Button
            className="xs:block hidden"
            onClick={() => setIsDialogOpen(true)}
          >
            Create Query
          </Button>
          <Button className="xs:hidden" onClick={() => setIsDialogOpen(true)}>
            <Plus />
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
          </DialogHeader>
          <ScrollArea className="md:h-full h-[400px]  w-full rounded-md border p-4">
            <div className="grid p-2 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-x-2">
              <div className="w-full">
                <Label>Name</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Phone No</Label>
                <Input
                  type="number"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Area</Label>
                <Input
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Guest</Label>
                <Input
                  type="number"
                  name="guest"
                  value={formData.guest}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Duration</Label>
                <Input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>No Of Beds</Label>
                <Input
                  type="number"
                  name="noOfBeds"
                  value={formData.noOfBeds}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Booking Term</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      bookingTerm: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short Term">Short Term</SelectItem>
                    <SelectItem value="Long Term">Long Term</SelectItem>
                    <SelectItem value="Mid Term">Mid Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zone</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      zone: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Centre">Centre</SelectItem>
                    <SelectItem value="Anywhere">Anywhere</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bill Status</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      billStatus: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="With Bill">With Bill</SelectItem>
                    <SelectItem value="Without Bill">Without Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type of Property</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      typeOfProperty: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Aprtment">Aprtment</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Pent House">Pent House</SelectItem>
                    <SelectItem value="Detached House">
                      Detached House
                    </SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                    <SelectItem value="Shared Apartment">
                      Shared Apartment
                    </SelectItem>
                    <SelectItem value="Maisotte">Maisotte</SelectItem>
                    <SelectItem value="Studio / 1 bedroom">
                      Studio / 1 bedroom
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Property Type</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      propertyType: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Property Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Furnished">Furnished</SelectItem>
                    <SelectItem value="Un - furnished">
                      Un - furnished
                    </SelectItem>
                    <SelectItem value="Semi-furnished">
                      Semi-furnished
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prevData) => ({
                      ...prevData,
                      priority: value,
                    }))
                  }
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button disabled={submitQuery} onClick={handleSubmit}>
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex mt-2 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <LeadTable queries={queries} />
      )}

      {loading ? (
        <div className="flex mt-2 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
          {queries.map((query) => (
            <div key={query._id}>
              <QueryCard
                name={query.name}
                phoneNo={query.phoneNo}
                area={query.area}
                guest={query.guest}
                duration={query.duration}
                budget={query.budget}
                noOfBeds={query.noOfBeds}
                location={query.location}
                bookingTerm={query.bookingTerm}
                zone={query.zone}
                billStatus={query.billStatus}
                typeOfProperty={query.typeOfProperty}
                propertyType={query.propertyType}
                date={query.date}
                priority={query.priority}
              />
            </div>
          ))}
        </div>
      )}
      {queries.length > 12 && (
        <div className="text-xs w-full">
          <Pagination className="flex flex-wrap items-center w-full">
            <PaginationContent className="text-xs flex flex-wrap justify-center w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
export default SalesDashboard;
