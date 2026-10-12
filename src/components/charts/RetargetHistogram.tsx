"use client";

import { useMemo } from "react";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";

const chartConfig = {
  Owners: {
    label: "Owners",
    color: "#6366f1", // Indigo
  },
  Guests: {
    label: "Guests",
    color: "#22c55e", // Green
  },
  total: {
    label: "Total",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

interface HistogramData {
  date: string;
  Owners: number;
  Guests: number;
}

interface RetargetHistogramProps {
  data: HistogramData[];
  filters: {
    days?: string;
    location?: string;
  };
  onFilterChange: (filters: { days?: string; location?: string }) => void;
  loading?: boolean;
  isError?: boolean;
  error?: string;
}

export function RetargetHistogram({
  data,
  filters,
  onFilterChange,
  loading,
  isError,
  error,
}: RetargetHistogramProps) {
  const locations = ["All", "Athens", "Thessaloniki", "Chania", "Milan"];

  // Calculate totals for each bar and overall stats
  const { chartData, totalOwners, totalGuests } = useMemo(() => {
    const chartData = data.map((item) => ({
      ...item,
      total: item.Owners + item.Guests,
    }));
    const totalOwners = data.reduce((sum, item) => sum + item.Owners, 0);
    const totalGuests = data.reduce((sum, item) => sum + item.Guests, 0);
    return { chartData, totalOwners, totalGuests };
  }, [data]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold">Retargeting Overview</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-stone-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold">Retargeting Overview</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-red-500 text-xl">!</span>
            </div>
            <p className="text-red-500 font-medium">{error || "Failed to load data"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-stone-950 overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-200 dark:border-stone">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-green-500 bg-clip-text text-transparent">
              Retargeting Overview
            </CardTitle>
            <CardDescription className="mt-1">
              Owners and guests retargeted over time
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <CustomSelect
              itemList={["10 days", "this month", "last month", "year"]}
              triggerText="Duration"
              value={filters.days || "this month"}
              onValueChange={(value) => {
                onFilterChange({ ...filters, days: value });
              }}
              triggerClassName="w-[130px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow"
            />
            <CustomSelect
              itemList={locations}
              triggerText="Location"
              value={filters.location || "All"}
              onValueChange={(value) => {
                onFilterChange({ ...filters, location: value });
              }}
              triggerClassName="w-[130px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow"
            />
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartConfig.Owners.color }} />
            <span className="text-sm text-muted-foreground">Owners:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{totalOwners}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartConfig.Guests.color }} />
            <span className="text-sm text-muted-foreground">Guests:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{totalGuests}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalOwners + totalGuests}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-muted-foreground font-medium">No data available</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 20, left: 10, bottom: 40 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="hsl(var(--muted-foreground) / 0.2)"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => {
                  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }
                  if (/^\d{4}-\d{2}$/.test(value)) {
                    const [year, month] = value.split("-");
                    const monthName = new Date(Number(year), Number(month) - 1)
                      .toLocaleString("en-US", { month: "short" });
                    return `${monthName} '${year.slice(2)}`;
                  }
                  return value;
                }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={40}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }}
                content={
                  <ChartTooltipContent
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg"
                    formatter={(value, name) => (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: chartConfig[name as keyof typeof chartConfig]?.color }}
                        />
                        <span className="font-medium">{name}:</span>
                        <span className="font-bold">{value}</span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend 
                content={<ChartLegendContent />}
                wrapperStyle={{ paddingTop: '20px' }}
              />
              {/* Stacked Bars - Guests on bottom, Owners on top */}
              <Bar
                dataKey="Guests"
                stackId="retarget"
                fill={chartConfig.Guests.color}
                radius={[0, 0, 0, 0]}
                name="Guests"
                className="transition-all duration-200 hover:opacity-80"
              />
              <Bar
                dataKey="Owners"
                stackId="retarget"
                fill={chartConfig.Owners.color}
                radius={[4, 4, 0, 0]}
                name="Owners"
                className="transition-all duration-200 hover:opacity-80"
              >
                <LabelList
                  dataKey="total"
                  position="top"
                  className="fill-foreground"
                  fontSize={11}
                  fontWeight={600}
                  offset={8}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

