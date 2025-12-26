import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  MessageSquare,
  Send,
  Target,
  CheckSquare,
  Square,
  Ban,
  Clock,
  AlertTriangle,
  RotateCcw,
  User,
  Filter,
  X,
} from "lucide-react";
import type { Template } from "../types";
import { getTemplateParameters, getTemplatePreviewText } from "../utils";

// =========================================================
// TYPES
// =========================================================
type Audience = "leads" | "owners";
type RetargetState = "pending" | "retargeted" | "blocked";

type Recipient = {
  id: string;
  name: string;
  phone: string;
  source: "lead" | "owner";
  status?: "pending" | "sending" | "sent" | "failed";
  error?: string;
  state: RetargetState;
  retargetCount: number;
  lastRetargetAt: string | null;
  blocked: boolean;
  blockReason: string | null;
  lastErrorCode: number | null;
  canRetarget: boolean;
  hasEngagement: boolean;
};

interface RetargetPanelProps {
  audience: Audience;
  onAudienceChange: (value: Audience) => void;
  priceFrom: string;
  priceTo: string;
  fromDate: string;
  toDate: string;
  location: string[];
  onLocationChange: (v: string[]) => void;
  selectedLocation: string;
  onSelectedLocationChange: (v: string) => void;
  onPriceFromChange: (v: string) => void;
  onPriceToChange: (v: string) => void;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onFetchRecipients: (stateFilter: string) => void;
  fetching: boolean;
  recipients: Recipient[];
  selectedRecipientIds: string[];
  onToggleRecipient: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  sending: boolean;
  onSend: () => void;
  dailyRemaining: number;
  selectedTemplate: Template | null;
  onSelectTemplate: (t: Template | null) => void;
  templates: Template[];
  templateParams: Record<string, string>;
  onTemplateParamsChange: (p: Record<string, string>) => void;
  totalToSend: number;
  sentCount: number;
  sendingActive: boolean;
  meta?: {
    maxRetargetAllowed?: number;
    cooldownHours?: number;
    blocked?: number;
    atMaxRetarget?: number;
  };
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================
function formatBlockReason(reason: string | null): string {
  if (!reason) return "Unknown";
  const reasonMap: Record<string, string> = {
    ecosystem_protection: "Blocked by WhatsApp",
    number_not_on_whatsapp: "Not on WhatsApp",
    groups_not_eligible: "Group (not eligible)",
    manual_block: "Manually blocked",
  };
  return reasonMap[reason] || reason;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return "Just now";
}

// =========================================================
// COMPONENT: State Badge
// =========================================================
function StateBadge({
  state,
  retargetCount,
}: {
  state: RetargetState;
  retargetCount: number;
}) {
  if (state === "blocked") {
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <Ban className="h-3 w-3" /> Blocked
      </Badge>
    );
  }
  if (state === "retargeted") {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <RotateCcw className="h-3 w-3" /> Retargeted ({retargetCount})
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

// =========================================================
// MAIN COMPONENT
// =========================================================
export function RetargetPanel({
  audience,
  onAudienceChange,
  priceFrom,
  priceTo,
  fromDate,
  toDate,
  location,
  selectedLocation,
  onSelectedLocationChange,
  onPriceFromChange,
  onPriceToChange,
  onFromDateChange,
  onToDateChange,
  onFetchRecipients,
  fetching,
  recipients,
  selectedRecipientIds,
  onToggleRecipient,
  onToggleAll,
  sending,
  onSend,
  dailyRemaining,
  selectedTemplate,
  onSelectTemplate,
  templates,
  templateParams,
  onTemplateParamsChange,
  totalToSend,
  sentCount,
  sendingActive,
  meta,
}: RetargetPanelProps) {
  const [stateFilter, setStateFilter] = useState<string>("pending");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const params = useMemo(
    () => (selectedTemplate ? getTemplateParameters(selectedTemplate) : []),
    [selectedTemplate]
  );

  const preview = useMemo(
    () =>
      selectedTemplate
        ? getTemplatePreviewText(selectedTemplate, templateParams)
        : "",
    [selectedTemplate, templateParams]
  );

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (stateFilter === "pending") return r.state === "pending";
      if (stateFilter === "retargeted") return r.state === "retargeted";
      if (stateFilter === "blocked") return r.state === "blocked";
      return true;
    });
  }, [recipients, stateFilter]);

  const counts = useMemo(() => {
    return {
      pending: recipients.filter((r) => r.state === "pending").length,
      retargeted: recipients.filter((r) => r.state === "retargeted").length,
      blocked: recipients.filter((r) => r.state === "blocked").length,
    };
  }, [recipients]);

  const selectableRecipients = useMemo(() => {
    return filteredRecipients.filter((r) => r.canRetarget);
  }, [filteredRecipients]);

  const handleFetch = () => {
    onFetchRecipients(stateFilter);
  };

  const handleStartRetarget = () => {
    const hasRetargeted = selectedRecipientIds.some((id) => {
      const r = recipients.find((rec) => rec.id === id);
      return r && r.retargetCount > 0;
    });

    if (hasRetargeted) {
      setShowConfirm(true);
    } else {
      onSend();
    }
  };

  const maxRetarget = meta?.maxRetargetAllowed || 3;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* SIDEBAR - Filters */}
      <div
        className={`
          flex-shrink-0 border-r bg-background transition-all duration-300
          ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-80 lg:w-96"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Filters</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(true)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Max {maxRetarget} per lead
              </Badge>
              <Badge variant="outline" className="text-xs">
                {dailyRemaining}/100 left today
              </Badge>
              {meta?.blocked && meta.blocked > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {meta.blocked} blocked
                </Badge>
              )}
            </div>
          </div>

          {/* Sidebar Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Audience Tabs */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Audience Type</Label>
              <Tabs
                value={audience}
                onValueChange={(v) => onAudienceChange(v as Audience)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="owners">Owners</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Template</Label>
              <Select
                value={selectedTemplate?.name || ""}
                onValueChange={(value) => {
                  const template =
                    templates.find((t) => t.name === value) || null;
                  onSelectTemplate(template);
                  onTemplateParamsChange({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {templates
                    .filter((t) => t.status === "APPROVED")
                    .map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Parameters */}
            {params.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Template Parameters
                </Label>
                <div className="space-y-2">
                  {params.map((param) => (
                    <div
                      key={`${param.type}_${param.index}`}
                      className="space-y-1.5"
                    >
                      <Label className="text-xs text-muted-foreground">
                        {`{{${param.index}}}`} • {param.text}
                      </Label>
                      <Input
                        value={
                          templateParams[`${param.type}_${param.index}`] || ""
                        }
                        onChange={(e) =>
                          onTemplateParamsChange({
                            ...templateParams,
                            [`${param.type}_${param.index}`]: e.target.value,
                          })
                        }
                        placeholder="Value"
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {preview && selectedTemplate && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Preview</Label>
                <Alert>
                  <AlertDescription className="whitespace-pre-wrap text-xs">
                    {preview}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Date Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Date Range</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromDateChange(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => onToDateChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Price Filters - Only for Leads */}
            {audience === "leads" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Price Range</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Min Price
                    </Label>
                    <Input
                      value={priceFrom}
                      onChange={(e) =>
                        onPriceFromChange(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. 20000"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Max Price
                    </Label>
                    <Input
                      value={priceTo}
                      onChange={(e) =>
                        onPriceToChange(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. 50000"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Location Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Location</Label>
              <Select
                value={selectedLocation}
                onValueChange={onSelectedLocationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {location.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fetch Button */}
            <Button
              onClick={handleFetch}
              disabled={fetching}
              className="w-full"
              size="lg"
            >
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Fetch {stateFilter} leads
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Recipients List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Show Filters
                </Button>
              )}
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <h1 className="font-semibold text-xl">Retargeting Campaign</h1>
              </div>
            </div>
          </div>

          {/* State Tabs */}
          <Tabs value={stateFilter} onValueChange={setStateFilter}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="retargeted" className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Retargeted ({counts.retargeted})
              </TabsTrigger>
              <TabsTrigger value="blocked" className="gap-1">
                <Ban className="h-3 w-3" />
                Blocked ({counts.blocked})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Blocked Warning */}
        {stateFilter === "blocked" && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Blocked leads cannot be messaged. These contacts have either
                blocked your number, don&apos;t have WhatsApp, or reached the maximum
                retarget limit.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Action Bar */}
        {stateFilter !== "blocked" && (
          <div className="p-4 border-b bg-muted/30">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleStartRetarget}
                disabled={
                  sending ||
                  !selectedTemplate ||
                  selectedRecipientIds.length === 0 ||
                  dailyRemaining <= 0
                }
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to {selectedRecipientIds.length} selected
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleAll(true)}
                  disabled={selectableRecipients.length === 0 || selectedRecipientIds.length >= 100}
                  className="gap-1"
                >
                  <CheckSquare className="h-4 w-4" /> Select (max 100)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleAll(false)}
                  disabled={selectedRecipientIds.length === 0}
                  className="gap-1"
                >
                  <Square className="h-4 w-4" /> Clear
                </Button>
              </div>

              <div className="ml-auto flex gap-2">
                <Badge variant="outline" className="h-9 flex items-center px-3">
                  {filteredRecipients.length} loaded
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-9 flex items-center px-3"
                >
                  {selectableRecipients.length} eligible
                </Badge>
                <Badge
                  variant={selectedRecipientIds.length >= 100 ? "destructive" : "default"}
                  className={`h-9 flex items-center px-3 ${selectedRecipientIds.length >= 100 ? "" : "bg-green-600"}`}
                >
                  {selectedRecipientIds.length}/100 selected
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Sending Progress */}
        {sendingActive && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b">
            <div className="flex items-center gap-3 justify-center">
              <Target className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="font-semibold text-lg">
                Sending: {sentCount} / {totalToSend}
              </span>
              <span className="text-muted-foreground">
                • {Math.max(0, totalToSend - sentCount)} remaining
              </span>
            </div>
          </div>
        )}

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <User className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">
                No {stateFilter} leads loaded
              </p>
              <p className="text-sm">
                Click &quot;Fetch {stateFilter} leads&quot; in the sidebar to load
                recipients
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-2">
              {filteredRecipients.map((r) => {
                const isDisabled = !r.canRetarget || r.blocked;
                const isSelected = selectedRecipientIds.includes(r.id);

                return (
                  <div
                    key={r.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-lg border transition-all
                      ${
                        isDisabled
                          ? "opacity-50 bg-muted/50 cursor-not-allowed"
                          : "hover:border-primary hover:shadow-sm cursor-pointer"
                      }
                      ${
                        isSelected && !isDisabled
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm"
                          : ""
                      }
                    `}
                    onClick={() => !isDisabled && onToggleRecipient(r.id)}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      {!isDisabled ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleRecipient(r.id)}
                          aria-label="select recipient"
                          disabled={isDisabled}
                          className="h-5 w-5"
                        />
                      ) : (
                        <div className="h-5 w-5 flex items-center justify-center">
                          <Ban className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base truncate">
                          {r.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {r.source}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        +{r.phone}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      {r.retargetCount > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <RotateCcw className="h-4 w-4" />
                          <span className="font-medium">
                            {r.retargetCount}/{maxRetarget}
                          </span>
                        </div>
                      )}
                      {r.lastRetargetAt && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatRelativeTime(r.lastRetargetAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status && r.status !== "pending" && (
                        <Badge
                          variant={
                            r.status === "sent"
                              ? "default"
                              : r.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
                      )}

                      <StateBadge
                        state={r.state}
                        retargetCount={r.retargetCount}
                      />

                      {r.blocked && r.blockReason && (
                        <Badge variant="destructive" className="text-[10px]">
                          {formatBlockReason(r.blockReason)}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Re-retargeting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Some selected leads have been retargeted before. Sending too many
              messages to the same contacts can result in your WhatsApp Business
              account being restricted or banned.
              <br />
              <br />
              <strong>Are you sure you want to proceed?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                onSend();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, send messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
