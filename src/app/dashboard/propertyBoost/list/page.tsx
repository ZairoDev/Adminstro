"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  Rocket,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeInterface } from "@/util/type";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { apartmentTypes } from "@/app/spreadsheet/constants/apartmentTypes";

interface Property {
  _id: string;
  title: string;
  description: string;
  images: string[];
  BoostID: string;
  vsid: string;
  location?: string;
  createdAt: string;
  createdBy: string;
  lastReboostedAt?: string;
}

const PAGE_SIZE = 10;

const DEFAULT_PROPERTY_TYPE_OPTIONS = [
  ...apartmentTypes.map((t) => t.value),
  "House",
];
const DEFAULT_FURNISHING_OPTIONS = ["Furnished", "Semi-furnished", "Unfurnished"];
const DEFAULT_LOCATION_OPTIONS = ["Athens", "Milan", "Thessaloniki", "Chania", "Rome"];

function mergeOptions(defaults: string[], dynamic: string[]): string[] {
  return [...new Set([...defaults, ...dynamic])]
    .filter((v) => typeof v === "string" && v.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export default function BoostPropertiesPage() {
  const { token } = useAuthStore();

  const [properties, setProperties]       = useState<Property[]>([]);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);

  const [searchTerm, setSearchTerm]       = useState("");
  const [searchFilter, setSearchFilter]   = useState<"boostid" | "vsid">("boostid");
  const [sortBy, setSortBy]               = useState<"reboostedFirst" | "createdFirst">("createdFirst");

  const [createdBy, setCreatedBy]         = useState<EmployeeInterface[]>([]);
  const [createdByValue, setCreatedByValue] = useState("All");
  const [propertyTypeValue, setPropertyTypeValue] = useState("All");
  const [locationValue, setLocationValue] = useState("All");
  const [furnishingValue, setFurnishingValue] = useState("All");
  const [date, setDate]                   = useState<DateRange | undefined>(undefined);

  const [propertyTypeOptions, setPropertyTypeOptions] = useState<string[]>(
    mergeOptions(DEFAULT_PROPERTY_TYPE_OPTIONS, [])
  );
  const [locationOptions, setLocationOptions] = useState<string[]>(
    mergeOptions(DEFAULT_LOCATION_OPTIONS, [])
  );
  const [furnishingOptions, setFurnishingOptions] = useState<string[]>(
    mergeOptions(DEFAULT_FURNISHING_OPTIONS, [])
  );

  const [reboostingIds, setReboostingIds] = useState<Set<string>>(new Set());
  const [reboostedIds, setReboostedIds]   = useState<Set<string>>(new Set());

  const isRecentlyReboosted = (lastReboostedAt?: string) => {
    if (!lastReboostedAt) return false;
    return new Date(lastReboostedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  };

  const fetchProperties = async (targetPage: number) => {
    try {
      setLoading(true);
      const res = await axios.get("/api/propertyBoost", {
        params: {
          page: targetPage,
          limit: PAGE_SIZE,
          sort: sortBy === "createdFirst" ? "-createdAt" : "-lastReboostedAt",
          createdBy: createdByValue,
          propertyType: propertyTypeValue,
          propertyLocation: locationValue,
          furnishingStatus: furnishingValue,
          dateFrom: date?.from?.toISOString(),
          dateTo: date?.to?.toISOString(),
        },
      });
      const data = res.data;
      setProperties(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.totalPages ?? Math.max(1, Math.ceil(data.totalProperties / PAGE_SIZE)));
      setTotalProperties(data.totalProperties ?? 0);

      const fo = data?.filterOptions;
      if (fo) {
        setPropertyTypeOptions(mergeOptions(DEFAULT_PROPERTY_TYPE_OPTIONS, fo.propertyTypes ?? []));
        setLocationOptions(mergeOptions(DEFAULT_LOCATION_OPTIONS, fo.locations ?? []));
        setFurnishingOptions(mergeOptions(DEFAULT_FURNISHING_OPTIONS, fo.furnishingStatuses ?? []));
      }
    } catch (err) {
      console.error("Failed to fetch properties", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    axios.get("/api/employee/getSalesEmployee")
      .then((r) => setCreatedBy(r.data.emp ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [createdByValue, propertyTypeValue, locationValue, furnishingValue, date?.from, date?.to, sortBy]);

  useEffect(() => {
    fetchProperties(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, createdByValue, propertyTypeValue, locationValue, furnishingValue, date, sortBy]);

  const handleReboost = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setReboostingIds((prev) => new Set(prev).add(propertyId));
    try {
      const response = await axios.post(`/api/propertyBoost/${propertyId}/reboost`);
      setProperties((prev) =>
        prev.map((p) =>
          p._id === propertyId
            ? { ...p, lastReboostedAt: response.data.lastReboostedAt ?? new Date().toISOString() }
            : p
        )
      );
      await fetchProperties(page);
      setTimeout(() => {
        setReboostingIds((prev) => { const s = new Set(prev); s.delete(propertyId); return s; });
        setReboostedIds((prev) => new Set(prev).add(propertyId));
      }, 1000);
    } catch (error) {
      console.error("Failed to reboost property:", error);
      setReboostingIds((prev) => { const s = new Set(prev); s.delete(propertyId); return s; });
    }
  };

  const filteredProperties = properties.filter((p) => {
    const q = searchTerm.toLowerCase();
    return searchFilter === "boostid"
      ? p.BoostID.toLowerCase().includes(q)
      : p.vsid?.toLowerCase().includes(q);
  });

  const canReboost = token?.role === "SuperAdmin" || token?.role === "Sales";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Boosted Properties</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${totalProperties} propert${totalProperties === 1 ? "y" : "ies"}`}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search type */}
          <Select
            value={searchFilter}
            onValueChange={(v: "boostid" | "vsid") => setSearchFilter(v)}
          >
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boostid">Boost ID</SelectItem>
              <SelectItem value="vsid">VSID</SelectItem>
            </SelectContent>
          </Select>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search by ${searchFilter === "boostid" ? "Boost ID" : "VSID"}…`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-8 text-sm w-48"
            />
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v: "reboostedFirst" | "createdFirst") => setSortBy(v)}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Sort by…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reboostedFirst">Reboosted first</SelectItem>
              <SelectItem value="createdFirst">Created first</SelectItem>
            </SelectContent>
          </Select>

          {/* Created by */}
          <Select value={createdByValue} onValueChange={setCreatedByValue}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Created by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All agents</SelectItem>
              {createdBy.map((emp) => (
                <SelectItem key={emp._id} value={emp.name}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Property type */}
          <Select value={propertyTypeValue} onValueChange={setPropertyTypeValue}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All types</SelectItem>
              {propertyTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location */}
          <Select value={locationValue} onValueChange={setLocationValue}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All locations</SelectItem>
              {locationOptions.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Furnishing */}
          <Select value={furnishingValue} onValueChange={setFurnishingValue}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Furnishing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All furnishing</SelectItem>
              {furnishingOptions.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <DateRangePicker date={date} setDate={setDate} className="h-9" />

          {/* Clear filters */}
          {(createdByValue !== "All" || propertyTypeValue !== "All" || locationValue !== "All" || furnishingValue !== "All" || date) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCreatedByValue("All");
                setPropertyTypeValue("All");
                setLocationValue("All");
                setFurnishingValue("All");
                setDate(undefined);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Result info */}
        {searchTerm && !loading && (
          <p className="text-xs text-muted-foreground">
            {filteredProperties.length} result{filteredProperties.length !== 1 ? "s" : ""} for &quot;{searchTerm}&quot;
          </p>
        )}

        {/* List */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Loading properties…</span>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Rocket className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No properties found</p>
              <p className="text-xs">
                {searchTerm ? `No results for "${searchTerm}"` : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredProperties.map((prop) => {
                const isReboosting        = reboostingIds.has(prop._id);
                const isReboosted         = reboostedIds.has(prop._id);
                const wasRecentlyReboosted = isRecentlyReboosted(prop.lastReboostedAt);
                const boosted             = isReboosted || wasRecentlyReboosted;

                return (
                  <div
                    key={prop._id}
                    className={cn(
                      "group transition-colors",
                      boosted && "bg-green-50 dark:bg-green-950/20",
                      isReboosting && "bg-primary/5",
                      !boosted && !isReboosting && "hover:bg-muted/40"
                    )}
                  >
                    <Link href={`list/${prop._id}`} className="flex items-center gap-4 px-4 py-3">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        <img
                          src={prop.images[0] ?? "/placeholder.svg"}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* IDs */}
                      <div className="flex flex-col gap-1 flex-shrink-0 w-24">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                          <Rocket className="h-2.5 w-2.5" />
                          {prop.BoostID}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold border border-border">
                          <Info className="h-2.5 w-2.5" />
                          {prop.vsid}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {prop.title}
                        </h3>
                        {prop.location && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {prop.location}
                          </p>
                        )}
                      </div>

                      {/* Created by */}
                      <div className="flex-shrink-0 w-28 hidden sm:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Agent</p>
                        <p className="text-xs font-medium text-foreground truncate">{prop.createdBy}</p>
                      </div>

                      {/* Date */}
                      <div className="flex-shrink-0 w-24 hidden md:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {prop.lastReboostedAt ? "Reboosted" : "Posted"}
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          {new Date(prop.lastReboostedAt ?? prop.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Reboost */}
                      {canReboost && (
                        <div className="flex-shrink-0" onClick={(e) => e.preventDefault()}>
                          <Button
                            variant={boosted ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => handleReboost(e, prop._id)}
                            disabled={isReboosting || wasRecentlyReboosted}
                            className={cn(
                              "h-8 text-xs min-w-[88px] transition-all duration-300",
                              boosted && "bg-green-500 hover:bg-green-600 border-green-500 text-white"
                            )}
                          >
                            {isReboosting ? (
                              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Boosting</>
                            ) : boosted ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1.5" />Boosted</>
                            ) : (
                              <><Rocket className="h-3 w-3 mr-1.5" />Reboost</>
                            )}
                          </Button>
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &middot; {totalProperties} total
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
