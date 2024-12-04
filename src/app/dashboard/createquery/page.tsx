"use client";
import React, { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Heading from "@/components/Heading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import Loader from "@/components/loader";
import QueryCard from "@/components/QueryCard";
import LeadTable from "@/components/leadTable/LeadTable";
import { SlidersHorizontal } from "lucide-react";
import { IQuery } from "@/util/type";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DatePicker } from "@/components/DatePicker";
import { validateAndSetDuration } from "@/util/durationValidation";
import { useUserRole } from "@/context/UserRoleContext";

interface ApiResponse {
  data: IQuery[];
  totalPages: number;
  totalQueries: number;
}
interface FetchQueryParams {
  searchTerm: string;
  searchType?: string;
  dateFilter: string;
  customDays: string;
  customDateRange: { start: string; end: string };
}
const SalesDashboard = () => {
  const { userRole } = useUserRole();
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDays, setCustomDays] = useState("");
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 10),
  });
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("name");
  const [page, setPage] = useState<number>(1);
  const [view, setView] = useState("Table View");
  const { toast } = useToast();
  const [formData, setFormData] = useState<IQuery>({
    startDate: "",
    duration: "",
    endDate: "",
    name: "",
    email: "",
    phoneNo: 0,
    area: "",
    guest: 0,
    budget: 0,
    noOfBeds: 0,
    location: "",
    bookingTerm: "",
    zone: "",
    billStatus: "",
    typeOfProperty: "",
    propertyType: "",
    priority: "",
    roomDetails: {
      roomId: "",
      roomPassword: "",
    },
  });
  const limit: number = 12;
  const handleBookingTermChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      bookingTerm: value,
      duration: "",
    }));
  };
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetDuration(e.target.value, formData.bookingTerm, setFormData);
  };

  const handleSubmit = async () => {
    try {
      const emptyFields: string[] = [];
      const { budgetFrom, budgetTo, ...otherFields } = formData;
      const budget = `${budgetFrom} to ${budgetTo}`;
      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) {
          const fieldName = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
          emptyFields.push(fieldName);
        }
      });

      if (emptyFields.length > 0) {
        toast({
          description: `Please fill in the following required fields: ${emptyFields.join(
            ", "
          )}`,
        });
        return;
      }
      const formDataToSubmit = {
        ...otherFields,
        budget,
      };
      setSubmitQuery(true);
      const response = await fetch("/api/sales/createquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDataToSubmit),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to create query");
      }
      const newQuery = result.data;
      setQueries((prevQueries) => [newQuery, ...prevQueries]);
      toast({
        description: "Query Created Successfully",
      });

      setFormData({
        startDate: "",
        duration: "",
        endDate: "",
        name: "",
        email: "",
        phoneNo: 0,
        area: "",
        guest: 0,
        budget: 0,
        noOfBeds: 0,
        location: "",
        bookingTerm: "",
        zone: "",
        billStatus: "",
        typeOfProperty: "",
        propertyType: "",
        priority: "",
        roomDetails: {
          roomId: "",
          roomPassword: "",
        },
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        description: "Some error occurred while creating query",
      });
    } finally {
      setSubmitQuery(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const fetchQuery = useCallback(
    debounce(
      async ({
        searchTerm,
        searchType,
        dateFilter,
        customDays,
        customDateRange,
      }: FetchQueryParams) => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(
            `/api/sales/getquery?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}&dateFilter=${dateFilter}&customDays=${customDays}&startDate=${customDateRange.start}&endDate=${customDateRange.end}`
          );
          const data: ApiResponse = await response.json();
          if (response.ok) {
            setQueries(data.data);
            setTotalPages(data.totalPages);
            setTotalQueries(data.totalQueries);
          } else {
            throw new Error("Failed to fetch properties");
          }
        } catch (err: any) {
          setLoading(false);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      1000
    ),
    [searchType, page, limit]
  );

  const handleSearch = () => {
    fetchQuery({
      searchTerm,
      searchType,
      dateFilter,
      customDays,
      customDateRange,
    });
  };

  useEffect(() => {
    fetchQuery({
      searchTerm,
      searchType,
      dateFilter,
      customDays,
      customDateRange,
    });
  }, [searchTerm, searchType, page]);

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
  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
    }));
  }, [startDate, endDate]);

  return (
    <div>
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading
            heading="All Leads"
            subheading="You will get the list of leads that created till now"
          />
        </div>
        <div className="flex md:flex-row flex-col-reverse gap-x-2 w-full">
          <div className="flex w-full items-center gap-x-2">
            <div className="">
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
                  <SelectItem value="phoneNo">Phone No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog>
            <DialogTrigger>
              {userRole !== "Sales" && <Button>Create Lead</Button>}
            </DialogTrigger>
            <DialogContent className="p-4 w-[400px] md:min-w-[650px]">
              <DialogHeader>
                <DialogTitle>Create Lead</DialogTitle>
                <DialogDescription>
                  Please provide accurate and complete information.
                </DialogDescription>
              </DialogHeader>
              <div>
                <ScrollArea className="h-[400px] p-4">
                  <div className="">
                    <h3 className="text-lg font-semibold border-b pb-1 mt-4">
                      Personal Details
                    </h3>
                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      {/* Section one 1 */}
                      <div className="ml-1">
                        <Label>Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div className="ml-1">
                        <Label>Phone No</Label>
                        <Input
                          type="number"
                          name="phoneNo"
                          value={formData.phoneNo}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="ml-1">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="Enter location"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Section 2: Booking Details */}
                  <div className="">
                    <h3 className="text-lg font-semibold border-b mb-1 mt-4">
                      Booking Details
                    </h3>
                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      <div>
                        <Label>Start Date</Label>
                        <DatePicker date={startDate} setDate={setStartDate} />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <DatePicker date={endDate} setDate={setEndDate} />
                      </div>
                      <div className="ml-1">
                        <Label>Booking Term</Label>
                        <Select onValueChange={handleBookingTermChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Short Term">
                              Short Term
                            </SelectItem>
                            <SelectItem value="Mid Term">Mid Term</SelectItem>
                            <SelectItem value="Long Term">Long Term</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Input
                          name="duration"
                          value={formData.duration}
                          onChange={handleDurationChange}
                          placeholder="Enter duration based on term"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Section 3: Budget Details */}
                  <div className="mt-2 ml-1">
                    <h3 className="text-lg font-semibold border-b  mt-4 mb-1">
                      Budget Details
                    </h3>
                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      <div>
                        <Label>Budget (From)</Label>
                        <Input
                          name="budgetFrom"
                          value={formData.budgetFrom || ""}
                          onChange={handleInputChange}
                          placeholder="Enter minimum budget"
                        />
                      </div>
                      <div>
                        <Label>Budget (To)</Label>
                        <Input
                          name="budgetTo"
                          value={formData.budgetTo || ""}
                          onChange={handleInputChange}
                          placeholder="Enter maximum budget"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Section three */}
                  <div className="ml-1">
                    <h3 className="text-lg font-semibold border-b  mb-1 mt-4">
                      Guest Details
                    </h3>
                    <div className="grid  md:grid-cols-2 grid-cols1 gap-x-4 gap-y-4">
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
                        <Label>No Of Beds</Label>
                        <Input
                          type="number"
                          name="noOfBeds"
                          value={formData.noOfBeds}
                          onChange={handleInputChange}
                          placeholder="Enter name"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Section fourn  */}
                  <div>
                    <h3 className="text-lg font-semibold border-b  mb-1 mt-4">
                      Recomdation
                    </h3>
                    <div className="grid  md:grid-cols-2 grid-cols1 gap-x-4 gap-y-4">
                      <div className="ml-1">
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
                            <SelectItem value="Without Bill">
                              Without Bill
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
                  </div>
                  <div className="">
                    <h3 className="text-lg font-semibold border-b pb-1 pt-4">
                      Property Details
                    </h3>
                    <div className="grid  md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      <div className="ml-1">
                        <Label>Type of Property</Label>
                        <Select
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              typeOfProperty: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Studio">Studio</SelectItem>
                            <SelectItem value="Apartment">Apartment</SelectItem>
                            <SelectItem value="Villa">Villa</SelectItem>
                            <SelectItem value="Pent House">
                              Pent House
                            </SelectItem>
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
                        <Label>Lead Quality</Label>
                        <Select
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              leadQualityByCreator: value,
                            }))
                          }
                        >
                          <SelectTrigger className="">
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Very Good">Very Good</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Below Average">
                              Below Average
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="ml-1">
                        <Label>Property Type</Label>
                        <Select
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              propertyType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
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
                        <Label>Zone</Label>
                        <Select
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              zone: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="North">North</SelectItem>
                            <SelectItem value="South">South</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="w-full mt-2 ml-1 mb-2">
                      <Label>Area</Label>
                      <Input
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        placeholder="Enter name"
                      />
                    </div>
                  </div>
                </ScrollArea>
                <div>
                  <DialogFooter>
                    <Button
                      className="mt-4"
                      disabled={submitQuery}
                      onClick={handleSubmit}
                    >
                      Submit Query
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex md:w-auto w-full justify-between  gap-x-2">
            <div className="">
              <Sheet>
                <SheetTrigger>
                  <Button variant="outline">
                    <SlidersHorizontal size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle className="text-start">Data Filters</SheetTitle>
                    <SheetDescription className="flex flex-col gap-y-2">
                      <Select
                        onValueChange={(value) => setDateFilter(value)}
                        value={dateFilter}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Date Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="lastDays">Last X Days</SelectItem>
                          <SelectItem value="customRange">
                            Custom Date Range
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {dateFilter === "lastDays" && (
                        <Input
                          placeholder="Enter number of days"
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                        />
                      )}
                      {dateFilter === "customRange" && (
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Start Date"
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) =>
                              setCustomDateRange({
                                ...customDateRange,
                                start: e.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="End Date"
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) =>
                              setCustomDateRange({
                                ...customDateRange,
                                end: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      <SheetClose asChild>
                        <Button
                          className="sm:w-auto w-full"
                          onClick={handleSearch}
                        >
                          Apply
                        </Button>
                      </SheetClose>
                    </SheetDescription>
                  </SheetHeader>
                  <SheetFooter className="absolute text-pretty bottom-0 px-4 py-2 text-xs left-0 right-0">
                    <div className="flex flex-col gap-y-2">
                      <Select onValueChange={(value) => setView(value)}>
                        <SelectTrigger className="">
                          <SelectValue placeholder="Select View" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Table View">Table View</SelectItem>
                          <SelectItem value="Card View">Card View</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="px-2">
                        Fill in your search details, apply custom filters, and
                        let us bring you the most relevant results with just a
                        click of the Apply button !
                      </p>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      {/* Need to manaeg the code above this  */}
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <Loader />
        </div>
      ) : view === "Table View" ? (
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              <LeadTable queries={queries} />
            </div>
            <div className="flex items-center justify-between p-2 w-full">
              <div className="">
                <p className="text-xs ">
                  Page {page} of {totalPages} — {totalQuery} total results
                </p>
              </div>
              <div>
                <Pagination className="flex items-center">
                  <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="min-h-screen">
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
              {queries.map((query) => (
                <div key={query._id}>
                  <QueryCard
                    name={query.name}
                    leadQualityByReviwer={query.leadQualityByReviwer}
                    email={query.email}
                    duration={query.duration}
                    startDate={query.startDate}
                    endDate={query.endDate}
                    phoneNo={query.phoneNo}
                    area={query.area}
                    guest={query.guest}
                    budget={query.budget}
                    noOfBeds={query.noOfBeds}
                    location={query.location}
                    bookingTerm={query.bookingTerm}
                    zone={query.zone}
                    billStatus={query.billStatus}
                    typeOfProperty={query.typeOfProperty}
                    propertyType={query.propertyType}
                    priority={query.priority}
                    roomDetails={query.roomDetails}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between p-2 w-full">
              <div>
                <p className="text-xs">
                  Page {page} of {totalPages} — {totalQuery} total results
                </p>
              </div>
              <div>
                <Pagination className="flex items-center">
                  <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs flex items-end justify-end"></div>
    </div>
  );
};
export default SalesDashboard;
