"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dayjs from "dayjs";
import useBookingStats from "@/hooks/(VS)/useBookingStats";
import { ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";

type ChartType = "Area" | "Line" | "Bar";
type MetricType = "totalPaid" | "count";

const BookingChartImproved = () => {
  const {
    bookingsByDate,
    comparisonData,
    locationBreakdown,
    fetchBookingStats,
    loading,
  } = useBookingStats();

  const [days, setDays] = useState<
    "12 days" | "1 year" | "last 3 years" | "this month" | "week"
  >("this month");
  const [location, setLocation] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("Area");
  const [metric, setMetric] = useState<MetricType>("totalPaid");
  const [grouping, setGrouping] = useState<"daily" | "monthly" | "yearly">(
    "daily"
  );
  const [isDark, setIsDark] = useState(false);

  const [isComparisonEnabled, setIsComparisonEnabled] = useState(false);
  const [comparisonMonth, setComparisonMonth] = useState<number | null>(null);
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);

  // Time navigation state
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  // Determine grouping & fetch data
  useEffect(() => {
    if (days === "12 days" || days === "week") {
      setGrouping("daily");
    } else if (days === "this month") {
      setGrouping("daily");
    } else if (days === "1 year") {
      setGrouping("monthly");
    } else if (days === "last 3 years") {
      setGrouping("yearly");
    }

    fetchBookingStats({
      days,
      location,
      comparisonMonth: isComparisonEnabled
        ? comparisonMonth ?? undefined
        : undefined,
      comparisonYear: isComparisonEnabled
        ? comparisonYear ?? undefined
        : undefined,
      weekOffset: days === "week" ? weekOffset : undefined,
      monthOffset: days === "this month" ? monthOffset : undefined,
      yearOffset: days === "1 year" ? yearOffset : undefined,
    });
  }, [
    days,
    location,
    isComparisonEnabled,
    comparisonMonth,
    comparisonYear,
    weekOffset,
    monthOffset,
    yearOffset,
  ]);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const generateCompleteDataRange = () => {
    if (bookingsByDate.length === 0) return [];

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (days) {
      case "12 days":
        startDate.setDate(now.getDate() - 11);
        endDate = new Date(now);
        break;
      case "this month":
        const targetMonth = new Date(
          now.getFullYear(),
          now.getMonth() + monthOffset,
          1
        );
        startDate = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          1
        );
        endDate = new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0
        );
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        startDate = weekStart;
        endDate = weekEnd;
        break;
      case "1 year":
        const targetYear = now.getFullYear() + yearOffset;
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
        break;
      case "last 3 years":
        startDate.setFullYear(now.getFullYear() - 3);
        endDate = new Date(now);
        break;
    }

    const dataMap = new Map(
      bookingsByDate.map((item: any) => [item.date, item])
    );

    const comparisonMap = new Map();
    if (comparisonData) {
      comparisonData.forEach((item: any) => {
        if (grouping === "daily") {
          const day = dayjs(item.date).format("DD");
          comparisonMap.set(day, item);
        } else if (grouping === "monthly") {
          const month = dayjs(item.date).format("MM");
          comparisonMap.set(month, item);
        } else {
          comparisonMap.set(item.date, item);
        }
      });
    }

    const completeData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let dateKey: string;
      let displayDate: string;
      let comparisonKey: string;

      if (grouping === "daily") {
        dateKey = dayjs(currentDate).format("YYYY-MM-DD");
        displayDate = dayjs(currentDate).format("DD MMM");
        comparisonKey = dayjs(currentDate).format("DD");
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (grouping === "monthly") {
        dateKey = dayjs(currentDate).format("YYYY-MM");
        displayDate = dayjs(currentDate).format("MMM YYYY");
        comparisonKey = dayjs(currentDate).format("MM");
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        dateKey = dayjs(currentDate).format("YYYY");
        displayDate = dayjs(currentDate).format("YYYY");
        comparisonKey = dateKey;
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }

      const existingData = dataMap.get(dateKey);
      const comparisonItem = comparisonMap.get(comparisonKey);

      completeData.push({
        date: displayDate,
        totalPaid: existingData?.totalPaid ?? 0,
        count: existingData?.count ?? 0,
        comparisonTotalPaid: comparisonItem?.totalPaid ?? 0,
        comparisonCount: comparisonItem?.count ?? 0,
      });
    }

    return completeData;
  };

  const chartData = generateCompleteDataRange();

  const chartColors = {
    gridStroke: isDark ? "#44403c" : "#e5e7eb",
    axisStroke: isDark ? "#a8a29e" : "#6b7280",
    tooltipBg: isDark ? "#1c1917" : "#fff",
    tooltipBorder: isDark ? "#292524" : "#e5e7eb",
    tooltipText: isDark ? "#f5f5f4" : "#000",
    revenuePrimary: "#3b82f6",
    revenueSecondary: "#1e40af",
    countPrimary: "#10b981",
    countSecondary: "#047857",
    comparisonRevenue: "#f59e0b",
    comparisonCount: "#8b5cf6",
  };

  const getChartComponent = () => {
    const props = {
      data: chartData,
      margin: { top: 5, right: 30, left: 0, bottom: 5 },
    };

    const commonProps = {
      dataKey: metric,
      stroke:
        metric === "totalPaid"
          ? chartColors.revenuePrimary
          : chartColors.countPrimary,
      fill:
        metric === "totalPaid"
          ? chartColors.revenuePrimary
          : chartColors.countPrimary,
      isAnimationActive: true,
    };

    const comparisonProps = {
      dataKey:
        metric === "totalPaid" ? "comparisonTotalPaid" : "comparisonCount",
      stroke:
        metric === "totalPaid"
          ? chartColors.comparisonRevenue
          : chartColors.comparisonCount,
      fill:
        metric === "totalPaid"
          ? chartColors.comparisonRevenue
          : chartColors.comparisonCount,
      isAnimationActive: true,
    };

    switch (chartType) {
      case "Line":
        return (
          <LineChart {...props}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.gridStroke}
            />
            <XAxis
              dataKey="date"
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "6px",
                color: chartColors.tooltipText,
                fontSize: "12px",
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `€${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              {...commonProps}
              name={
                metric === "totalPaid" ? "Total Paid (€)" : "Bookings Count"
              }
              strokeWidth={2}
            />
            {isComparisonEnabled &&
              comparisonData &&
              comparisonData.length > 0 && (
                <Line
                  {...comparisonProps}
                  name={
                    metric === "totalPaid"
                      ? "Comparison (€)"
                      : "Comparison Count"
                  }
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}
          </LineChart>
        );
      case "Bar":
        return (
          <BarChart {...props}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.gridStroke}
            />
            <XAxis
              dataKey="date"
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "6px",
                color: chartColors.tooltipText,
                fontSize: "12px",
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `€${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar
              {...commonProps}
              name={
                metric === "totalPaid" ? "Total Paid (€)" : "Bookings Count"
              }
              radius={[4, 4, 0, 0]}
            />
            {isComparisonEnabled &&
              comparisonData &&
              comparisonData.length > 0 && (
                <Bar
                  {...comparisonProps}
                  name={
                    metric === "totalPaid"
                      ? "Comparison (€)"
                      : "Comparison Count"
                  }
                  radius={[4, 4, 0, 0]}
                />
              )}
          </BarChart>
        );
      default:
        return (
          <AreaChart {...props}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={
                    metric === "totalPaid"
                      ? chartColors.revenuePrimary
                      : chartColors.countPrimary
                  }
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={
                    metric === "totalPaid"
                      ? chartColors.revenuePrimary
                      : chartColors.countPrimary
                  }
                  stopOpacity={0}
                />
              </linearGradient>
              {isComparisonEnabled &&
                comparisonData &&
                comparisonData.length > 0 && (
                  <linearGradient
                    id="comparisonGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={
                        metric === "totalPaid"
                          ? chartColors.comparisonRevenue
                          : chartColors.comparisonCount
                      }
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={
                        metric === "totalPaid"
                          ? chartColors.comparisonRevenue
                          : chartColors.comparisonCount
                      }
                      stopOpacity={0}
                    />
                  </linearGradient>
                )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.gridStroke}
            />
            <XAxis
              dataKey="date"
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "11px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "6px",
                color: chartColors.tooltipText,
                fontSize: "12px",
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `€${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Area
              {...commonProps}
              fillOpacity={1}
              fill="url(#colorGradient)"
              name={
                metric === "totalPaid" ? "Total Paid (€)" : "Bookings Count"
              }
              strokeWidth={2}
            />
            {isComparisonEnabled &&
              comparisonData &&
              comparisonData.length > 0 && (
                <Area
                  {...comparisonProps}
                  fillOpacity={1}
                  fill="url(#comparisonGradient)"
                  name={
                    metric === "totalPaid"
                      ? "Comparison (€)"
                      : "Comparison Count"
                  }
                  strokeWidth={2}
                />
              )}
          </AreaChart>
        );
    }
  };

  const currentDate = new Date();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i
  );

  const getWeekRange = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${dayjs(weekStart).format("MMM DD")} - ${dayjs(weekEnd).format(
      "MMM DD"
    )}`;
  };

  const getMonthRange = () => {
    const now = new Date();
    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() + monthOffset,
      1
    );
    return dayjs(targetMonth).format("MMMM YYYY");
  };

  const getYearRange = () => {
    const now = new Date();
    const targetYear = now.getFullYear() + yearOffset;
    return targetYear.toString();
  };

  const locationColors: { [key: string]: string } = {
    athens: "#3b82f6",
    thessaloniki: "#10b981",
    milan: "#f59e0b",
    chania: "#8b5cf6",
  };

  return (
    <div className="w-full space-y-4">
      {/* Compact Filters Section */}
      <Card className="border-slate-200 dark:border-stone-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Period
              </label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={days}
                onChange={(e) => {
                  setDays(e.target.value as any);
                  setWeekOffset(0);
                  setMonthOffset(0);
                  setYearOffset(0);
                }}
              >
                <option value="week">Week</option>
                <option value="this month">Month</option>
                <option value="1 year">Year</option>
                <option value="12 days">12 Days</option>
                <option value="last 3 years">3 Years</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Location
              </label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                <option value="athens">Athens</option>
                <option value="thessaloniki">Thessaloniki</option>
                <option value="milan">Milan</option>
                <option value="chania">Chania</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Chart Type
              </label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
              >
                <option value="Area">Area</option>
                <option value="Line">Line</option>
                <option value="Bar">Bar</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Metric
              </label>
              <select
                className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricType)}
              >
                <option value="totalPaid">Revenue</option>
                <option value="count">Bookings</option>
              </select>
            </div>
          </div>

          {/* Compact Time Navigation */}
          {(days === "week" || days === "this month" || days === "1 year") && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (days === "week") setWeekOffset(weekOffset - 1);
                    else if (days === "this month")
                      setMonthOffset(monthOffset - 1);
                    else if (days === "1 year") setYearOffset(yearOffset - 1);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-stone-900 rounded-md border border-slate-200 dark:border-stone-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {days === "week" && getWeekRange()}
                    {days === "this month" && getMonthRange()}
                    {days === "1 year" && getYearRange()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (days === "week") setWeekOffset(weekOffset + 1);
                    else if (days === "this month")
                      setMonthOffset(monthOffset + 1);
                    else if (days === "1 year") setYearOffset(yearOffset + 1);
                  }}
                  disabled={
                    (days === "week" && weekOffset >= 0) ||
                    (days === "this month" && monthOffset >= 0) ||
                    (days === "1 year" && yearOffset >= 0)
                  }
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Compact Comparison Controls */}
          {days !== "week" && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-stone-800">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isComparisonEnabled}
                  onChange={(e) => {
                    setIsComparisonEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setComparisonMonth(null);
                      setComparisonYear(null);
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-stone-700"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Compare Periods
                </span>
              </label>

              {isComparisonEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50"
                    value={comparisonMonth ?? ""}
                    onChange={(e) =>
                      setComparisonMonth(
                        e.target.value ? Number.parseInt(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Month</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {dayjs().month(month).format("MMM")}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-slate-900 dark:text-slate-50"
                    value={comparisonYear ?? ""}
                    onChange={(e) =>
                      setComparisonYear(
                        e.target.value ? Number.parseInt(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Chart with Location Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart Section */}
        <Card className="lg:col-span-3 border-slate-200 dark:border-stone-800">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {metric === "totalPaid" ? "Revenue" : "Bookings"} Analytics
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {metric === "totalPaid"
                    ? "Total payments received"
                    : "Number of bookings"}
                </CardDescription>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Total
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {metric === "totalPaid"
                      ? `€${chartData
                          .reduce((sum, item) => sum + item.totalPaid, 0)
                          .toLocaleString()}`
                      : chartData
                          .reduce((sum, item) => sum + item.count, 0)
                          .toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Average
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {metric === "totalPaid"
                      ? `€${Math.round(
                          chartData.reduce(
                            (sum, item) => sum + item.totalPaid,
                            0
                          ) / (chartData.length || 1)
                        ).toLocaleString()}`
                      : Math.round(
                          chartData.reduce((sum, item) => sum + item.count, 0) /
                            (chartData.length || 1)
                        ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Loading...
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No data available
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                {getChartComponent()}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Compact Location Breakdown */}
        {!location && locationBreakdown && locationBreakdown.length > 0 && (
          <Card className="border-slate-200 dark:border-stone-800">
            <CardHeader className="pb-3 px-4 pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  By Location
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-3">
                {locationBreakdown
                  .sort((a, b) => b.totalPaid - a.totalPaid)
                  .map((loc) => {
                    const total = locationBreakdown.reduce(
                      (sum, l) => sum + l.totalPaid,
                      0
                    );
                    const percentage = ((loc.totalPaid / total) * 100).toFixed(
                      1
                    );
                    return (
                      <div key={loc.location}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  locationColors[loc.location.toLowerCase()] ||
                                  "#6b7280",
                              }}
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {loc.location}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                              €{(loc.totalPaid / 1000).toFixed(1)}k
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                locationColors[loc.location.toLowerCase()] ||
                                "#6b7280",
                            }}
                          />
                        </div>
                        <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BookingChartImproved;
