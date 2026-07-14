"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Edit, Plus, Search, Trash2 } from "lucide-react";
import axios from "@/util/axios";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type OfficeAddress = {
  _id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  formattedAddress: string;
  isActive: boolean;
};

type OfficeFormValues = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isActive: boolean;
};

const EMPTY_FORM: OfficeFormValues = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isActive: true,
};

const MANAGE_ROLES = new Set(["SuperAdmin", "Admin", "HR", "HAdmin"]);

export default function OfficeAddressesPage() {
  const token = useAuthStore((s) => s.token);
  const canManage = MANAGE_ROLES.has(String(token?.role || ""));

  const [offices, setOffices] = useState<OfficeAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<OfficeAddress | null>(null);
  const [form, setForm] = useState<OfficeFormValues>(EMPTY_FORM);

  const fetchOffices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/office-addresses");
      setOffices(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to load offices",
        description: error?.response?.data?.error || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchOffices();
  }, [canManage, fetchOffices]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return offices.filter((o) => {
      if (statusFilter === "active" && !o.isActive) return false;
      if (statusFilter === "inactive" && o.isActive) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.formattedAddress.toLowerCase().includes(q)
      );
    });
  }, [offices, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (office: OfficeAddress) => {
    setEditing(office);
    setForm({
      name: office.name,
      addressLine1: office.addressLine1,
      addressLine2: office.addressLine2 || "",
      city: office.city,
      state: office.state,
      pincode: office.pincode,
      country: office.country || "India",
      isActive: office.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (
      !form.name.trim() ||
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Name, address line 1, city, state, and pincode are required.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        country: form.country.trim() || "India",
        isActive: form.isActive,
      };

      if (editing) {
        await axios.patch(`/api/office-addresses/${editing._id}`, payload);
        toast({ title: "Office address updated" });
      } else {
        await axios.post("/api/office-addresses", payload);
        toast({ title: "Office address created" });
      }
      setDialogOpen(false);
      await fetchOffices();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error?.response?.data?.error || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (office: OfficeAddress) => {
    if (!confirm(`Delete office "${office.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/office-addresses/${office._id}`);
      toast({ title: "Office address deleted" });
      await fetchOffices();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error?.response?.data?.error || "Please try again",
      });
    }
  };

  if (!canManage) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You do not have permission to manage office addresses.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Office Addresses</h1>
            <p className="text-sm text-muted-foreground">
              Manage office locations used on candidate applications and HR PDFs
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Office
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, city, or address…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No office addresses found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((office) => (
                <TableRow key={office._id}>
                  <TableCell className="font-medium">{office.name}</TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    {office.formattedAddress}
                  </TableCell>
                  <TableCell>{office.city}</TableCell>
                  <TableCell>
                    <Badge variant={office.isActive ? "default" : "secondary"}>
                      {office.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(office)}
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(office)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Office Address" : "Add Office Address"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Office Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kanpur Office"
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 1 *</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, addressLine1: e.target.value }))
                }
                placeholder="Street / building"
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, addressLine2: e.target.value }))
                }
                placeholder="Area / landmark (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pincode *</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pincode: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, isActive: v === "active" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
