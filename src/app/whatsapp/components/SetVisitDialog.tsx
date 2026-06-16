"use client";

 import { useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import Image from "next/image";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/AuthStore";
import type { Conversation } from "../types";

type PropertyCard = {
  propertyId: string;
  vsid?: string;
  title?: string;
  image?: string;
  city?: string;
  street?: string;
  basePrice?: number;
  status?: string;
  url?: string;
  owner?: { name?: string; email?: string; phone?: string } | null;
};

type AgentOption = {
  agentName: string;
  agentPhone: string;
  agentEmail?: string;
};

type SetVisitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  leadId?: string | null;
  onScheduled: (labels: string[]) => void;
};

function buildPropertyAddress(property: PropertyCard): string {
  return [property.street, property.city].filter(Boolean).join(", ");
}

function buildPropertyUrl(property: PropertyCard): string {
  if (property.url?.trim()) return property.url.trim();
  return `https://www.vacationsaga.com/listing-stay-detail/${property.propertyId}`;
}

export function SetVisitDialog({
  open,
  onOpenChange,
  conversation,
  leadId,
  onScheduled,
}: SetVisitDialogProps) {
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyCard[]>([]);
  const [selected, setSelected] = useState<PropertyCard | null>(null);
  const [vsidSearch, setVsidSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [propertyUrl, setPropertyUrl] = useState("");
  const [scheduleValue, setScheduleValue] = useState("");
  const [visitType, setVisitType] = useState<"physical" | "virtual">("physical");
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [ownerCommission, setOwnerCommission] = useState(0);
  const [travellerCommission, setTravellerCommission] = useState(0);
  const [agentCommission, setAgentCommission] = useState(0);
  const [documentationCharges, setDocumentationCharges] = useState(0);

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  const pitchAmount = ownerCommission + travellerCommission;
  const vsFinal = pitchAmount - (agentCommission + documentationCharges);

  const resetForm = () => {
    setStep(1);
    setSelected(null);
    setVsidSearch("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setPropertyUrl("");
    setScheduleValue("");
    setVisitType("physical");
    setAgentName("");
    setAgentPhone("");
    setOwnerCommission(0);
    setTravellerCommission(0);
    setAgentCommission(0);
    setDocumentationCharges(0);
  };

  const applyPropertySelection = (property: PropertyCard) => {
    setSelected(property);
    setOwnerName(property.owner?.name?.trim() || "");
    setOwnerEmail(property.owner?.email?.trim() || "");
    setOwnerPhone(property.owner?.phone?.trim() || "");
    setPropertyUrl(buildPropertyUrl(property));
    setStep(2);
  };

  useEffect(() => {
    if (!open) return;
    resetForm();
    if (!conversation) return;

    setSharedLoading(true);
    axios
      .get(`/api/whatsapp/conversations/${conversation._id}/shared-properties`)
      .then((res) => setProperties(res.data?.properties || []))
      .finally(() => setSharedLoading(false));
  }, [open, conversation]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFetchingAgents(true);
    axios
      .get("/api/addons/agents/getAllAgents")
      .then((res) => {
        if (cancelled) return;
        const list: AgentOption[] = res.data?.data || [];
        setAgents(list);

        const matched =
          list.find(
            (agent) =>
              agent.agentEmail &&
              token?.email &&
              agent.agentEmail.toLowerCase() === token.email.toLowerCase(),
          ) ||
          list.find(
            (agent) =>
              agent.agentName &&
              token?.name &&
              agent.agentName.toLowerCase() === token.name.toLowerCase(),
          );

        if (matched) {
          setAgentName(matched.agentName);
          setAgentPhone(matched.agentPhone);
        }
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setFetchingAgents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token?.email, token?.name]);

  const ownerFieldsMissing = useMemo(
    () => !ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim(),
    [ownerName, ownerEmail, ownerPhone],
  );

  const searchByVsid = async () => {
    if (!vsidSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await axios.get("/api/whatsapp/properties/search", {
        params: { vsid: vsidSearch.trim() },
      });
      const found: PropertyCard[] = res.data?.properties || [];
      if (!found.length) {
        toast({ title: "No property found", variant: "destructive" });
      } else {
        setProperties((prev) => {
          const map = new Map(prev.map((p) => [p.propertyId, p]));
          for (const p of found) map.set(p.propertyId, p);
          return [...map.values()];
        });
        applyPropertySelection(found[0]);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const validateForm = (): string[] => {
    const missing: string[] = [];
    if (!leadId) missing.push("Lead (link this conversation to a lead first)");
    if (!selected?.propertyId && !selected?.vsid) missing.push("Property");
    if (!ownerName.trim()) missing.push("Owner Name");
    if (!ownerPhone.trim()) missing.push("Owner Phone");
    if (!ownerEmail.trim()) missing.push("Owner Email");
    if (!agentName.trim()) missing.push("Agent");
    if (!scheduleValue) missing.push("Schedule Date & Time");
    if (ownerCommission === 0 && travellerCommission === 0) {
      missing.push("Owner or Traveller Commission");
    }
    return missing;
  };

  const submitVisit = async () => {
    if (!conversation || !selected) return;

    const missing = validateForm();
    if (missing.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please provide: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    let scheduleDate = "";
    let scheduleTime = "";
    try {
      scheduleDate = format(new Date(scheduleValue.split("T")[0]), "MM/dd/yyyy");
      scheduleTime = scheduleValue.split("T")[1] || "10:00";
    } catch {
      toast({
        title: "Invalid date",
        description: "Please choose a valid visit date and time.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/visits/addVisit", {
        lead: leadId,
        VSID: selected.vsid || "",
        propertyId: selected.propertyId,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim(),
        address: buildPropertyAddress(selected),
        propertyUrl: propertyUrl.trim() || buildPropertyUrl(selected),
        schedule: [{ date: scheduleDate, time: scheduleTime }],
        agentName: agentName.trim(),
        agentPhone: agentPhone.trim(),
        pitchAmount,
        vsFinal,
        ownerCommission,
        travellerCommission,
        agentCommission,
        documentationCharges,
        visitType,
      });

      const labelRes = await axios.patch(
        `/api/whatsapp/conversations/${conversation._id}/labels`,
        { add: ["Visit Scheduled"] },
      );

      toast({ title: "Visit scheduled" });
      onScheduled(labelRes.data?.labels || ["Visit Scheduled"]);
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to schedule visit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#00a884]" />
            Set visit
          </DialogTitle>
        </DialogHeader>

        {!leadId && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2">
            No lead is linked to this conversation yet. Visit scheduling requires a
            lead record.
          </p>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Properties shared in this conversation or search by VSID.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Search VSID…"
                value={vsidSearch}
                onChange={(e) => setVsidSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchByVsid();
                }}
              />
              <Button
                variant="secondary"
                onClick={() => void searchByVsid()}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {sharedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : properties.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">
                No properties found. Search by VSID above.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {properties.map((p) => (
                  <button
                    key={p.propertyId}
                    type="button"
                    onClick={() => applyPropertySelection(p)}
                    className={cn(
                      "text-left rounded-xl border overflow-hidden hover:border-[#00a884]/50 transition-colors",
                      selected?.propertyId === p.propertyId &&
                        "border-[#00a884] ring-1 ring-[#00a884]/30",
                    )}
                  >
                    <div className="relative h-32 bg-muted">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="font-medium text-sm line-clamp-1">
                        {p.title || p.vsid}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.city || "—"}
                      </p>
                      {p.owner?.name && (
                        <p className="text-xs text-muted-foreground">
                          Owner: {p.owner.name}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && selected && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4 flex gap-4">
              {selected.image && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <Image
                    src={selected.image}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">{selected.title}</p>
                <p className="text-sm text-muted-foreground">VSID: {selected.vsid}</p>
                <p className="text-sm text-muted-foreground">
                  {buildPropertyAddress(selected) || selected.city || "—"}
                </p>
              </div>
            </div>

            {ownerFieldsMissing && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-3">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Owner details missing from property — please fill in
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Owner name</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Owner name"
                    />
                  </div>
                  <div>
                    <Label>Owner email</Label>
                    <Input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="Owner email"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Owner phone</Label>
                    <Input
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="Owner phone"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Visit type</Label>
                <Select
                  value={visitType}
                  onValueChange={(value: "physical" | "virtual") =>
                    setVisitType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Visit type</SelectLabel>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Agent</Label>
              <Select
                value={agentName && agentPhone ? `${agentName}|||${agentPhone}` : ""}
                onValueChange={(value) => {
                  const [name = "", phone = ""] = value.split("|||");
                  setAgentName(name);
                  setAgentPhone(phone);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={fetchingAgents ? "Loading agents…" : "Select agent"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Agents</SelectLabel>
                    {fetchingAgents ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <SelectItem
                          key={`${agent.agentName}-${agent.agentPhone}`}
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

            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
              <div>
                <Label>Owner comm.</Label>
                <Input
                  type="number"
                  min={0}
                  value={ownerCommission}
                  onChange={(e) =>
                    setOwnerCommission(Number.parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div>
                <Label>Traveller comm.</Label>
                <Input
                  type="number"
                  min={0}
                  value={travellerCommission}
                  onChange={(e) =>
                    setTravellerCommission(Number.parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div>
                <Label>Agent commission</Label>
                <Input
                  type="number"
                  min={0}
                  value={agentCommission}
                  onChange={(e) =>
                    setAgentCommission(Number.parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div>
                <Label>Docs. charges</Label>
                <Input
                  type="number"
                  min={0}
                  value={documentationCharges}
                  onChange={(e) =>
                    setDocumentationCharges(
                      Number.parseInt(e.target.value, 10) || 0,
                    )
                  }
                />
              </div>
              <div>
                <Label>Pitch amount</Label>
                <Input type="number" value={pitchAmount} disabled className="bg-muted" />
              </div>
              <div>
                <Label>V.S final</Label>
                <Input type="number" value={vsFinal} disabled className="bg-muted" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step === 2 && (
            <Button
              className="bg-[#00a884] hover:bg-[#008f6f]"
              disabled={!scheduleValue || submitting || !leadId}
              onClick={() => void submitVisit()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Schedule visit"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
