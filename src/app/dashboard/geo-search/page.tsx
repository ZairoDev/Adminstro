"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Autocomplete,
  Circle,
  GoogleMap,
  InfoWindow,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Search } from "lucide-react";

import { useAuthStore } from "@/AuthStore";
import PaginationControls from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilterBar, { type FiltersInterfaces } from "@/app/spreadsheet/FilterBar";
import { SpreadsheetTable } from "@/app/spreadsheet/spreadsheetTable";
import axios from "@/util/axios";
import type { unregisteredOwners } from "@/util/type";

const LIBRARIES: "places"[] = ["places"];
const DEFAULT_LIMIT = 50;
const MAX_FIT_ZOOM = 14;

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "500px",
};

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };

interface LatLng {
  lat: number;
  lng: number;
}

interface SearchCenter extends LatLng {
  label: string;
}

const CIRCLE_OPTIONS = {
  fillColor: "#3b82f6",
  fillOpacity: 0.07,
  strokeColor: "#3b82f6",
  strokeOpacity: 0.5,
  strokeWeight: 1.5,
};

interface NearbyResponse {
  count: number;
  radiusMeters: number;
  mapData: unregisteredOwners[];
  tableData: unregisteredOwners[];
  total: number;
  availableCount: number;
  notAvailableCount: number;
  meta?: string;
}

function markerSymbol(
  googleRef: typeof google | undefined,
  availability: string,
  selected: boolean,
): google.maps.Symbol | undefined {
  if (!googleRef) {
    return undefined;
  }
  const isAvailable = availability === "Available";
  return {
    path: googleRef.maps.SymbolPath.CIRCLE,
    scale: selected ? 8 : 6,
    fillColor: isAvailable ? "#16a34a" : "#dc2626",
    fillOpacity: 1,
    strokeColor: selected ? "#1d4ed8" : "#ffffff",
    strokeWeight: selected ? 3 : 2,
  };
}

