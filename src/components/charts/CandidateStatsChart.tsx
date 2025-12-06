"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Briefcase,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { CandidateCountData, CandidateSummary } from "@/hooks/(VS)/useCandidateCounts";

interface CandidateChartProps {
  data: CandidateCountData[];
  summary: CandidateSummary;
  positions: string[];
  filters: { days?: string; position?: string };
  onFilterChange: (filters: { days?: string; position?: string }) => void;
  loading: boolean;
  isError: boolean;
  error: string;
}

const statusColors = {
  pending: "#f59e0b",
  shortlisted: "#3b82f6",
  selected: "#22c55e",
  onboarding: "#8b5cf6",
  rejected: "#ef4444",
};

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  color,
  percentage,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  percentage?: number;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
    {percentage !== undefined && (
      <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
    )}
  </div>
);

export const CandidateStatsChart = ({
  data,
  summary,
  positions,
  filters,
  onFilterChange,
  loading,
  isError,
  error,
}: CandidateChartProps) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalInPeriod = data.reduce((sum, item) => sum + item.total, 0);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isMounted) {
    return (
      <Card className="shadow-md rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            HR Recruitment Pipeline
          </CardTitle>
          <CardDescription className="mt-1">
            Loading...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              HR Recruitment Pipeline
            </CardTitle>
            <CardDescription className="mt-1">
              Candidate applications and their current status
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <CustomSelect
              itemList={["12 days", "this month", "1 year", "last 3 years"]}
              triggerText="Time Range"
              defaultValue={filters?.days || "this month"}
              onValueChange={(value) => {
                onFilterChange({ ...filters, days: value });
              }}
              triggerClassName="w-32"
            />
            <CustomSelect
              itemList={["All", ...positions]}
              triggerText="Position"
              defaultValue={filters?.position || "All"}
              onValueChange={(value) => {
                onFilterChange({ ...filters, position: value });
              }}
              triggerClassName="w-40"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <SummaryCard
            title="Total"
            value={summary.total}
            icon={Users}
            color="bg-gray-500"
          />
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon={Clock}
            color="bg-yellow-500"
            percentage={summary.total > 0 ? (summary.pending / summary.total) * 100 : 0}
          />
          <SummaryCard
            title="Shortlisted"
            value={summary.shortlisted}
            icon={TrendingUp}
            color="bg-blue-500"
            percentage={summary.total > 0 ? (summary.shortlisted / summary.total) * 100 : 0}
          />
          <SummaryCard
            title="Selected"
            value={summary.selected}
            icon={UserCheck}
            color="bg-green-500"
            percentage={summary.total > 0 ? (summary.selected / summary.total) * 100 : 0}
          />
          <SummaryCard
            title="Onboarding"
            value={summary.onboarding}
            icon={Briefcase}
            color="bg-purple-500"
            percentage={summary.total > 0 ? (summary.onboarding / summary.total) * 100 : 0}
          />
          <SummaryCard
            title="Rejected"
            value={summary.rejected}
            icon={UserX}
            color="bg-red-500"
            percentage={summary.total > 0 ? (summary.rejected / summary.total) * 100 : 0}
          />
        </div>

        {/* Chart */}
        <div className="h-[350px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColors.pending} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={statusColors.pending} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorShortlisted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColors.shortlisted} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={statusColors.shortlisted} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorSelected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColors.selected} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={statusColors.selected} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorOnboarding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColors.onboarding} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={statusColors.onboarding} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColors.rejected} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={statusColors.rejected} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[180px]">
                          <p className="font-semibold mb-2 border-b pb-1">{label}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                Pending
                              </span>
                              <span className="font-medium">{data.pending}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Shortlisted
                              </span>
                              <span className="font-medium">{data.shortlisted}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Selected
                              </span>
                              <span className="font-medium">{data.selected}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                Onboarding
                              </span>
                              <span className="font-medium">{data.onboarding}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Rejected
                              </span>
                              <span className="font-medium">{data.rejected}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-semibold">Total</span>
                              <span className="font-bold">{data.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm capitalize">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stackId="1"
                  stroke={statusColors.pending}
                  fill="url(#colorPending)"
                  name="Pending"
                />
                <Area
                  type="monotone"
                  dataKey="shortlisted"
                  stackId="1"
                  stroke={statusColors.shortlisted}
                  fill="url(#colorShortlisted)"
                  name="Shortlisted"
                />
                <Area
                  type="monotone"
                  dataKey="selected"
                  stackId="1"
                  stroke={statusColors.selected}
                  fill="url(#colorSelected)"
                  name="Selected"
                />
                <Area
                  type="monotone"
                  dataKey="onboarding"
                  stackId="1"
                  stroke={statusColors.onboarding}
                  fill="url(#colorOnboarding)"
                  name="Onboarding"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stackId="1"
                  stroke={statusColors.rejected}
                  fill="url(#colorRejected)"
                  name="Rejected"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span>
            {totalInPeriod} applications in selected period
            {filters.position && filters.position !== "All" && ` for ${filters.position}`}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CandidateStatsChart;
