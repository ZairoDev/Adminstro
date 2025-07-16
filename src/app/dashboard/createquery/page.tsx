"use client";

import axios from "axios";
import Pusher from "pusher-js";
import { format } from "date-fns";
import debounce from "lodash.debounce";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "react-phone-number-input";
import { CheckCheckIcon, SlidersHorizontal } from "lucide-react";
import React, { Suspense, useCallback, useEffect, useState } from "react";

import { IQuery } from "@/util/type";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { useAuthStore } from "@/AuthStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import QueryCard from "@/components/QueryCard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { DatePicker } from "@/components/DatePicker";
import LeadTable from "@/components/leadTable/LeadTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateAndSetDuration } from "@/util/durationValidation";
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
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [phone, setPhone] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDays, setCustomDays] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [allotedArea, setAllotedArea] = useState("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("name");
  const [page, setPage] = useState<number>(1);
  const [view, setView] = useState("Table View");
  const [normalInput, setNormalInput] = useState(false);
  const [numberStatus, setNumberStatus] = useState("");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [formData, setFormData] = useState<IQuery>({
    startDate: "",
    duration: "",
    endDate: "",
    name: "",
    email: "-",
    phoneNo: 0,
    area: "",
    guest: 0,
    minBudget: 0,
    maxBudget: 0,
    noOfBeds: 0,
    location: "",
    bookingTerm: "",
    zone: "",
    billStatus: "",
    typeOfProperty: "",
    propertyType: "",
    priority: "",
    salesPriority: "None",
    reminder: new Date(),
    roomDetails: {
      roomId: "",
      roomPassword: "",
    },
  });
  const limit: number = 12;

  const {
    register,
    formState: { errors },
  } = useForm();

  const handleBookingTermChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      bookingTerm: value,
      duration: "",
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNormalInput(e.target.checked);
  };

  const [checking, setChecking] = useState(false);

  const handleNumberSearch = async () => {
    try {
      if (!phone) {
        setNumberStatus("Please enter a phone number.");
        return;
      }
      setChecking(true);
      const response = await axios.post("/api/sales/checkNumber", {
        phoneNo: phone,
      });
      if (response.data.success) {
        if (response.data.exists) {
          setNumberStatus("❌ Phone number already exists.");
        } else {
          setNumberStatus("✅ Phone number is available.");
        }
        setChecking(false);
      } else {
        setNumberStatus("Error checking the phone number. Try again.");
      }
      setChecking(false);
    } catch (error) {
      console.error("Error:", error);
      setNumberStatus("Server error. Please try again later.");
      setChecking(false);
    }
  };

  // Handle input changes
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!normalInput) {
      setFormData((prev) => ({ ...prev, duration: e.target.value }));
    } else {
      validateAndSetDuration(e.target.value, formData.bookingTerm, setFormData);
    }
  };

  const handleSubmit = async () => {
    try {
      const emptyFields: string[] = [];
      // const { minBudget, maxBudget, ...otherFields } = formData;

      // const budget = `${budgetFrom} to ${budgetTo}`;
      // formData.budget = budget;
      // Object.entries(formData).forEach(([key, value]) => {
      //   if (value === "" || value === null || value === undefined) {
      //     const fieldName = key
      //       .replace(/([A-Z])/g, " $1")
      //       .replace(/^./, (str) => str.toUpperCase())
      //       .trim();
      //     emptyFields.push(fieldName);
      //   }
      // });

      if (emptyFields.length > 0) {
        toast({
          description: `Please fill in the following required fields: ${emptyFields.join(
            ", "
          )}`,
        });
        return;
      }
      const formDataToSubmit = {
        ...formData,
        // budget,
        phoneNo: phone,
      };
      // console.log("form to submit: ", formDataToSubmit);
      setSubmitQuery(true);

      const response = await axios.post(
        "/api/sales/createquery",
        formDataToSubmit
      );
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
        minBudget: 0,
        maxBudget: 0,
        noOfBeds: 0,
        location: "",
        bookingTerm: "",
        zone: "",
        billStatus: "",
        typeOfProperty: "",
        propertyType: "",
        priority: "",
        salesPriority: "",
        reminder: new Date(),
        roomDetails: {
          roomId: "",
          roomPassword: "",
        },
      });
    } catch (error: any) {
      console.error("Error:", error.response.data.error);
      toast({
        variant: "destructive",
        description: `${error.response.data.error}`,
      });
    } finally {
      setSubmitQuery(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      let newVal = value.trim();
      if (name === "location" || name === "area") {
        newVal = newVal.toLowerCase();
      }
      return { ...prevData, [name]: newVal };
    });
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
      // startDate: startDate.toLocaleDateString(),
      // endDate: endDate.toLocaleDateString(),
      startDate: format(startDate, "MM/dd/yyyy"),
      endDate: format(endDate, "MM/dd/yyyy"),
    }));
  }, [startDate, endDate]);

  useEffect(() => {
    const getAllotedArea = async () => {
      try {
        const response = await axios.get("/api/getAreaFromToken");
        setAllotedArea(response.data.area);
      } catch (err: any) {
        console.log("error in getting area: ", err);
      }
    };
    getAllotedArea();
  }, []);

  useEffect(() => {
    const pusher = new Pusher("1725fd164206c8aa520b", {
      cluster: "ap2",
    });
    const channel = pusher.subscribe("queries");
    // channel.bind("new-query", (data: any) => {
    //   setQueries((prevQueries) => [data, ...prevQueries]);
    // });
    channel.bind(`new-query-${allotedArea}`, (data: any) => {
      setQueries((prevQueries) => [data, ...prevQueries]);
    });
    toast({
      title: "Query Created Successfully",
    });
    return () => {
      channel.unbind(`new-query-${allotedArea}`);
      pusher.unsubscribe("queries");
      pusher.disconnect();
    };
  }, [queries, allotedArea]);

  return (
    <div>
      <Toaster />
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
            <DialogTrigger asChild>
              {token?.role !== "Sales" && <Button>Create Lead</Button>}
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
                  {/* Section 1 : Personal Details */}
                  <div className="">
                    <h3 className="text-lg font-semibold border-b pb-1 mt-4 ">
                      Personal Details
                    </h3>

                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      {/* Name */}
                      <div className="ml-1">
                        <Label>Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="flex justify-between ">
                        <div className="w-full">
                          <Label htmlFor="phone">Phone Number</Label>
                          <PhoneInput
                            {...register("phone")}
                            className="phone-input border-red-500"
                            placeholder="Enter phone number"
                            type="text"
                            value={phone}
                            international
                            countryCallingCodeEditable={false}
                            error={"Phone number required"}
                            onChange={(value) => setPhone(value || "")}
                          />
                          {numberStatus && (
                            <div className="mt-2 text-sm">{numberStatus}</div>
                          )}
                        </div>
                        <div className="mt-6 ml-1">
                          <Button
                            type="button"
                            onClick={handleNumberSearch}
                            disabled={!phone || checking}
                          >
                            <CheckCheckIcon size={18} />
                          </Button>
                        </div>
                      </div>

                      {/* Email */}
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

                      {/* Location */}
                      <div className="w-full ml-1 mb-2">
                        <Label>Location</Label>
                        <Select
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              location: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="athens">Athens</SelectItem>
                            <SelectItem value="chania">Chania</SelectItem>
                            {/* <SelectItem value="corfu">Corfu</SelectItem> */}
                            {/* <SelectItem value="chalkidiki">Chalkidiki</SelectItem> */}
                            <SelectItem value="thessaloniki">
                              Thessaloniki
                            </SelectItem>
                            <SelectItem value="rome">Rome</SelectItem>
                            <SelectItem value="milan">Milan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Booking Details */}
                  <div className="">
                    <h3 className="text-lg font-semibold border-b mb-1 mt-4">
                      Booking Details
                    </h3>
                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      {/*Start Date */}
                      <div>
                        <Label>Start Date</Label>
                        <DatePicker date={startDate} setDate={setStartDate} />
                      </div>

                      {/* End Date */}
                      <div>
                        <Label>End Date</Label>
                        <DatePicker date={endDate} setDate={setEndDate} />
                      </div>

                      {/* Booking Term */}
                      <div className="ml-1">
                        <Label>Booking Term*</Label>
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

                      {/* Duration */}
                      <div className="flex  items-center gap-x-1 w-full">
                        <div className="w-full">
                          <Label className="flex gap-3 m-1">
                            Duration*
                            <p className="text-xs">
                              Tick this to fill in Number
                            </p>
                            <input
                              className="rounded-full"
                              type="checkbox"
                              checked={normalInput}
                              onChange={handleCheckboxChange}
                            />
                          </Label>
                        </div>
                        <div className="w-full">
                          <Label className="flex gap-4">
                            Duration*{" "}
                            {formData.bookingTerm ? (
                              formData.bookingTerm === "Short Term" ? (
                                <div className="text-xs ">
                                  {" "}
                                  Fill in days from 1-28
                                </div>
                              ) : formData.bookingTerm === "Mid Term" ? (
                                <div className="text-xs ">
                                  {" "}
                                  Fill in months from 1-3
                                </div>
                              ) : formData.bookingTerm === "Long Term" ? (
                                <div className="text-xs ">
                                  {" "}
                                  Fill in months from 4-12
                                </div>
                              ) : null
                            ) : null}
                          </Label>
                          <Input
                            name="duration"
                            className="w-full"
                            value={formData.duration}
                            onChange={handleDurationChange}
                            placeholder={
                              formData.bookingTerm === "Short Term"
                                ? "Fill in days from 1-28"
                                : formData.bookingTerm === "Mid Term"
                                ? "Fill in months from 1-3"
                                : formData.bookingTerm === "Long Term"
                                ? "Fill in months from 4-12"
                                : "Enter duration based on term"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Budget Details */}
                  <div className="mt-2 ml-1">
                    <h3 className="text-lg font-semibold border-b  mt-4 mb-1">
                      Budget Details
                    </h3>

                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      {/* Budget From */}
                      <div>
                        <Label>Budget (From)</Label>
                        <Input
                          name="minBudget"
                          type="number"
                          min={0}
                          value={formData.minBudget || ""}
                          onChange={handleInputChange}
                          placeholder="Enter minimum budget"
                        />
                      </div>

                      {/* Budget To */}
                      <div>
                        <Label>Budget (To)</Label>
                        <Input
                          name="maxBudget"
                          type="number"
                          min={0}
                          value={formData.maxBudget || ""}
                          onChange={handleInputChange}
                          placeholder="Enter maximum budget"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Guest Details */}
                  <div className="ml-1">
                    <h3 className="text-lg font-semibold border-b  mb-1 mt-4">
                      Guest Details
                    </h3>

                    <div className="grid  md:grid-cols-2 grid-cols1 gap-x-4 gap-y-4">
                      {/* Guest */}
                      <div>
                        <Label>Guest</Label>
                        <Input
                          type="number"
                          name="guest"
                          min={1}
                          value={formData?.guest}
                          onChange={handleInputChange}
                          placeholder="Enter name"
                        />
                      </div>

                      {/* No Of Beds */}
                      <div>
                        <Label>No Of Beds</Label>
                        <Input
                          type="number"
                          name="noOfBeds"
                          min={1}
                          value={formData?.noOfBeds}
                          onChange={handleInputChange}
                          placeholder="Enter name"
                        />
                      </div>
                    </div>

                    {/* Bill Status & Priority */}
                    <div className="grid  md:grid-cols-2 grid-cols1 gap-x-4 gap-y-4">
                      {/* Bill Status */}
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
                            <SelectItem value="With Bill">
                              With Bill*
                            </SelectItem>
                            <SelectItem value="Without Bill">
                              Without Bill
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
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
                            <SelectItem value="ASAP">ASAP</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Property Details */}
                  <div className="">
                    <h3 className="text-lg font-semibold border-b pb-1 pt-4">
                      Property Details
                    </h3>

                    {/* Type of Property & Lead Quality */}
                    <div className="grid  md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
                      {/* Type of Property */}
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

                      {/* Lead Quality */}
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

                      {/* Property Type */}
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
                            <SelectItem value="Unfurnished">
                              Unfurnished
                            </SelectItem>
                            <SelectItem value="Semi-furnished">
                              Semi-furnished
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Zone */}
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
                            <SelectItem value="East">East</SelectItem>
                            <SelectItem value="West">West</SelectItem>
                            <SelectItem value="North">North</SelectItem>
                            <SelectItem value="South">South</SelectItem>
                            <SelectItem value="Center">Center</SelectItem>
                            <SelectItem value="Anywhere">Anywhere</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Area */}
                    <div className="w-full mt-2 ml-1 mb-2">
                      <Label>Area</Label>
                      <Input
                        name="area"
                        value={formData.area}
                        placeholder="Enter Area"
                        onChange={(e) => handleInputChange(e)}
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
      {loading ? (
        <div className="flex mt-2 min-h-screen items-center justify-center">
          <Loader />
        </div>
      ) : view === "Table View" ? (
        <div className="">
          <div>
            <div className="mt-2 border rounded-lg min-h-[90vh]">
              <Suspense fallback={<div>Loading...</div>}>
                <LeadTable queries={queries} />
              </Suspense>
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
                    leadQualityByReviewer={query.leadQualityByReviewer}
                    email={query.email}
                    duration={query.duration}
                    startDate={query.startDate}
                    endDate={query.endDate}
                    phoneNo={query.phoneNo}
                    area={query.area}
                    guest={query.guest}
                    minBudget={query.minBudget}
                    maxBudget={query.maxBudget}
                    budget={`${query.minBudget} to ${query.maxBudget}`}
                    noOfBeds={query.noOfBeds}
                    location={query.location}
                    bookingTerm={query.bookingTerm}
                    zone={query.zone}
                    billStatus={query.billStatus}
                    typeOfProperty={query.typeOfProperty}
                    propertyType={query.propertyType}
                    priority={query.priority}
                    reminder={query.reminder}
                    salesPriority={query.salesPriority}
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
