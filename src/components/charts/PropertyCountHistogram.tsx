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
  ChartTooltipContent,
} from "@/components/ui/chart";

export const chartConfig = {
  "Short Term": {
    label: "Short Term",
    color: "hsl(var(--chart-1))",
  },
  "Long Term": {
    label: "Long Term",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface HistogramProps {
  heading: string;
  subHeading?: string;
  chartData: {
  country?: string;
  "Short Term": number;
  "Long Term": number;
  total?: number;
  city?: string
  }[];
  footer?: string;
}

export function PropertyCountHistogram({
  heading,
  subHeading,
  chartData,
  footer,
}: HistogramProps) {
  const newChartData = chartData.map((item) => ({
    ...(item.city || item.country
      ? { label: item.city ?? item.country }
      : {}),
    "Short Term": item["Short Term"],
    "Long Term": item["Long Term"],
    total: item.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subHeading}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[350px] w-full">
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
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <ChartLegend /> 

            <Bar
              dataKey="Short Term"
              stackId="a"
              fill={chartConfig["Short Term"].color}
              radius={[0, 0, 0, 0]}
            >
              <LabelList
                position="top"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
            <Bar
              dataKey="Long Term"
              stackId="a"
              fill={chartConfig["Long Term"].color}
              radius={[8, 8, 0, 0]}
            >
              <LabelList
                position="top"
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
