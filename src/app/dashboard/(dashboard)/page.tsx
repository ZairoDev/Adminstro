"use client";

import { ReactNode, use, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  BarChart3,
  ChartLine,
  Loader,
  Loader2,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { AreaChart, Title } from "@tremor/react";
import { Card as TremorCard } from "@tremor/react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartConfig } from "@/components/ui/chart";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import useLeads from "@/hooks/(VS)/useLeads";
import { Button } from "@/components/ui/button";
import useTodayLeads from "@/hooks/(VS)/useTodayLead";
// import { LeadsByAgent } from "@/components/VS/dashboard/lead-by-agents";
import { LabelledPieChart } from "@/components/charts/LabelledPieChart";
// import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import { CustomStackBarChart } from "@/components/charts/StackedBarChart";
// import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActiveEmployeeList from "@/components/VS/dashboard/active-employee-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
// import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
// import { PropertyCountBarChart } from "@/components/charts/PropertyCountBarChart";
import usePropertyCount from "@/hooks/(VS)/usePropertyCount";
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
import { useAuthStore } from "@/AuthStore";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import axios from "axios";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import useReview from "@/hooks/(VS)/useReviews";
import { ReviewPieChart } from "@/components/charts/ReviewPieChart";
import { useRouter } from "next/navigation";
import ListingCounts from "@/hooks/(VS)/useListingCounts";
import { PropertyCountHistogram } from "@/components/charts/PropertyCountHistogram";
import { MoleculeVisualization } from "@/components/molecule_visual";
import { ChartAreaMultiple } from "@/components/CustomMultilineChart";
import { StatsCard } from "@/components/leadCountCard/page";
import useLeadStats from "@/hooks/(VS)/useLeadStats";
import useVisitStats from "@/hooks/(VS)/useVisitStats";
import { VisitStatsCard } from "@/components/visitCountCard/page";
import { CityVisitsChart } from "@/components/charts/VisitsHorizontalChart";
import useMonthlyVisitStats from "@/hooks/(VS)/useMonthlyVisitStats";
import { ReusableLineChart } from "@/components/charts/VisitsLineChart";
import useUnregisteredOwnerCounts from "@/hooks/(VS)/useUnregisteredOwnerCounts";
import BoostCounts from "@/hooks/(VS)/useBoosterCounts";
import SmallCard from "@/components/reusableCard";
import LocationCard from "@/components/reusableCard";
import SalesCard from "@/hooks/(VS)/useSalesCard";
import useBookingStats from "@/hooks/(VS)/useBookingStats";
import BookingChartDynamicAdvanced from "@/components/BookingChart";
import BookingChartImproved from "@/components/BookingChart";
import { BoostMultiLineChart } from "@/components/charts/BoostMultiLineChart";
import { DonutChart } from "@/components/charts/DonutChart";
import CityStatsCharts from "@/components/charts/DonutMessageStatus";
import { MonthSelector } from "@/components/MonthSelector/page";
import { AnimatedStatsWrapper } from "@/components/AnimatedWrapper/page";

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
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const locations = ["Athens", "Thessaloniki", "Chania", "Milan"];
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [leadCountDateModal, setLeadCountDateModal] = useState(false);
  const [leadCountDate, setLeadCountDate] = useState<Date | undefined>(
    new Date(2025, 5, 12)
  );

  const [leadsFilters, setLeadsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({});

  const [visitsFilter, setVisitsFilter] = useState<{
    days?: string;
  }>({});

  const [propertyFilters, setPropertyFilters] = useState<{
    days?: string;
    createdBy?: string;
  }>({});

  const [listingFilters, setListingFilter] = useState<{
    days?: string;
  }>({});

  const [BoostFilters, setBoostFilters] = useState<{
    days?: string;
  }>({});

  const [leadCountFilters, setLeadCountFilters] = useState<{
    days?: string;
  }>({});

  const [reviewsFilters, setReviewsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({});

  const [unregisteredOwnersFilters, setUnregisteredOwnersFilters] = useState<{
    days?: string;
    location?: string;
  }>({});

  const [leadGenLeadsCount, setLeadGenLeadsCount] = useState();

  const { token } = useAuthStore();

  //  Property Count

  const {
    properties,
    totalProperties,
    fetchCountryWiseProperties,
    countryWiseProperties,
    countryWiseTotalProperties,
  } = usePropertyCount();

  {
    /* Leads */
  }
  const {
    leads,
    locationLeads,
    fetchLeadByLocation,
    leadsGroupCount,
    fetchLeadStatus,
    allEmployees,
    fetchRejectedLeadGroup,
    rejectedLeadGroups,
    average,
    messageStatus,
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
  const { unregisteredOwnerCounts } = useUnregisteredOwnerCounts();

  const { bookingsByDate, fetchBookingStats } = useBookingStats();

  console.log("bookingsByDate:", bookingsByDate);

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
  const previousElevenDaysTotal = chartData
    .slice(0, -1) // all except last day
    .reduce((sum, item) => sum + (item.total ?? 0), 0);

  const todayTotal =
    chartData.length > 0 ? chartData[chartData.length - 1].total ?? 0 : 0;

  const boostChartData = useMemo(
    () =>
      totalBoosts.map((item) => ({
        date: item.date,
        total:
          item.total === null || item.total === undefined
            ? 0
            : Number(item.total),
        newBoosts:
          item.newBoosts === null || item.newBoosts === undefined
            ? 0
            : Number(item.newBoosts),
        reboosts:
          item.reboosts === null || item.reboosts === undefined
            ? 0
            : Number(item.reboosts),
      })),
    [totalBoosts]
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

  const router = useRouter();

  const handleClick = () => {
    router.push(`dashboard/unregistered-owner`);
  };

  const handlfetch = async () => {
    fetchUnregisteredVisits({ days: "today", location: "All" });
    fetchVisitsToday({ days: "today" });
    fetchVisits({ days: "today" });
    fetchGoodVisitsCount({ days: "today" });
  };

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

  const emp = allEmployees.length;

  const averagedata = (average / 30).toFixed(0);
  const averagedata1 = (Number(averagedata) / emp).toFixed(0);

  if (isError) {
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <p>{error}</p>
      </div>
    );
  }

  if (!leads) {
    return null;
  }

  const handleDateFilter = (value: string) => {
    const days = Number(value.split(" ")[0]);

    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - days));
    const endDate = new Date();

    setDate({ from: startDate, to: endDate });
  };

  const totalRejectedLeads = rejectedLeadGroups.reduce(
    (acc, curr) => acc + curr.count,
    0
  );

  const labels = ["0", "1", "2", "3", "4", "5+"];

  const bookingLabels = [
    "Total Amount",
    "Traveller Received / Amount",
    "Owner Received / Amount",
    "Documentaion Charges",
    "Agents Commision",
    "Received Amount/Final Amount",
  ];
  const previousSum = unregisteredOwnerCounts
    .slice(0, -1) // all except last day
    .reduce((acc, curr) => acc + curr.owners, 0);

  const todayOwners =
    unregisteredOwnerCounts[unregisteredOwnerCounts.length - 1]?.owners;

  const monthKey = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className=" my-2 ">
        {/* <h1 className="text-3xl font-bold mb-8">Booking Statistics</h1> */}
        <BookingChartImproved />
      </div>

      {token?.role === "SuperAdmin" && (
        <div className=" border rounded-md p-2">
          {/* Select country */}
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
                  )
                )}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* country-wise property count */}
          <div className=" mt-2">
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

      {/* Listings Dashboard */}
      {/* Listings Dashboard */}
      {(token?.role === "SuperAdmin" ||
        token?.role === "LeadGen-TeamLead" ||
        token?.role === "Advert") && (
        <section className="relative my-10">
          <h1 className="text-3xl font-bold mb-6">Lead-Gen Dashboard</h1>

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
            {(token?.role === "SuperAdmin" ||
              token?.role === "LeadGen-TeamLead") && (
              <ChartAreaMultiple data={chartData1} />
            )}
          </div>
        </section>
      )}

      {/* Leads Generation Dashboard*/}
      {(token?.role === "SuperAdmin" || token?.role === "LeadGen-TeamLead") && (
        <section className="space-y-6 p-6">
          <h1 className="text-3xl font-bold">Lead-Gen Dashboard</h1>

          {/* Daily Leads by Agent & Active Employees */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Today Leads - {totalTodayLeads}
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
            <div className="border rounded-md h-full flex flex-col gap-2 ">
              <ActiveEmployeeList />
              {/* Fresh Leads Card */}
              {token?.role === "SuperAdmin" && (
                <div className="border shadow-md p-4">
                  <LocationCard
                    title="Fresh Leads"
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

          {/* Leads by Location and Agent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Leads by Location */}
            {leadByLocationData && (
              <div className="space-y-4 border rounded-md p-4">
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
                    defaultValue="this month"
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
                    defaultValue="All"
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
                  key="fdg"
                />
              </div>
            )}

            {/* Right Column - Reviews */}
            {reviews && (
              <div className="space-y-4 relative border rounded-md p-4">
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
                    defaultValue="this month"
                    onValueChange={(value) => {
                      const newLeadFilters = { ...reviewsFilters };
                      newLeadFilters.days = value;
                      setReviewsFilters(newLeadFilters);
                      fetchReviews(newLeadFilters);
                    }}
                    triggerClassName="w-32"
                  />

                  <CustomSelect
                    itemList={["All", ...allEmployees]}
                    triggerText="Select agent"
                    defaultValue="All"
                    onValueChange={(value) => {
                      const newLeadFilters = { ...reviewsFilters };
                      newLeadFilters.createdBy = value;
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

          {/* Stats Cards */}
          <div className="space-y-6">
            {/* Month Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Lead Statistics</h2>
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </div>

            {/* Loading State */}
            {statsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">
                  <Loader2 className="animate-spin" />
                </div>
              </div>
            )}

            {/* Stats Grid */}
            {!statsLoading && (
              <AnimatedStatsWrapper direction={direction} monthKey={monthKey}>
                {leadStats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {leadStats.map((loc: LeadStats, index: number) => (
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
        </section>
      )}

      {/* Sales Generation Dashboard*/}
      {(token?.role === "SuperAdmin" || token?.role === "LeadGen-TeamLead") && (
        <section>
          <h1 className="text-3xl font-bold my-6">Sales Dashboard</h1>
          <Card>
            <CardHeader>
              <CardTitle>Sales by Agent</CardTitle>
            </CardHeader>
            <CardContent></CardContent>
          </Card>
          <div className=" grid grid-cols-1 md:grid-cols-2 gap-6  border rounded-md">
            <div className=" relative">
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
                triggerText="Select days"
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
                triggerClassName=" w-32 absolute left-2 top-2"
              />
              <Dialog
                open={leadCountDateModal}
                onOpenChange={setLeadCountDateModal}
              >
                <DialogContent className=" min-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Select Dates</DialogTitle>
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
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <CustomSelect
                itemList={[
                  "All",
                  "Athens",
                  "Chania",
                  "Rome",
                  "Milan",
                  "Thessaloniki",
                ]}
                triggerText="Select location"
                defaultValue="All"
                onValueChange={(value) => {
                  const newLeadFilters = { ...leadsFilters };
                  newLeadFilters.location = value;
                  setLeadsFilters(newLeadFilters);
                  fetchLeadStatus(newLeadFilters);
                  fetchRejectedLeadGroup(newLeadFilters);
                }}
                triggerClassName=" w-32 absolute left-2 top-16"
              />
              {token?.email !== "vikas@vacationsaga.com" && (
                <CustomSelect
                  itemList={["All", ...allEmployees]}
                  triggerText="Select agent"
                  defaultValue="All"
                  onValueChange={(value) => {
                    const newLeadFilters = { ...leadsFilters };
                    newLeadFilters.createdBy = value;
                    setLeadsFilters(newLeadFilters);
                    fetchLeadStatus(newLeadFilters);
                    fetchRejectedLeadGroup(newLeadFilters);
                  }}
                  triggerClassName=" w-32 absolute left-2 top-32 "
                />
              )}

              {leadsGroupCount.length > 0 ? (
                <LeadCountPieChart
                  heading="Leads Count"
                  chartData={leadsGroupCount.length > 0 ? leadsGroupCount : []}
                  totalAverage={averagedata}
                  empAverage={averagedata1}
                />
              ) : (
                <div>
                  <h1 className=" text-2xl text-center">No Data</h1>
                </div>
              )}
            </div>

            {/*Rejected Leads Group*/}
            <div className="  grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {rejectedLeadGroups ? (
                rejectedLeadGroups
                  .sort((a, b) => a.reason.localeCompare(b.reason))
                  .map((item, index) => (
                    <div
                      key={index}
                      className=" flex flex-col justify-center items-center border-b border-r"
                    >
                      <div
                        className={` text-lg md:text-2xl font-semibold justify-self-end text-center ${
                          (item.count / totalRejectedLeads) * 100 > 15
                            ? "text-red-500"
                            : (item.count / totalRejectedLeads) * 100 > 10
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                      >
                        <p>
                          {item.count}{" "}
                          <span className=" text-lg">
                            {`(${Math.round(
                              (item.count / totalRejectedLeads) * 100
                            )}%)`}
                          </span>
                        </p>
                      </div>
                      <p className=" text-sm flex flex-wrap text-center">
                        {item.reason}
                      </p>
                    </div>
                  ))
              ) : (
                <div className=" flex flex-col justify-center items-center">
                  <div className="h-full">
                    <h1 className=" text-2xl text-center">No Data</h1>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {token?.role === "SuperAdmin" && (
        <div className="min-h-screen">
      <div className="max-w-fullmx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
  <div className="flex items-center gap-3 mb-2">
    {/* <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg">
      <BarChart3 className="w-6 h-6 text-white" />
    </div> */}
    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
      Visits Dashboard
    </h1>
  </div>
  <p className="text-gray-600 dark:text-gray-400 ">
    Track and monitor visit statistics across all locations
  </p>
</div>


        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
    {visitStats.length > 0 ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {visitStats.length}
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
              <p className="text-gray-600 font-medium">Loading statistics...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait while we fetch the data</p>
            </div>
          )}

          {!visitStatsLoading && (
            <AnimatedStatsWrapper direction={directionVisit} monthKey={monthKey}>
              {visitStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
                  {visitStats.map((loc: VisitStats, index: number) => (
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
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="p-4 bg-gray-200 rounded-full mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-semibold text-lg">No data available</p>
                  <p className="text-gray-500 text-sm mt-1">Try selecting a different month</p>
                </div>
              )}
            </AnimatedStatsWrapper>
          )}

          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-1/2">
              <CityVisitsChart
                chartData={monthlyStats}
                title="City Visit Stats"
                description="Top cities by visit count"
              />
            </div>

            <div className="border-2 rounded-lg w-full lg:w-1/2">
              <CityStatsCharts data={messageStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
      )}

      {token?.role === "Advert" && (
        <>
          <div className="flex  border  rounded-xl shadow-md justify-center md:w-1/2 h-[600px]">
            <MoleculeVisualization data={ownersCount} />
          </div>
          <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-6 rounded-xl border border-border bg-card shadow-sm">
            {/* Filter Select */}
            <CustomSelect
              itemList={["All", "Today", "15 days", "1 month", "3 months"]}
              triggerText="Select Days"
              defaultValue="Today"
              onValueChange={(value) => {
                const newLeadFilters = {
                  ...unregisteredOwnersFilters,
                  days: value,
                };
                setUnregisteredOwnersFilters(newLeadFilters);
                fetchUnregisteredVisits(newLeadFilters);
              }}
              triggerClassName="w-36 mb-4"
            />

            {/* Heading */}
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">
              New Owners
            </h2>

            {/* Total Count */}
            <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
              {newOwnersCount.length}
            </div>

            {/* Location Counts */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(
                newOwnersCount.reduce((acc: any, item: any) => {
                  acc[item.location] = (acc[item.location] || 0) + 1;
                  return acc;
                }, {})
              ).map(([location, count], index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-muted shadow-sm hover:shadow-md transition-shadow duration-200"
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
          <div className="flex flex-col items-center justify-center md:w-1/2 ">
            <ReusableLineChart
              data={unregisteredOwnerCounts}
              title="New Owners"
            />
          </div>
        </>
      )}

      {token?.role === "SuperAdmin" && (
        <>
          <div className="flex flex-col md:flex-row gap-6 mt-8">
            {/* Properties Shown Summary (larger width) */}
            <div className="relative flex-1 p-6 border rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Properties Shown Summary
              </h2>
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
                  const newLeadFilters = {} as { days: string };
                  newLeadFilters.days = value;
                  // setReviewsFilters(newLeadFilters);
                  fetchGoodVisitsCount(newLeadFilters);
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

            {/* Unregistered Owners (smaller box) */}
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
          {(token?.role === "SuperAdmin" ||
            token?.role === "LeadGen-TeamLead") && (
            <div className="flex flex-coljustify-evenly md:flex-row  gap-6 mt-8">
              <div className="flex  border  rounded-xl shadow-md justify-center md:w-1/2 h-[600px]">
                <MoleculeVisualization data={ownersCount} />
              </div>

              <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-6 rounded-xl border border-border bg-card shadow-sm">
                {/* Filter Select */}
                <CustomSelect
                  itemList={["All", "Today", "15 days", "1 month", "3 months"]}
                  triggerText="Select Days"
                  defaultValue="Today"
                  onValueChange={(value) => {
                    const newLeadFilters = {
                      ...unregisteredOwnersFilters,
                      days: value,
                    };
                    setUnregisteredOwnersFilters(newLeadFilters);
                    fetchUnregisteredVisits(newLeadFilters);
                  }}
                  triggerClassName="w-36 mb-4"
                />

                {/* Heading */}
                <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">
                  New Owners
                </h2>

                {/* Total Count */}
                <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
                  {newOwnersCount.length}
                </div>

                {/* Location Counts */}
                <div className="w-full flex flex-col sm:grid-cols-2 gap-4">
                  {Object.entries(
                    newOwnersCount.reduce((acc: any, item: any) => {
                      acc[item.location] = (acc[item.location] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([location, count], index) => (
                    <div
                      key={index}
                      className="flex  items-center justify-between p-4 rounded-lg border border-border bg-muted shadow-sm hover:shadow-md transition-shadow duration-200"
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

              <div className="flex relative flex-col items-center justify-center md:w-1/2 ">
                <div className="absolute right-20 top-20 text-2xl font-extrabold ">
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
        </>
      )}

      <div>
        {token?.role === "SuperAdmin" && (
          <div className="flex flex-col md:flex-row gap-6 mt-8"></div>
        )}
      </div>

      <div className="relative w-full mx-auto">
        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle>Listings Created</CardTitle>
            <CardDescription>
              {listingFilters?.days || "Last 12 Days"}
            </CardDescription>

            {/* Range Selector */}
            <div className="text-xl font-medium text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">
                {previousElevenDaysTotal}+{todayTotal}
              </span>
            </div>

            <CustomSelect
              itemList={["12 days","this month", "1 year", "last 3 years"]}
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
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : isError ? (
              <p className="text-center text-red-500">Error: {error}</p>
            ) : chartData.length === 0 ? (
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
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    )}
                  margin={{ left: 0, right: 16 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(value) => {
                      if (listingFilters?.days === "last 3 years") return value; // Year
                      if (listingFilters?.days === "1 year") return value; // Month
                      return value; // Day + Month
                    }}
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

      <div className="relative w-full mx-auto mt-10">
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
    </div>
  );
};
export default Dashboard;
