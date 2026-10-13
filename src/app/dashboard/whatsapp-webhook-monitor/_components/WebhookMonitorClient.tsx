"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WebhookMonitorSummary } from "@/lib/whatsapp/webhookLog/monitorService";
import { apiErrorMessage } from "../_lib/format";
import { SummaryCards } from "./SummaryCards";
import { WebhookLogsTable } from "./WebhookLogsTable";
import { ReadNotRepliedTable } from "./ReadNotRepliedTable";

const DAY_OPTIONS = [1, 3, 7, 14, 30];

export default function WebhookMonitorClient() {
  const { role } = useDashboardAccess();
  const router = useRouter();

  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<WebhookMonitorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role && role !== "SuperAdmin") router.replace("/dashboard");
  }, [role, router]);

  const loadSummary = useCallback(async () => {
    setError(null);
    try {
      const { data } = await axios.get<WebhookMonitorSummary>(
        "/api/admin/whatsapp-webhook-monitor/summary",
        { params: { days } },
      );
      setSummary(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load summary"));
    }
  }, [days]);

  useEffect(() => {
    if (role === "SuperAdmin") void loadSummary();
  }, [role, loadSummary]);

  if (!role) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (role !== "SuperAdmin") return null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading
          heading="WhatsApp Webhook Monitor"
          subheading="Every Meta webhook we receive, what we did with it, and customers who read but have no stored reply"
        />
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Last {d} day{d > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary ? (
        <SummaryCards summary={summary} />
      ) : (
        !error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      )}

      <Tabs defaultValue="inbound" className="space-y-3">
        <TabsList>
          <TabsTrigger value="inbound">Inbound messages</TabsTrigger>
          <TabsTrigger value="read">Read, no reply</TabsTrigger>
          <TabsTrigger value="all">All webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="inbound">
          <WebhookLogsTable lockedKind="inbound_message" days={days} />
        </TabsContent>
        <TabsContent value="read">
          <ReadNotRepliedTable days={days} />
        </TabsContent>
        <TabsContent value="all">
          <WebhookLogsTable days={days} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
