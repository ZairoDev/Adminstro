import {
  getBoostCounts,
  getCandidateCounts,
  getCandidateSummary,
  getListingCounts,
  getLocationLeadStats,
  getLocationVisitStats,
  getMonthlyVisitStats,
  getPropertyCount,
  getTodayLeads,
  getWebsiteLeadsCounts,
} from "@/actions/(VS)/queryActions";
import { toDateKey } from "@/lib/date/dayKey";
import type { QueryClient } from "@tanstack/react-query";

export type DashboardTabKey = "admin" | "leadgen" | "sales";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
}

export function prefetchDashboardTab(
  queryClient: QueryClient,
  tabKey: DashboardTabKey,
): void {
  const monthKey = currentMonthKey();
  const defaultListingFilters = { days: "this month" };
  const defaultBoostFilters = { days: "this month" };
  const defaultWebsiteFilters = { days: "this month" };

  const prefetchIfMissing = <T>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
  ) => {
    if (queryClient.getQueryData(queryKey) !== undefined) return;
    void queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
  };

  switch (tabKey) {
    case "admin":
      prefetchIfMissing(["propertyCount", null, null], async () => {
        const response = await getPropertyCount();
        return {
          properties: response.propertyCount,
          totalProperties: response.totalPropertyCount,
        };
      });
      prefetchIfMissing(
        ["candidateCounts", "this month", null, monthKey],
        async () => {
          const selectedMonth = new Date();
          const [countsResponse, summaryResponse] = await Promise.all([
            getCandidateCounts({
              days: "this month",
              position: undefined,
              selectedMonth,
            }),
            getCandidateSummary({
              position: undefined,
              selectedMonth,
            }),
          ]);
          return {
            candidateCounts: countsResponse,
            summary: summaryResponse,
          };
        },
      );
      prefetchIfMissing(["listingCounts", defaultListingFilters], async () => {
        const response = await getListingCounts({ days: "this month" });
        return response.map(
          ({
            date,
            total,
            shortTerm,
            longTerm,
          }: {
            date: string;
            total: number;
            shortTerm: number;
            longTerm: number;
          }) => ({ date, total, shortTerm, longTerm }),
        );
      });
      break;
    case "leadgen":
      prefetchIfMissing(["todayLeads", toDateKey(new Date())], () =>
        getTodayLeads(toDateKey(new Date())),
      );
      prefetchIfMissing(["leadStats", "All", monthKey], async () => {
        const response = await getLocationLeadStats(new Date());
        return response.visits;
      });
      prefetchIfMissing(["websiteLeadsCounts", defaultWebsiteFilters], () =>
        getWebsiteLeadsCounts(defaultWebsiteFilters),
      );
      break;
    case "sales":
      prefetchIfMissing(["visitStats", "All", monthKey], async () => {
        const response = await getLocationVisitStats(new Date());
        return response.visits;
      });
      prefetchIfMissing(["monthlyVisitStats", "current"], () =>
        getMonthlyVisitStats(undefined),
      );
      prefetchIfMissing(["boostCounts", defaultBoostFilters], async () => {
        const response = await getBoostCounts({ days: "this month" });
        return response.map(
          ({
            date,
            total,
            newBoosts,
            reboosts,
            posted,
          }: {
            date: string;
            total: number;
            newBoosts: number;
            reboosts: number;
            posted: number;
          }) => ({ date, total, newBoosts, reboosts, posted }),
        );
      });
      break;
  }
}
