"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Area } from "../page";
import { readSpreadsheetFileAsCsvText } from "../utils/bulkAreaFileImport";
import {
  parseBool,
  parseDelimitedTable,
  parseNumber,
} from "../utils/bulkAreaParser";
import {
  FULL_BULK_PREVIEW_COLUMNS,
  FULL_BULK_PREVIEW_ROW_LIMIT,
  FULL_BULK_REQUIRED_FIELDS,
  getMissingRequiredCanonicalFields,
  normalizeBulkRows,
  type FullBulkCanonicalField,
} from "../utils/bulkAreaFields";

const BULK_FULL_AREAS_TEMPLATE = [
  "country,city,name,zone,metroZone,subUrban,town,village,municipality,district,districtOf,extension,tram,subway,studio,sharedApartment,oneBhk,twoBhk,threeBhk",
  "UAE,Dubai,JVC,1,Blue Line,yes,no,no,no,no,,no,no,yes,1200,800,1500,2200,3000",
].join("\n");

interface CityData {
  _id?: string;
  country: string;
  city: string;
  areas: Area[];
}

interface BulkFullAreasUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetsByCountryCity: Map<string, CityData>;
  onSuccess: () => void | Promise<void>;
}

export function BulkFullAreasUploadDialog({
  open,
  onOpenChange,
  targetsByCountryCity,
  onSuccess,
}: BulkFullAreasUploadDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkText, setBulkText] = useState("");
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [errors, setErrors] = useState<string[]>([]);

  const parsed = useMemo(() => parseDelimitedTable(bulkText), [bulkText]);

  const normalized = useMemo(
    () => normalizeBulkRows(parsed.headers, parsed.rows),
    [parsed.headers, parsed.rows],
  );

  const missingRequired = useMemo(
    () => getMissingRequiredCanonicalFields(parsed.headers),
    [parsed.headers],
  );

  const matchedFields = useMemo(() => {
    const set = new Set<FullBulkCanonicalField>();
    for (const canonical of normalized.headerMap.values()) {
      set.add(canonical);
    }
    return Array.from(set);
  }, [normalized.headerMap]);

  const extraColumnCount = Math.max(
    0,
    parsed.headers.length - matchedFields.length,
  );

  const previewRows = normalized.rows.slice(0, FULL_BULK_PREVIEW_ROW_LIMIT);

  const reset = () => {
    setBulkText("");
    setErrors([]);
    setProgress(null);
    setIsSubmitting(false);
    setShowRawEditor(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readSpreadsheetFileAsCsvText(file);
      setBulkText(text);
      setErrors([]);
      setShowRawEditor(false);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    }
  };

  const runUpload = async () => {
    const { headers, rows } = parsed;
    if (headers.length === 0 || rows.length === 0) {
      setErrors([
        "No data rows found. Upload a file or paste a table with a header row and at least one data row.",
      ]);
      return;
    }

    if (missingRequired.length > 0) {
      setErrors([
        `Missing required columns (any spelling/case): ${missingRequired.join(", ")}`,
      ]);
      return;
    }

    const { rows: normRows } = normalized;

    setIsSubmitting(true);
    setErrors([]);
    setProgress({ done: 0, total: normRows.length });

    const uploadErrors: string[] = [];
    try {
      for (let i = 0; i < normRows.length; i++) {
        const row = normRows[i];
        const country = String(row.country ?? "").trim();
        const city = String(row.city ?? "").trim();
        const name = String(row.name ?? "").trim();

        if (!country || !city || !name) {
          uploadErrors.push(`Row ${i + 2}: country, city, and name are required.`);
          setProgress({ done: i + 1, total: normRows.length });
          continue;
        }

        const targetKey = `${country.toLowerCase()}::${city.toLowerCase()}`;
        const target = targetsByCountryCity.get(targetKey);
        if (!target?._id) {
          uploadErrors.push(
            `Row ${i + 2}: no target for ${country} / ${city} (add city first).`,
          );
          setProgress({ done: i + 1, total: normRows.length });
          continue;
        }

        const payload: Partial<Area> = {
          city,
          name,
          zone: String(row.zone ?? "").trim() || undefined,
          metroZone: String(row.metroZone ?? "").trim() || undefined,
          districtOf: String(row.districtOf ?? "").trim() || undefined,
        };

        const boolFields: FullBulkCanonicalField[] = [
          "subUrban",
          "town",
          "village",
          "municipality",
          "district",
          "extension",
          "tram",
          "subway",
        ];
        for (const f of boolFields) {
          const parsedBool = parseBool(String(row[f] ?? ""));
          if (parsedBool !== undefined) {
            (payload as Record<string, unknown>)[f] = parsedBool;
          }
        }

        const numFields: FullBulkCanonicalField[] = [
          "studio",
          "sharedApartment",
          "oneBhk",
          "twoBhk",
          "threeBhk",
        ];
        for (const f of numFields) {
          const parsedNum = parseNumber(String(row[f] ?? ""));
          if (parsedNum !== undefined) {
            (payload as Record<string, unknown>)[f] = parsedNum;
          }
        }

        await axios.put(`/api/addons/target/updateTarget/${target._id}`, payload);
        setProgress({ done: i + 1, total: normRows.length });
      }

      if (uploadErrors.length > 0) {
        setErrors(uploadErrors);
        return;
      }

      await onSuccess();
      handleClose(false);
    } catch (err) {
      console.error(err);
      setErrors((prev) => [...prev, "Bulk upload failed. Check console for details."]);
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto overflow-x-hidden text-base [&_code]:text-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk areas upload (full columns)</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Upload CSV or Excel. Header names are matched{" "}
            <strong>case-insensitively</strong> (e.g. Country, CITY, Name all work).
            Each row creates one area under an existing country + city target.
          </DialogDescription>
        </DialogHeader>

        <Collapsible className="group rounded-lg border">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between px-4 py-3 h-auto text-base font-medium"
            >
              Column guide (required vs optional)
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t px-4 pb-4 pt-3 space-y-4 text-base text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Required</p>
              <p className="mt-1">
                <Badge variant="default" className="mr-1 text-sm">
                  country
                </Badge>
                <Badge variant="default" className="mr-1 text-sm">
                  city
                </Badge>
                <Badge variant="default" className="text-sm">
                  name
                </Badge>
                <span className="ml-2">(also accepts header &quot;area&quot;)</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Optional</p>
              <p className="mt-1 leading-relaxed">
                zone, metroZone, districtOf, subUrban, town, village, municipality,
                district, extension, tram, subway, studio, sharedApartment, oneBhk,
                twoBhk, threeBhk — booleans: yes/no or true/false.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Example first row:{" "}
              <span className="font-mono text-foreground break-all">
                country,city,name,zone,metroZone,…
              </span>
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="full-bulk-file" className="text-base">
                Upload CSV or Excel
              </Label>
              <Input
                id="full-bulk-file"
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFile}
                disabled={isSubmitting}
                className="text-base h-11"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="text-base h-11"
              onClick={() => {
                setBulkText(BULK_FULL_AREAS_TEMPLATE);
                setErrors([]);
              }}
              disabled={isSubmitting}
            >
              Load sample
            </Button>
          </div>

          {parsed.headers.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-base font-medium text-foreground">Matched columns</p>
              <div className="flex flex-wrap gap-2">
                {FULL_BULK_REQUIRED_FIELDS.map((f) => (
                  <Badge
                    key={f}
                    variant={matchedFields.includes(f) ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {f}
                    {matchedFields.includes(f) ? "" : " (missing)"}
                  </Badge>
                ))}
                {matchedFields
                  .filter((f) => !FULL_BULK_REQUIRED_FIELDS.includes(f))
                  .map((f) => (
                    <Badge key={f} variant="secondary" className="text-sm">
                      {f}
                    </Badge>
                  ))}
                {extraColumnCount > 0 && (
                  <Badge variant="outline" className="text-sm">
                    +{extraColumnCount} unmapped
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-medium">Data preview</Label>
              {normalized.rows.length > 0 && (
                <span className="text-base text-muted-foreground">
                  {normalized.rows.length} row
                  {normalized.rows.length === 1 ? "" : "s"}
                  {normalized.rows.length > FULL_BULK_PREVIEW_ROW_LIMIT
                    ? ` (showing first ${FULL_BULK_PREVIEW_ROW_LIMIT})`
                    : ""}
                </span>
              )}
            </div>

            {normalized.rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-base text-muted-foreground">
                Upload a file or paste data below to see a table preview.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden max-h-[min(50vh,420px)] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-base border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted">
                    <tr>
                      <th className="w-12 px-2 py-2.5 text-left font-semibold border-b">
                        #
                      </th>
                      {FULL_BULK_PREVIEW_COLUMNS.map((col) => (
                        <th
                          key={col.field}
                          className="px-2 py-2.5 text-left font-semibold border-b truncate"
                          title={col.label}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 hover:bg-muted/40"
                      >
                        <td className="px-2 py-2 text-muted-foreground align-top">
                          {idx + 1}
                        </td>
                        {FULL_BULK_PREVIEW_COLUMNS.map((col) => (
                          <td
                            key={col.field}
                            className="px-2 py-2 align-top truncate"
                            title={String(row[col.field] ?? "")}
                          >
                            {String(row[col.field] ?? "") || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Preview shows main columns only; all mapped fields in your file are still
              imported on upload.
            </p>
          </div>

          <Collapsible open={showRawEditor} onOpenChange={setShowRawEditor}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full text-base h-11">
                {showRawEditor ? "Hide" : "Show"} paste / raw CSV editor
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${showRawEditor ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste CSV or TSV…"
                className="min-h-[160px] text-base font-mono leading-relaxed"
                disabled={isSubmitting}
              />
            </CollapsibleContent>
          </Collapsible>

          {progress && (
            <p className="text-base text-muted-foreground">
              Uploading {progress.done} / {progress.total}…
            </p>
          )}
          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-base font-semibold text-destructive">Errors</p>
              <ul className="mt-2 list-disc pl-5 text-base text-destructive space-y-1">
                {errors.slice(0, 10).map((e, idx) => (
                  <li key={`${idx}-${e}`}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="text-base"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="text-base"
            onClick={runUpload}
            disabled={
              isSubmitting ||
              !bulkText.trim() ||
              missingRequired.length > 0 ||
              normalized.rows.length === 0
            }
          >
            {isSubmitting ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
