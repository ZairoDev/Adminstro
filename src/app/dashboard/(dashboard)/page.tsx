"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, User, MapPin, Shield, Users } from "lucide-react";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartConfig } from "@/components/ui/chart";
import axios from "axios";

// Auth & Dashboard Access
import { useAuthStore } from "@/AuthStore";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { getRandomQuote } from "@/util/getRandomQuote";

// Dashboard Components
import { 
  LeadGenDashboard, 
  SalesDashboard, 
  AdminDashboard,
  AdvertDashboard,
  LoggedInEmployeesList 
} from "@/components/dashboards";

// Charts
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
import { ReviewPieChart } from "@/components/charts/ReviewPieChart";
import { PropertyCountHistogram } from "@/components/charts/PropertyCountHistogram";
import { CityVisitsChart } from "@/components/charts/VisitsHorizontalChart";
import { ReusableLineChart } from "@/components/charts/VisitsLineChart";
import { BoostMultiLineChart } from "@/components/charts/BoostMultiLineChart";
import { WebsiteLeadsLineChart } from "@/components/charts/WebsiteLeadsLineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import CityStatsCharts from "@/components/charts/DonutMessageStatus";
import { CandidateStatsChart } from "@/components/charts/CandidateStatsChart";

// Hooks
import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import useReview from "@/hooks/(VS)/useReviews";
import { useRouter } from "next/navigation";
import ListingCounts from "@/hooks/(VS)/useListingCounts";
import useLeadStats from "@/hooks/(VS)/useLeadStats";
import useVisitStats from "@/hooks/(VS)/useVisitStats";
import useMonthlyVisitStats from "@/hooks/(VS)/useMonthlyVisitStats";
import useUnregisteredOwnerCounts from "@/hooks/(VS)/useUnregisteredOwnerCounts";
import BoostCounts from "@/hooks/(VS)/useBoosterCounts";
import useWebsiteLeadsCounts from "@/hooks/(VS)/useWebsiteLeadsCounts";
import SalesCard from "@/hooks/(VS)/useSalesCard";
import useBookingStats from "@/hooks/(VS)/useBookingStats";
import useCandidateCounts from "@/hooks/(VS)/useCandidateCounts";
import useLeads from "@/hooks/(VS)/useLeads";
import useTodayLeads from "@/hooks/(VS)/useTodayLead";
import usePropertyCount from "@/hooks/(VS)/usePropertyCount";

// Components
import { MoleculeVisualization } from "@/components/molecule_visual";
import { ChartAreaMultiple } from "@/components/CustomMultilineChart";
import { StatsCard } from "@/components/leadCountCard/page";
import { VisitStatsCard } from "@/components/visitCountCard/page";
import SmallCard from "@/components/reusableCard";
import LocationCard from "@/components/reusableCard";
import BookingChartDynamicAdvanced from "@/components/BookingChart";
import BookingChartImproved from "@/components/BookingChart";
import { MonthSelector } from "@/components/MonthSelector/page";
import { AnimatedStatsWrapper } from "@/components/AnimatedWrapper/page";
import WeeklyTargetDashboard from "@/components/BookingTable";

// Types
import { UserInterface } from "@/util/type";

interface StatusCount {
  First: number;
  Second: number;
  Third: number;
  Fourth: number;
  Options: number;
  Visit: number;
  None: number;
  Null: number;
}

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

