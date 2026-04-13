"use client";

import { useEffect, useMemo, useState } from "react";

import axios from "@/util/axios";
import { renderTemplate } from "@/util/templateEngine";
import { resolvePayNowUrl } from "@/util/payNowUrl";
import { useSalesOfferStore } from "./useSalesOfferStore";
import { useOrgSelectionStore } from "./useOrgSelectionStore";

type ActiveTemplate = {
  _id: string;
  name: string;
  html: string;
};

type CurrentAlias = {
  _id: string;
  aliasName: string;
  aliasEmail: string;
  status: string;
  organization: string;
};

type AliasOption = {
  _id: string;
  aliasName: string;
  aliasEmail: string;
  status: string;
  organization: string;
};

export default function EmailPreview() {
  const offer = useSalesOfferStore();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [template, setTemplate] = useState<ActiveTemplate | null>(null);
  const [alias, setAlias] = useState<CurrentAlias | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const orgParam = selectedOrg ? `&organization=${encodeURIComponent(selectedOrg)}` : "";
        const tRes = await axios.get(`/api/templates?activeOnly=true${orgParam}`);
        const t0 = (tRes.data?.templates?.[0] ?? null) as ActiveTemplate | null;
        let a0: CurrentAlias | null = null;

        if (offer.aliasId) {
          const orgParamForAlias = selectedOrg
            ? `?organization=${encodeURIComponent(selectedOrg)}`
            : "";
          const aRes = await axios.get(`/api/alias/getAllAliases${orgParamForAlias}`);
          const list = (aRes.data?.aliases ?? []) as AliasOption[];
          const found = list.find((a) => a._id === offer.aliasId) ?? null;
          a0 = found
            ? {
                _id: found._id,
                aliasName: found.aliasName,
                aliasEmail: found.aliasEmail,
                status: found.status,
                organization: found.organization,
              }
            : null;
        } else {
          const aRes = await axios.get("/api/aliases");
          a0 = (aRes.data?.alias ?? null) as CurrentAlias | null;
        }

        if (!mounted) return;
        setTemplate(t0);
        setAlias(a0);
      } catch (_err) {
        if (!mounted) return;
        setTemplate(null);
        setAlias(null);
        setLoadError("Unable to load template/alias for this organization.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [offer.aliasId, selectedOrg]);

  const subject = useMemo(() => {
    const planText = typeof offer.plan === "string" ? offer.plan : "";
    return planText.trim() ? `Offer - ${planText}` : "Offer";
  }, [offer.plan]);

  const html = useMemo(() => {
    if (!template?.html) return "";
    const payNowUrl = selectedOrg
      ? resolvePayNowUrl(selectedOrg, offer.propertyUrl || "#")
      : offer.propertyUrl || "#";
    return renderTemplate(template.html, {
      ownerName: offer.name,
      price: offer.effectivePrice,
      employeeName: "—", // server will fill from session employee snapshot; keep preview safe
      employeeEmail: "—",
      propertyName: offer.propertyName,
      propertyUrl: offer.propertyUrl,
      plan: offer.plan,
      payNowUrl,
      discount: offer.discount,
      effectivePrice: offer.effectivePrice,
    });
  }, [
    template?.html,
    offer.name,
    offer.effectivePrice,
    offer.propertyName,
    offer.propertyUrl,
    offer.plan,
    selectedOrg,
    offer.discount,
  ]);

  return (
    <div className="border border-neutral-600 rounded-md p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-xl">Email Preview</p>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading template and alias…" : "Preview uses your active organization template."}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">Selected alias</div>
          {alias ? (
            <div className="text-muted-foreground">
              <div>{alias.aliasName}</div>
              <div>{alias.aliasEmail}</div>
              <div className="text-xs">{alias.organization}</div>
            </div>
          ) : (
            <div className="text-muted-foreground">No active alias</div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Subject</div>
          <div className="font-medium">{subject}</div>
        </div>

        <div className="rounded-md border bg-background">
          {template ? (
            html ? (
              <iframe
                title="Email preview"
                className="w-full h-[420px] rounded-md"
                sandbox=""
                srcDoc={html}
              />
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                Fill the offer details to see the rendered preview.
              </div>
            )
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              {loadError || "No active template found for your organization."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

