"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ScrollText, RefreshCcw } from "lucide-react";
import type { EmployeeInterface } from "@/util/type";
import { apartmentTypes } from "@/app/spreadsheet/spreadsheetTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { interiorStatus as ownerInteriorStatuses } from "@/app/spreadsheet/constants/apartmentTypes";

type EmployeeRow = Pick<EmployeeInterface, "_id" | "name" | "email" | "role"> & {
  uiRuleIds?: string[];
  isActive?: boolean;
  allotedArea?: string | string[];
  pricingRule?: {
    enabled?: boolean;
    min?: number | null;
    max?: number | null;
  };
  pricingRules?: {
    all?: { enabled?: boolean; min?: number | null; max?: number | null };
    byLocation?: Record<
      string,
      { enabled?: boolean; min?: number | null; max?: number | null }
    >;
  };
  propertyVisibilityRule?: {
    enabled?: boolean;
    allowedFurnishing?: string[];
    allowedTypeOfProperty?: string[];
  };
  propertyVisibilityRules?: {
    all?: {
      enabled?: boolean;
      allowedFurnishing?: string[];
      allowedTypeOfProperty?: string[];
    };
    byLocation?: Record<
      string,
      {
        enabled?: boolean;
        allowedFurnishing?: string[];
        allowedTypeOfProperty?: string[];
      }
    >;
  };
  guestLeadLocationBlock?: {
    all?: string[];
  };
  ownerPricingRules?: {
    all?: { enabled?: boolean; min?: number | null; max?: number | null };
    byLocation?: Record<string, { enabled?: boolean; min?: number | null; max?: number | null }>;
  };
  ownerVisibilityRules?: {
    all?: {
      enabled?: boolean;
      allowedInteriorStatus?: string[];
      allowedPropertyType?: string[];
      allowedPetStatus?: string[];
    };
    byLocation?: Record<
      string,
      {
        enabled?: boolean;
        allowedInteriorStatus?: string[];
        allowedPropertyType?: string[];
        allowedPetStatus?: string[];
      }
    >;
  };
  ownerLocationBlock?: {
    all?: string[];
  };
};

type UiRule = {
  _id: string;
  name: string;
  description?: string;
  flags?: {
    hideGuestManagement?: boolean;
    hideOwnerManagement?: boolean;
  };
};

