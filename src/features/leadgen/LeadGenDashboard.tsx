"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { DateRange } from "react-day-picker";
import { Loader2, RotateCw, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { CustomStackBarChart } from "@/components/charts/StackedBarChart";
import { ReviewPieChart } from "@/components/charts/ReviewPieChart";
import { ChartAreaMultiple } from "@/components/CustomMultilineChart";
import { StatsCard } from "@/components/leadCountCard/page";
import { MonthSelector } from "@/components/MonthSelector";
import { AnimatedStatsWrapper } from "@/components/AnimatedWrapper";
import { WebsiteLeadsLineChart } from "@/components/charts/WebsiteLeadsLineChart";
import ActiveEmployeeList from "@/components/VS/dashboard/active-employee-list";
import LocationCard from "@/components/reusableCard";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";

const LeadsCandleChart = dynamic(
  () =>
    import("@/components/charts/LeadsCandleChart").then((m) => ({
      default: m.LeadsCandleChart,
    })),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton label="Loading leads chart..." height="h-80" />
    ),
  },
);

// Hooks
import { useAgents } from "@/hooks/shared/useAgents";
import useTodayLeads from "@/features/leadgen/hooks/useTodayLeads";
import useReview from "@/features/leadgen/hooks/useReview";
import useLeadStats from "@/features/leadgen/hooks/useLeadStats";
import useWebsiteLeadsCounts from "@/features/leadgen/hooks/useWebsiteLeadsCounts";
import SalesCard from "@/hooks/(VS)/useSalesCard";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { useLeadsCandleAnalytics } from "@/features/leadgen/hooks/useLeadsCandleAnalytics";

interface LeadStats {
  location: string;
  target: number;
  achieved: number;
  today: number;
  yesterday: number;
  dailyrequired: number;
  currentAverage: number;
  rate: number;
}

interface LeadGenDashboardProps {
  className?: string;
}

