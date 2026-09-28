"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Plus, RefreshCw, Search, Users } from "lucide-react";
import axios from "@/util/axios";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AddCollaboratorForm,
  type AddCollaboratorFormValues,
} from "@/components/housingsaga/AddCollaboratorForm";
import type { HousingCollaboratorSupplies } from "@/schemas/housingCollaborator.schema";

type Collaborator = {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  contact: string;
  email: string;
  country: string;
  city: string;
  area: string;
  supplies: HousingCollaboratorSupplies;
  sendContractViaEmail: boolean;
  issuedPassword?: string;
  createdAt?: string;
};

const SUPPLIES_LABELS: Record<HousingCollaboratorSupplies, string> = {
  buyer: "Buyer",
  property: "Property",
  both: "Both",
};

export default function HousingSagaCollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>(
    {},
  );
  const [resetTarget, setResetTarget] = useState<Collaborator | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchCollaborators = useCallback(async (searchVal: string, pageVal: number) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/housingsaga/collaborators", {
        params: { page: pageVal, search: searchVal, limit: 20 },
      });
      if (res.data?.success) {
        setCollaborators(Array.isArray(res.data.data) ? res.data.data : []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to load collaborators",
        description: err?.response?.data?.error || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCollaborators(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchCollaborators]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setFormKey((k) => k + 1);
  };

  const handleAddCollaborator = async (values: AddCollaboratorFormValues) => {
    setSaving(true);
    try {
      const res = await axios.post("/api/housingsaga/collaborators", values);

      if (res.data?.success) {
        toast({
          title: "Collaborator added",
          description: `${values.firstName} ${values.lastName} has been added.`,
        });
        handleDialogOpenChange(false);
        setSearch("");
        setPage(1);
        await fetchCollaborators("", 1);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to add collaborator",
        description: err?.response?.data?.error || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await axios.post(
        `/api/housingsaga/collaborators/${resetTarget._id}/reset-password`,
      );
      if (res.data?.success) {
        const nextPassword = String(res.data.issuedPassword || "");
        setCollaborators((prev) =>
          prev.map((item) =>
            item._id === resetTarget._id
              ? { ...item, issuedPassword: nextPassword }
              : item,
          ),
        );
        toast({
          title: "Password reset",
          description: nextPassword
            ? `New password: ${nextPassword}`
            : "Password updated successfully.",
        });
        setResetTarget(null);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err?.response?.data?.error || "Please try again",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Collaborators</h1>
            <p className="text-sm text-muted-foreground">
              {total} Housing Saga collaborator{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => handleDialogOpenChange(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Collaborator
        </Button>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, contact, city…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplies</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>Password</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : collaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No collaborators found
                </TableCell>
              </TableRow>
            ) : (
              collaborators.map((item) => {
                const showPassword = Boolean(visiblePasswords[item._id]);
                const passwordValue = item.issuedPassword || "—";
                return (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.contact}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[item.area, item.city, item.country].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {SUPPLIES_LABELS[item.supplies] || item.supplies}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.sendContractViaEmail ? "default" : "secondary"}>
                        {item.sendContractViaEmail ? "Via email" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm">
                          {showPassword
                            ? passwordValue
                            : passwordValue === "—"
                              ? "—"
                              : "••••••••"}
                        </code>
                        {item.issuedPassword && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [item._id]: !prev[item._id],
                              }))
                            }
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setResetTarget(item)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
          </DialogHeader>
          <AddCollaboratorForm
            key={formKey}
            saving={saving}
            onCancel={() => handleDialogOpenChange(false)}
            onSubmit={handleAddCollaborator}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open && !resetting) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? `Generate a new password for ${resetTarget.name}? Their current session will be signed out.`
                : "Generate a new password for this collaborator?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleResetPassword();
              }}
              disabled={resetting}
            >
              {resetting ? "Resetting…" : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
