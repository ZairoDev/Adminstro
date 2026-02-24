"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Circle, RefreshCw, Users, Wifi, WifiOff, AlertTriangle, TrendingUp, Award, Loader2, Trash } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLoggedInEmployees } from "@/hooks/useLoggedInEmployees";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
import { useAuthStore } from "@/AuthStore";
import { useRouter } from "next/navigation";

const roleColors: Record<string, string> = {
  HR: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  Admin: "bg-red-500/20 text-red-500 border-red-500/30",
  Sales: "bg-green-500/20 text-green-500 border-green-500/30",
  "Sales-TeamLead": "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  LeadGen: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  "LeadGen-TeamLead": "bg-cyan-500/20 text-cyan-500 border-cyan-500/30",
  Content: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  Developer: "bg-pink-500/20 text-pink-500 border-pink-500/30",
  Intern: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  Advert: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30",
  Guest: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  "Subscription-Sales": "bg-teal-500/20 text-teal-500 border-teal-500/30",
  SuperAdmin: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const LoggedInEmployeesList = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { employees, count, isLoading, refetch } = useLoggedInEmployees();
  const { isConnected } = useSocket();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [forcingId, setForcingId] = useState<string | null>(null);
  const [sessionsMap, setSessionsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSessionCounts = async () => {
      try {
        if (!employees || employees.length === 0) return;
        const ids = employees.map((e: any) => e._id);
        const res = await axios.post("/api/employee/getActiveSessionsCounts", { employeeIds: ids });
        if (res.data?.success && res.data.counts) {
          setSessionsMap(res.data.counts);
        }
      } catch (err) {
        // ignore failures
      }
    };
    fetchSessionCounts();
  }, [employees]);

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Online Employees</CardTitle>
          </div>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Online Employees</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    {isConnected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isConnected ? "Real-time updates active" : "Reconnecting..."}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="secondary" className="font-semibold">
              {count}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>
        <CardDescription>Currently logged-in employees</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading && employees.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No employees online</p>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => (
                <div
                  key={employee._id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={employee.profilePic}
                        alt={employee.name}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/employee/${employee._id}`}
                        className="font-medium text-sm truncate hover:underline"
                      >
                        {employee.name}
                      </Link>
                      <span className="ml-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                          {sessionsMap[employee._id] ?? 0} session{(sessionsMap[employee._id] ?? 0) !== 1 ? "s" : ""}
                        </Badge>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          roleColors[employee.role] || "bg-gray-500/20"
                        )}
                      >
                        {employee.role}
                      </Badge>
                      <TooltipProvider>
                        {/* Warning Badge */}
                        {(employee.warningsCount ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 bg-red-500/10 text-red-600 border-red-500/30 flex items-center gap-1 cursor-help"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {employee.warningsCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{employee.warningsCount} Warning{(employee.warningsCount ?? 0) > 1 ? 's' : ''}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {/* PIP Badge */}
                        {(employee.pipsCount ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1 cursor-help"
                              >
                                <TrendingUp className="h-2.5 w-2.5" />
                                {employee.pipsCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{employee.pipsCount} Active PIP{(employee.pipsCount ?? 0) > 1 ? 's' : ''}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {/* Appreciation Badge */}
                        {(employee.appreciationsCount ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-500/30 flex items-center gap-1 cursor-help"
                              >
                                <Award className="h-2.5 w-2.5" />
                                {employee.appreciationsCount}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{employee.appreciationsCount} Appreciation{(employee.appreciationsCount ?? 0) > 1 ? 's' : ''}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {employee.lastLogin &&
                          formatDistanceToNow(new Date(employee.lastLogin), {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={async () => {
                        const confirmForce = window.confirm(`Force logout ${employee.name}? This will end their active sessions.`);
                        if (!confirmForce) return;
                        try {
                          setForcingId(employee._id);
                          const res = await axios.post("/api/employee/forceLogout", { employeeId: employee._id });
                          if (res.data?.success) {
                            // refresh list
                            await refetch();
                          } else {
                            alert(res.data?.message || "Failed to force logout");
                          }
                        } catch (err: any) {
                          console.error("Force logout failed:", err);
                          alert(err?.message || "Force logout failed");
                        } finally {
                          setForcingId(null);
                        }
                      }}
                      disabled={forcingId === employee._id}
                      className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {forcingId === employee._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                      Force logout
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LoggedInEmployeesList;
