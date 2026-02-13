"use client";

import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { LucideLoader2, Search, X } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/phone-input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InfinityLoader } from "@/components/Loaders";

interface VisitFromSchema {
  lead: string;
  VSID: string;
  propertyId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  address: string;
  propertyUrl: string;
  schedule: { date: string; time: string }[];
  agentName: string;
  agentPhone: string;
  pitchAmount: number;
  vsFinal: number;
  ownerCommission: number;
  travellerCommission: number;
  agentCommission: number;
  documentationCharges: number;
  visitType: "physical" | "virtual";
}

interface Property {
  _id: string;
  email: string;
  street: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  propertyCoverFileUrl: string;
  propertyImages: string[];
  ownerName: string;
}

interface PropertyByPhone {
  propertyId: string;
  VSID: string;
  propertyImages: string[];
  isQuickListing: boolean;
  ownerName: string;
  ownerEmail: string;
  address: string;
}

interface AgentsInterface {
  agentName: string;
  agentPhone: string;
}

const VisitModal = ({
  leadId,
  onOpenChange,
}: {
  leadId: string;
  onOpenChange: () => void;
}) => {
  const [visitFormValues, setVisitFormValues] = useState<VisitFromSchema>({
    lead: leadId,
    VSID: "",
    propertyId: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    address: "",
    propertyUrl: "",
    schedule: [{ date: "", time: "" }],
    agentName: "",
    agentPhone: "",
    pitchAmount: 0,
    vsFinal: 0,
    ownerCommission: 0,
    travellerCommission: 0,
    agentCommission: 0,
    documentationCharges: 0,
    visitType: "physical",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<PropertyByPhone[]>([]);
  const [agents, setAgents] = useState<AgentsInterface[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  const handleSubmit = async () => {
    // Ensure an agent is selected: if none chosen but agents list exists, auto-fill with first agent
    const formCopy = { ...visitFormValues };
    if (
      (!formCopy.agentPhone || formCopy.agentPhone.trim() === "") &&
      agents &&
      agents.length > 0
    ) {
      formCopy.agentPhone = agents[0].agentPhone || "";
      formCopy.agentName = agents[0].agentName || "";
      // persist to state so UI reflects the auto-selection
      setVisitFormValues(formCopy);
      toast({
        title: "Agent auto-selected",
        description: `Assigned to ${formCopy.agentName}`,
      });
    }

    const missing: string[] = [];
    const vsid = formCopy.VSID?.trim();
    const phoneDigits =
      (formCopy.ownerPhone && formCopy.ownerPhone.replace(/\D/g, "")) || "";

    if (!vsid && !phoneDigits) missing.push("VSID or Phone Number");

    if (missing.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please provide: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (
      visitFormValues.ownerCommission === 0 &&
      visitFormValues.travellerCommission === 0
    ) {
      toast({
        title: "Commission Required",
        description: "Traveller and Owner Commission cannot both be zero",
        variant: "destructive",
      });
      return;
    }

    // Schedule check
    if (
      !visitFormValues.schedule ||
      visitFormValues.schedule.length === 0 ||
      !visitFormValues.schedule[0].date
    ) {
      toast({
        title: "Schedule Required",
        description: "Please select a date and time for the visit",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/api/visits/addVisit", formCopy);
      toast({
        title: "Success",
        description: "Visit scheduled successfully",
      });
      onOpenChange();
    } catch (err) {
      console.error("Error scheduling visit:", err);
      toast({
        title: "Error",
        description: "Unable to schedule visit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof VisitFromSchema, value: string | number) => {
    setVisitFormValues((prev) => ({
      ...prev,
      [key]: typeof value === "string" ? value.trim() : value,
    }));
  };

  const getPropertiesByPhoneNumber = async () => {
    if (!visitFormValues.ownerPhone) return;

    setIsLoading(true);
    try {
      const response = await axios.post("/api/visits/getPropertiesForVisit", {
        userMobile: visitFormValues.ownerPhone.replace(/\D/g, ""),
      });
      const props = response.data || [];
      setProperties(props);

      if (!props || props.length === 0) {
        toast({
          title: "No Properties Found",
          description: "No properties exist for this phone number",
          variant: "destructive",
        });
      } else if (props.length === 1) {
        // Auto-select single property and fill VSID + owner info
        const only = props[0];
        setProperty(only as any);
        setVisitFormValues((prev) => ({
          ...prev,
          propertyId: only.propertyId || "",
          VSID: only.VSID || "",
          ownerName: only.ownerName || prev.ownerName,
          ownerEmail: only.ownerEmail || prev.ownerEmail,
          address: only.address || prev.address,
        }));
      }
    } catch (err: unknown) {
      console.error("Error fetching properties:", err);
      setProperties([]);
      toast({
        title: "Error",
        description: "Property does not exist for this phone number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPropertyByVSID = async (VSID: string) => {
    if (!VSID?.trim()) {
      toast({
        title: "Invalid VSID",
        description: "Please enter a valid VSID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post("/api/property/getPropertyByVSID", {
        VSID: VSID.trim(),
      });

      if (response.data?.data) {
        setProperty(response.data.data);
        setVisitFormValues((prev) => ({
          ...prev,
          propertyId: response.data.data._id || "",
          ownerName: response.data.data.ownerName || "",
          ownerEmail: response.data.data.email || "",
          ownerPhone: response.data.data.phone || "",
          address:
            `${response.data.data.street || ""}, ${response.data.data.city || ""}, ${response.data.data.state || ""}, ${response.data.data.country || ""}`.replace(
              /^,\s*|,\s*$/g,
              "",
            ),
        }));
      }
    } catch (err) {
      console.error("Error fetching property by VSID:", err);
      setProperty(null);
      toast({
        title: "Error",
        description: "Property does not exist for this VSID",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setFetchingAgents(true);
      const res = await axios.get("/api/addons/agents/getAllAgents");
      // Support multiple response shapes and defensive logging
      console.log("fetchAgents response:", res?.status, res?.data);
      const agentsList =
        res?.data?.data ||
        res?.data?.agents ||
        (Array.isArray(res?.data) ? res.data : undefined) ||
        [];
      setAgents(agentsList || []);
    } catch (err) {
      console.error("Unable to fetch agents:", err);
      setAgents([]);
    } finally {
      setFetchingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const pitch =
      (visitFormValues.ownerCommission || 0) +
      (visitFormValues.travellerCommission || 0);
    const final =
      pitch -
      ((visitFormValues.agentCommission || 0) +
        (visitFormValues.documentationCharges || 0));
    setVisitFormValues((prev) => ({
      ...prev,
      pitchAmount: pitch,
      vsFinal: final,
    }));
  }, [
    visitFormValues.ownerCommission,
    visitFormValues.travellerCommission,
    visitFormValues.agentCommission,
    visitFormValues.documentationCharges,
  ]);

  return (
    <ScrollArea className="max-h-[80vh] rounded-md border">
      <div className="flex flex-col gap-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="font-semibold text-xl">Schedule Visit</h2>
        <Button variant="outline" size="icon" onClick={onOpenChange}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* VSID Search */}
      <div className="space-y-2">
        <Label>Search by VSID</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter VSID..."
            value={visitFormValues.VSID}
            onChange={(e) =>
              setVisitFormValues({ ...visitFormValues, VSID: e.target.value })
            }
          />
          <Button
            disabled={isLoading || !visitFormValues.VSID?.trim()}
            onClick={() => getPropertyByVSID(visitFormValues.VSID)}
          >
            {isLoading ? (
              <LucideLoader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
          </Button>
        </div>
      </div>

      {/* Property Details Card */}
      {property && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex gap-4">
            <Link
              href={`https://www.vacationsaga.com/listing-stay-detail/${property._id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={property.propertyCoverFileUrl || "/placeholder.svg"}
                alt="Property"
                className="w-40 h-24 rounded-md object-cover"
              />
            </Link>
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-sm font-medium">
                {property.street}, {property.city}, {property.state},{" "}
                {property.country}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Owner: </span>
                  {property.ownerName}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Phone: </span>
                  {property.phone}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Email: </span>
                  {property.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Property by Phone number */}
      <div className="space-y-2">
        <Label>Search by Phone Number</Label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <PhoneInput
              className="phone-input"
              placeholder="Enter phone number"
              type="text"
              value={visitFormValues.ownerPhone}
              international
              countryCallingCodeEditable={false}
              onChange={(value) =>
                setVisitFormValues((prev) => ({
                  ...prev,
                  ownerPhone: value?.toString() || "",
                }))
              }
            />
          </div>
          <Button
            type="button"
            onClick={getPropertiesByPhoneNumber}
            disabled={!visitFormValues.ownerPhone || isLoading}
          >
            {isLoading ? (
              <LucideLoader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
          </Button>
        </div>

        {/* Properties List */}
        {properties.length > 0 && (
          <ScrollArea className="whitespace-nowrap rounded-md border w-full">
            <div className="flex w-max space-x-4 p-4">
              {properties.map((property) => {
                const isSelected = visitFormValues.VSID === property.VSID;
              return (
                <div
                  key={property.propertyId}
                  className={`shrink-0 cursor-pointer rounded-md border-2 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setVisitFormValues({
                      ...visitFormValues,
                      propertyId: property.propertyId,
                      VSID: property.VSID,
                      ownerName: property.ownerName,
                      ownerEmail: property.ownerEmail,
                      address: property.address,
                    })
                  }
                >
                  <div className="overflow-hidden rounded-md relative">
                    <Link
                      href={
                        property.isQuickListing
                          ? `https://www.vacationsaga.com/roomListing/${property.propertyId}`
                          : `https://www.vacationsaga.com/listing-stay-detail/${property.propertyId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={
                          property?.propertyImages?.[0] || "/placeholder.svg"
                        }
                        alt="Property"
                        className="w-28 h-28 object-cover"
                      />
                    </Link>

                    {/* Open listing button (top-right) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = property.isQuickListing
                          ? `https://www.vacationsaga.com/roomListing/${property.propertyId}`
                          : `https://www.vacationsaga.com/listing-stay-detail/${property.propertyId}`;
                        try {
                          window.open(url, "_blank", "noopener,noreferrer");
                        } catch {
                          window.location.href = url;
                        }
                      }}
                      className="absolute top-1 right-1 bg-white/80 text-xs rounded px-2 py-1 hover:bg-white"
                    >
                      Open
                    </button>

                    {isSelected && (
                      <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                        <Search className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Owner Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Owner Name</Label>
          <Input
            type="text"
            value={visitFormValues.ownerName}
            placeholder="Enter owner name"
            onChange={(e) => handleChange("ownerName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Owner Email</Label>
          <Input
            type="email"
            value={visitFormValues.ownerEmail}
            placeholder="Enter owner email"
            onChange={(e) => handleChange("ownerEmail", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Property Reference URL</Label>
        <Input
          type="url"
          value={visitFormValues.propertyUrl}
          placeholder="Enter property reference URL"
          onChange={(e) => handleChange("propertyUrl", e.target.value)}
        />
      </div>

      {/* Visit Date, Time, and Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date & Time</Label>
          <Input
            type="datetime-local"
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                try {
                  const [dateStr, timeStr] = value.split("T");
                  const date = format(new Date(dateStr), "MM/dd/yyyy");
                  const time = timeStr || "";
                  setVisitFormValues((prev) => ({
                    ...prev,
                    schedule: [{ date, time }],
                  }));
                } catch (error) {
                  console.error("Error parsing date:", error);
                }
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Visit Type</Label>
          <Select
            value={visitFormValues.visitType}
            onValueChange={(value: "physical" | "virtual") =>
              setVisitFormValues((prev) => ({
                ...prev,
                visitType: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Visit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Visit Type</SelectLabel>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agent and Commission Details */}
      <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
        <h3 className="font-semibold text-sm">Agent & Commission Details</h3>

        {/* Agent Selector */}
        <div className="space-y-2">
          <Label>Select Agent</Label>
          <Select
            onValueChange={(value) => {
              const [agentName, agentPhone] = value.split("|||");
              setVisitFormValues((prev) => ({
                ...prev,
                agentName: agentName || "",
                agentPhone: agentPhone || "",
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Agents</SelectLabel>
                {fetchingAgents ? (
                  <div className="flex justify-center p-4">
                    <LucideLoader2 className="animate-spin h-4 w-4" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center p-4">
                    No agents available
                  </div>
                ) : (
                  agents.map((agent, index) => (
                    <SelectItem
                      key={index}
                      value={`${agent.agentName}`}
                    >
                      {agent.agentName} - {agent.agentPhone}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Commission Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Owner Comm.</Label>
            <Input
              type="number"
              min={0}
              value={visitFormValues.ownerCommission || ""}
              placeholder="0"
              onChange={(e) =>
                handleChange(
                  "ownerCommission",
                  Number.parseInt(e.target.value) || 0,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Traveller Comm.</Label>
            <Input
              type="number"
              min={0}
              value={visitFormValues.travellerCommission || ""}
              placeholder="0"
              onChange={(e) =>
                handleChange(
                  "travellerCommission",
                  Number.parseInt(e.target.value) || 0,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Agent Commission</Label>
            <Input
              type="number"
              min={0}
              value={visitFormValues.agentCommission || ""}
              placeholder="0"
              onChange={(e) =>
                handleChange(
                  "agentCommission",
                  Number.parseInt(e.target.value) || 0,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Docs. Charges</Label>
            <Input
              type="number"
              min={0}
              value={visitFormValues.documentationCharges || ""}
              placeholder="0"
              onChange={(e) =>
                handleChange(
                  "documentationCharges",
                  Number.parseInt(e.target.value) || 0,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Pitch Amount</Label>
            <Input
              type="number"
              value={visitFormValues.pitchAmount}
              disabled
              className="cursor-not-allowed bg-muted font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">V.S Final</Label>
            <Input
              type="number"
              value={visitFormValues.vsFinal || 0}
              disabled
              className="cursor-not-allowed bg-muted font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <LucideLoader2 className="h-4 w-4 animate-spin" />
            <span>Scheduling...</span>
          </div>
        ) : (
          "Schedule Visit"
        )}
      </Button>
    </div>
    </ScrollArea>
  );
};

export default VisitModal;
