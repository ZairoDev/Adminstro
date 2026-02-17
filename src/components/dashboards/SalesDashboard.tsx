"use client";

import React, { useState, useMemo, ReactNode } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { VisitStatsCard } from "@/components/visitCountCard/page";
import { CityVisitsChart } from "@/components/charts/VisitsHorizontalChart";
import { MonthSelector } from "@/components/MonthSelector/page";
import { AnimatedStatsWrapper } from "@/components/AnimatedWrapper/page";
import { MoleculeVisualization } from "@/components/molecule_visual";
import { ReusableLineChart } from "@/components/charts/VisitsLineChart";
import { BoostMultiLineChart } from "@/components/charts/BoostMultiLineChart";
import { RetargetCountDisplay } from "@/components/charts/RetargetCountChart";
import { RetargetHistogram } from "@/components/charts/RetargetHistogram";
// import CityStatsCharts from "@/components/charts/DonutMessageStatus";
import BookingChartImproved from "@/components/BookingChart";
import WeeklyTargetDashboard from "@/components/BookingTable";
import { PhoneNumberHealth } from "@/components/whatsapp/PhoneNumberHealth";
import { BroadcastNotificationForm } from "@/components/Notifications/BroadcastNotificationForm";

// Hooks
import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import useVisitStats from "@/hooks/(VS)/useVisitStats";
import useMonthlyVisitStats from "@/hooks/(VS)/useMonthlyVisitStats";
import useUnregisteredOwnerCounts from "@/hooks/(VS)/useUnregisteredOwnerCounts";
import BoostCounts from "@/hooks/(VS)/useBoosterCounts";
import useRetargetStats from "@/hooks/(VS)/useRetargetStats";
import useLeads from "@/hooks/(VS)/useLeads";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { useRouter } from "next/navigation";

interface VisitStats {
  location: string;
  target: number;
  achieved: number;
  today: number;
  yesterday: number;
  dailyRequired: number;
  currentAverage: number;
  rate: number;
}

interface SalesDashboardProps {
  className?: string;
}

