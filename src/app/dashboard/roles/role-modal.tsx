"use client";

import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const roleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  origin: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export interface RoleRow {
  _id: string;
  role: string;
  department: string;
  isActive: boolean;
  origin: string;
}

interface RoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAllRoles: () => void;
  editRole: RoleRow | null;
  setEditRole: (role: RoleRow | null) => void;
}

export default function RoleModal({
  open,
  onOpenChange,
  getAllRoles,
  editRole,
  setEditRole,
}: RoleModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!editRole;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RoleFormValues & { isActive: boolean }>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: "",
      department: "",
      origin: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    setLoading(false); // Reset so button is not stuck after failed attempts
    if (editRole) {
      setValue("role", editRole.role);
      setValue("department", editRole.department);
      setValue("origin", editRole.origin ?? "");
      setValue("isActive", editRole.isActive ?? true);
    } else {
      reset({
        role: "",
        department: "",
        origin: "",
        isActive: true,
      });
    }
  }, [open, editRole, setValue, reset]);

  const onSubmit = async (data: RoleFormValues & { isActive: boolean }) => {
    const payload = {
      role: data.role.trim(),
      department: data.department.trim(),
      origin: (data.origin || "").trim(),
      isActive: data.isActive === true,
    };

    setLoading(true);
    try {
      if (isEdit && editRole) {
        await axios.put(`/api/addons/roles/updateRole/${editRole._id}`, payload);
        toast({ description: "Role updated successfully" });
      } else {
        await axios.post("/api/addons/roles/addRole", payload);
        toast({ description: "Role created successfully" });
      }
      onOpenChange(false);
      setEditRole(null);
      getAllRoles();
    } catch (error: unknown) {
      const msg =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "An error occurred.";
      toast({ variant: "destructive", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setEditRole(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col justify-center items-center">
        <h2 className="text-lg font-semibold">
          {isEdit ? "Edit Role" : "Add Role"}
        </h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 flex flex-col gap-y-4 w-full"
        >
          <div className="w-full">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              {...register("role")}
              className="w-full"
              placeholder="e.g. LeadGen, Sales"
            />
            {errors.role && (
              <p className="text-red-500 text-xs">{errors.role.message}</p>
            )}
          </div>

          <div className="w-full">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              {...register("department")}
              className="w-full"
              placeholder="e.g. Sales, HR"
            />
            {errors.department && (
              <p className="text-red-500 text-xs">
                {errors.department.message}
              </p>
            )}
          </div>

          <div className="w-full">
            <Label htmlFor="origin">Origin</Label>
            <select
              id="origin"
              {...register("origin")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select origin</option>
              <option value="holidaysera">holidaysera</option>
              <option value="vacationsaga">vacationsaga</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex items-end justify-start">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <InfinityLoader className="w-12 h-8 font-medium" />
              ) : isEdit ? (
                "Update Role"
              ) : (
                "Create Role"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
