"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
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
  leads: {
    label: "Website Leads",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface WebsiteLeadsChartData {
  date: string;
  leads: number;
}

interface WebsiteLeadsLineChartProps {
  data: WebsiteLeadsChartData[];
  filters: { days?: string };
  onFilterChange: (value: string) => void;
  loading?: boolean;
  isError?: boolean;
  error?: string;
}

export function WebsiteLeadsLineChart({
  data,
  filters,
  onFilterChange,
  loading = false,
  isError = false,
  error = "",
}: WebsiteLeadsLineChartProps) {
  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          date: item.date,
          leads: item.leads ?? 0,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [data]
  );

  // Get totals for previous days and today
  const previousDaysTotal = chartData
    .slice(0, -1)
    .reduce((sum, item) => sum + (item.leads ?? 0), 0);

  const todayTotal =
    chartData.length > 0 ? chartData[chartData.length - 1].leads ?? 0 : 0;

  // Calculate total leads
  const totalLeads = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.leads, 0),
    [chartData]
  );

  return (
    <Card className="shadow-md rounded-2xl relative">
      <CardHeader>
        <CardTitle>Website Leads Analytics</CardTitle>
        <CardDescription>
          {filters?.days === "this month"
            ? "Current Month Overview"
            : filters?.days === "12 days"
            ? "Last 12 Days"
            : filters?.days === "1 year"
            ? "Last 1 Year"
            : filters?.days === "last 3 years"
            ? "Last 3 Years"
            : filters?.days}
        </CardDescription>

        <div className="text-xl font-medium text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">
            {previousDaysTotal}+{todayTotal}
          </span>
        </div>

        {/* Range Selector */}
        <CustomSelect
          itemList={["12 days", "this month", "1 year", "last 3 years"]}
          triggerText="Select range"
          defaultValue={filters?.days || "this month"}
          onValueChange={onFilterChange}
          triggerClassName="w-36 absolute right-4 top-4"
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
          <ChartContainer config={chartConfig} className="h-full w-full ">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
                left: 12,
                right: 12,
                bottom: 10,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (filters?.days === "last 3 years") return value;
                  if (filters?.days === "1 year") return value;
                  return value;
                }}
              />
              <YAxis domain={[0, "auto"]} />

              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as WebsiteLeadsChartData;
                    return (
                      <div className="bg-white dark:bg-gray-800 shadow-md p-3 rounded-lg border">
                        <p className="font-semibold mb-2">{label}</p>
                        <div className="space-y-1">
                          <p
                            className="text-sm"
                            style={{ color: chartConfig.leads.color }}
                          >
                            Website Leads: {data.leads}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Leads Line */}
              <Line
          
                dataKey="leads"
                type="natural"
                stroke="var(--color-leads)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-leads)",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              >
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Line>
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2 w-full">
            <div className="flex gap-2 leading-none font-medium">
              Total Website Leads: {totalLeads}{" "}
              <TrendingUp className="h-4 w-4" />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartConfig.leads.color }}
              />
              <span className="text-xs">Website Leads</span>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

