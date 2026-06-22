"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartLegend,
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DaySelector } from "@/components/DaySelector";
import { useLeadsByDay } from "@/features/leadgen/hooks/useLeadsByDay";
import {
  formatDayLabel,
  isToday,
  startOfLocalDay,
} from "@/lib/date/dayKey";

const chartConfig = {
  athens: {
    label: "Athens",
    color: "hsl(var(--chart-1))",
  },
  thessaloniki: {
    label: "Thessaloniki",
    color: "hsl(var(--chart-2))",
  },
  chania: {
    label: "Chania",
    color: "hsl(var(--chart-3))",
  },
  rome: {
    label: "Rome",
    color: "hsl(var(--chart-4))",
  },
  milan: {
    label: "Milan",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export type StackedBarChartDatum = {
  label: string;
  categories: { field: string; count: number }[];
};

interface StackedBarChartProps {
  heading?: string;
  subHeading?: string;
  chartData?: StackedBarChartDatum[];
  footer?: string;
  /** When true, chart fetches leads per day with cached navigation (no duplicate calls). */
  enableDayNavigation?: boolean;
}

function toStackedRows(
  chartData: StackedBarChartDatum[],
): Array<Record<string, string | number>> {
  const rows = chartData.map((item) => {
    const flattenedCategories = item.categories.reduce(
      (acc, category) => {
        acc[category.field] = category.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(flattenedCategories).reduce(
      (acc, curr) => acc + curr,
      0,
    );

    return {
      label: item.label,
      ...flattenedCategories,
      total,
    };
  });

  rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  return rows;
}

function CustomLegend({
  config,
  categoryTotals,
}: {
  config: ChartConfig;
  categoryTotals: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {Object.keys(config).map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: config[key].color }}
          />
          <span className="text-sm text-muted-foreground">
            {config[key].label}: {categoryTotals[key] ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CustomStackBarChart({
  heading,
  subHeading = "Leads by Agent",
  chartData: externalChartData,
  enableDayNavigation = false,
}: StackedBarChartProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));

  const {
    data: leadsByDay,
    isLoading,
    isFetching,
    isError,
    error,
  } = useLeadsByDay(selectedDate, enableDayNavigation);

  const resolvedChartData = useMemo((): StackedBarChartDatum[] => {
    if (!enableDayNavigation) {
      return externalChartData ?? [];
    }

    const leads = leadsByDay?.serializedLeads ?? [];
    return leads.map((lead) => ({
      label: String(lead.createdBy ?? lead.agent ?? "Unknown"),
      categories: (lead.locations ?? []).map(
        (location: { location: string; count: number }) => ({
          field: location.location,
          count: location.count,
        }),
      ),
    }));
  }, [enableDayNavigation, externalChartData, leadsByDay?.serializedLeads]);

  const totalLeads = enableDayNavigation
    ? (leadsByDay?.totalLeads ?? 0)
    : resolvedChartData.reduce(
        (sum, row) =>
          sum + row.categories.reduce((acc, cat) => acc + cat.count, 0),
        0,
      );

  const resolvedHeading =
    heading ??
    (enableDayNavigation
      ? `Leads - ${totalLeads}`
      : `Today Leads - ${totalLeads}`);

  const resolvedSubHeading = enableDayNavigation
    ? isToday(selectedDate)
      ? "Today · Leads by Agent"
      : `${formatDayLabel(selectedDate)} · Leads by Agent`
    : subHeading;

  const newChartData = toStackedRows(resolvedChartData);

  const locationKeys: string[] = [];
  for (const row of newChartData) {
    Object.keys(row).forEach((location) => {
      if (location !== "label" && location !== "total") {
        if (!locationKeys.includes(location)) locationKeys.push(location);
      }
    });
  }

  const categoryTotals: Record<string, number> = {};
  for (const data of newChartData) {
    for (const key of locationKeys) {
      if (!categoryTotals[key]) categoryTotals[key] = 0;
      categoryTotals[key] += Number(data[key] ?? 0);
    }
  }

  const showInitialLoader = enableDayNavigation && isLoading && !leadsByDay;
  const showEmptyState =
    !showInitialLoader && !isError && newChartData.length === 0;

  return (
    <Card className="relative w-full dark:bg-stone-950">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{resolvedHeading}</CardTitle>
            <CardDescription className="text-base">
              {resolvedSubHeading}
            </CardDescription>
          </div>
          {enableDayNavigation && (
            <DaySelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {showInitialLoader ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load leads"}
            </p>
          </div>
        ) : showEmptyState ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg bg-muted/30">
            <p className="text-muted-foreground">No leads for this day</p>
          </div>
        ) : (
          <div
            className={[
              "transition-opacity duration-200",
              enableDayNavigation && isFetching ? "opacity-60" : "opacity-100",
            ].join(" ")}
          >
            <ChartContainer config={chartConfig} className="max-h-[350px] w-full">
              <BarChart
                accessibilityLayer
                data={newChartData}
                margin={{ top: 30 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `${String(value).split(" ")[0]?.trim()} `
                  }
                  tick={{ fontSize: 14 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                {locationKeys.map((location) => (
                  <Bar
                    key={location}
                    dataKey={location}
                    stackId="a"
                    fill={`var(--color-${location})`}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(value: number) => value.toString()}
                      className="fill-foreground"
                      style={{ fontSize: "16px", fontWeight: 600 }}
                    />
                  </Bar>
                ))}
                <ChartLegend
                  content={
                    <CustomLegend
                      config={chartConfig}
                      categoryTotals={categoryTotals}
                    />
                  }
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
