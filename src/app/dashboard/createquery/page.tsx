"use client";

import axios from "axios";
import Pusher from "pusher-js";
import { format } from "date-fns";
import debounce from "lodash.debounce";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import { useToast } from "@/hooks/use-toast";
import PhoneInput from "react-phone-number-input";
import { CheckCheckIcon, SlidersHorizontal, Plus } from "lucide-react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";

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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import SearchableAreaSelect from "./SearchAndSelect";
import { metroLines } from "../target/components/editArea";
import { apartmentTypes } from "@/app/spreadsheet/spreadsheetTable";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useSocket } from "@/hooks/useSocket";
import { useLeadSocketEmit } from "@/hooks/useLeadSocketEmit";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";

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

interface TargetType {
  _id: string;
  city: string;
  areas: AreaType[];
}
interface AreaType {
  _id: string;
  city: string;
  name: string;
}
const SalesDashboard = () => {
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalQuery, setTotalQueries] = useState<number>(0);
  const [phone, setPhone] = useState<string>("");
  const { socket, isConnected } = useSocket();
  const { emitNewLead } = useLeadSocketEmit();
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
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [areas1, setAreas1] = useState<AreaType[]>([]);

  // ✅ CHANGE 1: Added state to control dialog open/close
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ✅ CHANGE 2: Added ref to track if we should fetch queries after submission
  const shouldRefetchRef = useRef(false);

  const { uploadFiles } = useBunnyUpload();
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

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
    metroZone: "",
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
    messageStatus: "None",
    BoostID: "",
    profilePicture: "",
  });

  const [location, setLocation] = useState([]);

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

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`/api/addons/target/getAlLocations`);
      setLocation(response.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleNumberSearch = async () => {
    try {
      if (!phone) {
        setNumberStatus("Please enter a phone number.");
        return;
      }

      const parsed = parsePhoneNumberFromString(phone);
      if (!parsed || !parsed.isValid()) {
        setNumberStatus("❌ Invalid phone number.");
        return;
      }

      const digitsOnly = parsed.number.replace("+", "");
      setChecking(true);

      const response = await axios.post("/api/sales/checkNumber", {
        phoneNo: digitsOnly,
      });

      if (response.data.success) {
        if (response.data.exists) {
          setNumberStatus("❌ Phone number already exists.");
        } else {
          setNumberStatus("✅ Phone number is available.");
        }
      } else {
        setNumberStatus("Error checking the phone number. Try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setNumberStatus("Server error. Please try again later.");
    } finally {
      setChecking(false);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!normalInput) {
      setFormData((prev) => ({ ...prev, duration: e.target.value }));
    } else {
      validateAndSetDuration(e.target.value, formData.bookingTerm, setFormData);
    }
  };

  // ✅ CHANGE 3: Reset form data function
  const resetFormData = () => {
    setFormData({
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
      metroZone: "",
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
      messageStatus: "None",
      BoostID: "",
      leadQualityByCreator: "",
      profilePicture: "",
    });
    setPhone("");
    setNumberStatus("");
    setSelectedLocation("");
    setNormalInput(false);
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", description: "Please select an image file (JPEG, PNG, or WebP)." });
      return;
    }
    toast({ title: "Uploading...", description: "Client profile picture is being uploaded." });
    try {
      const { imageUrls, error } = await uploadFiles(file, "ProfilePictures");
      if (error) {
        toast({ variant: "destructive", description: error });
        return;
      }
      const url = imageUrls?.[0] || "";
      setFormData((prev) => ({ ...prev, profilePicture: url }));
      toast({ description: "Profile picture uploaded." });
    } catch (err) {
      toast({ variant: "destructive", description: "Failed to upload image." });
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    try {
      const emptyFields: string[] = [];
      const canBeEmptyField = ["salesPriority"];

      if (
        !formData.area?.trim() &&
        !formData.zone?.trim() &&
        !formData.metroZone?.trim()
      ) {
        toast({
          description: "Please fill at least one of: Area, Zone, or Metro Zone",
        });
        return;
      }

      if (
        numberStatus === "" ||
        numberStatus === "❌ Invalid phone number." ||
        numberStatus === "❌ Phone number already exists."
      ) {
        toast({
          description: "Please check the phone number validity",
        });
        return;
      }

      Object.entries(formData).forEach(([key, value]) => {
        if (
          (value === "" || value === null || value === undefined) &&
          !canBeEmptyField.includes(key) &&
          key !== "area" &&
          key !== "zone" &&
          key !== "metroZone" &&
          key !== "BoostID" &&
          key !== "profilePicture"
        ) {
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
        ...formData,
        phoneNo: phone.replace(/\D/g, ""),
      };

      setSubmitQuery(true);

      const response = await axios.post(
        "/api/sales/createquery",
        formDataToSubmit
      );

      // Add the newly created lead to the top of the local list
      if (response.data.success && response.data.data) {
        setQueries((prev) => [response.data.data, ...prev]);
        setTotalQueries((prev) => prev + 1);
        // Emit via socket so other clients see it in real-time
        emitNewLead(response.data.data);
      }

      toast({
        description: "Query Created Successfully",
      });

      // ✅ CHANGE 5: Reset form and close dialog
      resetFormData();
      setIsDialogOpen(false);

      // ✅ CHANGE 6: Set flag to refetch data
      shouldRefetchRef.current = true;
    } catch (error: any) {
      console.error("Error:", error.response?.data?.error);
      toast({
        variant: "destructive",
        description: `${error.response?.data?.error || "Something went wrong"}`,
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

  // ✅ CHANGE 7: Refetch when dialog closes after successful submission
  useEffect(() => {
    if (!isDialogOpen && shouldRefetchRef.current) {
      shouldRefetchRef.current = false;
      fetchQuery({
        searchTerm,
        searchType,
        dateFilter,
        customDays,
        customDateRange,
      });
    }
  }, [isDialogOpen]);

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
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        setTargets(res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  // Listen for WhatsApp conversation updates and mark firstReply in UI
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      try {
        if (!data) return;
        if (data.queryId) {
          setQueries((prev) =>
            prev.map((q) => (q._id === data.queryId ? { ...q, firstReply: true } : q))
          );
          return;
        }
        if (data.phone) {
          const normalized = String(data.phone).replace(/\D/g, "");
          const lastDigits = normalized.slice(-9);
          setQueries((prev) =>
            prev.map((q) => {
              const qPhone = String(q.phoneNo || "").replace(/\D/g, "");
              if (qPhone.endsWith(lastDigits)) return { ...q, firstReply: true };
              return q;
            })
          );
        }
      } catch (e) {
        console.error("Error handling whatsapp conversation update", e);
      }
    };

    socket.on("whatsapp-conversation-update", handler);
    return () => { socket.off("whatsapp-conversation-update", handler); };
  }, [socket]);

  // When location changes, load areas for that location (case-insensitive match)
  useEffect(() => {
    if (!selectedLocation?.trim()) {
      setAreas1([]);
      return;
    }
    const target = targets.find(
      (t) => t.city?.toLowerCase().trim() === selectedLocation?.toLowerCase().trim()
    );
    if (target?.areas?.length) {
      setAreas1(target.areas);
    } else {
      setAreas1([]);
    }
  }, [selectedLocation, targets]);

  return (
    <div>
      <Toaster />
      <div className="flex items-center md:flex-row flex-col justify-between w-full">
        <div className="w-full">
          <Heading heading="All Leads" subheading="" />
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
          {/* ✅ CHANGE 8: Added controlled dialog state */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              {token?.role !== "Sales" && <Button>Create Lead</Button>}
            </DialogTrigger>
            <DialogContent className="p-0 w-[95vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-2 border-b shrink-0">
                <DialogTitle className="text-xl">Create Lead</DialogTitle>
                <DialogDescription>
                  Please provide accurate and complete information.
                </DialogDescription>
              </DialogHeader>

              {/* Client photo - top center */}
              <div className="flex flex-col items-center justify-center py-4 px-6 border-b bg-muted/30 shrink-0">
                <Label className="text-xs font-medium text-muted-foreground mb-2">
                  Client Photo (Optional)
                </Label>
                <div
                  className="relative w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all bg-background overflow-hidden"
                  onClick={() => profilePictureInputRef.current?.click()}
                >
                  {formData.profilePicture ? (
                    <img
                      src={formData.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Plus className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <Input
                  type="file"
                  ref={profilePictureInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="px-6 py-4 pb-6">
                  <div className="space-y-6 pr-2">
                    {/* Section 1: Personal Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide border-b pb-2.5">
                        Personal Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter full name"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Email</Label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter email"
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <div className="flex gap-2">
                          <div className="flex-1 min-w-0">
                            <PhoneInput
                              {...register("phone")}
                              className="phone-input w-full"
                              placeholder="Enter phone number"
                              type="text"
                              value={phone}
                              international
                              countryCallingCodeEditable={false}
                              error={"Phone number required"}
                              onChange={(value) => setPhone(value || "")}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleNumberSearch}
                            disabled={!phone || checking}
                            className="shrink-0"
                          >
                            <CheckCheckIcon size={18} />
                          </Button>
                        </div>
                        {numberStatus && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {numberStatus}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">ID Name</Label>
                        <Input
                          name="idName"
                          value={formData.idName}
                          onChange={handleInputChange}
                          placeholder="Enter the ID Name"
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Location</Label>
                        <Select
                          onValueChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              location: value,
                            }));
                            setSelectedLocation(value);
                            setFormData((prev) => ({ ...prev, area: "" }));
                          }}
                          value={selectedLocation || formData.location || ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Locations</SelectLabel>
                              {targets.map((loc: any) => (
                                <SelectItem
                                  key={loc.city}
                                  value={String(loc.city)}
                                >
                                  {loc.city}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Area</Label>
                        <SearchableAreaSelect
                          areas={areas1}
                          onSelect={(area) =>
                            setFormData((prev) => ({
                              ...prev,
                              area: area.name,
                            }))
                          }
                        />
                        {selectedLocation && areas1.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            No areas for this location. Select another or add
                            areas in settings.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Booking Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide border-b pb-2.5">
                      Booking Details
                    </h3>
                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-4">
                      {/* Start Date */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Start Date
                        </Label>
                        <DatePicker date={startDate} setDate={setStartDate} />
                      </div>

                      {/* End Date */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <DatePicker date={endDate} setDate={setEndDate} />
                      </div>

                      {/* Booking Term */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Booking Term*
                        </Label>
                        <Select
                          value={formData.bookingTerm}
                          onValueChange={handleBookingTermChange}
                        >
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">
                            Duration*
                          </Label>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              className="rounded"
                              type="checkbox"
                              checked={normalInput}
                              onChange={handleCheckboxChange}
                            />
                            <span>Manual entry</span>
                          </label>
                        </div>
                        <Input
                          name="duration"
                          className="w-full"
                          value={formData.duration}
                          onChange={handleDurationChange}
                          placeholder={
                            formData.bookingTerm === "Short Term"
                              ? "Days (1-28)"
                              : formData.bookingTerm === "Mid Term"
                                ? "Months (1-3)"
                                : formData.bookingTerm === "Long Term"
                                  ? "Months (4-12)"
                                  : "Select booking term first"
                          }
                        />
                        {formData.bookingTerm && (
                          <p className="text-xs text-muted-foreground">
                            {formData.bookingTerm === "Short Term" &&
                              "Enter days from 1-28"}
                            {formData.bookingTerm === "Mid Term" &&
                              "Enter months from 1-3"}
                            {formData.bookingTerm === "Long Term" &&
                              "Enter months from 4-12"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Budget Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide border-b pb-2.5">
                      Budget Details
                    </h3>

                    <div className="grid lg:grid-cols-2 md:grid-cols-2 grid-cols-1 gap-4">
                      {/* Budget From */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Budget (From)
                        </Label>
                        <Input
                          name="minBudget"
                          type="number"
                          min={0}
                          value={formData.minBudget || ""}
                          onChange={handleInputChange}
                          placeholder="Minimum budget"
                        />
                      </div>

                      {/* Budget To */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Budget (To)
                        </Label>
                        <Input
                          name="maxBudget"
                          type="number"
                          min={0}
                          value={formData.maxBudget || ""}
                          onChange={handleInputChange}
                          placeholder="Maximum budget"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Guest Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide border-b pb-2.5">
                      Guest Details
                    </h3>

                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                      {/* Guest */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Guests</Label>
                        <Input
                          type="number"
                          name="guest"
                          min={1}
                          value={formData?.guest}
                          onChange={handleInputChange}
                          placeholder="Number of guests"
                        />
                      </div>

                      {/* No Of Beds */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Number of Beds
                        </Label>
                        <Input
                          type="number"
                          name="noOfBeds"
                          min={1}
                          value={formData?.noOfBeds}
                          onChange={handleInputChange}
                          placeholder="Number of beds"
                        />
                      </div>
                    </div>

                    {/* Bill Status & Priority */}
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                      {/* Bill Status */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Bill Status
                        </Label>
                        <Select
                          value={formData.billStatus}
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              billStatus: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="With Bill">With Bill</SelectItem>
                            <SelectItem value="Without Bill">
                              Without Bill
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              priority: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASAP">ASAP</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Property Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide border-b pb-2.5">
                      Property Details
                    </h3>

                    {/* Type of Property & Lead Quality */}
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                      {/* Type of Property */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Type of Property
                        </Label>
                        <Select
                          value={formData.typeOfProperty}
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
                            {apartmentTypes.map((propertyType, index) => (
                              <SelectItem
                                key={index}
                                value={propertyType.value}
                              >
                                {propertyType.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Lead Quality */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Lead Quality
                        </Label>
                        <Select
                          value={formData.leadQualityByCreator}
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              leadQualityByCreator: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select quality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Very Good">Very Good</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Below Average">
                              Below Average
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Property Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Property Type
                        </Label>
                        <Select
                          value={formData.propertyType}
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
                            <SelectItem value="Semi-furnished">
                              Semi-furnished
                            </SelectItem>
                            <SelectItem value="Unfurnished">
                              Unfurnished
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Zone */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Zone</Label>
                        <Select
                          value={formData.zone}
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
                            <SelectItem value="Anywhere">Anywhere</SelectItem>
                            <SelectItem value="Center">Center</SelectItem>
                            <SelectItem value="North">North</SelectItem>
                            <SelectItem value="South">South</SelectItem>
                            <SelectItem value="East">East</SelectItem>
                            <SelectItem value="West">West</SelectItem>
                            <SelectItem value="North-East">
                              North-East
                            </SelectItem>
                            <SelectItem value="North-West">
                              North-West
                            </SelectItem>
                            <SelectItem value="South-East">
                              South-East
                            </SelectItem>
                            <SelectItem value="South-West">
                              South-West
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Metro Zone & BoostID */}
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Metro Zone
                        </Label>
                        <Select
                          value={formData.metroZone}
                          onValueChange={(value) =>
                            setFormData((prevData) => ({
                              ...prevData,
                              metroZone: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select metro line" />
                          </SelectTrigger>
                          <SelectContent>
                            {metroLines.map((line) => (
                              <SelectItem key={line.value} value={line.label}>
                                {line.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Boost ID</Label>
                        <Input
                          name="BoostID"
                          value={formData?.BoostID}
                          placeholder="Enter Boost ID"
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              <div className="px-6 pb-6 pt-4 border-t bg-muted/10 shrink-0">
                <DialogFooter>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={submitQuery}
                    onClick={handleSubmit}
                  >
                    {submitQuery ? "Submitting..." : "Submit Lead"}
                  </Button>
                </DialogFooter>
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
                <LeadTable queries={queries} setQueries={setQueries} page={page} />
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
