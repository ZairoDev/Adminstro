"use client";

import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { CustomStackBarChart } from "@/components/charts/StackedBarChart";
import ActiveEmployeeList from "@/components/VS/dashboard/active-employee-list";
import LocationCard from "@/components/reusableCard";
import SalesCard from "@/hooks/(VS)/useSalesCard";

type DailyLeadsActiveEmployeesSectionProps = {
  showFreshLeadsSummary?: boolean;
};

export function DailyLeadsActiveEmployeesSection({
  showFreshLeadsSummary = true,
}: DailyLeadsActiveEmployeesSectionProps) {
  const { salesCardData } = SalesCard();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <CustomStackBarChart enableDayNavigation />
      </div>

      <div className="flex h-full flex-col gap-2 rounded-md border dark:bg-stone-950">
        <h3 className="border-b p-3 text-xl font-semibold text-gray-800 dark:text-gray-200">
          🟢 Active Employees
        </h3>
        <ActiveEmployeeList />
        {showFreshLeadsSummary && (
          <div className="border p-4 shadow-md">
            <LocationCard
              title="✨ Fresh Leads Summary"
              stats={[
                {
                  icon: Users,
                  value: salesCardData?.todayCount ?? 0,
                  label: "Today",
                  color: "text-blue-600",
                },
                {
                  icon: TrendingUp,
                  value: `${salesCardData?.percentageChange ?? 0}%`,
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
  );
}
