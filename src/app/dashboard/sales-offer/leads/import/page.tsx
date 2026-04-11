"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useOrgSelectionStore } from "../../useOrgSelectionStore";

type PreviewRow = Record<string, unknown>;

export default function ImportLeadsPage() {
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  const fileName = useMemo(() => file?.name ?? "", [file]);

  async function buildPreview(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    const buf = await f.arrayBuffer();
    const wb =
      ext === "csv"
        ? XLSX.read(buf, { type: "array", raw: true, codepage: 65001 })
        : XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      setPreview([]);
      return;
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    setPreview(rows.slice(0, 10));
  }

  async function onSelectFile(f: File | null) {
    setResult(null);
    setPreview([]);
    setFile(f);
    if (f) {
      await buildPreview(f);
    }
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (selectedOrg) fd.append("organization", selectedOrg);
      const res = await axios.post("/api/leads/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Import Leads</div>
          <div className="text-sm text-muted-foreground">
            Upload CSV/XLSX to create pending leads in the Offer collection
            {selectedOrg ? ` for ${selectedOrg}` : ""}.
          </div>
        </div>
        <a className="text-sm underline" href="/dashboard/sales-offer/leads">
          Back to Leads
        </a>
      </div>

      <div className="mt-4 rounded-md border p-4">
        <Label htmlFor="file">File (.csv, .xlsx)</Label>
        <Input
          id="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? (
          <div className="mt-2 text-sm text-muted-foreground">Selected: {fileName}</div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button onClick={upload} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-md border">
        <div className="border-b p-3 font-medium">Preview (first 10 rows)</div>
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-2 text-left">name</th>
                <th className="p-2 text-left">email</th>
                <th className="p-2 text-left">phoneNumber</th>
                <th className="p-2 text-left">propertyLink</th>
                <th className="p-2 text-left">country</th>
                <th className="p-2 text-left">city</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    Select a file to preview rows.
                  </td>
                </tr>
              ) : (
                preview.map((r, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="p-2">{String(r.name ?? r.Name ?? "")}</td>
                    <td className="p-2">{String(r.email ?? r.Email ?? "")}</td>
                    <td className="p-2">{String(r.phoneNumber ?? r.PhoneNumber ?? r.phone ?? r.Phone ?? "")}</td>
                    <td className="p-2">{String(r.propertyLink ?? r.PropertyLink ?? r.propertyUrl ?? r.PropertyUrl ?? "")}</td>
                    <td className="p-2">{String(r.country ?? r.Country ?? "")}</td>
                    <td className="p-2">{String(r.city ?? r.City ?? "")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {result ? (
        <div className="mt-4 rounded-md border p-4">
          <div className="font-medium">Result</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Total: {result.total} | Success: {result.success} | Failed: {result.failed}
          </div>
          {result.errors?.length ? (
            <div className="mt-3 text-sm">
              <div className="font-medium">Errors</div>
              <ul className="list-disc pl-5">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

