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
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Avatar, AvatarImage } from "../ui/avatar"


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

    const total = Object.values(flattenedCategories).reduce((acc, curr) => curr + acc, 0);

    return {
      label: item.label,
      ...flattenedCategories,
      total
    };
  })

  // sort in ascending order according to the label
  newChartData.sort((a, b) => a.label.localeCompare(b.label));
  let locationKeys: string[] = [];
  for (const key in newChartData) {
    Object.keys(newChartData[key]).forEach((location) => {
      if (location !== "label" && location !== "total") {
        if (!locationKeys.includes(location)) locationKeys.push(location);
      }
    });
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
              tickFormatter={(value) => `${value.split(" ")[0]?.trim()} ${value.split(" ")[1]?.slice(0, 1)}.`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            {/* <Bar
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
            >
              <LabelList dataKey={"total"} position={"top"} formatter={(value: number) => value.toString()} style={{ fontSize: "15px", fill: "white" }}
              // content={({ x, y, index }) => {
              //   if (typeof x !== 'number' || typeof y !== 'number') return null;
              //   const profile = "https://vacationsaga.b-cdn.net/ProfilePictures/59380681000000452.jpg"
              //   return (
              //     <image
              //       href={profile}
              //       x={x - 12}
              //       y={y - 40}
              //       width="24"
              //       height="24"
              //       style={{ borderRadius: "100%", }}
              //     />
              //   );
              // }}
              />
            </Bar> */}
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
