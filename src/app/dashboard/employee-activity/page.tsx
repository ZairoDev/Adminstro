"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CgSpinner } from "react-icons/cg";
import {
  Download,
  Filter,
  RotateCcw,
  Activity,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Heading from "@/components/Heading";

interface ActivityLog {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: string;
  activityType: "login" | "logout";
  sessionId?: string | null;
  status?: "active" | "ended" | null;
  lastActivityAt?: string | null;
  loginTime?: string;
  logoutTime?: string;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    logs: ActivityLog[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLogs: number;
      logsPerPage: number;
    };
    statistics: {
      stats: Array<{ _id: string; count: number }>;
      uniqueEmployees: Array<{
        _id: string;
        name: string;
        email: string;
        totalActivities: number;
      }>;
    };
  };
}

const EmployeeActivityPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    logsPerPage: 50,
  });
  const [statistics, setStatistics] = useState<any>(null);

  const [filters, setFilters] = useState({
    employeeEmail: "",
    employeeId: "",
    activityType: "all",
    startDate: "",
    endDate: "",
    role: "",
  });

  const fetchLogs = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", "50");

        if (filters.employeeEmail)
          params.append("employeeEmail", filters.employeeEmail);
        if (filters.employeeId) params.append("employeeId", filters.employeeId);
        if (filters.activityType !== "all")
          params.append("activityType", filters.activityType);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.role) params.append("role", filters.role);

        const token = localStorage.getItem("token");

        const response = await axios.get<ApiResponse>(
          `/api/employee-activity/get-logs?${params}`,
          {
            withCredentials: true,
          },
        );

        if (response.data.success) {
          setLogs(response.data.data.logs);
          setPagination(response.data.data.pagination);
          setStatistics(response.data.data.statistics);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
        toast({
          description: "Failed to fetch activity logs",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, toast],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setFilters({
      employeeEmail: "",
      employeeId: "",
      activityType: "all",
      startDate: "",
      endDate: "",
      role: "",
    });
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast({
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Employee Name",
      "Email",
      "Role",
      "Activity Type",
      "Login Time",
      "Logout Time",
      "Duration (min)",
      "IP Address",
      "Created At",
    ];

    const rows = logs.map((log) => [
      log.employeeName,
      log.employeeEmail,
      log.role,
      log.activityType,
      log.loginTime ? new Date(log.loginTime).toLocaleString() : "-",
      log.logoutTime ? new Date(log.logoutTime).toLocaleString() : "-",
      log.duration || 0,
      log.ipAddress || "-",
      new Date(log.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `employee-activity-logs-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      description: "Report exported successfully",
    });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const getActivityBadgeColor = (type: string) => {
    return type === "login"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
      : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800";
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;
    return status === "active"
      ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
      : "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-[1600px] mx-auto p-8">
        <div className="mb-10">
          <Heading
            heading="Employee Activity Tracking"
            subheading="Monitor employee login and logout activities in real-time"
          />
        </div>

        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Activities
                  </CardTitle>
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  {pagination.totalLogs.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  All time records
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Logins
                  </CardTitle>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  {(
                    statistics.stats.find((s: any) => s._id === "login")
                      ?.count || 0
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Successful authentications
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Logouts
                  </CardTitle>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <UserX className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-rose-600 dark:text-rose-400">
                  {(
                    statistics.stats.find((s: any) => s._id === "logout")
                      ?.count || 0
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Session terminations
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ultra-compact filter bar */}
        <div className="mb-4 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="text-sm"><Filter className="w-4 h-4" /></span>
              

              <Input
                placeholder="Email..."
                value={filters.employeeEmail}
                onChange={(e) =>
                  handleFilterChange("employeeEmail", e.target.value)
                }
                className="h-8 text-sm min-w-[160px] max-w-[220px] bg-white dark:bg-slate-800"
              />
              <Select
                value={filters.activityType}
                onValueChange={(v) => handleFilterChange("activityType", v)}
              >
                <SelectTrigger className="h-8 text-sm min-w-[120px] bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="h-8 text-sm min-w-[130px] bg-white dark:bg-slate-800"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="h-8 text-sm min-w-[130px] bg-white dark:bg-slate-800"
              />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => fetchLogs(pagination.currentPage)}
                title="Refresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs px-3"
                onClick={handleApplyFilters}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={handleExportCSV}
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          {/* <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg dark:text-slate-100">
              Activity Logs
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Detailed view of all employee activities
            </p>
          </CardHeader> */}
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <CgSpinner className="text-4xl animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Loading activity logs...
                  </p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  No activity logs found
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="font-semibold dark:text-slate-200 w-8"></TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Employee
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Email
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Role
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Activity
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Session ID
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          Timestamp
                        </TableHead>
                        <TableHead className="font-semibold dark:text-slate-200">
                          IP Address
                        </TableHead>
                        {/* Actions column removed */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const groups: { [key: string]: ActivityLog[] } = {};
                        logs.forEach((l) => {
                          const key = l.sessionId || l._id;
                          groups[key] = groups[key] || [];
                          groups[key].push(l);
                        });

                        return Object.keys(groups).map((key) => {
                          const group = groups[key];
                          const loginEntry =
                            group.find((g) => g.activityType === "login") ||
                            group.reduce((a, b) =>
                              new Date(a.createdAt) < new Date(b.createdAt)
                                ? a
                                : b,
                            );
                          const sessionStatus = group.some(
                            (g) => g.status === "active",
                          )
                            ? "active"
                            : group.some((g) => g.status === "ended")
                              ? "ended"
                              : null;
                          const sessionStart =
                            loginEntry?.loginTime ||
                            loginEntry?.createdAt ||
                            null;
                          const lastActivity = group.reduce((acc, g) => {
                            const la = g.lastActivityAt || g.createdAt;
                            return new Date(la) > new Date(acc) ? la : acc;
                          }, group[0].createdAt);

                          const isExpanded = expandedSessions.has(key);

                          return (
                            <React.Fragment key={key}>
                              <TableRow
                                className="bg-slate-50/50 dark:bg-stone-950 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors duration-150 cursor-pointer"
                                onClick={() => toggleSession(key)}
                              >
                                <TableCell className="py-4">
                                  <div className="transition-transform duration-200">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold dark:text-slate-200 py-4">
                                  {loginEntry.employeeName}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                  {loginEntry.employeeEmail}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all duration-200">
                                    {loginEntry.role}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800 transition-all duration-200">
                                    SESSION
                                  </span>
                                </TableCell>
                                <TableCell className=" text-slate-600 dark:text-slate-400 font-mono text-xs">
                                  {key === loginEntry._id
                                    ? "-"
                                    : loginEntry.sessionId?.substring(0, 8) ||
                                      "-"}
                                </TableCell>
                                <TableCell>
                                  {sessionStatus && (
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadge(sessionStatus)} transition-all duration-200`}
                                    >
                                      {sessionStatus.toUpperCase()}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                  <div className="space-y-0.5">
                                    <div>
                                      {sessionStart
                                        ? formatDate(sessionStart)
                                        : "-"}
                                    </div>
                                    {lastActivity && (
                                      <div className="text-xs text-slate-400">
                                        Last: {formatDate(lastActivity)}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                                  {loginEntry.ipAddress || "-"}
                                </TableCell>
                                {/* Actions removed */}
                              </TableRow>

                              {isExpanded &&
                                group.map((log, idx) => (
                                  <TableRow
                                    key={log._id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors duration-150"
                                    style={{
                                      animation: `slideDown 0.2s ease-out ${idx * 0.05}s both`,
                                    }}
                                  >
                                    <TableCell></TableCell>
                                    <TableCell className="font-medium dark:text-slate-300 pl-10 py-3">
                                      <span className="text-slate-400 mr-2">
                                        └
                                      </span>
                                      {log.activityType === "login"
                                        ? "Login"
                                        : "Logout"}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                      {log.employeeEmail}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all duration-200">
                                        {log.role}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={`inline-flex px-3 py-1.5 rounded-md text-xs font-semibold ${getActivityBadgeColor(log.activityType)} transition-all duration-200`}
                                      >
                                        {log.activityType.toUpperCase()}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                                      {log.sessionId?.substring(0, 8) || "-"}
                                    </TableCell>
                                    <TableCell>
                                      {log.status && (
                                        <span
                                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadge(log.status)} transition-all duration-200`}
                                        >
                                          {log.status}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                      {formatDate(log.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                                      {log.ipAddress || "-"}
                                    </TableCell>
                                    {/* Actions removed */}
                                  </TableRow>
                                ))}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-stone-950">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Showing{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {logs.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {pagination.totalLogs.toLocaleString()}
                    </span>{" "}
                    logs
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.currentPage === 1}
                      onClick={() => fetchLogs(pagination.currentPage - 1)}
                      className="border-slate-300 dark:border-slate-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          let page = pagination.currentPage - 2 + i;
                          if (page < 1 || page > pagination.totalPages)
                            return null;
                          return (
                            <Button
                              key={page}
                              variant={
                                page === pagination.currentPage
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => fetchLogs(page)}
                              size="sm"
                              className={
                                page === pagination.currentPage
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white min-w-[2.5rem] transition-all duration-200"
                                  : "border-slate-300 dark:border-slate-700 min-w-[2.5rem] transition-all duration-200 hover:scale-105"
                              }
                            >
                              {page}
                            </Button>
                          );
                        },
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      onClick={() => fetchLogs(pagination.currentPage + 1)}
                      className="border-slate-300 dark:border-slate-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeActivityPage;