export default function LeadGenDashboard({ className }: LeadGenDashboardProps) {
  const { isAdmin, canAccess, accessibleLocations, isLeadGen, role, isSales } = useDashboardAccess();
  
  // LeadGen team (including LeadGen-TeamLead) can see all charts
  const canViewAllCharts = isAdmin || isLeadGen || role === "LeadGen-TeamLead";

  // Filters - All hooks must be called before any conditional returns
  const [leadsFilters, setLeadsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({
    days: "this month",
    location: "All",
    createdBy: "All",
  });

  const [propertyFilters, setPropertyFilters] = useState<{
    days?: string;
    createdBy?: string;
    typeOfProperty?: string;
    location?: string;
  }>({
    days: "this month",
    createdBy: "All",
    typeOfProperty: "All",
    location: "All",
  });

  const [leadByLocationRange, setLeadByLocationRange] = useState<
    DateRange | undefined
  >(undefined);

  const [leadDatePreset, setLeadDatePreset] = useState<
    "this month" | "last month" | "custom"
  >("this month");

  const [openCandleDatePicker, setOpenCandleDatePicker] = useState(false);
  const candleDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openCandleDatePicker || leadDatePreset !== "custom") return;
    const id = requestAnimationFrame(() => {
      candleDatePickerRef.current?.querySelector("button")?.click();
      setOpenCandleDatePicker(false);
    });
    return () => cancelAnimationFrame(id);
  }, [openCandleDatePicker, leadDatePreset]);

  const propertyTypeOptions = useMemo(
    () => [
      "All",
      "Apartment",
      "Studio / 1 bedroom",
      "1 Bedroom",
      "2 Bedroom",
      "3 Bedroom",
      "4 Bedroom",
      "Villa",
      "Pent House",
      "Detached House",
      "Loft",
      "Shared Apartment",
      "Maisotte",
      "Studio",
    ],
    [],
  );

  const toIsoStart = (d: Date) => new Date(d).toISOString();
  const toIsoEnd = (d: Date) => {
    const dd = new Date(d);
    dd.setHours(23, 59, 59, 999);
    return dd.toISOString();
  };

  const [reviewsFilters, setReviewsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({
    days: "this month",
    createdBy: "All",
  });

  const [leadCountFilters, setLeadCountFilters] = useState<{
    days?: string;
  }>({});

  const [websiteLeadsFilters, setWebsiteLeadsFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  // Data hooks
  const { agents: allEmployees } = useAgents();

  const {
    days: candleDays,
    locations: candleLocations,
    loading: candleLoading,
    refetch: refetchCandle,
  } = useLeadsCandleAnalytics({
    days: propertyFilters.days,
    createdBy: propertyFilters.createdBy,
    typeOfProperty: propertyFilters.typeOfProperty,
    location: propertyFilters.location,
  });

  const locationOptions = useMemo(
    () => ["All", ...candleLocations],
    [candleLocations],
  );

  const applyCandleFilters = useCallback(
    (next: typeof propertyFilters) => {
      const range =
        leadByLocationRange?.from
          ? {
              dateFrom: toIsoStart(leadByLocationRange.from),
              dateTo: toIsoEnd(
                leadByLocationRange.to ?? leadByLocationRange.from,
              ),
            }
          : {};
      void refetchCandle({ ...next, ...range });
    },
    [leadByLocationRange, refetchCandle],
  );

  const {
    leads: todayLeads,
    totalLeads: totalTodayLeads,
    refetch: refetchTodayLeads,
    isLoading: isLoadingTodayLeads,
    fetchLeadsByLeadGen,
    chartData1,
  } = useTodayLeads();

  const { reviews, notReviewedBreakdown, fetchReviews } = useReview();

  const {
    leadStats,
    statsLoading,
    selectedMonth,
    setSelectedMonth,
    direction,
  } = useLeadStats();

  const {
    websiteLeads,
    fetchWebsiteLeadsCounts,
    loading: websiteLeadsLoading,
    isError: websiteLeadsError,
    error: websiteLeadsErrorMsg,
  } = useWebsiteLeadsCounts();

  const { salesCardData } = SalesCard();

  const monthKey = useMemo(
    () => `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`,
    [selectedMonth]
  );

  const todaysLeadChartData = todayLeads?.map((lead) => {
    const label = lead.createdBy;
    const categories = lead.locations.map((location) => ({
      field: location.location,
      count: location.count,
    }));
    return { label, categories };
  });

  // Filter lead stats by accessible locations for non-admin users
  const filteredLeadStats = useMemo(() => {
    const byAccess =
      isAdmin || accessibleLocations.length === 0
        ? leadStats
        : leadStats.filter((stat: LeadStats) =>
            accessibleLocations.some(
              (loc) => loc.toLowerCase() === stat.location.toLowerCase(),
            ),
          );
    return byAccess.filter((stat) => stat.target > 0);
  }, [leadStats, accessibleLocations, isAdmin]);

  // Security: Only LeadGen team should access this dashboard
  // This check must come AFTER all hooks are called
  if (isSales && !isAdmin && role !== "LeadGen-TeamLead") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don&apos;t have permission to view Lead Generation data.</p>
      </div>
    );
  }

  if (!canAccess("leadGenOverview") && !canAccess("leadStatistics")) {
    return null;
  }

  return (
    <div className={className}>
      {/* Lead Generation Overview */}
      {canAccess("leadGenOverview") && (
        <section className="relative my-8 p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border">
          <h1 className="text-2xl font-bold mb-6">📊 Lead Generation Performance Overview</h1>

          <CustomSelect
            itemList={["month", "year", "30days"]}
            triggerText="Select range"
            defaultValue={leadCountFilters?.days || "month"}
            onValueChange={(value) => {
              setLeadCountFilters({ days: value });
              fetchLeadsByLeadGen(value as "month" | "year" | "30days");
            }}
            triggerClassName="w-32 absolute right-2 top-2"
          />

          <div>
            <ChartAreaMultiple data={chartData1} />
          </div>
        </section>
      )}

      {/* Website Leads Chart */}
      {canAccess("websiteLeads") && (
        <section className="my-8 p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            🌐 Website Leads Trend
          </h2>
          <WebsiteLeadsLineChart
            data={websiteLeads}
            filters={websiteLeadsFilters}
            onFilterChange={(value) => {
              const newFilters = { ...websiteLeadsFilters, days: value };
              setWebsiteLeadsFilters(newFilters);
              fetchWebsiteLeadsCounts(newFilters);
            }}
            loading={websiteLeadsLoading}
            isError={websiteLeadsError}
            error={websiteLeadsErrorMsg}
          />
        </section>
      )}

      <section className="space-y-6 p-6 my-4 dark:bg-stone-950 rounded-xl border">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">👥 Daily Lead Generation Activity</h1>

        {/* Daily Leads by Agent & Active Employees */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                📋 Today&apos;s Leads - {totalTodayLeads}
              </h2>
              <Button size={"sm"} onClick={refetchTodayLeads}>
                <RotateCw
                  className={`${isLoadingTodayLeads ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <CustomStackBarChart
              heading={`Today Leads - ${totalTodayLeads}`}
              subHeading="Leads by Agent"
              chartData={todaysLeadChartData ? todaysLeadChartData : []}
            />
          </div>

          {/* Active Employees */}
          <div className="border rounded-md h-full flex flex-col gap-2 dark:bg-stone-950">
            <h3 className="text-xl font-semibold p-3 border-b text-gray-800 dark:text-gray-200">
              🟢 Active Employees
            </h3>
            <ActiveEmployeeList />
            {/* Fresh Leads Card - For LeadGen Team */}
            {canViewAllCharts && (
              <div className="border shadow-md p-4">
                <LocationCard
                  title="✨ Fresh Leads Summary"
                  stats={[
                    {
                      icon: Users,
                      value: salesCardData?.todayCount ?? 0,
                      label: "Today",
                      color: "text-blue-600",
                    },
                    {
                      icon: TrendingUp,
                      value: `${salesCardData?.percentageChange}%`,
                      label: "Change",
                      color:
                        salesCardData && salesCardData.percentageChange >= 0
                          ? "text-green-600"
                          : "text-red-600",
                    },
                    {
                      icon: TrendingDown,
                      value: salesCardData?.yesterdayCount ?? 0,
                      label: "Yesterday",
                      color: "text-gray-500",
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Leads by location — full width */}
        {canViewAllCharts && canAccess("leadsByLocation") && (
          <div
            className={`mb-4 w-full ${candleLoading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <LeadsCandleChart
              title="Leads by location"
              days={candleDays}
              locations={candleLocations}
              selectedLocation={propertyFilters.location}
              height={400}
              filterBar={
                  <>
                    <CustomSelect
                      itemList={["This month", "Past month", "Custom range"]}
                      triggerText="Date"
                      value={
                        leadDatePreset === "this month"
                          ? "This month"
                          : leadDatePreset === "last month"
                            ? "Past month"
                            : "Custom range"
                      }
                      onValueChange={(value) => {
                        if (value === "This month") {
                          setLeadDatePreset("this month");
                          setOpenCandleDatePicker(false);
                          setLeadByLocationRange(undefined);
                          const next = { ...propertyFilters, days: "this month" };
                          setPropertyFilters(next);
                          applyCandleFilters(next);
                          return;
                        }
                        if (value === "Past month") {
                          setLeadDatePreset("last month");
                          setOpenCandleDatePicker(false);
                          setLeadByLocationRange(undefined);
                          const next = { ...propertyFilters, days: "last month" };
                          setPropertyFilters(next);
                          applyCandleFilters(next);
                          return;
                        }
                        setLeadDatePreset("custom");
                        setOpenCandleDatePicker(true);
                        setPropertyFilters({ ...propertyFilters, days: undefined });
                      }}
                      triggerClassName="w-[120px] h-8 text-xs"
                    />
                    {leadDatePreset === "custom" ? (
                      <div ref={candleDatePickerRef}>
                      <DateRangePicker
                        date={leadByLocationRange}
                        setDate={(range) => {
                          setLeadByLocationRange(range);
                          const from = range?.from;
                          const to = range?.to ?? range?.from;
                          const next = { ...propertyFilters, days: undefined };
                          setPropertyFilters(next);
                          if (from) {
                            void refetchCandle({
                              ...next,
                              dateFrom: toIsoStart(from),
                              dateTo: to ? toIsoEnd(to) : undefined,
                            });
                          }
                        }}
                        className="[&_button]:h-8 [&_button]:text-xs [&_button]:w-auto min-w-[200px]"
                      />
                      </div>
                    ) : null}
                    <CustomSelect
                      itemList={locationOptions}
                      triggerText="Location"
                      value={propertyFilters.location}
                      onValueChange={(value) => {
                        const next = { ...propertyFilters, location: value };
                        setPropertyFilters(next);
                        applyCandleFilters(next);
                      }}
                      triggerClassName="w-[110px] h-8 text-xs"
                    />
                    <CustomSelect
                      itemList={propertyTypeOptions}
                      triggerText="Property"
                      value={propertyFilters.typeOfProperty}
                      onValueChange={(value) => {
                        const next = { ...propertyFilters, typeOfProperty: value };
                        setPropertyFilters(next);
                        applyCandleFilters(next);
                      }}
                      triggerClassName="w-[110px] h-8 text-xs"
                    />
                    <CustomSelect
                      itemList={["All", ...allEmployees]}
                      triggerText="Agent"
                      value={propertyFilters.createdBy}
                      onValueChange={(value) => {
                        const next = { ...propertyFilters, createdBy: value };
                        setPropertyFilters(next);
                        applyCandleFilters(next);
                      }}
                      triggerClassName="w-[120px] h-8 text-xs"
                    />
                  </>
                }
            />
          </div>
        )}

        {/* Reviews */}
        {canViewAllCharts && canAccess("reviewsDashboard") && reviews !== undefined && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Reviews Analytics
              </h3>
              <div className="flex gap-3 flex-wrap">
                <CustomSelect
                  itemList={[
                    "All",
                    "yesterday",
                    "last month",
                    "this month",
                    "10 days",
                    "15 days",
                    "1 month",
                    "3 months",
                  ]}
                  triggerText="Select days"
                  value={reviewsFilters.days || "this month"}
                  onValueChange={(value) => {
                    const newLeadFilters = { ...reviewsFilters, days: value };
                    setReviewsFilters(newLeadFilters);
                    fetchReviews(newLeadFilters);
                  }}
                  triggerClassName="w-32 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                <CustomSelect
                  itemList={["All", ...allEmployees]}
                  triggerText="Select agent"
                  value={reviewsFilters.createdBy || "All"}
                  onValueChange={(value) => {
                    const newLeadFilters = {
                      ...reviewsFilters,
                      createdBy: value,
                    };
                    setReviewsFilters(newLeadFilters);
                    fetchReviews(newLeadFilters);
                  }}
                  triggerClassName="w-36 h-9 text-xs bg-zinc-900 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
            <ReviewPieChart
              chartData={reviews}
              notReviewedBreakdown={notReviewedBreakdown}
            />
          </div>
        )}

        {/* Lead Statistics */}
        {canAccess("leadStatistics") && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📈 Monthly Lead Statistics</h2>
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </div>

            {statsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">
                  <Loader2 className="animate-spin" />
                </div>
              </div>
            )}

            {!statsLoading && (
              <AnimatedStatsWrapper direction={direction} monthKey={monthKey}>
                {filteredLeadStats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredLeadStats.map((loc: LeadStats, index: number) => (
                      <StatsCard
                        key={index}
                        title={loc.location}
                        target={loc.target}
                        achieved={loc.achieved}
                        today={loc.today}
                        yesterday={loc.yesterday}
                        dailyrequired={loc.dailyrequired}
                        dailyAchieved={loc.currentAverage}
                        rate={loc.rate}
                        selectedMonth={selectedMonth}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">
                      No data available for this month
                    </div>
                  </div>
                )}
              </AnimatedStatsWrapper>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

