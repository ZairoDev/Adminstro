"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { useMemo } from "react";

const chartConfig = {
  newBoosts: {
    label: "New Boosts",
    color: "hsl(var(--chart-1))",
  },
  reboosts: {
    label: "Re-Boosts",
    color: "hsl(var(--chart-2))",
  },
  posted: {
    label: "Posted",
    color: "hsl(var(--chart-3))",
  },
 
  total: {
    label: "Total",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface BoostChartData {
  date: string;
  total: number;
  newBoosts: number;
  reboosts: number;
  posted: number;
}

interface ChartLineMultipleProps {
  data: BoostChartData[];
  filters: { days?: string };
  onFilterChange: (value: string) => void;
  loading?: boolean;
  isError?: boolean;
  error?: string;
}

export function BoostMultiLineChart({
  data,
  filters,
  onFilterChange,
  loading = false,
  isError = false,
  error = "",
}: ChartLineMultipleProps) {
  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          date: item.date,
          newBoosts: item.newBoosts ?? 0,
          reboosts: item.reboosts ?? 0,
          posted: item.posted ?? 0,
          total: item.total ?? 0,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [data]
  );

  // Total of all days (previous 11 + today)
// Get totals for previous 11 days and today's data
const previousElevenDaysTotal = chartData
  .slice(0, -1) // all except last day
  .reduce((sum, item) => sum + (item.total ?? 0), 0);

const todayTotal = chartData.length > 0 ? chartData[chartData.length - 1].total ?? 0 : 0;


  // Calculate statistics
  const totalBoosts = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.total, 0),
    [chartData]
  );

  const totalPosted = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.posted, 0),
    [chartData]
  );

  const postedPercentage = useMemo(
    () => (totalBoosts > 0 ? ((totalPosted / totalBoosts) * 100).toFixed(1) : 0),
    [totalBoosts, totalPosted]
  );

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle>Property Boost Analytics</CardTitle>
        <CardDescription>{filters?.days || "Last 12 Days"}</CardDescription>

        <div className="text-xl font-medium text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">
                {previousElevenDaysTotal}+{todayTotal}
              </span>
            </div>

        {/* Range Selector */}
        <CustomSelect
          itemList={["12 days", "1 year", "last 3 years"]}
          triggerText="Select range"
          defaultValue={filters?.days || "12 days"}
          onValueChange={onFilterChange}
          triggerClassName="w-32 absolute right-2 top-2"
        />
      </CardHeader>

      <CardContent className="h-[400px]">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Error: {error}</p>
        ) : chartData.length === 0 ? (
          <p className="text-center text-muted-foreground">No data available</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
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
                tickFormatter={(value) => {
                  if (filters?.days === "last 3 years") return value; // Year
                  if (filters?.days === "1 year") return value; // Month
                  return value; // Day + Month
                }}
              />
              <YAxis />

              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as BoostChartData;
                    return (
                      <div className="bg-white dark:bg-gray-800 shadow-md p-3 rounded-lg border">
                        <p className="font-semibold mb-2">{label}</p>
                        <div className="space-y-1">
                          <p
                            className="text-sm"
                            style={{ color: chartConfig.newBoosts.color }}
                          >
                            New Boosts: {data.newBoosts}
                          </p>
                          <p
                            className="text-sm"
                            style={{ color: chartConfig.reboosts.color }}
                          >
                            Re-Boosts: {data.reboosts}
                          </p>
                          <p
                            className="text-sm"
                            style={{ color: chartConfig.posted.color }}
                          >
                            Posted: {data.posted}
                          </p>
                          {/* <p className="text-sm" style={{ color: chartConfig.notPosted.color }}>
                            Not Posted: {data.notPosted}
                          </p> */}
                          <p className="text-sm font-bold border-t pt-1 mt-1">
                            Total: {data.total}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Total Line */}
              <Line
                dataKey="total"
                type="monotone"
                stroke="var(--color-total)"
                strokeWidth={3}
                dot={{ fill: "var(--color-total)", r: 4 }}
                activeDot={{ r: 6 }}
              />

              {/* New Boosts Line */}
              <Line
                dataKey="newBoosts"
                type="monotone"
                stroke="var(--color-newBoosts)"
                strokeWidth={2}
                dot={{ fill: "var(--color-newBoosts)", r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* Re-Boosts Line */}
              <Line
                dataKey="reboosts"
                type="monotone"
                stroke="var(--color-reboosts)"
                strokeWidth={2}
                dot={{ fill: "var(--color-reboosts)", r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* Posted Line */}
              <Line
                dataKey="posted"
                type="monotone"
                stroke="var(--color-posted)"
                strokeWidth={2}
                dot={{ fill: "var(--color-posted)", r: 3 }}
                activeDot={{ r: 5 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2 w-full">
            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.total.color }}
                />
                <span className="text-xs">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.newBoosts.color }}
                />
                <span className="text-xs">New Boosts</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.reboosts.color }}
                />
                <span className="text-xs">Re-Boosts</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2"
                  style={{ borderColor: chartConfig.posted.color }}
                />
                <span className="text-xs">Posted</span>
              </div>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}