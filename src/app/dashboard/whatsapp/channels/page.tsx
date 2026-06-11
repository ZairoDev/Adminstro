"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNEL_ADMIN_ROLES = ["SuperAdmin"];
const RENTAL_TYPES = ["Short Term", "Long Term", "General"] as const;
const CHANNEL_TYPES = ["guest", "owner", "support", "backup"] as const;

type RentalType = (typeof RENTAL_TYPES)[number];
type ChannelType = (typeof CHANNEL_TYPES)[number];

const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  guest: "Guest",
  owner: "Owner",
  support: "Support",
  backup: "Backup",
};

const CHANNEL_TYPE_COLORS: Record<ChannelType, string> = {
  guest: "bg-blue-100 text-blue-800",
  owner: "bg-purple-100 text-purple-800",
  support: "bg-green-100 text-green-800",
  backup: "bg-gray-100 text-gray-700",
};

type Channel = {
  _id: string;
  name: string;
  channelType: ChannelType;
  businessPortfolioId: string;
  businessPortfolioName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  hasAccessToken: boolean;
  rentalType: RentalType;
  assignedLocations: string[];
  active: boolean;
  assignedAt?: string;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  channelType: ChannelType;
  businessPortfolioName: string;
  businessPortfolioId: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  rentalType: RentalType;
  locations: string[];
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  channelType: "guest",
  businessPortfolioName: "",
  businessPortfolioId: "",
  wabaId: "",
  wabaName: "",
  phoneNumberId: "",
  displayPhoneNumber: "",
  accessToken: "",
  rentalType: "Long Term",
  locations: [],
  active: true,
};

const titleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export default function WhatsAppChannelsDashboardPage() {
  const { token } = useAuthStore();
  const role = token?.role || "";
  const isAdmin = CHANNEL_ADMIN_ROLES.includes(role);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<ChannelType | "all">("all");

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/whatsapp/channels");
      setChannels(Array.isArray(res.data?.channels) ? res.data.channels : []);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to load channels";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadChannels();
    axios
      .get("/api/monthlyTargets/getLocations")
      .then((res) => {
        const raw = res.data?.locations;
        const cities: string[] = Array.isArray(raw)
          ? raw
              .map((item: unknown) =>
                typeof item === "string"
                  ? item
                  : String((item as { city?: string })?.city ?? ""),
              )
              .filter(Boolean)
          : [];
        setAllLocations([...new Set(cities)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => setAllLocations([]));
  }, [isAdmin, loadChannels]);

  const locationLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of allLocations) {
      map.set(loc.trim().toLowerCase(), loc);
    }
    return map;
  }, [allLocations]);

  const filteredChannels = useMemo(
    () =>
      filterType === "all"
        ? channels
        : channels.filter((c) => c.channelType === filterType),
    [channels, filterType],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (channel: Channel) => {
    setEditingId(channel._id);
    setForm({
      name: channel.name,
      channelType: channel.channelType || "guest",
      businessPortfolioName: channel.businessPortfolioName,
      businessPortfolioId: channel.businessPortfolioId,
      wabaId: channel.wabaId,
      wabaName: channel.wabaName || "",
      phoneNumberId: channel.phoneNumberId,
      displayPhoneNumber: channel.displayPhoneNumber,
      accessToken: "",
      rentalType: channel.rentalType,
      locations: channel.assignedLocations.map(
        (key) => locationLabelByKey.get(key) || titleCase(key),
      ),
      active: channel.active,
    });
    setModalOpen(true);
  };

  const toggleLocation = (loc: string) => {
    setForm((prev) => {
      const exists = prev.locations.includes(loc);
      return {
        ...prev,
        locations: exists
          ? prev.locations.filter((l) => l !== loc)
          : [...prev.locations, loc],
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("Channel name is required");
    if (!form.phoneNumberId.trim()) return toast.error("Phone Number ID is required");
    if (form.locations.length === 0) return toast.error("Assign at least one location");

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        channelType: form.channelType,
        businessPortfolioName: form.businessPortfolioName,
        businessPortfolioId: form.businessPortfolioId,
        wabaId: form.wabaId,
        wabaName: form.wabaName,
        phoneNumberId: form.phoneNumberId,
        displayPhoneNumber: form.displayPhoneNumber,
        accessToken: form.accessToken,
        rentalType: form.rentalType,
        locations: form.locations,
        active: form.active,
      };

      if (editingId) {
        await axios.patch(`/api/whatsapp/channels/${editingId}`, payload);
        toast.success("Channel updated");
      } else {
        await axios.post("/api/whatsapp/channels", payload);
        toast.success("Channel created");
      }
      setModalOpen(false);
      await loadChannels();
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to save channel";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (channel: Channel) => {
    try {
      await axios.patch(`/api/whatsapp/channels/${channel._id}`, {
        active: !channel.active,
      });
      toast.success(channel.active ? "Channel disabled" : "Channel enabled");
      await loadChannels();
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to update channel";
      toast.error(message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-center">
        <div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp channel management is restricted to SuperAdmin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Channels</h1>
          <p className="text-sm text-muted-foreground">
            Route Location + Rental Type + Channel Type to a phone number, token, WABA and portfolio.
          </p>
        </div>
        <Button onClick={openCreate}>Create channel</Button>
      </div>

      {/* Channel type filter tabs */}
      <div className="flex gap-2">
        {(["all", ...CHANNEL_TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filterType === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t === "all" ? "All" : CHANNEL_TYPE_LABELS[t]}
            {" "}
            ({t === "all" ? channels.length : channels.filter((c) => c.channelType === t).length})
          </button>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Portfolio / WABA</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Rental Type</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filteredChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No channels yet. Create your first channel.
                </TableCell>
              </TableRow>
            ) : (
              filteredChannels.map((channel) => (
                <TableRow key={channel._id} className={!channel.active ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        CHANNEL_TYPE_COLORS[channel.channelType] ?? "bg-gray-100"
                      }`}
                    >
                      {CHANNEL_TYPE_LABELS[channel.channelType] ?? channel.channelType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{channel.businessPortfolioName || "—"}</span>
                      {channel.wabaName && (
                        <span className="text-xs text-muted-foreground">{channel.wabaName}</span>
                      )}
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {channel.wabaId || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{channel.displayPhoneNumber || "—"}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {channel.phoneNumberId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{channel.rentalType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {channel.assignedLocations.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        channel.assignedLocations.map((loc) => (
                          <Badge key={loc} variant="outline">
                            {locationLabelByKey.get(loc) || titleCase(loc)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={channel.active}
                      onCheckedChange={() => toggleActive(channel)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {channel.assignedAt
                      ? new Date(channel.assignedAt).toLocaleDateString()
                      : channel.createdAt
                      ? new Date(channel.createdAt).toLocaleDateString()
                      : "—"}
                    {channel.endedAt && (
                      <div className="text-[11px] text-red-500">
                        Ended {new Date(channel.endedAt).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(channel)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit channel" : "Create channel"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Channel Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Athens Guest Long Term"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Channel Type</Label>
              <Select
                value={form.channelType}
                onValueChange={(v) => setForm({ ...form, channelType: v as ChannelType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {CHANNEL_TYPE_LABELS[ct]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rental Type</Label>
              <Select
                value={form.rentalType}
                onValueChange={(v) => setForm({ ...form, rentalType: v as RentalType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENTAL_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Business Portfolio Name</Label>
              <Input
                value={form.businessPortfolioName}
                onChange={(e) =>
                  setForm({ ...form, businessPortfolioName: e.target.value })
                }
                placeholder="Guests Portfolio"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Portfolio ID</Label>
              <Input
                value={form.businessPortfolioId}
                onChange={(e) =>
                  setForm({ ...form, businessPortfolioId: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>WABA Name</Label>
              <Input
                value={form.wabaName}
                onChange={(e) => setForm({ ...form, wabaName: e.target.value })}
                placeholder="Athens Guest WABA"
              />
            </div>
            <div className="space-y-1.5">
              <Label>WABA ID</Label>
              <Input
                value={form.wabaId}
                onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input
                value={form.phoneNumberId}
                onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Phone Number</Label>
              <Input
                value={form.displayPhoneNumber}
                onChange={(e) =>
                  setForm({ ...form, displayPhoneNumber: e.target.value })
                }
                placeholder="+30 ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Access Token{" "}
                {editingId && (
                  <span className="text-xs text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                placeholder={editingId ? "••••••••" : "Permanent access token"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Locations</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-3">
              {allLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No locations available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {allLocations.map((loc) => (
                    <label
                      key={loc}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.locations.includes(loc)}
                        onChange={() => toggleLocation(loc)}
                      />
                      {loc}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Location + Rental Type + Channel Type must be unique across active channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label>Active</Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
