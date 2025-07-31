"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, RotateCw } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
import { PropertyCountBarChart } from "@/components/charts/PropertyCountBarChart";
import usePropertyCount from "@/hooks/(VS)/usePropertyCount";
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
import { useAuthStore } from "@/AuthStore";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import axios from "axios";

const Dashboard = () => {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState("All");

  const [leadsFilters, setLeadsFilters] = useState<{
    days?: string;
    location?: string;
    createdBy?: string;
  }>({});

  const [propertyFilters, setPropertyFilters] = useState<{
    days?: string;
    createdBy?: string;
  }>({});

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
  } = useTodayLeads();

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

  // const fetchEmployee = async()=>{
  //   try{
  //     const response = await axios.get(`/api/employee/getAllEmployee`, {
  //       params: {
  //         role:  token?.role,
  //       },
  //   })
  //   console.log(response.data.allEmployees);
  // }
  //   catch(error){
  //     console.log(error);
  //   }
  // }
  // useEffect(()=>{
  //   fetchEmployee();
  // },[token?.role])

  // if (isLoading) {
  //   return (
  //     <div className=" w-full h-screen flex justify-center items-center">
  //       <Loader2 className=" animate-spin" />
  //     </div>
  //   );
  // }

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

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Property Count */}
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
            <PropertyCountBarChart
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

      {/* Leads Generation Dashboard*/}
      <section>
        <h1 className="text-3xl font-bold my-6">Lead-Gen Dashboard</h1>
        {/* Daily Leads by Agent & Active Employees */}
        <div className=" w-full grid grid-cols-1 lg:grid-cols-3 gap-y-4 relative">
          <div className=" w-full flex relative lg:col-span-2">
            <CustomStackBarChart
              heading={`Today Leads - ${totalTodayLeads}`}
              subHeading="Leads by Agent"
              chartData={todaysLeadChartData ? todaysLeadChartData : []}
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
                  "this month",
                  "10 days",
                  "1 month",
                  "3 months",
                ]}
                triggerText="Select days"
                defaultValue="All"
                onValueChange={(value) => {
                  // fetchLeadStatus(value);
                  // fetchRejectedLeadGroup(value);
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
                  // fetchLeadStatus(value);
                  // fetchRejectedLeadGroup(value);
                  const newLeadFilters = { ...propertyFilters };
                  newLeadFilters.createdBy = value;
                  setPropertyFilters(newLeadFilters);
                  fetchLeadByLocation(newLeadFilters);
                  // fetchAllEmployees();
                  // fetchRejectedLeadGroup(newLeadFilters);
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

      {/* Sales Generation Dashboard*/}
      {(token?.role === "SuperAdmin" || token?.role === "LeadGen-TeamLead") && (
        <section>
          <h1 className="text-3xl font-bold my-6">Sales Dashboard</h1>
          <div className=" grid grid-cols-1 md:grid-cols-2 gap-6  border rounded-md">
            <div className=" relative">
              <CustomSelect
                itemList={[
                  "All",
                  "yesterday",
                  "this month",
                  "10 days",
                  "1 month",
                  "3 months",
                ]}
                triggerText="Select days"
                defaultValue="All"
                onValueChange={(value) => {
                  const newLeadFilters = { ...leadsFilters };
                  newLeadFilters.days = value;
                  setLeadsFilters(newLeadFilters);
                  fetchLeadStatus(newLeadFilters);
                  fetchRejectedLeadGroup(newLeadFilters);
                }}
                triggerClassName=" w-32 absolute left-2 top-2"
              />
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

              {leadsGroupCount.length > 0 ? (
                <LeadCountPieChart
                  heading="Leads Count"
                  chartData={leadsGroupCount.length > 0 ? leadsGroupCount : []}
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

      {/* <LabelledPieChart chartData={chartData} /> */}
      {/* <LabelledBarChart chartData={chartData} /> */}
    </div>
  );
};
export default Dashboard;
