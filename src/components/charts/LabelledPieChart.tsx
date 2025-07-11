"use client";

import { Pie, PieChart } from "recharts";
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

export const description = "A pie chart with a label";

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  athens: {
    label: "athens",
    color: "hsl(var(--chart-1))",
  },
  thessaloniki: {
    label: "thessaloniki",
    color: "hsl(var(--chart-2))",
  },
  chania: {
    label: "chania",
    color: "hsl(var(--chart-3))",
  },
  rome: {
    label: "rome",
    color: "hsl(var(--chart-4))",
  },
  milan: {
    label: "milan",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface LabelledPieChartProps {
  heading: string;
  subHeading?: string;
  chartData: {
    label: string;
    count: number;
  }[];
  footer?: string;
}

export function LabelledPieChart({
  heading,
  subHeading,
  chartData,
  footer,
}: LabelledPieChartProps) {
  const router = useRouter();

  const newChartData = chartData.map((item, index) => ({
    ...item,
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));

  const handlePieClick = (data: any) => {
    router.push(`/dashboard/lead-location-group/${data.label}`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-4">
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{subHeading}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 ">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[270px] p-0 w-[300px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={newChartData}
              dataKey="count"
              label
              nameKey="label"
              onClick={handlePieClick}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">{footer}</div>
        <div>
          Total Leads: {chartData.reduce((acc, item) => acc + item.count, 0)}
        </div>
      </CardFooter>
    </Card>
  );
}
