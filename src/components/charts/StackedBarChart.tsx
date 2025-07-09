"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"

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
  // ChartLegendContent,
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
  rome: {
    label: "Rome",
    color: "hsl(var(--chart-4))",
  },
  milan: {
    label: "Milan",
    color: "hsl(var(--chart-5))",
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

    const total = Object.values(flattenedCategories).reduce((acc, curr) => curr + acc, 0);

    return {
      label: item.label,
      ...flattenedCategories,
      total
    };
  })

  // sort in ascending order according to the label
  newChartData.sort((a, b) => a.label?.localeCompare(b.label));
  let locationKeys: string[] = [];
  for (const key in newChartData) {
    Object.keys(newChartData[key]).forEach((location) => {
      if (location !== "label" && location !== "total") {
        if (!locationKeys.includes(location)) locationKeys.push(location);
      }
    });
  }

  const categoryTotals: Record<string, number> = {};
  for (const data of newChartData) {
    for (const key of locationKeys) {
      if (!categoryTotals[key]) categoryTotals[key] = 0;
      categoryTotals[key] += (data as any)[key] ?? 0;
    }
  }

  function CustomLegend({ config, categoryTotals }: {
    config: ChartConfig;
    categoryTotals: Record<string, number>;
  }) {
    return (
      <div className="flex gap-4 pt-4 justify-center">
        {Object.keys(config).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: config[key].color }}
            />
            <span className="text-sm text-muted-foreground">
              {config[key].label}: {categoryTotals[key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    );
  }


  return (
    <Card className=" w-full">
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
              tickFormatter={(value) => `${value.split(" ")[0]?.trim()} `}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            {locationKeys.map((location, index) => (
              <Bar
                key={location}
                dataKey={location}
                stackId="a"
                fill={`var(--color-${location})`}
                radius={[4, 4, 0, 0]}
                className="border-red-600"
              >
                <LabelList dataKey={"total"} position={"top"} formatter={(value: number) => value.toString()} style={{ fontSize: "15px", fill: "white" }} />
              </Bar>
            ))}
            {/* <ChartLegend content={<ChartLegendContent />} /> */}
            <ChartLegend content={<CustomLegend config={chartConfig} categoryTotals={categoryTotals} />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {footer}
        </div>
      </CardFooter>
    </Card >
  )
}
