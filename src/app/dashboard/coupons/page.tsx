"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Ticket,
  Percent,
  Euro,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  applicablePlans?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CouponFormData {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  applicablePlans: string;
  isActive: boolean;
}

const initialFormData: CouponFormData = {
  code: "",
  discountType: "percentage",
  discountValue: 0,
  minPurchaseAmount: 0,
  maxDiscountAmount: 0,
  validFrom: "",
  validUntil: "",
  usageLimit: 0,
  applicablePlans: "",
  isActive: true,
};

export default function CouponManagementPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        currentPage: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        status: statusFilter,
      });

      const response = await fetch(`/api/coupon?${params}`);
      const data = await response.json();

      if (data.success) {
        setCoupons(data.coupons);
        setTotalPages(data.totalPages);
        setTotalCoupons(data.totalCoupons);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch coupons",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCoupons();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        applicablePlans: formData.applicablePlans
          ? formData.applicablePlans.split(",").map((p) => p.trim())
          : [],
        usageLimit: formData.usageLimit || null,
        maxDiscountAmount: formData.maxDiscountAmount || null,
      };

      const url = isEditMode
        ? `/api/coupon/${editingCouponId}`
        : "/api/coupon";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: isEditMode
            ? "Coupon updated successfully"
            : "Coupon created successfully",
        });
        setIsDialogOpen(false);
        setFormData(initialFormData);
        setIsEditMode(false);
        setEditingCouponId(null);
        fetchCoupons();
      } else {
        toast({
          title: "Error",
          description: data.message || "Operation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchaseAmount: coupon.minPurchaseAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      validFrom: coupon.validFrom.split("T")[0],
      validUntil: coupon.validUntil.split("T")[0],
      usageLimit: coupon.usageLimit || 0,
      applicablePlans: coupon.applicablePlans?.join(", ") || "",
      isActive: coupon.isActive,
    });
    setEditingCouponId(coupon._id);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    try {
      const response = await fetch(`/api/coupon/${couponToDelete}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Coupon deleted successfully",
        });
        fetchCoupons();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete coupon",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/coupon/${couponId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Coupon ${!currentStatus ? "activated" : "deactivated"} successfully`,
        });
        fetchCoupons();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update coupon status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Coupon code "${code}" copied to clipboard`,
    });
  };

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (!coupon.isActive) {
      return { status: "inactive", label: "Inactive", color: "bg-gray-500" };
    }
    if (now < validFrom) {
      return { status: "scheduled", label: "Scheduled", color: "bg-blue-500" };
    }
    if (now > validUntil) {
      return { status: "expired", label: "Expired", color: "bg-red-500" };
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { status: "exhausted", label: "Exhausted", color: "bg-orange-500" };
    }
    return { status: "active", label: "Active", color: "bg-green-500" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setIsEditMode(false);
    setEditingCouponId(null);
  };

  // Stats
  const activeCoupons = coupons.filter(
    (c) => getCouponStatus(c).status === "active"
  ).length;
  const expiredCoupons = coupons.filter(
    (c) => getCouponStatus(c).status === "expired"
  ).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Coupon Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage discount coupons
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Coupon" : "Create New Coupon"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update the coupon details below"
                  : "Fill in the details to create a new coupon"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., SUMMER20"
                    className="uppercase"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData((prev) => ({ ...prev, discountType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Discount Value *{" "}
                    {formData.discountType === "percentage" ? "(%)" : "(€)"}
                  </Label>
                  <Input
                    id="discountValue"
                    name="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === "percentage" ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minPurchaseAmount">
                    Minimum Purchase Amount (€)
                  </Label>
                  <Input
                    id="minPurchaseAmount"
                    name="minPurchaseAmount"
                    type="number"
                    min="0"
                    value={formData.minPurchaseAmount}
                    onChange={handleInputChange}
                  />
                </div>
                {formData.discountType === "percentage" && (
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscountAmount">
                      Max Discount Amount (€)
                    </Label>
                    <Input
                      id="maxDiscountAmount"
                      name="maxDiscountAmount"
                      type="number"
                      min="0"
                      value={formData.maxDiscountAmount}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From *</Label>
                  <Input
                    id="validFrom"
                    name="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input
                    id="validUntil"
                    name="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Usage Limit (0 = unlimited)</Label>
                  <Input
                    id="usageLimit"
                    name="usageLimit"
                    type="number"
                    min="0"
                    value={formData.usageLimit}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="applicablePlans">
                    Applicable Plans (comma-separated, leave empty for all)
                  </Label>
                  <Input
                    id="applicablePlans"
                    name="applicablePlans"
                    value={formData.applicablePlans}
                    onChange={handleInputChange}
                    placeholder="e.g., plan1, plan2, plan3"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : isEditMode ? (
                    "Update Coupon"
                  ) : (
                    "Create Coupon"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalCoupons}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{activeCoupons}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{expiredCoupons}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalUsage}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by coupon code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>
            Manage your discount coupons here
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No coupons found. Create your first coupon to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <TableRow key={coupon._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {coupon.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(coupon.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {coupon.discountType === "percentage" ? (
                              <>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.discountValue}%</span>
                              </>
                            ) : (
                              <>
                                <Euro className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.discountValue}</span>
                              </>
                            )}
                            {coupon.maxDiscountAmount && (
                              <span className="text-xs text-muted-foreground">
                                (max €{coupon.maxDiscountAmount})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(coupon.validFrom)}
                            </span>
                            <span className="text-muted-foreground">to</span>
                            <span>{formatDate(coupon.validUntil)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {coupon.usedCount}
                              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${status.color} text-white hover:${status.color}`}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={() =>
                              toggleCouponStatus(coupon._id, coupon.isActive)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(coupon)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => {
                                setCouponToDelete(coupon._id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this coupon? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCouponToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