export function SalesDashboard({ className }: SalesDashboardProps) {
  const router = useRouter();
  const { 
    isAdmin, 
    canAccess, 
    accessibleLocations, 
    isSales, 
    isTeamLead, 
    hasLocationRestriction,
    role,
    isLeadGen
  } = useDashboardAccess();

  // Determine if user has full access (no location restriction)
  const hasFullAccess = isAdmin || !hasLocationRestriction || isTeamLead || role === "Sales-TeamLead";

  // Filters - All hooks must be called before any conditional returns
  const [unregisteredOwnersFilters, setUnregisteredOwnersFilters] = useState<{
    days?: string;
    location?: string;
  }>({});

  const [BoostFilters, setBoostFilters] = useState<{
    days?: string;
  }>({});

  const [retargetFilters, setRetargetFilters] = useState<{
    days?: string;
    location?: string;
  }>({ days: "this month", location: "All" });

  // Data hooks
  const {
    loading,
    fetchVisits,
    fetchVisitsToday,
    goodVisits,
    fetchGoodVisitsCount,
    unregisteredOwners,
    fetchUnregisteredVisits,
    ownersCount,
    newOwnersCount,
  } = WeeksVisit();

  const {
    visitStats,
    visitStatsLoading,
    selectedVisitMonth,
    setSelectedVisitMonth,
    directionVisit,
  } = useVisitStats();

  const { monthlyStats, fetchMonthlyVisitStats } = useMonthlyVisitStats();
  const { unregisteredOwnerCounts } = useUnregisteredOwnerCounts();
  const { totalBoosts, fetchBoostCounts, activeBoosts } = BoostCounts();
  const { messageStatus, isLoading, isError, error } = useLeads({ date: undefined });

  const {
    counts: retargetCounts,
    histogram: retargetHistogram,
    loading: retargetLoading,
    isError: retargetError,
    error: retargetErrorMsg,
    fetchRetargetStats,
  } = useRetargetStats();

  // Filter visit stats by accessible locations (only for restricted Sales roles)
  const filteredVisitStats = useMemo(() => {
    // Sales-TeamLead, Admin, and other exempt roles see all locations
    if (hasFullAccess || accessibleLocations.length === 0) {
      return visitStats;
    }
    return visitStats.filter((stat: VisitStats) =>
      accessibleLocations.some(
        (loc) => loc.toLowerCase() === stat.location.toLowerCase()
      )
    );
  }, [visitStats, accessibleLocations, hasFullAccess]);

  // Filter new owners count by location (only for restricted Sales roles)
  const filteredNewOwnersCount = useMemo(() => {
    if (hasFullAccess) {
      return newOwnersCount;
    }
    // Filter by location field if user has location restrictions
    return newOwnersCount.filter((item: any) => {
      if (!item.location) return true;
      return accessibleLocations.some(
        (loc) => loc.toLowerCase() === item.location.toLowerCase()
      );
    });
  }, [newOwnersCount, hasFullAccess, accessibleLocations]);

  const monthKey = useMemo(
    () =>
      `${selectedVisitMonth.getFullYear()}-${selectedVisitMonth.getMonth()}`,
    [selectedVisitMonth]
  );

  // Security: Only Sales team should access this dashboard
  // This check must come AFTER all hooks are called
  if (isLeadGen && !isAdmin && role !== "Sales-TeamLead") {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">You don&apos;t have permission to view Sales data.</p>
      </div>
    );
  }

  const handleClick = () => {
    router.push(`dashboard/unregistered-owner`);
  };

  const labels = ["0", "1", "2", "3", "4", "5+"];

  const previousSum = unregisteredOwnerCounts
    .slice(0, -1)
    .reduce((acc, curr) => acc + curr.owners, 0);

  const todayOwners =
    unregisteredOwnerCounts[unregisteredOwnerCounts.length - 1]?.owners;

  // Check if any Sales section is accessible
  const hasSalesAccess = canAccess("visitStatistics") || 
                         canAccess("newOwners") || 
                         canAccess("revenueAnalytics") ||
                         canAccess("targetPerformance");

  // Admin roles see Revenue Analytics & Target Performance in AdminDashboard, not here
  const showRevenueAndTargetHere = !isAdmin && !["SuperAdmin", "Admin", "Developer"].includes(role);

  // WhatsApp features visible to SuperAdmin, Sales-TeamLead, and Sales
  const canViewWhatsAppFeatures = ["SuperAdmin", "Sales-TeamLead", "Sales"].includes(role);

  if (!hasSalesAccess) {
    return null;
  }

  return (
    <div className={className}>
      {/* Broadcast Notification Form - SuperAdmin/HR only */}
      {(role === "SuperAdmin" || role === "HR") && (
        <div className="my-6 flex justify-end">
          <BroadcastNotificationForm />
        </div>
      )}
      
      {/* WhatsApp Phone Number Health */}
      {canViewWhatsAppFeatures && (
        <div className="my-6">
          <PhoneNumberHealth />
        </div>
      )}
      {/* Revenue Analytics - Only for Sales Team and Sales-TeamLead (SuperAdmin/Admin sees it in AdminDashboard) */}
      {canAccess("revenueAnalytics") && showRevenueAndTargetHere && (
        <div className="my-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            📊 Revenue Analytics
          </h2>
          <BookingChartImproved />
        </div>  
      )}

      {/* Target Performance - Only for Sales Team and Sales-TeamLead (SuperAdmin/Admin sees it in AdminDashboard) */}
      {canAccess("targetPerformance") && showRevenueAndTargetHere && (
        <div className="my-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            🎯 Weekly Target Performance
          </h2>
          <WeeklyTargetDashboard />
        </div>
      )}

      {/* Retargeting Statistics */}
      {canAccess("retargetingStatistics") && (
        <div className="my-8 p-6 space-y-6 bg-white dark:bg-stone-950 rounded-xl border">
          <h1 className="text-2xl font-bold">🔄 Retargeting Statistics</h1>

          <RetargetCountDisplay
            owners={
              retargetCounts?.owners || {
                pending: 0,
                retargeted: 0,
                blocked: 0,
                total: 0,
              }
            }
            guests={
              retargetCounts?.guests || {
                pending: 0,
                retargeted: 0,
                blocked: 0,
                total: 0,
              }
            }
            loading={retargetLoading}
          />

          <RetargetHistogram
            data={retargetHistogram}
            filters={retargetFilters}
            onFilterChange={(newFilters) => {
              setRetargetFilters(newFilters);
              fetchRetargetStats(newFilters);
            }}
            loading={retargetLoading}
            isError={retargetError}
            error={retargetErrorMsg}
          />
        </div>
      )}

      {/* Visit Statistics Dashboard */}
      {canAccess("visitStatistics") && (
        <div className="my-8 p-6 bg-white dark:bg-stone-950 rounded-xl border">
          <div className="max-w-full mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  📍 Visits Dashboard
                </h1>
                {/* Show location badge only for restricted Sales users */}
                {isSales && !hasFullAccess && accessibleLocations.length > 0 && (
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    {accessibleLocations.join(", ")}
                  </span>
                )}
                {/* Show "All Locations" badge for team leads */}
                {(role === "Sales-TeamLead" || hasFullAccess) && (
                  <span className="text-sm bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">
                    All Locations
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Track and monitor visit statistics
                {isSales && !hasFullAccess && " for your assigned locations"}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filteredVisitStats.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {filteredVisitStats.length}
                        </span>{" "}
                        active locations
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      No locations available
                    </span>
                  )}
                </div>
                <MonthSelector
                  selectedMonth={selectedVisitMonth}
                  onMonthChange={setSelectedVisitMonth}
                />
              </div>

              {visitStatsLoading && (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">
                    Loading statistics...
                  </p>
                </div>
              )}

              {!visitStatsLoading && (
                <AnimatedStatsWrapper
                  direction={directionVisit}
                  monthKey={monthKey}
                >
                  {filteredVisitStats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
                      {filteredVisitStats.map(
                        (loc: VisitStats, index: number) => (
                          <VisitStatsCard
                            key={index}
                            title={loc.location}
                            target={loc.target}
                            achieved={loc.achieved}
                            today={loc.today}
                            yesterday={loc.yesterday}
                            dailyrequired={loc.dailyRequired}
                            dailyAchieved={loc.currentAverage}
                            rate={loc.rate}
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                      <div className="p-4 bg-gray-200 rounded-full mb-4">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-semibold text-lg">
                        No data available
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {isSales && !hasFullAccess
                          ? "No data for your assigned locations"
                          : "Try selecting a different month"}
                      </p>
                    </div>
                  )}
                </AnimatedStatsWrapper>
              )}

              <div className="flex flex-col lg:flex-row gap-6 w-full">
                <div className="w-full ">

                  <CityVisitsChart
                    chartData={monthlyStats}
                    title="City Visit Stats"
                    description="Top cities by visit count"
                  />
                </div>

                {/* <div className="border-2 rounded-lg w-full lg:w-1/2">
                  <h3 className="text-lg font-semibold p-4 text-gray-800 dark:text-gray-200">
                    💬 Message Status Overview
                  </h3>
                  <CityStatsCharts data={messageStatus} />
                </div> */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Owners Section */}
      {canAccess("newOwners") && (
        <div className="my-8 p-6 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20 rounded-xl border">
          <h2 className="text-2xl font-bold mb-6">👤 New Owners & Properties</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Properties Shown Summary */}
            <div className="relative flex-1 p-6 bg-white dark:bg-gray-900 border rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                📊 Properties Shown Summary
              </h3>
              <CustomSelect
                itemList={[
                  "Today",
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
                defaultValue="Today"
                onValueChange={(value) => {
                  fetchGoodVisitsCount({ days: value });
                }}
                triggerClassName="w-32 absolute right-6 top-4"
              />
              {goodVisits ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto text-sm text-left text-gray-700 dark:text-gray-200">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-2 font-semibold border-b">
                          Total Leads
                        </th>
                        {labels.map((label) => (
                          <th
                            key={label}
                            className="px-4 py-2 font-semibold border-b"
                          >
                            {label} Shown
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white dark:bg-gray-950">
                        <td className="px-4 py-2 border-b">
                          {goodVisits.total}
                        </td>
                        {labels.map((label) => (
                          <td key={label} className="px-4 py-2 border-b">
                            {goodVisits[label]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex justify-center items-center h-24">
                  <h1 className="text-xl text-gray-500 dark:text-gray-400">
                    No Data Available
                  </h1>
                </div>
              )}
            </div>

            {/* Unregistered Owners */}
            <div className="relative w-full md:w-[250px] p-6 border rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Unregistered Owners
              </h2>
              <div
                onClick={handleClick}
                className="text-3xl mt-6 font-bold text-center cursor-pointer text-indigo-600 dark:text-indigo-400"
              >
                {unregisteredOwners.length}
              </div>
            </div>
          </div>

          {/* Molecule Visualization & New Owners */}
          {canAccess("moleculeVisualization") && (
            <div className="flex flex-col justify-evenly md:flex-row gap-6 mt-8">
              <div className="flex flex-col border rounded-xl shadow-md justify-center md:w-1/2 h-[600px]">
                <h3 className="text-lg font-semibold p-4 text-gray-800 dark:text-gray-200 text-center">
                  🔬 Owner Distribution Visualization
                </h3>
                <MoleculeVisualization data={ownersCount} />
              </div>

              <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-6 rounded-xl border border-border bg-card shadow-sm">
                <CustomSelect
                  itemList={["All", "Today", "15 days", "1 month", "3 months"]}
                  triggerText="Select Days"
                  defaultValue="Today"
                  onValueChange={(value) => {
                    const newFilters = {
                      ...unregisteredOwnersFilters,
                      days: value,
                    };
                    setUnregisteredOwnersFilters(newFilters);
                    fetchUnregisteredVisits(newFilters);
                  }}
                  triggerClassName="w-36 mb-4"
                />

                <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">
                  New Owners
                </h2>

                <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
                  {filteredNewOwnersCount.length}
                </div>

                <div className="w-full flex flex-col sm:grid-cols-2 gap-4">
                  {Object.entries(
                    filteredNewOwnersCount.reduce((acc: any, item: any) => {
                      acc[item.location] = (acc[item.location] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([location, count], index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <p className="text-lg font-medium text-muted-foreground">
                        {location}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {count as ReactNode}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex relative flex-col items-center justify-center md:w-1/2">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                  📈 New Owners Trend
                </h3>
                <div className="absolute right-20 top-20 text-2xl font-extrabold">
                  <div>
                    {previousSum} + {todayOwners}
                  </div>
                </div>

                <ReusableLineChart
                  data={unregisteredOwnerCounts || []}
                  title="New Owners"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Property Boost Performance */}
      {canAccess("propertyBoost") && (
        <div className="relative w-full mx-auto my-8 p-6 bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/20 rounded-xl border">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            🚀 Property Boost Performance
          </h2>
          <BoostMultiLineChart
            data={totalBoosts}
            filters={BoostFilters}
            onFilterChange={(value) => {
              const newBoostFilters = { ...BoostFilters, days: value };
              setBoostFilters(newBoostFilters);
              fetchBoostCounts(newBoostFilters);
            }}
            loading={loading}
            isError={isError}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

export default SalesDashboard;
