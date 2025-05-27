"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface LabelledBarChartProps {
  heading: string;
  subHeading?: string;
  chartData: {
    label: string;
    count: number;
  }[];
  footer?: string;
}

export function CustomLabelledBarChart({ heading, subHeading, chartData, footer }: LabelledBarChartProps) {
  return (
    <Card>
      <CardHeader className="p-1">
        <CardTitle className=" text-base ">{heading}</CardTitle>
        <CardDescription className=" text-xs">{subHeading}</CardDescription>
      </CardHeader>
      <CardContent className="">
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={8}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getQualityColor(entry.label)} />
              ))}
              <LabelList
                dataKey={"count"}
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
        <div className=" w-full flex justify-center gap-2 text-sm font-medium leading-none">
          {footer}
        </div>
      </CardFooter>
    </Card>
  )
}



// Helper function to get color based on quality
function getQualityColor(quality: string): string {
  switch (quality) {
    case "Very Good":
      return "#10b981" // green-500
    case "Good":
      return "#60a5fa" // blue-400
    case "Average":
      return "#f59e0b" // amber-500
    case "Below Average":
      return "#ef4444" // red-500
    default:
      return "#94a3b8" // slate-400
  }
}
