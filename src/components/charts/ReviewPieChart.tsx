"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { BarChart3, Star } from "lucide-react";

import {
  ChartConfig,
  ChartTooltip,
  ChartContainer,
} from "@/components/ui/chart";

type QualityKey =
  | "Good"
  | "Very Good"
  | "Average"
  | "Below Average"
  | "Not Reviewed";

type ReviewRawItem = {
  _id: string | null;
  count: number;
};

type NotReviewedBreakdownItem = {
  messageStatus: string;
  salesPriority: string;
  count: number;
  percent: number;
};

type ReviewSlice = {
  label: QualityKey;
  count: number;
  fill: string;
  percent: number;
};

const CHART_CONFIG = {
  "Very Good": { label: "Very Good", color: "hsl(271 81% 56%)" },
  Good: { label: "Good", color: "hsl(160 84% 39%)" },
  Average: { label: "Average", color: "hsl(45 93% 47%)" },
  "Below Average": { label: "Below Average", color: "hsl(24 95% 55%)" },
  "Not Reviewed": { label: "Not Reviewed", color: "hsl(199 89% 52%)" },
} satisfies ChartConfig;

const QUALITY_ORDER: QualityKey[] = [
  "Very Good",
  "Good",
  "Average",
  "Below Average",
  "Not Reviewed",
];

function normalizeLabel(id: string | null): QualityKey {
  if (!id) return "Not Reviewed";
  const key = id as QualityKey;
  if (QUALITY_ORDER.includes(key)) return key;
  return "Not Reviewed";
}

function cardSeverityClasses(label: QualityKey): {
  border: string;
  value: string;
} {
  switch (label) {
    case "Below Average":
      return { border: "border-red-500/80", value: "text-red-400" };
    case "Average":
      return { border: "border-amber-500/70", value: "text-amber-400" };
    case "Not Reviewed":
      return { border: "border-amber-600/55", value: "text-amber-300" };
    case "Good":
      return { border: "border-emerald-500/55", value: "text-emerald-400" };
    case "Very Good":
      return { border: "border-teal-400/55", value: "text-teal-300" };
    default:
      return { border: "border-zinc-600", value: "text-zinc-300" };
  }
}

type ReviewTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ReviewSlice }>;
};

function ReviewDonutTooltip({ active, payload }: ReviewTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-100 shadow-lg">
      <p className="font-medium">{row.label}</p>
      <p className="tabular-nums text-zinc-400">
        {row.count.toLocaleString()} ({row.percent}%)
      </p>
    </div>
  );
}

