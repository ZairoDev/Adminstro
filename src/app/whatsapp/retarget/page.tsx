"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuthStore } from "@/AuthStore";
import { RetargetPanel } from "@/app/whatsapp/components/RetargetPanel";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@/app/whatsapp/types";
import {
  buildTemplateComponents,
  getTemplatePreviewText,
  getTemplateParamIntents,
} from "@/app/whatsapp/utils";

// Enhanced recipient type with retarget tracking
type RetargetRecipient = {
  id: string;
  name: string;
  phone: string;
  source: "lead" | "owner" | "uploaded";
  status?: "pending" | "sending" | "sent" | "failed";
  error?: string;
  state: "pending" | "retargeted" | "blocked";
  retargetCount: number;
  lastRetargetAt: string | null;
  blocked: boolean;
  blockReason: string | null;
  lastErrorCode: number | null;
  canRetarget: boolean;
  hasEngagement: boolean;
  country?: string;
  batchId?: string;
  sourceFileName?: string;
};

type UploadBatch = {
  batchId: string;
  sourceFileName: string;
  count: number;
  uploadedAt: string;
};

export default function RetargetPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();

  // Access control
  const allowedRoles = ["SuperAdmin", "Sales", "Advert"];
  const userRole = token?.role || "";

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [retargetTemplateParams, setRetargetTemplateParams] = useState<Record<string, string>>({});

  // Locations
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Retargeting filter state
  const [retargetAudience, setRetargetAudience] = useState<"leads" | "owners" | "uploaded">("leads");
  const [retargetPriceFrom, setRetargetPriceFrom] = useState("");
  const [retargetPriceTo, setRetargetPriceTo] = useState("");
  const [retargetFromDate, setRetargetFromDate] = useState("");
  const [retargetToDate, setRetargetToDate] = useState("");

  // Recipients
  const [retargetRecipients, setRetargetRecipients] = useState<RetargetRecipient[]>([]);
  const [retargetSelectedIds, setRetargetSelectedIds] = useState<string[]>([]);
  const [retargetFetching, setRetargetFetching] = useState(false);
  const [retargetSending, setRetargetSending] = useState(false);
  const [retargetDailyCount, setRetargetDailyCount] = useState(0);
  const [retargetMeta, setRetargetMeta] = useState<{
    maxRetargetAllowed?: number;
    cooldownHours?: number;
    blocked?: number;
    pending?: number;
    retargeted?: number;
    atMaxRetarget?: number;
  }>({});
  const [retargetSentCount, setRetargetSentCount] = useState(0);

  // Upload contacts state
  const [uploading, setUploading] = useState(false);
  const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
  const [uploadCountries, setUploadCountries] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  // Fetch templates on mount
  useEffect(() => {
    if (!allowedRoles.includes(userRole)) return;

    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const res = await axios.get("/api/whatsapp/templates");
        console.log("templates", res.data.templates);
        setTemplates(res.data.templates || []);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, [userRole]);

  // Fetch locations on mount
  useEffect(() => {
    const getLocations = async () => {
      try {
        const response = await axios.get("/api/monthlyTargets/getLocations");
        if (response) {
          const cities = response.data.locations.map(
            (location: any) => location.city
          );
          setLocations(cities);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
    getLocations();
  }, []);

  // Track daily retarget count (local, reset per day)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("retarget_daily");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const today = new Date().toISOString().slice(0, 10);
        if (parsed?.date === today && typeof parsed?.count === "number") {
          setRetargetDailyCount(parsed.count);
        } else {
          localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count: 0 }));
          setRetargetDailyCount(0);
        }
      } catch (e) {
        setRetargetDailyCount(0);
      }
    } else {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count: 0 }));
      setRetargetDailyCount(0);
    }
  }, []);

  const persistRetargetDailyCount = useCallback((count: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setRetargetDailyCount(count);
    if (typeof window !== "undefined") {
      localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count }));
    }
  }, []);

  // Handle file upload
  const handleUploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/whatsapp/retarget/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast({
          title: "Upload successful",
          description: `${res.data.imported} contacts imported from "${file.name}"${res.data.skipped > 0 ? ` (${res.data.skipped} skipped)` : ""}`,
        });
        // Refresh uploaded contacts list
        fetchUploadedContacts();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.response?.data?.error || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  // Fetch uploaded contacts from DB
  const fetchUploadedContacts = useCallback(async (filters?: { country?: string; batchId?: string }) => {
    try {
      setRetargetFetching(true);
      setRetargetSentCount(0);

      const params = new URLSearchParams();
      const country = filters?.country ?? selectedCountry;
      const batch = filters?.batchId ?? selectedBatchId;
      if (country) params.append("country", country);
      if (batch) params.append("batchId", batch);

      const res = await axios.get(`/api/whatsapp/retarget/uploaded-contacts?${params.toString()}`);

      if (res.data.success) {
        const contacts = res.data.contacts || [];
        setUploadBatches(res.data.batches || []);
        setUploadCountries(res.data.countries || []);

        // Map to RetargetRecipient shape
        const mapped: RetargetRecipient[] = contacts.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          source: "uploaded" as const,
          status: "pending",
          state: "pending" as const,
          retargetCount: 0,
          lastRetargetAt: null,
          blocked: false,
          blockReason: null,
          lastErrorCode: null,
          canRetarget: true,
          hasEngagement: false,
          country: c.country,
          batchId: c.batchId,
          sourceFileName: c.sourceFileName,
        }));

        setRetargetRecipients(mapped);

        const selectableIds = mapped.slice(0, 10).map((r) => r.id);
        setRetargetSelectedIds(selectableIds);

        toast({
          title: "Contacts loaded",
          description: `${mapped.length} uploaded contacts loaded${mapped.length > 10 ? " (first 10 auto-selected)" : ""}`,
        });
      }
    } catch (error: any) {
      console.error("Fetch uploaded contacts error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load uploaded contacts",
        variant: "destructive",
      });
    } finally {
      setRetargetFetching(false);
    }
  }, [selectedCountry, selectedBatchId, toast]);

  // Fetch recipients with state filter
  const fetchRetargetRecipients = useCallback(async (stateFilter: string = "pending", additionalFilters?: Record<string, any>) => {
    // If audience is "uploaded", delegate to fetchUploadedContacts
    if (retargetAudience === "uploaded") {
      fetchUploadedContacts(additionalFilters as any);
      return;
    }
    try {
      setRetargetFetching(true);
      setRetargetSentCount(0);

      const requestBody: Record<string, any> = {
        audience: retargetAudience,
        priceFrom: retargetPriceFrom ? Number(retargetPriceFrom) : undefined,
        priceTo: retargetPriceTo ? Number(retargetPriceTo) : undefined,
        fromDate: retargetFromDate || undefined,
        toDate: retargetToDate || undefined,
        location: selectedLocation || undefined,
        stateFilter,
        limit: 10000,
      };

      if (additionalFilters && typeof additionalFilters === "object") {
        Object.assign(requestBody, additionalFilters);
      }

      const response = await axios.post("/api/whatsapp/retarget", requestBody);
      const recs = response.data?.recipients || [];
      const meta = response.data?.meta || {};

      setRetargetMeta(meta);

      setRetargetRecipients(
        recs.map((r: any) => ({
          ...r,
          status: "pending",
        }))
      );

      const allSelectableIds = recs
        .filter((r: any) => r.canRetarget !== false)
        .map((r: any) => r.id);
      const selectableIds = allSelectableIds.slice(0, 10);
      setRetargetSelectedIds(selectableIds);

      setRetargetMeta(meta);

      const limitNote = allSelectableIds.length > 10
        ? ` (first 10 auto-selected)`
        : "";
      toast({
        title: "Recipients loaded",
        description: `${recs.length} loaded, ${allSelectableIds.length} eligible${limitNote}`,
      });
    } catch (error: any) {
      console.error("Retarget fetch error", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load recipients",
        variant: "destructive",
      });
    } finally {
      setRetargetFetching(false);
    }
  }, [retargetAudience, retargetPriceFrom, retargetPriceTo, retargetFromDate, retargetToDate, selectedLocation, toast, fetchUploadedContacts]);

  // Meta-Safe Pattern Implementation for sending retarget batches
  const sendRetargetBatch = useCallback(async () => {
    if (!selectedTemplate) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }
    if (retargetRecipients.length === 0) {
      toast({ title: "No recipients", description: "Fetch recipients first.", variant: "destructive" });
      return;
    }

    const DAILY_CAP_MIN = 50;
    const DAILY_CAP_MAX = 70;
    const HOURLY_CAP_MIN = 12;
    const HOURLY_CAP_MAX = 15;
    const DELAY_MIN_MS = 60 * 1000;
    const DELAY_MAX_MS = 150 * 1000;

    const getHourlyCount = () => {
      const now = new Date();
      const hourKey = `retarget_hourly_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
      const stored = localStorage.getItem(hourKey);
      return stored ? parseInt(stored, 10) : 0;
    };

    const setHourlyCount = (count: number) => {
      const now = new Date();
      const hourKey = `retarget_hourly_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
      localStorage.setItem(hourKey, count.toString());
    };

    const dailyCap = Math.floor(Math.random() * (DAILY_CAP_MAX - DAILY_CAP_MIN + 1)) + DAILY_CAP_MIN;
    const dailyRemaining = Math.max(0, dailyCap - retargetDailyCount);

    const hourlyCount = getHourlyCount();
    const hourlyCap = Math.floor(Math.random() * (HOURLY_CAP_MAX - HOURLY_CAP_MIN + 1)) + HOURLY_CAP_MIN;
    const hourlyRemaining = Math.max(0, hourlyCap - hourlyCount);

    const selected = retargetRecipients.filter((r) => retargetSelectedIds.includes(r.id));
    const sendable = Math.min(dailyRemaining, hourlyRemaining, selected.length);

    if (sendable <= 0) {
      if (dailyRemaining <= 0) {
        toast({
          title: "Daily limit reached",
          description: `You have reached the daily cap (${dailyCap} messages/day) for retargeting.`,
          variant: "destructive",
        });
      } else if (hourlyRemaining <= 0) {
        toast({
          title: "Hourly limit reached",
          description: `You have reached the hourly cap (${hourlyCap} messages/hour). Please wait.`,
          variant: "destructive",
        });
      }
      return;
    }

    setRetargetSending(true);
    setRetargetSentCount(0);

    // Detect which params need per-recipient substitution
    const intents = getTemplateParamIntents(selectedTemplate);
    const hasAutoParams = Object.values(intents).some(
      (i) => i === "recipientName" || i === "location"
    );

    // If no auto-fill params, build once (original behavior)
    const staticTemplateText = !hasAutoParams ? getTemplatePreviewText(selectedTemplate, retargetTemplateParams) : "";
    const staticComponents = !hasAutoParams ? buildTemplateComponents(selectedTemplate, retargetTemplateParams) : [];

    let sentCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let aborted = false;
    const usedDelays = new Set<number>();

    const getRandomDelay = (): number => {
      let delay: number;
      let attempts = 0;
      do {
        delay = Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
        attempts++;
        delay = Math.round(delay / 5000) * 5000;
      } while (usedDelays.has(delay) && attempts < 20);

      usedDelays.add(delay);
      if (usedDelays.size > 10) {
        const first = Array.from(usedDelays)[0];
        usedDelays.delete(first);
      }

      return delay;
    };

    for (let i = 0; i < sendable; i++) {
      if (failedCount >= 5) {
        console.log(`[AUDIT] Retargeting aborted: ${failedCount} failures reached`);
        toast({
          title: "Retargeting Stopped",
          description: `Stopped after ${failedCount} failures. Check your template or try later.`,
          variant: "destructive",
        });
        aborted = true;
        break;
      }

      if (blockedCount >= 2) {
        console.log(`[AUDIT] Retargeting aborted: ${blockedCount} blocked users detected`);
        toast({
          title: "Retargeting Stopped",
          description: "Multiple users have blocked this number. Review your contact list.",
          variant: "destructive",
        });
        aborted = true;
        break;
      }

      const currentHourlyCount = getHourlyCount();
      if (currentHourlyCount >= hourlyCap) {
        console.log(`[AUDIT] Hourly cap reached: ${currentHourlyCount}/${hourlyCap}`);
        toast({
          title: "Hourly limit reached",
          description: `Reached hourly cap of ${hourlyCap} messages. Resuming after next hour.`,
          variant: "default",
        });
        break;
      }

      const recipient = selected[i];
      setRetargetRecipients((prev) =>
        prev.map((r) =>
          r.id === recipient.id ? { ...r, status: "sending", error: undefined } : r
        )
      );

      try {
        // Build per-recipient params if auto-fill is active
        let sendComponents = staticComponents;
        let sendTemplateText = staticTemplateText;

        if (hasAutoParams) {
          const recipientParams = { ...retargetTemplateParams };
          for (const [key, intent] of Object.entries(intents)) {
            // Only substitute if the user hasn't manually overridden (left empty)
            if (!recipientParams[key]) {
              if (intent === "recipientName") {
                recipientParams[key] = recipient.name || "";
              } else if (intent === "location") {
                recipientParams[key] = (recipient as any).location || (recipient as any).area || "";
              }
            }
          }
          sendComponents = buildTemplateComponents(selectedTemplate, recipientParams);
          sendTemplateText = getTemplatePreviewText(selectedTemplate, recipientParams);
        }

        await axios.post("/api/whatsapp/send-template", {
          to: recipient.phone,
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          components: sendComponents.length > 0 ? sendComponents : undefined,
          templateText: sendTemplateText,
          isRetarget: true,
        });

        sentCount += 1;
        setRetargetSentCount(sentCount);
        persistRetargetDailyCount(retargetDailyCount + sentCount);
        setHourlyCount(currentHourlyCount + 1);

        setRetargetRecipients((prev) =>
          prev.map((r) =>
            r.id === recipient.id ? { ...r, status: "sent" } : r
          )
        );

        console.log(`[AUDIT] Sent to ${recipient.phone} (${sentCount}/${sendable}, hourly: ${currentHourlyCount + 1}/${hourlyCap})`);
      } catch (error: any) {
        failedCount += 1;
        const errorMsg = error.response?.data?.error || "Send failed";

        if (errorMsg.includes("131049") || errorMsg.includes("blocked")) {
          blockedCount += 1;
          console.log(`[AUDIT] User blocked detected for ${recipient.phone}`);
        }

        setRetargetRecipients((prev) =>
          prev.map((r) =>
            r.id === recipient.id ? { ...r, status: "failed", error: errorMsg } : r
          )
        );
      }

      if (i < sendable - 1 && !aborted) {
        const delay = getRandomDelay();
        const delaySeconds = Math.round(delay / 1000);
        console.log(`[AUDIT] Waiting ${delaySeconds}s before next message (randomized, non-repeating delay)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setRetargetSending(false);

    if (!aborted && sentCount > 0) {
      toast({
        title: "Retargeting completed",
        description: `Successfully sent ${sentCount} messages. Daily: ${retargetDailyCount + sentCount}/${dailyCap}, Hourly: ${getHourlyCount()}/${hourlyCap}`,
      });
    }
    console.log(`[AUDIT] Retarget batch complete: sent=${sentCount}, failed=${failedCount}, blocked=${blockedCount}, aborted=${aborted}, daily=${retargetDailyCount + sentCount}/${dailyCap}, hourly=${getHourlyCount()}/${hourlyCap}`);
  }, [selectedTemplate, retargetRecipients, retargetSelectedIds, retargetTemplateParams, retargetDailyCount, persistRetargetDailyCount, toast]);

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="mt-2 text-muted-foreground">You do not have permission to access the Retargeting page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#f0f2f5] dark:bg-[#0b141a] overflow-x-hidden">
      {/* Header */}
      <div className="bg-[#008069] dark:bg-[#202c33] flex items-center shadow-sm flex-shrink-0 h-[50px] px-4 pt-[env(safe-area-inset-top,0px)]">
        <h1 className="text-white font-semibold text-lg">Retarget</h1>
        <div className="flex-1" />
        <div className="text-white/80 text-sm hidden md:block">
          {token?.name} &bull; {token?.role}
        </div>
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4 py-4">
        <RetargetPanel
          audience={retargetAudience}
          onAudienceChange={setRetargetAudience}
          priceFrom={retargetPriceFrom}
          priceTo={retargetPriceTo}
          fromDate={retargetFromDate}
          toDate={retargetToDate}
          location={locations}
          onLocationChange={setLocations}
          selectedLocation={selectedLocation}
          onSelectedLocationChange={setSelectedLocation}
          onPriceFromChange={setRetargetPriceFrom}
          onPriceToChange={setRetargetPriceTo}
          onFromDateChange={setRetargetFromDate}
          onToDateChange={setRetargetToDate}
          onFetchRecipients={fetchRetargetRecipients}
          fetching={retargetFetching}
          recipients={retargetRecipients}
          sending={retargetSending}
          onSend={sendRetargetBatch}
          dailyRemaining={Math.max(0, 70 - retargetDailyCount)}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
          templates={templates}
          templateParams={retargetTemplateParams}
          onTemplateParamsChange={setRetargetTemplateParams}
          totalToSend={Math.min(retargetSelectedIds.length, Math.max(0, 70 - retargetDailyCount))}
          sentCount={retargetSentCount}
          sendingActive={retargetSending}
          selectedRecipientIds={retargetSelectedIds}
          onToggleRecipient={(id) => {
            const recipient = retargetRecipients.find((r) => r.id === id);
            if (recipient?.canRetarget && !recipient?.blocked) {
              setRetargetSelectedIds((prev) => {
                if (prev.includes(id)) {
                  return prev.filter((x) => x !== id);
                }
                if (prev.length >= 10) {
                  toast({
                    title: "Selection limit reached",
                    description: "Maximum 10 recipients can be selected at once",
                    variant: "destructive",
                  });
                  return prev;
                }
                return [...prev, id];
              });
            }
          }}
          onToggleAll={(checked) => {
            if (checked) {
              const eligibleIds = retargetRecipients
                .filter((r) => r.canRetarget && !r.blocked)
                .map((r) => r.id)
                .slice(0, 10);
              setRetargetSelectedIds(eligibleIds);
              if (retargetRecipients.filter((r) => r.canRetarget && !r.blocked).length > 10) {
                toast({
                  title: "Selection limited to 10",
                  description: "Only the first 10 eligible recipients were selected",
                });
              }
            } else {
              setRetargetSelectedIds([]);
            }
          }}
          meta={retargetMeta}
          senderName={token?.name || ""}
          onUploadFile={handleUploadFile}
          uploading={uploading}
          uploadBatches={uploadBatches}
          uploadCountries={uploadCountries}
          selectedBatchId={selectedBatchId}
          onBatchIdChange={setSelectedBatchId}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />
      </div>
    </div>
  );
}
