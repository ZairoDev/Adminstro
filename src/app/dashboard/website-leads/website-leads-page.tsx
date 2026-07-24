"use client";

import axios from "@/util/axios";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  RefreshCw,
  Globe,
  MessageSquare,
  ExternalLink,
  Smartphone,
  UserPlus,
} from "lucide-react";

import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import HandLoader from "@/components/HandLoader";
import { Toaster } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { NotesInterface } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import { TakeLeadDialog } from "./TakeLeadDialog";

const TAKE_ROLES = new Set(["Sales", "Sales-TeamLead", "SuperAdmin"]);

/** Public VacationSaga listing page is keyed by MongoDB property _id, not VSID. */
function publicListingPropertyUrl(propertyMongoId: string): string {
  return `https://www.vacationsaga.com/listing-stay-detail/${encodeURIComponent(propertyMongoId)}`;
}

interface WebsiteLead {
  _id: string;
  source?: "web" | "mobile";
  firstName: string;
  lastName: string;
  telephone: string;
  VSID: string;
  propertyMongoId: string | null;
  email?: string;
  message: string;
  note?: NotesInterface[];
  createdAt: string;
  updatedAt: string;
  bookingStatus?: string;
  paymentStatus?: string;
  price?: number;
  startDate?: string;
  endDate?: string;
  totalNights?: number;
  propertyLabel?: string;
  propertyCity?: string;
  propertyCountry?: string;
  claimedBy?: string | null;
  claimedAt?: string | null;
  queryId?: string | null;
}

