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
  // commission: number;
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
  // open,
  onOpenChange,
}: {
  leadId: string;
  // open: boolean;
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

  // const [VSID, setVSID] = useState("");
  const [property, setProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<PropertyByPhone[]>([]);

  const [agents, setAgents] = useState<AgentsInterface[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (
        visitFormValues.ownerCommission === 0 &&
        visitFormValues.travellerCommission === 0
      ) {
        toast({ title: "Traveller and Owner Commission cannot be zero" });
        return;
      }
      await axios.post("/api/visits/addVisit", visitFormValues);
      toast({ title: "Visit scheduled successfully" });
    } catch (err) {
      toast({ title: "Unable to schedule visit", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // const updateMessageStatus

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
      setProperties(response.data);
    } catch (err: unknown) {
      setProperties([]);
      toast({
        title: "Error",
        description: "Proeprty does not exist for this phone number",
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
      setProperty(response.data.data);
      setVisitFormValues((prev) => ({
        ...prev,
        propertyId: response.data.data._id,
        ownerName: response.data.data.ownerName,
        ownerEmail: response.data.data.email,
        ownerPhone: response.data.data.phone,
        address: `${response.data.data.street}, ${response.data.data.city}, ${response.data.data.state}, ${response.data.data.country}`,
      }));
    } catch (err) {
      toast({
        title: "Error",
        description: "Proeprty does not exist for this VSID",
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
      setAgents(allAgents.data.data);
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
        <div className=" text-sm flex    gap-x-4">
          <Link
            href={`https://www.vacationsaga.com/listing-stay-detail/${property._id}`}
            target="_blank"
          >
            <img
              src={property.propertyCoverFileUrl}
              className=" w-40 h-24 rounded-md"
            />
          </Link>
          <div className=" flex flex-col p-2 gap-y-1">
            <p>
              {property.street}, {property.city}, {property.state},{" "}
              {property.country}
            </p>
            <div className=" flex flex-col">
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Owner : </span>
                {property.ownerName}
              </p>
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Phone : </span>
                {property.phone}
              </p>
              <p className=" text-xs">
                <span className=" text-sm font-semibold">Email : </span>
                {property.email}
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
              // error={"Phone number required"}
              onChange={(value) =>
                setVisitFormValues((prev) => ({
                  ...prev,
                  ownerPhone: value.toString(),
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
                {properties?.map((property) => {
                  return (
                    <figure key={property.propertyId} className="shrink-0">
                      <div className="overflow-hidden rounded-md relative border border-white">
                        <Link
                          href={{
                            pathname: property.isQuickListing
                              ? `https://www.vacationsaga.com/roomListing/${property.propertyId}`
                              : `https://www.vacationsaga.com/listing-stay-detail/${property.propertyId}`,
                          }}
                          target="_blank"
                        >
                          <img
                            src={property?.propertyImages[0]}
                            alt={`availableImages`}
                            className=" w-28 h-28 cursor-pointer"
                          />
                        </Link>
                        <Input
                          type="radio"
                          className=" w-5 absolute bottom-0 right-1"
                          name="property"
                          value={property.VSID}
                          id={property.VSID}
                          onChange={() =>
                            setVisitFormValues({
                              ...visitFormValues,
                              propertyId: property.propertyId,
                              VSID: property.VSID,
                              ownerName: property.ownerName,
                              ownerEmail: property.ownerEmail,
                              address: property.address,
                            })
                          }
                        />
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
              const date = format(e.target.value.split("T")[0], "MM/dd/yyyy");
              const time = e.target.value.split("T")[1];
              setVisitFormValues((prev) => ({
                ...prev,
                schedule: [{ date, time }],
              }));
            }}
          />
        </div>

        <div>
          <Label>Visit Type</Label>
          <Select>
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
      onValueChange={(value) =>
        setVisitFormValues((prev) => ({
          ...prev,
          agentName: value.split("-")[0],
          agentPhone: value.split("-")[1],
        }))
      }
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
            agents.map((agent, index) => (
              <SelectItem
                key={index}
                value={`${agent.agentName}-${agent.agentPhone}`}
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
        handleChange("ownerCommission", parseInt(e.target.value) || 0)
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
        handleChange("travellerCommission", parseInt(e.target.value) || 0)
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
        handleChange("agentCommission", parseInt(e.target.value) || 0)
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
        handleChange("documentationCharges", parseInt(e.target.value) || 0)
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
