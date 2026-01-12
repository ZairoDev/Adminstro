"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, Loader2, Phone, RefreshCw } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/AuthStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          <Badge className="bg-green-500 hover:bg-green-600">
            Good
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            Warning
          </Badge>
        );
      case "danger":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            Danger Zone
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
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div
              key={metric.phoneNumberId}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.healthStatus)}
                  <div>
                    <h3 className="font-semibold">{metric.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {metric.displayNumber}
                    </p>
                  </div>
                </div>
                {getStatusBadge(metric.healthStatus)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-muted-foreground">Quality Rating</p>
                        <p className="font-semibold">
                          {metric.qualityRating || "UNKNOWN"}
                          {metric.qualityRating === "UNKNOWN" && (
                            <span className="ml-1 text-yellow-500">⚠️</span>
                          )}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {metric.qualityRating === "UNKNOWN" 
                          ? "Meta did not return quality data. Treat cautiously."
                          : `Quality rating from Meta API: ${metric.qualityRating}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className={`font-semibold ${
                    metric.status === "CONNECTED" ? "text-green-500" : "text-red-500"
                  }`}>
                    {metric.status || "UNKNOWN"}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <p className="text-muted-foreground">Throughput</p>
                        <p className="font-semibold">
                          {metric.throughputLevel || "UNKNOWN"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Message throughput level: {metric.throughputLevel || "Not available"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div>
                  <p className="text-muted-foreground">Data Source</p>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-xs">
                      {metric.dataSourceStatus || "UNKNOWN"}
                    </p>
                    {metric.dataSourceStatus === "STALE" && (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                        ⚠️ Stale
                      </Badge>
                    )}
                    {metric.cacheAge && (
                      <span className="text-xs text-muted-foreground">
                        ({metric.cacheAge.toFixed(1)}h)
                      </span>
                    )}
                  </div>
                  {metric.lastSyncTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Synced: {new Date(metric.lastSyncTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              {(metric.codeVerificationStatus || metric.eligibleForGlobalSearch !== undefined) && (
                <div className="pt-2 border-t space-y-1 text-xs">
                  {metric.codeVerificationStatus && (
                    <p className="text-muted-foreground">Verification: {metric.codeVerificationStatus}</p>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          {metric.eligibleForGlobalSearch !== undefined && (
                            <p className="text-muted-foreground">
                              Global Search: {metric.eligibleForGlobalSearch ? "Yes" : "No"}
                            </p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eligibility for API business global search: {metric.eligibleForGlobalSearch ? "Enabled" : "Disabled"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


