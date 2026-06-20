"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { DateRange } from "react-day-picker";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";
import { CelebrationView } from "@/components/CelebrationView";
import { CelebrationNotification } from "@/components/CelebrationNotification";
import { PersonalReminderBanner } from "@/components/reminders/PersonalReminderBanner";
import { TodaysEvents } from "@/util/getTodaysEvents";
import { toast } from "sonner";
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

// Auth & Dashboard Access
import { useAuthStore } from "@/AuthStore";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { getRandomQuote } from "@/util/getRandomQuote";

import {
  AdminDashboard,
  LeadGenDashboard,
  SalesDashboard,
} from "@/components/dashboard/lazyDashboards";
import { SuperAdminTabDashboard } from "@/components/dashboard/SuperAdminTabDashboard";
import { TwoTabDashboard } from "@/components/dashboard/TwoTabDashboard";

const AdvertDashboard = dynamic(
  () => import("@/features/advert/AdvertDashboard"),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton label="Loading advert dashboard..." height="h-96" />
    ),
  },
);

// Charts
import { LeadCountPieChart } from "@/components/charts/LeadsCountPieChart";
import { VisitsCreatedByMultiLineChart } from "@/components/charts/VisitsCreatedByMultiLineChart";

// Hooks
import useSalesByAgentSection from "@/hooks/(VS)/useSalesByAgentSection";
import {
  emptyCelebrations,
  useCelebrations,
} from "@/hooks/shared/useCelebrations";
import { useVisitsCreatedByStats } from "@/hooks/shared/useVisitsCreatedByStats";

