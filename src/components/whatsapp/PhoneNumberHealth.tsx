"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, Loader2, Phone, RefreshCw } from "lucide-react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/AuthStore";

interface PhoneHealthMetrics {
  phoneNumberId: string;
  displayName: string;
  displayNumber: string;
  qualityRating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
  throughputLevel?: string;
  healthStatus: "good" | "warning" | "danger";
  lastSyncTime: Date | null;
  codeVerificationStatus?: string;
  eligibleForGlobalSearch?: boolean;
  dataSourceStatus?: "LIVE" | "CACHED" | "STALE";
  cacheAge?: number;
}

export function PhoneNumberHealth() {
  const [metrics, setMetrics] = useState<PhoneHealthMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const isSuperAdmin = token?.role === "SuperAdmin";

  const fetchHealthMetrics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const url = forceRefresh 
        ? "/api/whatsapp/phone-health?refresh=true"
        : "/api/whatsapp/phone-health";
      const response = await axios.get(url);
      if (response.data.success) {
        setMetrics(response.data.metrics || []);
      } else {
        setError("Failed to fetch phone health metrics");
      }
    } catch (err: any) {
      console.error("Error fetching phone health:", err);
      setError(err.response?.data?.error || "Failed to load phone health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
    // Refresh every 6 hours (cache handles shorter intervals)
    const interval = setInterval(() => fetchHealthMetrics(false), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: "good" | "warning" | "danger") => {
    switch (status) {
      case "good":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "danger":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: "good" | "warning" | "danger") => {
    switch (status) {
      case "good":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-[11px] px-2 py-0.5">
            Good
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[11px] px-2 py-0.5">
            Warning
          </Badge>
        );
      case "danger":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-[11px] px-2 py-0.5">
            Danger
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Phone Number Health (Meta-Verified)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Phone Number Health (Meta-Verified)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Phone Number Health (Meta-Verified)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No phone numbers configured for your role/location
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Phone Number Health (Meta-Verified)
          </CardTitle>
          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchHealthMetrics(true)}
              disabled={loading}
              title="Force refresh from Meta API"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[900px] space-y-2">
            <div className="grid grid-cols-[minmax(220px,1.4fr)_110px_120px_140px_160px] gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b">
              <div>Phone</div>
              <div>Status</div>
              <div>Quality</div>
              <div>Connection</div>
              <div>Data</div>
            </div>

            {metrics.map((metric) => {
              const quality = metric.qualityRating || "UNKNOWN";
              const connection = metric.status || "UNKNOWN";
              const throughput = metric.throughputLevel || "—";
              const dataSource = metric.dataSourceStatus || "UNKNOWN";
              const cacheAge =
                typeof metric.cacheAge === "number"
                  ? `${metric.cacheAge.toFixed(1)}h`
                  : null;

              return (
                <div
                  key={metric.phoneNumberId}
                  className="grid grid-cols-[minmax(220px,1.4fr)_110px_120px_140px_160px] gap-2 items-center rounded-md border border-border/60 px-3 py-2 bg-muted/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(metric.healthStatus)}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {metric.displayName}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {metric.displayNumber}
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(metric.healthStatus)}</div>

                  <div className="text-sm font-medium">
                    <span
                      className={
                        quality === "GREEN"
                          ? "text-green-600 dark:text-green-400"
                          : quality === "YELLOW"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : quality === "RED"
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                      }
                    >
                      {quality}
                    </span>
                  </div>

                  <div className="text-sm font-medium">
                    <span
                      className={
                        connection === "CONNECTED"
                          ? "text-green-600 dark:text-green-400"
                          : connection === "DISCONNECTED"
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                      }
                    >
                      {connection}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      {throughput}
                    </span>
                  </div>

                  <div className="text-sm font-medium flex items-center gap-2">
                    <span className="text-muted-foreground">{dataSource}</span>
                    {dataSource === "STALE" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-yellow-500/60 text-yellow-700 dark:text-yellow-400"
                      >
                        Stale
                      </Badge>
                    ) : null}
                    {cacheAge ? (
                      <span className="text-[11px] text-muted-foreground">
                        {cacheAge}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


