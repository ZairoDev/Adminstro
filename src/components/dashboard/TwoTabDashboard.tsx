"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  AdminDashboard,
  LeadGenDashboard,
  SalesDashboard,
} from "@/components/dashboard/lazyDashboards";
import {
  prefetchDashboardTab,
  type DashboardTabKey,
} from "@/components/dashboard/dashboardTabPrefetch";

export type TabDashboardConfig = {
  key: string;
  label: string;
  dashboard: DashboardTabKey;
};

type TwoTabDashboardProps = {
  tabs: TabDashboardConfig[];
  defaultTab: string;
};

function renderDashboard(dashboard: DashboardTabKey) {
  switch (dashboard) {
    case "admin":
      return <AdminDashboard />;
    case "leadgen":
      return <LeadGenDashboard />;
    case "sales":
      return <SalesDashboard />;
  }
}

export function TwoTabDashboard({ tabs, defaultTab }: TwoTabDashboardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const queryClient = useQueryClient();

  const activeConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  const handleTabHover = useCallback(
    (tab: TabDashboardConfig) => {
      if (tab.key === activeTab) return;
      prefetchDashboardTab(queryClient, tab.dashboard);
    },
    [activeTab, queryClient],
  );

  return (
    <div>
      <div className="sticky top-0 z-10 mb-6 flex gap-1 border-b border-border bg-background pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            onMouseEnter={() => handleTabHover(tab)}
            className={[
              "rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-150",
              activeTab === tab.key
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderDashboard(activeConfig.dashboard)}
    </div>
  );
}
