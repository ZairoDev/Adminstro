"use client";

import Link from "next/link";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Home,
  Loader2,
  ArrowRight,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";

const HolidayPropertiesChart = dynamic(
  () => import("@/components/charts/HolidayPropertiesChart"),
  { ssr: false }
);
const HolidayGuestsChart = dynamic(
  () => import("@/components/charts/HolidayGuestsChart"),
  { ssr: false }
);

interface Stats {
  totalProperties: number;
  liveProperties: number;
  totalGuests: number;
}
interface Overview {
  holidayProperties: number;
  totalProperties: number;
  holidayGuests: number;
  totalGuests: number;
}

export default function HolidaySeraHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    axios
      .get("/api/holidaysera/stats")
      .then((res) => {
        if (res.data.success) setStats(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch overview counts for charts
  useEffect(() => {
    let mounted = true;
    axios
      .get("/api/holidaysera/overview")
      .then((res) => {
        if (!mounted) return;
        if (res.data) setOverview(res.data);
      })
      .catch(() => {})
      .finally(() => {
        /* noop */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const statCards = [
    {
      label: "Total Properties",
      value: stats?.totalProperties ?? 0,
      icon: <Building2 size={22} />,
      color: "from-blue-500 to-blue-600",
      href: "/holidaysera/properties",
    },
    {
      label: "Live Properties",
      value: stats?.liveProperties ?? 0,
      icon: <Zap size={22} />,
      color: "from-emerald-500 to-emerald-600",
      href: "/holidaysera/properties",
    },
    {
      label: "Total Guests",
      value: stats?.totalGuests ?? 0,
      icon: <Users size={22} />,
      color: "from-violet-500 to-violet-600",
      href: "/holidaysera/guests",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl text-white">
              <Home size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                HolidaySera
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Admin Dashboard
              </p>
            </div>
          </div>
        </div>


        {/* Quick links */}
        {/* Charts (line charts like dashboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/*
            Dynamically import the chart components to match dashboard structure
            and keep initial bundle small.
          */}
          <div className="w-full">
            <section className="group relative">
              <HolidayPropertiesChart />
            </section>
          </div>
          <div className="w-full">
            <section className="group relative">
              <HolidayGuestsChart />
            </section>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link
            href="/holidaysera/properties"
            className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Manage Properties
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Browse, search, and manage Short Term & HolidaySera properties
              </p>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all"
            />
          </Link>

          <Link
            href="/holidaysera/guests"
            className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-violet-600 dark:text-violet-400">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Manage Guests
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and search HolidaySera guests (users with origin: holidaysera)
              </p>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
