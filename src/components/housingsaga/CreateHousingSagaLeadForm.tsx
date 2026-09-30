"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import { isAxiosError } from "axios";
import parsePhoneNumberFromString from "libphonenumber-js";
import PhoneInput from "react-phone-number-input";
import { CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableAreaSelect from "@/app/dashboard/createquery/SearchAndSelect";
import { useAreaFilterTargets } from "@/hooks/useAreaFilterTargets";
import { useToast } from "@/hooks/use-toast";
import { apartmentTypes } from "@/app/spreadsheet/spreadsheetTable";
import {
  HOUSING_SAGA_PROPERTY_TYPES,
  type HousingSagaPropertyType,
} from "@/schemas/housingSagaQuery.schema";

type AreaOption = {
  _id: string;
  name: string;
  city?: string;
};

type TargetType = {
  _id: string;
  country?: string;
  city: string;
  areas: AreaOption[];
};

const EMPTY_AREAS: AreaOption[] = [];

function isHousingSagaPropertyType(
  value: string,
): value is HousingSagaPropertyType {
  return (HOUSING_SAGA_PROPERTY_TYPES as readonly string[]).includes(value);
}

type CreateHousingSagaLeadFormProps = {
  onCreated?: () => void;
};

export function CreateHousingSagaLeadForm({
  onCreated,
}: CreateHousingSagaLeadFormProps) {
  const { toast } = useToast();
  const { data: areaTargets, isLoading: targetsLoading } = useAreaFilterTargets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [numberStatus, setNumberStatus] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typeOfProperty, setTypeOfProperty] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [areas, setAreas] = useState<AreaOption[]>(EMPTY_AREAS);

  const targets = useMemo(
    () => (areaTargets ?? []) as unknown as TargetType[],
    [areaTargets],
  );

  const countries = useMemo(() => {
    const values = targets
      .map((target) => String(target.country || "").trim())
      .filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [targets]);

  const cities = useMemo(() => {
    return targets
      .filter((target) => {
        if (!country) return false;
        return (
          String(target.country || "").trim().toLowerCase() ===
          country.trim().toLowerCase()
        );
      })
      .map((target) => String(target.city || "").trim())
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [targets, country]);

  useEffect(() => {
    if (!city) {
      setAreas((prev) => (prev.length === 0 ? prev : EMPTY_AREAS));
      return;
    }
    const target = targets.find(
      (item) =>
        String(item.city || "").trim().toLowerCase() === city.trim().toLowerCase(),
    );
    const nextAreas = target?.areas ?? EMPTY_AREAS;
    setAreas((prev) => (prev === nextAreas ? prev : nextAreas));
  }, [city, targets]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNumberStatus("");
    setTypeOfProperty("");
    setCountry("");
    setCity("");
    setLocation("");
    setMinBudget("");
    setMaxBudget("");
    setAreas(EMPTY_AREAS);
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setCity("");
    setLocation("");
    setAreas(EMPTY_AREAS);
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setLocation("");
  };

  const handleNumberSearch = async () => {
    if (!phone) {
      setNumberStatus("Please enter a phone number.");
      return;
    }
    const parsed = parsePhoneNumberFromString(phone);
    if (!parsed || !parsed.isValid()) {
      setNumberStatus("❌ Invalid phone number.");
      return;
    }
    try {
      setChecking(true);
      const digitsOnly = parsed.number.replace("+", "");
      const response = await axios.post<{ exists?: boolean }>(
        "/api/housingsaga/queries/check-phone",
        { phoneNo: digitsOnly },
      );
      setNumberStatus(
        response.data.exists
          ? "❌ Phone number already exists."
          : "✅ Phone number is available.",
      );
    } catch {
      setNumberStatus("Error checking number");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ description: "Name and email are required" });
      return;
    }
    if (
      numberStatus === "" ||
      numberStatus === "❌ Invalid phone number." ||
      numberStatus === "❌ Phone number already exists." ||
      numberStatus === "Please enter a phone number." ||
      numberStatus === "Error checking number"
    ) {
      toast({ description: "Please check the phone number validity" });
      return;
    }
    if (!isHousingSagaPropertyType(typeOfProperty)) {
      toast({ description: "Select a type of property" });
      return;
    }
    if (!country || !city || !location) {
      toast({ description: "Country, city, and location are required" });
      return;
    }
    const parsedMinBudget = Number(minBudget);
    const parsedMaxBudget = Number(maxBudget);
    if (
      minBudget.trim() === "" ||
      maxBudget.trim() === "" ||
      !Number.isFinite(parsedMinBudget) ||
      !Number.isFinite(parsedMaxBudget) ||
      parsedMinBudget < 0 ||
      parsedMaxBudget < 0
    ) {
      toast({ description: "Minimum and maximum budget are required" });
      return;
    }
    if (parsedMaxBudget < parsedMinBudget) {
      toast({ description: "Maximum budget must be at least the minimum budget" });
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(phone);
    if (!parsedPhone || !parsedPhone.isValid()) {
      toast({ description: "Please enter a valid phone number" });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post("/api/housingsaga/queries", {
        name: name.trim(),
        email: email.trim(),
        phoneNo: parsedPhone.number.replace("+", ""),
        typeOfProperty,
        country: country.trim(),
        city: city.trim(),
        location: location.trim(),
        minBudget: parsedMinBudget,
        maxBudget: parsedMaxBudget,
      });
      toast({ description: "Housing Saga lead created" });
      resetForm();
      onCreated?.();
    } catch (error: unknown) {
      const description = isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error || "Something went wrong"
        : "Something went wrong";
      toast({ variant: "destructive", description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <PhoneInput
                  className="phone-input w-full"
                  placeholder="Enter phone number"
                  value={phone}
                  international
                  countryCallingCodeEditable={false}
                  onChange={(value) => {
                    setPhone(value || "");
                    setNumberStatus("");
                  }}
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
              <p className="text-xs text-muted-foreground">{numberStatus}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Budget</Label>
              <Input
                type="number"
                min={0}
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="Minimum budget"
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Budget</Label>
              <Input
                type="number"
                min={0}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="Maximum budget"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type of Property</Label>
            <Select value={typeOfProperty} onValueChange={setTypeOfProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {apartmentTypes.map((propertyType) => (
                  <SelectItem key={propertyType.value} value={propertyType.value}>
                    {propertyType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={country || undefined}
              onValueChange={handleCountryChange}
              disabled={targetsLoading || countries.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    targetsLoading ? "Loading countries…" : "Select country"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Countries</SelectLabel>
                  {countries.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={city || undefined}
                onValueChange={handleCityChange}
                disabled={!country || cities.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={!country ? "Select country first" : "Select city"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Cities</SelectLabel>
                    {cities.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <SearchableAreaSelect
                key={`${country}-${city}`}
                areas={areas}
                onSelect={(area) => setLocation(area.name)}
              />
              {city && areas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No locations for this city. Select another or add areas in
                  settings.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-4 border-t bg-muted/10 shrink-0">
        <DialogFooter>
          <Button
            className="w-full sm:w-auto"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit Lead"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
