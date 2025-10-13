"use client";

import { ReactNode, use, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, RotateCw } from "lucide-react";

import { TrendingUp } from "lucide-react";
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
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
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
import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
import { PropertyCountBarChart } from "@/components/charts/PropertyCountBarChart";
import usePropertyCount from "@/hooks/(VS)/usePropertyCount";
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
import { useAuthStore } from "@/AuthStore";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import axios from "axios";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import { VisitsCountBarChart } from "@/components/charts/VisitsCountBarChart";
import useReview from "@/hooks/(VS)/useReviews";
import { ReviewPieChart } from "@/components/charts/ReviewPieChart";
import { table } from "console";
import { list } from "postcss";
// import { UnregisteredOwnersTable } from "@/app/dashboard/unregistered-owner/unregisteredTable";
import { useRouter } from "next/navigation";
import BookingDetails from "@/hooks/(VS)/useBookingDetails";
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

//  const chartConfig = {
//   greece: {
//     label: "Greece",
//     color: "hsl(var(--chart-1))",
//   },
//   italy: {
//     label: "Italy",
//     color: "hsl(var(--chart-2))",
//   },
//   croatia: {
//     label: "Croatia",
//     color: "hsl(var(--chart-3))",
//   },
//   spain: {
//     label: "Spain",
//     color: "hsl(var(--chart-4))",
//   },
//   portugal: {
//     label: "Portugal",
//     color: "hsl(var(--chart-5))",
//   },
// } satisfies ChartConfig;

// interface BookingDetailsIn {
//   _id: string;
//   "Total Amount": number;
//   "Owner Amount": number;
//   totalOwnerReceived: number;
//   "Traveller Amount": number;
//   totalTravellerReceived: number;
// }
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
  currentAverage: number; // dailyAchieved in StatsCard
  rate: number;
}
interface VisitStats {
  location: string;
  target: number;
  achieved: number;
  today: number;
  yesterday: number;
  dailyRequired: number;
  currentAverage: number; // dailyAchieved in StatsCard
  rate: number;
}


const chartConfig = {
  listings: {
    label: "Listings",
    color: "hsl(var(--chart-3))", // you can use tailwind variable
  },
} satisfies ChartConfig;

