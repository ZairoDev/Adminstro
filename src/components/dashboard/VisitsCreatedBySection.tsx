"use client";

import { useState } from "react";
import { VisitsCreatedByMultiLineChart } from "@/components/charts/VisitsCreatedByMultiLineChart";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";
import { useAuthStore } from "@/AuthStore";
import { useVisitsCreatedByStats } from "@/hooks/shared/useVisitsCreatedByStats";

export function VisitsCreatedBySection() {
  const { token } = useAuthStore();
  const [visitsCreatedByFilters, setVisitsCreatedByFilters] = useState<{
    days?: string;
  }>({ days: "this month" });

  const {
    data: visitsCreatedByData,
    isLoading: visitsLoading,
    isError: visitsCreatedByIsError,
    error: visitsCreatedByQueryError,
  } = useVisitsCreatedByStats(
    visitsCreatedByFilters,
    Boolean(token?.id),
  );

  const visitsCreatedByCreators = visitsCreatedByData?.creators ?? [];
  const visitsCreatedBySeries = visitsCreatedByData?.data ?? [];
  const visitsCreatedByError = visitsCreatedByIsError
    ? visitsCreatedByQueryError instanceof Error
      ? visitsCreatedByQueryError.message
      : "Failed to load visit stats"
    : "";

  return (
    <div className="mt-6">
      {visitsLoading ? (
        <DashboardSectionSkeleton label="Loading visits..." />
      ) : (
        <VisitsCreatedByMultiLineChart
          data={visitsCreatedBySeries}
          creators={visitsCreatedByCreators}
          filters={visitsCreatedByFilters}
          onFilterChange={(value) => {
            setVisitsCreatedByFilters({ ...visitsCreatedByFilters, days: value });
          }}
          loading={false}
          isError={Boolean(visitsCreatedByError)}
          error={visitsCreatedByError}
        />
      )}
    </div>
  );
}