export default function GeoSearchPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const token = useAuthStore((state) => state.token);
  const mapRef = useRef<google.maps.Map | null>(null);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const hasSearchedRef = useRef(false);
  const requestLockRef = useRef(false);

  const allocations = token?.allotedArea || [];
  const parsedAllocations =
    typeof allocations === "string"
      ? allocations.split(",").filter(Boolean)
      : allocations;

  const [searchCenter, setSearchCenter] = useState<SearchCenter | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(10);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [tableData, setTableData] = useState<unregisteredOwners[]>([]);
  const [mapData, setMapData] = useState<unregisteredOwners[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"available" | "notAvailable">(
    "available",
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [notAvailableCount, setNotAvailableCount] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [filters, setFilters] = useState<FiltersInterfaces>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    place:
      parsedAllocations.length === 1
        ? [parsedAllocations[0]]
        : parsedAllocations.length > 1
          ? parsedAllocations
          : [],
    area: [],
    zone: "",
    metroZone: "",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    dateRange: undefined,
    isImportant: false,
    isPinned: false,
    sortByPrice: "",
  });
  const geoHiddenColumns = useMemo(
    () => ["availability", "petStatus", "remarks", "upload"],
    [],
  );

  const applyCenter = useCallback((lat: number, lng: number, label: string) => {
    setSearchCenter({ lat, lng, label });
    setMapCenter({ lat, lng });
    setMapZoom(11);
    setSelectedId(null);
  }, []);

  const fitMapToResults = useCallback(
    (center: SearchCenter, owners: unregisteredOwners[]) => {
      if (!isLoaded || !mapRef.current || typeof google === "undefined") {
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: center.lat, lng: center.lng });

      const latDelta = radiusMeters / 111320;
      const lngDenominator = Math.max(
        Math.cos((center.lat * Math.PI) / 180),
        0.01,
      );
      const lngDelta = radiusMeters / (111320 * lngDenominator);
      bounds.extend({ lat: center.lat + latDelta, lng: center.lng + lngDelta });
      bounds.extend({ lat: center.lat - latDelta, lng: center.lng - lngDelta });

      owners.forEach((owner) => {
        if (!owner.locationGeo?.coordinates) {
          return;
        }
        const [lng, lat] = owner.locationGeo.coordinates;
        bounds.extend({ lat, lng });
      });

      mapRef.current.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        const zoom = mapRef.current?.getZoom();
        if (typeof zoom === "number" && zoom > MAX_FIT_ZOOM) {
          mapRef.current?.setZoom(MAX_FIT_ZOOM);
        }
      });
    },
    [isLoaded, radiusMeters],
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      applyCenter(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    },
    [applyCenter],
  );

  const handleAutocompleteLoad = useCallback(
    (ac: google.maps.places.Autocomplete) => {
      autocompleteRef.current = ac;
    },
    [],
  );

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    applyCenter(
      lat,
      lng,
      place.formatted_address ?? place.name ?? `${lat}, ${lng}`,
    );
  }, [applyCenter]);

  const fetchGeoData = useCallback(
    async (
      nextPage: number,
      nextTab: "available" | "notAvailable",
      nextLimit: number,
      nextFocusOwnerId?: string,
    ) => {
      if (!searchCenter || requestLockRef.current) {
        return;
      }
      requestLockRef.current = true;
      setIsSearching(true);
      setError(null);

      try {
        const effectiveFilters = { ...filters };
        if (
          parsedAllocations.length > 0 &&
          effectiveFilters.place.length === 0
        ) {
          effectiveFilters.place = parsedAllocations;
        }

        const response = await axios.post<NearbyResponse>(
          "/api/unregisteredOwners/nearby",
          {
            lat: searchCenter.lat,
            lng: searchCenter.lng,
            radiusMeters,
            page: nextPage,
            limit: nextLimit,
            selectedTab: nextTab,
            statusMode: "both",
            focusOwnerId: nextFocusOwnerId,
            filters: effectiveFilters,
          },
        );

        setMapData(
          Array.isArray(response.data.mapData) ? response.data.mapData : [],
        );
        setTableData(
          Array.isArray(response.data.tableData) ? response.data.tableData : [],
        );
        setTotal(response.data.total || 0);
        setAvailableCount(response.data.availableCount || 0);
        setNotAvailableCount(response.data.notAvailableCount || 0);

        fitMapToResults(
          searchCenter,
          Array.isArray(response.data.mapData) ? response.data.mapData : [],
        );
      } catch {
        setError("Search failed. Please try again.");
        setMapData([]);
        setTableData([]);
      } finally {
        setIsSearching(false);
        requestLockRef.current = false;
      }
    },
    [filters, fitMapToResults, parsedAllocations, radiusMeters, searchCenter],
  );

  const handleSearch = useCallback(async () => {
    if (!searchCenter) {
      return;
    }
    setHasSearched(true);
    hasSearchedRef.current = true;
    setPage(1);
    setSelectedId(null);
    await fetchGeoData(1, selectedTab, limit);
  }, [fetchGeoData, limit, searchCenter, selectedTab]);

  useEffect(() => {
    if (!hasSearchedRef.current || !searchCenter) {
      return;
    }
    fetchGeoData(page, selectedTab, limit);
  }, [
    fetchGeoData,
    filters,
    limit,
    page,
    radiusMeters,
    searchCenter,
    selectedTab,
  ]);

  const handleRowClick = useCallback(
    (owner: unregisteredOwners) => {
      const nextId = selectedId === owner._id ? null : owner._id;
      setSelectedId(nextId);
      setFocusRowId(owner._id);
      if (nextId && owner.locationGeo?.coordinates) {
        const [lng, lat] = owner.locationGeo.coordinates;
        mapRef.current?.panTo({ lat, lng });
      }
    },
    [selectedId],
  );

  const handleMarkerClick = useCallback(
    async (owner: unregisteredOwners) => {
      setSelectedId(owner._id);
      setFocusRowId(owner._id);

      if (owner.locationGeo?.coordinates) {
        const [lng, lat] = owner.locationGeo.coordinates;
        mapRef.current?.panTo({ lat, lng });
      }

      const ownerTab: "available" | "notAvailable" =
        owner.availability === "Available" ? "available" : "notAvailable";

      if (selectedTab !== ownerTab) {
        setSelectedTab(ownerTab);
      } 
      setPage(1);

      if (hasSearchedRef.current) {
        await fetchGeoData(1, ownerTab, limit, owner._id);
      }

      setTimeout(() => {
        tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    },
    [fetchGeoData, limit, selectedTab],
  );

  const selectedOwner = mapData.find((r) => r._id === selectedId);
  const serialOffset = (page - 1) * limit;
  const centerMarkerIcon = useMemo(() => {
    if (typeof google === "undefined") {
      return undefined;
    }
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#2563eb",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    } as google.maps.Symbol;
  }, []);

  const onAvailabilityChange = useCallback(() => {
    if (!hasSearchedRef.current) {
      return;
    }
    fetchGeoData(page, selectedTab, limit);
  }, [fetchGeoData, limit, page, selectedTab]);

  return (
    <div className="max-w-[90vw] overflow-x-hidden space-y-4 w-full px-2 sm:px-4">
      <div className="flex items-center justify-between mb-2">
        <Link
          href="/spreadsheet"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold">Geo Search</h1>
        </div>
        <div className="w-[70px]" />
      </div>

      <div className=" overflow-x-hidden border rounded-lg p-3 sm:p-4 bg-background shadow-sm space-y-3">
        <p className="text-sm text-muted-foreground">
          Type an address in the box below{" "}
          <span className="font-medium">or click anywhere on the map</span> to
          pin your search center. Then pick a radius and hit Search.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {isLoaded ? (
            <Autocomplete
              onLoad={handleAutocompleteLoad}
              onPlaceChanged={handlePlaceChanged}
              className="flex-1"
            >
              <Input
                placeholder="Search address, area, landmark…"
                className="w-full"
                aria-label="Location search"
              />
            </Autocomplete>
          ) : (
            <Input placeholder="Loading maps…" disabled className="flex-1" />
          )}

          <Input
            type="number"
            min={100}
            max={50000}
            step={100}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value || 5000))}
            className="w-full sm:w-[130px]"
            aria-label="Radius in meters"
          />

          <Button
            onClick={handleSearch}
            disabled={!searchCenter || isSearching}
            className="w-full sm:w-auto"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>

        {searchCenter && (
          <p className="text-xs text-muted-foreground flex items-start sm:items-center gap-1.5">
            <Navigation className="w-3 h-3 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">
              <span className="font-medium">Center:</span> {searchCenter.label}{" "}
              | Radius: {radiusMeters}m
            </span>
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="rounded-lg overflow-hidden border shadow-sm">
        {isLoaded ? (
          <GoogleMap
            onLoad={(instance) => {
              mapRef.current = instance;
            }}
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={mapZoom}
            onClick={handleMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              zoomControl: true,
              clickableIcons: false,
              minZoom: 3,
              maxZoom: 17,
            }}
          >
            {searchCenter && (
              <Circle
                center={{ lat: searchCenter.lat, lng: searchCenter.lng }}
                radius={radiusMeters}
                options={CIRCLE_OPTIONS}
              />
            )}

            {searchCenter && (
              <Marker
                position={{ lat: searchCenter.lat, lng: searchCenter.lng }}
                icon={centerMarkerIcon}
                title="Search center"
                zIndex={1000}
              />
            )}

            {mapData.map((owner) => {
              if (!owner.locationGeo?.coordinates) return null;
              const [lng, lat] = owner.locationGeo.coordinates;
              return (
                <Marker
                  key={owner._id}
                  position={{ lat, lng }}
                  icon={markerSymbol(
                    typeof google === "undefined" ? undefined : google,
                    owner.availability,
                    selectedId === owner._id,
                  )}
                  title={owner.name || owner.address || "Property"}
                  onClick={() => {
                    void handleMarkerClick(owner);
                  }}
                  zIndex={selectedId === owner._id ? 500 : 100}
                />
              );
            })}

            {selectedOwner?.locationGeo?.coordinates && (
              <InfoWindow
                position={{
                  lat: selectedOwner.locationGeo.coordinates[1],
                  lng: selectedOwner.locationGeo.coordinates[0],
                }}
                onCloseClick={() => setSelectedId(null)}
              >
                <div className="text-sm space-y-1 max-w-[220px] pr-1">
                  <p className="font-semibold leading-tight">
                    {selectedOwner.name || "Unnamed"}
                  </p>
                  {selectedOwner.address && (
                    <p className="text-xs text-gray-500 leading-snug">
                      {selectedOwner.address}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    {[selectedOwner.propertyType, selectedOwner.area]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {selectedOwner.price && selectedOwner.price !== "0" && (
                    <p className="text-xs font-semibold text-green-700">
                      {selectedOwner.price}
                    </p>
                  )}
                  <span
                    className={`inline-block text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                      selectedOwner.availability === "Available"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedOwner.availability}
                  </span>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="h-[500px] flex items-center justify-center bg-muted text-muted-foreground text-sm">
            Loading map…
          </div>
        )}
      </div>

      {hasSearched && (
        <div ref={tableSectionRef} className="w-full">
        <Tabs
          value={selectedTab}
          onValueChange={(value) => {
            setSelectedTab(value as "available" | "notAvailable");
            setPage(1);
          }}
          className="relative flex flex-col min-h-[80vh] border rounded-lg shadow-sm bg-background overflow-hidden"
        >
          <div className="flex-1 px-2 pb-20 overflow-y-auto">
            <TabsContent value="available" className="h-full mt-0">
              <div className="overflow-x-auto">
                <FilterBar
                  filters={filters}
                  setFilters={setFilters}
                  selectedTab={selectedTab}
                />
              </div>
              <div className="overflow-x-auto">
                <SpreadsheetTable
                  tableData={tableData}
                  setTableData={setTableData}
                  {...({ serialOffset } as { serialOffset: number })}
                  hiddenColumns={geoHiddenColumns}
                  focusRowId={focusRowId}
                  onAvailabilityChange={onAvailabilityChange}
                />
              </div>
              {isSearching && <p className="text-center mt-4">Loading...</p>}
              {!isSearching && total === 0 && (
                <p className="text-center text-muted-foreground my-2">
                  No records found
                </p>
              )}
            </TabsContent>

            <TabsContent value="notAvailable" className="h-full mt-0">
              <div className="overflow-x-auto">
                <FilterBar
                  filters={filters}
                  setFilters={setFilters}
                  selectedTab={selectedTab}
                />
              </div>
              <div className="overflow-x-auto">
                <SpreadsheetTable
                  tableData={tableData}
                  setTableData={setTableData}
                  {...({ serialOffset } as { serialOffset: number })}
                  hiddenColumns={geoHiddenColumns}
                  focusRowId={focusRowId}
                  onAvailabilityChange={onAvailabilityChange}
                />
              </div>
              {isSearching && <p className="text-center mt-4">Loading...</p>}
              {!isSearching && total === 0 && (
                <p className="text-center text-muted-foreground my-2">
                  No records found
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Rows per page:
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setLimit(next);
                      setPage(1);
                    }}
                    className="border rounded px-2 py-1 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Rows per page"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t bg-muted/40 px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <TabsList className="flex gap-2 bg-transparent w-full sm:w-auto overflow-x-auto">
              <TabsTrigger
                value="available"
                className="flex-1 sm:flex-none rounded-t-md px-3 sm:px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-background/70 whitespace-nowrap"
              >
                Available{" "}
                <span className="ml-1 text-muted-foreground">
                  ({availableCount})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="notAvailable"
                className="flex-1 sm:flex-none rounded-t-md px-3 sm:px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary hover:bg-background/70 whitespace-nowrap"
              >
                Not Available{" "}
                <span className="ml-1 text-muted-foreground">
                  ({notAvailableCount})
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center justify-center sm:justify-end">
              <PaginationControls
                currentPage={page}
                total={total}
                pageSize={limit}
                onPageChange={(nextPage) => setPage(nextPage)}
                isLoading={isSearching}
              />
            </div>
          </div>
        </Tabs>
        </div>
      )}
    </div>
  );
}
