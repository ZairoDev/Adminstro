"use client";

import { useCallback, useEffect, useState } from "react";
import { EllipsisVertical } from "lucide-react";
import axios from "@/util/axios";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CapabilityOption } from "@/components/employee/EmployeeCapabilityTypeahead";

type CapRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  employeeCode: string | null;
  isTrainer: boolean;
  isReportingManager: boolean;
};

type PanelProps = {
  flag: "trainer" | "reportingManager";
  title: string;
  addLabel: string;
};

function CapabilitySection({ flag, title, addLabel }: PanelProps) {
  const [rows, setRows] = useState<CapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<CapabilityOption | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/employee/hr-capabilities?flag=${flag}`,
      );
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      toast({
        title: `Unable to fetch ${title.toLowerCase()}s`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [flag, title]);

  useEffect(() => {
    load();
  }, [load]);

  const setFlag = async (
    employeeId: string,
    enabled: boolean,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await axios.put("/api/employee/hr-capabilities", {
        employeeId,
        ...(flag === "trainer"
          ? { isTrainer: enabled }
          : { isReportingManager: enabled }),
      });
      await load();
      toast({
        title: enabled ? `Added as ${title}` : `Removed ${title}`,
      });
      return true;
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data
              .error
          : "Update failed";
      toast({ title: msg, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!pick) return;
    const ok = await setFlag(pick.id, true);
    if (ok) {
      setPick(null);
      setAdding(false);
    }
  };

  const handleCancelAdd = () => {
    setAdding(false);
    setPick(null);
  };

  return (
    <section className="border rounded-md w-64 min-h-80 h-80 overflow-y-scroll flex flex-col items-center justify-between gap-2 mt-8 p-2">
      {loading ? (
        <InfinityLoader className="w-16 h-12" />
      ) : (
        <div className="w-full flex flex-col gap-y-2">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">
              None marked yet.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex justify-between items-center w-full p-2 border rounded-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {row.role}
                    {row.jobTitle ? ` · ${row.jobTitle}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-muted"
                      aria-label={`${title} actions`}
                    >
                      <EllipsisVertical size={22} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    avoidCollisions={false}
                  >
                    <DropdownMenuLabel>{title} Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={saving}
                      onSelect={() => {
                        void setFlag(row.id, false);
                      }}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      )}

      {adding ? (
        <div className="w-full space-y-2 border-t pt-2">
          <ActiveEmployeePicker value={pick} onChange={setPick} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancelAdd}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!pick || saving}
              onClick={handleAdd}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="w-full"
          onClick={() => setAdding(true)}
        >
          <span className="font-semibold text-base">{addLabel}</span>
        </Button>
      )}
    </section>
  );
}

/** Search any active employee (not only already-flagged) to grant the flag. */
function ActiveEmployeePicker({
  value,
  onChange,
}: {
  value: CapabilityOption | null;
  onChange: (v: CapabilityOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CapabilityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) return;
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/employee/getAllEmployee?queryType=name&userInput=${encodeURIComponent(q)}&currentPage=1`,
        );
        const list = Array.isArray(res.data?.allEmployees)
          ? res.data.allEmployees
          : [];
        setOptions(
          list
            .filter((e: { isActive?: boolean }) => e.isActive !== false)
            .slice(0, 15)
            .map(
              (e: {
                _id: string;
                name?: string;
                email?: string;
                role?: string;
                jobTitle?: string;
                employeeCode?: string | null;
              }) => ({
                id: String(e._id),
                name: String(e.name || "").trim(),
                email: String(e.email || "").trim(),
                role: String(e.role || "").trim(),
                jobTitle: String(e.jobTitle || "").trim(),
                employeeCode: e.employeeCode ?? null,
              }),
            ),
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm bg-muted/40">
        <span className="truncate font-medium">{value.name}</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        className="w-full border rounded px-2 py-1.5 text-sm bg-background"
        placeholder="Search active employee…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading ? (
        <p className="text-xs text-muted-foreground">Searching…</p>
      ) : null}
      {options.length > 0 ? (
        <div className="max-h-28 overflow-y-auto border rounded bg-background">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => onChange(opt)}
            >
              {opt.name}
              <span className="block text-[11px] text-muted-foreground truncate">
                {opt.role} · {opt.email}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HrCapabilitiesPanel() {
  return (
    <>
      <CapabilitySection
        flag="trainer"
        title="Trainer"
        addLabel="Add Trainer"
      />
      <CapabilitySection
        flag="reportingManager"
        title="Reporting Manager"
        addLabel="Add Manager"
      />
    </>
  );
}
