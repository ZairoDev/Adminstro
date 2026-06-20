"use client";

import dynamic from "next/dynamic";
import { DashboardSectionSkeleton } from "@/components/ui/DashboardSectionSkeleton";

export const AdminDashboard = dynamic(
  () => import("@/features/admin/AdminDashboard"),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton
        label="Loading admin dashboard..."
        height="h-96"
      />
    ),
  },
);

export const LeadGenDashboard = dynamic(
  () => import("@/features/leadgen/LeadGenDashboard"),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton
        label="Loading lead gen dashboard..."
        height="h-96"
      />
    ),
  },
);

export const SalesDashboard = dynamic(
  () => import("@/features/sales/SalesDashboard"),
  {
    ssr: false,
    loading: () => (
      <DashboardSectionSkeleton
        label="Loading sales dashboard..."
        height="h-96"
      />
    ),
  },
);
