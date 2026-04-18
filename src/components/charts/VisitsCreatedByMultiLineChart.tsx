"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";

type ChartRow = Record<string, number | string> & { date: string };

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function VisitsCreatedByMultiLineChart({
  data,
  creators,
  filters,
  onFilterChange,
  loading = false,
  isError = false,
  error = "",
}: {
  data: ChartRow[];
  creators: string[];
  filters: { days?: string };
  onFilterChange: (value: string) => void;
  loading?: boolean;
  isError?: boolean;
  error?: string;
}) {
  const chartData = useMemo(() => {
    // Ensure stable order by date key
    return [...data].sort(
      (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime(),
    );
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    creators.forEach((name, idx) => {
      config[name] = {
        label: name,
        color: COLORS[idx % COLORS.length],
      };
    });
    return config;
  }, [creators]);

  const hasData = chartData.length > 0 && creators.length > 0;

  return (
    <Card className="shadow-md rounded-2xl relative overflow-hidden">
      <CardHeader>
        <CardTitle>Visits created by candidate/agent</CardTitle>
        <CardDescription>
          {filters?.days || "12 days"} • grouped by visit created date
        </CardDescription>

        <CustomSelect
          itemList={["12 days", "this month", "last month", "1 year"]}
          triggerText="Select range"
          defaultValue={filters?.days || "12 days"}
          onValueChange={onFilterChange}
          triggerClassName="w-36 absolute right-4 top-4"
        />
      </CardHeader>

      <CardContent className="h-[420px] overflow-hidden">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Error: {error}</p>
        ) : !hasData ? (
          <p className="text-center text-muted-foreground">No data available</p>
        ) : (
          <div className="h-full w-full flex flex-col min-h-0">
            <ChartContainer
              config={chartConfig}
              className="flex-1 w-full min-h-0 aspect-auto overflow-hidden"
            >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, left: 12, right: 12, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={[0, "auto"]} />
              <ChartTooltip
                cursor={false}
                content={({ active, label, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  return (
                    <div className="bg-white dark:bg-gray-800 shadow-md p-3 rounded-lg border">
                      <p className="font-semibold mb-2">{label}</p>
                      <div className="space-y-1">
                        {payload
                          .filter((p) => typeof p.dataKey === "string")
                          .map((p) => (
                            <p
                              key={String(p.dataKey)}
                              className="text-sm flex items-center justify-between gap-3"
                            >
                              <span className="truncate" style={{ color: String(p.color) }}>
                                {String(p.dataKey)}
                              </span>
                              <span className="font-medium">{Number(p.value || 0)}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                  );
                }}
              />

              {creators.map((name, idx) => (
                <Line
                  key={name}
                  dataKey={name}
                  type="monotone"
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
            </ChartContainer>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-2 max-h-20 overflow-auto">
              {creators.map((name, idx) => (
                <div key={name} className="flex items-center gap-2 max-w-[240px]">
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