export default function AddRulePage() {
  const { toast } = useToast();

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [rules, setRules] = useState<UiRule[]>([]);
  const [query, setQuery] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const selectedRule = useMemo(
    () => rules.find((r) => r._id === selectedRuleId) || null,
    [rules, selectedRuleId],
  );

  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<Set<string>>(
    new Set(),
  );
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Pricing rule state (per employee)
  const [pricingEmployeeId, setPricingEmployeeId] = useState<string>("");
  const [pricingLocation, setPricingLocation] = useState<string>("All");
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [pricingMin, setPricingMin] = useState<string>("");
  const [pricingMax, setPricingMax] = useState<string>("");
  const [savingPricingRule, setSavingPricingRule] = useState(false);

  // Property visibility rule state (per employee)
  const [visibilityEmployeeId, setVisibilityEmployeeId] = useState<string>("");
  const [visibilityLocation, setVisibilityLocation] = useState<string>("All");
  const [visibilityEnabled, setVisibilityEnabled] = useState(false);
  const [allowedFurnishing, setAllowedFurnishing] = useState<string[]>([]);
  const [allowedTypeOfProperty, setAllowedTypeOfProperty] = useState<string[]>([]);
  const [savingVisibilityRule, setSavingVisibilityRule] = useState(false);

  // Guest lead location block (per employee)
  const [blockEmployeeId, setBlockEmployeeId] = useState<string>("");
  const [blockedLocations, setBlockedLocations] = useState<string[]>([]);
  const [savingBlockedLocations, setSavingBlockedLocations] = useState(false);

  // Owner pricing rule state (per employee)
  const [ownerPricingEmployeeId, setOwnerPricingEmployeeId] = useState<string>("");
  const [ownerPricingLocation, setOwnerPricingLocation] = useState<string>("All");
  const [ownerPricingEnabled, setOwnerPricingEnabled] = useState(false);
  const [ownerPricingMin, setOwnerPricingMin] = useState<string>("");
  const [ownerPricingMax, setOwnerPricingMax] = useState<string>("");
  const [savingOwnerPricingRule, setSavingOwnerPricingRule] = useState(false);

  // Owner visibility rule state (per employee)
  const [ownerVisibilityEmployeeId, setOwnerVisibilityEmployeeId] = useState<string>("");
  const [ownerVisibilityLocation, setOwnerVisibilityLocation] = useState<string>("All");
  const [ownerVisibilityEnabled, setOwnerVisibilityEnabled] = useState(false);
  const [allowedOwnerInteriorStatus, setAllowedOwnerInteriorStatus] = useState<string[]>([]);
  const [allowedOwnerPropertyType, setAllowedOwnerPropertyType] = useState<string[]>([]);
  const [allowedOwnerPetStatus, setAllowedOwnerPetStatus] = useState<string[]>([]);
  const [savingOwnerVisibilityRule, setSavingOwnerVisibilityRule] = useState(false);

  // Owner location block (per employee)
  const [ownerBlockEmployeeId, setOwnerBlockEmployeeId] = useState<string>("");
  const [ownerBlockedLocations, setOwnerBlockedLocations] = useState<string[]>([]);
  const [savingOwnerBlockedLocations, setSavingOwnerBlockedLocations] = useState(false);

  const clearBlockedLocationsForEmployee = async (employeeId: string) => {
    try {
      setSavingBlockedLocations(true);
      await axios.put("/api/employee/guest-lead-location-block", {
        employeeId,
        blockedLocations: [],
      });
      if (blockEmployeeId === employeeId) setBlockedLocations([]);
      await fetchEmployees();
      toast({
        title: "Cleared blocked locations",
        description: "Guest lead location hide removed for this employee.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to clear blocked locations.",
      });
    } finally {
      setSavingBlockedLocations(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await axios.get("/api/employee/getAllEmployee");
      const list = (res?.data?.allEmployees || []) as any[];
      setEmployees(
        list.map((e) => ({
          _id: String(e._id),
          name: e.name ?? "",
          email: e.email ?? "",
          role: e.role as any,
          isActive: e.isActive !== false,
          allotedArea: e.allotedArea,
          pricingRule: e.pricingRule ?? undefined,
          pricingRules: e.pricingRules ?? undefined,
          propertyVisibilityRule: e.propertyVisibilityRule ?? undefined,
          propertyVisibilityRules: e.propertyVisibilityRules ?? undefined,
          guestLeadLocationBlock: e.guestLeadLocationBlock ?? undefined,
          ownerPricingRules: e.ownerPricingRules ?? undefined,
          ownerVisibilityRules: e.ownerVisibilityRules ?? undefined,
          ownerLocationBlock: e.ownerLocationBlock ?? undefined,
          uiRuleIds: Array.isArray(e.uiRuleIds)
            ? e.uiRuleIds.map((x: any) => String(x))
            : [],
        })),
      );
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load employees.",
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const res = await axios.get("/api/employee-ui-rules");
      const list = (res?.data?.rules || []) as any[];
      setRules(
        list.map((r) => ({
          _id: String(r._id),
          name: String(r.name || ""),
          description: r.description ?? "",
          flags: {
            hideGuestManagement: Boolean(r?.flags?.hideGuestManagement),
            hideOwnerManagement: Boolean(r?.flags?.hideOwnerManagement),
          },
        })),
      );
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load rules.",
      });
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const hay = `${e.name} ${e.email} ${Array.isArray(e.role) ? e.role.join(" ") : e.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, query]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees],
  );

  const employeesWithBlockedGuestLocations = useMemo(() => {
    const rows: { employeeId: string; name: string; email: string; blocked: string[] }[] = [];
    for (const e of activeEmployees) {
      const b = Array.isArray(e.guestLeadLocationBlock?.all)
        ? e.guestLeadLocationBlock!.all!.map((x) => String(x))
        : [];
      if (b.length) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          blocked: b,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEmployees]);

  const employeesWithActivePricingRule = useMemo(() => {
    const rows: {
      employeeId: string;
      name: string;
      email: string;
      location: string;
      min: number | null;
      max: number | null;
    }[] = [];

    for (const e of activeEmployees) {
      const all = e.pricingRules?.all;
      if (all?.enabled) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          location: "All",
          min: all.min ?? null,
          max: all.max ?? null,
        });
      }
      const byLoc = e.pricingRules?.byLocation || {};
      for (const [locKey, rule] of Object.entries(byLoc)) {
        if (rule?.enabled) {
          rows.push({
            employeeId: e._id,
            name: e.name || "",
            email: e.email || "",
            location: locKey,
            min: rule.min ?? null,
            max: rule.max ?? null,
          });
        }
      }
    }

    return rows.sort((a, b) =>
      `${a.name}-${a.location}`.localeCompare(`${b.name}-${b.location}`),
    );
  }, [activeEmployees]);

  const employeesWithActiveVisibilityRule = useMemo(() => {
    const rows: {
      employeeId: string;
      name: string;
      email: string;
      location: string;
      furnishing: string[];
      typeCount: number;
    }[] = [];

    for (const e of activeEmployees) {
      const all = e.propertyVisibilityRules?.all;
      if (all?.enabled) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          location: "All",
          furnishing: all.allowedFurnishing || [],
          typeCount: (all.allowedTypeOfProperty || []).length,
        });
      }
      const byLoc = e.propertyVisibilityRules?.byLocation || {};
      for (const [locKey, rule] of Object.entries(byLoc)) {
        if (rule?.enabled) {
          rows.push({
            employeeId: e._id,
            name: e.name || "",
            email: e.email || "",
            location: locKey,
            furnishing: rule.allowedFurnishing || [],
            typeCount: (rule.allowedTypeOfProperty || []).length,
          });
        }
      }
    }

    return rows.sort((a, b) =>
      `${a.name}-${a.location}`.localeCompare(`${b.name}-${b.location}`),
    );
  }, [activeEmployees]);

  const employeesWithBlockedOwnerLocations = useMemo(() => {
    const rows: { employeeId: string; name: string; email: string; blocked: string[] }[] = [];
    for (const e of activeEmployees) {
      const b = Array.isArray(e.ownerLocationBlock?.all)
        ? e.ownerLocationBlock!.all!.map((x) => String(x))
        : [];
      if (b.length) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          blocked: b,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEmployees]);

  const employeesWithActiveOwnerPricingRule = useMemo(() => {
    const rows: {
      employeeId: string;
      name: string;
      email: string;
      location: string;
      min: number | null;
      max: number | null;
    }[] = [];

    for (const e of activeEmployees) {
      const all = e.ownerPricingRules?.all;
      if (all?.enabled) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          location: "All",
          min: all.min ?? null,
          max: all.max ?? null,
        });
      }
      const byLoc = e.ownerPricingRules?.byLocation || {};
      for (const [locKey, rule] of Object.entries(byLoc)) {
        if (rule?.enabled) {
          rows.push({
            employeeId: e._id,
            name: e.name || "",
            email: e.email || "",
            location: locKey,
            min: rule.min ?? null,
            max: rule.max ?? null,
          });
        }
      }
    }

    return rows.sort((a, b) => `${a.name}-${a.location}`.localeCompare(`${b.name}-${b.location}`));
  }, [activeEmployees]);

  const employeesWithActiveOwnerVisibilityRule = useMemo(() => {
    const rows: {
      employeeId: string;
      name: string;
      email: string;
      location: string;
      interiorCount: number;
      propertyTypeCount: number;
      petCount: number;
    }[] = [];

    for (const e of activeEmployees) {
      const all = e.ownerVisibilityRules?.all;
      if (all?.enabled) {
        rows.push({
          employeeId: e._id,
          name: e.name || "",
          email: e.email || "",
          location: "All",
          interiorCount: (all.allowedInteriorStatus || []).length,
          propertyTypeCount: (all.allowedPropertyType || []).length,
          petCount: (all.allowedPetStatus || []).length,
        });
      }
      const byLoc = e.ownerVisibilityRules?.byLocation || {};
      for (const [locKey, rule] of Object.entries(byLoc)) {
        if (rule?.enabled) {
          rows.push({
            employeeId: e._id,
            name: e.name || "",
            email: e.email || "",
            location: locKey,
            interiorCount: (rule.allowedInteriorStatus || []).length,
            propertyTypeCount: (rule.allowedPropertyType || []).length,
            petCount: (rule.allowedPetStatus || []).length,
          });
        }
      }
    }

    return rows.sort((a, b) => `${a.name}-${a.location}`.localeCompare(`${b.name}-${b.location}`));
  }, [activeEmployees]);

  const eligibleEmployeesForNewVisibilityRule = useMemo(() => {
    return activeEmployees.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [activeEmployees]);

  const eligibleEmployeesForNewPricingRule = useMemo(() => {
    return activeEmployees.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [activeEmployees]);

  const selectedPricingEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === pricingEmployeeId) || null,
    [activeEmployees, pricingEmployeeId],
  );

  const selectedOwnerPricingEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === ownerPricingEmployeeId) || null,
    [activeEmployees, ownerPricingEmployeeId],
  );

  const selectedPricingEmployeeLocations = useMemo(() => {
    const areas = selectedPricingEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedPricingEmployee?.allotedArea]);

  const selectedOwnerPricingEmployeeLocations = useMemo(() => {
    const areas = selectedOwnerPricingEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedOwnerPricingEmployee?.allotedArea]);

  const availablePricingLocationsForEmployee = useMemo(() => {
    const opts: string[] = [];
    const allEnabled = Boolean(selectedPricingEmployee?.pricingRules?.all?.enabled);
    if (!allEnabled) opts.push("All");
    const byLoc = selectedPricingEmployee?.pricingRules?.byLocation || {};
    for (const loc of selectedPricingEmployeeLocations) {
      const key = loc.toLowerCase();
      if (!byLoc[key]?.enabled) opts.push(loc);
    }
    return opts;
  }, [selectedPricingEmployee?.pricingRules, selectedPricingEmployeeLocations]);

  const availableOwnerPricingLocationsForEmployee = useMemo(() => {
    const opts: string[] = [];
    const allEnabled = Boolean(selectedOwnerPricingEmployee?.ownerPricingRules?.all?.enabled);
    if (!allEnabled) opts.push("All");
    const byLoc = selectedOwnerPricingEmployee?.ownerPricingRules?.byLocation || {};
    for (const loc of selectedOwnerPricingEmployeeLocations) {
      const key = loc.toLowerCase();
      if (!byLoc[key]?.enabled) opts.push(loc);
    }
    return opts;
  }, [selectedOwnerPricingEmployee?.ownerPricingRules, selectedOwnerPricingEmployeeLocations]);

  const selectedVisibilityEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === visibilityEmployeeId) || null,
    [activeEmployees, visibilityEmployeeId],
  );

  const selectedOwnerVisibilityEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === ownerVisibilityEmployeeId) || null,
    [activeEmployees, ownerVisibilityEmployeeId],
  );

  const selectedBlockEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === blockEmployeeId) || null,
    [activeEmployees, blockEmployeeId],
  );

  const selectedOwnerBlockEmployee = useMemo(
    () => activeEmployees.find((e) => e._id === ownerBlockEmployeeId) || null,
    [activeEmployees, ownerBlockEmployeeId],
  );

  const selectedBlockEmployeeLocations = useMemo(() => {
    const areas = selectedBlockEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, [selectedBlockEmployee?.allotedArea]);

  const selectedOwnerBlockEmployeeLocations = useMemo(() => {
    const areas = selectedOwnerBlockEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, [selectedOwnerBlockEmployee?.allotedArea]);

  useEffect(() => {
    if (!selectedBlockEmployee) return;
    const existing = Array.isArray(selectedBlockEmployee.guestLeadLocationBlock?.all)
      ? selectedBlockEmployee.guestLeadLocationBlock!.all!.map((x) => String(x).toLowerCase())
      : [];
    setBlockedLocations(existing);
  }, [selectedBlockEmployee]);

  useEffect(() => {
    if (!selectedOwnerBlockEmployee) return;
    const existing = Array.isArray(selectedOwnerBlockEmployee.ownerLocationBlock?.all)
      ? selectedOwnerBlockEmployee.ownerLocationBlock!.all!.map((x) => String(x).toLowerCase())
      : [];
    setOwnerBlockedLocations(existing);
  }, [selectedOwnerBlockEmployee]);

  const selectedVisibilityEmployeeLocations = useMemo(() => {
    const areas = selectedVisibilityEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedVisibilityEmployee?.allotedArea]);

  const selectedOwnerVisibilityEmployeeLocations = useMemo(() => {
    const areas = selectedOwnerVisibilityEmployee?.allotedArea;
    if (!areas) return [];
    if (Array.isArray(areas)) return areas.map(String).map((s) => s.trim()).filter(Boolean);
    return String(areas)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedOwnerVisibilityEmployee?.allotedArea]);

  const availableVisibilityLocationsForEmployee = useMemo(() => {
    const opts: string[] = [];
    const allEnabled = Boolean(selectedVisibilityEmployee?.propertyVisibilityRules?.all?.enabled);
    if (!allEnabled) opts.push("All");
    const byLoc = selectedVisibilityEmployee?.propertyVisibilityRules?.byLocation || {};
    for (const loc of selectedVisibilityEmployeeLocations) {
      const key = loc.toLowerCase();
      if (!byLoc[key]?.enabled) opts.push(loc);
    }
    return opts;
  }, [selectedVisibilityEmployee?.propertyVisibilityRules, selectedVisibilityEmployeeLocations]);

  const availableOwnerVisibilityLocationsForEmployee = useMemo(() => {
    const opts: string[] = [];
    const allEnabled = Boolean(selectedOwnerVisibilityEmployee?.ownerVisibilityRules?.all?.enabled);
    if (!allEnabled) opts.push("All");
    const byLoc = selectedOwnerVisibilityEmployee?.ownerVisibilityRules?.byLocation || {};
    for (const loc of selectedOwnerVisibilityEmployeeLocations) {
      const key = loc.toLowerCase();
      if (!byLoc[key]?.enabled) opts.push(loc);
    }
    return opts;
  }, [selectedOwnerVisibilityEmployee?.ownerVisibilityRules, selectedOwnerVisibilityEmployeeLocations]);

  useEffect(() => {
    if (!selectedVisibilityEmployee) return;
    setVisibilityLocation("All");
    const rule = selectedVisibilityEmployee.propertyVisibilityRules?.all;
    setVisibilityEnabled(Boolean(rule?.enabled));
    setAllowedFurnishing(Array.isArray(rule?.allowedFurnishing) ? rule!.allowedFurnishing! : []);
    setAllowedTypeOfProperty(Array.isArray(rule?.allowedTypeOfProperty) ? rule!.allowedTypeOfProperty! : []);
  }, [selectedVisibilityEmployee]);

  useEffect(() => {
    if (!selectedOwnerVisibilityEmployee) return;
    setOwnerVisibilityLocation("All");
    const rule = selectedOwnerVisibilityEmployee.ownerVisibilityRules?.all;
    setOwnerVisibilityEnabled(Boolean(rule?.enabled));
    setAllowedOwnerInteriorStatus(
      Array.isArray(rule?.allowedInteriorStatus) ? rule!.allowedInteriorStatus!.map(String) : [],
    );
    setAllowedOwnerPropertyType(
      Array.isArray(rule?.allowedPropertyType) ? rule!.allowedPropertyType!.map(String) : [],
    );
    setAllowedOwnerPetStatus(
      Array.isArray(rule?.allowedPetStatus) ? rule!.allowedPetStatus!.map(String) : [],
    );
  }, [selectedOwnerVisibilityEmployee]);

  useEffect(() => {
    if (!selectedVisibilityEmployee) return;
    const loc = visibilityLocation;
    const rule =
      loc === "All"
        ? selectedVisibilityEmployee.propertyVisibilityRules?.all
        : selectedVisibilityEmployee.propertyVisibilityRules?.byLocation?.[loc.toLowerCase()];
    setVisibilityEnabled(Boolean(rule?.enabled));
    setAllowedFurnishing(Array.isArray(rule?.allowedFurnishing) ? rule!.allowedFurnishing! : []);
    setAllowedTypeOfProperty(Array.isArray(rule?.allowedTypeOfProperty) ? rule!.allowedTypeOfProperty! : []);
  }, [visibilityLocation, selectedVisibilityEmployee]);

  useEffect(() => {
    if (!selectedOwnerVisibilityEmployee) return;
    const loc = ownerVisibilityLocation;
    const rule =
      loc === "All"
        ? selectedOwnerVisibilityEmployee.ownerVisibilityRules?.all
        : selectedOwnerVisibilityEmployee.ownerVisibilityRules?.byLocation?.[loc.toLowerCase()];
    setOwnerVisibilityEnabled(Boolean(rule?.enabled));
    setAllowedOwnerInteriorStatus(
      Array.isArray(rule?.allowedInteriorStatus) ? rule!.allowedInteriorStatus!.map(String) : [],
    );
    setAllowedOwnerPropertyType(
      Array.isArray(rule?.allowedPropertyType) ? rule!.allowedPropertyType!.map(String) : [],
    );
    setAllowedOwnerPetStatus(
      Array.isArray(rule?.allowedPetStatus) ? rule!.allowedPetStatus!.map(String) : [],
    );
  }, [ownerVisibilityLocation, selectedOwnerVisibilityEmployee]);

  useEffect(() => {
    if (!selectedPricingEmployee) return;
    // default to All on employee change
    setPricingLocation("All");
    const rule = selectedPricingEmployee.pricingRules?.all;
    setPricingEnabled(Boolean(rule?.enabled));
    setPricingMin(rule?.min === null || rule?.min === undefined ? "" : String(rule.min));
    setPricingMax(rule?.max === null || rule?.max === undefined ? "" : String(rule.max));
  }, [selectedPricingEmployee]);

  useEffect(() => {
    if (!selectedOwnerPricingEmployee) return;
    setOwnerPricingLocation("All");
    const rule = selectedOwnerPricingEmployee.ownerPricingRules?.all;
    setOwnerPricingEnabled(Boolean(rule?.enabled));
    setOwnerPricingMin(rule?.min === null || rule?.min === undefined ? "" : String(rule.min));
    setOwnerPricingMax(rule?.max === null || rule?.max === undefined ? "" : String(rule.max));
  }, [selectedOwnerPricingEmployee]);

  useEffect(() => {
    if (!selectedPricingEmployee) return;
    const loc = pricingLocation;
    const rule =
      loc === "All"
        ? selectedPricingEmployee.pricingRules?.all
        : selectedPricingEmployee.pricingRules?.byLocation?.[loc.toLowerCase()];
    setPricingEnabled(Boolean(rule?.enabled));
    setPricingMin(rule?.min === null || rule?.min === undefined ? "" : String(rule.min));
    setPricingMax(rule?.max === null || rule?.max === undefined ? "" : String(rule.max));
  }, [pricingLocation, selectedPricingEmployee]);

  useEffect(() => {
    if (!selectedOwnerPricingEmployee) return;
    const loc = ownerPricingLocation;
    const rule =
      loc === "All"
        ? selectedOwnerPricingEmployee.ownerPricingRules?.all
        : selectedOwnerPricingEmployee.ownerPricingRules?.byLocation?.[loc.toLowerCase()];
    setOwnerPricingEnabled(Boolean(rule?.enabled));
    setOwnerPricingMin(rule?.min === null || rule?.min === undefined ? "" : String(rule.min));
    setOwnerPricingMax(rule?.max === null || rule?.max === undefined ? "" : String(rule.max));
  }, [ownerPricingLocation, selectedOwnerPricingEmployee]);

  const savePricingRule = async () => {
    if (!pricingEmployeeId) return;
    try {
      setSavingPricingRule(true);
      await axios.put("/api/employee/pricing-rule", {
        employeeId: pricingEmployeeId,
        location: pricingLocation,
        enabled: pricingEnabled,
        min: pricingMin === "" ? null : Number(pricingMin),
        max: pricingMax === "" ? null : Number(pricingMax),
      });
      await fetchEmployees();
      toast({
        title: "Pricing rule saved",
        description: "This will be enforced server-side on all lead lists.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save pricing rule.",
      });
    } finally {
      setSavingPricingRule(false);
    }
  };

  const removePricingRuleFromEmployee = async (employeeId: string) => {
    try {
      setSavingPricingRule(true);
      await axios.put("/api/employee/pricing-rule", {
        employeeId,
        location: "All",
        enabled: false,
        min: null,
        max: null,
      });
      // If we were editing the same employee, clear selection so dropdown behaves nicely
      if (pricingEmployeeId === employeeId) {
        setPricingEmployeeId("");
        setPricingEnabled(false);
        setPricingMin("");
        setPricingMax("");
      }
      await fetchEmployees();
      toast({
        title: "Pricing rule removed",
        description: "Employee can now be selected again from the dropdown.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove pricing rule.",
      });
    } finally {
      setSavingPricingRule(false);
    }
  };

  const removePricingRuleFromEmployeeAtLocation = async (
    employeeId: string,
    location: string,
  ) => {
    try {
      setSavingPricingRule(true);
      await axios.put("/api/employee/pricing-rule", {
        employeeId,
        location,
        enabled: false,
        min: null,
        max: null,
      });
      await fetchEmployees();
      toast({
        title: "Pricing rule removed",
        description: "Rule disabled for that location.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove pricing rule.",
      });
    } finally {
      setSavingPricingRule(false);
    }
  };

  const toggleInList = (list: string[], value: string) => {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  };

  const saveVisibilityRule = async () => {
    if (!visibilityEmployeeId) return;
    try {
      setSavingVisibilityRule(true);
      await axios.put("/api/employee/property-visibility-rule", {
        employeeId: visibilityEmployeeId,
        location: visibilityLocation,
        enabled: visibilityEnabled,
        allowedFurnishing,
        allowedTypeOfProperty,
      });
      await fetchEmployees();
      toast({
        title: "Visibility rule saved",
        description: "This will be enforced server-side on all lead lists.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save visibility rule.",
      });
    } finally {
      setSavingVisibilityRule(false);
    }
  };

  const saveBlockedLocationsRule = async () => {
    if (!blockEmployeeId) return;
    try {
      setSavingBlockedLocations(true);
      await axios.put("/api/employee/guest-lead-location-block", {
        employeeId: blockEmployeeId,
        blockedLocations,
      });
      await fetchEmployees();
      toast({
        title: "Lead locations updated",
        description: "Guest Management lead lists will hide the blocked locations.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to update blocked locations.",
      });
    } finally {
      setSavingBlockedLocations(false);
    }
  };

  const saveOwnerPricingRule = async () => {
    if (!ownerPricingEmployeeId) return;
    try {
      setSavingOwnerPricingRule(true);
      await axios.put("/api/employee/owner-pricing-rule", {
        employeeId: ownerPricingEmployeeId,
        location: ownerPricingLocation,
        enabled: ownerPricingEnabled,
        min: ownerPricingMin === "" ? null : Number(ownerPricingMin),
        max: ownerPricingMax === "" ? null : Number(ownerPricingMax),
      });
      await fetchEmployees();
      toast({
        title: "Owner pricing rule saved",
        description: "This will be enforced server-side on Owner Sheet lists.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save owner pricing rule.",
      });
    } finally {
      setSavingOwnerPricingRule(false);
    }
  };

  const saveOwnerVisibilityRule = async () => {
    if (!ownerVisibilityEmployeeId) return;
    try {
      setSavingOwnerVisibilityRule(true);
      await axios.put("/api/employee/owner-visibility-rule", {
        employeeId: ownerVisibilityEmployeeId,
        location: ownerVisibilityLocation,
        enabled: ownerVisibilityEnabled,
        allowedInteriorStatus: allowedOwnerInteriorStatus,
        allowedPropertyType: allowedOwnerPropertyType,
        allowedPetStatus: allowedOwnerPetStatus,
      });
      await fetchEmployees();
      toast({
        title: "Owner visibility rule saved",
        description: "This will be enforced server-side on Owner Sheet lists.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save owner visibility rule.",
      });
    } finally {
      setSavingOwnerVisibilityRule(false);
    }
  };

  const saveOwnerBlockedLocationsRule = async () => {
    if (!ownerBlockEmployeeId) return;
    try {
      setSavingOwnerBlockedLocations(true);
      await axios.put("/api/employee/owner-location-block", {
        employeeId: ownerBlockEmployeeId,
        blockedLocations: ownerBlockedLocations,
      });
      await fetchEmployees();
      toast({
        title: "Owner locations updated",
        description: "Owner Sheet lists will hide the blocked locations for this employee.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to update owner blocked locations.",
      });
    } finally {
      setSavingOwnerBlockedLocations(false);
    }
  };

  const removeVisibilityRuleFromEmployee = async (employeeId: string) => {
    try {
      setSavingVisibilityRule(true);
      await axios.put("/api/employee/property-visibility-rule", {
        employeeId,
        location: "All",
        enabled: false,
        allowedFurnishing: [],
        allowedTypeOfProperty: [],
      });
      if (visibilityEmployeeId === employeeId) {
        setVisibilityEmployeeId("");
        setVisibilityEnabled(false);
        setAllowedFurnishing([]);
        setAllowedTypeOfProperty([]);
      }
      await fetchEmployees();
      toast({
        title: "Visibility rule removed",
        description: "Employee can now be selected again from the dropdown.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove visibility rule.",
      });
    } finally {
      setSavingVisibilityRule(false);
    }
  };

  const removeVisibilityRuleFromEmployeeAtLocation = async (employeeId: string, location: string) => {
    try {
      setSavingVisibilityRule(true);
      await axios.put("/api/employee/property-visibility-rule", {
        employeeId,
        location,
        enabled: false,
        allowedFurnishing: [],
        allowedTypeOfProperty: [],
      });
      await fetchEmployees();
      toast({
        title: "Visibility rule removed",
        description: "Rule disabled for that location.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove visibility rule.",
      });
    } finally {
      setSavingVisibilityRule(false);
    }
  };

  const removeOwnerPricingRuleFromEmployeeAtLocation = async (
    employeeId: string,
    location: string,
  ) => {
    try {
      setSavingOwnerPricingRule(true);
      await axios.put("/api/employee/owner-pricing-rule", {
        employeeId,
        location,
        enabled: false,
        min: null,
        max: null,
      });
      await fetchEmployees();
      toast({
        title: "Owner pricing rule removed",
        description: "Rule disabled for that location.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove owner pricing rule.",
      });
    } finally {
      setSavingOwnerPricingRule(false);
    }
  };

  const removeOwnerVisibilityRuleFromEmployeeAtLocation = async (
    employeeId: string,
    location: string,
  ) => {
    try {
      setSavingOwnerVisibilityRule(true);
      await axios.put("/api/employee/owner-visibility-rule", {
        employeeId,
        location,
        enabled: false,
        allowedInteriorStatus: [],
        allowedPropertyType: [],
        allowedPetStatus: [],
      });
      await fetchEmployees();
      toast({
        title: "Owner visibility rule removed",
        description: "Rule disabled for that location.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to remove owner visibility rule.",
      });
    } finally {
      setSavingOwnerVisibilityRule(false);
    }
  };

  const clearOwnerBlockedLocationsForEmployee = async (employeeId: string) => {
    try {
      setSavingOwnerBlockedLocations(true);
      await axios.put("/api/employee/owner-location-block", {
        employeeId,
        blockedLocations: [],
      });
      if (ownerBlockEmployeeId === employeeId) setOwnerBlockedLocations([]);
      await fetchEmployees();
      toast({
        title: "Cleared blocked locations",
        description: "Owner Sheet location hide removed for this employee.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to clear blocked locations.",
      });
    } finally {
      setSavingOwnerBlockedLocations(false);
    }
  };

  const filteredRules = useMemo(() => {
    const q = ruleQuery.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => `${r.name} ${r.description || ""}`.toLowerCase().includes(q));
  }, [rules, ruleQuery]);

  // Sync edit panel + assignment set when selected rule changes
  useEffect(() => {
    if (!selectedRuleId) {
      setAssignedEmployeeIds(new Set());
      return;
    }

    const assigned = new Set<string>();
    for (const emp of employees) {
      const ids = emp.uiRuleIds || [];
      if (ids.includes(selectedRuleId)) assigned.add(emp._id);
    }
    setAssignedEmployeeIds(assigned);
  }, [selectedRuleId, rules, employees]);

  const toggleEmployeeAssignment = (employeeId: string) => {
    setAssignedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!selectedRuleId) return;
    try {
      setSavingAssignments(true);
      const updates = activeEmployees
        .map((emp) => {
          const currently = new Set((emp.uiRuleIds || []).map(String));
          const shouldHave = assignedEmployeeIds.has(emp._id);
          const has = currently.has(selectedRuleId);
          if (shouldHave === has) return null;
          if (shouldHave) currently.add(selectedRuleId);
          else currently.delete(selectedRuleId);
          return {
            employeeId: emp._id,
            uiRuleIds: Array.from(currently),
          };
        })
        .filter(Boolean) as { employeeId: string; uiRuleIds: string[] }[];

      await Promise.all(
        updates.map((u) =>
          axios.put("/api/employee-ui-rules/assign", {
            employeeId: u.employeeId,
            uiRuleIds: u.uiRuleIds,
          }),
        ),
      );

      // Refresh employees so UI stays correct
      await fetchEmployees();
      toast({
        title: "Assignments saved",
        description: updates.length ? `Updated ${updates.length} employee(s).` : "No changes.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save assignments.",
      });
    } finally {
      setSavingAssignments(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Heading
          heading="Add Rule"
          subheading="Assign rules to active employees"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchRules();
              fetchEmployees();
            }}
            disabled={loadingEmployees || loadingRules}
            className="gap-2"
          >
            {loadingEmployees || loadingRules ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="guest" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="guest">Guest rules</TabsTrigger>
          <TabsTrigger value="owner">Owner rules</TabsTrigger>
        </TabsList>

        <TabsContent value="guest" className="mt-4 space-y-4">
          <Card className="bg-background mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  Pricing Rule (per employee)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="pricingEmployee">Employee (active only)</Label>
                <select
                  id="pricingEmployee"
                  value={pricingEmployeeId}
                  onChange={(e) => setPricingEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {eligibleEmployeesForNewPricingRule.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location scope (only if employee has assigned areas) */}
              <div>
                <Label htmlFor="pricingLocation">Location</Label>
                {selectedPricingEmployeeLocations.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No assigned areas. Rule applies to <span className="font-medium">All</span>.
                  </div>
                ) : (
                  <select
                    id="pricingLocation"
                    value={pricingLocation}
                    onChange={(e) => setPricingLocation(e.target.value)}
                    disabled={!pricingEmployeeId}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {availablePricingLocationsForEmployee.length === 0 ? (
                      <option value="All">No available locations</option>
                    ) : (
                      availablePricingLocationsForEmployee.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={pricingEnabled}
                    onCheckedChange={(v) => setPricingEnabled(Boolean(v))}
                    disabled={!pricingEmployeeId}
                  />
                  Enable
                </label>
              </div>

              <div className="md:col-span-4 grid gap-3 md:grid-cols-4">
                <div>
                  <Label htmlFor="pricingMin">Min (€)</Label>
                  <Input
                    id="pricingMin"
                    inputMode="numeric"
                    value={pricingMin}
                    onChange={(e) => setPricingMin(e.target.value)}
                    disabled={!pricingEmployeeId}
                  />
                </div>
                <div>
                  <Label htmlFor="pricingMax">Max (€)</Label>
                  <Input
                    id="pricingMax"
                    inputMode="numeric"
                    value={pricingMax}
                    onChange={(e) => setPricingMax(e.target.value)}
                    disabled={!pricingEmployeeId}
                  />
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <Button
                    type="button"
                    onClick={savePricingRule}
                    disabled={!pricingEmployeeId || savingPricingRule}
                  >
                    {savingPricingRule ? "Saving…" : "Save pricing rule"}
                  </Button>
                  {selectedPricingEmployee?.pricingRules?.all?.enabled ||
                  Object.values(selectedPricingEmployee?.pricingRules?.byLocation || {}).some(
                    (r) => r?.enabled,
                  ) ? (
                    <Badge variant="secondary" className="font-normal">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      Not active
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">
                    Employees with pricing rule
                  </div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithActivePricingRule.length}
                  </Badge>
                </div>

                {employeesWithActivePricingRule.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No active pricing rules assigned yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Range</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithActivePricingRule.map((e) => (
                          <tr
                            key={`${e.employeeId}-${e.location}`}
                            className="border-t"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">
                                {e.name || "—"}
                              </div>
                              <div className="text-muted-foreground line-clamp-1">
                                {e.email || "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.location === "All" ? "All" : e.location}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                €{e.min ?? "—"} - €{e.max ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingPricingRule}
                                onClick={() =>
                                  removePricingRuleFromEmployeeAtLocation(
                                    e.employeeId,
                                    e.location,
                                  )
                                }
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background mb-4">
            <CardHeader className="pb-3">
              <CardTitle>Property Visibility Rule (per employee)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="visibilityEmployee">Employee (active only)</Label>
                <select
                  id="visibilityEmployee"
                  value={visibilityEmployeeId}
                  onChange={(e) => setVisibilityEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {eligibleEmployeesForNewVisibilityRule.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location scope (only if employee has assigned areas) */}
              <div>
                <Label htmlFor="visibilityLocation">Location</Label>
                {selectedVisibilityEmployeeLocations.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No assigned areas. Rule applies to <span className="font-medium">All</span>.
                  </div>
                ) : (
                  <select
                    id="visibilityLocation"
                    value={visibilityLocation}
                    onChange={(e) => setVisibilityLocation(e.target.value)}
                    disabled={!visibilityEmployeeId}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {availableVisibilityLocationsForEmployee.length === 0 ? (
                      <option value="All">No available locations</option>
                    ) : (
                      availableVisibilityLocationsForEmployee.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visibilityEnabled}
                    onCheckedChange={(v) => setVisibilityEnabled(Boolean(v))}
                    disabled={!visibilityEmployeeId}
                  />
                  Enable
                </label>
              </div>

              <div className="md:col-span-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Furnishing</div>
                  <div className="grid gap-2">
                    {["Furnished", "Semi-furnished", "Unfurnished"].map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedFurnishing.includes(v)}
                          onCheckedChange={() =>
                            setAllowedFurnishing((prev) => toggleInList(prev, v))
                          }
                          disabled={!visibilityEmployeeId}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Type of Property</div>
                  <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                    {apartmentTypes.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedTypeOfProperty.includes(t.value)}
                          onCheckedChange={() =>
                            setAllowedTypeOfProperty((prev) => toggleInList(prev, t.value))
                          }
                          disabled={!visibilityEmployeeId}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={saveVisibilityRule}
                    disabled={!visibilityEmployeeId || savingVisibilityRule}
                  >
                    {savingVisibilityRule ? "Saving…" : "Save visibility rule"}
                  </Button>
                  <Badge variant="secondary" className="font-normal">
                    {selectedVisibilityEmployee?.propertyVisibilityRules?.all?.enabled ||
                    Object.values(selectedVisibilityEmployee?.propertyVisibilityRules?.byLocation || {}).some(
                      (r) => r?.enabled,
                    )
                      ? "Active"
                      : "Not active"}
                  </Badge>
                </div>
              </div>
            </CardContent>

            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">
                    Employees with visibility rule
                  </div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithActiveVisibilityRule.length}
                  </Badge>
                </div>

                {employeesWithActiveVisibilityRule.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No active visibility rules assigned yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Furnishing</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithActiveVisibilityRule.map((e) => (
                          <tr key={`${e.employeeId}-${e.location}`} className="border-t">
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">{e.name || "—"}</div>
                              <div className="text-muted-foreground line-clamp-1">{e.email || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.location === "All" ? "All" : e.location}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.furnishing.length
                                  ? e.furnishing.join(", ")
                                  : "All"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.typeCount
                                  ? `${e.typeCount} selected`
                                  : "All"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingVisibilityRule}
                                onClick={() =>
                                  removeVisibilityRuleFromEmployeeAtLocation(e.employeeId, e.location)
                                }
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background mb-4">
            <CardHeader className="pb-3">
              <CardTitle>Hide Guest Leads by Location (per employee)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="blockEmployee">Employee (active only)</Label>
                <select
                  id="blockEmployee"
                  value={blockEmployeeId}
                  onChange={(e) => setBlockEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {activeEmployees
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-4 rounded-lg border p-3">
                {blockEmployeeId && selectedBlockEmployeeLocations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    This employee has no allotted areas, so there are no location options to block.
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium mb-2">Blocked locations</div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {selectedBlockEmployeeLocations.map((loc) => {
                        const key = loc.toLowerCase();
                        const checked = blockedLocations.includes(key);
                        return (
                          <label key={loc} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                setBlockedLocations((prev) =>
                                  prev.includes(key)
                                    ? prev.filter((x) => x !== key)
                                    : [...prev, key],
                                )
                              }
                              disabled={!blockEmployeeId}
                            />
                            {loc}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  onClick={saveBlockedLocationsRule}
                  disabled={!blockEmployeeId || savingBlockedLocations}
                >
                  {savingBlockedLocations ? "Saving…" : "Save blocked locations"}
                </Button>
                <Badge variant="secondary" className="font-normal">
                  {blockedLocations.length ? `${blockedLocations.length} blocked` : "None blocked"}
                </Badge>
              </div>
            </CardContent>

            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">Employees with blocked locations</div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithBlockedGuestLocations.length}
                  </Badge>
                </div>

                {employeesWithBlockedGuestLocations.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No employees have blocked guest lead locations yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Blocked locations</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithBlockedGuestLocations.map((e) => (
                          <tr key={e.employeeId} className="border-t">
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">{e.name || "—"}</div>
                              <div className="text-muted-foreground line-clamp-1">{e.email || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.blocked.join(", ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingBlockedLocations}
                                onClick={() => clearBlockedLocationsForEmployee(e.employeeId)}
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owner" className="mt-4 space-y-4">
          <Card className="bg-background">
            <CardHeader className="pb-3">
              <CardTitle>Owner Pricing Rule (per employee)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="ownerPricingEmployee">Employee (active only)</Label>
                <select
                  id="ownerPricingEmployee"
                  value={ownerPricingEmployeeId}
                  onChange={(e) => setOwnerPricingEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {activeEmployees
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label htmlFor="ownerPricingLocation">Location</Label>
                {selectedOwnerPricingEmployeeLocations.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No assigned areas. Rule applies to <span className="font-medium">All</span>.
                  </div>
                ) : (
                  <select
                    id="ownerPricingLocation"
                    value={ownerPricingLocation}
                    onChange={(e) => setOwnerPricingLocation(e.target.value)}
                    disabled={!ownerPricingEmployeeId}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {availableOwnerPricingLocationsForEmployee.length === 0 ? (
                      <option value="All">No available locations</option>
                    ) : (
                      availableOwnerPricingLocationsForEmployee.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={ownerPricingEnabled}
                    onCheckedChange={(v) => setOwnerPricingEnabled(Boolean(v))}
                    disabled={!ownerPricingEmployeeId}
                  />
                  Enable
                </label>
              </div>

              <div className="md:col-span-4 grid gap-3 md:grid-cols-4">
                <div>
                  <Label htmlFor="ownerPricingMin">Min (€)</Label>
                  <Input
                    id="ownerPricingMin"
                    inputMode="numeric"
                    value={ownerPricingMin}
                    onChange={(e) => setOwnerPricingMin(e.target.value)}
                    disabled={!ownerPricingEmployeeId}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPricingMax">Max (€)</Label>
                  <Input
                    id="ownerPricingMax"
                    inputMode="numeric"
                    value={ownerPricingMax}
                    onChange={(e) => setOwnerPricingMax(e.target.value)}
                    disabled={!ownerPricingEmployeeId}
                  />
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <Button
                    type="button"
                    onClick={saveOwnerPricingRule}
                    disabled={!ownerPricingEmployeeId || savingOwnerPricingRule}
                  >
                    {savingOwnerPricingRule ? "Saving…" : "Save owner pricing rule"}
                  </Button>
                  {selectedOwnerPricingEmployee?.ownerPricingRules?.all?.enabled ||
                  Object.values(selectedOwnerPricingEmployee?.ownerPricingRules?.byLocation || {}).some(
                    (r) => r?.enabled,
                  ) ? (
                    <Badge variant="secondary" className="font-normal">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      Not active
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">Employees with owner pricing rule</div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithActiveOwnerPricingRule.length}
                  </Badge>
                </div>
                {employeesWithActiveOwnerPricingRule.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No active owner pricing rules assigned yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Range</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithActiveOwnerPricingRule.map((e) => (
                          <tr key={`${e.employeeId}-${e.location}`} className="border-t">
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">{e.name || "—"}</div>
                              <div className="text-muted-foreground line-clamp-1">{e.email || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.location === "All" ? "All" : e.location}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                €{e.min ?? "—"} - €{e.max ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingOwnerPricingRule}
                                onClick={() =>
                                  removeOwnerPricingRuleFromEmployeeAtLocation(e.employeeId, e.location)
                                }
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="pb-3">
              <CardTitle>Owner Visibility Rule (per employee)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="ownerVisibilityEmployee">Employee (active only)</Label>
                <select
                  id="ownerVisibilityEmployee"
                  value={ownerVisibilityEmployeeId}
                  onChange={(e) => setOwnerVisibilityEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {activeEmployees
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label htmlFor="ownerVisibilityLocation">Location</Label>
                {selectedOwnerVisibilityEmployeeLocations.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No assigned areas. Rule applies to <span className="font-medium">All</span>.
                  </div>
                ) : (
                  <select
                    id="ownerVisibilityLocation"
                    value={ownerVisibilityLocation}
                    onChange={(e) => setOwnerVisibilityLocation(e.target.value)}
                    disabled={!ownerVisibilityEmployeeId}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {availableOwnerVisibilityLocationsForEmployee.length === 0 ? (
                      <option value="All">No available locations</option>
                    ) : (
                      availableOwnerVisibilityLocationsForEmployee.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={ownerVisibilityEnabled}
                    onCheckedChange={(v) => setOwnerVisibilityEnabled(Boolean(v))}
                    disabled={!ownerVisibilityEmployeeId}
                  />
                  Enable
                </label>
              </div>

              <div className="md:col-span-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Interior status</div>
                  <div className="grid gap-2">
                    {ownerInteriorStatuses.map((v) => (
                      <label key={v.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedOwnerInteriorStatus.includes(v.value)}
                          onCheckedChange={() =>
                            setAllowedOwnerInteriorStatus((prev) => toggleInList(prev, v.value))
                          }
                          disabled={!ownerVisibilityEmployeeId}
                        />
                        {v.value}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Property type</div>
                  <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                    {apartmentTypes.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedOwnerPropertyType.includes(t.value)}
                          onCheckedChange={() =>
                            setAllowedOwnerPropertyType((prev) => toggleInList(prev, t.value))
                          }
                          disabled={!ownerVisibilityEmployeeId}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Pet status</div>
                  <div className="grid gap-2">
                    {["Allowed", "Not Allowed", "None"].map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={allowedOwnerPetStatus.includes(v)}
                          onCheckedChange={() =>
                            setAllowedOwnerPetStatus((prev) => toggleInList(prev, v))
                          }
                          disabled={!ownerVisibilityEmployeeId}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={saveOwnerVisibilityRule}
                    disabled={!ownerVisibilityEmployeeId || savingOwnerVisibilityRule}
                  >
                    {savingOwnerVisibilityRule ? "Saving…" : "Save owner visibility rule"}
                  </Button>
                  {selectedOwnerVisibilityEmployee?.ownerVisibilityRules?.all?.enabled ||
                  Object.values(selectedOwnerVisibilityEmployee?.ownerVisibilityRules?.byLocation || {}).some(
                    (r) => r?.enabled,
                  ) ? (
                    <Badge variant="secondary" className="font-normal">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">
                      Not active
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">Employees with owner visibility rule</div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithActiveOwnerVisibilityRule.length}
                  </Badge>
                </div>
                {employeesWithActiveOwnerVisibilityRule.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No active owner visibility rules assigned yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Interior</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Pet</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithActiveOwnerVisibilityRule.map((e) => (
                          <tr key={`${e.employeeId}-${e.location}`} className="border-t">
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">{e.name || "—"}</div>
                              <div className="text-muted-foreground line-clamp-1">{e.email || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.location === "All" ? "All" : e.location}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.interiorCount ? `${e.interiorCount} selected` : "All"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.propertyTypeCount ? `${e.propertyTypeCount} selected` : "All"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.petCount ? `${e.petCount} selected` : "All"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingOwnerVisibilityRule}
                                onClick={() =>
                                  removeOwnerVisibilityRuleFromEmployeeAtLocation(e.employeeId, e.location)
                                }
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="pb-3">
              <CardTitle>Hide Owners by Location (per employee)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="ownerBlockEmployee">Employee (active only)</Label>
                <select
                  id="ownerBlockEmployee"
                  value={ownerBlockEmployeeId}
                  onChange={(e) => setOwnerBlockEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee…</option>
                  {activeEmployees
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-4 rounded-lg border p-3">
                <div className="text-sm font-medium mb-2">Blocked locations</div>
                <div className="text-sm text-muted-foreground">
                  Select which locations this employee should not see on the Owner Sheet.
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {selectedOwnerBlockEmployeeLocations.map((loc) => {
                    const key = String(loc).toLowerCase();
                    const checked = ownerBlockedLocations.includes(key);
                    return (
                      <label key={String(loc)} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setOwnerBlockedLocations((prev) =>
                              prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
                            )
                          }
                          disabled={!ownerBlockEmployeeId}
                        />
                        {String(loc)}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  onClick={saveOwnerBlockedLocationsRule}
                  disabled={!ownerBlockEmployeeId || savingOwnerBlockedLocations}
                >
                  {savingOwnerBlockedLocations ? "Saving…" : "Save owner blocked locations"}
                </Button>
                <Badge variant="secondary" className="font-normal">
                  {ownerBlockedLocations.length ? `${ownerBlockedLocations.length} blocked` : "None blocked"}
                </Badge>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="text-sm font-medium">Employees with blocked owner locations</div>
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {employeesWithBlockedOwnerLocations.length}
                  </Badge>
                </div>
                {employeesWithBlockedOwnerLocations.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No employees have blocked owner sheet locations yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Employee</th>
                          <th className="px-4 py-3 font-medium">Blocked locations</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeesWithBlockedOwnerLocations.map((e) => (
                          <tr key={e.employeeId} className="border-t">
                            <td className="px-4 py-3">
                              <div className="font-medium line-clamp-1">{e.name || "—"}</div>
                              <div className="text-muted-foreground line-clamp-1">{e.email || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {e.blocked.join(", ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingOwnerBlockedLocations}
                                onClick={() => clearOwnerBlockedLocationsForEmployee(e.employeeId)}
                              >
                                Disable
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}