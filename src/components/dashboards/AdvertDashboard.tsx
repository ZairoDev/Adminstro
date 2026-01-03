"use client";

import React, { useState, useMemo, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { MoleculeVisualization } from "@/components/molecule_visual";
import { ReusableLineChart } from "@/components/charts/VisitsLineChart";
import { BoostMultiLineChart } from "@/components/charts/BoostMultiLineChart";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartConfig } from "@/components/ui/chart";

// Hooks
import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import useUnregisteredOwnerCounts from "@/hooks/(VS)/useUnregisteredOwnerCounts";
import BoostCounts from "@/hooks/(VS)/useBoosterCounts";
import ListingCounts from "@/hooks/(VS)/useListingCounts";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { useRouter } from "next/navigation";

const chartConfig = {
  listings: {
    label: "Listings",
    color: "hsl(var(--chart-3))",
  },
  Boosts: {
    label: "Boosts",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

interface AdvertDashboardProps {
  className?: string;
}

export function AdvertDashboard({ className }: AdvertDashboardProps) {
  const router = useRouter();
  const { canAccess, role } = useDashboardAccess();

  // Filters
  const [unregisteredOwnersFilters, setUnregisteredOwnersFilters] = useState<{
    days?: string;
    location?: string;
  }>({});

  const [listingFilters, setListingFilter] = useState<{
    days?: string;
  }>({});

  const [BoostFilters, setBoostFilters] = useState<{
    days?: string;
  }>({});

  // Data hooks
  const {
    loading,
    unregisteredOwners,
    fetchUnregisteredVisits,
    ownersCount,
    newOwnersCount,
  } = WeeksVisit();

  const { unregisteredOwnerCounts } = useUnregisteredOwnerCounts();
  const { totalBoosts, fetchBoostCounts } = BoostCounts();
  const { totalListings, fetchListingCounts } = ListingCounts();

  // Transform data for charts
  const chartData = useMemo(
    () =>
      totalListings.map((item) => ({
        date: item.date,
        total:
          item.total === null || item.total === undefined
            ? 0
            : Number(item.total),
        shortTerm:
          item.shortTerm === null || item.shortTerm === undefined
            ? 0
            : Number(item.shortTerm),
        longTerm:
          item.longTerm === null || item.longTerm === undefined
            ? 0
            : Number(item.longTerm),
      })),
    [totalListings]
  );

  const previousElevenDaysTotal = chartData
    .slice(0, -1)
    .reduce((sum, item) => sum + (item.total ?? 0), 0);

  const todayTotal =
    chartData.length > 0 ? chartData[chartData.length - 1].total ?? 0 : 0;

  const previousSum = unregisteredOwnerCounts
    .slice(0, -1)
    .reduce((acc, curr) => acc + curr.owners, 0);

  const todayOwners =
    unregisteredOwnerCounts[unregisteredOwnerCounts.length - 1]?.owners;

  const handleClick = () => {
    router.push(`dashboard/unregistered-owner`);
  };

  // Only show for Advert role
  if (role !== "Advert") {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-8">
        <div className="p-6 bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl border">
          <h1 className="text-2xl font-bold mb-6">📢 Advert Dashboard</h1>

          {/* Molecule Visualization & New Owners */}
          {canAccess("moleculeVisualization") && (
            <div className="flex flex-col justify-evenly md:flex-row gap-6">
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
                👤 New Owners by Location
              </h2>

              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
                {newOwnersCount.length}
              </div>

              <div className="w-full flex flex-col sm:grid-cols-2 gap-4">
                {Object.entries(
                  newOwnersCount.reduce((acc: any, item: any) => {
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
              <div className="absolute right-20 top-24 text-2xl font-extrabold">
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

        {/* Unregistered Owners Count */}
        {canAccess("newOwners") && (
          <div className="flex flex-col md:flex-row gap-6 mt-8">
            <div className="relative w-full md:w-[250px] p-6 border rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                📋 Unregistered Owners
              </h2>
              <div
                onClick={handleClick}
                className="text-3xl mt-6 font-bold text-center cursor-pointer text-indigo-600 dark:text-indigo-400"
              >
                {unregisteredOwners.length}
              </div>
            </div>
          </div>
        )}

        {/* Listings Created Chart */}
        {canAccess("listingsCreated") && (
          <div className="relative w-full mx-auto mt-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              📝 New Listings Created
            </h2>
            <Card className="shadow-md rounded-2xl">
              <CardHeader>
                <CardTitle>Listings Over Time</CardTitle>
                <CardDescription>
                  {listingFilters?.days || "Last 12 Days"}
                </CardDescription>

                <div className="text-xl font-medium text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">
                    {previousElevenDaysTotal}+{todayTotal}
                  </span>
                </div>

                <CustomSelect
                  itemList={[
                    "12 days",
                    "this month",
                    "1 year",
                    "last 3 years",
                  ]}
                  triggerText="Select range"
                  defaultValue={listingFilters?.days || "this month"}
                  onValueChange={(value) => {
                    const newLeadFilters = { ...listingFilters };
                    newLeadFilters.days = value;
                    setListingFilter(newLeadFilters);
                    fetchListingCounts(newLeadFilters);
                  }}
                  triggerClassName="w-32 absolute right-2 top-2"
                />
              </CardHeader>

              <CardContent className="h-[400px]">
                {chartData.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData
                        .map((item) => ({
                          date: item.date,
                          shortTerm: item.shortTerm,
                          longTerm: item.longTerm,
                          total: item.total,
                        }))
                        .sort(
                          (a, b) =>
                            new Date(a.date).getTime() -
                            new Date(b.date).getTime()
                        )}
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={4}
                      />
                      <YAxis />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white shadow-md p-3 rounded-lg border">
                                <p className="font-semibold">{label}</p>
                                <p className="text-sm text-blue-600">
                                  Short-Term: {data.shortTerm}
                                </p>
                                <p className="text-sm text-green-600">
                                  Long-Term: {data.longTerm}
                                </p>
                                <p className="text-sm font-bold">
                                  Total: {data.total}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        dataKey="total"
                        type="monotone"
                        stroke={chartConfig.listings.color}
                        strokeWidth={2}
                        dot={{ fill: chartConfig.listings.color }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>

              <CardFooter className="flex-col items-start gap-2 text-sm" />
            </Card>
          </div>
        )}

        {/* Property Boost Performance */}
        {canAccess("propertyBoost") && (
          <div className="relative w-full mx-auto mt-10">
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
              isError={false}
              error=""
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvertDashboard;

