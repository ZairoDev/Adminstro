"use client";

import { useEffect, useMemo, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { PlusCircle, FileText, Eye, Code2, CheckCircle2, XCircle } from "lucide-react";

import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useOrgSelectionStore } from "../useOrgSelectionStore";

type TemplateCategory = "REMINDER" | "REBUTTAL";
type TemplateDoc = {
  _id: string;
  organization: string;
  category: TemplateCategory;
  type?: string;
  name: string;
  displayName?: string;
  subject: string;
  html: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function unwrapAutoConvertedHtml(value: string): string {
  const match = value.match(
    /^<div\s+style=["']white-space:\s*pre-line;?["']>([\s\S]*)<\/div>$/i,
  );
  if (!match) return value;
  return decodeHtmlEntities(match[1] ?? "");
}

const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: "REMINDER", label: "Reminders" },
  { key: "REBUTTAL", label: "Rebuttals" },
];

const DEFAULT_VARIABLES = [
  "{{name}}",
  "{{propertyName}}",
  "{{propertyUrl}}",
  "{{email}}",
  "{{relation}}", 
  "{{plan}}",
  "{{organization}}",
];

const SAMPLE_VALUES: Record<string, string> = {
  "{{name}}": "John Doe",
  "{{propertyName}}": "Sunset Villa",
  "{{propertyUrl}}": "https://example.com/property",
  "{{email}}": "john@example.com",
  "{{relation}}": "Owner",
  "{{plan}}": "Premium Plan",
};

