"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useRouter } from "next/navigation";

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

export const description = "A histogram (bar chart) with labels";

const chartConfig = {
  count: {
    label: "Leads",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type LocationDatum = {
  label: string;
  count: number;
};

interface LabelledPieChartProps {
  heading: string;
  subHeading?: string;
  chartData: LocationDatum[];
  footer?: string;
}

export function LabelledPieChart({
  heading,
  subHeading,
  chartData,
  footer,
}: LabelledPieChartProps) {
  const router = useRouter();

  const newChartData: LocationDatum[] = [...chartData].sort(
    (a, b) => b.count - a.count,
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle>{heading}</CardTitle>
        {subHeading ? <CardDescription>{subHeading}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <ChartContainer
          config={chartConfig}
          className="h-[280px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={newChartData}
            margin={{ top: 10, right: 12, left: 0, bottom: 50 }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.6)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              angle={-30}
              textAnchor="end"
              height={55}
              fontSize={11}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              width={36}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey="count"
              fill={chartConfig.count.color}
              radius={[6, 6, 2, 2]}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={(payload) => {
                const label = (payload?.payload as LocationDatum | undefined)
                  ?.label;
                if (!label) return;
                router.push(`/dashboard/lead-location-group/${label}`);
              }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">{footer}</div>
        <div>
          Total : {chartData.reduce((acc, item) => acc + item.count, 0)}
        </div>
      </CardFooter>
    </Card>
  );
}
