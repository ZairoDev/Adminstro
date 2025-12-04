"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getLocationWeeklyTargets } from "@/actions/(VS)/queryActions";

type WeekData = {
  weekNumber: number;
  weekLabel: string;
  achieved: number;
  startDate: string;
  endDate: string;
};

type LocationTargetData = {
  location: string;
  monthlyTarget: number;
  weeks: WeekData[];
};

type TargetTableResponse = {
  locations: LocationTargetData[];
  month: string;
  year: number;
  viewMode: "weekly" | "10-day";
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const WeeklyTargetTable = () => {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "10-day">("weekly");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [data, setData] = useState<TargetTableResponse | null>(null);

  // fetch data whenever viewMode / month / year changes
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        console.log("📤 Fetching target data", {
          viewMode,
          month: selectedMonth,
          year: selectedYear,
        });
        setLoading(true);
        const resp = await getLocationWeeklyTargets({
          viewMode,
          month: selectedMonth,
          year: selectedYear,
        });
        if (!mounted) return;
        console.log("📥 Received target data", resp);
        setData(resp);
      } catch (err: any) {
        if (controller.signal.aborted) {
          console.log("⏹ Fetch aborted");
          return;
        }
        console.error("❌ Error fetching target data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [viewMode, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // utility: inclusive days between two ISO date strings
  const daysInclusive = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    // normalize to midnight UTC to avoid DST issues
    const sUtc = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eUtc = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    return Math.round((eUtc - sUtc) / MS_PER_DAY) + 1;
  };

  // Determine maximum number of periods across locations (safe)
  const maxPeriods = useMemo(() => {
    if (!data?.locations || data.locations.length === 0) return 0;
    return Math.max(...data.locations.map((loc) => loc.weeks?.length || 0));
  }, [data]);

  // totals for summary cards
  const { totalTarget, totalAchieved, overallPercentage } = useMemo(() => {
    const tTarget =
      data?.locations.reduce((s, loc) => s + (loc.monthlyTarget || 0), 0) || 0;
    const tAchieved =
      data?.locations.reduce(
        (s, loc) =>
          s + (loc.weeks?.reduce((ws, w) => ws + (w.achieved || 0), 0) || 0),
        0
      ) || 0;
    const overall =
      tTarget > 0 ? Number(((tAchieved / tTarget) * 100).toFixed(1)) : 0;
    return {
      totalTarget: tTarget,
      totalAchieved: tAchieved,
      overallPercentage: overall,
    };
  }, [data]);

  // Calculate period targets using proportional-by-days method (Option B).
  // We'll compute the total days in month using selectedMonth/year.
  const periodTargetsByLocation = useMemo(() => {
    if (!data) return new Map<string, number[]>();

    // days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const map = new Map<string, number[]>();

    for (const loc of data.locations) {
      // calculate days per period from the weeks array for this location
      const daysArray = (loc.weeks || []).map((w) =>
        Math.max(1, daysInclusive(w.startDate, w.endDate))
      );

      const totalDaysFromPeriods =
        daysArray.reduce((s, d) => s + d, 0) || daysInMonth;

      // fallback: if periods don't sum to daysInMonth, normalize to daysInMonth
      const normalizeFactor =
        totalDaysFromPeriods !== 0 ? daysInMonth / totalDaysFromPeriods : 1;

      const targets = daysArray.map((d) => {
        const proportion = (d * normalizeFactor) / daysInMonth; // fraction of month
        const periodTargetRaw = (loc.monthlyTarget || 0) * proportion;
        return Number(periodTargetRaw); // keep as number for further math
      });

      // if weeks are empty, create one period = monthlyTarget
      if (targets.length === 0) {
        map.set(loc.location, [loc.monthlyTarget || 0]);
      } else {
        map.set(loc.location, targets);
      }
    }

    return map;
  }, [data, selectedMonth, selectedYear]);    

  // Compute total achieved and target per period
  const totalAchievedPerPeriod = useMemo(() => {
    const totals = Array(maxPeriods).fill(0);
    data?.locations.forEach((loc) => {
      loc.weeks.forEach((week, idx) => {
        if (idx < maxPeriods) totals[idx] += week.achieved || 0;
      });
    });
    return totals;
  }, [data, maxPeriods]);

  const totalTargetPerPeriod = useMemo(() => {
    const totals = Array(maxPeriods).fill(0);
    periodTargetsByLocation.forEach((targets) => {
      targets.forEach((target, idx) => {
        if (idx < maxPeriods) totals[idx] += target;
      });
    });
    return totals;
  }, [periodTargetsByLocation, maxPeriods]);

  // helpers for UI color / percent
  const getAchievementColor = (achieved: number, target: number) => {
    const percentage = target <= 0 ? 0 : (achieved / target) * 100;
    if (percentage >= 100) return "bg-green-50 dark:bg-green-950/30";
    if (percentage >= 75) return "bg-blue-50 dark:bg-blue-950/30";
    if (percentage >= 50) return "bg-yellow-50 dark:bg-yellow-950/30";
    return "bg-gray-50 dark:bg-gray-800/30";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-700 dark:text-green-400";
    if (percentage >= 75) return "text-blue-700 dark:text-blue-400";
    if (percentage >= 50) return "text-yellow-700 dark:text-yellow-400";
    return "text-gray-700 dark:text-gray-400";
  };

  const getPercentage = (achieved: number, target: number) => {
    if (!target || target === 0) return 0;
    const pct = (achieved / target) * 100;
    return Number(pct.toFixed(1));
  };

  const colorMap = {
    emerald: "#22c55e", // green
    sky: "#3b82f6", // blue
    amber: "#eab308", // yellow
    rose: "#6b7280", // gray
  };

  const getFillColor = (percentage: number) => {
    if (percentage >= 100) return colorMap.emerald;
    if (percentage >= 75) return colorMap.sky;
    if (percentage >= 50) return colorMap.amber;
    return colorMap.rose;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
              Target Performance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track location achievements across time periods
            </p>
          </div>
        </div>

        {/* Controls Card */}
        <div className="bg-white dark:bg-stone-950 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl bg-white dark:bg-stone-950 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center min-w-[160px]">
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {monthNames[selectedMonth]} {selectedYear}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {viewMode === "weekly"
                    ? `${maxPeriods} weeks`
                    : `${maxPeriods} periods`}
                </p>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl bg-white dark:bg-stone-950 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex gap-2 bg-white dark:bg-stone-950 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode("weekly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "weekly"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setViewMode("10-day")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "10-day"
                    ? "bg-white dark:bg-stone-950 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                10-Day
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {data && data.locations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-stone-950 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-colors duration-300">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Target
              </p>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100">
                € {totalTarget.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white dark:bg-stone-950 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-colors duration-300">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Achieved
              </p>
              <p className="text-2xl font-light text-gray-900 dark:text-gray-100">
                € {totalAchieved.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white dark:bg-stone-950 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-colors duration-300">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Overall Progress
              </p>
              <div className="flex items-baseline gap-3">
                <p
                  className={`text-2xl font-light ${getTextColor(
                    overallPercentage
                  )}`}
                >
                  {overallPercentage}%
                </p>
                <div className="flex-1 bg-white dark:bg-stone-950 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                      overallPercentage
                    )}`}
                    style={{
                      width: `${Math.min(overallPercentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-stone-950 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading data...
              </p>
            </div>
          ) : data && data.locations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white dark:bg-stone-950 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-white dark:bg-stone-950 z-10">
                      Location
                    </th>
                    {Array.from({ length: maxPeriods }, (_, i) => (
                      <th
                        key={i}
                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]"
                      >
                        {viewMode === "weekly"
                          ? `Week ${i + 1}`
                          : `Period ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.locations.map((location, index) => {
                    const targets =
                      periodTargetsByLocation.get(location.location) || [];

                    // Ensure we always render `maxPeriods` columns (fill missing with zeros)
                    const weeks = [...location.weeks];
                    while (weeks.length < maxPeriods) {
                      weeks.push({
                        weekNumber: weeks.length + 1,
                        weekLabel: `Period ${weeks.length + 1}`,
                        achieved: 0,
                        startDate: new Date(
                          selectedYear,
                          selectedMonth,
                          1
                        ).toISOString(),
                        endDate: new Date(
                          selectedYear,
                          selectedMonth,
                          1
                        ).toISOString(),
                      });
                    }

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-5 sticky left-0 bg-white dark:bg-stone-950 z-10 border-r border-gray-100 dark:border-gray-700">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {location.location}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              € {location.monthlyTarget.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </td>

                        {weeks.map((week, weekIndex) => {
                          const periodTarget =
                            targets[weekIndex] ??
                            location.monthlyTarget /
                              (location.weeks.length || 1);
                          const percentage = getPercentage(
                            week.achieved || 0,
                            periodTarget || 0
                          );

                          return (
                            <td key={weekIndex} className="px-6 py-5 align-top">
                              <div className="space-y-3">
                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                                  {new Date(week.startDate).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short" }
                                  )}
                                  {" - "}
                                  {new Date(week.endDate).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short" }
                                  )}
                                </p>

                                <div
                                  className={`px-4 py-3 rounded-lg ${getAchievementColor(
                                    week.achieved || 0,
                                    periodTarget
                                  )} transition-colors duration-300`}
                                >
                                  <p className="text-lg font-light text-gray-900 dark:text-gray-100 text-center">
                                    € 
                                    {(week.achieved || 0).toLocaleString(
                                      "en-IN"
                                    )}
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      vs € 
                                      {periodTarget.toLocaleString("en-IN", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </span>
                                    <span
                                      className={`text-xs font-medium ${getTextColor(
                                        percentage
                                      )}`}
                                    >
                                      {percentage}%
                                    </span>
                                  </div>

                                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor(
                                        percentage
                                      )}`}
                                      style={{
                                        width: `${Math.min(percentage, 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-semibold border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-6 py-5 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Total
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          € {totalTarget.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </td>

                    {Array.from({ length: maxPeriods }, (_, i) => {
                      const achieved = totalAchievedPerPeriod[i];
                      const target = totalTargetPerPeriod[i];
                      const percentage = getPercentage(achieved, target);

                      // Prepare chart data for stacked radial chart
                      const periodData = data.locations.reduce((acc, loc) => {
                        acc[loc.location] = loc.weeks[i]?.achieved || 0;
                        return acc;
                      }, {} as Record<string, number>);
                      const chartData = [periodData];

                      const chartConfig = data.locations.reduce((acc, loc, idx) => {
                        acc[loc.location] = {
                          label: loc.location,
                          color: `hsl(${idx * 360 / data.locations.length}, 70%, 50%)`,
                        };
                        return acc;
                      }, {} as ChartConfig);

                      return (
                        <td key={`total-${i}`} className="px-6 py-5 align-top">
                          <div className="space-y-3">


                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  vs € 
                                  {target.toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <span
                                  className={`text-xs font-medium ${getTextColor(
                                    percentage
                                  )}`}
                                >
                                  {percentage}%
                                </span>
                              </div>

                              {achieved > 0 && (
                                <ChartContainer
                                  config={chartConfig}
                                  className="mx-auto aspect-square w-full max-w-[100px]"
                                >
                                  <RadialBarChart
                                    data={chartData}
                                    endAngle={180}
                                    innerRadius={40}
                                    outerRadius={60}
                                  >
                                    <ChartTooltip
                                      cursor={false}
                                      content={<ChartTooltipContent hideLabel />}
                                    />
                                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                      <Label
                                        content={({ viewBox }) => {
                                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                                <tspan
                                                  x={viewBox.cx}
                                                  y={(viewBox.cy || 0) - 8}
                                                  className="fill-foreground text-base font-bold"
                                                >
                                                  {achieved.toLocaleString()} 
                                                </tspan>
                                                <tspan
                                                  x={viewBox.cx}
                                                  y={(viewBox.cy || 0) + 4}
                                                  className="fill-muted-foreground text-xs"
                                                >
                                                  Achieved
                                                </tspan>
                                              </text>
                                            );
                                          }
                                        }}
                                      />
                                    </PolarRadiusAxis>
                                    {data.locations.map((loc) => (
                                      <RadialBar
                                        key={loc.location}
                                        dataKey={loc.location}
                                        stackId="a"
                                        cornerRadius={3}
                                        fill={`var(--color-${loc.location})`}
                                        className="stroke-transparent stroke-1"
                                      />
                                    ))}
                                  </RadialBarChart>
                                </ChartContainer>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No data available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyTargetTable;
  