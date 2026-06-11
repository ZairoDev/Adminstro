"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import Image from "next/image";
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
import { Loader2, Search, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";

type PropertyCard = {
  propertyId: string;
  vsid?: string;
  title?: string;
  image?: string;
  city?: string;
  basePrice?: number;
  status?: string;
  owner?: { name?: string; email?: string; phone?: string } | null;
};

type SetVisitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  leadId?: string | null;
  onScheduled: (labels: string[]) => void;
};

export function SetVisitDialog({
  open,
  onOpenChange,
  conversation,
  leadId,
  onScheduled,
}: SetVisitDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyCard[]>([]);
  const [selected, setSelected] = useState<PropertyCard | null>(null);
  const [vsidSearch, setVsidSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !conversation) return;
    setStep(1);
    setSelected(null);
    setSharedLoading(true);
    axios
      .get(`/api/whatsapp/conversations/${conversation._id}/shared-properties`)
      .then((res) => setProperties(res.data?.properties || []))
      .finally(() => setSharedLoading(false));
  }, [open, conversation]);

  const searchByVsid = async () => {
    if (!vsidSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await axios.get("/api/whatsapp/properties/search", {
        params: { vsid: vsidSearch.trim() },
      });
      const found = res.data?.properties || [];
      if (!found.length) {
        toast({ title: "No property found", variant: "destructive" });
      } else {
        setProperties((prev) => {
          const map = new Map(prev.map((p) => [p.propertyId, p]));
          for (const p of found) map.set(p.propertyId, p);
          return [...map.values()];
        });
        setSelected(found[0]);
        setStep(2);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const submitVisit = async () => {
    if (!conversation || !selected || !visitDate) return;
    setSubmitting(true);
    try {
      const owner = selected.owner;
      await axios.post("/api/visits/addVisit", {
        lead: leadId || "",
        VSID: selected.vsid || "",
        propertyId: selected.propertyId,
        ownerName: owner?.name || "",
        ownerPhone: owner?.phone || "",
        ownerEmail: owner?.email || "",
        address: selected.city || "",
        propertyUrl: `https://www.vacationsaga.com/listing-stay-detail/${selected.propertyId}`,
        schedule: [{ date: visitDate, time: visitTime || "10:00" }],
        agentName: "",
        agentPhone: "",
        pitchAmount: 0,
        vsFinal: 0,
        ownerCommission: 1,
        travellerCommission: 1,
        agentCommission: 0,
        documentationCharges: 0,
        visitType: "physical",
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
              />
              <Button variant="secondary" onClick={searchByVsid} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
                    onClick={() => {
                      setSelected(p);
                      setStep(2);
                    }}
                    className={cn(
                      "text-left rounded-xl border overflow-hidden hover:border-[#00a884]/50 transition-colors",
                      selected?.propertyId === p.propertyId && "border-[#00a884] ring-1 ring-[#00a884]/30",
                    )}
                  >
                    <div className="relative h-32 bg-muted">
                      {p.image ? (
                        <Image src={p.image} alt="" fill className="object-cover" unoptimized />
                      ) : null}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="font-medium text-sm line-clamp-1">{p.title || p.vsid}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.city || "—"}
                      </p>
                      {p.owner?.name && (
                        <p className="text-xs text-muted-foreground">Owner: {p.owner.name}</p>
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
                  <Image src={selected.image} alt="" fill className="object-cover" unoptimized />
                </div>
              )}
              <div>
                <p className="font-semibold">{selected.title}</p>
                <p className="text-sm text-muted-foreground">VSID: {selected.vsid}</p>
                <p className="text-sm text-muted-foreground">{selected.city}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Visit date</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
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
              disabled={!visitDate || submitting}
              onClick={submitVisit}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule visit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
