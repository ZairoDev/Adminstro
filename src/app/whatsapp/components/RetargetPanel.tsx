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
} from "lucide-react";
import type { Template } from "../types";
import { getTemplateParameters, getTemplatePreviewText } from "../utils";
import { cn } from "@/lib/utils";

// =========================================================
// TYPES
// =========================================================
type Audience = "leads" | "owners";
type RetargetState = "pending" | "retargeted" | "blocked";

type Recipient = {
  id: string;
  name: string;
  phone: string;
  email?: string;
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
  onFetchRecipients: (stateFilter: string, additionalFilters?: Record<string, any>) => void;
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
  isMobile = false,
  onBack,
}: RetargetPanelProps) {
  const [stateFilter, setStateFilter] = useState<string>("pending");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
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
  const hasMountedRef = useRef(false);
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
    } else {
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
          (r.area && r.area.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [recipients, stateFilter, searchQuery]);

  const counts = useMemo(() => {
    // Use meta counts if available (prefetched), otherwise calculate from recipients
    return {
      pending: meta?.pending ?? recipients.filter((r) => r.state === "pending").length,
      retargeted: meta?.retargeted ?? recipients.filter((r) => r.state === "retargeted").length,
      blocked: meta?.blocked ?? recipients.filter((r) => r.state === "blocked").length,
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
    } else {
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
  const progressPercentage = totalToSend > 0 ? (sentCount / totalToSend) * 100 : 0;

  // Get unique values for filter dropdowns
  const uniqueAreas = useMemo(() => {
    const areas = recipients
      .map((r) => r.area)
      .filter((a): a is string => !!a);
    return Array.from(new Set(areas)).sort();
  }, [recipients]);

  const uniqueZones = useMemo(() => {
    const zones = recipients
      .map((r) => r.zone)
      .filter((z): z is string => !!z);
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

  // Filter sidebar content (shared between desktop sidebar and mobile sheet)
  const FilterContent = () => (
    <div className="h-full flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Filters</h2>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-sm">
            Max {maxRetarget} per {audience === "leads" ? "lead" : "owner"}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {dailyRemaining}/100 left today
          </Badge>
          {meta?.blocked && meta.blocked > 0 && (
            <Badge variant="destructive" className="text-sm">
              {meta.blocked} blocked
            </Badge>
          )}
        </div>
      </div>

          {/* Sidebar Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Audience Tabs */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Audience Type</Label>
              <Tabs
                value={audience}
                onValueChange={(v) => onAudienceChange(v as Audience)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="leads">Guests</TabsTrigger>
                  <TabsTrigger value="owners">Owners</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Template</Label>
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
                <Label className="text-base font-semibold">
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
                <Label className="text-base font-semibold">Preview</Label>
                <Alert>
                  <AlertDescription className="whitespace-pre-wrap text-xs">
                    {preview}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Date Filters */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Date Range</Label>
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
              <>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Price Range</Label>
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

                {/* Guest Count Filter */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Guest Count</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        value={minGuests}
                        onChange={(e) =>
                          setMinGuests(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="e.g. 1"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        value={maxGuests}
                        onChange={(e) =>
                          setMaxGuests(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="e.g. 4"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Area Filter */}
                {uniqueAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Area</Label>
                    <Input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Filter by area..."
                      className="h-9"
                    />
                  </div>
                )}

                {/* Zone Filter */}
                {uniqueZones.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Zone</Label>
                    <Select value={zone || "all"} onValueChange={(v) => setZone(v === "all" ? "" : v)}>
                      <SelectTrigger>
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
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Metro Zone</Label>
                  <Select value={metroZone || "all"} onValueChange={(v) => setMetroZone(v === "all" ? "" : v)}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Booking Term</Label>
                  <Select value={bookingTerm || "all"} onValueChange={(v) => setBookingTerm(v === "all" ? "" : v)}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Property Type</Label>
                  <Select value={propertyType || "all"} onValueChange={(v) => setPropertyType(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="Furnished">Furnished</SelectItem>
                      <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                      <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Priority</Label>
                  <Select value={priority || "all"} onValueChange={(v) => setPriority(v === "all" ? "" : v)}>
                    <SelectTrigger>
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

            {/* Owner-specific filters (based on unregisteredOwner schema) */}
            {audience === "owners" && (
              <>
                {/* Property Type Filter */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Property Type</Label>
                  <Select 
                    value={ownerPropertyType || "all"} 
                    onValueChange={(v) => setOwnerPropertyType(v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
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
                        .filter((t) => !["Hotel", "Apartment", "Studio", "Villa", "House"].includes(t))
                        .map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability Filter */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Availability</Label>
                  <Select 
                    value={ownerAvailability || "all"} 
                    onValueChange={(v) => setOwnerAvailability(v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Area</Label>
                    <Input
                      value={ownerArea}
                      onChange={(e) => setOwnerArea(e.target.value)}
                      placeholder="Filter by area..."
                      className="h-9"
                    />
                  </div>
                )}
              </>
            )}

            {/* Location Filter */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Location</Label>
              <Select
                value={selectedLocation || "all"}
                onValueChange={(v) => onSelectedLocationChange(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
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

            {/* Fetch Button */}
            <Button
              onClick={() => {
                handleFetch();
                if (isMobile) setMobileFilterOpen(false);
              }}
              disabled={fetching}
              className={cn("w-full", isMobile && "h-12")}
              size="lg"
            >
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh {stateFilter} {audience === "leads" ? "guests" : "owners"}
            </Button>
          </div>
        </div>
  );

  return (
    <div className={cn(
      "flex h-full overflow-x-hidden min-h-0",
      // Mobile: full screen view
      isMobile && "flex-col"
    )}>
      {/* Desktop SIDEBAR - Filters (hidden on mobile) */}
      {!isMobile && (
        <div
          className={cn(
            "flex-shrink-0 border-r bg-background transition-all duration-300",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-80 lg:w-96"
          )}
        >
          <FilterContent />
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent side="left" className="w-full sm:w-96 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      )}

      {/* MAIN CONTENT - Recipients List */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-0">
        {/* Header */}
        <div className={cn(
          "border-b bg-background",
          isMobile ? "p-3" : "p-4"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 md:gap-3">
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
                  className="h-10"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              )}
              
              {/* Desktop: show filters button when collapsed */}
              {!isMobile && sidebarCollapsed && (
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
                <MessageSquare className={cn(
                  "text-green-500",
                  isMobile ? "h-4 w-4" : "h-5 w-5"
                )} />
                <h1 className={cn(
                  "font-semibold",
                  isMobile ? "text-base" : "text-xl"
                )}>
                  {isMobile ? "Retarget" : "Retargeting Campaign"}
                </h1>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isMobile 
                  ? `Search ${audience === "leads" ? "guests" : "owners"}...` 
                  : `Search ${audience === "leads" ? "guests" : "owners"} by name, phone, email, location...`
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-9", isMobile && "h-11 text-base")}
              />
            </div>
          </div>

          {/* State Tabs - scrollable on mobile */}
          <Tabs value={stateFilter} onValueChange={setStateFilter}>
            <TabsList className={cn(
              "grid grid-cols-3",
              isMobile ? "w-full" : "w-full max-w-md"
            )}>
              <TabsTrigger value="pending" className={cn(
                "gap-1",
                isMobile && "px-2 text-xs"
              )}>
                <Clock className="h-3 w-3" />
                {isMobile ? counts.pending : `Pending (${counts.pending})`}
              </TabsTrigger>
              <TabsTrigger value="retargeted" className={cn(
                "gap-1",
                isMobile && "px-2 text-xs"
              )}>
                <RotateCcw className="h-3 w-3" />
                {isMobile ? counts.retargeted : `Retargeted (${counts.retargeted})`}
              </TabsTrigger>
              <TabsTrigger value="blocked" className={cn(
                "gap-1",
                isMobile && "px-2 text-xs"
              )}>
                <Ban className="h-3 w-3" />
                {isMobile ? counts.blocked : `Blocked (${counts.blocked})`}
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
                Blocked {audience === "leads" ? "guests" : "owners"} cannot be messaged. These contacts have either
                blocked your number, don&apos;t have WhatsApp, or reached the maximum
                retarget limit.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Action Bar */}
        {stateFilter !== "blocked" && (
          <div className={cn(
            "border-b bg-muted/30",
            isMobile ? "p-3" : "p-4"
          )}>
            <div className={cn(
              "flex items-center gap-2",
              isMobile ? "flex-col" : "flex-wrap gap-3"
            )}>
              {/* Mobile: Compact action row */}
              {isMobile ? (
                <>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAll(true)}
                        disabled={selectableRecipients.length === 0 || selectedRecipientIds.length >= 10}
                        className="h-9 px-2"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleAll(false)}
                        disabled={selectedRecipientIds.length === 0}
                        className="h-9 px-2"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge
                      variant={selectedRecipientIds.length >= 10 ? "destructive" : "default"}
                      className={cn(
                        "h-8 px-2 text-xs",
                        selectedRecipientIds.length < 10 && "bg-green-600"
                      )}
                    >
                      {selectedRecipientIds.length}/10
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
                    className="bg-green-600 hover:bg-green-700 w-full h-11 active:scale-[0.98]"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send to {selectedRecipientIds.length}
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
                      disabled={selectableRecipients.length === 0 || selectedRecipientIds.length >= 10}
                      className="gap-1"
                    >
                      <CheckSquare className="h-4 w-4" /> Select (max 10)
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
                      variant={selectedRecipientIds.length >= 10 ? "destructive" : "default"}
                      className={`h-9 flex items-center px-3 ${selectedRecipientIds.length >= 10 ? "" : "bg-green-600"}`}
                    >
                      {selectedRecipientIds.length}/10 selected
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sending Progress */}
        {sendingActive && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b">
            <div className="space-y-2">
              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600 animate-pulse" />
                  <span className="font-semibold text-lg">
                    Sending: {sentCount} / {totalToSend}
                  </span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {Math.max(0, totalToSend - sentCount)} remaining
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">
                {progressPercentage.toFixed(1)}% complete
              </div>
            </div>
          </div>
        )}

        {/* Recipients List */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          isMobile ? "p-3" : "p-4"
        )}>
          {fetching && recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className={cn(
                "animate-spin text-muted-foreground mb-4",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )} />
              <p className={cn(
                "font-medium text-muted-foreground",
                isMobile ? "text-base" : "text-lg"
              )}>
                Loading {audience === "leads" ? "guests" : "owners"}...
              </p>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <User className={cn(
                "mb-4 opacity-20",
                isMobile ? "h-12 w-12" : "h-16 w-16"
              )} />
              <p className={cn(
                "font-medium mb-2",
                isMobile ? "text-base" : "text-lg"
              )}>
                No {stateFilter} {audience === "leads" ? "guests" : "owners"} found
              </p>
              <p className="text-sm text-center px-4">
                {searchQuery ? "Try adjusting your search query" : `Click "Refresh ${stateFilter} ${audience === "leads" ? "guests" : "owners"}" to load recipients`}
              </p>
            </div>
          ) : (
            <div className={cn(!isMobile && "max-w-6xl mx-auto")}>
              {/* Responsive Grid - 1 column on mobile, 2 on tablet+ */}
              <div className={cn(
                "grid gap-3",
                isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              )}>
                {paginatedRecipients.map((r) => {
                  const isDisabled = !r.canRetarget || r.blocked;
                  const isSelected = selectedRecipientIds.includes(r.id);

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex flex-col rounded-lg border transition-all",
                        // Larger padding on mobile for touch targets
                        isMobile ? "p-3" : "p-4",
                        isDisabled
                          ? "opacity-50 bg-muted/50 cursor-not-allowed"
                          : "hover:border-primary hover:shadow-md cursor-pointer active:scale-[0.99]",
                        isSelected && !isDisabled
                          && "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md"
                      )}
                      onClick={() => !isDisabled && onToggleRecipient(r.id)}
                    >
                      {/* Top Row: Checkbox + Name + Source Badge */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0">
                          {!isDisabled ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleRecipient(r.id)}
                              aria-label="select recipient"
                              disabled={isDisabled}
                              className="h-4 w-4"
                            />
                          ) : (
                            <div className="h-4 w-4 flex items-center justify-center">
                              <Ban className="h-4 w-4 text-destructive" />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-base truncate flex-1">
                          {r.name}
                        </span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {r.source}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 mb-2 pl-7">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>+{r.phone}</span>
                        </div>
                        {r.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{r.email}</span>
                          </div>
                        )}
                        {(r.location || r.area) && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{r.location || r.area}</span>
                          </div>
                        )}
                      </div>

                      {/* Additional Info for Leads */}
                      {r.source === "lead" && (
                        <div className="pl-7 mb-2 space-y-1">
                          {r.minBudget && r.maxBudget && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>₹{r.minBudget.toLocaleString()} - ₹{r.maxBudget.toLocaleString()}</span>
                            </div>
                          )}
                          {r.guest && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{r.guest} guest{r.guest > 1 ? "s" : ""}</span>
                            </div>
                          )}
                          {r.startDate && r.endDate && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{r.startDate} to {r.endDate}</span>
                            </div>
                          )}
                          {r.bookingTerm && (
                            <Badge variant="outline" className="text-xs mr-1">
                              {r.bookingTerm}
                            </Badge>
                          )}
                          {r.priority && (
                            <Badge variant={r.priority === "ASAP" || r.priority === "High" ? "destructive" : "outline"} className="text-xs">
                              {r.priority}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Additional Info for Owners */}
                      {r.source === "owner" && (
                        <div className="pl-7 mb-2 space-y-1">
                          {r.address && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{r.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 flex-wrap">
                            {r.propertyType && (
                              <Badge variant="outline" className="text-xs">
                                {r.propertyType}
                              </Badge>
                            )}
                            {r.availability && (
                              <Badge variant="outline" className="text-xs">
                                {r.availability}
                              </Badge>
                            )}
                            {r.propertyCount && r.propertyCount > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {r.propertyCount} properties
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Stats & Badges */}
                      <div className="flex items-center justify-between gap-2 pl-7 pt-2 border-t">
                        <div className="flex items-center gap-3 text-sm">
                          {/* Retarget Count - Always Show */}
                          <div className={`flex items-center gap-1 ${r.retargetCount > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                            <RotateCcw className="h-4 w-4" />
                            <span>{r.retargetCount}/{maxRetarget}</span>
                          </div>
                          {r.lastRetargetAt && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{formatRelativeTime(r.lastRetargetAt)}</span>
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
                              className="text-[10px] px-1.5 py-0"
                            >
                              {r.status}
                            </Badge>
                          )}

                          <StateBadge
                            state={r.state}
                            retargetCount={r.retargetCount}
                          />

                          {r.blocked && r.blockReason && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
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
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    {filteredRecipients.length} total
                  </span>
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
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Re-retargeting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Some selected {audience === "leads" ? "guests" : "owners"} have been retargeted before. Sending too many
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
