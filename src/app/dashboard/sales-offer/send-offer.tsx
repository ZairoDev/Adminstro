"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import AddressDetails from "./address-details";
import { useSalesOfferStore } from "./useSalesOfferStore";
import { useAuthStore } from "@/AuthStore";
import { useOrgSelectionStore } from "./useOrgSelectionStore";
import axios from "@/util/axios";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization } from "@/util/organizationConstants";
import { Mail } from "lucide-react";

type AliasOption = {
  _id: string;
  aliasName: string;
  aliasEmail: string;
  status: string;
  organization?: string;
};

export default function SendOffer() {
  const {
    setField,
    platform,
    aliasId,
    name,
    propertyName,
    relation,
    email,
    propertyUrl,
  } = useSalesOfferStore();
  const token = useAuthStore((s) => s.token);
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const initialized = useOrgSelectionStore((s) => s.initialized);
  const role = String(token?.role ?? "").trim();
  const roleNorm = role.toLowerCase();
  /** Aliases: SuperAdmin picks org; HAdmin locked Holidaysera; Admin scoped to org */
  const showAliasPicker =
    roleNorm === "hadmin" || roleNorm === "superadmin" || roleNorm === "admin";

  const effectiveAliasOrg = useMemo<Organization | null>(() => {
    if (roleNorm === "hadmin") return "Holidaysera";
    return selectedOrg;
  }, [roleNorm, selectedOrg]);

  const [aliases, setAliases] = useState<AliasOption[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [aliasesError, setAliasesError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadAliases() {
      if (!showAliasPicker) return;
      if (!initialized) return;

      setAliasesLoading(true);
      setAliasesError("");
      try {
        const orgParam = effectiveAliasOrg
          ? `?organization=${encodeURIComponent(effectiveAliasOrg)}`
          : "";
        const res = await axios.get(`/api/alias/getAllAliases${orgParam}`);
        const items = (res.data?.aliases ?? []) as AliasOption[];
        const activeOnly = items.filter(
          (a) => String(a.status ?? "").toLowerCase() === "active",
        );
        if (!mounted) return;
        setAliases(activeOnly.length > 0 ? activeOnly : items);
      } catch {
        if (!mounted) return;
        setAliases([]);
        setAliasesError("Unable to load aliases");
      } finally {
        if (mounted) setAliasesLoading(false);
      }
    }
    void loadAliases();
    return () => {
      mounted = false;
    };
  }, [showAliasPicker, effectiveAliasOrg, initialized]);

  const aliasLabel = useMemo(() => {
    if (!aliasId) return "";
    const a = aliases.find((x) => x._id === aliasId);
    return a ? `${a.aliasName} (${a.aliasEmail})` : "";
  }, [aliasId, aliases]);

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-3 space-y-1 border-b bg-muted/30">
        <CardTitle className="text-lg font-semibold tracking-tight">Send offer</CardTitle>
        <CardDescription className="text-xs">
          Lead details and outbound alias for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showAliasPicker && (
            <div className="sm:col-span-2 lg:col-span-3 rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                Outbound alias
                {effectiveAliasOrg && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({effectiveAliasOrg})
                  </span>
                )}
              </div>
              <Label htmlFor="alias" className="sr-only">
                Send using alias
              </Label>
              <Select
                value={aliasId ?? ""}
                onValueChange={(v) => setField("aliasId", v)}
              >
                <SelectTrigger id="alias" className="h-10 w-full max-w-xl bg-background">
                  <SelectValue placeholder={aliasesLoading ? "Loading aliases…" : "Select an alias"}>
                    {aliasLabel || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Active aliases</SelectLabel>
                    {aliases.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.aliasName}
                        <span className="text-muted-foreground"> · {a.aliasEmail}</span>
                      </SelectItem>
                    ))}
                    {!aliasesLoading && aliases.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        {aliasesError ||
                          "No active alias for this organization. Add one under Aliases."}
                      </div>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => setField("name", e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyName">Property name</Label>
            <Input
              type="text"
              id="propertyName"
              name="propertyName"
              value={propertyName}
              onChange={(e) => setField("propertyName", e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relation">Relation</Label>
            <Input
              type="text"
              id="relation"
              name="relation"
              value={relation}
              onChange={(e) => setField("relation", e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setField("email", e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="propertyUrl">Property URL</Label>
            <Input
              type="text"
              id="propertyUrl"
              name="propertyUrl"
              value={propertyUrl}
              onChange={(e) => setField("propertyUrl", e.target.value)}
              className="h-10"
            />
          </div>

          {platform === "TechTunes" && (
            <div className="space-y-2">
              <Label htmlFor="service">Services</Label>
              <Select>
                <SelectTrigger id="service" className="h-10">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Services</SelectLabel>
                    {["Web Development", "SEO services"].map((service, index) => (
                      <SelectItem key={index} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className={cn("pt-2 border-t")}>
          <AddressDetails />
        </div>
      </CardContent>
    </Card>
  );
}
