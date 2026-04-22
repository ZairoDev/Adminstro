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
  Polygon,
  Polyline,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import debounce from "lodash.debounce";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Search } from "lucide-react";

import { useAuthStore } from "@/AuthStore";
import PaginationControls from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilterBar, { type FiltersInterfaces } from "@/app/spreadsheet/FilterBar";
import { SpreadsheetTable } from "@/app/spreadsheet/spreadsheetTable";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "@/util/axios";
import type { unregisteredOwners } from "@/util/type";

const LIBRARIES: "places"[] = ["places"];
const DEFAULT_LIMIT = 50;
const MAX_FIT_ZOOM = 14;
const DEFAULT_RADIUS_METERS = 5000;
const DEFAULT_CORRIDOR_WIDTH_METERS = 2000;
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  minZoom: 3,
  maxZoom: 17,
};

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
type SearchMode = "radius" | "corridor";
type TableTab = "available" | "notAvailable";
type MapAvailabilityMode = "both" | "available" | "notAvailable";
type GeoOwner = unregisteredOwners & {
  distanceFromDestinationMeters?: number;
};

const CIRCLE_OPTIONS = {
  fillColor: "#3b82f6",
  fillOpacity: 0.07,
  strokeColor: "#3b82f6",
  strokeOpacity: 0.5,
  strokeWeight: 1.5,
};

interface NearbyResponse {
  count: number;
  mode: SearchMode;
  radiusMeters: number;
  corridorWidthMeters?: number;
  originToDestinationMeters?: number;
  mapData: GeoOwner[];
  tableData: GeoOwner[];
  total: number;
  availableCount: number;
  notAvailableCount: number;
  meta?: string;
}

const CORRIDOR_POLYGON_OPTIONS: google.maps.PolygonOptions = {
  fillColor: "#0ea5e9",
  fillOpacity: 0.08,
  strokeColor: "#0284c7",
  strokeOpacity: 0.5,
  strokeWeight: 1.5,
};

const CORRIDOR_POLYLINE_OPTIONS: google.maps.PolylineOptions = {
  strokeColor: "#0369a1",
  strokeOpacity: 0.95,
  strokeWeight: 2,
};

// Zoom tier buckets match the server's zoomToMapCap ladder so that small
// zoom nudges within a tier never trigger a refetch.
function zoomTier(zoom: number): number {
  if (zoom <= 8) return 1;
  if (zoom <= 10) return 2;
  if (zoom <= 12) return 3;
  if (zoom <= 14) return 4;
  return 5;
}

// Marker augmented with cached presentation state so we can skip
// setIcon/setZIndex when nothing changed.
type OwnerMarker = google.maps.Marker & {
  __selected?: boolean;
  __availability?: string;
};

