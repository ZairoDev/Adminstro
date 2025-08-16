"use client";

import { Pie, Label, PieChart } from "recharts";

import {
  Card,
  CardTitle,
  CardFooter,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A radial chart with a custom shape";

const chartConfig = {
  fresh: {
    label: "fresh",
    color: "hsl(var(--chart-1))",
  },
  rejected: {
    label: "rejected",
    color: "hsl(var(--chart-2))",
  },
  reminder: {
    label: "reminder",
    color: "hsl(var(--chart-3))",
  },
  closed: {
    label: "closed",
    color: "hsl(var(--chart-4))",
  },
  active: {
    label: "active",
    color: "hsl(var(--chart-5))",
  },
  declined: {
    label: "declined",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

interface RadialChartProps {
  heading: string;
  subHeading?: string;
  chartData: {
    label: string;
    count: number;
  }[];
  footer?: string;
  totalAverage: string;
  empAverage: string;
}

export function LeadCountPieChart({
  heading,
  subHeading,
  chartData,
  footer,
  totalAverage,
  empAverage
}: RadialChartProps) {
  const newChartData = chartData.map((item) => ({
    ...item,
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));
  const totalCount = newChartData.reduce((acc, curr) => acc + curr.count, 0);
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subHeading}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={newChartData}
              dataKey="count"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalCount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Leads
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className=" flex flex-wrap justify-between gap-1">
          {newChartData
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((item, index) => (
              <div key={index} className=" flex gap-x-1 items-center text-sm">
                <p
                  className={` w-3 h-3 rounded-full ${
                    item.label === "fresh"
                      ? "bg-[#265FD0]"
                      : item.label === "active"
                      ? "bg-[#E23670]"
                      : item.label === "rejected"
                      ? "bg-[#2EB88A]"
                      : item.label === "closed"
                      ? "bg-[#AA55D5]"
                      : "bg-[#E88C30]"
                  }`}
                />
                <p>
                  {item.label.slice(0, 1).toUpperCase() + item.label.slice(1)} (
                  {item.count})
                </p>
              </div>
            ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">{footer}</div>
      </CardFooter>
      {/* Bottom Right: Per Employee Info */}
      <div className="absolute bottom-32 right-2 flex flex-col items-center gap-1 text-white">
        <div className="text-lg font-bold leading-tight">
          {empAverage} / Emp
        </div>
        <div className="text-sm font-medium leading-tight text-gray-200">
          Leads Target
        </div>
      </div>

      {/* Top Right: Daily Info */}
      <div className="absolute top-16 right-2 flex flex-col items-center gap-1 text-white">
        <div className="text-lg font-bold leading-tight">
          {totalAverage} / Day
        </div>
        <div className="text-sm font-medium leading-tight text-gray-200">
          Required Total
        </div>
      </div>
    </Card>
  );  
}