function parseChartData(chartData: ReviewRawItem[]): ReviewSlice[] {
  const total = chartData.reduce((acc, item) => acc + (item.count ?? 0), 0);
  return chartData.map((item) => {
    const label = normalizeLabel(item._id);
    const count = item.count ?? 0;
    return {
      label,
      count,
      fill: CHART_CONFIG[label].color,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export const ReviewPieChart = ({
  chartData,
  notReviewedBreakdown,
}: {
  chartData: ReviewRawItem[] | undefined;
  notReviewedBreakdown?: NotReviewedBreakdownItem[];
}) => {
  const data = useMemo(
    () => (chartData?.length ? parseChartData(chartData) : []),
    [chartData],
  );

  const sortedForAnalysis = useMemo(
    () => [...data].sort((a, b) => b.count - a.count),
    [data],
  );

  const total = useMemo(
    () => data.reduce((acc, item) => acc + item.count, 0),
    [data],
  );

  const reviewed = useMemo(
    () =>
      data
        .filter((item) => item.label !== "Not Reviewed")
        .reduce((acc, item) => acc + item.count, 0),
    [data],
  );

  const usable = useMemo(
    () =>
      data
        .filter(
          (item) =>
            item.label !== "Below Average" && item.label !== "Not Reviewed",
        )
        .reduce((acc, item) => acc + item.count, 0),
    [data],
  );

  const usablePercentage =
    reviewed > 0 ? Math.round((usable / reviewed) * 100) : 0;

  const notReviewedTotal =
    data.find((d) => d.label === "Not Reviewed")?.count ?? 0;

  const notReviewedSegmentation = [...(notReviewedBreakdown ?? [])].sort(
    (a, b) => b.count - a.count,
  );

  const topNotReviewed = notReviewedSegmentation.slice(0, 9);
  const remainingNotReviewed = Math.max(
    0,
    notReviewedSegmentation.length - topNotReviewed.length,
  );

  const priorityCardStyle = (priority: string) => {
    const p = (priority ?? "None").toLowerCase();
    if (p === "high") {
      return { border: "border-emerald-500/70", value: "text-emerald-300" };
    }
    if (p === "medium") {
      return { border: "border-amber-500/70", value: "text-amber-300" };
    }
    if (p === "low") {
      return { border: "border-sky-500/60", value: "text-sky-300" };
    }
    if (p === "nr") {
      return { border: "border-fuchsia-500/70", value: "text-fuchsia-300" };
    }
    return { border: "border-zinc-700", value: "text-zinc-300" };
  };

  if (!chartData || data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex items-center justify-center min-h-[280px]">
        <p className="text-sm text-zinc-500">No review data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        {/* Donut + legend */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-zinc-400" aria-hidden />
            <h3 className="text-base font-semibold text-zinc-100">
              Review Status Distribution
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative w-full max-w-[280px] aspect-square shrink-0">
              <ChartContainer
                config={CHART_CONFIG}
                className="h-full w-full [&_.recharts-layer]:outline-none"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      content={(props) => (
                        <ReviewDonutTooltip
                          active={props.active}
                          payload={
                            props.payload as Array<{ payload?: ReviewSlice }>
                          }
                        />
                      )}
                    />
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke="hsl(240 6% 10%)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none">
                  {total.toLocaleString()}
                </span>
                <span className="text-sm text-zinc-500 mt-1">Leads</span>
              </div>
            </div>

            <div className="flex sm:flex-col gap-6 sm:gap-8 sm:pt-6 text-center sm:text-left">
              <div>
                <p className="text-2xl font-bold text-white tabular-nums leading-none">
                  {reviewed.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Reviewed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tabular-nums leading-none">
                  {usablePercentage}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Usable ({usable.toLocaleString()})
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-zinc-800">
            {QUALITY_ORDER.filter((key) =>
              data.some((d) => d.label === key),
            ).map((key) => {
              const slice = data.find((d) => d.label === key);
              if (!slice) return null;
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 text-xs text-zinc-300"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span>
                    {key}{" "}
                    <span className="text-zinc-500 tabular-nums">
                      ({slice.count.toLocaleString()})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quality analysis grid */}
        <div className="flex-1 min-w-0 xl:max-w-[52%]">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber-400" aria-hidden />
            <h3 className="text-base font-semibold text-zinc-100">
              Review Quality Analysis
              <span className="text-zinc-500 font-normal ml-1">
                ({total.toLocaleString()} total)
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {sortedForAnalysis.map((item) => {
              const severity = cardSeverityClasses(item.label);
              return (
                <div
                  key={item.label}
                  className={`rounded-lg border bg-zinc-900/80 px-3 py-2.5 ${severity.border}`}
                >
                  <p
                    className={`text-lg font-bold tabular-nums leading-tight ${severity.value}`}
                  >
                    {item.count.toLocaleString()}{" "}
                    <span className="text-sm font-semibold opacity-90">
                      ({item.percent}%)
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 leading-snug">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>

          {notReviewedSegmentation.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Not Reviewed Breakdown
                </h3>
                <span className="text-xs text-zinc-500 font-normal">
                  ({notReviewedTotal.toLocaleString()})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {topNotReviewed.map((item) => {
                  const st = priorityCardStyle(item.salesPriority);
                  return (
                    <div
                      key={`${item.messageStatus}::${item.salesPriority}`}
                      className={`rounded-lg border bg-zinc-900/70 px-3 py-2 ${st.border}`}
                    >
                      <p
                        className={`text-lg font-bold tabular-nums leading-tight ${st.value}`}
                      >
                        {item.count.toLocaleString()}{" "}
                        <span className="text-xs font-semibold text-zinc-400">
                          ({item.percent}%)
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 leading-snug">
                        {item.messageStatus} • {item.salesPriority}
                      </p>
                    </div>
                  );
                })}
              </div>

              {remainingNotReviewed > 0 ? (
                <p className="text-xs text-zinc-600 mt-2">
                  +{remainingNotReviewed} more
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
