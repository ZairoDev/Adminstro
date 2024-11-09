"use client";
import React, { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import LeadTable from "@/components/LeadTable";
import { SlidersHorizontal } from "lucide-react";
import { IQuery } from "@/util/type";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

interface ApiResponse {
  data: IQuery[];
  totalPages: number;
}
interface FetchQueryParams {
  searchTerm: string;
  searchType?: string;
  dateFilter: string;
  customDays: string;
  customDateRange: { start: string; end: string };
}

const SalesDashboard = () => {
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDays, setCustomDays] = useState("");
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 10),
  });
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
    const { value } = e.target;
    let durationValues = value.split("-").map(Number);
    if (formData.bookingTerm === "Short Term") {
      if (
        durationValues.length === 2 &&
        durationValues[0] >= 1 &&
        durationValues[0] <= 30 &&
        durationValues[1] <= 30
      ) {
        setFormData((prevData) => ({
          ...prevData,
          duration: value,
        }));
      } else if (
        durationValues.length === 1 &&
        durationValues[0] >= 1 &&
        durationValues[0] <= 30
      ) {
        setFormData((prevData) => ({
          ...prevData,
          duration: `${durationValues[0]}-${durationValues[0]}`,
        }));
      } else {
        setFormData((prevData) => ({
          ...prevData,
          duration: "",
        }));
      }
    } else if (formData.bookingTerm === "Mid Term") {
      if (
        durationValues.length === 2 &&
        durationValues[0] >= 1 &&
        durationValues[0] <= 3 &&
        durationValues[1] <= 3
      ) {
        setFormData((prevData) => ({
          ...prevData,
          duration: value,
        }));
      } else if (
        durationValues.length === 1 &&
        durationValues[0] >= 1 &&
        durationValues[0] <= 3
      ) {
        setFormData((prevData) => ({
          ...prevData,
          duration: `${durationValues[0]}-${durationValues[0]}`,
        }));
      } else {
        setFormData((prevData) => ({
          ...prevData,
          duration: "",
        }));
      }
    } else if (formData.bookingTerm === "Long Term") {
      if (durationValues.length === 2 && durationValues[0] >= 4) {
        setFormData((prevData) => ({
          ...prevData,
          duration: value,
        }));
      } else if (durationValues.length === 1 && durationValues[0] >= 4) {
        setFormData((prevData) => ({
          ...prevData,
          duration: `${durationValues[0]}-${durationValues[0]}`,
        }));
      } else {
        setFormData((prevData) => ({
          ...prevData,
          duration: "",
        }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // First check for empty fields
      const emptyFields: string[] = [];

      Object.entries(formData).forEach(([key, value]) => {
        if (
          value === "" ||
          value === null ||
          value === undefined ||
          value === 0
        ) {
          const fieldName = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
          emptyFields.push(fieldName);
        }
      });
      // If there are empty fields, show alert and return
      if (emptyFields.length > 0) {
        toast({
          description: `Please fill in the following required fields: ${emptyFields.join(
            ", "
          )}`,
        });
        return;
      }

      // If validation passes, proceed with form submission
      setSubmitQuery(true);
      const response = await fetch("/api/sales/createquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      const newQuery = result.data;
      setQueries((prevQueries) => [newQuery, ...prevQueries]);
      setIsDialogOpen(false);
      toast({
        description: "Query Created Successfully",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        description: "Some error occurred while creating query",
      });
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
  console.log(page, "Page will print here ");
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

  // console.log(date, "Selected Date will print here");

  return (
    <div>
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading
            heading="All Leads"
            subheading="You will get the list of leads that created till now"
          />
        </div>
        {/* Need to manage the code below this */}
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
          <div className="flex md:w-auto w-full justify-between  gap-x-2">
            <div className="w-full md:mb-0 mb-2">
              <Drawer>
                <DrawerTrigger className=" w-full md:w-auto">
                  <Button className="w-full">Create Query</Button>
                </DrawerTrigger>
                <DrawerContent className="">
                  <DrawerHeader>
                    <DrawerTitle className="text-2xl">
                      Details about lead
                    </DrawerTitle>
                    <DrawerDescription>
                      Fill all the details about lead after that tap on submit
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="">
                    <ScrollArea className="lg:h-full h-[400px]  w-full   border-y p-4">
                      <div className="grid p-2 lg:grid-cols-3 lg:mx-20  md:grid-cols-2 grid-cols-1 gap-x-2">
                        <div className="w-full">
                          <Label>Name</Label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter name"
                          />
                        </div>
                        <div className="flex w-full gap-x-2">
                          <div className="w-full">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={formData.startDate}
                              onChange={(e) =>
                                setFormData((prevData) => ({
                                  ...prevData,
                                  startDate: e.target.value,
                                }))
                              }
                              placeholder="Start Date"
                            />
                          </div>
                          <div className="w-full">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={formData.endDate}
                              onChange={(e) =>
                                setFormData((prevData) => ({
                                  ...prevData,
                                  endDate: e.target.value,
                                }))
                              }
                              placeholder="End Date"
                            />
                          </div>
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
                          <Label>Booking Term</Label>
                          <Select onValueChange={handleBookingTermChange}>
                            <SelectTrigger className="">
                              <SelectValue placeholder="Select Term" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Short Term">
                                Short Term
                              </SelectItem>
                              <SelectItem value="Mid Term">Mid Term</SelectItem>
                              <SelectItem value="Long Term">
                                Long Term
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Duration</Label>
                          <Input
                            name="duration"
                            value={formData.duration}
                            onChange={handleDurationChange}
                            placeholder={
                              formData.bookingTerm === "Short Term"
                                ? "Enter range in days (1-30) or single value"
                                : formData.bookingTerm === "Mid Term"
                                ? "Enter range in months (1-3) or single value"
                                : "Enter range (min 4-) or any value at the end"
                            }
                          />
                        </div>
                        <div>
                          <Label>Budget</Label>
                          <Input
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
                              <SelectItem value="With Bill">
                                With Bill
                              </SelectItem>
                              <SelectItem value="Without Bill">
                                Without Bill
                              </SelectItem>
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
                              <SelectItem value="Furnished">
                                Furnished
                              </SelectItem>
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
                  </div>
                  <DrawerFooter>
                    <div className="flex sm:items-end sm:justify-end sm:flex-row flex-col items-center justify-center gap-y-2 gap-x-2">
                      <Button
                        className="sm:w-auto w-full"
                        disabled={submitQuery}
                        onClick={handleSubmit}
                      >
                        Submit Query
                      </Button>
                      <DrawerClose>
                        <Button className="sm:w-auto w-full" variant="outline">
                          Cancel
                        </Button>
                      </DrawerClose>
                    </div>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
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
              <div>
                <p className="text-sm">
                  Page {page} of {totalPages}
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
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between p-2 w-full">
              <div>
                <p className="text-sm">
                  Page {page} of {totalPages}
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
