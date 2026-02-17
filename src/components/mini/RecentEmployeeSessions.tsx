 "use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { UserCheck, UserX, Clock, Hash } from "lucide-react";

interface Log {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  activityType: string;
  sessionId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  role?: string;
}

export default function RecentEmployeeSessions() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/employee-activity/get-logs?page=1&limit=80");
        if (!mounted) return;
        if (res.data?.success && Array.isArray(res.data.data?.logs)) {
          setLogs(res.data.data.logs);
        } else {
          setLogs([]);
        }
      } catch (err) {
        setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!logs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent sessions</p>
        </CardContent>
      </Card>
    );
  }

  // determine most recent employee (by newest log)
  const sorted = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentEmployeeId = sorted[0].employeeId;
  const recentEmployeeName = sorted[0].employeeName;
  const recentEmployeeEmail = sorted[0].employeeEmail;
  const recentEmployeeRole = (sorted[0] as any).role;
  const employeeLogs = sorted.filter((l) => l.employeeId === recentEmployeeId).slice(0, 6);
  const totalSessions = sorted.filter((l) => l.employeeId === recentEmployeeId).length;
  const lastActive = employeeLogs.length ? employeeLogs[0].createdAt : sorted[0].createdAt;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(recentEmployeeName)}&background=0D8ABC&color=fff`} alt={recentEmployeeName} />
              <AvatarFallback>{recentEmployeeName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{recentEmployeeName}</div>
              <div className="text-xs text-muted-foreground truncate">{recentEmployeeEmail}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Last active</div>
            <div className="text-sm font-medium">{formatDistanceToNow(new Date(lastActive), { addSuffix: true })}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Recent sessions ({totalSessions})</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5" /> {employeeLogs.length} shown
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {employeeLogs.map((l) => (
            <div key={l._id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-white/60 dark:bg-white/5">
                  {l.activityType === "login" ? <UserCheck className="w-5 h-5 text-green-600" /> : <UserX className="w-5 h-5 text-rose-600" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.activityType.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground truncate">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })} • {new Date(l.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  <span>{l.sessionId ? l.sessionId.substring(0, 8) : "-"}</span>
                </div>
                <div className="mt-1">{l.ipAddress ? l.ipAddress : "-"}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground">{recentEmployeeRole ? recentEmployeeRole : ""}</div>
          <div>
            <Link href="/dashboard/employee-activity">
              <Button size="sm">See more</Button>
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