type LeadSourceFilter = "all" | "web" | "mobile";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStay(start?: string, end?: string) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${s.toLocaleDateString("en-GB", opts)} → ${e.toLocaleDateString("en-GB", opts)}`;
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "inquiry":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-amber-100 text-amber-900 border-amber-200";
  }
}

function LeadRow({
  lead,
  noteValue,
  setNoteValue,
  creatingNote,
  resolvingLeadId,
  canTakeLead,
  onAddNote,
  onOpenListing,
  onTakeLead,
}: {
  lead: WebsiteLead;
  noteValue: string;
  setNoteValue: (v: string) => void;
  creatingNote: boolean;
  resolvingLeadId: string | null;
  canTakeLead: boolean;
  onAddNote: (leadId: string) => void;
  onOpenListing: (lead: WebsiteLead) => void;
  onTakeLead: (lead: WebsiteLead) => void;
}) {
  const isMobile = lead.source === "mobile";
  const isTaken = Boolean(lead.queryId);
  const guest =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Guest";
  const property =
    lead.propertyLabel || (isMobile ? "Property" : "Website inquiry");
  const status = isMobile ? lead.bookingStatus || "pending" : "inquiry";
  const location = [lead.propertyCity, lead.propertyCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/80 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900">{guest}</div>
        {lead.telephone ? (
          <div className="text-xs text-stone-600 mt-0.5">{lead.telephone}</div>
        ) : null}
        {lead.email ? (
          <div className="text-xs text-stone-500 mt-0.5">{lead.email}</div>
        ) : null}
        <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isMobile
                              ? "border-sky-200 bg-sky-50 text-sky-800"
                              : "border-violet-200 bg-violet-50 text-violet-800"
                          }`}
                        >
                          {isMobile ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          {isMobile ? "Mobile" : "Web"}
                        </span>
                        {isTaken ? (
                          <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                            Taken
                          </span>
                        ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-stone-800">{property}</div>
        {lead.VSID ? (
          <div className="text-xs font-medium text-stone-600 mt-0.5">
            VSID: {lead.VSID}
          </div>
        ) : null}
        {location ? (
          <div className="text-xs text-stone-500 mt-0.5">{location}</div>
        ) : null}
        {!isMobile && lead.message ? (
          <div
            className="text-xs text-stone-500 mt-0.5 line-clamp-2 max-w-[280px]"
            title={lead.message}
          >
            {lead.message}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm text-stone-700 whitespace-nowrap">
        {formatStay(lead.startDate, lead.endDate)}
        {lead.totalNights ? (
          <div className="text-xs text-stone-500 mt-0.5">
            {lead.totalNights} night{lead.totalNights === 1 ? "" : "s"}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass(status)}`}
        >
          {status}
        </span>
        {isMobile && lead.paymentStatus ? (
          <div className="text-xs text-stone-500 mt-1 capitalize">
            pay: {lead.paymentStatus}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-stone-900 whitespace-nowrap">
        {lead.price != null
          ? `€${Number(lead.price || 0).toLocaleString("en-IN")}`
          : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-stone-600 whitespace-nowrap">
        {formatDate(lead.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {canTakeLead && !isTaken ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              onClick={() => onTakeLead(lead)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Take
            </Button>
          ) : null}
          {isTaken && lead.queryId ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() =>
                window.open(
                  `/dashboard/createquery/${lead.queryId}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Open
            </Button>
          ) : null}
          {!isMobile ? (
            <Dialog
              onOpenChange={(open) => {
                if (!open) setNoteValue("");
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant={
                    lead.note && lead.note.length > 0 ? "secondary" : "ghost"
                  }
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Notes"
                  title="Notes"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Notes</DialogTitle>
                </DialogHeader>
                <Textarea
                  className="min-h-[72px]"
                  placeholder="Add a note…"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                />
                <p className="text-sm font-medium text-foreground">Previous</p>
                <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                  {lead.note && lead.note.length > 0 ? (
                    lead.note.map((n, noteIndex) => (
                      <div
                        key={`${n.createOn}-${noteIndex}`}
                        className="border-b border-border/60 pb-2 last:border-0"
                      >
                        <p className="whitespace-pre-wrap">{n.noteData}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {n.createOn} · {n.createdBy}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No notes yet.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onAddNote(lead._id)}
                    disabled={!noteValue.trim() || creatingNote}
                  >
                    {creatingNote ? "Saving…" : "Save note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Open VacationSaga listing"
            onClick={() => onOpenListing(lead)}
            disabled={resolvingLeadId === lead._id || !lead.VSID}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const WebsiteLeadsPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const canTakeLead = TAKE_ROLES.has(String(token?.role || ""));

  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ web: 0, mobile: 0, all: 0 });
  const [noteValue, setNoteValue] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [resolvingLeadId, setResolvingLeadId] = useState<string | null>(null);
  const [includeTaken, setIncludeTaken] = useState(false);
  const [takeTarget, setTakeTarget] = useState<{
    source: "web" | "mobile";
    id: string;
  } | null>(null);

  const [page, setPage] = useState(
    Number.parseInt(searchParams?.get("page") ?? "1")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>(
    (searchParams?.get("source") as LeadSourceFilter) || "all"
  );

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", newPage.toString());
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    else params.delete("source");
    router.push(`?${params.toString()}`);
    setPage(newPage);
  };

  const handleSourceChange = (value: LeadSourceFilter) => {
    setSourceFilter(value);
    setPage(1);
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", "1");
    if (value !== "all") params.set("source", value);
    else params.delete("source");
    router.push(`?${params.toString()}`);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    return items;
  };

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        source: sourceFilter,
      });
      if (includeTaken) params.set("includeTaken", "1");

      if (searchTerm) {
        params.append("searchTerm", searchTerm);
        params.append("searchType", searchType);
      }

      const response = await axios.get(`/api/website-leads?${params.toString()}`);
      setLeads(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalLeads(response.data.totalLeads);
      if (response.data.counts) {
        setCounts(response.data.counts);
      }
    } catch {
      toast({
        title: "Unable to fetch leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, searchType, sourceFilter, includeTaken, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleRefresh = () => {
    fetchLeads();
    toast({
      title: "Refreshed!",
      description: "Leads have been refreshed",
    });
  };

  const handleAddNote = async (leadId: string) => {
    if (!noteValue.trim()) return;
    try {
      setCreatingNote(true);
      const res = await axios.patch<{ data: WebsiteLead }>("/api/website-leads", {
        action: "addNote",
        leadId,
        note: noteValue.trim(),
      });
      setNoteValue("");
      const updated = res.data.data;
      if (updated) {
        setLeads((prev) =>
          prev.map((item) =>
            item._id === leadId
              ? { ...updated, source: item.source ?? "web" }
              : item
          )
        );
      } else {
        fetchLeads();
      }
      toast({ title: "Note saved" });
    } catch {
      toast({
        title: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setCreatingNote(false);
    }
  };

  const ensurePropertyMongoId = useCallback(
    async (lead: WebsiteLead): Promise<string | null> => {
      if (lead.propertyMongoId) return lead.propertyMongoId;
      try {
        const res = await axios.post<{ data?: { _id: string } }>(
          "/api/property/getPropertyByVSID",
          { VSID: lead.VSID }
        );
        const id =
          res.data.data?._id !== undefined
            ? String(res.data.data._id)
            : null;
        if (id) {
          setLeads((prev) =>
            prev.map((l) =>
              l._id === lead._id ? { ...l, propertyMongoId: id } : l
            )
          );
          return id;
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  const openVacationSagaListing = async (lead: WebsiteLead) => {
    try {
      setResolvingLeadId(lead._id);
      const id = await ensurePropertyMongoId(lead);
      if (!id) {
        toast({
          title: "Listing not found",
          description: "No property matches this VSID in the database.",
          variant: "destructive",
        });
        return;
      }
      window.open(
        publicListingPropertyUrl(id),
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      toast({
        title: "Could not open listing",
        variant: "destructive",
      });
    } finally {
      setResolvingLeadId(null);
    }
  };

  useEffect(() => {
    setPage(Number.parseInt(searchParams?.get("page") ?? "1"));
  }, [searchParams]);

  useEffect(() => {
    fetchLeads();
  }, [page, sourceFilter, includeTaken]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Toaster />

      {takeTarget ? (
        <TakeLeadDialog
          open={Boolean(takeTarget)}
          onOpenChange={(open) => {
            if (!open) setTakeTarget(null);
          }}
          source={takeTarget.source}
          leadId={takeTarget.id}
          onTaken={() => {
            setTakeTarget(null);
            fetchLeads();
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading
            heading="Website & Mobile Leads"
            subheading={`${totalLeads} lead${totalLeads === 1 ? "" : "s"} · Web ${counts.web} · Mobile ${counts.mobile}${includeTaken ? "" : " · available only"}`}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh leads"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <form onSubmit={handleSearch}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 bg-white"
            />
          </div>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="h-9 w-full sm:w-[140px] bg-white">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="telephone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="VSID">VSID</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(v) => handleSourceChange(v as LeadSourceFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[140px] bg-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="web">Web only</SelectItem>
              <SelectItem value="mobile">Mobile only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={includeTaken ? "secondary" : "outline"}
            size="sm"
            className="h-9 shrink-0"
            onClick={() => {
              setIncludeTaken((v) => !v);
              setPage(1);
            }}
          >
            {includeTaken ? "Showing taken" : "Show taken"}
          </Button>
          <Button type="submit" size="sm" className="h-9 shrink-0">
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span>
          {totalLeads} total · showing {leads.length}
        </span>
        <span>Page {page} of {totalPages}</span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <HandLoader />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            No leads found. Website inquiries and mobile bookings will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Stay dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadRow
                    key={`${lead.source ?? "web"}-${lead._id}`}
                    lead={lead}
                    noteValue={noteValue}
                    setNoteValue={setNoteValue}
                    creatingNote={creatingNote}
                    resolvingLeadId={resolvingLeadId}
                    canTakeLead={canTakeLead}
                    onAddNote={handleAddNote}
                    onOpenListing={openVacationSagaListing}
                    onTakeLead={(l) =>
                      setTakeTarget({
                        source: l.source === "mobile" ? "mobile" : "web",
                        id: l._id,
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {leads.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages} — {totalLeads} total
          </p>
          <Pagination className="flex justify-end">
            <PaginationContent className="text-sm flex flex-wrap justify-end">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
};

export default WebsiteLeadsPage;
