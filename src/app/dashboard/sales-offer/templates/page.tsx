"use client";

import { useEffect, useMemo, useState } from "react";
import MonacoEditor from "@monaco-editor/react";

import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useOrgSelectionStore } from "../useOrgSelectionStore";

type TemplateType = "REM1" | "REM2" | "REM3" | "REM4" | "REBUTTAL1" | "REBUTTAL2";
type TemplateDoc = {
  _id: string;
  organization: string;
  type: TemplateType;
  name: string;
  subject: string;
  html: string;
  isActive: boolean;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
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

const TEMPLATE_TYPES: TemplateType[] = ["REM1", "REM2", "REM3", "REM4", "REBUTTAL1", "REBUTTAL2"];
const DEFAULT_VARIABLES = [
  "{{name}}",
  "{{propertyName}}",
  "{{propertyUrl}}",
  "{{email}}",
  "{{relation}}",
  "{{plan}}",
  "{{organization}}",
];

export default function SalesOfferTemplatesPage() {
  const { toast } = useToast();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg) ?? "VacationSaga";
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [selectedType, setSelectedType] = useState<TemplateType>("REM1");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"source" | "preview">("source");

  const currentTemplate = useMemo(
    () => templates.find((template) => template.type === selectedType) ?? null,
    [templates, selectedType],
  );

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sales-offer/templates", {
        params: { organization: selectedOrg },
      });
      const list = (res.data?.templates ?? []) as TemplateDoc[];
      setTemplates(list);
    } catch (_err) {
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
      setName(`${selectedType} Template`);
      setSubject("");
      setHtml("");
      setIsActive(true);
      return;
    }
    setName(currentTemplate.name ?? `${selectedType} Template`);
    setSubject(currentTemplate.subject ?? "");
    setHtml(unwrapAutoConvertedHtml(currentTemplate.html ?? ""));
    setIsActive(currentTemplate.isActive ?? true);
  }, [currentTemplate, selectedType]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !html.trim()) {
      toast({ title: "Name, subject and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/sales-offer/templates", {
        organization: selectedOrg,
        type: selectedType,
        // Keep exact values as typed by admin.
        name,
        subject,
        html,
        isActive,
      });
      toast({ title: `${selectedType} template saved` });
      await loadTemplates();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to save template";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setHtml((prev) => `${prev}${prev.endsWith("\n") || prev.length === 0 ? "" : " "}${variable}`);
  };

  const previewHtml = useMemo(() => {
    const sampleValues: Record<string, string> = {
      "{{name}}": "John Doe",
      "{{propertyName}}": "Sunset Villa",
      "{{propertyUrl}}": "https://example.com/property/sunset-villa",
      "{{email}}": "john@example.com",
      "{{relation}}": "Owner",
      "{{plan}}": "Premium Plan",
      "{{organization}}": selectedOrg,
    };
    let rendered = html;
    Object.entries(sampleValues).forEach(([key, value]) => {
      rendered = rendered.split(key).join(value);
    });
    return rendered;
  }, [html, selectedOrg]);

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Reminder & Rebuttal Templates</h1>
        <p className="text-sm text-muted-foreground">
          Manage reminder and rebuttal templates for <span className="font-medium">{selectedOrg}</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEMPLATE_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant={selectedType === type ? "default" : "outline"}
            onClick={() => setSelectedType(type)}
            disabled={loading}
          >
            {type}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template display name"
          />
        </div>
        <div>
          <Label htmlFor="template-subject">Subject</Label>
          <Input
            id="template-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "source" ? "default" : "outline"}
            onClick={() => setViewMode("source")}
          >
            Source
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "preview" ? "default" : "outline"}
            onClick={() => setViewMode("preview")}
          >
            Preview
          </Button>
        </div>
        {viewMode === "source" ? (
          <div>
            <Label htmlFor="template-html">HTML Content (Raw Editor)</Label>
            <div className="border rounded-md overflow-hidden">
              <MonacoEditor
                height="460px"
                language="html"
                value={html}
                onChange={(value) => setHtml(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 13,
                  formatOnPaste: false,
                  formatOnType: false,
                  automaticLayout: true,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Installed editor mode: write HTML exactly as needed.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Exact mode: content is saved exactly as entered.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="px-3 py-2 border-b text-sm font-medium">Live Preview</div>
            <iframe
              title="Template Raw Preview"
              className="w-full h-[420px] rounded-b-md"
              srcDoc={previewHtml}
              sandbox=""
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch id="template-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="template-active">Active template</Label>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="text-sm font-medium">Supported variables</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFAULT_VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              onClick={() => insertVariable(variable)}
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || loading}>
        {saving ? "Saving…" : "Save Template"}
      </Button>
    </div>
  );
}

