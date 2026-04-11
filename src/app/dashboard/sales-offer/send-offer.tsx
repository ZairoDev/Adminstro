"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type AliasOption = {
  _id: string;
  aliasName: string;
  aliasEmail: string;
  status: string;
  organization?: string;
};

export default function SendOffer() {
  const { setField, platform, aliasId } = useSalesOfferStore();
  const token = useAuthStore((s) => s.token);
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const role = String(token?.role ?? "").trim();
  const showAliasOverride = role === "HAdmin" || role === "SuperAdmin";

  const [aliases, setAliases] = useState<AliasOption[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadAliases() {
      if (!showAliasOverride) return;
      const res = await axios.get("/api/alias/getAllAliases");
      const items = (res.data?.aliases ?? []) as AliasOption[];
      if (!mounted) return;
      setAliases(
        items.filter(
          (a) =>
            String(a.status) === "Active" &&
            (!selectedOrg || !a.organization || a.organization === selectedOrg),
        ),
      );
    }
    loadAliases().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [showAliasOverride, selectedOrg]);

  const aliasLabel = useMemo(() => {
    if (!aliasId) return "";
    const a = aliases.find((x) => x._id === aliasId);
    return a ? `${a.aliasName} (${a.aliasEmail})` : "";
  }, [aliasId, aliases]);

  return (
    <div className=" border border-neutral-600 rounded-md p-2">
      <p className=" font-semibold text-xl">Send Offer</p>

      {/* Offer Details */}
      <div className=" grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-4">
        {showAliasOverride && (
          <div>
            <Label htmlFor="alias">Send using alias</Label>
            <Select
              value={aliasId ?? ""}
              onValueChange={(v) => setField("aliasId", v)}
            >
              <SelectTrigger id="alias">
                <SelectValue placeholder="Select an alias">
                  {aliasLabel || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Aliases</SelectLabel>
                  {aliases.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.aliasName} ({a.aliasEmail})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Name */}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            type="text"
            id="name"
            name="name"
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* Property Name */}
        <div>
          <Label htmlFor="propertyName">Property Name</Label>
          <Input
            type="text"
            id="propertyName"
            name="propertyName"
            onChange={(e) => setField("propertyName", e.target.value)}
          />
        </div>

        {/* Relation */}
        <div>
          <Label htmlFor="relation">Relation</Label>
          <Input
            type="text"
            id="relation"
            name="relation"
            onChange={(e) => setField("relation", e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>

        {/* URL */}
        <div>
          <Label htmlFor="propertyUrl">URL</Label>
          <Input
            type="text"
            id="propertyUrl"
            name="propertyUrl"
            onChange={(e) => setField("propertyUrl", e.target.value)}
          />
        </div>

        {/* Service */}
        {platform === "TechTunes" && (
          <div>
            <Label htmlFor="service">Services</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a Service" />
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

      {/* Address Details */}
      <AddressDetails />
    </div>
  );
}
