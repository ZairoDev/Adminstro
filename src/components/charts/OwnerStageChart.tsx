"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { stageLabel, type OwnerJourneyStage } from "@/lib/owner-journey";

export type OwnerStageCounts = Record<OwnerJourneyStage, number>;

const chartConfig = {
  stage1: { label: stageLabel(1), color: "hsl(var(--chart-1))" },
  stage2: { label: stageLabel(2), color: "hsl(var(--chart-2))" },
  stage3: { label: stageLabel(3), color: "hsl(var(--chart-3))" },
  stage4: { label: stageLabel(4), color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const STAGES: OwnerJourneyStage[] = [1, 2, 3, 4];

function normalizeStages(raw: unknown): OwnerStageCounts {
  const out: OwnerStageCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const s of STAGES) {
    const v = o[String(s)];
    out[s] = typeof v === "number" && !Number.isNaN(v) ? v : 0;
  }
  return out;
}

interface OwnerStageChartProps {
  stages: unknown;
  loading?: boolean;
}

export function OwnerStageChart({ stages, loading }: OwnerStageChartProps) {
  const counts = React.useMemo(() => normalizeStages(stages), [stages]);

  const chartData = React.useMemo(
    () =>
      STAGES.map((stage) => ({
        key: `stage${stage}`,
        stage,
        name: stageLabel(stage),
        count: counts[stage],
        fill: `var(--color-stage${stage})`,
      })),
    [counts],
  );

  const total = chartData.reduce((acc, c) => acc + c.count, 0);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Loading owner stages…
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        No owners in this view for the selected site.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="name" />} />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            innerRadius={56}
            strokeWidth={2}
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
                        className="fill-foreground text-2xl font-bold"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        owners
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {chartData.map((item) => {
          const cssVar =
            item.stage === 1
              ? "hsl(var(--chart-1))"
              : item.stage === 2
                ? "hsl(var(--chart-2))"
                : item.stage === 3
                  ? "hsl(var(--chart-3))"
                  : "hsl(var(--chart-4))";
          return (
            <li key={item.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cssVar }} />
              <span>
                {item.name}: <span className="font-medium text-foreground">{item.count}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