function markerSymbol(
  availability: string,
  selected: boolean,
): google.maps.Symbol | undefined {
  if (typeof google === "undefined") {
    return undefined;
  }
  const isAvailable = availability === "Available";
  return {
    path: google.maps.SymbolPath.CIRCLE,
    // Slightly smaller selected delta keeps nearby points easier to hover
    // without large overlap, while still making selection obvious.
    scale: selected ? 7 : 5.5,
    fillColor: isAvailable ? "#16a34a" : "#dc2626",
    fillOpacity: 1,
    strokeColor: selected ? "#f59e0b" : "#ffffff",
    strokeWeight: selected ? 2.5 : 1.8,
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeRadians(value: number): number {
  return ((value + Math.PI) % (2 * Math.PI)) - Math.PI;
}

function haversineDistanceMeters(origin: LatLng, destination: LatLng): number {
  const earthRadius = 6_378_100;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(destination.lng - origin.lng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function computeBearing(origin: LatLng, destination: LatLng): number {
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return Math.atan2(y, x);
}

function destinationPoint(origin: LatLng, bearingRad: number, distanceMeters: number): LatLng {
  const earthRadius = 6_378_100;
  const angularDistance = distanceMeters / earthRadius;
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);
  const lat2 = Math.asin(
    sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2),
    );
  return {
    lat: toDegrees(lat2),
    lng: toDegrees(normalizeRadians(lng2)),
  };
}

function buildCorridorPolygon(
  origin: LatLng,
  destination: LatLng,
  halfWidthMeters: number,
): LatLng[] {
  const forwardBearing = computeBearing(origin, destination);
  const leftBearing = forwardBearing - Math.PI / 2;
  const rightBearing = forwardBearing + Math.PI / 2;
  const originLeft = destinationPoint(origin, leftBearing, halfWidthMeters);
  const originRight = destinationPoint(origin, rightBearing, halfWidthMeters);
  const destinationLeft = destinationPoint(destination, leftBearing, halfWidthMeters);
  const destinationRight = destinationPoint(destination, rightBearing, halfWidthMeters);
  return [originLeft, destinationLeft, destinationRight, originRight];
}

function formatDistanceKm(distanceMeters: number | undefined): string {
  if (!distanceMeters || !Number.isFinite(distanceMeters)) {
    return "-";
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

interface GeoInfoCardProps {
  name?: string;
  address?: string;
  propertyType?: string;
  area?: string;
  price?: string;
  availability?: string;
  distanceFromDestinationMeters?: number;
  showDestinationDistance: boolean;
}

const GeoInfoCard = React.memo(function GeoInfoCard({
  name,
  address,
  propertyType,
  area,
  price,
  availability,
  distanceFromDestinationMeters,
  showDestinationDistance,
}: GeoInfoCardProps) {
  const displayName = name?.trim() || address?.trim() || "Unnamed property";

  return (
    <div className="text-sm space-y-1 max-w-[220px] pr-1">
      <p className="font-semibold leading-tight">{displayName}</p>
      {address && (
        <p className="text-xs text-gray-500 leading-snug">{address}</p>
      )}
      <p className="text-xs text-gray-600">
        {[propertyType, area].filter(Boolean).join(" \u00b7 ")}
      </p>
      {price && price !== "0" && (
        <p className="text-xs font-semibold text-green-700">{price}</p>
      )}
      {showDestinationDistance && (
        <p className="text-xs text-slate-600">
          Distance from destination:{" "}
          {formatDistanceKm(distanceFromDestinationMeters)}
        </p>
      )}
      <span
        className={`inline-block text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
          availability === "Available"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {availability}
      </span>
    </div>
  );
});

export default function GeoSearchPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const token = useAuthStore((state) => state.token);
  const mapRef = useRef<google.maps.Map | null>(null);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
    null,
  );
  const clusterRef = useRef<MarkerClusterer | null>(null);
  const ownerMarkersRef = useRef<Map<string, OwnerMarker>>(new Map());
  const ownerMarkerListenersRef = useRef<
    Map<string, google.maps.MapsEventListener[]>
  >(new Map());
  const activePointRef = useRef<"origin" | "destination">("origin");
  const hasSearchedRef = useRef(false);
  const requestLockRef = useRef(false);
  const isNewSearchRef = useRef(false);
  const isFittingRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const handleMarkerClickRef = useRef<(owner: GeoOwner) => void>(() => {});
  const currentTierRef = useRef<number>(zoomTier(10));
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const allocations = token?.allotedArea || [];
  const parsedAllocations =
    typeof allocations === "string"
      ? allocations.split(",").filter(Boolean)
      : allocations;

  const [searchMode, setSearchMode] = useState<SearchMode>("radius");
  const [origin, setOrigin] = useState<SearchCenter | null>(null);
  const [destination, setDestination] = useState<SearchCenter | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
  const [corridorWidthMeters, setCorridorWidthMeters] = useState(
    DEFAULT_CORRIDOR_WIDTH_METERS,
  );
  const [originToDestinationMeters, setOriginToDestinationMeters] = useState<
    number | null
  >(null);
  const [tableData, setTableData] = useState<GeoOwner[]>([]);
  const [mapData, setMapData] = useState<GeoOwner[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TableTab>("available");
  const [mapAvailabilityMode, setMapAvailabilityMode] =
    useState<MapAvailabilityMode>("both");
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

  const ownerById = useMemo(() => {
    const ownerMap = new Map<string, GeoOwner>();
    mapData.forEach((owner) => {
      ownerMap.set(owner._id, owner);
    });
    return ownerMap;
  }, [mapData]);

  const applyOrigin = useCallback((lat: number, lng: number, label: string) => {
    setOrigin({ lat, lng, label });
    setSelectedId(null);
    setHoveredId(null);
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(11);
  }, []);

  const applyDestination = useCallback((lat: number, lng: number, label: string) => {
    setDestination({ lat, lng, label });
    setSelectedId(null);
    setHoveredId(null);
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(11);
  }, []);

  const hoveredOwner = hoveredId ? ownerById.get(hoveredId) ?? null : null;
  // Kept in scope so the selected-marker icon diff can still read selectedId
  // via ref, but the InfoWindow itself no longer falls back to selection.
  // This prevents the card from feeling "stuck" after a click and ensures
  // hovering a different marker cleanly replaces the displayed card.
  const activeInfoOwner = hoveredOwner;

  // Deterministic jitter for markers that share identical coordinates
  // (common when several listings live at the same building/address).
  // Without this, zooming past the cluster max simply shows one pin on top
  // of others and the cluster appears to "lose" members.
  const displayPositions = useMemo(() => {
    const positions = new Map<string, { lat: number; lng: number }>();
    const groups = new Map<string, string[]>();

    mapData.forEach((owner) => {
      const coords = owner.locationGeo?.coordinates;
      if (!coords || coords.length !== 2) {
        return;
      }
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const key = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(owner._id);
      groups.set(key, bucket);
    });

    // Stable sort so the jittered position for a given _id does not shift
    // between renders when the server returns results in a different order.
    groups.forEach((bucket) => bucket.sort());

    mapData.forEach((owner) => {
      const coords = owner.locationGeo?.coordinates;
      if (!coords || coords.length !== 2) {
        return;
      }
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const key = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      const bucket = groups.get(key);
      if (!bucket || bucket.length <= 1) {
        positions.set(owner._id, { lat, lng });
        return;
      }
      const idx = bucket.indexOf(owner._id);
      // ~25 m radius -> visually separable at zoom >= 16, while staying
      // inside the same building footprint so the position still reads
      // as accurate.
      const radius = 0.00022;
      const angle = (2 * Math.PI * idx) / bucket.length;
      positions.set(owner._id, {
        lat: lat + Math.cos(angle) * radius,
        lng: lng + Math.sin(angle) * radius,
      });
    });

    return positions;
  }, [mapData]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

  // Two separate debounces keep open/close independent so a fast user
  // hover-and-release doesn't leave an orphan InfoWindow.
  const openHoverDebounced = useMemo(
    () =>
      debounce((ownerId: string) => {
        setHoveredId(ownerId);
      }, 90),
    [],
  );

  const closeHoverDebounced = useMemo(
    () =>
      debounce((ownerId: string) => {
        setHoveredId((current) => (current === ownerId ? null : current));
      }, 220),
    [],
  );

  useEffect(() => {
    return () => {
      openHoverDebounced.cancel();
      closeHoverDebounced.cancel();
    };
  }, [openHoverDebounced, closeHoverDebounced]);

  const fitMapToResults = useCallback(
    (
      center: SearchCenter,
      owners: GeoOwner[],
      destinationPoint: SearchCenter | null,
    ) => {
      if (!mapRef.current || typeof google === "undefined") {
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: center.lat, lng: center.lng });

      if (searchMode === "radius") {
        const latDelta = radiusMeters / 111320;
        const lngDenominator = Math.max(
          Math.cos((center.lat * Math.PI) / 180),
          0.01,
        );
        const lngDelta = radiusMeters / (111320 * lngDenominator);
        bounds.extend({ lat: center.lat + latDelta, lng: center.lng + lngDelta });
        bounds.extend({ lat: center.lat - latDelta, lng: center.lng - lngDelta });
      } else if (destinationPoint) {
        bounds.extend({ lat: destinationPoint.lat, lng: destinationPoint.lng });
        const corridor = buildCorridorPolygon(
          center,
          destinationPoint,
          corridorWidthMeters / 2,
        );
        corridor.forEach((point) => bounds.extend(point));
      }

      owners.forEach((owner) => {
        if (!owner.locationGeo?.coordinates) {
          return;
        }
        const [lng, lat] = owner.locationGeo.coordinates;
        bounds.extend({ lat, lng });
      });

      isFittingRef.current = true;
      mapRef.current.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        const zoom = mapRef.current?.getZoom();
        if (typeof zoom === "number" && zoom > MAX_FIT_ZOOM) {
          mapRef.current?.setZoom(MAX_FIT_ZOOM);
        }
        const settledZoom = mapRef.current?.getZoom();
        if (typeof settledZoom === "number") {
          currentTierRef.current = zoomTier(settledZoom);
        }
        isFittingRef.current = false;
      });
    },
    [corridorWidthMeters, radiusMeters, searchMode],
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (searchMode === "corridor") {
        if (!origin || activePointRef.current === "origin") {
          applyOrigin(lat, lng, label);
          activePointRef.current = "destination";
        } else {
          applyDestination(lat, lng, label);
          activePointRef.current = "origin";
        }
        return;
      }
      applyOrigin(lat, lng, label);
    },
    [applyDestination, applyOrigin, origin, searchMode],
  );

  const handleOriginAutocompleteLoad = useCallback(
    (ac: google.maps.places.Autocomplete) => {
      originAutocompleteRef.current = ac;
    },
    [],
  );
  const handleDestinationAutocompleteLoad = useCallback(
    (ac: google.maps.places.Autocomplete) => {
      destinationAutocompleteRef.current = ac;
    },
    [],
  );

  const handleOriginPlaceChanged = useCallback(() => {
    const place = originAutocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    applyOrigin(
      lat,
      lng,
      place.formatted_address ?? place.name ?? `${lat}, ${lng}`,
    );
    activePointRef.current = "destination";
  }, [applyOrigin]);

  const handleDestinationPlaceChanged = useCallback(() => {
    const place = destinationAutocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    applyDestination(
      lat,
      lng,
      place.formatted_address ?? place.name ?? `${lat}, ${lng}`,
    );
    activePointRef.current = "origin";
  }, [applyDestination]);

  const fetchGeoData = useCallback(
    async (
      nextPage: number,
      nextTab: TableTab,
      nextLimit: number,
      nextFocusOwnerId?: string,
      options?: { mapOnly?: boolean },
    ) => {
      if (!origin || requestLockRef.current) {
        return;
      }
      if (searchMode === "corridor" && !destination) {
        setError("Select both origin and destination for corridor search.");
        return;
      }

      const mapOnly = options?.mapOnly ?? false;

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

        const currentZoom = mapRef.current?.getZoom() ?? 11;

        const response = await axios.post<NearbyResponse>(
          "/api/unregisteredOwners/nearby",
          {
            lat: origin.lat,
            lng: origin.lng,
            mode: searchMode,
            destination:
              searchMode === "corridor" && destination
                ? { lat: destination.lat, lng: destination.lng }
                : undefined,
            corridorWidthMeters,
            radiusMeters,
            page: nextPage,
            limit: nextLimit,
            selectedTab: nextTab,
            statusMode: mapAvailabilityMode,
            focusOwnerId: nextFocusOwnerId,
            zoom: Math.round(currentZoom),
            mapOnly,
            filters: effectiveFilters,
          },
        );

        const nextMapData = Array.isArray(response.data.mapData)
          ? response.data.mapData
          : [];

        setMapData(nextMapData);
        setOriginToDestinationMeters(response.data.originToDestinationMeters ?? null);
        setAvailableCount(response.data.availableCount || 0);
        setNotAvailableCount(response.data.notAvailableCount || 0);

        if (!mapOnly) {
          setTableData(
            Array.isArray(response.data.tableData) ? response.data.tableData : [],
          );
          setTotal(response.data.total || 0);
        }

        // Only fit bounds on an explicit new search. Pagination, filter,
        // zoom and tab refetches must not reset the viewport.
        if (isNewSearchRef.current && !mapOnly) {
          fitMapToResults(origin, nextMapData, destination);
          isNewSearchRef.current = false;
        }
      } catch {
        setError("Search failed. Please try again.");
        if (!mapOnly) {
          setMapData([]);
          setTableData([]);
          setOriginToDestinationMeters(null);
        }
      } finally {
        setIsSearching(false);
        requestLockRef.current = false;
      }
    },
    [
      corridorWidthMeters,
      destination,
      filters,
      fitMapToResults,
      origin,
      parsedAllocations,
      radiusMeters,
      searchMode,
      mapAvailabilityMode,
    ],
  );

  const handleSearch = useCallback(async () => {
    if (!origin) {
      return;
    }
    if (searchMode === "corridor" && !destination) {
      setError("Select both origin and destination for corridor search.");
      return;
    }
    setHasSearched(true);
    hasSearchedRef.current = true;
    isNewSearchRef.current = true;
    setPage(1);
    setSelectedId(null);
    setHoveredId(null);
    await fetchGeoData(1, selectedTab, limit);
  }, [destination, fetchGeoData, limit, origin, searchMode, selectedTab]);

  useEffect(() => {
    if (!hasSearchedRef.current || !origin) {
      return;
    }
    if (searchMode === "corridor" && !destination) {
      return;
    }
    fetchGeoData(page, selectedTab, limit);
  }, [
    corridorWidthMeters,
    destination,
    fetchGeoData,
    filters,
    limit,
    origin,
    page,
    radiusMeters,
    searchMode,
    selectedTab,
  ]);

  const handleRowClick = useCallback(
    (owner: GeoOwner) => {
      const nextId = selectedId === owner._id ? null : owner._id;
      setSelectedId(nextId);
      setHoveredId(null);
      setFocusRowId(owner._id);
      if (nextId) {
        const display =
          displayPositions.get(owner._id) ??
          (owner.locationGeo?.coordinates
            ? {
                lat: owner.locationGeo.coordinates[1],
                lng: owner.locationGeo.coordinates[0],
              }
            : null);
        if (display) {
          mapRef.current?.panTo(display);
        }
      }
    },
    [displayPositions, selectedId],
  );

  const handleMarkerClick = useCallback(
    async (owner: GeoOwner) => {
      setSelectedId(owner._id);
      // Keep the card visible for the clicked marker so the user gets
      // immediate feedback, but do not pin it: moving the cursor away
      // still closes it via the normal hover-close path.
      setHoveredId(owner._id);
      setFocusRowId(owner._id);

      const display =
        displayPositions.get(owner._id) ??
        (owner.locationGeo?.coordinates
          ? {
              lat: owner.locationGeo.coordinates[1],
              lng: owner.locationGeo.coordinates[0],
            }
          : null);
      if (display) {
        mapRef.current?.panTo(display);
      }

      const ownerTab: TableTab =
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
    [displayPositions, fetchGeoData, limit, selectedTab],
  );

  useEffect(() => {
    handleMarkerClickRef.current = handleMarkerClick;
  }, [handleMarkerClick]);

  const serialOffset = (page - 1) * limit;
  const originMarkerIcon = useMemo(() => {
    if (typeof google === "undefined") {
      return undefined;
    }
    return {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 5.8,
      fillColor: "#2563eb",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    } as google.maps.Symbol;
  }, []);

  const destinationMarkerIcon = useMemo(() => {
    if (typeof google === "undefined") {
      return undefined;
    }
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5.8,
      fillColor: "#7c3aed",
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

  const handleZoomChanged = useCallback(() => {
    const map = mapRef.current;
    if (!map || !hasSearchedRef.current) {
      return;
    }
    // Ignore idle events triggered by our own fitBounds and by in-flight
    // requests to prevent a refetch storm right after a new search.
    if (isFittingRef.current || requestLockRef.current) {
      return;
    }
    const nextZoom = map.getZoom();
    if (typeof nextZoom !== "number") {
      return;
    }
    const nextTier = zoomTier(nextZoom);
    if (nextTier === currentTierRef.current) {
      return;
    }
    currentTierRef.current = nextTier;
    void fetchGeoData(page, selectedTab, limit, undefined, { mapOnly: true });
  }, [fetchGeoData, limit, page, selectedTab]);

  const handleMapLoad = useCallback(
    (instance: google.maps.Map) => {
      mapRef.current = instance;
      instance.setOptions(MAP_OPTIONS);
      const initialZoom = instance.getZoom();
      if (typeof initialZoom === "number") {
        currentTierRef.current = zoomTier(initialZoom);
      }
      zoomListenerRef.current?.remove();
      zoomListenerRef.current = instance.addListener("idle", handleZoomChanged);
    },
    [handleZoomChanged],
  );

  useEffect(() => {
    return () => {
      zoomListenerRef.current?.remove();
      zoomListenerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || typeof google === "undefined") {
      return;
    }

    if (!clusterRef.current) {
      clusterRef.current = new MarkerClusterer({
        map: mapRef.current,
        markers: [],
        algorithm: new SuperClusterAlgorithm({
          radius: 80,
          maxZoom: 15,
          minPoints: 3,
        }),
      });
    }

    const markerClusterer = clusterRef.current;
    const nextMarkerIds = new Set<string>();
    const ownersWithCoordinates = mapData.filter((owner) => {
      const coords = owner.locationGeo?.coordinates;
      return Array.isArray(coords) && coords.length === 2;
    });

    const markersToAdd: OwnerMarker[] = [];
    const markersToRemove: OwnerMarker[] = [];

    ownersWithCoordinates.forEach((owner) => {
      nextMarkerIds.add(owner._id);
      const [lng, lat] = owner.locationGeo!.coordinates!;
      // Prefer the jittered position so markers stacked at identical
      // coordinates fan out and remain individually clickable when the
      // cluster breaks apart at high zoom.
      const position = displayPositions.get(owner._id) ?? { lat, lng };
      const existingMarker = ownerMarkersRef.current.get(owner._id);
      const nextIsSelected = selectedIdRef.current === owner._id;

      if (!existingMarker) {
        const marker = new google.maps.Marker({
          position,
          zIndex: nextIsSelected ? 500 : 100,
          icon: markerSymbol(owner.availability, nextIsSelected),
        }) as OwnerMarker;
        marker.__selected = nextIsSelected;
        marker.__availability = owner.availability;
        const ownerId = owner._id;
        const listeners = [
          marker.addListener("mouseover", () => {
            closeHoverDebounced.cancel();
            openHoverDebounced(ownerId);
          }),
          marker.addListener("mouseout", () => {
            openHoverDebounced.cancel();
            closeHoverDebounced(ownerId);
          }),
          marker.addListener("click", () => {
            openHoverDebounced.cancel();
            closeHoverDebounced.cancel();
            handleMarkerClickRef.current(owner);
          }),
        ];
        ownerMarkersRef.current.set(ownerId, marker);
        ownerMarkerListenersRef.current.set(ownerId, listeners);
        markersToAdd.push(marker);
      } else {
        const currentPosition = existingMarker.getPosition();
        if (
          !currentPosition ||
          currentPosition.lat() !== position.lat ||
          currentPosition.lng() !== position.lng
        ) {
          existingMarker.setPosition(position);
        }
        if (
          existingMarker.__selected !== nextIsSelected ||
          existingMarker.__availability !== owner.availability
        ) {
          existingMarker.setIcon(markerSymbol(owner.availability, nextIsSelected));
          existingMarker.setZIndex(nextIsSelected ? 500 : 100);
          existingMarker.__selected = nextIsSelected;
          existingMarker.__availability = owner.availability;
        }
      }
    });

    ownerMarkersRef.current.forEach((marker, ownerId) => {
      if (nextMarkerIds.has(ownerId)) {
        return;
      }
      markersToRemove.push(marker);
      marker.setMap(null);
      const listeners = ownerMarkerListenersRef.current.get(ownerId) ?? [];
      listeners.forEach((listener) => listener.remove());
      ownerMarkerListenersRef.current.delete(ownerId);
      ownerMarkersRef.current.delete(ownerId);
    });

    if (markersToRemove.length > 0) {
      markerClusterer.removeMarkers(markersToRemove, true);
    }
    if (markersToAdd.length > 0) {
      markerClusterer.addMarkers(markersToAdd, true);
    }
    if (markersToAdd.length > 0 || markersToRemove.length > 0) {
      markerClusterer.render();
    }
  }, [closeHoverDebounced, openHoverDebounced, mapData, displayPositions]);

  // Selection changes update the existing marker's icon without recreating
  // the marker or its listeners.
  useEffect(() => {
    ownerMarkersRef.current.forEach((marker, ownerId) => {
      const nextIsSelected = selectedId === ownerId;
      if (marker.__selected === nextIsSelected) {
        return;
      }
      const availability = marker.__availability ?? "Available";
      marker.setIcon(markerSymbol(availability, nextIsSelected));
      marker.setZIndex(nextIsSelected ? 500 : 100);
      marker.__selected = nextIsSelected;
    });
  }, [selectedId]);

  useEffect(() => {
    const markers = ownerMarkersRef.current;
    const listenersMap = ownerMarkerListenersRef.current;
    return () => {
      markers.forEach((marker, ownerId) => {
        const listeners = listenersMap.get(ownerId) ?? [];
        listeners.forEach((listener) => listener.remove());
        marker.setMap(null);
      });
      listenersMap.clear();
      markers.clear();
      clusterRef.current?.clearMarkers();
      clusterRef.current = null;
    };
  }, []);

  const corridorPath = useMemo(() => {
    if (searchMode !== "corridor" || !origin || !destination) {
      return [];
    }
    return buildCorridorPolygon(origin, destination, corridorWidthMeters / 2);
  }, [corridorWidthMeters, destination, origin, searchMode]);

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
          Pick a search mode, then use autocomplete or click on the map to set
          points. Radius mode searches around one point, corridor mode searches
          between origin and destination.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={searchMode === "radius" ? "default" : "outline"}
            onClick={() => {
              setSearchMode("radius");
              setDestination(null);
              setOriginToDestinationMeters(null);
              activePointRef.current = "origin";
            }}
          >
            Radius
          </Button>
          <Button
            type="button"
            size="sm"
            variant={searchMode === "corridor" ? "default" : "outline"}
            onClick={() => {
              setSearchMode("corridor");
              activePointRef.current = destination ? "origin" : "destination";
            }}
          >
            Between two locations
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {isLoaded ? (
            <Autocomplete
              onLoad={handleOriginAutocompleteLoad}
              onPlaceChanged={handleOriginPlaceChanged}
              className="w-full"
            >
              <Input
                placeholder={
                  searchMode === "corridor"
                    ? "Origin location"
                    : "Search address, area, landmark…"
                }
                className="w-full"
                aria-label="Origin location search"
                onFocus={() => {
                  activePointRef.current = "origin";
                }}
              />
            </Autocomplete>
          ) : (
            <Input placeholder="Loading maps…" disabled className="w-full" />
          )}

          {searchMode === "corridor" && (
            isLoaded ? (
              <Autocomplete
                onLoad={handleDestinationAutocompleteLoad}
                onPlaceChanged={handleDestinationPlaceChanged}
                className="w-full"
              >
                <Input
                  placeholder="Destination location"
                  className="w-full"
                  aria-label="Destination location search"
                  onFocus={() => {
                    activePointRef.current = "destination";
                  }}
                />
              </Autocomplete>
            ) : (
              <Input placeholder="Loading maps…" disabled className="w-full" />
            )
          )}

          {searchMode === "radius" ? (
            <Input
              type="number"
              min={100}
              max={50000}
              step={100}
              value={radiusMeters}
              onChange={(e) =>
                setRadiusMeters(Number(e.target.value || DEFAULT_RADIUS_METERS))
              }
              className="w-full"
              aria-label="Radius in meters"
            />
          ) : (
            <Input
              type="number"
              min={500}
              max={20000}
              step={500}
              value={corridorWidthMeters}
              onChange={(e) =>
                setCorridorWidthMeters(
                  Number(e.target.value || DEFAULT_CORRIDOR_WIDTH_METERS),
                )
              }
              className="w-full"
              aria-label="Corridor width in meters"
            />
          )}

          <div className="w-full rounded-md border p-1">
            <div className="grid grid-cols-3 gap-1">
              <Button
                type="button"
                size="sm"
                variant={mapAvailabilityMode === "both" ? "default" : "ghost"}
                onClick={() => {
                  setMapAvailabilityMode("both");
                  setPage(1);
                  setSelectedId(null);
                  setHoveredId(null);
                }}
                className="w-full text-xs sm:text-sm"
                aria-label="Show both available and unavailable properties on map"
              >
                Both
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapAvailabilityMode === "available" ? "default" : "ghost"}
                onClick={() => {
                  setMapAvailabilityMode("available");
                  setPage(1);
                  setSelectedId(null);
                  setHoveredId(null);
                }}
                className="w-full text-xs sm:text-sm"
                aria-label="Show only available properties on map"
              >
                Available
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapAvailabilityMode === "notAvailable" ? "default" : "ghost"}
                onClick={() => {
                  setMapAvailabilityMode("notAvailable");
                  setPage(1);
                  setSelectedId(null);
                  setHoveredId(null);
                }}
                className="w-full text-xs sm:text-sm"
                aria-label="Show only unavailable properties on map"
              >
                Unavailable
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={
              !origin ||
              isSearching ||
              (searchMode === "corridor" && !destination)
            }
            className="w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>

        {origin && (
          <p className="text-xs text-muted-foreground flex items-start sm:items-center gap-1.5">
            <Navigation className="w-3 h-3 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">
              <span className="font-medium">Origin:</span> {origin.label} |{" "}
              {searchMode === "radius"
                ? `Radius: ${radiusMeters}m`
                : `Corridor width: ${corridorWidthMeters}m`}
            </span>
          </p>
        )}
        {searchMode === "corridor" && destination && (
          <p className="text-xs text-muted-foreground flex items-start sm:items-center gap-1.5">
            <Navigation className="w-3 h-3 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">
              <span className="font-medium">Destination:</span> {destination.label}
              {originToDestinationMeters
                ? ` | Origin → Destination: ${formatDistanceKm(originToDestinationMeters)}`
                : ""}
            </span>
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="relative rounded-lg overflow-hidden border shadow-sm">
        {isLoaded ? (
          <GoogleMap
            onLoad={handleMapLoad}
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={DEFAULT_CENTER}
            zoom={10}
            onClick={handleMapClick}
            options={MAP_OPTIONS}
          >
            {origin && searchMode === "radius" && (
              <Circle
                center={{ lat: origin.lat, lng: origin.lng }}
                radius={radiusMeters}
                options={CIRCLE_OPTIONS}
              />
            )}
            {origin && searchMode === "corridor" && destination && (
              <>
                <Polyline
                  path={[
                    { lat: origin.lat, lng: origin.lng },
                    { lat: destination.lat, lng: destination.lng },
                  ]}
                  options={CORRIDOR_POLYLINE_OPTIONS}
                />
                <Polygon paths={corridorPath} options={CORRIDOR_POLYGON_OPTIONS} />
              </>
            )}

            {origin && (
              <Marker
                position={{ lat: origin.lat, lng: origin.lng }}
                icon={originMarkerIcon}
                title="Origin"
                zIndex={900}
              />
            )}
            {searchMode === "corridor" && destination && (
              <Marker
                position={{ lat: destination.lat, lng: destination.lng }}
                icon={destinationMarkerIcon}
                title="Destination"
                zIndex={900}
              />
            )}
            {activeInfoOwner?.locationGeo?.coordinates && (
              <InfoWindow
                position={
                  displayPositions.get(activeInfoOwner._id) ?? {
                    lat: activeInfoOwner.locationGeo.coordinates[1],
                    lng: activeInfoOwner.locationGeo.coordinates[0],
                  }
                }
                // disableAutoPan keeps the map still when the InfoWindow
                // moves between markers, so the user isn't thrown back to
                // a previously opened card's location.
                options={{ disableAutoPan: true }}
                onCloseClick={() => {
                  setSelectedId(null);
                  setHoveredId(null);
                }}
              >
                {/* Keep the card open when the cursor moves from the marker
                    onto it. On leave, restart the close debounce so the card
                    fades out gracefully if no sticky selection exists. */}
                <div
                  onMouseEnter={() => {
                    openHoverDebounced.cancel();
                    closeHoverDebounced.cancel();
                  }}
                  onMouseLeave={() => {
                    if (hoveredIdRef.current) {
                      closeHoverDebounced(hoveredIdRef.current);
                    }
                  }}
                >
                  <GeoInfoCard
                    name={activeInfoOwner.name}
                    address={activeInfoOwner.address}
                    propertyType={activeInfoOwner.propertyType}
                    area={activeInfoOwner.area}
                    price={activeInfoOwner.price}
                    availability={activeInfoOwner.availability}
                    distanceFromDestinationMeters={
                      activeInfoOwner.distanceFromDestinationMeters
                    }
                    showDestinationDistance={searchMode === "corridor"}
                  />
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="h-[500px] flex items-center justify-center bg-muted text-muted-foreground text-sm">
            Loading map…
          </div>
        )}
        {isSearching && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
            <Skeleton className="w-full h-full opacity-40" />
          </div>
        )}
      </div>

      {hasSearched && (
        <div ref={tableSectionRef} className="w-full">
        <Tabs
          value={selectedTab}
          onValueChange={(value) => {
            setSelectedTab(value as TableTab);
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
                  extraColumnLabel={
                    searchMode === "corridor" ? "Dist. to Destination" : undefined
                  }
                  extraColumnRender={
                    searchMode === "corridor"
                      ? (owner) =>
                          formatDistanceKm(
                            (owner as GeoOwner).distanceFromDestinationMeters,
                          )
                      : undefined
                  }
                />
              </div>
              {isSearching && (
                <div className="mt-4 space-y-2" aria-label="Loading rows">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
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
                  extraColumnLabel={
                    searchMode === "corridor" ? "Dist. to Destination" : undefined
                  }
                  extraColumnRender={
                    searchMode === "corridor"
                      ? (owner) =>
                          formatDistanceKm(
                            (owner as GeoOwner).distanceFromDestinationMeters,
                          )
                      : undefined
                  }
                />
              </div>
              {isSearching && (
                <div className="mt-4 space-y-2" aria-label="Loading rows">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
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
