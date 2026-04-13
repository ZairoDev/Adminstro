"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Search, Plus, Edit, Trash2 } from "lucide-react";

import {
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectGroup,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AliasInterface } from "@/util/type";
import { ORGANIZATIONS } from "@/util/organizationConstants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useAddAliases } from "@/hooks/alias/useAddAliases";
import { useEmployees } from "@/hooks/employee/useEmployees";
import { useFetchAliases } from "@/hooks/alias/useFetchAliases";
import { useDeleteAliases } from "@/hooks/alias/useDeleteAliases";
import { useEditAliases } from "@/hooks/alias/useEditAliases";
import { useAuthStore } from "@/AuthStore";

type AliasFormValues = {
  aliasName: string;
  aliasEmail: string;
  aliasEmailPassword: string;
  employeeId: string;
  organization: "VacationSaga" | "Holidaysera" | "HousingSaga";
  status: "Active" | "Inactive";
};

const INITIAL_FORM_VALUES: AliasFormValues = {
  aliasName: "",
  aliasEmail: "",
  aliasEmailPassword: "",
  employeeId: "",
  organization: "VacationSaga",
  status: "Active",
};

export default function AliasManagement() {
  const token = useAuthStore((s) => s.token);
  const currentUserRole = token?.role || null;
  // Fetching all aliases
  const { aliases, setAliases, error, isPending } = useFetchAliases();
  // Fetching all employees
  const { employees } = useEmployees();
  // Fetching add alias function
  const { addAlias, isPending: addAliasPending } = useAddAliases();
  const { editAlias, isPending: editAliasPending } = useEditAliases();
  const { deleteAlias, isPending: deleteAliasPending } = useDeleteAliases();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "All">("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState<AliasInterface | null>(null);

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AliasFormValues>({ defaultValues: INITIAL_FORM_VALUES });

  const selectedOrganization = watch("organization");
  const selectedEmployeeId = watch("employeeId");
  const selectedStatus = watch("status");

  // Helper functions
  const getAgentName = (agentId: string): string => {
    const agent = employees.find((a) => a._id === agentId);
    return agent ? agent.name : "Unknown Agent";
  };

  const visibleEmployees =
    currentUserRole === "HAdmin"
      ? employees.filter((employee) => employee.organization === "Holidaysera")
      : employees;

  // const getAgentEmail = (aliasEmail: string): string => {
  //   const agent = employees.find((a) => a.email === aliasEmail);
  //   return agent ? agent.email : "";
  // };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filtered aliases
  const filteredAliases = aliases.filter((alias) => {
    const matchesSearch =
      alias.aliasEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alias.aliasName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(alias.assignedTo).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || alias.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Modal handlers
  const openCreateModal = () => {
    setCurrentAlias(null);
    reset(INITIAL_FORM_VALUES);
    setIsModalOpen(true);
  };

  const openEditModal = (alias: AliasInterface) => {
    setCurrentAlias(alias);
    reset({
      aliasName: alias.aliasName,
      aliasEmail: alias.aliasEmail,
      aliasEmailPassword: alias.aliasEmailPassword,
      employeeId: String(alias.assignedTo ?? ""),
      organization: (alias.organization || "VacationSaga") as AliasFormValues["organization"],
      status: alias.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentAlias(null);
    reset(INITIAL_FORM_VALUES);
  };

  // Form submission
  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: AliasInterface = {
        aliasName: data.aliasName,
        aliasEmail: data.aliasEmail,
        aliasEmailPassword: data.aliasEmailPassword,
        status: data.status,
        assignedTo: data.employeeId,
        organization: data.organization,
        createdAt: new Date(),
      };
      if (currentAlias) {
        // Update existing alias
        await editAlias(payload, currentAlias.aliasEmail);
        setAliases((prev) =>
          prev.map((alias) =>
            alias.aliasEmail === currentAlias.aliasEmail
              ? {
                  ...alias,
                  aliasName: data.aliasName,
                  aliasEmail: data.aliasEmail,
                  aliasEmailPassword: data.aliasEmailPassword,
                  status: data.status,
                  organization: data.organization,
                  assignedTo: data.employeeId,
                }
              : alias
          )
        );
        toast({
          title: "Alias updated",
          description: `${data.aliasEmail} has been updated successfully.`,
        });
      } else {
        // Create new alias
        await addAlias(payload);
        setAliases((prev) => [...prev, payload]);
        toast({
          title: "Alias created",
          description: `${data.aliasEmail} has been created successfully.`,
        });
      }

      closeModal();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete alias
  const handleDeleteAlias = async (aliasEmail: string) => {
    if (confirm("Are you sure you want to delete this alias?")) {
      try {
        await deleteAlias(aliasEmail);
        setAliases((prev) => prev.filter((alias) => alias.aliasEmail !== aliasEmail));
        toast({
          title: "Alias deleted",
          description: "The alias has been deleted successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred while deleting the alias.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Alias Management</h1>
        <Button onClick={openCreateModal} className="flex items-center">
          <Plus className="mr-2 h-4 w-4" /> Add New Alias
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by alias or agent..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as "Active" | "Inactive" | "All")}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status">Filter By Status</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-500">Failed to load aliases. Please refresh the page.</p>
      ) : null}
      {isPending ? (
        <p className="mb-4 text-sm text-muted-foreground">Loading aliases...</p>
      ) : null}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alias Name</TableHead>
              <TableHead>Alias Email</TableHead>
              <TableHead>Assigned Agent</TableHead>
              {["SuperAdmin", "HR"].includes(String(currentUserRole)) && (
                <TableHead>Organization</TableHead>
              )}
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAliases.length > 0 ? (
              filteredAliases.map((alias, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{alias.aliasName}</TableCell>
                  <TableCell className="font-medium">{alias.aliasEmail}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{getAgentName(String(alias.assignedTo))}</div>
                      <div className="text-sm text-muted-foreground">{String(alias.assignedTo)}</div>
                    </div>
                  </TableCell>
                  {["SuperAdmin", "HR"].includes(String(currentUserRole)) && (
                    <TableCell>
                      <Badge variant="secondary">{alias.organization || "VacationSaga"}</Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={alias.status === "Active" ? "default" : "secondary"}>
                      {alias.status === "Active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(alias.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(alias)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAlias(alias.aliasEmail)}
                        disabled={deleteAliasPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={["SuperAdmin", "HR"].includes(String(currentUserRole)) ? 7 : 6}
                  className="text-center py-6 text-muted-foreground"
                >
                  No aliases found. Try adjusting your search or filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            closeModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentAlias ? "Edit Alias" : "Create New Alias"}</DialogTitle>
          </DialogHeader>
          {/* <DialogDescription>Create your own Alias</DialogDescription> */}
          <form onSubmit={onSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="aliasName">Alias Name</Label>
                <Input
                  id="aliasName"
                  placeholder="John Doe"
                  {...register("aliasName", {
                    required: "Name is required",
                  })}
                />
                {errors.aliasName && (
                  <p className="text-sm text-red-500">{errors.aliasName.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Alias Email</Label>
                <Input
                  id="email"
                  placeholder="alias@example.com"
                  {...register("aliasEmail", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.aliasEmail && (
                  <p className="text-sm text-red-500">{errors.aliasEmail.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Alias Email Password</Label>
                <Input
                  id="emailPassword"
                  placeholder="Enter password"
                  {...register("aliasEmailPassword", {
                    required: "Passowrd is required",
                  })}
                />
                {errors.aliasEmailPassword && (
                  <p className="text-sm text-red-500">
                    {errors.aliasEmailPassword.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="organization">Organization</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("organization", value as AliasFormValues["organization"])
                  }
                  value={selectedOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATIONS.map((org) => (
                      <SelectItem key={org} value={org}>
                        {org}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  {...register("organization", { required: "Organization is required" })}
                />
                {errors.organization && (
                  <p className="text-sm text-red-500">{errors.organization.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="agent">Assign to Employee</Label>
                <Select onValueChange={(value) => setValue("employeeId", value)} value={selectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleEmployees.map((agent) => (
                      <SelectItem key={agent._id} value={agent._id}>
                        {agent.name} ({agent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("employeeId", { required: "Employee is required" })} />
                {errors.employeeId && (
                  <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("status", value as "Active" | "Inactive")
                  }
                  value={selectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  {...register("status", { required: "Status is required" })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={addAliasPending || editAliasPending}>
                {addAliasPending || editAliasPending
                  ? "Saving..."
                  : currentAlias
                  ? "Save Changes"
                  : "Create Alias"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
