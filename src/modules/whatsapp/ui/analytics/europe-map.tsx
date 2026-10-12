"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { LocationAnalyticsRow } from "@/lib/whatsapp/analytics/types";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

const PROJECTION_CONFIG = {
  center: [15, 50] as [number, number],
  scale: 720,
};

/** Exact `name` values from world-atlas countries-50m */
const EUROPE_COUNTRY_NAMES = new Set([
  "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herz.",
  "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland",
  "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy",
  "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia",
  "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "Norway", "Poland",
  "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia",
  "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Kingdom", "Vatican",
]);

const CITY_TO_COUNTRY: Record<string, string> = {
  athens: "Greece",
  thessaloniki: "Greece",
  chania: "Greece",
  mykonos: "Greece",
  santorini: "Greece",
  corfu: "Greece",
  rhodes: "Greece",
  crete: "Greece",
  rome: "Italy",
  milan: "Italy",
  zagreb: "Croatia",
  split: "Croatia",
  dubrovnik: "Croatia",
  bucharest: "Romania",
  barcelona: "Spain",
  madrid: "Spain",
  paris: "France",
  berlin: "Germany",
  vienna: "Austria",
  prague: "Czechia",
  amsterdam: "Netherlands",
  brussels: "Belgium",
  lisbon: "Portugal",
  london: "United Kingdom",
  warsaw: "Poland",
  budapest: "Hungary",
  istanbul: "Turkey",
  sofia: "Bulgaria",
};

/** [longitude, latitude] */
const CITY_COORDS: Record<
  string,
  { coordinates: [number, number]; label: string }
> = {
  athens: { coordinates: [23.7275, 37.9838], label: "Athens" },
  rome: { coordinates: [12.4964, 41.9028], label: "Rome" },
  milan: { coordinates: [9.19, 45.4642], label: "Milan" },
  thessaloniki: { coordinates: [22.9444, 40.6401], label: "Thessaloniki" },
  chania: { coordinates: [24.0094, 35.5138], label: "Chania" },
  zagreb: { coordinates: [15.9819, 45.815], label: "Zagreb" },
  bucharest: { coordinates: [26.1025, 44.4268], label: "Bucharest" },
  split: { coordinates: [16.4402, 43.5081], label: "Split" },
  barcelona: { coordinates: [2.1734, 41.3851], label: "Barcelona" },
  madrid: { coordinates: [-3.7038, 40.4168], label: "Madrid" },
  paris: { coordinates: [2.3522, 48.8566], label: "Paris" },
  berlin: { coordinates: [13.405, 52.52], label: "Berlin" },
  vienna: { coordinates: [16.3738, 48.2082], label: "Vienna" },
  prague: { coordinates: [14.4378, 50.0755], label: "Prague" },
  amsterdam: { coordinates: [4.9041, 52.3676], label: "Amsterdam" },
  brussels: { coordinates: [4.3517, 50.8503], label: "Brussels" },
  lisbon: { coordinates: [-9.1393, 38.7223], label: "Lisbon" },
  london: { coordinates: [-0.1276, 51.5074], label: "London" },
  warsaw: { coordinates: [21.0122, 52.2297], label: "Warsaw" },
  budapest: { coordinates: [19.0402, 47.4979], label: "Budapest" },
  istanbul: { coordinates: [28.9784, 41.0082], label: "Istanbul" },
  sofia: { coordinates: [23.3219, 42.6977], label: "Sofia" },
  dubrovnik: { coordinates: [18.0944, 42.6507], label: "Dubrovnik" },
  mykonos: { coordinates: [25.3289, 37.4467], label: "Mykonos" },
  santorini: { coordinates: [25.4615, 36.3932], label: "Santorini" },
  corfu: { coordinates: [19.9217, 39.6243], label: "Corfu" },
  rhodes: { coordinates: [28.2225, 36.4341], label: "Rhodes" },
  crete: { coordinates: [24.8093, 35.2401], label: "Crete" },
};

interface GeographyProperties {
  name?: string;
}

export interface CountryAggregate {
  country: string;
  locations: LocationAnalyticsRow[];
  outbound: number;
  responded: number;
  responseRate: number;
  avgCustomerReplyMs: number;
  visitRate: number;
  bookingRate: number;
  ownerCount: number;
  guestCount: number;
  shortTermCount: number;
  longTermCount: number;
}

function markerColor(responseRate: number): string {
  if (responseRate >= 80) return "#22c55e";
  if (responseRate >= 50) return "#f59e0b";
  return "#ef4444";
}

