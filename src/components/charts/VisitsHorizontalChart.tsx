"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { MonthSelector } from "@/components/MonthSelector";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import type { MonthlyCityVisitStat } from "@/actions/(VS)/queryActions";

const CHART_CONFIG = {
  completed: {
    label: "Completed",
    color: "hsl(160 70% 42%)",
  },
  pending: {
    label: "Pending",
    color: "hsl(217 85% 58%)",
  },
} satisfies ChartConfig;

type ChartDatum = MonthlyCityVisitStat & {
  totalVisits: number;
};

interface CityVisitsChartProps {
  chartData: MonthlyCityVisitStat[];
  title?: string;
  description?: string;
  height?: number;
  selectedMonth?: Date;
  onMonthChange?: (month: Date) => void;
  loading?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function capitalizeLocation(loc: string): string {
  if (!loc || loc === "Unknown") return loc;
  return loc.charAt(0).toUpperCase() + loc.slice(1).toLowerCase();
}

type VisitTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  label?: string;
};

function VisitStackTooltip({ active, payload, label }: VisitTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const cityLabel = label ? capitalizeLocation(label) : capitalizeLocation(row.location);

  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-md text-sm min-w-[200px]"
      role="tooltip"
    >
      <p className="font-semibold text-foreground border-b border-border/60 pb-2 mb-2">
        {cityLabel}
      </p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: CHART_CONFIG.completed.color }}
            />
            Completed
          </span>
          <span className="tabular-nums font-medium">{row.completed}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pl-3.5">
          <span className="text-muted-foreground">Pitch</span>
          <span className="tabular-nums">{formatCurrency(row.completedPitch)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: CHART_CONFIG.pending.color }}
            />
            Pending
          </span>
          <span className="tabular-nums font-medium">{row.pending}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pl-3.5">
          <span className="text-muted-foreground">Pitch</span>
          <span className="tabular-nums">{formatCurrency(row.pendingPitch)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border font-semibold">
          <span>Total visits</span>
          <span className="tabular-nums">{row.totalVisits}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Total pitch</span>
          <span className="tabular-nums">{formatCurrency(row.totalPitch)}</span>
        </div>
      </div>
    </div>
  );
}

type AxisScale = {
  scale?: (value: string | number) => number;
  bandSize?: number;
};

type TotalBarLabelsProps = {
  data?: ChartDatum[];
  offset?: { top?: number; left?: number };
  yAxisMap?: Record<string, AxisScale>;
  xAxisMap?: Record<string, AxisScale>;
};

function TotalBarLabels({ data, offset, yAxisMap, xAxisMap }: TotalBarLabelsProps) {
  if (!data?.length || !offset) return null;

  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : undefined;
  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : undefined;
  if (!yAxis?.scale || !xAxis?.scale) return null;

  const bandSize = yAxis.bandSize ?? 0;
  const baselineX = xAxis.scale(0);
  if (baselineX == null) return null;

  return (
    <g className="pointer-events-none">
      {data.map((datum) => {
        const bandY = yAxis.scale!(datum.location);
        if (bandY == null) return null;

        const stackEndX = xAxis.scale!(datum.totalVisits);
        const labelX = (stackEndX ?? baselineX) + 8 + (offset.left ?? 0);
        const labelY = bandY + bandSize / 2 + (offset.top ?? 0);

        return (
          <text
            key={datum.location}
            x={labelX}
            y={labelY}
            dy={4}
            fill="hsl(var(--foreground))"
            fontSize={11}
            fontWeight={600}
          >
            {datum.totalVisits}
          </text>
        );
      })}
    </g>
  );
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function defaultChartMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function CityVisitsChart({
  chartData,
  title = "City Visit Stats",
  description = "Stacked completed vs pending visits with pitch amounts",
  height,
  selectedMonth,
  onMonthChange,
  loading = false,
}: CityVisitsChartProps) {
  const periodLabel = selectedMonth
    ? formatMonthLabel(selectedMonth)
    : formatMonthLabel(defaultChartMonth());

  const data = useMemo<ChartDatum[]>(
    () =>
      chartData.map((row) => ({
        ...row,
        location: capitalizeLocation(row.location),
        totalVisits: row.total ?? row.completed + row.pending,
      })),
    [chartData],
  );

  const totals = useMemo(() => {
    const visits = data.reduce((acc, d) => acc + d.totalVisits, 0);
    const pitch = data.reduce((acc, d) => acc + (d.totalPitch ?? 0), 0);
    const completed = data.reduce((acc, d) => acc + d.completed, 0);
    const pending = data.reduce((acc, d) => acc + d.pending, 0);
    return { visits, pitch, completed, pending };
  }, [data]);

  const chartHeight = height ?? Math.max(280, data.length * 44 + 48);

  return (
    <Card className="w-full shadow-sm border-border/80">
      <CardHeader className="p-4 pb-2 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <div className="rounded-md bg-primary/10 p-2 shrink-0">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                {description}
                <span className="block text-xs mt-1 text-muted-foreground/90">
                  Period: {periodLabel}
                </span>
              </CardDescription>
            </div>
          </div>
          {selectedMonth && onMonthChange ? (
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/60">
          <div>
            <p className="text-xs text-muted-foreground">Total visits</p>
            <p className="text-sm font-semibold tabular-nums">{totals.visits}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {totals.completed}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-sm font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {totals.pending}
            </p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-xs text-muted-foreground">Total pitch</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(totals.pitch)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 relative">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]"
            aria-busy="true"
            aria-label="Loading visit chart"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}
        {data.length === 0 && !loading ? (
          <div
            className="flex flex-col items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed border-border/80"
            style={{ height: chartHeight }}
          >
            <BarChart3 className="h-8 w-8 mb-2 opacity-40" aria-hidden />
            <p>No visits this month</p>
          </div>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="w-full aspect-auto">
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 8, right: 36, left: 4, bottom: 8 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <YAxis
                    dataKey="location"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={96}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.25)" }}
                    content={(props) => (
                      <VisitStackTooltip
                        active={props.active}
                        payload={
                          props.payload as Array<{ payload?: ChartDatum }>
                        }
                        label={
                          typeof props.label === "string" ? props.label : undefined
                        }
                      />
                    )}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="completed"
                    stackId="visits"
                    fill={CHART_CONFIG.completed.color}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="pending"
                    stackId="visits"
                    fill={CHART_CONFIG.pending.color}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Customized
                    component={(props: TotalBarLabelsProps) => (
                      <TotalBarLabels {...props} data={data} />
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

export default CityVisitsChart;
