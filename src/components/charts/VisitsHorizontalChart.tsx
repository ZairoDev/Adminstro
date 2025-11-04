"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface CityVisitsChartProps {
  chartData: {
    location: string
    visits: number
  }[]
  title?: string
  description?: string
}

const chartConfig = {
  visits: {
    label: "Visits",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function CityVisitsChart({
  chartData,
  title = "City Visit Stats",
  description = "Top cities by visit count",
}: CityVisitsChartProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid horizontal={false} vertical={true} />
            <YAxis
              dataKey="location"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={120}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <XAxis
              dataKey="visits"
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={<ChartTooltipContent indicator="line" labelKey="location" />}
            />
            <Bar dataKey="visits" fill="var(--color-visits)" radius={[0, 6, 6, 0]} maxBarSize={36}>
              {/* Remove location labels inside bars to prevent overlap; show only numeric values on the right */}
              <LabelList
                dataKey="visits"
                position="right"
                offset={12}
                content={(props) => {
                  const { x = 0, y = 0, width = 0, height = 0, value } = props as any
                  const display = typeof value === "number" ? value.toLocaleString() : (value ?? "")
                  return (
                    <text x={x + width + 8} y={y + height / 2} dy={4} fill="hsl(var(--foreground))" fontSize={12}>
                      {display}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