function countryFill(
  responseRate: number | null,
  hovered: boolean,
): { fill: string; fillOpacity: number } {
  if (responseRate === null) {
    return { fill: hovered ? "#1f2937" : "#161b22", fillOpacity: 1 };
  }
  return {
    fill: markerColor(responseRate),
    fillOpacity: hovered ? 0.65 : 0.38,
  };
}

function resolveCountry(stat: LocationAnalyticsRow): string | null {
  const key = stat.locationKey.toLowerCase().trim();
  if (CITY_TO_COUNTRY[key]) return CITY_TO_COUNTRY[key];

  const labelMatch = Object.entries(CITY_COORDS).find(
    ([k, c]) =>
      k === key ||
      c.label.toLowerCase() === stat.location.toLowerCase().trim(),
  );
  if (labelMatch) return CITY_TO_COUNTRY[labelMatch[0]] ?? null;

  const loc = stat.location.trim();
  if (EUROPE_COUNTRY_NAMES.has(loc)) return loc;

  return null;
}

function aggregateByCountry(
  stats: LocationAnalyticsRow[],
): Map<string, CountryAggregate> {
  const map = new Map<string, CountryAggregate>();

  for (const stat of stats) {
    const country = resolveCountry(stat);
    if (!country) continue;

    const existing = map.get(country);
    if (!existing) {
      map.set(country, {
        country,
        locations: [stat],
        outbound: stat.outbound,
        responded: stat.responded,
        responseRate: stat.responseRate,
        avgCustomerReplyMs: stat.avgCustomerReplyMs,
        visitRate: stat.visitRate,
        bookingRate: stat.bookingRate,
        ownerCount: stat.ownerCount,
        guestCount: stat.guestCount,
        shortTermCount: stat.shortTermCount,
        longTermCount: stat.longTermCount,
      });
      continue;
    }

    const outbound = existing.outbound + stat.outbound;
    const responded = existing.responded + stat.responded;
    const replyWeighted =
      existing.avgCustomerReplyMs * existing.responded +
      stat.avgCustomerReplyMs * stat.responded;

    map.set(country, {
      country,
      locations: [...existing.locations, stat],
      outbound,
      responded,
      responseRate: outbound > 0 ? Math.round((responded / outbound) * 100) : 0,
      avgCustomerReplyMs:
        responded > 0 ? Math.round(replyWeighted / responded) : 0,
      visitRate:
        responded > 0
          ? Math.round(
              ((existing.visitRate * existing.responded +
                stat.visitRate * stat.responded) /
                responded),
            )
          : 0,
      bookingRate:
        responded > 0
          ? Math.round(
              ((existing.bookingRate * existing.responded +
                stat.bookingRate * stat.responded) /
                responded),
            )
          : 0,
      ownerCount: existing.ownerCount + stat.ownerCount,
      guestCount: existing.guestCount + stat.guestCount,
      shortTermCount: existing.shortTermCount + stat.shortTermCount,
      longTermCount: existing.longTermCount + stat.longTermCount,
    });
  }

  return map;
}

type TooltipState =
  | { kind: "country"; data: CountryAggregate; x: number; y: number }
  | { kind: "city"; data: LocationAnalyticsRow; x: number; y: number };

interface EuropeMapProps {
  locationStats: LocationAnalyticsRow[];
}

