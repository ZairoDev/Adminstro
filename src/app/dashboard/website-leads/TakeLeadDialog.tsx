"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type TakeSource = "web" | "mobile";

type PrefillData = {
  source: TakeSource;
  id: string;
  name: string;
  email: string;
  phoneNo: string;
  location: string;
  area: string;
  guest: number;
  minBudget: number;
  maxBudget: number;
  noOfBeds: number;
  duration: string;
  startDate: string;
  endDate: string;
  bookingTerm: "Short Term" | "Long Term" | "Mid Term";
  zone: string;
  metroZone: string;
  billStatus: "With Bill" | "Without Bill";
  typeOfProperty: string;
  propertyType: "Furnished" | "Unfurnished" | "Semi-furnished";
  priority: "ASAP" | "High" | "Medium" | "Low";
  BoostID: string;
  message: string;
  VSID?: string;
  propertyLabel?: string;
};

type FormState = Omit<PrefillData, "source" | "id" | "VSID" | "propertyLabel">;

const PROPERTY_TYPES = [
  "Apartment",
  "Studio / 1 bedroom",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "Villa",
  "Pent House",
  "Detached House",
  "Loft",
  "Shared Apartment",
  "Maisotte",
  "Studio",
];

function toDateInputValue(isoOrEmpty: string): string {
  if (!isoOrEmpty) return "";
  const d = new Date(isoOrEmpty);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInputValue(ymd: string): string {
  if (!ymd) return "";
  return new Date(`${ymd}T12:00:00.000Z`).toISOString();
}

export function TakeLeadDialog({
  open,
  onOpenChange,
  source,
  leadId,
  onTaken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: TakeSource;
  leadId: string;
  onTaken: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ VSID?: string; propertyLabel?: string; message?: string }>({});
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (!open || !leadId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [prefillRes, locRes] = await Promise.all([
          axios.get(`/api/website-leads/take?source=${source}&id=${leadId}`),
          axios.get(`/api/addons/target/getAlLocations`).catch(() => null),
        ]);
        if (cancelled) return;

        const data = prefillRes.data.data as PrefillData;
        setMeta({
          VSID: data.VSID,
          propertyLabel: data.propertyLabel,
          message: data.message,
        });
        setForm({
          name: data.name || "",
          email: data.email || "-",
          phoneNo: data.phoneNo || "",
          location: data.location || "",
          area: data.area || "",
          guest: data.guest || 1,
          minBudget: data.minBudget || 0,
          maxBudget: data.maxBudget || 0,
          noOfBeds: data.noOfBeds || 0,
          duration: data.duration || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          bookingTerm: data.bookingTerm || "Short Term",
          zone: data.zone || "",
          metroZone: data.metroZone || "",
          billStatus: data.billStatus || "Without Bill",
          typeOfProperty: data.typeOfProperty || "Apartment",
          propertyType: data.propertyType || "Furnished",
          priority: data.priority || "Medium",
          BoostID: data.BoostID || "",
          message: data.message || "",
        });

        const locs = locRes?.data?.data;
        if (Array.isArray(locs)) {
          setLocations(
            locs
              .map((l: string | { city?: string }) =>
                typeof l === "string" ? l : l.city || ""
              )
              .filter(Boolean)
          );
        }
      } catch (err: unknown) {
        const ax = err as {
          response?: { status?: number; data?: { code?: string; queryId?: string; message?: string } };
        };
        const data = ax.response?.data;
        if (data?.code === "ALREADY_CLAIMED" && data.queryId) {
          toast({
            title: "Already taken",
            description: "Opening the existing Fresh Lead…",
          });
          onOpenChange(false);
          router.push(`/dashboard/createquery/${data.queryId}`);
          return;
        }
        toast({
          title: "Could not load lead",
          description: data?.message || "Try again",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, leadId, source, onOpenChange, router, toast]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async () => {
    if (!form) return;
    if (!form.area?.trim() && !form.zone?.trim() && !form.metroZone?.trim()) {
      toast({
        title: "Missing area",
        description: "Fill at least one of: Area, Zone, or Metro Zone",
        variant: "destructive",
      });
      return;
    }
    if (!form.phoneNo?.trim() || !form.location?.trim() || !form.duration?.trim()) {
      toast({
        title: "Missing fields",
        description: "Phone, location, and duration are required",
        variant: "destructive",
      });
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast({
        title: "Missing dates",
        description: "Start and end dates are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post("/api/website-leads/take", {
        source,
        id: leadId,
        ...form,
        phoneNo: form.phoneNo.replace(/\D/g, ""),
        location: form.location.toLowerCase().trim(),
      });
      const queryId = res.data?.data?.queryId;
      toast({
        title: "Lead taken",
        description: "Created as Fresh Lead (Approved)",
      });
      onOpenChange(false);
      onTaken();
      if (queryId) {
        router.push(`/dashboard/createquery/${queryId}`);
      }
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: {
            code?: string;
            queryId?: string;
            message?: string;
            existingLead?: { _id: string; name?: string };
          };
        };
      };
      const data = ax.response?.data;
      if (data?.code === "DUPLICATE_PHONE" && data.queryId) {
        toast({
          title: "Duplicate phone",
          description:
            data.message ||
            "A lead with this phone already exists. Opening it instead.",
        });
        onOpenChange(false);
        router.push(`/dashboard/createquery/${data.queryId}`);
        return;
      }
      if (data?.code === "ALREADY_CLAIMED" && data.queryId) {
        toast({
          title: "Already taken",
          description: "Opening the existing Fresh Lead…",
        });
        onOpenChange(false);
        onTaken();
        router.push(`/dashboard/createquery/${data.queryId}`);
        return;
      }
      if (data?.code === "LOCATION_BLOCKED") {
        toast({
          title: "Outside your cities",
          description: data.message || "You cannot take this lead",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Take Lead failed",
        description: data?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Take Lead · {source === "web" ? "Web" : "Mobile"}
          </DialogTitle>
        </DialogHeader>

        {loading || !form ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {(meta.VSID || meta.propertyLabel) && (
              <p className="text-xs text-stone-500">
                {meta.propertyLabel ? `${meta.propertyLabel} · ` : ""}
                {meta.VSID ? `VSID ${meta.VSID}` : ""}
              </p>
            )}
            {meta.message ? (
              <p className="rounded-md bg-stone-50 p-2 text-xs text-stone-600 line-clamp-3">
                {meta.message}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phoneNo}
                  onChange={(e) => setField("phoneNo", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location (city)</Label>
                {locations.length > 0 ? (
                  <Select
                    value={form.location}
                    onValueChange={(v) => setField("location", v.toLowerCase())}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((c) => (
                        <SelectItem key={c} value={c.toLowerCase()}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setField("location", e.target.value.toLowerCase())
                    }
                    placeholder="athens"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Input
                  value={form.area}
                  onChange={(e) => setField("area", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Zone</Label>
                <Select
                  value={form.zone || "__none__"}
                  onValueChange={(v) =>
                    setField("zone", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {[
                      "Anywhere",
                      "Center",
                      "North",
                      "South",
                      "East",
                      "West",
                      "North-East",
                      "North-West",
                      "South-East",
                      "South-West",
                    ].map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metro zone</Label>
                <Select
                  value={form.metroZone || "__none__"}
                  onValueChange={(v) =>
                    setField("metroZone", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Metro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {[
                      "Anywhere",
                      "Blue Line",
                      "Red Line",
                      "Green Line",
                      "Yellow Line",
                    ].map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Booking term</Label>
                <Select
                  value={form.bookingTerm}
                  onValueChange={(v) =>
                    setField(
                      "bookingTerm",
                      v as FormState["bookingTerm"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short Term">Short Term</SelectItem>
                    <SelectItem value="Mid Term">Mid Term</SelectItem>
                    <SelectItem value="Long Term">Long Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input
                  value={form.duration}
                  onChange={(e) => setField("duration", e.target.value)}
                  placeholder="e.g. 30 nights"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.startDate)}
                  onChange={(e) =>
                    setField("startDate", fromDateInputValue(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.endDate)}
                  onChange={(e) =>
                    setField("endDate", fromDateInputValue(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.guest}
                  onChange={(e) =>
                    setField("guest", Number(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Beds</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.noOfBeds}
                  onChange={(e) =>
                    setField("noOfBeds", Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Min budget (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minBudget}
                  onChange={(e) =>
                    setField("minBudget", Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max budget (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxBudget}
                  onChange={(e) =>
                    setField("maxBudget", Number(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type of property</Label>
                <Select
                  value={form.typeOfProperty}
                  onValueChange={(v) => setField("typeOfProperty", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Furnishing</Label>
                <Select
                  value={form.propertyType}
                  onValueChange={(v) =>
                    setField(
                      "propertyType",
                      v as FormState["propertyType"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Furnished">Furnished</SelectItem>
                    <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                    <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bill status</Label>
                <Select
                  value={form.billStatus}
                  onValueChange={(v) =>
                    setField("billStatus", v as FormState["billStatus"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="With Bill">With Bill</SelectItem>
                    <SelectItem value="Without Bill">Without Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setField("priority", v as FormState["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASAP">ASAP</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>VSID / BoostID</Label>
                <Input
                  value={form.BoostID}
                  onChange={(e) => setField("BoostID", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || submitting || !form}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Taking…
              </>
            ) : (
              "Take Lead"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
