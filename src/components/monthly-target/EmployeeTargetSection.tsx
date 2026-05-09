"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "@/util/axios";
import { normalizeCityKey } from "@/lib/city-normalizer";

interface EmployeeRow {
  employeeId: string;
  name: string;
  role: string;
  leads: number;
  visits: number;
  sales: number;
  hasSavedTarget: boolean;
}

type EmpStatus = "idle" | "saving" | "saved" | "error";

interface EmployeeState {
  leads: string;
  visits: string;
  sales: string;
  status: EmpStatus;
  error?: string;
}

interface EmployeeTargetSectionProps {
  city: string;
  currentMonth: number;
  currentYear: number;
  editableFields: Array<"leads" | "visits" | "sales">;
}

export function EmployeeTargetSection({
  city,
  currentMonth,
  currentYear,
  editableFields,
}: EmployeeTargetSectionProps) {
  const cityKey = normalizeCityKey(city);

  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRow[]>([]);
  const [leadGenEmployees, setLeadGenEmployees] = useState<EmployeeRow[]>([]);
  const [rows, setRows] = useState<Record<string, EmployeeState>>({});

  const canEditVisits = editableFields.includes("visits");
  const canEditSales = editableFields.includes("sales");
  const canEditLeads = editableFields.includes("leads");

  const showSalesSection = canEditVisits || canEditSales;
  const showLeadGenSection = canEditLeads;

  const fetchEmployees = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await axios.get<{
        salesEmployees: EmployeeRow[];
        leadGenEmployees: EmployeeRow[];
      }>(
        `/api/monthly-target/employees?cityKey=${encodeURIComponent(cityKey)}&month=${currentMonth}&year=${currentYear}`
      );

      const sales = data.salesEmployees ?? [];
      const leadGen = data.leadGenEmployees ?? [];

      setSalesEmployees(sales);
      setLeadGenEmployees(leadGen);

      const initial: Record<string, EmployeeState> = {};
      const toState = (e: EmployeeRow): EmployeeState => ({
        leads: String(e.leads),
        visits: String(e.visits),
        sales: String(e.sales),
        status: e.hasSavedTarget ? "saved" : "idle",
      });

      sales.forEach((e) => { initial[e.employeeId] = toState(e); });
      leadGen.forEach((e) => { initial[e.employeeId] = toState(e); });

      setRows(initial);
    } catch {
      // silently ignore — user can retry by closing and reopening
    } finally {
      setIsFetching(false);
      setHasFetched(true);
    }
  }, [cityKey, currentMonth, currentYear]);

  const handleToggle = () => {
    if (!hasFetched && !isOpen) {
      fetchEmployees();
    }
    setIsOpen((prev) => !prev);
  };

  const updateField = (empId: string, field: "leads" | "visits" | "sales", value: string) => {
    setRows((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
        status: prev[empId]?.status === "saved" ? "idle" : prev[empId]?.status ?? "idle",
      },
    }));
  };

  const saveEmployee = async (emp: EmployeeRow) => {
    const row = rows[emp.employeeId];
    if (!row || row.status === "saving") return;

    setRows((prev) => ({
      ...prev,
      [emp.employeeId]: { ...prev[emp.employeeId], status: "saving", error: undefined },
    }));

    try {
      await axios.post("/api/monthly-target/employee", {
        employeeId: emp.employeeId,
        city,
        month: currentMonth,
        year: currentYear,
        leads: Number(row.leads) || 0,
        visits: Number(row.visits) || 0,
        sales: Number(row.sales) || 0,
      });
      setRows((prev) => ({
        ...prev,
        [emp.employeeId]: { ...prev[emp.employeeId], status: "saved", error: undefined },
      }));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setRows((prev) => ({
        ...prev,
        [emp.employeeId]: {
          ...prev[emp.employeeId],
          status: "error",
          error: axiosErr?.response?.data?.error ?? "Save failed",
        },
      }));
    }
  };

  const hasSales = showSalesSection && salesEmployees.length > 0;
  const hasLeadGen = showLeadGenSection && leadGenEmployees.length > 0;

  const totalEmployees = (hasSales ? salesEmployees.length : 0) + (hasLeadGen ? leadGenEmployees.length : 0);
  const savedEmployees = Object.values(rows).filter((r) => r.status === "saved").length;

  return (
    <div>
      {/* Toggle header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left font-medium">Team Targets</span>
        {hasFetched && totalEmployees > 0 && (
          <span className="tabular-nums">
            {savedEmployees}/{totalEmployees}
          </span>
        )}
        <span className="rounded-full border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
          Optional
        </span>
      </button>

      {/* Employee list */}
      {isOpen && (
        <div className="mt-3 space-y-3">
          {isFetching && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading team members…
            </div>
          )}

          {!isFetching && hasFetched && !hasSales && !hasLeadGen && (
            <p className="py-2 text-xs text-muted-foreground">
              No active employees found for this section.
            </p>
          )}

          {!isFetching && hasFetched && (
            <>
              {hasSales && (
                <EmployeeGroup
                  label="Sales Team"
                  employees={salesEmployees}
                  rows={rows}
                  showLeads={false}
                  showVisits={canEditVisits}
                  showSales={canEditSales}
                  onUpdate={updateField}
                  onSave={saveEmployee}
                />
              )}
              {hasLeadGen && (
                <EmployeeGroup
                  label="LeadGen Team"
                  employees={leadGenEmployees}
                  rows={rows}
                  showLeads={canEditLeads}
                  showVisits={false}
                  showSales={false}
                  onUpdate={updateField}
                  onSave={saveEmployee}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Employee group (section with label)                                  */
/* ------------------------------------------------------------------ */

interface EmployeeGroupProps {
  label: string;
  employees: EmployeeRow[];
  rows: Record<string, EmployeeState>;
  showLeads: boolean;
  showVisits: boolean;
  showSales: boolean;
  onUpdate: (empId: string, field: "leads" | "visits" | "sales", value: string) => void;
  onSave: (emp: EmployeeRow) => void;
}

function EmployeeGroup({
  label,
  employees,
  rows,
  showLeads,
  showVisits,
  showSales,
  onUpdate,
  onSave,
}: EmployeeGroupProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {employees.map((emp) => (
        <EmployeeCard
          key={emp.employeeId}
          emp={emp}
          row={rows[emp.employeeId]}
          showLeads={showLeads}
          showVisits={showVisits}
          showSales={showSales}
          onUpdate={onUpdate}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single employee card                                                  */
/* ------------------------------------------------------------------ */

interface EmployeeCardProps {
  emp: EmployeeRow;
  row: EmployeeState | undefined;
  showLeads: boolean;
  showVisits: boolean;
  showSales: boolean;
  onUpdate: (empId: string, field: "leads" | "visits" | "sales", value: string) => void;
  onSave: (emp: EmployeeRow) => void;
}

function EmployeeCard({
  emp,
  row,
  showLeads,
  showVisits,
  showSales,
  onUpdate,
  onSave,
}: EmployeeCardProps) {
  if (!row) return null;
  const isSaving = row.status === "saving";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors duration-150",
        row.status === "saved"
          ? "border-green-500/20 bg-green-50/30 dark:bg-green-950/10"
          : row.status === "error"
          ? "border-destructive/20 bg-destructive/5"
          : "border-border/60 bg-muted/20"
      )}
    >
      {/* Avatar initial */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {emp.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium leading-tight">{emp.name}</p>
        <p className="text-[10px] text-muted-foreground">{emp.role}</p>
      </div>

      {/* Number inputs */}
      <div className="flex items-end gap-1.5">
        {showLeads && (
          <FieldInput
            label="L"
            value={row.leads}
            disabled={isSaving}
            onChange={(v) => onUpdate(emp.employeeId, "leads", v)}
          />
        )}
        {showVisits && (
          <FieldInput
            label="V"
            value={row.visits}
            disabled={isSaving}
            onChange={(v) => onUpdate(emp.employeeId, "visits", v)}
          />
        )}
        {showSales && (
          <FieldInput
            label="S"
            value={row.sales}
            disabled={isSaving}
            onChange={(v) => onUpdate(emp.employeeId, "sales", v)}
          />
        )}
      </div>

      {/* Save / status button */}
      <button
        type="button"
        onClick={() => onSave(emp)}
        disabled={isSaving}
        title={row.status === "saved" ? "Saved — click to update" : row.error ?? "Save"}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
          row.status === "saved"
            ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-950/50"
            : row.status === "error"
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isSaving && "cursor-not-allowed opacity-60"
        )}
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : row.status === "saved" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact labeled field input                                           */
/* ------------------------------------------------------------------ */

function FieldInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-14 text-center text-xs"
      />
    </div>
  );
}
