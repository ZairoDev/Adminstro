"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
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
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";
import useSalesByAgentSection from "@/hooks/(VS)/useSalesByAgentSection";
import { useAuthStore } from "@/AuthStore";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";

export function SalesByAgentSection() {
  const { token } = useAuthStore();
  const {
    isAdmin,
    isTeamLead,
    hasLocationRestriction,
    accessibleLocations,
    canAccess,
  } = useDashboardAccess();

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [leadCountDateModal, setLeadCountDateModal] = useState(false);
  const [leadCountDate, setLeadCountDate] = useState<Date | undefined>(
    new Date(2025, 5, 12),
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

  const enabled = canAccess("salesByAgent");
  const hasFullLocationAccess =
    isAdmin || isTeamLead || !hasLocationRestriction;

  const {
    leadsGroupCount,
    fetchLeadStatus,
    allEmployees,
    fetchRejectedLeadGroup,
    rejectedLeadGroups,
    average,
    isLoading,
    isError,
    error,
  } = useSalesByAgentSection(enabled);

  if (!enabled) {
    return null;
  }

  const emp = allEmployees.length;
  const averagedata = (average / 30).toFixed(0);
  const averagedata1 = emp > 0 ? (Number(averagedata) / emp).toFixed(0) : "0";

  const totalRejectedLeads = rejectedLeadGroups.reduce(
    (acc, curr) => acc + curr.count,
    0,
  );

  if (isLoading) {
    return (
      <DashboardSectionSkeleton label="Loading sales data..." height="h-48" />
    );
  }

  if (isError) {
    return (
      <div className="w-full rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          Failed to load sales data: {error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <Card className="my-6 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        <CardTitle className="flex items-center gap-2 text-2xl">
          💼 Sales Performance by Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 rounded-lg bg-muted/50 p-4">
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
                  const newLeadFilters = { ...leadsFilters, days: value };
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
                  const newLeadFilters = { ...leadsFilters, location: value };
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
                    const newLeadFilters = {
                      ...leadsFilters,
                      createdBy: value,
                    };
                    setLeadsFilters(newLeadFilters);
                    fetchLeadStatus(newLeadFilters);
                    fetchRejectedLeadGroup(newLeadFilters);
                  }}
                  triggerClassName="w-36"
                />
              )}
            </div>

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

            {leadsGroupCount.length > 0 ? (
              <LeadCountPieChart
                heading="📊 Leads Status Distribution"
                chartData={leadsGroupCount}
                totalAverage={averagedata}
                empAverage={averagedata1}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 py-16">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              ❌ Rejection Reasons Analysis
              {totalRejectedLeads > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({totalRejectedLeads} total)
                </span>
              )}
            </h3>

            {rejectedLeadGroups.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {rejectedLeadGroups
                  .sort((a, b) => b.count - a.count)
                  .map((item, index) => {
                    const percentage = Math.round(
                      (item.count / totalRejectedLeads) * 100,
                    );
                    return (
                      <div
                        key={index}
                        className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                          percentage > 15
                            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                            : percentage > 10
                              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                              : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${
                            percentage > 15
                              ? "text-red-600 dark:text-red-400"
                              : percentage > 10
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {item.count}
                          <span className="ml-1 text-sm font-medium">
                            ({percentage}%)
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.reason}
                        </p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 py-16">
                <p className="text-muted-foreground">
                  No rejection data available
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
