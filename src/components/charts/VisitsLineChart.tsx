"use client";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
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

interface LineChartData {
  date: string;
  owners: number;
}

interface LineChartProps {
  title: string;
  description?: string;
  data: LineChartData[];
  dataKey?: string;
  label?: string;
  color?: string;
  trendText?: string;
  showFooter?: boolean;
}

export function ReusableLineChart({
  title,
  description,
  data,
  dataKey = "owners",
  label = "Owners",
  color = "hsl(var(--chart-2))",
}: LineChartProps) {
  const chartConfig = {
    [dataKey]: {
      label,
      color,
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full h-full flex flex-col justify-evenly">
      <CardHeader className="">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="  p-2">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickMargin={10}
              height={60} // give space for rotated labels
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="end"
                  transform={`rotate(-65, ${x}, ${y + 10})`}
                  style={{
                    fontSize: "10px",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                >
                  {payload.value}
                </text>
              )}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey={dataKey}
              type="monotone"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
