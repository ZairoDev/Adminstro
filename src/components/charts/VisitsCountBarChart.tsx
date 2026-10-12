"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import {
  Card,
  CardTitle,
  CardFooter,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartLegend,
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  // ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const chartConfig = {
  milan: {
    label: "milan",
    color: "hsl(var(--chart-1))",
  },
  athens: {
    label: "athens",
    color: "hsl(var(--chart-2))",
  },
  thessaloniki: {
    label: "thessaloniki",
    color: "hsl(var(--chart-3))",
  },
  rome: {
    label: "rome",
    color: "hsl(var(--chart-4))",
  },
  chania: {
    label: "chania",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface StackedBarChartProps {
  heading: string;
  subHeading?: string;
  chartData: {
    _id: string;
    count: number;
  }[];
  footer?: string;
}

export function VisitsCountBarChart({
  heading,
  subHeading,
  chartData,
  footer,
}: StackedBarChartProps) {
  // console.log("chart data in bar chart", chartData);
  const newChartData = chartData.map((item) => {
    const key = item._id?.toLowerCase();
    return {
      label: item._id,
      count: item.count,
      fill:
        chartConfig[key as keyof typeof chartConfig]?.color ||
        "hsl(var(--chart-4))",
    };
  });

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subHeading}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className=" max-h-[350px] w-full">
          <BarChart
            accessibilityLayer
            data={newChartData}
            margin={{
              top: 30,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            <Bar dataKey="count" fill="var(--color-primary)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">{footer}</div>
      </CardFooter>
    </Card>
  );
}