const Dashboard = () => {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const locations = ["Athens", "Thessaloniki", "Chania", "Milan"];
  // const [todayLeadStats, setTodayLeadStats] = useState<Record<string, number>>({});
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [leadCountDateModal, setLeadCountDateModal] = useState(false);
  const [leadCountDate, setLeadCountDate] = useState<Date | undefined>(
    new Date(2025, 5, 12)
  );
  const [listUnregisteredOwners, setUnregisteredOwners] = useState(false);

  const [fetchloading, setFetchLoading] = useState(false);

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
    todayLeadStats,

    // average,
  } = useTodayLeads();

  const {
    loading,
    setloading,
    visits,
    fetchVisits,
    visitsToday,
    fetchVisitsToday,
    goodVisits,
    fetchGoodVisitsCount,
    unregisteredOwners,
    fetchUnregisteredVisits,
    ownersCount,
    newOwnersCount,
  } = WeeksVisit();



  const { totalListings, fetchListingCounts } = ListingCounts();

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

  // const {visitsCount,fetchVisitsCount} = VisitsCount();
  const {
    reviews,
    revLoading,
    setRevLoading,
    revError,
    setRevError,
    revErr,
    setRevErr,
    fetchReviews,
  } = useReview();

  const {
    leadStats,
    statsLoading,
    setStatsLoading,
    statsError,
    setStatsError,
    statsErrMsg,
    setStatsErrMsg,
    fetchLeadStats,
  } = useLeadStats();

   const {
    visitStats,
    visitStatsLoading,
    setVisitStatsLoading,
    visitStatsError,
    setVisitStatsError,
    visitStatsErrMsg,
    setVisitStatsErrMsg,
    fetchVisitStats,
  } = useVisitStats();

  // const { bookingDetails, bookingLoading, fetchBookingDetails } = BookingDetails();

  const {
     monthlyStats,
    errMsg,
    fetchMonthlyVisitStats,
  } = useMonthlyVisitStats();
  

  const router = useRouter();

  const handleClick = () => {
    // const serialized = encodeURIComponent(JSON.stringify(unregisteredOwners));
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
  // console.log(emp);

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

  // useEffect(() => {
  //   const fetchLeads = async () => {
  //     try {
  //       const res = await axios.get("/api/getLeadStats");
  //       const data: { location: string; totalLeads: number }[] = res.data;

  //       const leadsMap: Record<string, number> = {};
  //       locations.forEach((loc) => {
  //         const found = data.find((d) => d.location === loc);
  //         leadsMap[loc] = found?.totalLeads || 0;
  //       });

  //       setTodayLeadStats(leadsMap);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };

  //   fetchLeads();
  // }, []);

  const bookingLabels = [
    "Total Amount",
    "Traveller Received / Amount",
    "Owner Received / Amount",
    "Documentaion Charges",
    "Agents Commision",
    "Received Amount/Final Amount",
  ];
  // const FinalAmount = ((bookingDetails?.ownerAmount ?? 0) + (bookingDetails?.travellerAmount ??0)) - ((bookingDetails?.totalDocumentationCommission ?? 0) - (bookingDetails?.totalAgentCommission ?? 0));

  // const finalReceived = ((bookingDetails?.totalOwnerReceived ?? 0) + (bookingDetails?.totalTravellerReceived ?? 0))- ((bookingDetails?.totalDocumentationCommission ?? 0) - (bookingDetails?.totalAgentCommission ?? 0));

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Property Count */}
      <div className="w-full flex flex-wrap gap-6 justify-center p-4">
        {/* Circle 1 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.First}
          </div>
          <p className="text-sm font-medium text-gray-700">First Text</p>
        </div>

        {/* Circle 2 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.Second}
          </div>
          <p className="text-sm font-medium text-gray-700">Second Text</p>
        </div>

        {/* Circle 3 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-pink-700 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.Third}
          </div>
          <p className="text-sm font-medium text-gray-700">Third Text</p>
        </div>

        {/* Circle 4 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.Fourth}
          </div>
          <p className="text-sm font-medium text-gray-700">Fourth Text</p>
        </div>

        {/* Circle 5 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.Options}
          </div>
          <p className="text-sm font-medium text-gray-700">Options</p>
        </div>

        {/* Circle 6 */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xl font-bold shadow-lg hover:scale-110 hover:shadow-xl transition-transform duration-300 cursor-pointer">
            {messageStatus?.Visit}
          </div>
          <p className="text-sm font-medium text-gray-700">Visit</p>
        </div>
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
            {/* <PropertyCountBarChart
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
            /> */}
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
        <section>
          <h1 className="text-3xl font-bold my-6">Lead-Gen Dashboard</h1>
          {/* Daily Leads by Agent & Active Employees */}
          <div className=" w-full grid grid-cols-1 lg:grid-cols-3 gap-y-4 relative">
            <div className=" w-full flex relative lg:col-span-2">
              <CustomStackBarChart
                heading={`Today Leads - ${totalTodayLeads}`}
                subHeading="Leads by Agent"
                chartData={todaysLeadChartData ? todaysLeadChartData : []}
                // footer = {`${totalTodayLeads} leads`}
                // requiredLeads={`${averagedata}`}
              />
              <Button
                size={"sm"}
                onClick={refetchTodayLeads}
                className="absolute top-0 right-0"
              >
                <RotateCw
                  className={`${isLoadingTodayLeads ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {/* Active Employees */}
            <div className=" h-full border rounded-md w-72 mx-auto justify-self-center lg:absolute right-0">
              <ActiveEmployeeList />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex justify-end gap-4 mt-4">
            {/* <Select onValueChange={(value) => handleDateFilter(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="7 days">7 days</SelectItem>
              <SelectItem value="10 days">10 days</SelectItem>
              <SelectItem value="15 days">15 days</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select> */}

            {/* Date Picker */}
            {/* <DatePickerWithRange date={date} setDate={setDate} className="" /> */}

            {/* <Button onClick={refetch}>Apply</Button>
        <Button onClick={reset}>Reset</Button> */}
          </div>

          {/* Leads by Location and Agent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Left Column */}
            {leadByLocationData && (
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
                  ]}
                  triggerText="Select days"
                  defaultValue="All"
                  onValueChange={(value) => {
                    const newLeadFilters = { ...propertyFilters };
                    newLeadFilters.days = value;
                    setPropertyFilters(newLeadFilters);
                    fetchLeadByLocation(newLeadFilters);
                  }}
                  triggerClassName=" w-32 absolute left-2 top-2"
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
                  triggerClassName=" w-32 absolute left-2 top-16 "
                />
                <LabelledPieChart
                  chartData={locationLeads.map((lead) => ({
                    label: lead._id,
                    count: lead.count,
                  }))}
                  heading="Leads By Location"
                  // footer="Footer data"
                  key="fdg"
                />
              </div>
            )}
            {reviews && (
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
                  ]}
                  triggerText="Select days"
                  defaultValue="All"
                  onValueChange={(value) => {
                    const newLeadFilters = { ...reviewsFilters };
                    newLeadFilters.days = value;
                    setReviewsFilters(newLeadFilters);
                    fetchReviews(newLeadFilters);
                  }}
                  triggerClassName=" w-32 absolute left-2 top-2"
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
                  triggerClassName=" w-32 absolute left-2 top-16 "
                />
                <ReviewPieChart
                  chartData={reviews}
                  // heading="Leads By Location"
                  // // footer="Footer data"
                  // key="fdg"
                />
              </div>
            )}

            <div className="flex items-center rounded-lg m-4">
              {leadStats.map((loc: LeadStats, index: number) => (
                <StatsCard
                  className="m-8"
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

            {/* <Card className="shadow-md">
          <CardHeader>
          <CardTitle>Leads by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsByLocation leadsByLocation={leads.leadsByLocation} />
            </CardContent>
        </Card> */}

            {/* Right Column */}
            {/* <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Leads by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsByAgent leadsByAgent={leads.leadsByAgent} />
          </CardContent>
        </Card> */}

            {/* Right Column */}
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
                defaultValue="All"
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
        <div className="relative">
          <div className=" flex flex-col gap-y-4 mt-4">
            <h1 className=" mt-2 text-3xl font-semibold ">Visits Dashboard</h1>

            {/* <div className="relative  mt-8">
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
                  const newLeadFilters = { ...visitsFilter };
                  newLeadFilters.days = value;
                  setVisitsFilter(newLeadFilters);
                  fetchVisits(newLeadFilters);
                }}
                triggerClassName=" w-32 absolute left-2 top-2"
              /> */}
            {/* <VisitsCountBarChart
                heading={"Visits Dashboard"}
                chartData={visits}
              /> */}

            <div className="flex  items-start justify-between gap-6 m-4 w-full">
              <div className="flex   items-start justify-between gap-6">
                {visitStats.map((loc: VisitStats, index: number) => (
                  <VisitStatsCard
                    key={index}
                    className="m-4"
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

              <div className="w-full">
                <CityVisitsChart
                  chartData={monthlyStats}
                  title="City Visit Stats"
                  description="Top cities by visit count"
                />
              </div>
            </div>

            {/* </div>  */}
            {/* <div className="relative  mt-8">
              <CustomSelect
                itemList={[
                  "Today",
                  "Tomorrow",
                  "yesterday",
                  "This Week",
                  "Next Week",
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
                  const newLeadFilters = { ...visitsFilter };
                  newLeadFilters.days = value;
                  // setVisitsFilter(newLeadFilters);
                  fetchVisitsToday(newLeadFilters);
                }}
                triggerClassName=" w-32 absolute left-2 top-2"
              />
              <VisitsCountBarChart
                heading={"Visits Dashboard  "}
                chartData={visitsToday}
              />
            </div> */}
          </div>
        </div>
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
            token?.role === "LeadGen-TeamLead" ||
            token?.role === "Advert") && (
            <div className="flex flex-col border border-red-500 justify-evenly md:flex-row  gap-6 mt-8">
              <div className="flex border border-blue-500 justify-center md:w-1/2 h-[600px]">
                <MoleculeVisualization data={ownersCount} />
              </div>

              <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-6  rounded-xl shadow-md border border-green-300">
  {/* Filter Select */}
  <CustomSelect
    itemList={["All", "Today", "15 days", "1 month", "3 months"]}
    triggerText="Select Days"
    defaultValue="Today"
    onValueChange={(value) => {
      const newLeadFilters = { ...unregisteredOwnersFilters, days: value };
      setUnregisteredOwnersFilters(newLeadFilters);
      fetchUnregisteredVisits(newLeadFilters);
    }}
    triggerClassName="w-36 mb-4"
  />

  {/* Heading */}
  <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6">
    New Owners
  </h2>

  {/* Total Count */}
  <div className="text-4xl md:text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-6">
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
        className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
      >
        <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{location}</p>
        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{(count)as ReactNode}</p>
      </div>
    ))}
  </div>
</div>


              <div className="flex flex-col items-center justify-center md:w-1/2 border border-yellow-500">
                <CityVisitsChart chartData={monthlyStats} />
              </div>
            </div>
          )}
        </>
      )}

      <div>
        {token?.role === "SuperAdmin" && (
          <div className="flex flex-col md:flex-row gap-6 mt-8">
            {/* Properties Shown Summary (larger width) */}
            {/* <div className="relative flex-1 p-6 border rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Booking Summary
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
                fetchBookingDetails(newLeadFilters);
              }}
              triggerClassName="w-32 absolute right-6 top-4"
            />
            {bookingDetails ? (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm text-left text-gray-700 dark:text-gray-200">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <tr>
                      {bookingLabels.map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-4 py-2 text-xs font-semibold text-left border-b"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white dark:bg-gray-950 text-center">
                      <td className="px-4 py-2 border-b">
                        €{bookingDetails?.totalAmount ?? 0}
                      </td>
                      <td className="px-4 py-2 border-b">
                        €{bookingDetails?.totalTravellerReceived ?? 0} / €
                        {bookingDetails?.travellerAmount ?? 0}
                      </td>
                      <td className="px-4 py-2 border-b">
                        €{bookingDetails?.totalOwnerReceived ?? 0} / €
                        {bookingDetails?.ownerAmount ?? 0}
                      </td>

                      <td className="px-4 py-2 border-b">
                        €{bookingDetails?.totalAgentCommission ?? 0}
                      </td>
                      <td className="px-4 py-2 border-b">
                        €{bookingDetails?.totalDocumentationCommission ?? 0}
                      </td>
                      <td className="px-4 py-2 border-b">
                        €{finalReceived ?? 0} / €{FinalAmount ?? 0}
                      </td>
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
          </div> */}
          </div>
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

            <CustomSelect
              itemList={["12 days", "1 year", "last 3 years"]}
              triggerText="Select range"
              defaultValue={listingFilters?.days || "12 days"}
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
    </div>
  );
};
export default Dashboard;