const Dashboard = () => {
  const { token } = useAuthStore();
  const {
    role,
    isLeadGen,
    isSales,
    isAdmin,
    isTeamLead,
    hasLocationRestriction,
    accessibleLocations,
    canAccess,
  } = useDashboardAccess();

  const router = useRouter();

  // State declarations
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [leadCountDateModal, setLeadCountDateModal] = useState(false);
  const [leadCountDate, setLeadCountDate] = useState<Date | undefined>(
    new Date(2025, 5, 12)
  );
  

  const [leadsFilters, setLeadsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({
    days: "this month",
    location: "All",
    createdBy: "All",
  });

  const [visitsFilter, setVisitsFilter] = useState<{
    days?: string;
  }>({});

  const [propertyFilters, setPropertyFilters] = useState<{
    days?: string;
    createdBy?: string;
  }>({
    days: "this month",
    createdBy: "All",
  });

  const [listingFilters, setListingFilter] = useState<{
    days?: string;
  }>({});

  const [BoostFilters, setBoostFilters] = useState<{
    days?: string;
  }>({});

  const [websiteLeadsFilters, setWebsiteLeadsFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  const [leadCountFilters, setLeadCountFilters] = useState<{
    days?: string;
  }>({});

  const [reviewsFilters, setReviewsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({
    days: "this month",
    createdBy: "All",
  });

  const [unregisteredOwnersFilters, setUnregisteredOwnersFilters] = useState<{
    days?: string;
    location?: string;
  }>({});

  const [candidateFilters, setCandidateFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  const [leadGenLeadsCount, setLeadGenLeadsCount] = useState();

  //  Property Count

  const {
    properties,
    totalProperties,
    fetchCountryWiseProperties,
    countryWiseProperties,
    countryWiseTotalProperties,
  } = usePropertyCount();

  const {
    leads,
    leadsGroupCount,
    fetchLeadStatus,
    allEmployees,
    fetchRejectedLeadGroup,
    rejectedLeadGroups,
    average,
    isLoading,
    isError,
    error,
    refetch,
    reset,
  } = useLeads({
    date,
  });
  const {
    leads: todayLeads,
    totalLeads: totalTodayLeads,
    refetch: refetchTodayLeads,
    isLoading: isLoadingTodayLeads,
    fetchLeadsByLeadGen,
    chartData1,
  } = useTodayLeads();

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

  const { salesCardData } = SalesCard();

  // console.log("Sales Card Data from Dashboard:", salesCardData);
  const { totalListings, fetchListingCounts } = ListingCounts();
  const { totalBoosts, fetchBoostCounts, activeBoosts } = BoostCounts();
  const {
    websiteLeads,
    fetchWebsiteLeadsCounts,
    loading: websiteLeadsLoading,
    isError: websiteLeadsError,
    error: websiteLeadsErrorMsg,
  } = useWebsiteLeadsCounts();
  const { unregisteredOwnerCounts } = useUnregisteredOwnerCounts();

  const { bookingsByDate, fetchBookingStats } = useBookingStats();

  // Candidate counts for HR Dashboard
  const {
    candidateCounts,
    fetchCandidateCounts,
    loading: candidateLoading,
    isError: candidateError,
    error: candidateErrorMsg,
    positions: candidatePositions,
    summary: candidateSummary,
  } = useCandidateCounts();

  // console.log("bookingsByDate:", bookingsByDate);

  // Transform data for recharts (make sure counts are numbers)
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

  const { reviews, fetchReviews } = useReview();

  const {
    leadStats,
    statsLoading,
    selectedMonth,
    setSelectedMonth,
    direction,
  } = useLeadStats();

  const {
    visitStats,
    visitStatsLoading,
    selectedVisitMonth,
    setSelectedVisitMonth,
    directionVisit,
  } = useVisitStats();

  const { monthlyStats, errMsg, fetchMonthlyVisitStats } =
    useMonthlyVisitStats();

  const emp = allEmployees.length;
  const averagedata = (average / 30).toFixed(0);
  const averagedata1 = (Number(averagedata) / emp).toFixed(0);

  const totalRejectedLeads = rejectedLeadGroups.reduce(
    (acc, curr) => acc + curr.count,
    0
  );

  // Get random quote for current user (must be before early returns)
  const displayQuote = useMemo(() => {
    if (!token?.name) return "Welcome to your dashboard!";
  
    const firstName = token.name.trim().split(" ")[0];
    return getRandomQuote(firstName);
  }, [token?.name]);
  
  if (isError) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center gap-4">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!leads) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Determine which dashboards to show based on role
  const showAdminDashboard = isAdmin || role === "HR";
  const showLeadGenDashboard = isLeadGen || isAdmin || role === "LeadGen-TeamLead";
  const showSalesDashboard = isSales || isAdmin || role === "Sales-TeamLead";
  const showAdvertDashboard = role === "Advert";

  // Check if user is a team lead or has no location restriction
  const hasFullLocationAccess = isAdmin || isTeamLead || !hasLocationRestriction;

  return (
    <div className="container mx-auto p-4 md:p-6">

      {/* Welcome Quote Section */}
      <div className="mb-6 p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          {displayQuote}
        </p>
      </div>


      {/* Admin Dashboard (HR, SuperAdmin) */}
      {showAdminDashboard && <AdminDashboard />}

      {/* Lead Generation Dashboard */}
      {showLeadGenDashboard && <LeadGenDashboard />}

      {/* Advert Dashboard - Only for Advert role */}
      {showAdvertDashboard && <AdvertDashboard />}

      {/* Sales by Agent Section - Only for Sales team (not for LeadGen or Advert) */}
      {showSalesDashboard && !showAdvertDashboard && canAccess("salesByAgent") && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
            <CardTitle className="flex items-center gap-2 text-2xl">
              💼 Sales Performance by Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Filters and Pie Chart */}
              <div className="space-y-4">
                {/* Filters Row */}
                <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
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
                      "Custom",
                    ]}
                    triggerText="Time Period"
                    defaultValue="this month"
                    onValueChange={(value) => {
                      if (value === "Custom") {
                        setLeadCountDateModal(true);
                        return;
                      }
                      const newLeadFilters = { ...leadsFilters };
                      newLeadFilters.days = value;
                      setLeadsFilters(newLeadFilters);
                      fetchLeadStatus(newLeadFilters);
                      fetchRejectedLeadGroup(newLeadFilters);
                    }}
                    triggerClassName="w-36"
                  />
                  
                  <CustomSelect
                    itemList={
                      hasFullLocationAccess
                        ? ["All", "Athens", "Chania", "Milan", "Thessaloniki"]
                        : ["All", ...accessibleLocations]
                    }
                    triggerText="Location"
                    defaultValue="All"
                    onValueChange={(value) => {
                      const newLeadFilters = { ...leadsFilters };
                      newLeadFilters.location = value;
                      setLeadsFilters(newLeadFilters);
                      fetchLeadStatus(newLeadFilters);
                      fetchRejectedLeadGroup(newLeadFilters);
                    }}
                    triggerClassName="w-36"
                  />
                  
                  {token?.email !== "vikas@vacationsaga.com" && (
                    <CustomSelect
                      itemList={["All", ...allEmployees]}
                      triggerText="Agent"
                      defaultValue="All"
                      onValueChange={(value) => {
                        const newLeadFilters = { ...leadsFilters };
                        newLeadFilters.createdBy = value;
                        setLeadsFilters(newLeadFilters);
                        fetchLeadStatus(newLeadFilters);
                        fetchRejectedLeadGroup(newLeadFilters);
                      }}
                      triggerClassName="w-36"
                    />
                  )}
                </div>

                {/* Date Picker Dialog */}
                <Dialog
                  open={leadCountDateModal}
                  onOpenChange={setLeadCountDateModal}
                >
                  <DialogContent className="max-w-fit">
                    <DialogHeader>
                      <DialogTitle>Select Date Range</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <Calendar
                        mode="single"
                        defaultMonth={leadCountDate}
                        numberOfMonths={2}
                        selected={date?.from}
                        onSelect={setLeadCountDate}
                        className="rounded-lg border shadow-sm"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Apply</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Pie Chart */}
                {leadsGroupCount.length > 0 ? (
                  <LeadCountPieChart
                    heading="📊 Leads Status Distribution"
                    chartData={leadsGroupCount}
                    totalAverage={averagedata}
                    empAverage={averagedata1}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>

              {/* Right Column - Rejected Leads */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  ❌ Rejection Reasons Analysis
                  {totalRejectedLeads > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({totalRejectedLeads} total)
                    </span>
                  )}
                </h3>
                
                {rejectedLeadGroups && rejectedLeadGroups.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {rejectedLeadGroups
                      .sort((a, b) => b.count - a.count)
                      .map((item, index) => {
                        const percentage = Math.round((item.count / totalRejectedLeads) * 100);
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                              percentage > 15
                                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                                : percentage > 10
                                ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                                : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                            }`}
                          >
                            <div className={`text-2xl font-bold ${
                              percentage > 15
                                ? "text-red-600 dark:text-red-400"
                                : percentage > 10
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-green-600 dark:text-green-400"
                            }`}>
                              {item.count}
                              <span className="text-sm font-medium ml-1">({percentage}%)</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.reason}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No rejection data available</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Dashboard - For Sales, Sales-TeamLead (not for Advert, they have their own) */}
      {showSalesDashboard && !showAdvertDashboard && <SalesDashboard />}
    </div>
  );
};

export default Dashboard;
