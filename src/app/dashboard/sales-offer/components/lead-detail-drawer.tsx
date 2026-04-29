"use client";

import { format } from "date-fns";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { OfferDoc, OfferCallbackEntry, OfferHistoryEntry } from "@/util/type";
import { LeadStatusBadge } from "./lead-status-badge";
import { ContactCell } from "./contact-cell";
import { Button } from "@/components/ui/button";
import {
  SendReminderDialog,
  SendRebuttalDialog,
} from "./action-dialogs";

interface LeadDetailDrawerProps {
  offer: OfferDoc | null;
  open: boolean;
  onClose: () => void;
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy, HH:mm"); } catch { return d; }
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[120px] shrink-0">{label}:</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
      {children}
    </h3>
  );
}

function TimelineEvent({ event }: { event: OfferHistoryEntry }) {
  const typeColors: Record<string, string> = {
    callback: "bg-blue-500",
    rejection: "bg-red-500",
    blacklist: "bg-rose-800",
    offer: "bg-green-500",
    lead: "bg-slate-400",
  };
  const dot = typeColors[event.type] ?? "bg-slate-400";
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${dot}`} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-2 flex-1">
        <p className="text-sm font-medium">{event.status}</p>
        {event.note && <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">
          {event.updatedByName && <span>{event.updatedByName} · </span>}
          {formatDate(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

function CallbackCard({ cb }: { cb: OfferCallbackEntry }) {
  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">Callback {cb.callbackNo}</Badge>
        <span className="text-xs text-muted-foreground">{formatDate(cb.date)}</span>
      </div>
      {cb.time && <p className="text-xs text-muted-foreground">Time: {cb.time}</p>}
      {cb.note && <p className="text-xs">{cb.note}</p>}
      {cb.createdByName && (
        <p className="text-xs text-muted-foreground">By: {cb.createdByName}</p>
      )}
    </div>
  );
}

function EmailEventCard({
  event,
}: {
  event: NonNullable<OfferDoc["emailEvents"]>[number];
}) {
  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {event.kind}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatDate(event.sentAt)}</span>
      </div>
      <p className="text-xs"><span className="text-muted-foreground">Subject:</span> {event.subjectSnapshot}</p>
      {event.sentByName && (
        <p className="text-xs text-muted-foreground">Sent by: {event.sentByName}</p>
      )}
      {event.contentSnapshot && (
        <div className="rounded border bg-muted/40 p-2">
          <p className="text-[11px] text-muted-foreground mb-1">Final content snapshot</p>
          <div className="max-h-36 overflow-auto text-[11px] break-words whitespace-pre-wrap">
            {event.contentSnapshot}
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadDetailDrawer({ offer, open, onClose }: LeadDetailDrawerProps) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [rebuttalOpen, setRebuttalOpen] = useState(false);
  if (!offer) return null;
  const canSendRebuttal = offer.leadStatus === "Reject Lead" || offer.leadStatus === "Not Interested";

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <SheetHeader className="px-6 pt-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            {offer.name}
            <LeadStatusBadge status={offer.leadStatus} />
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="px-6 py-4 space-y-1">
            <SectionTitle>Contact</SectionTitle>
            <ContactCell phone={offer.phoneNumber} email={offer.email} className="mb-2" />
            <Row label="Property" value={offer.propertyName} />
            <Row label="Property URL" value={
              offer.propertyUrl ? (
                <a href={offer.propertyUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs break-all">
                  {offer.propertyUrl}
                </a>
              ) : undefined
            } />
            <Row label="Country" value={[offer.country, offer.state, offer.city].filter(Boolean).join(", ")} />
            <Row label="Relation" value={offer.relation} />

            <SectionTitle>Offer Details</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => setReminderOpen(true)}>
                Reminders
              </Button>
              {canSendRebuttal && (
                <Button size="sm" variant="outline" onClick={() => setRebuttalOpen(true)}>
                  Send Rebuttal
                </Button>
              )}
            </div>
            <Row label="Platform" value={offer.platform} />
            <Row label="Plan" value={offer.plan} />
            <Row label="Effective Price" value={offer.effectivePrice ? `€${offer.effectivePrice}` : undefined} />
            <Row label="Expiry Date" value={formatDate(offer.expiryDate)} />
            {offer.note && <Row label="Note" value={offer.note} />}

            {offer.sentBySnapshot && (
              <>
                <SectionTitle>Sent By</SectionTitle>
                <Row label="Name" value={offer.sentBySnapshot.name} />
                <Row label="Alias" value={offer.sentBySnapshot.aliasName} />
                <Row label="Email" value={offer.sentBySnapshot.aliasEmail ?? offer.sentBySnapshot.email} />
              </>
            )}

            {offer.emailSubject && (
              <>
                <SectionTitle>Email Snapshot</SectionTitle>
                <Row label="Subject" value={offer.emailSubject} />
              </>
            )}

            {offer.rejectedAt && (
              <>
                <SectionTitle>Rejection Info</SectionTitle>
                <Row label="Reason" value={offer.rejectionReason} />
                <Row label="Rejected At" value={formatDate(offer.rejectedAt)} />
              </>
            )}

            {offer.blacklistedAt && (
              <>
                <SectionTitle>Blacklist Info</SectionTitle>
                <Row label="Reason" value={offer.blacklistReason} />
                <Row label="Blacklisted At" value={formatDate(offer.blacklistedAt)} />
              </>
            )}

            {(offer.callbacks?.length ?? 0) > 0 && (
              <>
                <SectionTitle>Callbacks ({offer.callbacks.length})</SectionTitle>
                <div className="space-y-2">
                  {offer.callbacks.map((cb, i) => (
                    <CallbackCard key={cb._id ?? i} cb={cb} />
                  ))}
                </div>
              </>
            )}

            {(offer.history?.length ?? 0) > 0 && (
              <>
                <SectionTitle>Activity Timeline</SectionTitle>
                <div>
                  {[...offer.history].reverse().map((event, i) => (
                    <TimelineEvent key={event._id ?? i} event={event} />
                  ))}
                </div>
              </>
            )}

            {(offer.emailEvents?.length ?? 0) > 0 && (
              <>
                <SectionTitle>Reminder / Rebuttal Emails</SectionTitle>
                <div className="space-y-2">
                  {[...(offer.emailEvents ?? [])].reverse().map((event, i) => (
                    <EmailEventCard key={event._id ?? i} event={event} />
                  ))}
                </div>
              </>
            )}

            <div className="pt-4">
              <Row label="Created" value={formatDate(offer.createdAt)} />
              <Row label="Updated" value={formatDate(offer.updatedAt)} />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    <SendReminderDialog
      open={reminderOpen}
      offer={offer}
      onClose={() => setReminderOpen(false)}
      onSuccess={() => {
        setReminderOpen(false);
        onClose();
      }}
    />
    <SendRebuttalDialog
      open={rebuttalOpen}
      offer={offer}
      onClose={() => setRebuttalOpen(false)}
      onSuccess={() => {
        setRebuttalOpen(false);
        onClose();
      }}
    />
    </>
  );
}
