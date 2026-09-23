"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { CelebrationView } from "@/components/CelebrationView";
import { CelebrationNotification } from "@/components/CelebrationNotification";
import { PersonalReminderBanner } from "@/components/reminders/PersonalReminderBanner";
import { TodaysEvents } from "@/util/getTodaysEvents";
import { toast } from "sonner";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";
import { TextFlippingBoard, normalizeFlapText } from "@/components/ui/text-flipping-board";
import { PipStatusBadge } from "@/components/pip/PipStatusBadge";
// Auth & Dashboard Access
import { useAuthStore } from "@/AuthStore";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { getRandomQuote } from "@/util/getRandomQuote";

import { SuperAdminTabDashboard } from "@/components/dashboard/SuperAdminTabDashboard";
import { TwoTabDashboard } from "@/components/dashboard/TwoTabDashboard";
import {
  AdminDashboard,
  LeadGenDashboard,
  SalesDashboard,
} from "@/components/dashboard/lazyDashboards";

const AdvertDashboard = dynamic(
  () => import("@/features/advert/AdvertDashboard"),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton label="Loading advert dashboard..." height="h-96" />
    ),
  },
);

// Hooks
import {
  emptyCelebrations,
  useCelebrations,
} from "@/hooks/shared/useCelebrations";

const Dashboard = () => {
  const { token } = useAuthStore();
  const {
    role,
    isLeadGen,
    isSales,
    isAdmin,
  } = useDashboardAccess();

  const showAdminDashboard = isAdmin || role === "HR";
  const showLeadGenDashboard = isLeadGen || isAdmin || role === "LeadGen-TeamLead";
  const showSalesDashboard = isSales || isAdmin || role === "Sales-TeamLead";
  const showAdvertDashboard = role === "Advert";

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

  const quoteBoardCols = useMemo(() => {
    const length = normalizeFlapText(displayQuote).length;
    return Math.min(56, Math.max(length, 24));
  }, [displayQuote]);

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

  const handleDismissCelebration = () => {
    setIsCelebrationDismissed(true);
    const dismissedKey = `celebration_dismissed_${new Date().toDateString()}`;
    sessionStorage.setItem(dismissedKey, "true");
  };

  const handleDismissNotification = () => {
    setIsNotificationDismissed(true);
    const todayKey = new Date().toDateString();
    const seenKey = `celebrations_seen_${todayKey}`;
    sessionStorage.setItem(seenKey, "true");
  };

  const handleViewCelebrationDetails = () => {
    setIsCelebrationDismissed(false);
    setTimeout(() => {
      const quoteSection = document.querySelector("[data-celebration-section]");
      quoteSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const showCelebration =
    !isLoadingCelebrations &&
    !isCelebrationDismissed &&
    flipCardEvents.hasEvents;

  return (
    <div className=" w-full p-4 md:p-6">
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

      <div
        className="mb-6 perspective-1000"
        style={{ minHeight: "120px" }}
        data-celebration-section
      >
        <div className="mb-2 flex justify-end">
          <PipStatusBadge />
        </div>
        <div
          className="relative w-full transition-transform duration-700 ease-in-out"
          style={{
            transform: showCelebration ? "rotateX(180deg)" : "rotateX(0deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="absolute inset-0 w-full backface-hidden"
            style={{
              transform: "rotateX(0deg)",
            }}
          >
            <TextFlippingBoard
              text={displayQuote}
              boardRows={1}
              boardCols={quoteBoardCols}
              compact
            />
          </div>

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
              <TextFlippingBoard
                text={displayQuote}
                boardRows={1}
                boardCols={quoteBoardCols}
                compact
              />
            )}
          </div>
        </div>
      </div>

      {role === "SuperAdmin" && <SuperAdminTabDashboard />}

      {role === "Sales-TeamLead" && (
        <TwoTabDashboard
          tabs={[
            { key: "sales", label: "Sales", dashboard: "sales" },
            { key: "leadgen", label: "Lead Gen", dashboard: "leadgen" },
          ]}
          defaultTab="sales"
        />
      )}

      {role === "LeadGen-TeamLead" && (
        <TwoTabDashboard
          tabs={[
            { key: "leadgen", label: "Lead Gen", dashboard: "leadgen" },
            { key: "admin", label: "Admin", dashboard: "admin" },
          ]}
          defaultTab="leadgen"
        />
      )}

      {showAdminDashboard &&
        role !== "SuperAdmin" &&
        role !== "LeadGen-TeamLead" && <AdminDashboard />}

      {showLeadGenDashboard &&
        role !== "SuperAdmin" &&
        role !== "Sales-TeamLead" && <LeadGenDashboard />}

      {showAdvertDashboard && <AdvertDashboard />}

      {showSalesDashboard &&
        !showAdvertDashboard &&
        role !== "SuperAdmin" &&
        role !== "Sales-TeamLead" && <SalesDashboard />}
    </div>
  );
};

export default Dashboard;
