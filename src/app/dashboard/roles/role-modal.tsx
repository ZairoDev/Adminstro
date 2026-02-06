import axios from "axios";
import { useForm } from "react-hook-form";
import React, { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const roleSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  isActive: z.boolean().default(true),
});

type RoleValidationSchema = z.infer<typeof roleSchema>;

interface RoleData {
  _id: string;
  roleName: string;
  isActive: boolean;
}

interface PageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAllRoles?: () => void;
  editRole?: RoleData | null;
}

const RoleModal = ({ open, onOpenChange, getAllRoles, editRole }: PageProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!editRole;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RoleValidationSchema>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      roleName: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  // Reset form when editRole changes
  useEffect(() => {
    if (editRole) {
      setValue("roleName", editRole.roleName);
      setValue("isActive", editRole.isActive);
    } else {
      reset({
        roleName: "",
        isActive: true,
      });
    }
  }, [editRole, setValue, reset]);

  const onSubmit = async (data: RoleValidationSchema) => {
    setLoading(true);
    const roleData = {
      roleName: data.roleName,
      isActive: data.isActive,
    };

    try {
      if (isEditMode && editRole) {
        // Update existing role
        await axios.patch("/api/addons/roles/updateRoleById", {
          roleId: editRole._id,
          ...roleData,
        });
        toast({
          description: "Role updated successfully",
        });
      } else {
        // Create new role
        await axios.post("/api/addons/roles/addRole", roleData);
        toast({
          description: "Role created successfully",
        });
      }
      reset();
      onOpenChange(false);
      getAllRoles?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || "An error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col justify-center items-center">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Role" : "Add Role"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-y-4 w-full"
        >
          <div className="w-full">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              {...register("roleName")}
              className="w-full"
              placeholder="Enter role name"
            />
            {errors.roleName && (
              <p className="text-red-500 text-xs">{errors.roleName.message}</p>
            )}
          </div>

          <div className="w-full flex items-center justify-between">
            <Label htmlFor="isActive">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isActive ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
            </div>
          </div>

          <div className="flex items-end justify-start">
            <Button type="submit" className="w-full">
              {loading ? (
                <InfinityLoader className="w-12 h-8 font-medium" />
              ) : (
                isEditMode ? "Update Role" : "Create Role"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleModal;
