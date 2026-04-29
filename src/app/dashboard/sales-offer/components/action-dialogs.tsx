"use client";

import { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REJECTION_REASONS } from "@/util/offerConstants";
import type { OfferDoc } from "@/util/type";
import { useSalesOfferStore } from "../useSalesOfferStore";
import SendOffer from "../send-offer";
import PlanDetails from "../plan-details";
import EmailPreview from "../email-preview";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import { parseOfferPlan, serializeOfferPlan } from "@/util/offerPlan";
import { renderTemplate } from "@/util/templateEngine";

interface BaseDialogProps {
  open: boolean;
  offer: OfferDoc | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ReminderType = "REM1" | "REM2" | "REM3" | "REM4";
type RebuttalType = "REBUTTAL1" | "REBUTTAL2";

interface SalesTemplateDoc {
  _id: string;
  type: "OFFER" | ReminderType | RebuttalType;
  name: string;
  subject: string;
  html: string;
}

const REMINDER_ORDER: ReminderType[] = ["REM1", "REM2", "REM3", "REM4"];
const REBUTTAL_TYPES: RebuttalType[] = ["REBUTTAL1", "REBUTTAL2"];

interface AliasOption {
  _id: string;
  aliasName: string;
  aliasEmail: string;
  organization?: string;
  status?: string;
}

function renderEmailWithLeadData(raw: string, offer: OfferDoc): string {
  return renderTemplate(raw, {
    name: offer.name ?? "",
    ownerName: offer.name ?? "",
    propertyName: offer.propertyName ?? "",
    propertyUrl: offer.propertyUrl ?? "",
    email: offer.email ?? "",
    relation: offer.relation ?? "",
    platform: offer.platform ?? "",
    plan: offer.plan ?? "",
    organization: offer.organization ?? "",
  });
}

/* ── Add Callback Dialog ──────────────────────────────────────────────── */

export function AddCallbackDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!offer || !date) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/api/offers/${offer._id}/callback`, { date, time, note });
      toast({ title: "Callback added" });
      setDate(""); setTime(""); setNote("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Callback</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cb-date">Date *</Label>
            <Input id="cb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cb-time">Time</Label>
            <Input id="cb-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cb-note">Note</Label>
            <Textarea id="cb-note" rows={3} placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !date}>
            {loading ? "Saving…" : "Add Callback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Reject Lead Dialog ───────────────────────────────────────────────── */

export function RejectLeadDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!offer || !reason) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/api/offers/${offer._id}/reject`, {
        reason,
        note,
        organization: offer.organization,
      });
      toast({ title: "Lead rejected" });
      setReason(""); setNote("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rej-note">Note (optional)</Label>
            <Textarea id="rej-note" rows={3} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? "Rejecting…" : "Reject Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Blacklist Lead Dialog ────────────────────────────────────────────── */

export function BlacklistLeadDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!offer || !reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`/api/offers/${offer._id}/blacklist`, { reason, note });
      toast({ title: "Lead blacklisted" });
      setReason(""); setNote("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Blacklist Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bl-reason">Reason *</Label>
            <Input id="bl-reason" placeholder="Enter reason…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bl-note">Note (optional)</Label>
            <Textarea id="bl-note" rows={3} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading ? "Blacklisting…" : "Blacklist Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Update Offer Dialog ──────────────────────────────────────────────── */

type DiscountType = "PER_PROPERTY" | "TOTAL";
type DiscountUnit = "FIXED" | "PERCENT";
type Platform = "VacationSaga" | "Holidaysera" | "HousingSaga" | "TechTunes";

export function UpdateOfferDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [loading, setLoading] = useState(false);
  const {
    resetForm,
    setField,
    leadId,
    aliasId,
    phoneNumber,
    leadStatus,
    note,
    name,
    propertyName,
    relation,
    email,
    propertyUrl,
    country,
    state,
    city,
    plan,
    pricePerProperty,
    propertiesAllowed,
    discountType,
    discountUnit,
    discountValue,
    totalPrice,
    discount,
    effectivePrice,
    expiryDate,
    services,
    platform,
  } = useSalesOfferStore();

  useEffect(() => {
    if (!open || !offer) return;
    resetForm();
    setField("leadId", offer._id);
    setField("leadStatus", "Send Offer");
    setField("phoneNumber", offer.phoneNumber ?? "");
    setField("note", offer.note ?? "");
    setField("name", offer.name ?? "");
    setField("propertyName", offer.propertyName ?? "");
    setField("relation", offer.relation ?? "");
    setField("email", offer.email ?? "");
    setField("propertyUrl", offer.propertyUrl ?? "");
    setField("country", offer.country ?? "");
    setField("state", offer.state ?? "");
    setField("city", offer.city ?? "");
    setField("plan", offer.plan ?? "");
    setField("pricePerProperty", Number(offer.pricePerProperty ?? 0));
    setField("propertiesAllowed", Math.max(1, Number(offer.propertiesAllowed ?? 1)));
    setField("discountType", (offer.discountType as DiscountType) ?? "TOTAL");
    setField("discountUnit", (offer.discountUnit as DiscountUnit) ?? "FIXED");
    setField("discountValue", Number(offer.discountValue ?? offer.discount ?? 0));
    setField("totalPrice", Number(offer.totalPrice ?? 0));
    setField("discount", Number(offer.discount ?? 0));
    setField("effectivePrice", Number(offer.effectivePrice ?? 0));
    setField("expiryDate", offer.expiryDate ? new Date(offer.expiryDate) : null);
    setField("services", offer.services ?? "");
    setField("platform", (offer.platform as Platform) ?? "VacationSaga");
    setField("availableOn", [(offer.platform as Platform) ?? "VacationSaga"]);
  }, [open, offer, resetForm, setField]);

  const handleSubmit = async () => {
    if (!offer) return;
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !propertyName.trim() || !relation.trim() || !propertyUrl.trim() || !country.trim() || !plan.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const parsedPlan = parseOfferPlan(plan);
      const normalizedPlan = parsedPlan ? serializeOfferPlan(parsedPlan) : plan.trim();
      if (!normalizedPlan) {
        toast({
          title: "Plan is required",
          description: "Please select a valid plan before sending offer.",
          variant: "destructive",
        });
        return;
      }

      const orgForSend =
        selectedOrg ??
        (platform === "VacationSaga" || platform === "Holidaysera" || platform === "HousingSaga"
          ? platform
          : undefined);

      await axios.post("/api/offers/send", {
        leadId: leadId ?? offer._id,
        aliasId,
        organization: orgForSend,
        phoneNumber,
        leadStatus: "Send Offer",
        note,
        name,
        propertyName,
        relation,
        email,
        propertyUrl,
        country,
        state,
        city,
        plan: normalizedPlan,
        pricePerProperty: Number(pricePerProperty),
        propertiesAllowed: Math.max(1, Number(propertiesAllowed)),
        discountType,
        discountUnit,
        discountValue: Math.max(0, Number(discountValue)),
        totalPrice,
        discount,
        effectivePrice,
        expiryDate,
        services,
        platform,
      });
      toast({ title: "Offer updated and sent" });
      onSuccess();
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to update offer";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <SendOffer />
          <PlanDetails />
          <EmailPreview />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating…" : "Update Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendReminderDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<ReminderType>("REM1");
  const [aliases, setAliases] = useState<AliasOption[]>([]);
  const [selectedAliasId, setSelectedAliasId] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [sending, setSending] = useState(false);

  const sentKinds = new Set((offer?.emailEvents ?? []).map((event) => event.kind));
  const canSendType = (type: ReminderType): boolean => {
    if (type === "REM1") return true;
    if (type === "REM2") return sentKinds.has("REM1");
    if (type === "REM3") return sentKinds.has("REM2");
    return sentKinds.has("REM3");
  };
  const hasSentType = (type: ReminderType): boolean => sentKinds.has(type);

  const loadTemplate = async (type: ReminderType) => {
    if (!offer) return;
    setLoadingTemplate(true);
    try {
      const res = await axios.get("/api/sales-offer/templates", {
        params: { organization: offer.organization, type, activeOnly: true },
      });
      const template = (res.data?.templates?.[0] ?? null) as SalesTemplateDoc | null;
      if (!template) {
        toast({ title: `No active ${type} template found`, variant: "destructive" });
        setSubject("");
        setHtml("");
        return;
      }
      setSubject(template.subject ?? "");
      setHtml(template.html ?? "");
    } catch (_err) {
      toast({ title: "Failed to load template", variant: "destructive" });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const loadAliases = async () => {
    if (!offer) return;
    setLoadingAliases(true);
    try {
      const res = await axios.get("/api/alias/getAllAliases", {
        params: { organization: offer.organization },
      });
      const aliasList = ((res.data?.aliases ?? []) as AliasOption[]).filter(
        (alias) => String(alias.status ?? "").toLowerCase() === "active",
      );
      setAliases(aliasList);
      setSelectedAliasId((prev) =>
        prev && aliasList.some((alias) => alias._id === prev) ? prev : (aliasList[0]?._id ?? ""),
      );
    } catch (_err) {
      setAliases([]);
      setSelectedAliasId("");
      toast({ title: "Failed to load aliases", variant: "destructive" });
    } finally {
      setLoadingAliases(false);
    }
  };

  useEffect(() => {
    if (!open || !offer) return;
    const firstAvailable = REMINDER_ORDER.find((type) => canSendType(type)) ?? "REM1";
    setSelectedType(firstAvailable);
    void loadTemplate(firstAvailable);
    void loadAliases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?._id]);

  const handleSend = async () => {
    if (!offer) return;
    if (!subject.trim() || !html.trim()) {
      toast({ title: "Subject and content are required", variant: "destructive" });
      return;
    }
    if (!canSendType(selectedType)) {
      toast({ title: `${selectedType} is locked by sequence rules`, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const response = await axios.post(`/api/offers/${offer._id}/reminder`, {
        organization: offer.organization,
        type: selectedType,
        subject,
        html,
        aliasId: selectedAliasId || undefined,
      });
      const isResend = Boolean(response?.data?.isResend);
      toast({ title: isResend ? `${selectedType} resent successfully` : `${selectedType} sent successfully` });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to send reminder";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REMINDER_ORDER.map((type) => (
              <Button
                key={type}
                type="button"
                variant={selectedType === type ? "default" : "outline"}
                disabled={!canSendType(type) || loadingTemplate}
                onClick={() => {
                  setSelectedType(type);
                  void loadTemplate(type);
                }}
              >
                {hasSentType(type) ? `Resend ${type}` : type}
              </Button>
            ))}
          </div>
          <div>
            <Label>Send Alias</Label>
            <Select value={selectedAliasId} onValueChange={setSelectedAliasId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingAliases ? "Loading aliases…" : "Select alias"}
                />
              </SelectTrigger>
              <SelectContent>
                {aliases.map((alias) => (
                  <SelectItem key={alias._id} value={alias._id}>
                    {alias.aliasName} ({alias.aliasEmail})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reminder-subject">Subject</Label>
            <Input
              id="reminder-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Reminder subject"
            />
          </div>
          <div>
            <Label htmlFor="reminder-html">Email Content (HTML)</Label>
            <div className="border rounded-md overflow-hidden">
              <MonacoEditor
                height="260px"
                language="html"
                value={html}
                onChange={(value) => setHtml(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 13,
                  formatOnPaste: false,
                  formatOnType: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
          <div className="rounded-md border">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">Preview</div>
            <iframe
              title="Reminder Preview"
              className="w-full h-72 rounded-b-md"
              srcDoc={offer ? renderEmailWithLeadData(html, offer) : ""}
              sandbox=""
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || loadingTemplate || loadingAliases || !selectedAliasId}>
            {sending ? "Sending…" : `Send ${selectedType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendRebuttalDialog({ open, offer, onClose, onSuccess }: BaseDialogProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<RebuttalType>("REBUTTAL1");
  const [aliases, setAliases] = useState<AliasOption[]>([]);
  const [selectedAliasId, setSelectedAliasId] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [sending, setSending] = useState(false);

  const canSendRebuttal = offer?.leadStatus === "Reject Lead" || offer?.leadStatus === "Not Interested";

  const loadTemplate = async (type: RebuttalType) => {
    if (!offer) return;
    setLoadingTemplate(true);
    try {
      const res = await axios.get("/api/sales-offer/templates", {
        params: { organization: offer.organization, type, activeOnly: true },
      });
      const template = (res.data?.templates?.[0] ?? null) as SalesTemplateDoc | null;
      if (!template) {
        toast({ title: "No active rebuttal template found", variant: "destructive" });
        setSubject("");
        setHtml("");
        return;
      }
      setSubject(template.subject ?? "");
      setHtml(template.html ?? "");
    } catch (_err) {
      toast({ title: "Failed to load rebuttal template", variant: "destructive" });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const loadAliases = async () => {
    if (!offer) return;
    setLoadingAliases(true);
    try {
      const res = await axios.get("/api/alias/getAllAliases", {
        params: { organization: offer.organization },
      });
      const aliasList = ((res.data?.aliases ?? []) as AliasOption[]).filter(
        (alias) => String(alias.status ?? "").toLowerCase() === "active",
      );
      setAliases(aliasList);
      setSelectedAliasId((prev) =>
        prev && aliasList.some((alias) => alias._id === prev) ? prev : (aliasList[0]?._id ?? ""),
      );
    } catch (_err) {
      setAliases([]);
      setSelectedAliasId("");
      toast({ title: "Failed to load aliases", variant: "destructive" });
    } finally {
      setLoadingAliases(false);
    }
  };

  useEffect(() => {
    if (!open || !offer) return;
    setSelectedType("REBUTTAL1");
    void loadTemplate("REBUTTAL1");
    void loadAliases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?._id]);

  const handleSend = async () => {
    if (!offer) return;
    if (!canSendRebuttal) {
      toast({ title: "Rebuttal is only allowed for rejected/not interested leads", variant: "destructive" });
      return;
    }
    if (!subject.trim() || !html.trim()) {
      toast({ title: "Subject and content are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await axios.post(`/api/offers/${offer._id}/rebuttal`, {
        organization: offer.organization,
        type: selectedType,
        subject,
        html,
        aliasId: selectedAliasId || undefined,
      });
      toast({ title: "Rebuttal sent successfully" });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to send rebuttal";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Rebuttal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REBUTTAL_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                variant={selectedType === type ? "default" : "outline"}
                disabled={loadingTemplate}
                onClick={() => {
                  setSelectedType(type);
                  void loadTemplate(type);
                }}
              >
                {type}
              </Button>
            ))}
          </div>
          <div>
            <Label>Send Alias</Label>
            <Select value={selectedAliasId} onValueChange={setSelectedAliasId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingAliases ? "Loading aliases…" : "Select alias"}
                />
              </SelectTrigger>
              <SelectContent>
                {aliases.map((alias) => (
                  <SelectItem key={alias._id} value={alias._id}>
                    {alias.aliasName} ({alias.aliasEmail})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rebuttal-subject">Subject</Label>
            <Input
              id="rebuttal-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Rebuttal subject"
            />
          </div>
          <div>
            <Label htmlFor="rebuttal-html">Email Content (HTML)</Label>
            <div className="border rounded-md overflow-hidden">
              <MonacoEditor
                height="260px"
                language="html"
                value={html}
                onChange={(value) => setHtml(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 13,
                  formatOnPaste: false,
                  formatOnType: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
          <div className="rounded-md border">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">Preview</div>
            <iframe
              title="Rebuttal Preview"
              className="w-full h-72 rounded-b-md"
              srcDoc={offer ? renderEmailWithLeadData(html, offer) : ""}
              sandbox=""
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || loadingTemplate || loadingAliases || !canSendRebuttal || !selectedAliasId}>
            {sending ? "Sending…" : `Send ${selectedType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