export default function EuropeMap({ locationStats }: EuropeMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const statsMap = useMemo(
    () =>
      new Map<string, LocationAnalyticsRow>(
        locationStats.map((s) => [s.locationKey.toLowerCase(), s]),
      ),
    [locationStats],
  );

  const countryStatsMap = useMemo(
    () => aggregateByCountry(locationStats),
    [locationStats],
  );

  const markers = useMemo(
    () => Object.entries(CITY_COORDS).filter(([key]) => statsMap.has(key)),
    [statsMap],
  );

  const setTooltipFromEvent = useCallback(
    (
      e: React.MouseEvent<Element, MouseEvent>,
      next: Omit<TooltipState, "x" | "y">,
    ) => {
      const container = (e.currentTarget as Element).closest(
        "[data-map-container]",
      ) as HTMLElement | null;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({
        ...next,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      } as TooltipState);
    },
    [],
  );

  return (
    <div
      data-map-container
      className="relative w-full overflow-hidden rounded-lg"
      style={{ background: "#0d1117", minHeight: 420 }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        width={900}
        height={520}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geo) => {
                const name = (geo.properties as GeographyProperties).name ?? "";
                return EUROPE_COUNTRY_NAMES.has(name);
              })
              .map((geo) => {
                const countryName =
                  (geo.properties as GeographyProperties).name ?? "";
                const agg = countryStatsMap.get(countryName);
                const isHovered = hoveredCountry === countryName;
                const rate = agg?.responseRate ?? null;
                const { fill, fillOpacity } = countryFill(rate, isHovered);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className="cursor-pointer"
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={isHovered ? "#818cf8" : "#374151"}
                    strokeWidth={isHovered ? 1.2 : 0.6}
                    style={{
                      default: { outline: "none", cursor: agg ? "pointer" : "default" },
                      hover: { outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      setHoveredCountry(countryName);
                      if (agg) {
                        setTooltipFromEvent(e, { kind: "country", data: agg });
                      } else {
                        setTooltip(null);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (agg) {
                        setTooltipFromEvent(e, { kind: "country", data: agg });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null);
                      setTooltip(null);
                    }}
                  />
                );
              })
          }
        </Geographies>

        {markers.map(([key, city]) => {
          const stat = statsMap.get(key)!;
          const color = markerColor(stat.responseRate);
          return (
            <Marker
              key={key}
              coordinates={city.coordinates}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setTooltipFromEvent(e, { kind: "city", data: stat });
              }}
              onMouseMove={(e) => {
                setTooltipFromEvent(e, { kind: "city", data: stat });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle r={12} fill={color} fillOpacity={0.2} />
              <circle r={5} fill={color} stroke="#0d1117" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                y={-10}
                fill="#d1d5db"
                fontSize={10}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: "none" }}
              >
                {city.label}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/5 px-4 py-2.5 text-[10px] text-gray-500">
        <span className="text-gray-600">Reply rate</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#22c55e55" }} />
          &gt;80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#f59e0b55" }} />
          50–80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#ef444455" }} />
          &lt;50%
        </span>
        <span className="text-gray-600">· Hover country or city for details</span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-white/10 p-3 text-xs shadow-lg"
          style={{
            left: Math.min(tooltip.x + 12, 680),
            top: Math.max(tooltip.y - 8, 8),
            background: "#1e2433",
            minWidth: 180,
            maxWidth: 240,
          }}
        >
          {tooltip.kind === "country" ? (
            <>
              <p className="mb-1.5 font-semibold text-white">
                {tooltip.data.country}
                {tooltip.data.locations.length > 1 && (
                  <span className="ml-1 font-normal text-gray-500">
                    ({tooltip.data.locations.length} cities)
                  </span>
                )}
              </p>
              <div className="space-y-0.5 text-gray-400">
                <p>
              Reply Rate:{" "}
              <span
                className="font-medium"
                style={{ color: markerColor(tooltip.data.responseRate) }}
              >
                {tooltip.data.responseRate}%
              </span>
            </p>
            <p>
              Avg Customer Reply:{" "}
              <span className="text-white">
                {Math.round(tooltip.data.avgCustomerReplyMs / 60000)}m
              </span>
            </p>
            <p>
              Conversations:{" "}
              <span className="text-white">{tooltip.data.outbound}</span>
            </p>
            <p>
              Responded:{" "}
              <span className="text-white">{tooltip.data.responded}</span>
            </p>
            <p>
              Visit Rate:{" "}
              <span className="text-white">{tooltip.data.visitRate}%</span>
            </p>
            <p>
              Booking Rate:{" "}
              <span className="text-white">{tooltip.data.bookingRate}%</span>
            </p>
            <p>
              Owners:{" "}
              <span className="text-white">{tooltip.data.ownerCount}</span>
              {" · "}
              Guests:{" "}
              <span className="text-white">{tooltip.data.guestCount}</span>
            </p>
                {tooltip.data.locations.length > 1 && (
                  <p className="pt-1 text-[10px] text-gray-500">
                    {tooltip.data.locations.map((l) => l.location).join(", ")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mb-1.5 font-semibold text-white">
                {tooltip.data.location}
              </p>
              <div className="space-y-0.5 text-gray-400">
                <p>
              Reply Rate:{" "}
              <span
                className="font-medium"
                style={{ color: markerColor(tooltip.data.responseRate) }}
              >
                {tooltip.data.responseRate}%
              </span>
            </p>
            <p>
              Avg Reply:{" "}
              <span className="text-white">
                {Math.round(tooltip.data.avgCustomerReplyMs / 60000)}m
              </span>
            </p>
            <p>
              Owners:{" "}
              <span className="text-white">{tooltip.data.ownerCount}</span>
            </p>
            <p>
              Guests:{" "}
              <span className="text-white">{tooltip.data.guestCount}</span>
            </p>
            <p>
              Short Term:{" "}
              <span className="text-white">{tooltip.data.shortTermCount}</span>
            </p>
            <p>
              Long Term:{" "}
              <span className="text-white">{tooltip.data.longTermCount}</span>
            </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
