"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useMemo, useState } from "react";

interface LeadGenChartData {
  date: string;
  [createdBy: string]: number | string; // dynamic agent/email keys
}

interface ChartBarMultipleProps {
  data: LeadGenChartData[];
}

export function ChartAreaMultiple({ data }: ChartBarMultipleProps) {
  // Always call hooks first
  const [activeChart, setActiveChart] = useState<string>("");

  const { safeData, chartConfig, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { safeData: [], chartConfig: {}, total: {} };
    }

    const rawUsers = Object.keys(
      data.reduce((acc, cur) => ({ ...acc, ...cur }), {})
    ).filter((key) => key !== "date");

    const keyMap: Record<string, string> = {};
    rawUsers.forEach((u) => {
      keyMap[u] = u.replace(/[@.]/g, "_");
    });

    const safeData = data.map((d) => {
      const newObj: Record<string, any> = { date: d.date };
      rawUsers.forEach((u) => {
        newObj[keyMap[u]] = (d[u] as number) ?? 0;
      });
      return newObj;
    });

    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
    ];

    const chartConfig: ChartConfig = rawUsers.reduce((acc, user, idx) => {
      acc[keyMap[user]] = {
        label: user,
        color: colors[idx % colors.length],
      };
      return acc;
    }, {} as ChartConfig);

    const total: Record<string, number> = {};
    Object.keys(chartConfig).forEach((key) => {
      total[key] = safeData.reduce((sum, row) => sum + (row[key] as number), 0);
    });

    return { safeData, chartConfig, total };
  }, [data]);

  // Initialize activeChart after chartConfig is ready
  if (!activeChart && Object.keys(chartConfig).length > 0) {
    setActiveChart(Object.keys(chartConfig)[0]);
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Creation Trends</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex">
          {Object.keys(chartConfig).map((key) => {
            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key]?.toLocaleString() ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={safeData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
  dataKey="date"
  tickLine={false}
  axisLine={false}
  tickMargin={8}
  minTickGap={20}
  tickFormatter={(value) => {
    // Handle month-level data like "2025-05"
    if (/^\d{4}-\d{2}$/.test(value)) {
      const [year, month] = value.split("-");
      const monthName = new Date(Number(year), Number(month) - 1)
        .toLocaleString("en-US", { month: "short" });
      return `${monthName}`; // → "May 25"
    }

    // Fallback for day-level data like "2025-05-12"
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }}
/>
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            {activeChart && (
              <Bar
                dataKey={activeChart}
                fill={chartConfig[activeChart].color}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
