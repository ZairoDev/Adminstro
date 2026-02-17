"use client";

import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { LucideLoader2, Search, X, ArrowRight } from "lucide-react";

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
import { PropertySchema } from "@/schemas/property.schema";
import { PropertiesDataType } from "@/util/type";
import type { IProperty } from "@/models/property";
import type { IOwner } from "@/models/user";

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

interface IPropertyWithOwner extends IProperty {
  owner: IOwner;
  isQuickListing?: boolean;
}

type Property = IPropertyWithOwner;
type PropertyByPhone = IPropertyWithOwner;

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
  const [selectedPropertyVSID, setSelectedPropertyVSID] = useState<string>("");

  const [agents, setAgents] = useState<AgentsInterface[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  const handleSubmit = async () => {
    // Validate required fields
    const missing: string[] = [];
    const hasVsidOrProperty =
      Boolean(visitFormValues.VSID && visitFormValues.VSID.trim()) ||
      Boolean(visitFormValues.propertyId && visitFormValues.propertyId.trim());

    if (!hasVsidOrProperty) missing.push("VSID / Property");
    if (!visitFormValues.ownerName || visitFormValues.ownerName.trim() === "")
      missing.push("Owner Name");
    if (!visitFormValues.ownerPhone || visitFormValues.ownerPhone.trim() === "")
      missing.push("Owner Phone");
    if (!visitFormValues.ownerEmail || visitFormValues.ownerEmail.trim() === "")
      missing.push("Owner Email");
    if (!visitFormValues.agentName || visitFormValues.agentName.trim() === "")
      missing.push("Agent Name");
    if (
      !visitFormValues.schedule ||
      visitFormValues.schedule.length === 0 ||
      !visitFormValues.schedule[0].date
    )
      missing.push("Schedule Date & Time");

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
        title: "Traveller and Owner Commission cannot be zero",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/api/visits/addVisit", visitFormValues);
      toast({ title: "Visit scheduled successfully" });
    } catch (err) {
      toast({ title: "Unable to schedule visit", variant: "destructive" });
    } finally {
      setIsLoading(false);
      onOpenChange();
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
      console.log("properties by phone number", response.data);
      const raw = response.data;
      const fetchedProperties: IPropertyWithOwner[] = Array.isArray(raw)
        ? raw
        : raw
        ? [raw]
        : [];
      // API guarantees owner populated; coerce into array for safety
      setProperties(fetchedProperties);

      // If only one property, auto-select it and populate owner fields from property.owner
      if (fetchedProperties.length === 1) {
        const singleProperty = fetchedProperties[0];
        setSelectedPropertyVSID(singleProperty.VSID);
        setVisitFormValues((prev) => ({
          ...prev,
          propertyId: singleProperty._id || singleProperty.VSID,
          VSID: singleProperty.VSID,
          ownerName: singleProperty.owner?.name || "",
          ownerEmail: singleProperty.owner?.email || "",
          ownerPhone: singleProperty.owner?.phone || "",
          address: `${singleProperty.street || ""}${singleProperty.city ? ", " + singleProperty.city : ""}${singleProperty.state ? ", " + singleProperty.state : ""}${singleProperty.country ? ", " + singleProperty.country : ""}`,
        }));
      } else {
        // Clear any previous selection when multiple properties returned
        setSelectedPropertyVSID("");
        setVisitFormValues((prev) => ({
          ...prev,
          propertyId: "",
          VSID: "",
        }));
      }
    } catch (err: unknown) {
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
    try {
      setIsLoading(true);
      const response = await axios.post("/api/property/getPropertyByVSID", {
        VSID: VSID.trim(),
      });
      const prop: IPropertyWithOwner = response.data.data;
      setProperty(prop);
      setSelectedPropertyVSID(VSID.trim());
      console.log("property by vsid", prop);
      setVisitFormValues((prev) => ({
        ...prev,
        propertyId: prop._id,
        ownerName: prop.owner?.name || "",
        ownerEmail: prop.owner?.email || "",
        ownerPhone: prop.owner?.phone || "",
        address: `${prop.street || ""}${prop.city ? ", " + prop.city : ""}${prop.state ? ", " + prop.state : ""}${prop.country ? ", " + prop.country : ""}`,
      }));
    } catch (err) {
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
      const allAgents = await axios.get("/api/addons/agents/getAllAgents");
      setAgents(allAgents.data?.data || []);
    } catch (err) {
      console.error("unable to fetch agents");
    } finally {
      setFetchingAgents(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const pitch =
      visitFormValues.ownerCommission + visitFormValues.travellerCommission;
    const final =
      pitch -
      (visitFormValues.agentCommission + visitFormValues.documentationCharges);
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
    <div className=" flex flex-col gap-y-2">
      <div className=" flex justify-between items-center mb-2">
        <h2 className=" font-semibold text-lg">Visit Modal</h2>
        <Button variant={"outline"} onClick={onOpenChange}>
          <X />
        </Button>
      </div>

      <div className=" flex justify-between items-center gap-x-2">
        <Input
          type="text"
          placeholder="Enter VSID..."
          value={visitFormValues.VSID}
          onChange={(e) =>
            setVisitFormValues({ ...visitFormValues, VSID: e.target.value })
          }
        />
        <Button
          disabled={isLoading || !visitFormValues.VSID}
          onClick={() => getPropertyByVSID(visitFormValues.VSID)}
        >
          {isLoading ? (
            <LucideLoader2 size={18} className=" animate-spin" />
          ) : (
            <Search size={18} />
          )}
        </Button>
      </div>
      {property && (
        <div className=" text-sm flex gap-x-4">
          {property._id ? (
            <Link
              href={`https://www.vacationsaga.com/listing-stay-detail/${property._id || property.VSID}`}
              target="_blank"
            >
            <img
              src={property.propertyCoverFileUrl || (property.propertyImages && property.propertyImages.length ? property.propertyImages[0] : "/placeholder.svg")}
              className=" w-40 h-24 rounded-md"
              alt="Property"
            />
            </Link>
          ) : (
            <div className="w-40 h-24 rounded-md bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
              No preview
            </div>
          )}
          <div className=" flex flex-col p-2 gap-y-1">
            <p>
              {property.street || ""}{property.city ? ", " + property.city : ""}{property.state ? ", " + property.state : ""}{property.country ? ", " + property.country : ""}
            </p>
            <div className=" flex flex-col">
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Owner : </span>
                {property.owner?.name || "-"}
              </p>
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Phone : </span>
                {property.owner?.phone || property.phone || "-"}
              </p>
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Email : </span>
                {property.owner?.email || property.email || "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Property by Phone number */}
      <div className=" flex flex-col justify-between items-center gap-x-2">
        <div className=" flex justify-between items-center gap-x-2 w-full">
          <div className="w-full py-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              className="phone-input border-red-500"
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
          <div className="mt-6 ml-1">
            <Button
              type="button"
              onClick={getPropertiesByPhoneNumber}
              disabled={!visitFormValues.ownerPhone || isLoading}
            >
              {isLoading ? (
                <LucideLoader2 size={18} className=" animate-spin" />
              ) : (
                <Search size={18} />
              )}
            </Button>
          </div>
        </div>

        <div>
          {properties.length > 0 && (
            <ScrollArea className="whitespace-nowrap rounded-md border w-[470px]">
              <div className="flex w-max space-x-4 p-4">
                {(Array.isArray(properties) ? properties : []).map((property: IPropertyWithOwner) => {
                  const pid = property._id || property.VSID;
                  const isChecked = selectedPropertyVSID === property.VSID;
                  return (
                    <figure
                      key={pid || property.VSID}
                      className={`shrink-0 w-32 rounded-md border transition-shadow ${isChecked ? "ring-2 ring-indigo-600 shadow-lg" : "hover:shadow-md cursor-pointer"}`}
                      onClick={() => {
                        setSelectedPropertyVSID(property.VSID);
                        setVisitFormValues((prev) => ({
                          ...prev,
                          propertyId: pid,
                          VSID: property.VSID,
                          ownerName: property.owner?.name || "",
                          ownerEmail: property.owner?.email || "",
                          ownerPhone: property.owner?.phone || "",
                          address: `${property.street || ""}${property.city ? ", " + property.city : ""}`,
                        }));
                      }}
                    >
                      <div className="relative overflow-hidden rounded-md bg-gray-50">
                        <img
                          src={
                            property.propertyCoverFileUrl ||
                            (property.propertyImages && property.propertyImages.length ? property.propertyImages[0] : "/placeholder.svg")
                          }
                          alt={property.street || property.city || "Property image"}
                          className="w-full h-28 object-cover"
                        />
                        <Link
                          href={
                            property.isQuickListing
                              ? `https://www.vacationsaga.com/roomListing/${pid}`
                              : `https://www.vacationsaga.com/listing-stay-detail/${pid}`
                          }
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-1 right-1 p-1 rounded-md bg-white/80 hover:bg-white shadow-sm"
                        >
                          <ArrowRight className="w-4 h-4 text-gray-700" />
                        </Link>
                        {/* visually-hidden radio for accessibility */}
                        <Input
                          type="radio"
                          className="sr-only"
                          name={`property-${leadId}`}
                          value={property.VSID}
                          id={property.VSID}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedPropertyVSID(property.VSID);
                            setVisitFormValues((prev) => ({
                              ...prev,
                              propertyId: pid,
                              VSID: property.VSID,
                              ownerName: property.owner?.name || "",
                              ownerEmail: property.owner?.email || "",
                              ownerPhone: property.owner?.phone || "",
                              address: property.street || "",
                            }));
                          }}
                        />
                        <div className="p-2">
                          <div className="text-sm font-medium truncate">{property.owner?.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{property.street || property.city}</div>
                        </div>
                      </div>
                    </figure>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Owner Details */}
      <div className=" flex justify-between">
        <div>
          <Label>Owner Name</Label>
          <Input
            type="text"
            value={visitFormValues.ownerName}
            placeholder="Enter owner name"
            onChange={(e) => handleChange("ownerName", e.target.value)}
          />
        </div>
        <div>
          <Label>Owner Email</Label>
          <Input
            type="text"
            value={visitFormValues.ownerEmail}
            placeholder="Enter owner email"
            onChange={(e) => handleChange("ownerEmail", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Property Reference URL</Label>
        <Input
          type="text"
          value={visitFormValues.propertyUrl}
          placeholder="Enter property reference URL"
          onChange={(e) => handleChange("propertyUrl", e.target.value)}
        />
      </div>

      {/* Visit Date and Time */}
      <div className=" flex justify-between items-end">
        <div>
          <Label>Date & Time</Label>
          <Input
            type="datetime-local"
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                try {
                  const date = format(
                    new Date(value.split("T")[0]),
                    "MM/dd/yyyy",
                  );
                  const time = value.split("T")[1] || "";
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

        <div>
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
            <SelectTrigger className="w-[220px]">
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

      {/* Select Agent */}
      <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg ">
        {/* Agent Selector */}
        <div className="col-span-4">
          <Label>Agent</Label>
          <Select
            onValueChange={(value) => {
              const parts = value.split("|||");
              setVisitFormValues((prev) => ({
                ...prev,
                agentName: parts[0] || "",
                agentPhone: parts[1] || "",
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Agents</SelectLabel>
                {fetchingAgents ? (
                  <LucideLoader2 className="animate-spin mx-auto" />
                ) : (
                  (Array.isArray(agents) ? agents : []).map((agent, index) => (
                    <SelectItem
                      key={index}
                      value={`${agent.agentName}|||${agent.agentPhone}`}
                    >
                      {agent.agentName}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Owner Comm */}
        <div className="col-span-2">
          <Label>Owner Comm.</Label>
          <Input
            type="number"
            min={0}
            value={visitFormValues.ownerCommission}
            onChange={(e) =>
              handleChange(
                "ownerCommission",
                Number.parseInt(e.target.value) || 0,
              )
            }
          />
        </div>

        {/* Traveller Comm. */}
        <div className="col-span-2">
          <Label>Traveller Comm.</Label>
          <Input
            type="number"
            min={0}
            value={visitFormValues.travellerCommission}
            onChange={(e) =>
              handleChange(
                "travellerCommission",
                Number.parseInt(e.target.value) || 0,
              )
            }
          />
        </div>

        {/* Agent Commission */}
        <div className="col-span-2">
          <Label>Agent Commission</Label>
          <Input
            type="number"
            min={0}
            value={visitFormValues.agentCommission}
            onChange={(e) =>
              handleChange(
                "agentCommission",
                Number.parseInt(e.target.value) || 0,
              )
            }
          />
        </div>

        {/* Docs Charges */}
        <div className="col-span-2">
          <Label>Docs. Charges</Label>
          <Input
            type="number"
            min={0}
            value={visitFormValues.documentationCharges}
            onChange={(e) =>
              handleChange(
                "documentationCharges",
                Number.parseInt(e.target.value) || 0,
              )
            }
          />
        </div>

        {/* Pitch Amount */}
        <div className="col-span-2">
          <Label>Pitch Amount</Label>
          <Input
            type="number"
            value={visitFormValues.pitchAmount}
            disabled
            className=" cursor-not-allowed"
          />
        </div>

        {/* VS Final */}
        <div className="col-span-2">
          <Label>V.S Final</Label>
          <Input
            type="number"
            value={visitFormValues.vsFinal || 0}
            disabled
            className="cursor-not-allowed"
          />
        </div>
      </div>

      <Button onClick={handleSubmit}>
        {isLoading ? (
          <InfinityLoader className=" h-12 w-16" strokeColor="black" />
        ) : (
          "Schedule Visit"
        )}
      </Button>
    </div>
  );
};
export default VisitModal;
