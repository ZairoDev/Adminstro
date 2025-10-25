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


type ChartType = "Area" | "Line" | "Bar";
type MetricType = "totalPaid" | "count";

const BookingChartImproved = () => {
  const { bookingsByDate, comparisonData, fetchBookingStats, loading } =
    useBookingStats();

  const [days, setDays] = useState<
    "12 days" | "1 year" | "last 3 years" | "this month"
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

  // Determine grouping & fetch data
  useEffect(() => {
    if (days === "12 days" || days === "this month") setGrouping("daily");
    else if (days === "1 year") setGrouping("monthly");
    else if (days === "last 3 years") setGrouping("yearly");

    fetchBookingStats({
      days,
      location,
      comparisonMonth: isComparisonEnabled
        ? comparisonMonth ?? undefined
        : undefined,
      comparisonYear: isComparisonEnabled
        ? comparisonYear ?? undefined
        : undefined,
    });
  }, [days, location, isComparisonEnabled, comparisonMonth, comparisonYear]);

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

    // Determine date range based on selected period
    switch (days) {
      case "12 days":
        startDate.setDate(now.getDate() - 11);
        endDate = new Date(now);
        break;
      case "this month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        break;
      case "1 year":
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = new Date(now);
        break;
      case "last 3 years":
        startDate.setFullYear(now.getFullYear() - 3);
        endDate = new Date(now);
        break;
    }

    // Create a map of existing data
    const dataMap = new Map(
      bookingsByDate.map((item: any) => [item.date, item])
    );

    const comparisonMap = comparisonData
      ? new Map(comparisonData.map((item: any) => [item.date, item]))
      : null;

    // Generate complete date range
    const completeData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let dateKey: string;
      let displayDate: string;

      if (grouping === "daily") {
        dateKey = dayjs(currentDate).format("YYYY-MM-DD");
        displayDate = dayjs(currentDate).format("DD MMM");
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (grouping === "monthly") {
        dateKey = dayjs(currentDate).format("YYYY-MM");
        displayDate = dayjs(currentDate).format("MMM YYYY");
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        dateKey = dayjs(currentDate).format("YYYY");
        displayDate = dayjs(currentDate).format("YYYY");
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }

      const existingData = dataMap.get(dateKey);
      const comparisonItem = comparisonMap?.get(dateKey);

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

  // Get chart component dynamically
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
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "8px",
                color: chartColors.tooltipText,
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `$${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend />
            <Line
              {...commonProps}
              name={
                metric === "totalPaid" ? "Total Paid ($)" : "Bookings Count"
              }
            />
            {isComparisonEnabled && comparisonData && (
              <Line
                {...comparisonProps}
                name={
                  metric === "totalPaid"
                    ? "Comparison Total Paid ($)"
                    : "Comparison Bookings Count"
                }
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
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "8px",
                color: chartColors.tooltipText,
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `$${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend />
            <Bar
              {...commonProps}
              name={
                metric === "totalPaid" ? "Total Paid ($)" : "Bookings Count"
              }
              radius={[8, 8, 0, 0]}
            />
            {isComparisonEnabled && comparisonData && (
              <Bar
                {...comparisonProps}
                name={
                  metric === "totalPaid"
                    ? "Comparison Total Paid ($)"
                    : "Comparison Bookings Count"
                }
                radius={[8, 8, 0, 0]}
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
              {isComparisonEnabled && comparisonData && (
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
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke={chartColors.axisStroke}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: "8px",
                color: chartColors.tooltipText,
              }}
              formatter={(value: number) =>
                metric === "totalPaid"
                  ? `$${value.toLocaleString()}`
                  : value.toLocaleString()
              }
            />
            <Legend />
            <Area
              {...commonProps}
              fillOpacity={1}
              fill="url(#colorGradient)"
              name={
                metric === "totalPaid" ? "Total Paid ($)" : "Bookings Count"
              }
            />
            {isComparisonEnabled && comparisonData && (
              <Area
                {...comparisonProps}
                fillOpacity={1}
                fill="url(#comparisonGradient)"
                name={
                  metric === "totalPaid"
                    ? "Comparison Total Paid ($)"
                    : "Comparison Bookings Count"
                }
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

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-stone-950">
      <div className="">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Booking Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your booking performance and revenue trends
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-stone-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Time Period
              </label>
              <select
                className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
                value={days}
                onChange={(e) => setDays(e.target.value as any)}
              >
                <option value="12 days">Last 12 Days</option>
                <option value="this month">This Month</option>
                <option value="1 year">Last 1 Year</option>
                <option value="last 3 years">Last 3 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Location
              </label>
              <select
                className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Chart Type
              </label>
              <select
                className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
              >
                <option value="Area">Area Chart</option>
                <option value="Line">Line Chart</option>
                <option value="Bar">Bar Chart</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Metric
              </label>
              <select
                className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricType)}
              >
                <option value="totalPaid">Total Paid</option>
                <option value="count">Bookings Count</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-stone-800">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
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
                  className="w-4 h-4 rounded border-slate-300 dark:border-stone-700"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Enable Comparison
                </span>
              </label>
            </div>

            {isComparisonEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comparison Month
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
                    value={comparisonMonth ?? ""}
                    onChange={(e) =>
                      setComparisonMonth(
                        e.target.value ? Number.parseInt(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Select Month</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {dayjs().month(month).format("MMMM")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comparison Year
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-slate-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-stone-800 text-slate-900 dark:text-slate-50"
                    value={comparisonYear ?? ""}
                    onChange={(e) =>
                      setComparisonYear(
                        e.target.value ? Number.parseInt(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Select Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart Card */}
        <Card className="bg-white dark:bg-stone-900 shadow-lg border-0 dark:border dark:border-stone-800">
          <CardHeader className="border-b border-slate-200 dark:border-stone-800 pb-6">
            <CardTitle className="text-2xl text-slate-900 dark:text-slate-50">
              {metric === "totalPaid" ? "Revenue" : "Bookings"} Over Time
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {metric === "totalPaid"
                ? "Total payments received"
                : "Number of bookings"}{" "}
              - {days.toLowerCase()}
              {isComparisonEnabled &&
                comparisonMonth !== null &&
                comparisonYear !== null &&
                ` (Comparing with ${dayjs()
                  .month(comparisonMonth)
                  .format("MMMM")} ${comparisonYear})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-slate-500 dark:text-slate-400">
                  Loading chart data...
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-slate-500 dark:text-slate-400">
                  No data available for the selected period
                </div>
              </div>
            ) : isComparisonEnabled &&
              (comparisonMonth === null || comparisonYear === null) ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-slate-500 dark:text-slate-400">
                  Please select both month and year to view comparison
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                {getChartComponent()}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-stone-800">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Total Data Points
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {chartData.length}
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-stone-800">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {metric === "totalPaid" ? "Total Revenue" : "Total Bookings"}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {metric === "totalPaid"
                ? `$${chartData
                    .reduce((sum, item) => sum + item.totalPaid, 0)
                    .toLocaleString()}`
                : chartData
                    .reduce((sum, item) => sum + item.count, 0)
                    .toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-stone-800">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Average per Day
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {metric === "totalPaid"
                ? `$${Math.round(
                    chartData.reduce((sum, item) => sum + item.totalPaid, 0) /
                      chartData.length
                  ).toLocaleString()}`
                : Math.round(
                    chartData.reduce((sum, item) => sum + item.count, 0) /
                      chartData.length
                  ).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingChartImproved;
