"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { LogIn, LogOut, Circle } from "lucide-react";

interface Log {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  activityType: "login" | "logout";
  sessionId?: string | null;
  loginTime?: string | null;
  logoutTime?: string | null;
  lastActivityAt?: string | null;
  status?: "active" | "ended" | null;
  createdAt: string;
  role?: string;
}

interface SessionRow {
  key: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role?: string;
  loginAt: string | null;
  logoutAt: string | null;
  isActive: boolean;
  lastActivityAt: string;
}

const MAX_ROWS = 8;

function buildSessionRows(logs: Log[]): SessionRow[] {
  const bySession = new Map<string, Log[]>();

  for (const log of logs) {
    const key = log.sessionId || log._id;
    const group = bySession.get(key) ?? [];
    group.push(log);
    bySession.set(key, group);
  }

  const rows: SessionRow[] = [];

  for (const [key, group] of bySession) {
    const loginEntry =
      group.find((g) => g.activityType === "login") ??
      group.reduce((a, b) =>
        new Date(a.createdAt) < new Date(b.createdAt) ? a : b,
      );

    const logoutEntry = group.find((g) => g.activityType === "logout");

    const loginAt =
      loginEntry.loginTime ?? loginEntry.createdAt ?? null;
    const logoutAt =
      loginEntry.logoutTime ??
      logoutEntry?.logoutTime ??
      logoutEntry?.createdAt ??
      null;

    const isActive =
      loginEntry.status === "active" ||
      (loginEntry.activityType === "login" &&
        !logoutAt &&
        group.some((g) => g.status === "active"));

    const lastActivityAt = group.reduce((acc, g) => {
      const ts = g.lastActivityAt ?? g.logoutTime ?? g.createdAt;
      return new Date(ts) > new Date(acc) ? ts : acc;
    }, group[0].createdAt);

    rows.push({
      key,
      employeeId: loginEntry.employeeId,
      employeeName: loginEntry.employeeName,
      employeeEmail: loginEntry.employeeEmail,
      role: loginEntry.role,
      loginAt,
      logoutAt: isActive ? null : logoutAt,
      isActive,
      lastActivityAt,
    });
  }

  return rows
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    )
    .slice(0, MAX_ROWS);
}

function formatShortTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export default function RecentEmployeeSessions() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          "/api/employee-activity/get-logs?page=1&limit=120",
        );
        if (!mounted) return;
        if (res.data?.success && Array.isArray(res.data.data?.logs)) {
          setLogs(res.data.data.logs);
        } else {
          setLogs([]);
        }
      } catch {
        if (mounted) setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sessionRows = useMemo(() => buildSessionRows(logs), [logs]);
  const activeCount = useMemo(
    () => sessionRows.filter((r) => r.isActive).length,
    [sessionRows],
  );

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!sessionRows.length) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Recent Sessions
          </CardTitle>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <Circle className="h-2 w-2 fill-current" />
              {activeCount} online
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Latest logins across employees
        </p>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-2 px-2.5 py-1.5 bg-muted/40 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Employee</span>
            <span className="flex items-center gap-0.5">
              <LogIn className="h-3 w-3" /> In
            </span>
            <span className="flex items-center gap-0.5">
              <LogOut className="h-3 w-3" /> Out
            </span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y divide-border/50">
            {sessionRows.map((row) => (
              <li
                key={row.key}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-2 items-center px-2.5 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(row.employeeName)}&background=0D8ABC&color=fff&size=64`}
                      alt={row.employeeName}
                    />
                    <AvatarFallback className="text-[10px]">
                      {row.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {row.employeeName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {row.role ?? row.employeeEmail}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatShortTime(row.loginAt)}
                </span>

                <span
                  className={`text-[11px] tabular-nums ${
                    row.isActive
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {row.isActive ? "Active" : formatShortTime(row.logoutAt)}
                </span>

                <span
                  className={`justify-self-end inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium ${
                    row.isActive
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {row.isActive ? "Live" : "Ended"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Link href="/dashboard/employee-activity" className="w-full">
          <Button size="sm" variant="outline" className="w-full text-xs">
            View all activity
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
