// components/CreateLeadDialog.tsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { IQuery } from "@/util/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import PhoneInput from "react-phone-number-input";
import { CheckCheckIcon } from "lucide-react";

import DatePicker from "@/components/DatePicker";

import { validateAndSetDuration } from "@/util/durationValidation";
import { useForm } from "react-hook-form";
import { useLeadSocketEmit } from "@/hooks/useLeadSocketEmit";
import { metroLines } from "../target/components/editArea";
import { apartmentTypes } from "@/app/spreadsheet/spreadsheetTable";
import SearchableAreaSelect from "../createquery/SearchAndSelect";

interface TargetType {
  _id: string;
  city: string;
  areas: { _id: string; city: string; name: string }[];
}

export default function CreateLeadDialog({
  triggerButton = true,
}: {
  triggerButton?: boolean;
}) {
  const { toast } = useToast();
  const { register } = useForm();
  const { emitNewLead } = useLeadSocketEmit();

  // 🟢 Form State (self-contained)
  const [submitQuery, setSubmitQuery] = useState(false);
  const [checking, setChecking] = useState(false);
  const [phone, setPhone] = useState("");
  const [numberStatus, setNumberStatus] = useState("");
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [areas1, setAreas1] = useState<TargetType["areas"]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [normalInput, setNormalInput] = useState(false);

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
    leadStatus: "active",
    bookingTerm: "",
    zone: "",
    metroZone: "",
    billStatus: "",
    typeOfProperty: "",
    propertyType: "",
    priority: "",
    salesPriority: "None",
    reminder: new Date(),
    roomDetails: { roomId: "", roomPassword: "" },
    messageStatus: "None",
    BoostID: "",
  });

  // 🔄 Fetch Targets for Location/Area Select
  useEffect(() => {
    axios
      .get("/api/addons/target/getAreaFilterTarget")
      .then((res) => setTargets(res.data.data))
      .catch((err) => console.error("Error fetching targets:", err));
  }, []);

  useEffect(() => {
    const target = targets.find((t) => t.city === selectedLocation);
    setAreas1(target ? target.areas : []);
  }, [selectedLocation, targets]);

  // 🟢 Handlers
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNormalInput(e.target.checked);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!normalInput) {
      setFormData((prev) => ({ ...prev, duration: e.target.value }));
    } else {
      validateAndSetDuration(e.target.value, formData.bookingTerm, setFormData);
    }
  };

  const handleBookingTermChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      bookingTerm: value,
      duration: "",
    }));
  };

  const handleNumberSearch = async () => {
    if (!phone) {
      setNumberStatus("Please enter a phone number.");
      return;
    }
    try {
      setChecking(true);
      const response = await axios.post("/api/sales/checkNumber", {
        phoneNo: phone.replace(/\D/g, ""),
      });
      setNumberStatus(
        response.data.exists
          ? "❌ Phone number already exists."
          : "✅ Phone number is available."
      );
    } catch {
      setNumberStatus("Error checking number");
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "location" || name === "area"
          ? value.toLowerCase()
          : value.trim(),
    }));
  };

  const handleSubmit = async () => {
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

    try {
      setSubmitQuery(true);
      const response = await axios.post("/api/sales/createquery", {
        ...formData,
        startDate,
        endDate,
        phoneNo: phone.replace(/\D/g, ""),
      });

      if (response.data.success && response.data.data) {
        emitNewLead(response.data.data);
      }

      toast({ description: "Query Created Successfully" });

      // Reset form
      setFormData((prev) => ({
        ...prev,
        name: "",
        email: "",
        area: "",
        zone: "",
        metroZone: "",
      }));
      setPhone("");
      setSelectedLocation("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || "Something went wrong",
      });
    } finally {
      setSubmitQuery(false);
    }
  };
  

  return (
    <Dialog>
      {triggerButton && (
        <DialogTrigger asChild>
          <Button>Create Lead</Button>
        </DialogTrigger>
      )}
      <DialogContent className="p-4 w-[500px] md:min-w-[650px]">
        <DialogHeader>
          <DialogTitle>Create Lead</DialogTitle>
          <DialogDescription>
            Please provide accurate and complete information.
          </DialogDescription>
        </DialogHeader>

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
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: value,
                    }));
                    setSelectedLocation(value);
                  }}
                  value={selectedLocation}
                >
                  <SelectTrigger className=" w-44 border border-neutral-700">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Locations</SelectLabel>
                      {targets.map((loc: any) => (
                        <SelectItem key={loc.city} value={loc.city}>
                          <div className="flex justify-between items-center w-full">
                            <span>{loc.city}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-full ml-1 mb-2">
              <Label>Area</Label>
              <SearchableAreaSelect
                areas={areas1}
                onSelect={(area) =>
                  setFormData((prev) => ({
                    ...prev,
                    area: area.name, // only store the name
                  }))
                }
              />
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
                <Select
                  value={formData.bookingTerm}
                  onValueChange={handleBookingTermChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short Term">Short Term</SelectItem>
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
                    <p className="text-xs">Tick this to fill in Number</p>
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
                        <div className="text-xs "> Fill in days from 1-28</div>
                      ) : formData.bookingTerm === "Mid Term" ? (
                        <div className="text-xs "> Fill in months from 1-3</div>
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
                  value={formData.billStatus}
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
                    <SelectItem value="With Bill">With Bill*</SelectItem>
                    <SelectItem value="Without Bill">Without Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
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

          <h3 className="text-lg font-semibold border-b pb-1 pt-4">
            Property Details
          </h3>

          {/* Type of Property & Lead Quality */}
          <div className="grid  md:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4">
            {/* Type of Property */}
            <div className="ml-1">
              <Label>Type of Property</Label>
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
                    <SelectItem key={index} value={propertyType.value}>
                      {propertyType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Quality */}
            <div>
              <Label>Lead Quality</Label>
              <Select
                value={formData.leadQualityByCreator}
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
                  <SelectItem value="Below Average">Below Average</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Property Type */}
            <div className="ml-1">
              <Label>Property Type</Label>
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
                  <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                  <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zone */}
            <div>
              <Label>Zone</Label>
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
                  <SelectItem value="East">East</SelectItem>
                  <SelectItem value="West">West</SelectItem>
                  <SelectItem value="North">North</SelectItem>
                  <SelectItem value="South">South</SelectItem>
                  <SelectItem value="Center">Center</SelectItem>
                  <SelectItem value="North-East">North-East</SelectItem>
                  <SelectItem value="North-West">North-West</SelectItem>
                  <SelectItem value="South-East">South-East</SelectItem>
                  <SelectItem value="South-West">South-West</SelectItem>
                  <SelectItem value="Anywhere">Anywhere</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Area */}

          <div>
            <Label>Metro Zone</Label>
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
                <SelectValue placeholder="Select Metro Line" />
              </SelectTrigger>
              <SelectContent>
                {metroLines.map((line) => (
                  <SelectItem key={line.value} value={line.label}>
                    {line.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-full mt-2 ml-1 mb-2">
              <Label>BoostID</Label>
              <Input
                name="BoostID"
                value={formData?.BoostID}
                placeholder="Enter BoostID"
                onChange={handleInputChange}
              />
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
  );
}
