"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

import type { LeadsCandleDay } from "@/actions/(VS)/queryActions";

const MAX_TOOLTIP_LOCATIONS = 4;
const MAX_TOOLTIP_TYPES_PER_LOC = 4;
const MAX_LEGEND_LOCATIONS = 8;

const CHART_PALETTE = [
  "hsl(217 91% 60%)",
  "hsl(160 84% 39%)",
  "hsl(271 81% 56%)",
  "hsl(24 95% 53%)",
  "hsl(339 82% 58%)",
  "hsl(199 89% 48%)",
  "hsl(45 93% 47%)",
  "hsl(173 80% 40%)",
] as const;

type Props = {
  title?: string;
  days: LeadsCandleDay[];
  locations: string[];
  selectedLocation?: string;
  height?: number;
  filterBar?: React.ReactNode;
};

type CandleDatum = {
  day: string;
  total: number;
  __meta: LeadsCandleDay;
  [k: string]: number | string | LeadsCandleDay;
};

function locationColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

type AxisScale = {
  scale?: (value: string | number) => number;
  bandSize?: number;
};

type CandleTotalLabelsProps = {
  data?: CandleDatum[];
  offset?: { top?: number; left?: number };
  xAxisMap?: Record<string, AxisScale>;
  yAxisMap?: Record<string, AxisScale>;
};

/** Always-visible daily totals above each stacked bar (not tied to tooltip/hover). */
function CandleTotalLabels({
  data,
  offset,
  xAxisMap,
  yAxisMap,
}: CandleTotalLabelsProps) {
  if (!data?.length || !offset) return null;

  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : undefined;
  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : undefined;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const bandSize = xAxis.bandSize ?? 0;
  const baselineY = yAxis.scale(0);
  if (baselineY == null) return null;

  return (
    <g className="pointer-events-none">
      {data.map((datum) => {
        const bandX = xAxis.scale!(datum.day);
        if (bandX == null) return null;

        const stackTopY = yAxis.scale!(datum.total);
        const barTopY = stackTopY ?? baselineY;
        const labelY = Math.min(barTopY, baselineY) - 8;
        const labelX = bandX + bandSize / 2 + (offset.left ?? 0)-19;

        return (
          <text
            key={datum.day}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize={9}
            fontWeight={600}
            className="text-muted-foreground "
            transform={`rotate(-60 ${labelX} ${labelY})`}
          >
            {datum.total}
          </text>
        );
      })}
    </g>
  );
}

function formatDayLabel(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return format(new Date(`${day}T00:00:00.000Z`), "MMM d");
}

function buildChartConfig(locations: string[]): ChartConfig {
  const config: ChartConfig = { count: { label: "Leads" } };
  locations.forEach((loc, idx) => {
    config[loc] = { label: loc, color: locationColor(idx) };
  });
  return config;
}

function buildData(
  days: LeadsCandleDay[],
  locations: string[],
  selectedLocation?: string,
): CandleDatum[] {
  const allowed =
    selectedLocation && selectedLocation !== "All"
      ? [selectedLocation]
      : locations;
  return days.map((d) => {
    const row: CandleDatum = { day: d.day, total: d.total, __meta: d };
    for (const loc of allowed) {
      row[loc] = d.locations[loc]?.total ?? 0;
    }
    return row;
  });
}

function CompactTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CandleDatum }>;
  label?: string;
  colors: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const meta = payload[0]?.payload?.__meta;
  if (!meta) return null;

  const dayLabel = label ? formatDayLabel(label) : formatDayLabel(meta.day);
  const sorted = Object.entries(meta.locations).sort(
    (a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0),
  );
  const shown = sorted.slice(0, MAX_TOOLTIP_LOCATIONS);
  const restLocs = sorted.length - shown.length;

  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 shadow-md text-md pointer-events-auto">
      <div className="flex justify-between gap-3 font-medium border-b border-border/50 pb-1.5 mb-1.5">
        <span className="text-muted-foreground">{dayLabel}</span>
        <span className="tabular-nums shrink-0">{meta.total} leads</span>
      </div>
      <div className="space-y-2">
        {shown.map(([loc, info]) => {
          const types = Object.entries(info.propertyTypes ?? {}).sort(
            (a, b) => b[1] - a[1],
          );
          const typesShown = types.slice(0, MAX_TOOLTIP_TYPES_PER_LOC);
          const typesRest = types.length - typesShown.length;

          return (
            <div key={loc} className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0 font-medium">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors[loc] }}
                  />
                  <span className="truncate">{loc}</span>
                </span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {info.total}
                </span>
              </div>
              {typesShown.length > 0 ? (
                <div className="pl-3 flex flex-wrap gap-x-2 gap-y-0.5 text-[18x] leading-tight ">
                  {typesShown.map(([type, count]) => (
                    <span key={type} className="whitespace-nowrap">
                      {type}{" "}
                      <span className="text-foreground/80 tabular-nums">
                        {count}
                      </span>
                    </span>
                  ))}
                  {typesRest > 0 ? (
                    <span className="text-muted-foreground/80">+{typesRest}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {restLocs > 0 ? (
        <p className="mt-1.5 pt-1 border-t border-border/40 text-[18x] ">
          +{restLocs} more locations
        </p>
      ) : null}
    </div>
  );
}

export function LeadsCandleChart({
  title = "Daily leads by location",
  days,
  locations,
  selectedLocation = "All",
  height = 300,
  filterBar,
}: Props) {
  const allowedLocations = useMemo(
    () => (selectedLocation !== "All" ? [selectedLocation] : locations),
    [selectedLocation, locations],
  );

  const config = useMemo(
    () => buildChartConfig(allowedLocations),
    [allowedLocations],
  );

  const colors = useMemo(() => {
    const c: Record<string, string> = {};
    allowedLocations.forEach((loc, idx) => {
      c[loc] = locationColor(idx);
    });
    return c;
  }, [allowedLocations]);

  const data = useMemo(
    () => buildData(days, locations, selectedLocation),
    [days, locations, selectedLocation],
  );

  const legendVisible = allowedLocations.slice(0, MAX_LEGEND_LOCATIONS);
  const legendMore = Math.max(0, allowedLocations.length - legendVisible.length);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="p-3 pb-2 space-y-2">
        <CardTitle className="text-md font-semibold">{title}</CardTitle>
        {filterBar ? <div className="flex flex-wrap items-center gap-2">{filterBar}</div> : null}
        {legendVisible.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[18x] ">
            {legendVisible.map((loc) => (
              <span key={loc} className="inline-flex items-center gap-1 max-w-[120px]">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[loc] }}
                />
                <span className="truncate">{loc.charAt(0).toUpperCase() + loc.slice(1).toLowerCase()}</span>
              </span>
            ))}
            {legendMore > 0 ? <span>+{legendMore}</span> : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{ height }}
          >
            No leads in this period
          </div>
        ) : (
          <ChartContainer config={config} className="w-full aspect-auto">
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 28, right: 8, left: -8, bottom: 36 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    fontSize={10}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatDayLabel(String(v))}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    fontSize={10}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
                    wrapperStyle={{ pointerEvents: "auto", outline: "none" }}
                    content={({ active, payload, label }) => (
                      <CompactTooltip
                        active={active}
                        payload={payload as Array<{ payload?: CandleDatum }>}
                        label={typeof label === "string" ? label : undefined}
                        colors={colors}
                      />
                    )}
                  />
                  {allowedLocations.map((loc, index) => (
                    <Bar
                      key={loc}
                      dataKey={loc}
                      stackId="day"
                      fill={colors[loc]}
                      radius={
                        index === allowedLocations.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                      isAnimationActive={false}
                    />
                  ))}
                  <Customized
                    component={(props: CandleTotalLabelsProps) => (
                      <CandleTotalLabels {...props} data={data} />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
