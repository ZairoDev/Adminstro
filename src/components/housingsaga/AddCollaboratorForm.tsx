"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  HOUSING_COLLABORATOR_SUPPLIES,
  type HousingCollaboratorInput,
  type HousingCollaboratorSupplies,
} from "@/schemas/housingCollaborator.schema";

export type AddCollaboratorFormValues = HousingCollaboratorInput;

type AddCollaboratorFormProps = {
  onSubmit: (values: AddCollaboratorFormValues) => Promise<void> | void;
  onCancel?: () => void;
  saving?: boolean;
};

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

const EMPTY_FORM: AddCollaboratorFormValues = {
  firstName: "",
  lastName: "",
  contact: "",
  email: "",
  country: "",
  city: "",
  area: "",
  allotedArea: [],
  supplies: "buyer",
  sendContractViaEmail: false,
  password: "",
  confirmPassword: "",
};

const SUPPLIES_LABELS: Record<HousingCollaboratorSupplies, string> = {
  buyer: "Buyer",
  property: "Property",
  both: "Both",
};

export function AddCollaboratorForm({
  onSubmit,
  onCancel,
  saving = false,
}: AddCollaboratorFormProps) {
  const [form, setForm] = useState<AddCollaboratorFormValues>(EMPTY_FORM);
  const { data: areaTargets, isLoading: targetsLoading } = useAreaFilterTargets();
  const [areas, setAreas] = useState<AreaOption[]>(EMPTY_AREAS);
  const [allotedCities, setAllotedCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

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

  const locations = useMemo(() => {
    return targets
      .filter((target) => {
        if (!form.country) return true;
        return (
          String(target.country || "").trim().toLowerCase() ===
          form.country.trim().toLowerCase()
        );
      })
      .map((target) => String(target.city || "").trim())
      .filter(Boolean)
      .filter((city, index, list) => list.indexOf(city) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [targets, form.country]);

  useEffect(() => {
    let mounted = true;
    const loadCities = async () => {
      try {
        const response = await axios.get<{ data?: string[] }>(
          "/api/addons/target/getLocations?target=city",
        );
        const cities = Array.isArray(response.data?.data)
          ? response.data.data.map((city) => String(city).trim()).filter(Boolean)
          : [];
        if (mounted) setAllotedCities(cities);
      } catch {
        if (mounted) setAllotedCities([]);
      } finally {
        if (mounted) setCitiesLoading(false);
      }
    };
    void loadCities();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.city) {
      setAreas((prev) => (prev.length === 0 ? prev : EMPTY_AREAS));
      return;
    }

    const target = targets.find(
      (item) =>
        String(item.city || "").trim().toLowerCase() ===
        form.city.trim().toLowerCase(),
    );
    const nextAreas = target?.areas ?? EMPTY_AREAS;
    setAreas((prev) => (prev === nextAreas ? prev : nextAreas));
  }, [form.city, targets]);

  const updateField = <K extends keyof AddCollaboratorFormValues>(
    key: K,
    value: AddCollaboratorFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCountryChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      country: value,
      city: "",
      area: "",
    }));
    setAreas(EMPTY_AREAS);
  };

  const handleLocationChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      city: value,
      area: "",
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.country || !form.city || !form.area || form.allotedArea.length === 0) {
      return;
    }
    if (form.password !== form.confirmPassword) {
      return;
    }
    await onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      area: form.area.trim(),
      allotedArea: form.allotedArea.map((city) => city.trim()).filter(Boolean),
      supplies: form.supplies,
      sendContractViaEmail: form.sendContractViaEmail,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="hs-collab-first-name">First Name *</Label>
            <Input
              id="hs-collab-first-name"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="First name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hs-collab-last-name">Last Name *</Label>
            <Input
              id="hs-collab-last-name"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hs-collab-contact">Contact *</Label>
          <Input
            id="hs-collab-contact"
            value={form.contact}
            onChange={(e) => updateField("contact", e.target.value)}
            placeholder="Phone / contact number"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hs-collab-email">Email *</Label>
          <Input
            id="hs-collab-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="hs-collab-password">Password *</Label>
            <Input
              id="hs-collab-password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hs-collab-confirm-password">Confirm Password *</Label>
            <Input
              id="hs-collab-confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Country *</Label>
          <Select
            value={form.country || undefined}
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
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Location *</Label>
            <Select
              value={form.city || undefined}
              onValueChange={handleLocationChange}
              disabled={!form.country || locations.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !form.country
                      ? "Select country first"
                      : "Select location"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Locations</SelectLabel>
                  {locations.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Area *</Label>
            <SearchableAreaSelect
              key={`${form.country}-${form.city}`}
              areas={areas}
              onSelect={(area) => updateField("area", area.name)}
            />
            {form.city && areas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No areas for this location. Select another or add areas in
                settings.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Alloted Area *</Label>
          <Select
            value={form.allotedArea[0] || undefined}
            onValueChange={(value) => updateField("allotedArea", [value])}
            disabled={citiesLoading || allotedCities.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  citiesLoading ? "Loading areas…" : "Select area"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Areas</SelectLabel>
                {allotedCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Supplies *</Label>
          <RadioGroup
            value={form.supplies}
            onValueChange={(value) =>
              updateField("supplies", value as HousingCollaboratorSupplies)
            }
            className="flex flex-wrap gap-4"
          >
            {HOUSING_COLLABORATOR_SUPPLIES.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem
                  id={`hs-collab-supplies-${option}`}
                  value={option}
                />
                <Label
                  htmlFor={`hs-collab-supplies-${option}`}
                  className="font-normal cursor-pointer"
                >
                  {SUPPLIES_LABELS[option]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hs-collab-contract"
            checked={form.sendContractViaEmail}
            onCheckedChange={(checked) =>
              updateField("sendContractViaEmail", checked === true)
            }
          />
          <Label
            htmlFor="hs-collab-contract"
            className="font-normal cursor-pointer"
          >
            Send contract via email
          </Label>
        </div>
      </div>

      <DialogFooter className="mt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            saving ||
            !form.country ||
            !form.city ||
            !form.area ||
            form.allotedArea.length === 0
          }
        >
          {saving ? "Submitting…" : "Submit"}
        </Button>
      </DialogFooter>
    </form>
  );
}
