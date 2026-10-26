"use client";

import { useMemo, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  splitGrossSalary,
  toComponentAmounts,
  type SalaryComponentAmount,
} from "@/modules/finance/salary-structure";
import { formatMoney } from "../_lib/types";

export type SalaryRevision = {
  gross: number;
  components: SalaryComponentAmount[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  updatedByName: string | null;
};

export type SalaryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeCode: string | null;
  role: string;
  organization: string;
  empType: string;
  dateOfJoining: string | null;
  salary: number;
  components: SalaryComponentAmount[];
  effectiveFrom: string | null;
  updatedByName: string | null;
  history: SalaryRevision[];
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function readGross(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount > 100_000_000) return null;
  return amount;
}

export function SalaryDetail({
  row,
  monthLabel,
  onUpdated,
}: {
  row: SalaryRow;
  monthLabel: string;
  onUpdated: (row: SalaryRow) => void;
}) {
  const [grossInput, setGrossInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const gross = readGross(grossInput);
    if (gross === null) return null;
    const breakdown = splitGrossSalary(gross);
    return {
      gross: breakdown.gross,
      components: toComponentAmounts(breakdown),
    };
  }, [grossInput]);

  const save = async () => {
    const gross = readGross(grossInput);
    if (gross === null) {
      setFormError("Enter the new gross salary in rupees.");
      setMessage(null);
      return;
    }

    setSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      const response = await axios.patch<{
        success: boolean;
        changed?: boolean;
        data?: SalaryRow;
        message?: string;
      }>(`/api/finance/salaries/${row.id}`, { gross });

      if (!response.data.success || !response.data.data) {
        setFormError(response.data.message ?? "Could not update this salary");
        return;
      }

      onUpdated(response.data.data);
      setGrossInput("");
      setMessage(
        response.data.changed
          ? "Salary updated. The previous gross is in history, and this amount applies from today."
          : "This already matches the current gross salary.",
      );
    } catch (saveError) {
      const text =
        axios.isAxiosError(saveError) &&
        typeof saveError.response?.data === "object" &&
        saveError.response.data !== null &&
        "message" in saveError.response.data &&
        typeof saveError.response.data.message === "string"
          ? saveError.response.data.message
          : "Could not update this salary";
      setFormError(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 bg-muted/20 px-3 py-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby={`salary-split-${row.id}`}>
          <h3 id={`salary-split-${row.id}`} className="text-sm font-semibold">
            {monthLabel} gross {formatMoney(row.salary)}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Effective {formatDate(row.effectiveFrom)}
            {row.updatedByName ? ` · Updated by ${row.updatedByName}` : ""}
          </p>
          <ComponentTable components={row.components} gross={row.salary} />
        </section>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor={`salary-gross-${row.id}`} className="text-sm font-semibold">
              Updated gross salary
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              Saving a new gross keeps the earlier amount in history. The new split applies from today through later months.
            </p>
            <Input
              id={`salary-gross-${row.id}`}
              inputMode="decimal"
              value={grossInput}
              onChange={(event) => setGrossInput(event.target.value)}
              placeholder="Enter gross salary"
              className="h-10 max-w-xs text-base"
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? `salary-error-${row.id}` : undefined}
            />
          </div>
          {preview ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
              <ComponentTable components={preview.components} gross={preview.gross} />
            </div>
          ) : null}
          {formError ? (
            <p id={`salary-error-${row.id}`} className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-foreground" role="status">
              {message}
            </p>
          ) : null}
          <Button type="submit" className="h-10 cursor-pointer" disabled={saving}>
            {saving ? "Saving…" : "Save updated salary"}
          </Button>
        </form>
      </div>

      <section aria-labelledby={`salary-history-${row.id}`}>
        <h3 id={`salary-history-${row.id}`} className="text-sm font-semibold">
          Previous salaries
        </h3>
        {row.history.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No earlier salary. This is the first recorded gross.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-semibold">Period</th>
                  <th className="px-2 py-2 text-right font-semibold">Gross</th>
                  {row.history[0]?.components.map((component) => (
                    <th key={component.key} className="px-2 py-2 text-right font-semibold">
                      {component.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.history.map((revision, index) => (
                  <tr key={`${revision.effectiveTo ?? "open"}-${index}`} className="border-t border-border">
                    <td className="px-2 py-2 align-top">
                      <div>
                        {formatDate(revision.effectiveFrom)} – {formatDate(revision.effectiveTo)}
                      </div>
                      {revision.updatedByName ? (
                        <div className="text-xs text-muted-foreground">{revision.updatedByName}</div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMoney(revision.gross)}</td>
                    {revision.components.map((component) => (
                      <td key={component.key} className="px-2 py-2 text-right tabular-nums">
                        {formatMoney(component.amount)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ComponentTable({
  components,
  gross,
}: {
  components: SalaryComponentAmount[];
  gross: number;
}) {
  return (
    <table className="mt-2 w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <th className="py-1.5 pr-2 font-semibold">Component</th>
          <th className="py-1.5 pr-2 font-semibold">Share</th>
          <th className="py-1.5 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {components.map((component) => (
          <tr key={component.key} className="border-t border-border">
            <td className="py-1.5 pr-2">{component.label}</td>
            <td className="py-1.5 pr-2 tabular-nums">{component.percent}%</td>
            <td className="py-1.5 text-right tabular-nums">{formatMoney(component.amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-border font-semibold">
          <td className="py-1.5 pr-2">Total</td>
          <td className="py-1.5 pr-2 tabular-nums">100%</td>
          <td className="py-1.5 text-right tabular-nums">{formatMoney(gross)}</td>
        </tr>
      </tbody>
    </table>
  );
}
