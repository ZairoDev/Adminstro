import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Building,
  RefreshCw,
  Search,
  ArrowLeft,
  SlidersHorizontal,
  Upload,
  FileSpreadsheet,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Template } from "../types";
import {
  getTemplateParameters,
  getTemplatePreviewText,
  getTemplateExampleParams,
  getTemplateBodySnippet,
  buildAutoFilledParams,
  getTemplateParamIntents,
  type ParamIntent,
} from "../utils";
import { cn } from "@/lib/utils";

// =========================================================
// TYPES
// =========================================================
type Audience = "leads" | "owners" | "uploaded";
type RetargetState = "pending" | "retargeted" | "blocked";

type Recipient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: "lead" | "owner" | "uploaded";
  status?: "pending" | "sending" | "sent" | "failed";
  error?: string;
  state: RetargetState;
  retargetCount: number;
  lastRetargetAt: string | null;
  blocked: boolean;
  blockReason: string | null;
  lastErrorCode: number | null;
  canRetarget: boolean;
  hasEngagement?: boolean;
  // Lead-specific fields
  minBudget?: number;
  maxBudget?: number;
  area?: string;
  location?: string;
  zone?: string;
  metroZone?: string;
  bookingTerm?: string;
  propertyType?: string;
  typeOfProperty?: string;
  priority?: string;
  guest?: number;
  startDate?: string;
  endDate?: string;
  // Owner-specific fields (from unregisteredOwner schema)
  address?: string;
  availability?: string;
  propertyCount?: number;
  // Uploaded contact fields
  country?: string;
  batchId?: string;
  sourceFileName?: string;
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
  onFetchRecipients: (
    stateFilter: string,
    additionalFilters?: Record<string, any>,
  ) => void;
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
    pending?: number;
    retargeted?: number;
    atMaxRetarget?: number;
  };
  isMobile?: boolean;
  onBack?: () => void;
  // Sender info for param auto-fill
  senderName?: string;
  // Upload contacts support
  onUploadFile?: (file: File) => Promise<void>;
  uploading?: boolean;
  uploadBatches?: Array<{
    batchId: string;
    sourceFileName: string;
    count: number;
    uploadedAt: string;
  }>;
  uploadCountries?: string[];
  selectedBatchId?: string;
  onBatchIdChange?: (batchId: string) => void;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
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
      <Badge variant="destructive" className="text-[10px] gap-1 font-medium">
        <Ban className="h-3 w-3" /> Blocked
      </Badge>
    );
  }
  if (state === "retargeted") {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
        <RotateCcw className="h-3 w-3" /> Sent {retargetCount}x
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 font-medium">
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
  isMobile = false,
  onBack,
  senderName = "",
  onUploadFile,
  uploading = false,
  uploadBatches = [],
  uploadCountries = [],
  selectedBatchId = "",
  onBatchIdChange,
  selectedCountry = "",
  onCountryChange,
}: RetargetPanelProps) {
  const [stateFilter, setStateFilter] = useState<string>("pending");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  // Template search state
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const templateSearchRef = useRef<HTMLDivElement>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  // Additional filters for leads
  const [area, setArea] = useState("");
  const [zone, setZone] = useState("");
  const [metroZone, setMetroZone] = useState("");
  const [bookingTerm, setBookingTerm] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [typeOfProperty, setTypeOfProperty] = useState("");
  const [priority, setPriority] = useState("");
  const [minGuests, setMinGuests] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  // Additional filters for owners (based on unregisteredOwner schema)
  const [ownerPropertyType, setOwnerPropertyType] = useState("");
  const [ownerAvailability, setOwnerAvailability] = useState("");
  const [ownerArea, setOwnerArea] = useState("");

  const ITEMS_PER_PAGE = 20;
  const isInitialMountRef = useRef(true);

  // Auto-fetch when audience/stateFilter changes (but not on initial mount)
  useEffect(() => {
    // Skip on initial mount to prevent errors when switching tabs
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!onFetchRecipients || typeof onFetchRecipients !== "function") {
      console.warn("onFetchRecipients is not available");
      return;
    }

    // Auto-fetch when audience or state filter changes
    const filters: Record<string, any> = {};
    if (audience === "leads") {
      if (area) filters.area = area;
      if (zone) filters.zone = zone;
      if (metroZone) filters.metroZone = metroZone;
      if (bookingTerm) filters.bookingTerm = bookingTerm;
      if (propertyType) filters.propertyType = propertyType;
      if (typeOfProperty) filters.typeOfProperty = typeOfProperty;
      if (priority) filters.priority = priority;
      if (minGuests) filters.minGuests = Number(minGuests);
      if (maxGuests) filters.maxGuests = Number(maxGuests);
    } else if (audience === "owners") {
      if (ownerPropertyType) filters.propertyType = ownerPropertyType;
      if (ownerAvailability) filters.availability = ownerAvailability;
      if (ownerArea) filters.area = ownerArea;
    }

    // Use setTimeout to avoid calling during render
    const timeoutId = setTimeout(() => {
      try {
        onFetchRecipients(stateFilter, filters);
      } catch (error) {
        console.error("Error auto-fetching recipients:", error);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, stateFilter]); // Auto-fetch when audience or state filter changes

  // Close template dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        templateSearchRef.current &&
        !templateSearchRef.current.contains(e.target as Node)
      ) {
        setTemplateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered approved templates by search query
  const filteredTemplates = useMemo(() => {
    const approved = templates.filter((t) => t.status === "APPROVED");
    if (!templateSearch.trim()) return approved;
    const q = templateSearch.toLowerCase();
    return approved.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q);
      const langMatch = t.language.toLowerCase().includes(q);
      const bodySnippet = getTemplateBodySnippet(t).toLowerCase();
      return nameMatch || langMatch || bodySnippet.includes(q);
    });
  }, [templates, templateSearch]);

  const params = useMemo(
    () => (selectedTemplate ? getTemplateParameters(selectedTemplate) : []),
    [selectedTemplate],
  );

  // Detect intent for each param (recipientName, senderName, location, custom)
  const paramIntents = useMemo(
    () => (selectedTemplate ? getTemplateParamIntents(selectedTemplate) : {}),
    [selectedTemplate],
  );

  const intentLabel = (intent: ParamIntent): string => {
    switch (intent) {
      case "recipientName": return "Auto: Recipient Name";
      case "senderName": return "Auto: Your Name";
      case "location": return "Auto: Location";
      default: return "";
    }
  };

  const preview = useMemo(
    () =>
      selectedTemplate
        ? getTemplatePreviewText(selectedTemplate, templateParams)
        : "",
    [selectedTemplate, templateParams],
  );

  // Filter recipients by search query
  const filteredRecipients = useMemo(() => {
    let filtered = recipients.filter((r) => {
      if (stateFilter === "pending") return r.state === "pending";
      if (stateFilter === "retargeted") return r.state === "retargeted";
      if (stateFilter === "blocked") return r.state === "blocked";
      return true;
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.phone.includes(query) ||
          (r.email && r.email.toLowerCase().includes(query)) ||
          (r.location && r.location.toLowerCase().includes(query)) ||
          (r.area && r.area.toLowerCase().includes(query)) ||
          (r.country && r.country.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [recipients, stateFilter, searchQuery]);

  const counts = useMemo(() => {
    // Use meta counts if available (prefetched), otherwise calculate from recipients
    return {
      pending:
        meta?.pending ?? recipients.filter((r) => r.state === "pending").length,
      retargeted:
        meta?.retargeted ??
        recipients.filter((r) => r.state === "retargeted").length,
      blocked:
        meta?.blocked ?? recipients.filter((r) => r.state === "blocked").length,
    };
  }, [recipients, meta]);

  const selectableRecipients = useMemo(() => {
    return filteredRecipients.filter((r) => r.canRetarget);
  }, [filteredRecipients]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRecipients.length / ITEMS_PER_PAGE);
  const paginatedRecipients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecipients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecipients, currentPage]);

  // Reset page when filter or recipients change
  useEffect(() => {
    setCurrentPage(1);
  }, [stateFilter, recipients.length, searchQuery]);

  const handleFetch = () => {
    const filters: Record<string, any> = {};
    if (audience === "leads") {
      if (area) filters.area = area;
      if (zone) filters.zone = zone;
      if (metroZone) filters.metroZone = metroZone;
      if (bookingTerm) filters.bookingTerm = bookingTerm;
      if (propertyType) filters.propertyType = propertyType;
      if (typeOfProperty) filters.typeOfProperty = typeOfProperty;
      if (priority) filters.priority = priority;
      if (minGuests) filters.minGuests = Number(minGuests);
      if (maxGuests) filters.maxGuests = Number(maxGuests);
    } else if (audience === "owners") {
      if (ownerPropertyType) filters.propertyType = ownerPropertyType;
      if (ownerAvailability) filters.availability = ownerAvailability;
      if (ownerArea) filters.area = ownerArea;
    }
    onFetchRecipients(stateFilter, filters);
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
  const progressPercentage =
    totalToSend > 0 ? (sentCount / totalToSend) * 100 : 0;

  // Get unique values for filter dropdowns
  const uniqueAreas = useMemo(() => {
    const areas = recipients.map((r) => r.area).filter((a): a is string => !!a);
    return Array.from(new Set(areas)).sort();
  }, [recipients]);

  const uniqueZones = useMemo(() => {
    const zones = recipients.map((r) => r.zone).filter((z): z is string => !!z);
    return Array.from(new Set(zones)).sort();
  }, [recipients]);

  // Get unique property types and areas for owner filters
  const uniqueOwnerPropertyTypes = useMemo(() => {
    const types = recipients
      .filter((r) => r.source === "owner")
      .map((r) => r.propertyType)
      .filter((t): t is string => !!t);
    return Array.from(new Set(types)).sort();
  }, [recipients]);

  const uniqueOwnerAreas = useMemo(() => {
    const areas = recipients
      .filter((r) => r.source === "owner")
      .map((r) => r.area)
      .filter((a): a is string => !!a);
    return Array.from(new Set(areas)).sort();
  }, [recipients]);

  const getAudienceLabel = (aud: Audience) => {
    switch (aud) {
      case "leads":
        return "guests";
      case "owners":
        return "owners";
      case "uploaded":
        return "contacts";
    }
  };

  // Filter sidebar content (shared between desktop sidebar and mobile sheet)
  // NOTE: This must be a JSX variable, NOT a function component () => (...),
  // because defining a component inside render causes remount on every state change, killing input focus.
  const filterContent = (
    <div className="h-full flex flex-col bg-background">
      {/* Sidebar Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-semibold text-base">Campaign Filters</h2>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-lg bg-background border">
            <div className="text-xs text-muted-foreground mb-0.5">
              Max retargets
            </div>
            <div className="text-sm font-semibold">
              {maxRetarget}x per contact
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-background border">
            <div className="text-xs text-muted-foreground mb-0.5">
              Daily quota
            </div>
            <div className="text-sm font-semibold">
              <span
                className={
                  dailyRemaining < 20 ? "text-destructive" : "text-green-600"
                }
              >
                {dailyRemaining}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Audience Tabs */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Audience Type
            </Label>
            <Tabs
              value={audience}
              onValueChange={(v) => onAudienceChange(v as Audience)}
            >
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="leads" className="gap-1.5 py-2.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Guests</span>
                </TabsTrigger>
                <TabsTrigger value="owners" className="gap-1.5 py-2.5">
                  <Building className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Owners</span>
                </TabsTrigger>
                <TabsTrigger value="uploaded" className="gap-1.5 py-2.5">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Uploaded</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Template Selection - Searchable */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Message Template
              {selectedTemplate && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  ✓ Selected
                </span>
              )}
            </Label>
            <div className="relative" ref={templateSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    setTemplateDropdownOpen(true);
                  }}
                  onFocus={() => setTemplateDropdownOpen(true)}
                  placeholder={
                    selectedTemplate
                      ? `${selectedTemplate.name}`
                      : "Search templates..."
                  }
                  className="h-10 pl-9 pr-9 bg-background"
                />
                {selectedTemplate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(null);
                      onTemplateParamsChange({});
                      setTemplateSearch("");
                      setTemplateDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {templateDropdownOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-popover border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                  {filteredTemplates.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      No templates found
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredTemplates.map((t) => {
                        const snippet = getTemplateBodySnippet(t);
                        const isActive = selectedTemplate?.name === t.name;
                        return (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => {
                              onSelectTemplate(t);
                              // Auto-fill params: sender name from token, examples for rest
                              const autoParams = buildAutoFilledParams(t, senderName);
                              onTemplateParamsChange(autoParams);
                              setTemplateSearch("");
                              setTemplateDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0 group",
                              isActive && "bg-accent/50",
                            )}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <span className="font-medium text-sm flex-1 group-hover:text-primary transition-colors">
                                {t.name}
                              </span>
                              {isActive && (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {t.language}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {t.category}
                              </Badge>
                            </div>
                            {snippet && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                                {snippet}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Template Parameters */}
          {params.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                Parameters ({params.length})
              </Label>
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                {params.map((param) => {
                  const key = `${param.type}_${param.index}`;
                  const intent = paramIntents[key] || "custom";
                  const autoLabel = intentLabel(intent);
                  const isAutoRecipient = intent === "recipientName" || intent === "location";
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 font-mono"
                        >
                          {param.type === "header" ? "H" : "B"}
                          {param.index}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {param.contextSnippet}
                        </span>
                        {autoLabel && (
                          <Badge
                            variant={isAutoRecipient ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5",
                              isAutoRecipient && "bg-blue-600 hover:bg-blue-600"
                            )}
                          >
                            {autoLabel}
                          </Badge>
                        )}
                      </div>
                      {isAutoRecipient ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={templateParams[key] || ""}
                            onChange={(e) =>
                              onTemplateParamsChange({
                                ...templateParams,
                                [key]: e.target.value,
                              })
                            }
                            placeholder={intent === "recipientName" ? "Filled per recipient (or type to override all)" : "Filled per recipient (or type to override all)"}
                            className="h-9 bg-background border-blue-200 dark:border-blue-800"
                          />
                        </div>
                      ) : (
                        <Input
                          value={templateParams[key] || ""}
                          onChange={(e) =>
                            onTemplateParamsChange({
                              ...templateParams,
                              [key]: e.target.value,
                            })
                          }
                          placeholder={param.example || "Enter value..."}
                          className="h-9 bg-background"
                        />
                      )}
                      {isAutoRecipient && !templateParams[key] && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          {intent === "recipientName" ? "Will use each recipient's name automatically" : "Will use each recipient's location automatically"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && selectedTemplate && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                Message Preview
              </Label>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    WhatsApp Message
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {preview}
                </p>
              </div>
            </div>
          )}

          {/* Date Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => onFromDateChange(e.target.value)}
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => onToDateChange(e.target.value)}
                  className="h-9 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Price Filters - Only for Leads */}
          {audience === "leads" && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Budget Range
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={priceFrom}
                        onChange={(e) =>
                          onPriceFromChange(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="20000"
                        className="h-9 pl-8 bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={priceTo}
                        onChange={(e) =>
                          onPriceToChange(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="50000"
                        className="h-9 pl-8 bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Count Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Guest Count
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      value={minGuests}
                      onChange={(e) =>
                        setMinGuests(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="1"
                      className="h-9 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      value={maxGuests}
                      onChange={(e) =>
                        setMaxGuests(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="4"
                      className="h-9 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Area Filter */}
              {uniqueAreas.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Area
                  </Label>
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Filter by area..."
                    className="h-9 bg-background"
                  />
                </div>
              )}

              {/* Zone Filter */}
              {uniqueZones.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Zone
                  </Label>
                  <Select
                    value={zone || "all"}
                    onValueChange={(v) => setZone(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="All zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      {uniqueZones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Metro Zone Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Metro Zone
                </Label>
                <Select
                  value={metroZone || "all"}
                  onValueChange={(v) => setMetroZone(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All metro zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All metro zones</SelectItem>
                    <SelectItem value="Blue Line">Blue Line</SelectItem>
                    <SelectItem value="Red Line">Red Line</SelectItem>
                    <SelectItem value="Green Line">Green Line</SelectItem>
                    <SelectItem value="Yellow Line">Yellow Line</SelectItem>
                    <SelectItem value="Anywhere">Anywhere</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Booking Term Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Booking Term
                </Label>
                <Select
                  value={bookingTerm || "all"}
                  onValueChange={(v) => setBookingTerm(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All terms</SelectItem>
                    <SelectItem value="Short Term">Short Term</SelectItem>
                    <SelectItem value="Mid Term">Mid Term</SelectItem>
                    <SelectItem value="Long Term">Long Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property Type Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Property Type
                </Label>
                <Select
                  value={propertyType || "all"}
                  onValueChange={(v) => setPropertyType(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="Furnished">Furnished</SelectItem>
                    <SelectItem value="Semi-furnished">
                      Semi-furnished
                    </SelectItem>
                    <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Priority
                </Label>
                <Select
                  value={priority || "all"}
                  onValueChange={(v) => setPriority(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="ASAP">ASAP</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Owner-specific filters */}
          {audience === "owners" && (
            <>
              {/* Property Type Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Property Type
                </Label>
                <Select
                  value={ownerPropertyType || "all"}
                  onValueChange={(v) =>
                    setOwnerPropertyType(v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All property types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All property types</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    {uniqueOwnerPropertyTypes
                      .filter(
                        (t) =>
                          ![
                            "Hotel",
                            "Apartment",
                            "Studio",
                            "Villa",
                            "House",
                          ].includes(t),
                      )
                      .map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Availability
                </Label>
                <Select
                  value={ownerAvailability || "all"}
                  onValueChange={(v) =>
                    setOwnerAvailability(v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="All availabilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All availabilities</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Not Available">Not Available</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area Filter for Owners */}
              {uniqueOwnerAreas.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Area
                  </Label>
                  <Input
                    value={ownerArea}
                    onChange={(e) => setOwnerArea(e.target.value)}
                    placeholder="Filter by area..."
                    className="h-9 bg-background"
                  />
                </div>
              )}
            </>
          )}

          {/* Uploaded Contacts filters */}
          {audience === "uploaded" && (
            <>
              {/* Upload File Button */}
              {onUploadFile && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Upload Contacts
                  </Label>
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUploadFile(file);
                            e.target.value = "";
                          }
                        }}
                        disabled={uploading}
                      />
                      <div
                        className={cn(
                          "flex items-center justify-center gap-3 border-2 border-dashed rounded-lg p-4 transition-all",
                          uploading
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : "hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-[0.98]",
                        )}
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {uploading ? "Uploading..." : "Click to upload"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            CSV or XLSX file
                          </span>
                        </div>
                      </div>
                    </label>
                    <p className="text-xs text-muted-foreground px-1">
                      Required: name, phoneNumber, country
                    </p>
                  </div>
                </div>
              )}

              {/* Batch Filter */}
              {uploadBatches.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Upload Batch
                  </Label>
                  <Select
                    value={selectedBatchId || "all"}
                    onValueChange={(v) =>
                      onBatchIdChange?.(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="All batches" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="all">
                        All batches (
                        {uploadBatches.reduce((s, b) => s + b.count, 0)})
                      </SelectItem>
                      {uploadBatches.map((b) => (
                        <SelectItem key={b.batchId} value={b.batchId}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            {b.sourceFileName} ({b.count})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Country Filter */}
              {uploadCountries.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Country
                  </Label>
                  <Select
                    value={selectedCountry || "all"}
                    onValueChange={(v) =>
                      onCountryChange?.(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {uploadCountries.map((c) => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            {c}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Location Filter - hide for uploaded contacts */}
          {audience !== "uploaded" && location.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                Location
              </Label>
              <Select
                value={selectedLocation || "all"}
                onValueChange={(v) =>
                  onSelectedLocationChange(v === "all" ? "" : v)
                }
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {location.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Fetch Button - Sticky at bottom */}
      <div className="p-4 border-t bg-background">
        <Button
          onClick={() => {
            handleFetch();
            if (isMobile) setMobileFilterOpen(false);
          }}
          disabled={fetching}
          className={cn("w-full shadow-sm", isMobile && "h-12")}
          size="lg"
        >
          {fetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh {getAudienceLabel(audience)}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full overflow-hidden min-h-0 bg-background",
        isMobile && "flex-col",
      )}
    >
      {/* Desktop SIDEBAR - Filters (hidden on mobile) */}
      {!isMobile && (
        <div
          className={cn(
            "flex-shrink-0 border-r transition-all duration-300 overflow-hidden",
            sidebarCollapsed ? "w-0" : "w-80 lg:w-96",
          )}
        >
          {filterContent}
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent side="left" className="w-full sm:w-96 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            {filterContent}
          </SheetContent>
        </Sheet>
      )}

      {/* MAIN CONTENT - Recipients List */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div
          className={cn(
            "border-b bg-background",
            isMobile ? "p-3" : "p-4 lg:p-5",
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Mobile back button */}
              {isMobile && onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}

              {/* Mobile filter toggle */}
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFilterOpen(true)}
                  className="h-10 gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              )}

              {/* Desktop: show filters button when collapsed */}
              {!isMobile && sidebarCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Show Filters
                </Button>
              )}

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <MessageSquare className="text-green-600 dark:text-green-400 h-5 w-5" />
                </div>
                <div>
                  <h1
                    className={cn(
                      "font-semibold",
                      isMobile ? "text-base" : "text-xl",
                    )}
                  >
                    Retargeting Campaign
                  </h1>
                  {!isMobile && (
                    <p className="text-xs text-muted-foreground">
                      Send WhatsApp messages to {getAudienceLabel(audience)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${getAudienceLabel(audience)} by name, phone, email, location...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10 bg-background",
                  isMobile ? "h-11 text-base" : "h-10",
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* State Tabs */}
          <Tabs value={stateFilter} onValueChange={setStateFilter}>
            <TabsList
              className={cn(
                "grid grid-cols-3 w-full",
                isMobile ? "h-auto" : "max-w-md",
              )}
            >
              <TabsTrigger
                value="pending"
                className={cn(
                  "gap-1.5",
                  isMobile ? "px-2 py-2.5 text-xs" : "py-2",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pending</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {counts.pending}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="retargeted"
                className={cn(
                  "gap-1.5",
                  isMobile ? "px-2 py-2.5 text-xs" : "py-2",
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Retargeted</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {counts.retargeted}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="blocked"
                className={cn(
                  "gap-1.5",
                  isMobile ? "px-2 py-2.5 text-xs" : "py-2",
                )}
              >
                <Ban className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Blocked</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {counts.blocked}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Blocked Warning */}
        {stateFilter === "blocked" && (
          <div className="p-4 bg-destructive/10 border-b border-destructive/20">
            <Alert variant="destructive" className="border-none bg-transparent">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Blocked {getAudienceLabel(audience)} cannot receive messages.
                Common reasons: blocked your number, don&apos;t have WhatsApp,
                or reached maximum retarget limit.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Action Bar */}
        {stateFilter !== "blocked" && (
          <div className={cn("border-b bg-muted/30", isMobile ? "p-3" : "p-4")}>
            <div
              className={cn("flex items-center gap-3", isMobile && "flex-col")}
            >
              {/* Mobile: Compact action row */}
              {isMobile ? (
                <>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAll(true)}
                        disabled={
                          selectableRecipients.length === 0 ||
                          selectedRecipientIds.length >= 10
                        }
                        className="h-9 px-3 gap-1.5"
                      >
                        <CheckSquare className="h-4 w-4" />
                        All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAll(false)}
                        disabled={selectedRecipientIds.length === 0}
                        className="h-9 px-3 gap-1.5"
                      >
                        <Square className="h-4 w-4" />
                        None
                      </Button>
                    </div>
                    <Badge
                      variant={
                        selectedRecipientIds.length >= 10
                          ? "destructive"
                          : "default"
                      }
                      className={cn(
                        "h-8 px-3 text-xs font-semibold",
                        selectedRecipientIds.length > 0 &&
                          selectedRecipientIds.length < 10 &&
                          "bg-green-600 hover:bg-green-700",
                      )}
                    >
                      {selectedRecipientIds.length}/10 selected
                    </Badge>
                  </div>
                  <Button
                    onClick={handleStartRetarget}
                    disabled={
                      sending ||
                      !selectedTemplate ||
                      selectedRecipientIds.length === 0 ||
                      dailyRemaining <= 0
                    }
                    className="bg-green-600 hover:bg-green-700 w-full h-11 shadow-sm active:scale-[0.98] transition-transform"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send to {selectedRecipientIds.length}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Desktop layout */}
                  <Button
                    onClick={handleStartRetarget}
                    disabled={
                      sending ||
                      !selectedTemplate ||
                      selectedRecipientIds.length === 0 ||
                      dailyRemaining <= 0
                    }
                    className="bg-green-600 hover:bg-green-700 shadow-sm"
                    size="lg"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send to {selectedRecipientIds.length} selected
                      </>
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleAll(true)}
                      disabled={
                        selectableRecipients.length === 0 ||
                        selectedRecipientIds.length >= 10
                      }
                      className="gap-1.5"
                    >
                      <CheckSquare className="h-4 w-4" /> Select all (max 10)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleAll(false)}
                      disabled={selectedRecipientIds.length === 0}
                      className="gap-1.5"
                    >
                      <Square className="h-4 w-4" /> Clear selection
                    </Button>
                  </div>

                  <div className="ml-auto flex gap-2">
                    <Badge
                      variant="outline"
                      className="h-9 flex items-center px-3 gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {filteredRecipients.length} loaded
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="h-9 flex items-center px-3 gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selectableRecipients.length} eligible
                    </Badge>
                    <Badge
                      variant={
                        selectedRecipientIds.length >= 10
                          ? "destructive"
                          : "default"
                      }
                      className={cn(
                        "h-9 flex items-center px-3 gap-1.5 font-semibold",
                        selectedRecipientIds.length > 0 &&
                          selectedRecipientIds.length < 10 &&
                          "bg-green-600 hover:bg-green-700",
                      )}
                    >
                      <Target className="h-3.5 w-3.5" />
                      {selectedRecipientIds.length}/10
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sending Progress */}
        {sendingActive && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b border-green-200 dark:border-green-900">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-semibold text-base">
                      Sending messages...
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sentCount} of {totalToSend} sent •{" "}
                      {Math.max(0, totalToSend - sentCount)} remaining
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {progressPercentage.toFixed(0)}%
                  </div>
                </div>
              </div>
              <Progress
                value={progressPercentage}
                className="h-2.5 bg-green-100 dark:bg-green-950"
              />
            </div>
          </div>
        )}

        {/* Recipients List */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto bg-muted/20",
            isMobile ? "p-3" : "p-4 lg:p-5",
          )}
        >
          {fetching && recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2
                className={cn(
                  "animate-spin text-primary mb-4",
                  isMobile ? "h-10 w-10" : "h-12 w-12",
                )}
              />
              <p
                className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-base" : "text-lg",
                )}
              >
                Loading {getAudienceLabel(audience)}...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-4 rounded-full bg-muted mb-4">
                <User
                  className={cn(
                    "opacity-40",
                    isMobile ? "h-12 w-12" : "h-16 w-16",
                  )}
                />
              </div>
              <p
                className={cn(
                  "font-semibold mb-2",
                  isMobile ? "text-base" : "text-lg",
                )}
              >
                No {stateFilter} {getAudienceLabel(audience)} found
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery
                  ? "Try adjusting your search query or filters"
                  : `Click "Refresh ${getAudienceLabel(audience)}" to load contacts with your current filters`}
              </p>
            </div>
          ) : (
            <div className={cn(!isMobile && "max-w-7xl mx-auto")}>
              {/* Responsive Grid */}
              <div
                className={cn(
                  "grid gap-3",
                  isMobile
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
                )}
              >
                {paginatedRecipients.map((r) => {
                  const isDisabled = !r.canRetarget || r.blocked;
                  const isSelected = selectedRecipientIds.includes(r.id);

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex flex-col rounded-lg border bg-card transition-all duration-200",
                        isMobile ? "p-3.5" : "p-4",
                        isDisabled
                          ? "opacity-50 bg-muted/50 cursor-not-allowed"
                          : "hover:border-primary hover:shadow-lg cursor-pointer active:scale-[0.99]",
                        isSelected &&
                          !isDisabled &&
                          "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md ring-1 ring-green-500/20",
                      )}
                      onClick={() => !isDisabled && onToggleRecipient(r.id)}
                    >
                      {/* Top Row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {!isDisabled ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleRecipient(r.id)}
                              aria-label="select recipient"
                              disabled={isDisabled}
                              className="h-4.5 w-4.5"
                            />
                          ) : (
                            <div className="h-4.5 w-4.5 flex items-center justify-center">
                              <XCircle className="h-4.5 w-4.5 text-destructive" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-semibold text-base truncate">
                              {r.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                            >
                              {r.source}
                            </Badge>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="font-mono text-xs">
                                +{r.phone}
                              </span>
                            </div>
                            {r.email && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate text-xs">
                                  {r.email}
                                </span>
                              </div>
                            )}
                            {(r.location || r.area) && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate text-xs">
                                  {r.location || r.area}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional Info for Leads */}
                      {r.source === "lead" && (
                        <div className="mb-3 space-y-2">
                          {r.minBudget && r.maxBudget && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs font-medium">
                                ₹{r.minBudget.toLocaleString()} - ₹
                                {r.maxBudget.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {r.guest && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">
                                {r.guest} guest{r.guest > 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                          {r.startDate && r.endDate && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">
                                {r.startDate} to {r.endDate}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.bookingTerm && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {r.bookingTerm}
                              </Badge>
                            )}
                            {r.priority && (
                              <Badge
                                variant={
                                  r.priority === "ASAP" || r.priority === "High"
                                    ? "destructive"
                                    : "outline"
                                }
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {r.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional Info for Owners */}
                      {r.source === "owner" && (
                        <div className="mb-3 space-y-2">
                          {r.address && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate text-xs">
                                {r.address}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.propertyType && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                <Building className="h-3 w-3 mr-1" />
                                {r.propertyType}
                              </Badge>
                            )}
                            {r.availability && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {r.availability}
                              </Badge>
                            )}
                            {r.propertyCount && r.propertyCount > 1 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {r.propertyCount} properties
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional Info for Uploaded Contacts */}
                      {r.source === "uploaded" && (
                        <div className="mb-3 space-y-2">
                          {r.country && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">{r.country}</span>
                            </div>
                          )}
                          {r.sourceFileName && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5 gap-1"
                              >
                                <FileSpreadsheet className="h-3 w-3" />
                                {r.sourceFileName}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Row: Stats & Badges */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t">
                        <div className="flex items-center gap-3 text-xs">
                          {/* Retarget Count */}
                          <div
                            className={cn(
                              "flex items-center gap-1.5",
                              r.retargetCount > 0
                                ? "text-amber-600 dark:text-amber-400 font-semibold"
                                : "text-muted-foreground",
                            )}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>
                              {r.retargetCount}/{maxRetarget}
                            </span>
                          </div>
                          {r.lastRetargetAt && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {formatRelativeTime(r.lastRetargetAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {r.status && r.status !== "pending" && (
                            <Badge
                              variant={
                                r.status === "sent"
                                  ? "default"
                                  : r.status === "failed"
                                    ? "destructive"
                                    : "outline"
                              }
                              className="text-[10px] px-1.5 py-0.5 font-medium"
                            >
                              {r.status}
                            </Badge>
                          )}

                          <StateBadge
                            state={r.state}
                            retargetCount={r.retargetCount}
                          />

                          {r.blocked && r.blockReason && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0.5 font-medium"
                            >
                              {formatBlockReason(r.blockReason)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          className="h-9 w-9 p-0 font-medium"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <div className="ml-3 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              Confirm Re-retargeting
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed pt-2">
              Some selected {getAudienceLabel(audience)} have already received
              messages from you.
              <br />
              <br />
              <strong className="text-foreground">⚠️ Warning:</strong> Sending
              too many messages to the same contacts can result in your WhatsApp
              Business account being restricted or permanently banned.
              <br />
              <br />
              Are you sure you want to proceed?
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
