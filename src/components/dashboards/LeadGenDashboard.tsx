"use client";

import React, { useState, useMemo } from "react";
import { Loader2, RotateCw, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { CustomStackBarChart } from "@/components/charts/StackedBarChart";
import { LabelledPieChart } from "@/components/charts/LabelledPieChart";
import { ReviewPieChart } from "@/components/charts/ReviewPieChart";
import { ChartAreaMultiple } from "@/components/CustomMultilineChart";
import { StatsCard } from "@/components/leadCountCard/page";
import { MonthSelector } from "@/components/MonthSelector/page";
import { AnimatedStatsWrapper } from "@/components/AnimatedWrapper/page";
import { WebsiteLeadsLineChart } from "@/components/charts/WebsiteLeadsLineChart";
import ActiveEmployeeList from "@/components/VS/dashboard/active-employee-list";
import LocationCard from "@/components/reusableCard";

// Hooks
import useLeads from "@/hooks/(VS)/useLeads";
import useTodayLeads from "@/hooks/(VS)/useTodayLead";
import useReview from "@/hooks/(VS)/useReviews";
import useLeadStats from "@/hooks/(VS)/useLeadStats";
import useWebsiteLeadsCounts from "@/hooks/(VS)/useWebsiteLeadsCounts";
import SalesCard from "@/hooks/(VS)/useSalesCard";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";

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

export function LeadGenDashboard({ className }: LeadGenDashboardProps) {
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
  }>({
    days: "this month",
    createdBy: "All",
  });

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
  const {
    leads,
    locationLeads,
    fetchLeadByLocation,
    allEmployees,
    isLoading,
  } = useLeads({ date: undefined });

  const {
    leads: todayLeads,
    totalLeads: totalTodayLeads,
    refetch: refetchTodayLeads,
    isLoading: isLoadingTodayLeads,
    fetchLeadsByLeadGen,
    chartData1,
  } = useTodayLeads();

  const { reviews, fetchReviews } = useReview();

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

  const leadByLocationData = leads?.leadsByLocation?.map((lead) => {
    return { label: lead._id, count: lead.count };
  });

  // Filter lead stats by accessible locations for non-admin users
  const filteredLeadStats = useMemo(() => {
    if (isAdmin || accessibleLocations.length === 0) {
      return leadStats;
    }
    return leadStats.filter((stat: LeadStats) =>
      accessibleLocations.some(
        (loc) => loc.toLowerCase() === stat.location.toLowerCase()
      )
    );
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

        {/* Leads by Location and Reviews - For LeadGen Team */}
        {canViewAllCharts && canAccess("leadsByLocation") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Leads by Location */}
            {leadByLocationData && (
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="text-lg font-semibold">📍 Leads Distribution by Location</h3>
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
                    value={propertyFilters.days}
                    onValueChange={(value) => {
                      const newLeadFilters = { ...propertyFilters };
                      newLeadFilters.days = value;
                      setPropertyFilters(newLeadFilters);
                      fetchLeadByLocation(newLeadFilters);
                    }}
                    triggerClassName="w-32"
                  />

                  <CustomSelect
                    itemList={["All", ...allEmployees]}
                    triggerText="Select agent"
                    value={propertyFilters.createdBy}
                    onValueChange={(value) => {
                      const newLeadFilters = { ...propertyFilters };
                      newLeadFilters.createdBy = value;
                      setPropertyFilters(newLeadFilters);
                      fetchLeadByLocation(newLeadFilters);
                    }}
                    triggerClassName="w-32"
                  />
                </div>
                <LabelledPieChart
                  chartData={locationLeads.map((lead) => ({
                    label: lead._id,
                    count: lead.count,
                  }))}
                  heading="Leads By Location"
                  key="leads-by-location"
                />
              </div>
            )}

            {/* Right Column - Reviews */}
            {canAccess("reviewsDashboard") && reviews !== undefined && (
              <div className="space-y-4 relative border rounded-md p-4">
                <h3 className="text-lg font-semibold">⭐ Reviews Analytics</h3>
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
                    triggerClassName="w-32"
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
                    triggerClassName="w-32"
                  />
                </div>
                <ReviewPieChart chartData={reviews} />
              </div>
            )}
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

export default LeadGenDashboard;

