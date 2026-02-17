"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart3 } from "lucide-react";

interface CityVisitsChartProps {
  chartData: {
    location: string;
    visits: number;
  }[];
  title?: string;
  description?: string;
}

const chartConfig = {
  visits: {
    label: "Visits",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function CityVisitsChart({
  chartData,
  title = "City Visit Stats",
  description = "Top cities by visit count",
}: CityVisitsChartProps) {         
  return (
    <Card className="w-full h-full flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300">
  <CardHeader className="pb-4 space-y-2">
    <div>
      <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {title}
      </CardTitle>
      <CardDescription className="text-sm text-muted-foreground">
        {description}
      </CardDescription>
    </div>

    <div className="flex items-center justify-between border-t border-border pt-2">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total Visits</span>
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {chartData.reduce((acc, d) => acc + d.visits, 0).toLocaleString()}
        </span>
      </div>

      <div className="flex flex-col text-right">
        <span className="text-xs text-muted-foreground">Top City</span>
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {chartData.length > 0
            ? chartData.reduce((a, b) => (a.visits > b.visits ? a : b)).location
            : "—"}
        </span>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pb-4">
    <ChartContainer config={chartConfig} className="w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
        barCategoryGap={10}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
          </linearGradient>
        </defs>

        <CartesianGrid
          horizontal={false}
          vertical={true}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          opacity={0.3}
        />
        <YAxis
          dataKey="location"
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          width={100}
          tick={{
            fill: "hsl(var(--foreground))",
            fontSize: 12,
            fontWeight: 500,
          }}
        />
        <XAxis
          dataKey="visits"
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
          content={<ChartTooltipContent indicator="line" labelKey="location" />}
        />
        <Bar
          dataKey="visits"
          fill="url(#barGradient)"
          radius={[0, 6, 6, 0]}
          maxBarSize={32}
          className="transition-all duration-300 hover:opacity-80"
        >
          <LabelList
            dataKey="visits"
            position="right"
            offset={10}
            content={(props) => {
              const { x = 0, y = 0, width = 0, height = 0, value } = props as any;
              const display =
                typeof value === "number" ? value.toLocaleString() : value ?? "";
              return (
                <text
                  x={x + width + 6}
                  y={y + height / 2}
                  dy={4}
                  fill="hsl(var(--foreground))"
                  fontSize={12}
                  fontWeight={600}
                >
                  {display}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  </CardContent>
</Card>

  );
}

export default CityVisitsChart;
