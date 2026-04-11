"use client";

import { useEffect, useMemo, useState } from "react";

import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useOrgSelectionStore } from "../useOrgSelectionStore";

type OfferLead = {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  propertyUrl: string;
  country: string;
  city?: string;
  leadStage?: string;
  assignedTo?: string | null;
  organization?: string;
  source?: string;
  createdAt?: string;
};

type EmployeeOption = {
  _id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
};

async function fetchLeads(params: {
  leadStage?: string;
  mine?: boolean;
  page?: number;
  organization?: string;
}) {
  const sp = new URLSearchParams();
  if (params.leadStage) sp.set("leadStage", params.leadStage);
  if (params.mine) sp.set("mine", "true");
  if (params.organization) sp.set("organization", params.organization);
  sp.set("page", String(params.page ?? 1));
  sp.set("pageSize", "20");
  const res = await axios.get(`/api/leads/list?${sp.toString()}`);
  return res.data as { items: OfferLead[]; totalPages: number; page: number };
}

export default function LeadsDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const role = String(token?.role ?? "").trim();
  const isAdmin = role === "SuperAdmin" || role === "HAdmin" || role === "Admin";
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [tab, setTab] = useState<"pending" | "assigned" | "mine">("pending");
  const [items, setItems] = useState<OfferLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const org = selectedOrg ?? undefined;
        const res =
          tab === "mine"
            ? await fetchLeads({ mine: true, page, organization: org })
            : await fetchLeads({ leadStage: tab, page, organization: org });
        if (!mounted) return;
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalPages(Number(res.totalPages ?? 1) || 1);
        setSelected({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [tab, page, selectedOrg]);

  useEffect(() => {
    let mounted = true;
    async function loadEmployees() {
      if (!isAdmin) return;
      const res = await axios.get("/api/employee/getAllEmployee?currentPage=1");
      const list = (res.data?.allEmployees ?? []) as EmployeeOption[];
      if (!mounted) return;
      setEmployees(list);
    }
    loadEmployees().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  async function claimLead(leadId: string) {
    await axios.post("/api/leads/claim", { leadId });
    const res = await fetchLeads({
      leadStage: "pending",
      page: 1,
      organization: selectedOrg ?? undefined,
    });
    setTab("pending");
    setPage(1);
    setItems(res.items);
    setTotalPages(res.totalPages);
  }

  async function assignLeads() {
    if (!assignEmployeeId || selectedIds.length === 0) return;
    await axios.patch("/api/leads/assign", { leadIds: selectedIds, employeeId: assignEmployeeId });
    const res = await fetchLeads({
      leadStage: "assigned",
      page: 1,
      organization: selectedOrg ?? undefined,
    });
    setTab("assigned");
    setPage(1);
    setItems(res.items);
    setTotalPages(res.totalPages);
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Leads</div>
          <div className="text-sm text-muted-foreground">
            Pending pool, assignments, and your claimed leads (stored in Offers).
          </div>
        </div>
        <a
          className="text-sm underline"
          href="/dashboard/sales-offer/leads/import"
        >
          Import leads
        </a>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Pool</TabsTrigger>
          <TabsTrigger value="assigned">Assigned Leads</TabsTrigger>
          <TabsTrigger value="mine">My Leads</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isAdmin && tab !== "mine" && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border p-3">
              <div className="min-w-[260px]">
                <Label>Assign selected to</Label>
                <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Employees</SelectLabel>
                      {employees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.name} ({e.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={assignLeads} disabled={!assignEmployeeId || selectedIds.length === 0}>
                  Assign ({selectedIds.length})
                </Button>
                <div className="text-xs text-muted-foreground">
                  Select leads using the checkboxes.
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-md border">
            <div className="overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="p-2 w-10 text-left">
                      {isAdmin && tab !== "mine" ? "Sel" : ""}
                    </th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Property</th>
                    <th className="p-2 text-left">Stage</th>
                    <th className="p-2 text-left">Source</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="p-3" colSpan={8}>
                        Loading…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={8}>
                        No leads found.
                      </td>
                    </tr>
                  ) : (
                    items.map((l) => (
                      <tr key={l._id} className="border-b last:border-b-0">
                        <td className="p-2 align-top">
                          {isAdmin && tab !== "mine" ? (
                            <Input
                              type="checkbox"
                              checked={Boolean(selected[l._id])}
                              onChange={(e) =>
                                setSelected((s) => ({ ...s, [l._id]: e.target.checked }))
                              }
                            />
                          ) : null}
                        </td>
                        <td className="p-2 align-top">{l.name}</td>
                        <td className="p-2 align-top">{l.phoneNumber}</td>
                        <td className="p-2 align-top">{l.email}</td>
                        <td className="p-2 align-top">
                          {l.propertyUrl ? (
                            <a className="underline" href={l.propertyUrl} target="_blank" rel="noreferrer">
                              Link
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 align-top">{l.leadStage ?? "pending"}</td>
                        <td className="p-2 align-top">{l.source ?? "manual"}</td>
                        <td className="p-2 align-top">
                          {tab === "pending" && !isAdmin ? (
                            <Button size="sm" onClick={() => claimLead(l._id)}>
                              Claim
                            </Button>
                          ) : (
                            <a className="underline" href="/dashboard/sales-offer">
                              Send offer
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

