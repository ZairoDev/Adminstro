"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import type { HousingSagaQueryView } from "@/schemas/housingSagaQuery.schema";

type HousingSagaLeadsTableProps = {
  refreshKey: number;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function HousingSagaLeadsTable({ refreshKey }: HousingSagaLeadsTableProps) {
  const [leads, setLeads] = useState<HousingSagaQueryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get<{
        data?: HousingSagaQueryView[];
        total?: number;
        totalPages?: number;
      }>("/api/housingsaga/queries", {
        params: { page, limit: 12 },
      });
      setLeads(response.data.data ?? []);
      setTotal(response.data.total ?? 0);
      setTotalPages(response.data.totalPages ?? 1);
    } catch {
      setError("Could not load Housing Saga leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads, refreshKey]);

  if (loading) {
    return (
      <div className="flex mt-2 min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <p className="mt-6 text-sm text-destructive">{error}</p>;
  }

  if (leads.length === 0) {
    return (
      <div className="mt-2 border rounded-lg min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        No Housing Saga leads yet
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Type of Property</th>
              <th className="px-3 py-2 font-medium">Country</th>
              <th className="px-3 py-2 font-medium">City</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Min Budget</th>
              <th className="px-3 py-2 font-medium">Max Budget</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id} className="border-t">
                <td className="px-3 py-2">{lead.name}</td>
                <td className="px-3 py-2">{lead.email}</td>
                <td className="px-3 py-2">{lead.phoneNo}</td>
                <td className="px-3 py-2">{lead.typeOfProperty}</td>
                <td className="px-3 py-2">{lead.country}</td>
                <td className="px-3 py-2">{lead.city}</td>
                <td className="px-3 py-2">{lead.location}</td>
                <td className="px-3 py-2">{lead.minBudget}</td>
                <td className="px-3 py-2">{lead.maxBudget}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatCreatedAt(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-2">
        <p className="text-xs">
          Page {page} of {totalPages} — {total} total results
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
