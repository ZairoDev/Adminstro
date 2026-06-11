"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/AuthStore";
import type { AdvertListingStatus, unregisteredOwners } from "@/util/type";
import type { ShortTermOwnerReadiness } from "@/lib/short-term-owner-readiness";
import { ShortTermOwnerJourney } from "@/components/short-term-owner/ShortTermOwnerJourney";
import { MakeLiveButton } from "@/components/short-term-owner/MakeLiveButton";
import { Loader2 } from "lucide-react";

type OwnerRow = unregisteredOwners & {
  advertListingStatus?: AdvertListingStatus;
  email?: string;
  ownerUserId?: string;
  propertyMongoId?: string;
  createdAt?: string;
};

const statusLabel: Record<AdvertListingStatus, string> = {
  pending: "Pending listing",
  listed_draft: "Draft listed",
  live: "Live",
};

export function ListingQueuePanel() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthStore();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [journeys, setJourneys] = useState<Record<string, ShortTermOwnerReadiness>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const role = String(token?.role ?? "");
  const canAccess = role === "Advert" || role === "SuperAdmin";
  const isSuperAdmin = role === "SuperAdmin";

  const fetchJourney = useCallback(async (ownerSheetId: string) => {
    try {
      const res = await axios.get(`/api/short-term-owner/${ownerSheetId}/journey`);
      setJourneys((prev) => ({ ...prev, [ownerSheetId]: res.data }));
    } catch {
      // optional for pending rows
    }
  }, []);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/advert/pending-owners", {
        params: { status: statusFilter },
      });
      const list: OwnerRow[] = res.data.owners ?? [];
      setOwners(list);
      await Promise.all(
        list
          .filter(
            (o) =>
              o.advertListingStatus === "listed_draft" ||
              o.advertListingStatus === "live",
          )
          .map((o) => fetchJourney(o._id)),
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to load listing queue",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast, fetchJourney]);

  useEffect(() => {
    if (!canAccess) return;
    void fetchOwners();
  }, [canAccess, fetchOwners]);

  const startListing = (owner: OwnerRow) => {
    if (!owner.ownerUserId) {
      toast({
        variant: "destructive",
        title: "Create owner account first",
        description:
          "Go to All users tab, create the owner account, then return here to create the draft listing.",
      });
      router.push(
        `/dashboard/user?tab=all&search=${encodeURIComponent(owner.email ?? owner.name ?? "")}`,
      );
      return;
    }
    if (!owner.email?.trim()) {
      toast({
        variant: "destructive",
        title: "Add owner email on the sheet before creating a listing",
      });
      return;
    }
    router.push(
      `/dashboard/add-listing/1?userId=${owner.ownerUserId}&ownerSheetId=${owner._id}&shortTermDraft=1`,
    );
  };

  if (!canAccess) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Listing queue is available to Advert and SuperAdmin roles only.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-2">
        <p className="font-medium">Short-term commission listings only</p>
        <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs sm:text-sm">
          <li>Create the owner account under <strong className="text-foreground">All users</strong> (if not already created).</li>
          <li>Click <strong className="text-foreground">Create draft listing</strong> — property stays hidden on Vacation Saga.</li>
          <li>Owner logs in on Vacation Saga and completes profile and agreements (calendar link is optional but recommended).</li>
          <li>When the checklist below is complete, click <strong className="text-foreground">Make live</strong>.</li>
        </ol>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="listed_draft">Draft listed</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void fetchOwners()}>
          Refresh
        </Button>
        <Link
          href="/spreadsheet-short-term"
          target="_blank"
          className="text-sm text-primary underline"
        >
          Open short-term owner sheet
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : owners.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No leads in this queue.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Type / Price</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3 min-w-[280px]">Owner checklist (VS)</th>
                <th className="text-left p-3">Added</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => {
                const journey = journeys[owner._id];
                const canMakeLive = journey?.readyToGoLive === true;
                return (
                  <tr key={owner._id} className="border-t align-top">
                    <td className="p-3 font-medium">{owner.name || "—"}</td>
                    <td className="p-3">{owner.phoneNumber || "—"}</td>
                    <td className="p-3">{owner.email || "—"}</td>
                    <td className="p-3">{owner.location || "—"}</td>
                    <td className="p-3">
                      {owner.propertyType || "—"} / {owner.price || "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {statusLabel[owner.advertListingStatus ?? "pending"]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {journey ? (
                        <ShortTermOwnerJourney
                          steps={journey.steps}
                          readyToGoLive={journey.readyToGoLive}
                          missingSteps={journey.missingSteps}
                          ownerStepsOnly
                        />
                      ) : owner.advertListingStatus === "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          Awaiting listing
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void fetchJourney(owner._id)}
                        >
                          Load checklist
                        </Button>
                      )}
                    </td>
                    <td className="p-3">
                      {owner.createdAt
                        ? new Date(owner.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 space-y-1">
                      {owner.ownerUserId && (
                        <Link
                          href={`/dashboard/user?tab=all&search=${encodeURIComponent(owner.email ?? "")}`}
                          className="block text-xs text-primary underline"
                        >
                          Open owner
                        </Link>
                      )}
                      {!owner.ownerUserId && (
                        <Link
                          href={`/dashboard/createnewuser?shortTermOwner=1&email=${encodeURIComponent(owner.email ?? "")}&name=${encodeURIComponent(owner.name ?? "")}&phone=${encodeURIComponent(owner.phoneNumber ?? "")}`}
                          className="block text-xs text-primary underline"
                        >
                          Create owner account
                        </Link>
                      )}
                      {owner.advertListingStatus === "pending" && (
                        <Button size="sm" onClick={() => startListing(owner)}>
                          Create draft listing
                        </Button>
                      )}
                      {owner.advertListingStatus === "listed_draft" && (
                        <>
                          {owner.propertyMongoId && (
                            <Link
                              href={`/dashboard/property/edit/${owner.propertyMongoId}`}
                              className="block text-xs text-primary underline"
                            >
                              Edit property
                            </Link>
                          )}
                          {owner.propertyMongoId && (
                            <MakeLiveButton
                              propertyMongoId={owner.propertyMongoId}
                              readyToGoLive={canMakeLive}
                              missingSteps={journey?.missingSteps}
                              onSuccess={() => void fetchOwners()}
                            />
                          )}
                          {isSuperAdmin &&
                            !canMakeLive &&
                            owner.propertyMongoId && (
                              <MakeLiveButton
                                propertyMongoId={owner.propertyMongoId}
                                forceLive
                                variant="destructive"
                                onSuccess={() => void fetchOwners()}
                              />
                            )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
