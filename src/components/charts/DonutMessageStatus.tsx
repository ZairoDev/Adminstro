import React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Type definitions
interface CityData {
  [city: string]: number;
}

interface MessageStatusData {
  First: CityData;
  Second: CityData;
  Third: CityData;
  Fourth: CityData;
  Options: CityData;
  Visit: CityData;
}

interface DonutChartProps {
  title: string;
  data: CityData;
}

interface CityStatsChartsProps {
  data?: MessageStatusData | null;
}

// Color configuration for cities
const cityColors: { [key: string]: string } = {
  athens: "hsl(var(--chart-1))",
  chania: "hsl(var(--chart-2))",
  thessaloniki: "hsl(var(--chart-3))",
  milan: "hsl(var(--chart-4))",
};

const chartConfig = {
  value: {
    label: "Value",
  },
  athens: {
    label: "Athens",
    color: "hsl(var(--chart-1))",
  },
  chania: {
    label: "Chania",
    color: "hsl(var(--chart-2))",
  },
  thessaloniki: {
    label: "Thessaloniki",
    color: "hsl(var(--chart-3))",
  },
  milan: {
    label: "Milan",
    color: "hsl(var(--chart-4))",
  },
};

function DonutChart({ title, data }: DonutChartProps) {
  const chartData = Object.entries(data).map(([city, value]) => ({
    city: city,
    value: value,
    fill: cityColors[city] || "hsl(var(--chart-5))",
    label: city.charAt(0).toUpperCase() + city.slice(1),
  }));

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  // Show chart even if total is 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>
          {{
            First: "First Message",
            Second: "Second Message",
            Third: "Third Message",
            Fourth: "Fourth Message",
            Options: "Options",
            Visits: "Visits",
          }[title] || title}
        </CardTitle>

        {/* <CardDescription> C i t y D i s t r i b u t i o n </CardDescription> */}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {total === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No data
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none text-center">
          Distribution across {Object.keys(data).length} cities
        </div>
      </CardFooter>
    </Card>
  );
}

export default function CityStatsCharts({ data }: CityStatsChartsProps) {
  // Handle null/undefined data
  if (!data) {
    return (
      <div className="w-full p-8 bg-background">
        <div className="text-center text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  // Define the order and show all categories (even empty ones)
  const orderedCategories: (keyof MessageStatusData)[] = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Options",
    "Visit",
  ];

  const categories: [string, CityData][] = orderedCategories.map((key) => [
    key,
    data[key] || {},
  ]);

  return (
    <div className="w-full p-8 bg-background">
      <h1 className="text-3xl font-bold mb-8 text-center">
        City Statistics Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(([categoryName, cityData]) => (
          <DonutChart key={categoryName} title={categoryName} data={cityData} />
        ))}
      </div>
    </div>
  );
}
