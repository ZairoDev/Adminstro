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

type TabKey = DashboardTabKey;

const TABS: { key: TabKey; label: string }[] = [
  { key: "admin", label: "Admin & HR" },
  { key: "leadgen", label: "Lead Generation" },
  { key: "sales", label: "Sales" },
];

function renderDashboard(tabKey: TabKey) {
  switch (tabKey) {
    case "admin":
      return <AdminDashboard />;
    case "leadgen":
      return <LeadGenDashboard />;
    case "sales":
      return <SalesDashboard />;
  }
}

export function SuperAdminTabDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("admin");
  const queryClient = useQueryClient();

  const handleTabHover = useCallback(
    (tabKey: TabKey) => {
      if (tabKey === activeTab) return;
      prefetchDashboardTab(queryClient, tabKey);
    },
    [activeTab, queryClient],
  );

  return (
    <div>
      <div className="sticky top-0 z-10 mb-6 flex gap-1 border-b border-border bg-background pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            onMouseEnter={() => handleTabHover(tab.key)}
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

      {activeTab === "admin" && renderDashboard("admin")}
      {activeTab === "leadgen" && renderDashboard("leadgen")}
      {activeTab === "sales" && renderDashboard("sales")}
    </div>
  );
}
