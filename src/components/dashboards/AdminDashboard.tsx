"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { PropertyCountHistogram } from "@/components/charts/PropertyCountHistogram";
import BookingChartImproved from "@/components/BookingChart";
import WeeklyTargetDashboard from "@/components/BookingTable";
import LoggedInEmployeesList from "@/components/VS/dashboard/logged-in-employees";
import RecentEmployeeSessions from "@/components/mini/RecentEmployeeSessions";
import { CandidateStatsChart } from "@/components/charts/CandidateStatsChart";
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
import usePropertyCount from "@/hooks/(VS)/usePropertyCount";
import useCandidateCounts from "@/hooks/(VS)/useCandidateCounts";
import ListingCounts from "@/hooks/(VS)/useListingCounts";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/AuthStore";
import { BroadcastNotificationForm } from "@/components/Notifications/BroadcastNotificationForm";

// Types
import { UserInterface } from "@/util/type";
import { employeeRoles } from "@/models/employee";

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

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const { isAdmin, canAccess, role } = useDashboardAccess();
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [selectedCountry, setSelectedCountry] = useState("All");
  const [listingFilters, setListingFilter] = useState<{
    days?: string;
  }>({});

  const [candidateFilters, setCandidateFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  // Password management state
  const [allEmployeesList, setAllEmployeesList] = useState<UserInterface[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<UserInterface[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isPasswordGenerating, setIsPasswordGenerating] = useState(false);

  // Data hooks
  const {
    properties,
    totalProperties,
    fetchCountryWiseProperties,
    countryWiseProperties,
    countryWiseTotalProperties,
  } = usePropertyCount();

  const { totalListings, fetchListingCounts } = ListingCounts();

  const {
    candidateCounts,
    fetchCandidateCounts,
    loading: candidateLoading,
    isError: candidateError,
    error: candidateErrorMsg,
    positions: candidatePositions,
    summary: candidateSummary,
    selectedMonth: candidateSelectedMonth,
    setSelectedMonth: setCandidateSelectedMonth,
    direction: candidateDirection,
  } = useCandidateCounts();

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

  const isHR = role === "HR";
  const isSuperAdmin = role === "SuperAdmin";

  // Fetch all employees for password management
  useEffect(() => {
    const fetchAllEmployees = async () => {
      if (token?.role === "SuperAdmin" || token?.role === "HR") {
        setLoadingEmployees(true);
        try {
          const response = await axios.get(`/api/employee/getAllEmployee`, {
            params: {
              currentPage: 1,
              queryType: "email",
              userInput: "",
              role: "",
            },
          });
          const employees = response.data.allEmployees || [];
          setAllEmployeesList(employees);
          setFilteredEmployees(employees);
        } catch (error) {
          console.error("Error fetching employees:", error);
        } finally {
          setLoadingEmployees(false);
        }
      }
    };
    fetchAllEmployees();
  }, [token?.role]);

  // Filter employees based on selected role and active status
  useEffect(() => {
    let filtered = allEmployeesList;
    
    // Filter by role if not "All"
    if (selectedRole !== "All") {
      filtered = filtered.filter((emp) => emp.role === selectedRole);
    }
    
    // Only include active employees
    filtered = filtered.filter((emp) => emp.isActive !== false);
    
    setFilteredEmployees(filtered);
  }, [selectedRole, allEmployeesList]);

  // Refresh all passwords function - reuses existing API logic
  const refreshAllPasswords = async () => {
    try {
      setIsPasswordGenerating(true);
      const response = await axios.get("/api/resetAllPasswords");
      if (response.status === 200) {
        toast({
          variant: "default",
          title: "Passwords Changed!",
          description: "All passwords have been regenerated successfully.",
        });
        // Refetch employees to update the UI with new passwords
        const refreshResponse = await axios.get(`/api/employee/getAllEmployee`, {
          params: {
            currentPage: 1,
            queryType: "email",
            userInput: "",
            role: "",
          },
        });
        const employees = refreshResponse.data.allEmployees || [];
        setAllEmployeesList(employees);
        setFilteredEmployees(employees);
      } else {
        throw new Error("Error in resetting password");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh passwords. Please try again.",
      });
      console.error("Error refreshing passwords:", err);
    } finally {
      setIsPasswordGenerating(false);
    }
  };

  // Only render if user has admin access
  if (!isAdmin && !isHR) {
    return null;
  }

  return (
    <div className={className}>
      {/* Broadcast Notification Form - SuperAdmin/HR only */}
      

      {/* HR & Admin Section - Logged In Employees + Candidate Stats */}
      {(isSuperAdmin || isHR) && canAccess("loggedInEmployees") && (
        <div className="mb-8 w-full p-6 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl border">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            👥 HR & Team Overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* CandidateStatsChart - Takes 3/4 width on large screens */}
            {canAccess("candidateStats") && (
              <div className="lg:col-span-3">
                <CandidateStatsChart
                  data={candidateCounts}
                  summary={candidateSummary}
                  positions={candidatePositions}
                  filters={candidateFilters}
                  onFilterChange={(filters) => {
                    setCandidateFilters(filters);
                    fetchCandidateCounts(filters);
                  }}
                  loading={candidateLoading}
                  isError={candidateError}
                  error={candidateErrorMsg}
                  selectedMonth={candidateSelectedMonth}
                  onMonthChange={setCandidateSelectedMonth}
                  direction={candidateDirection}
                />
              </div>
            )}

            {/* LoggedInEmployeesList - Takes 1/4 width on large screens */}
            <div className="lg:col-span-1  overflow-y-auto">
              <div className=" h-[40vh] overflow-y-auto">
                <LoggedInEmployeesList />
              </div>
              {/* Password Management Component - Below Active Employees List */}
              <div className="mt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🔐 Password Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Role Filter */}
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Roles</SelectItem>
                          {employeeRoles.map((role, index) => (
                            <SelectItem key={index} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Copy Passwords Button */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const copyPasswords = filteredEmployees?.map(
                            (row) => `${row.email} : ${row.password}`,
                          );
                          navigator.clipboard.writeText(
                            JSON.stringify(copyPasswords, null, 2),
                          );
                          toast({
                            description: "Passwords copied to clipboard",
                          });
                        }}
                        disabled={
                          filteredEmployees.length === 0 || loadingEmployees
                        }
                      >
                        Copy Passwords
                      </Button>

                      {/* Refresh All Passwords Button */}
                      <Button
                        variant="outline"
                        onClick={refreshAllPasswords}
                        disabled={isPasswordGenerating || loadingEmployees}
                        className="flex items-center gap-2"
                      >
                        {isPasswordGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {/* Employee Count */}
                      <div className="ml-auto text-sm text-muted-foreground">
                        {filteredEmployees.length} employee
                        {filteredEmployees.length !== 1 ? "s" : ""} shown
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="col-span-4">
              {/* Dynamic import not necessary here — small client fetch is fine */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <RecentEmployeeSessions />
            </div>
          </div>
        </div>
      )}

      {/* SuperAdmin Only Sections */}
      {isSuperAdmin && (
        <>
          {/* Booking Statistics */}
          {canAccess("bookingChart") && (
            <div className="my-2 bg-white dark:bg-stone-950 rounded-xl border">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                💰 Revenue Analytics
              </h2>
              <BookingChartImproved />
            </div>
          )}

          {/* Weekly Target */}
          {canAccess("weeklyTarget") && (
            <div className="my-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                🎯 Weekly Target Performance
              </h2>
              <WeeklyTargetDashboard />
            </div>
          )}

          {/* Property Count by Country */}
          {canAccess("propertyCount") && (
            <div className="my-6 p-6 bg-gradient-to-br from-cyan-50/50 to-sky-50/50 dark:from-cyan-950/20 dark:to-sky-950/20 rounded-xl border">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                🏠 Property Inventory by Location
              </h2>
              <Select
                onValueChange={(value) => {
                  setSelectedCountry(value);
                  if (value !== "All") {
                    fetchCountryWiseProperties({ country: value });
                  }
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="All">All Countries</SelectItem>
                    <SelectLabel>Country</SelectLabel>
                    {["Greece", "Italy", "Croatia", "Spain", "Portugal"].map(
                      (country, index) => (
                        <SelectItem key={index} value={country}>
                          {country}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="mt-2">
                <PropertyCountHistogram
                  heading={`Property Count - ${
                    selectedCountry === "All"
                      ? totalProperties
                      : countryWiseTotalProperties
                  }`}
                  chartData={
                    selectedCountry === "All"
                      ? properties
                        ? properties
                        : []
                      : countryWiseProperties
                        ? countryWiseProperties
                        : []
                  }
                />
              </div>
            </div>
          )}

          {/* Listings Created Chart */}
          {canAccess("listingsCreated") && (
            <div className="relative w-full mx-auto my-6 p-6  dark:bg-stone-950 rounded-xl border">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                📝 New Listings Created
              </h2>
              <Card className="shadow-md rounded-2xl bg-white/80 dark:bg-stone-950">
                <CardHeader>
                  <CardTitle className="text-lg">Listings Over Time</CardTitle>
                  <CardDescription className="text-base">
                    {listingFilters?.days || "Last 12 Days"}
                  </CardDescription>

                  <div className="text-2xl font-medium text-muted-foreground mt-1">
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
                              new Date(b.date).getTime(),
                          )}
                        margin={{ left: 0, right: 16 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                          tick={{ fontSize: 14 }}
                        />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip
                          cursor={false}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-stone-950 shadow-md p-3 rounded-lg border border-stone-200 dark:border-stone-800">
                                  <p className="font-semibold text-base text-foreground">
                                    {label}
                                  </p>
                                  <p className="text-base text-blue-600 dark:text-blue-400">
                                    Short-Term: {data.shortTerm}
                                  </p>
                                  <p className="text-base text-green-600 dark:text-green-400">
                                    Long-Term: {data.longTerm}
                                  </p>
                                  <p className="text-base font-bold text-foreground">
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
        </>
      )}
    </div>
  );
}

export default AdminDashboard;