export default function SalesOfferTemplatesPage() {
  const { toast } = useToast();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg) ?? "VacationSaga";
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("REMINDER");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"source" | "preview">("source");

  const normalizedTemplates = useMemo<TemplateDoc[]>(() => {
    return templates.map((template) => {
      if (template.category) return template;
      const t = String(template.type ?? "");
      let inferredCategory: TemplateCategory | "OFFER" = "OFFER";
      if (["REM1", "REM2", "REM3", "REM4"].includes(t)) inferredCategory = "REMINDER";
      else if (["REBUTTAL1", "REBUTTAL2"].includes(t)) inferredCategory = "REBUTTAL";
      return { ...template, category: inferredCategory as TemplateCategory };
    });
  }, [templates]);

  const filteredTemplates = useMemo(
    () =>
      normalizedTemplates
        .filter((t) => t.category === selectedCategory)
        .sort((a, b) =>
          String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
        ),
    [normalizedTemplates, selectedCategory],
  );

  const currentTemplate = useMemo(
    () => filteredTemplates.find((t) => t._id === selectedTemplateId) ?? null,
    [filteredTemplates, selectedTemplateId],
  );

  const loadTemplates = async (selectAfterLoad?: string) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sales-offer/templates", {
        params: { organization: selectedOrg },
      });
      const list = (res.data?.templates ?? []) as TemplateDoc[];
      setTemplates(list);
      if (selectAfterLoad) {
        setIsCreatingNew(false);
        setSelectedTemplateId(selectAfterLoad);
      }
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrg]);

  useEffect(() => {
    if (!currentTemplate) {
      if (!isCreatingNew) {
        setDisplayName("");
        setSubject("");
        setHtml("");
        setIsActive(true);
      }
      return;
    }
    setDisplayName(currentTemplate.displayName ?? currentTemplate.name ?? "");
    setSubject(currentTemplate.subject ?? "");
    setHtml(unwrapAutoConvertedHtml(currentTemplate.html ?? ""));
    setIsActive(currentTemplate.isActive ?? true);
  }, [currentTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isCreatingNew) return;
    setSelectedTemplateId((prev) => {
      if (prev && filteredTemplates.some((t) => t._id === prev)) return prev;
      return filteredTemplates[0]?._id ?? "";
    });
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => {
    setIsCreatingNew(true);
    setSelectedTemplateId("");
    setDisplayName("");
    setSubject("");
    setHtml("");
    setIsActive(true);
  };

  const handleSelectTemplate = (id: string) => {
    setIsCreatingNew(false);
    setSelectedTemplateId(id);
  };

  const handleSave = async () => {
    if (!displayName.trim() || !subject.trim() || !html.trim()) {
      toast({ title: "Display name, subject and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const internalName = displayName.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-6);
      const response = await axios.post("/api/sales-offer/templates", {
        templateId: !isCreatingNew && selectedTemplateId ? selectedTemplateId : undefined,
        organization: selectedOrg,
        category: selectedCategory,
        name: isCreatingNew ? internalName : (currentTemplate?.name ?? internalName),
        displayName: displayName.trim(),
        subject,
        html,
        isActive,
      });
      toast({ title: isCreatingNew ? "Template created" : "Template updated" });
      const savedId = String((response.data?.template as { _id?: string } | undefined)?._id ?? "");
      await loadTemplates(savedId || undefined);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to save template";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = useMemo(() => {
    let rendered = html;
    Object.entries({ ...SAMPLE_VALUES, "{{organization}}": selectedOrg }).forEach(
      ([key, value]) => {
        rendered = rendered.split(key).join(value);
      },
    );
    return rendered;
  }, [html, selectedOrg]);

  const editorTitle = isCreatingNew
    ? `New ${selectedCategory === "REMINDER" ? "Reminder" : "Rebuttal"}`
    : currentTemplate
      ? (currentTemplate.displayName || currentTemplate.name)
      : "Select a template";

  return (
    <div className="flex flex-col h-full gap-0">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-lg font-semibold">Email Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedOrg} · Reminders &amp; Rebuttals
          </p>
        </div>
        <Button size="sm" onClick={startNew} disabled={loading}>
          <PlusCircle className="w-4 h-4 mr-1.5" />
          New {selectedCategory === "REMINDER" ? "Reminder" : "Rebuttal"}
        </Button>
      </div>

      <div className="flex gap-4 pt-4 min-h-0">
        {/* Left panel — template list */}
        <div className="w-56 shrink-0 flex flex-col gap-3">
          {/* Category tabs */}
          <div className="flex rounded-md border overflow-hidden text-sm">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 space-y-1 overflow-auto">
            {loading && (
              <p className="text-xs text-muted-foreground px-1 py-2">Loading…</p>
            )}
            {!loading && filteredTemplates.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center">
                <FileText className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1" />
                <p className="text-xs text-muted-foreground">No templates yet</p>
                <button
                  type="button"
                  className="text-xs text-primary mt-1 hover:underline"
                  onClick={startNew}
                >
                  Create one
                </button>
              </div>
            )}
            {isCreatingNew && (
              <div className="rounded-md border-2 border-primary bg-primary/5 px-3 py-2">
                <p className="text-xs font-medium text-primary truncate">New template…</p>
              </div>
            )}
            {filteredTemplates.map((template) => (
              <button
                key={template._id}
                type="button"
                className={`w-full text-left rounded-md px-3 py-2 transition-colors group ${
                  !isCreatingNew && selectedTemplateId === template._id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                }`}
                onClick={() => handleSelectTemplate(template._id)}
              >
                <p className="text-sm font-medium truncate leading-snug">
                  {template.displayName || template.name}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] mt-0.5 ${
                    template.isActive ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {template.isActive ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : (
                    <XCircle className="w-2.5 h-2.5" />
                  )}
                  {template.isActive ? "Active" : "Inactive"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — editor */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Editor header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-sm">{editorTitle}</h2>
              {!isCreatingNew && currentTemplate && (
                <Badge variant={currentTemplate.isActive ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                  {currentTemplate.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setViewMode("source")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "source" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="w-3 h-3" /> Source
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>

          {(isCreatingNew || currentTemplate || selectedTemplateId === "") && (
            <>
              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="t-display-name" className="text-xs">Display Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="t-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. First Follow-up"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="t-subject" className="text-xs">Email Subject <span className="text-destructive">*</span></Label>
                  <Input
                    id="t-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. We'd love to reconnect, {{name}}"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Variables bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-medium">Insert:</span>
                {DEFAULT_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setHtml((prev) => `${prev}${prev.endsWith("\n") || prev.length === 0 ? "" : " "}${v}`)
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Editor / Preview */}
              {viewMode === "source" ? (
                <div className="border rounded-lg overflow-hidden flex-1" style={{ minHeight: 380 }}>
                  <MonacoEditor
                    height="380px"
                    language="html"
                    value={html}
                    onChange={(value) => setHtml(value ?? "")}
                    options={{
                      minimap: { enabled: false },
                      wordWrap: "on",
                      fontSize: 13,
                      lineNumbers: "off",
                      folding: false,
                      formatOnPaste: false,
                      formatOnType: false,
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden flex-1" style={{ minHeight: 380 }}>
                  <iframe
                    title="Template Preview"
                    className="w-full h-[380px]"
                    srcDoc={previewHtml}
                    sandbox=""
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Switch id="t-active" checked={isActive} onCheckedChange={setIsActive} className="scale-90" />
                  <Label htmlFor="t-active" className="text-xs cursor-pointer">Active</Label>
                </div>
                <Button onClick={handleSave} disabled={saving || loading} size="sm">
                  {saving ? "Saving…" : isCreatingNew ? "Create Template" : "Save Changes"}
                </Button>
              </div>
            </>
          )}

          {!isCreatingNew && !currentTemplate && filteredTemplates.length > 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a template from the list to edit it.
            </div>
          )}
        </div>    
      </div>
    </div>
  );
}