// Components
import { BroadcastNotificationForm } from "@/components/Notifications/BroadcastNotificationForm";

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

  // State declarations
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  // selectedCountry kept intentionally — used by child dashboards via context in Phase 3
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

  const [visitsCreatedByFilters, setVisitsCreatedByFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  const showAdminDashboard = isAdmin || role === "HR";
  const showLeadGenDashboard = isLeadGen || isAdmin || role === "LeadGen-TeamLead";
  const showSalesDashboard = isSales || isAdmin || role === "Sales-TeamLead";
  const showAdvertDashboard = role === "Advert";
  const showSalesByAgentSection =
    showSalesDashboard && !showAdvertDashboard && canAccess("salesByAgent");

  const {
    data: visitsCreatedByData,
    isLoading: visitsLoading,
    isError: visitsCreatedByIsError,
    error: visitsCreatedByQueryError,
  } = useVisitsCreatedByStats(
    visitsCreatedByFilters,
    Boolean(token?.id) && showAdminDashboard && !showAdvertDashboard,
  );

  const visitsCreatedByCreators = visitsCreatedByData?.creators ?? [];
  const visitsCreatedBySeries = visitsCreatedByData?.data ?? [];
  const visitsCreatedByError = visitsCreatedByIsError
    ? visitsCreatedByQueryError instanceof Error
      ? visitsCreatedByQueryError.message
      : "Failed to load visit stats"
    : "";

  const {
    leadsGroupCount,
    fetchLeadStatus,
    allEmployees,
    fetchRejectedLeadGroup,
    rejectedLeadGroups,
    average,
    isLoading: isLeadLoading,
    isError,
    error,
  } = useSalesByAgentSection(showSalesByAgentSection);

  const emp = allEmployees.length;
  const averagedata = (average / 30).toFixed(0);
  const averagedata1 = (Number(averagedata) / emp).toFixed(0);

  const totalRejectedLeads = rejectedLeadGroups.reduce(
    (acc, curr) => acc + curr.count,
    0
  );

  // Celebration flip-card dismissal (quote flip UI)
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);
  const celebrationToastShownRef = useRef(false);

  const {
    data: centralizedCelebrations = emptyCelebrations,
    isLoading: isLoadingCelebrations,
  } = useCelebrations(Boolean(token?.id));

  useEffect(() => {
    if (isLoadingCelebrations) return;

    const dismissedKey = `celebration_dismissed_${new Date().toDateString()}`;
    setIsCelebrationDismissed(sessionStorage.getItem(dismissedKey) === "true");

    const todayKey = new Date().toDateString();
    const seenKey = `celebrations_seen_${todayKey}`;
    const wasSeen = sessionStorage.getItem(seenKey) === "true";
    setIsNotificationDismissed(wasSeen);

    if (!centralizedCelebrations.hasEvents || wasSeen || celebrationToastShownRef.current) return;

    celebrationToastShownRef.current = true;
    const data = centralizedCelebrations;
    if (data.birthdays.length === 1 && data.anniversaries.length === 0) {
      toast.success(`🎉 Today is ${data.birthdays[0].firstName}'s birthday!`);
    } else if (data.anniversaries.length === 1 && data.birthdays.length === 0) {
      toast.success(
        `👏 Today is ${data.anniversaries[0].firstName}'s ${data.anniversaries[0].years}-year work anniversary!`,
      );
    } else {
      toast.success(
        `🎉 ${data.totalCount} celebration${data.totalCount !== 1 ? "s" : ""} today!`,
      );
    }
  }, [isLoadingCelebrations, centralizedCelebrations]);

  const displayQuote = useMemo(() => {
    if (!token?.name) return "Welcome to your dashboard!";
  
    const firstName = token.name.trim().split(" ")[0];
    return getRandomQuote(firstName);
  }, [token?.name]);

  const flipCardEvents = useMemo((): TodaysEvents => {
    const birthdays = centralizedCelebrations.birthdays.map((b) => ({
      employeeId: b.employeeId,
      firstName: b.firstName,
      fullName: b.fullName,
      isCurrentUser: b.employeeId === token?.id,
    }));
    const anniversaries = centralizedCelebrations.anniversaries.map((a) => ({
      employeeId: a.employeeId,
      firstName: a.firstName,
      fullName: a.fullName,
      years: a.years ?? 0,
      isCurrentUser: a.employeeId === token?.id,
    }));

    const sortEvents = <T extends { isCurrentUser: boolean; firstName: string }>(
      events: T[],
    ): T[] =>
      [...events].sort((a, b) => {
        if (a.isCurrentUser && !b.isCurrentUser) return -1;
        if (!a.isCurrentUser && b.isCurrentUser) return 1;
        return a.firstName.localeCompare(b.firstName);
      });

    return {
      birthdays: sortEvents(birthdays),
      anniversaries: sortEvents(anniversaries),
      hasEvents: centralizedCelebrations.hasEvents,
    };
  }, [centralizedCelebrations, token?.id]);

  // Handle celebration dismissal (quote flip UI)
  const handleDismissCelebration = () => {
    setIsCelebrationDismissed(true);
    const dismissedKey = `celebration_dismissed_${new Date().toDateString()}`;
    sessionStorage.setItem(dismissedKey, "true");
  };

  // Handle notification dismissal (centralized notifications)
  const handleDismissNotification = () => {
    setIsNotificationDismissed(true);
    const todayKey = new Date().toDateString();
    const seenKey = `celebrations_seen_${todayKey}`;
    sessionStorage.setItem(seenKey, "true");
  };

  // Handle view details - show celebration view
  const handleViewCelebrationDetails = () => {
    setIsCelebrationDismissed(false);
    setTimeout(() => {
      const quoteSection = document.querySelector('[data-celebration-section]');
      quoteSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const showCelebration =
    !isLoadingCelebrations &&
    !isCelebrationDismissed &&
    flipCardEvents.hasEvents;
  
  // Determine which dashboards to show based on role (show* vars defined above with hooks)

  // Check if user is a team lead or has no location restriction
  const hasFullLocationAccess = isAdmin || isTeamLead || !hasLocationRestriction;

  return (
    <div className=" w-full p-4 md:p-6">
      {/* Centralized Celebration Notification Banner */}
      {!isLoadingCelebrations &&
        !isNotificationDismissed &&
        centralizedCelebrations.hasEvents && (
          <CelebrationNotification
            birthdays={centralizedCelebrations.birthdays}
            anniversaries={centralizedCelebrations.anniversaries}
            onDismiss={handleDismissNotification}
            onViewDetails={handleViewCelebrationDetails}
          />
        )}

      <PersonalReminderBanner />

      {/* Welcome Quote Section / Celebration View */}
      <div
        className="mb-6 perspective-1000"
        style={{ minHeight: "120px" }}
        data-celebration-section
      >
        <div
          className="relative w-full transition-transform duration-700 ease-in-out"
          style={{
            transform: showCelebration ? "rotateX(180deg)" : "rotateX(0deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Quote Card (back face) */}
          <div
            className="absolute inset-0 w-full backface-hidden"
            style={{
              transform: "rotateX(0deg)",
            }}
          >
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                {displayQuote}
              </p>

              {(role === "SuperAdmin" || role === "HR") && (
                <BroadcastNotificationForm />
              )}
            </div>
          </div>

          {/* Celebration Card (front face) */}
          <div
            className="relative w-full backface-hidden"
            style={{
              transform: "rotateX(180deg)",
            }}
          >
            {showCelebration ? (
              <CelebrationView
                birthdays={flipCardEvents.birthdays}
                anniversaries={flipCardEvents.anniversaries}
                onDismiss={handleDismissCelebration}
              />
            ) : (
              <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  {displayQuote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SuperAdmin: tab interface — only active tab mounts */}
      {role === "SuperAdmin" && <SuperAdminTabDashboard />}

      {/* Sales-TeamLead: Sales + Lead Gen tabs */}
      {role === "Sales-TeamLead" && (
        <TwoTabDashboard
          tabs={[
            { key: "sales", label: "Sales", dashboard: "sales" },
            { key: "leadgen", label: "Lead Gen", dashboard: "leadgen" },
          ]}
          defaultTab="sales"
        />
      )}

      {/* LeadGen-TeamLead: Lead Gen + Admin tabs */}
      {role === "LeadGen-TeamLead" && (
        <TwoTabDashboard
          tabs={[
            { key: "leadgen", label: "Lead Gen", dashboard: "leadgen" },
            { key: "admin", label: "Admin", dashboard: "admin" },
          ]}
          defaultTab="leadgen"
        />
      )}

      {/* Single-role paths (non-tab roles) */}
      {showAdminDashboard &&
        role !== "SuperAdmin" &&
        role !== "LeadGen-TeamLead" && <AdminDashboard />}

      {showLeadGenDashboard &&
        role !== "SuperAdmin" &&
        role !== "Sales-TeamLead" && <LeadGenDashboard />}

      {/* Advert Dashboard - Only for Advert role */}
      {showAdvertDashboard && <AdvertDashboard />}



      {/* Sales by Agent Section - Only for Sales team (not for LeadGen or Advert) */}
      {showSalesByAgentSection && (
          <>
            {isLeadLoading ? (
              <DashboardSectionSkeleton
                label="Loading sales data..."
                height="h-48"
              />
            ) : isError ? (
              <div className="w-full rounded-xl border border-destructive/40 bg-destructive/5 p-6">
                <p className="text-sm text-destructive">
                  Failed to load sales data: {error ?? "Unknown error"}
                </p>
              </div>
            ) : (
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
                              const percentage = Math.round(
                                (item.count / totalRejectedLeads) * 100,
                              );
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
                                    <span className="text-sm font-medium ml-1">
                                      ({percentage}%)
                                    </span>
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
                          <p className="text-muted-foreground">
                            No rejection data available
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

      {/* Sales Dashboard - For Sales (not TeamLead tabs, not SuperAdmin, not Advert) */}
      {showSalesDashboard &&
        !showAdvertDashboard &&
        role !== "SuperAdmin" &&
        role !== "Sales-TeamLead" && <SalesDashboard />}

      {/* Visits Created By (date-wise) */}
      {showAdminDashboard && !showAdvertDashboard && (
        <div className="mt-6">
          {visitsLoading ? (
            <DashboardSectionSkeleton label="Loading visits..." />
          ) : (
            <VisitsCreatedByMultiLineChart
              data={visitsCreatedBySeries}
              creators={visitsCreatedByCreators}
              filters={visitsCreatedByFilters}
              onFilterChange={(value) => {
                const next = { ...visitsCreatedByFilters, days: value };
                setVisitsCreatedByFilters(next);
              }}
              loading={false}
              isError={Boolean(visitsCreatedByError)}
              error={visitsCreatedByError}
            />
          )}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
