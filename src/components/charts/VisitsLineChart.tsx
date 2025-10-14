"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
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

export const description = "Unregistered owners registered in the last 12 days"

interface VisitData {
  date: string
  count: number
}

// Example data — replace this with your API data
const chartData: VisitData[] = [
  { date: "Oct 3", count: 8 },
  { date: "Oct 4", count: 12 },
  { date: "Oct 5", count: 7 },
  { date: "Oct 6", count: 14 },
  { date: "Oct 7", count: 10 },
  { date: "Oct 8", count: 18 },
  { date: "Oct 9", count: 16 },
  { date: "Oct 10", count: 22 },


]

const chartConfig = {
  count: {
    label: "Registered Owners",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function ChartLineDefault() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Owner Registrations</CardTitle>
        <CardDescription>Last 12 Days</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 12.5% this week <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing the number of unregistered owners registered over the last 12 days
        </div>
      </CardFooter>
    </Card>
  )
}
