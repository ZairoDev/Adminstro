"use client"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardTitle,
  CardFooter,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import {
  ChartLegend,
  ChartConfig,
  ChartTooltip,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart"


const chartConfig = {
  athens: {
    label: "Athens",
    color: "hsl(var(--chart-1))",
  },
  thessaloniki: {
    label: "Thessaloniki",
    color: "hsl(var(--chart-2))",
  },
  chania: {
    label: "Chania",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig


interface StackedBarChartProps {
  heading: string;
  subHeading?: string;
  chartData: {
    label: string;
    categories: { field: string; count: number }[]
  }[];
  footer?: string;
}


export function CustomStackBarChart({
  heading,
  subHeading,
  chartData,
  footer
}: StackedBarChartProps) {

  const newChartData = chartData.map((item) => {
    const flattenedCategories = item.categories.reduce((acc, category) => {
      const [key, value] = Object.entries(category);
      acc[key[1]] = value[1] as number;
      return acc;
    }, {} as Record<string, number>);

    return {
      label: item.label,
      ...flattenedCategories
    };
  })

  // sort in ascending order according to the label
  newChartData.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Card className=" w-2/3 relative">
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subHeading}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={newChartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // tickFormatter={(value) => value.slice(0, 8)}
              tickFormatter={(value) => `${value.split(" ")[0]?.trim()} ${value.split(" ")[1]?.slice(0, 1)}.`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="athens"
              stackId="a"
              fill="var(--color-athens)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="thessaloniki"
              stackId="a"
              fill="var(--color-thessaloniki)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="chania"
              stackId="a"
              fill="var(--color-chania)"
              radius={[4, 4, 0, 0]}
            />

          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {footer}
        </div>
      </CardFooter>
    </Card>
  )
}
