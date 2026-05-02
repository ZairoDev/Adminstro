"use client";

import axios from "@/util/axios";
import { format } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/AuthStore";
import {
  Search,
  RefreshCw,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Loader2,
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

/** Public VacationSaga listing page is keyed by MongoDB property _id, not VSID. */
function publicListingPropertyUrl(propertyMongoId: string): string {
  return `https://www.vacationsaga.com/listing-stay-detail/${encodeURIComponent(propertyMongoId)}`;
}

interface WebsiteLead {
  _id: string;
  firstName: string;
  lastName: string;
  telephone: string;
  VSID: string;
  /** Resolved from Properties by VSID; public site URL must use this id. */
  propertyMongoId: string | null;
  email?: string;
  message: string;
  note?: NotesInterface[];
  createdAt: string;
  updatedAt: string;
}

const WebsiteLeadsPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const isSuperAdmin = token?.role === "SuperAdmin";

  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState<string>("");
  const [creatingNote, setCreatingNote] = useState<boolean>(false);
  const [resolvingLeadId, setResolvingLeadId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<
    Record<string, { telephone: string; email: string }>
  >({});

  const [page, setPage] = useState<number>(
    Number.parseInt(searchParams?.get("page") ?? "1")
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("name");

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    setPage(newPage);
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
      });

      if (searchTerm) {
        params.append("searchTerm", searchTerm);
        params.append("searchType", searchType);
      }

      const response = await axios.get(`/api/website-leads?${params.toString()}`);
      setLeads(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalLeads(response.data.totalLeads);
    } catch (err) {
      toast({
        title: "Unable to fetch website leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, searchType, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleRefresh = () => {
    fetchLeads();
    toast({
      title: "Refreshed!",
      description: "Website leads have been refreshed",
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedId(null), 2000);
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
          prev.map((item) => (item._id === leadId ? updated : item))
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

  /** VacationSaga public URLs use property MongoDB `_id`. Resolve via VSID when missing from list enrichment. */
  const ensurePropertyMongoId = useCallback(
    async (lead: WebsiteLead): Promise<string | null> => {
      if (lead.propertyMongoId) {
        return lead.propertyMongoId;
      }
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

  const openAdminPropertyEdit = async (lead: WebsiteLead) => {
    try {
      setResolvingLeadId(lead._id);
      const id = await ensurePropertyMongoId(lead);
      if (!id) {
        toast({
          title: "Property not found",
          description: "No admin listing matches this VSID.",
          variant: "destructive",
        });
        return;
      }
      window.open(
        `/dashboard/property/edit/${id}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      toast({
        title: "Could not open property",
        variant: "destructive",
      });
    } finally {
      setResolvingLeadId(null);
    }
  };

  const handleLeadUpdate = async (lead: WebsiteLead) => {
    const payload = editBuffer[lead._id];
    if (!payload) return;
    try {
      setUpdatingId(lead._id);
      const res = await axios.patch("/api/website-leads", {
        action: "updateLead",
        leadId: lead._id,
        telephone: payload.telephone,
        email: payload.email,
      });
      const updatedLead: WebsiteLead = res.data.data;
      setLeads((prev) =>
        prev.map((item) => (item._id === lead._id ? updatedLead : item))
      );
      toast({
        title: "Lead updated",
      });
    } catch {
      toast({
        title: "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    setPage(Number.parseInt(searchParams?.get("page") ?? "1"));
  }, [searchParams]);

  useEffect(() => {
    fetchLeads();
  }, [page]);


  return (
    <div className="w-full min-h-screen">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading
          heading="Website Leads"
          subheading={`${totalLeads} lead${totalLeads === 1 ? "" : "s"} · VacationSaga links use property id resolved from VSID`}
        />
        <Button variant="outline" size="sm" onClick={handleRefresh} className="shrink-0 gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="h-9 w-full sm:w-[140px]">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="telephone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="VSID">VSID</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" className="h-9 shrink-0">
            Search
          </Button>
        </div>
      </form>

      {/* Content Section */}
      {loading ? (
        <div className="flex mt-8 min-h-[60vh] items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="mt-6">
          {leads.length > 0 ? (
            <div className="divide-y rounded-md border bg-card">
              {leads.map((lead, index) => (
                <div key={lead._id} className="px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-start gap-2">
                    <Dialog
                      onOpenChange={(open) => {
                        if (!open) setNoteValue("");
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant={lead.note && lead.note.length > 0 ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8 shrink-0"
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
                            onClick={() => handleAddNote(lead._id)}
                            disabled={!noteValue.trim() || creatingNote}
                          >
                            {creatingNote ? "Saving…" : "Save note"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt ?? ""), "PPp")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · #{(page - 1) * 50 + index + 1}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {isSuperAdmin ? (
                            <Input
                              className="h-7 max-w-[160px] text-xs"
                              value={editBuffer[lead._id]?.telephone ?? lead.telephone}
                              onChange={(e) =>
                                setEditBuffer((prev) => ({
                                  ...prev,
                                  [lead._id]: {
                                    telephone: e.target.value,
                                    email: prev[lead._id]?.email ?? lead.email ?? "",
                                  },
                                }))
                              }
                            />
                          ) : (
                            <span className="font-mono text-foreground">{lead.telephone}</span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(lead.telephone, `phone-${lead._id}`)}
                            aria-label="Copy phone"
                          >
                            {copiedId === `phone-${lead._id}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          {isSuperAdmin ? (
                            <Input
                              className="h-7 max-w-[200px] text-xs"
                              value={editBuffer[lead._id]?.email ?? lead.email ?? ""}
                              onChange={(e) =>
                                setEditBuffer((prev) => ({
                                  ...prev,
                                  [lead._id]: {
                                    telephone: prev[lead._id]?.telephone ?? lead.telephone,
                                    email: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            <span className="truncate text-foreground">
                              {lead.email || "—"}
                            </span>
                          )}
                          {lead.email ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(lead.email!, `email-${lead._id}`)}
                              aria-label="Copy email"
                            >
                              {copiedId === `email-${lead._id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          ) : null}
                        </span>
                      </div>

                      <p
                        className="line-clamp-2 text-xs text-muted-foreground"
                        title={lead.message}
                      >
                        {lead.message || "—"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <span
                        className="font-mono text-[11px] text-muted-foreground"
                        title="VSID"
                      >
                        {lead.VSID}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2"
                        title="Opens vacationsaga.com listing using MongoDB id resolved from VSID"
                        onClick={() => void openVacationSagaListing(lead)}
                        disabled={resolvingLeadId === lead._id}
                      >
                        {resolvingLeadId === lead._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        VacationSaga
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2"
                        onClick={() => void openAdminPropertyEdit(lead)}
                        disabled={resolvingLeadId === lead._id}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        Admin
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(lead.VSID, `vsid-${lead._id}`)}
                        aria-label="Copy VSID"
                      >
                        {copiedId === `vsid-${lead._id}` ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="mt-2 flex justify-end border-t border-border/50 pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleLeadUpdate(lead)}
                        disabled={updatingId === lead._id}
                      >
                        {updatingId === lead._id ? "Saving…" : "Save phone & email"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <Globe className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No website leads found</p>
              <p className="text-sm">
                New leads from the website will appear here
              </p>
            </div>
          )}

          {/* Pagination */}
          {leads.length > 0 && (
            <div className="flex items-center justify-between p-4 mt-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} — {totalLeads} total results
              </p>
              <Pagination className="flex justify-end">
                <PaginationContent className="text-sm flex flex-wrap justify-end w-full md:w-auto">
                  {renderPaginationItems()}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteLeadsPage;

