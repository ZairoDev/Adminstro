"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { useToast } from "@/hooks/use-toast";

interface TargetEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetData: {
    _id: string;
    country: string;
    city: string;
    state: string;
    sales: number;
    visits: number;
    leads: number;
  };
  getAllTargets: Function;
}

export const TargetEditModal = ({
  open,
  onOpenChange,
  targetData,
  getAllTargets,
}: TargetEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    country: "",
    city: "",
    state: "",
    sales: "",
    visits: "",
    leads: "",
  });

  // Update form data when modal opens or targetData changes
  useEffect(() => {
    if (targetData) {
      setFormData({
        country: targetData.country || "",
        city: targetData.city || "",
        state: targetData.state || "",
        sales: targetData.sales?.toString() || "",
        visits: targetData.visits?.toString() || "",
        leads: targetData.leads?.toString() || "",
      });
    }
  }, [targetData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      await axios.put(`/api/addons/target/updateTarget/${targetData._id}`, {
        ...formData,
        sales: Number(formData.sales),
        visits: Number(formData.visits),
        leads: Number(formData.leads),
      });
      toast({ title: "Target updated successfully" });
      onOpenChange(false);
      // if (onUpdated) onUpdated();
      getAllTargets();  
    } catch (err) {
      console.error(err);
      toast({ title: "Unable to update target", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-6 w-full max-w-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: "Country",
                name: "country",
                placeholder: "Enter Country's Name",
              },
              { label: "City", name: "city", placeholder: "Enter City's Name" },
              {
                label: "State",
                name: "state",
                placeholder: "Enter State's Name",
              },
              {
                label: "Sales Target",
                name: "sales",
                placeholder: "Enter Target Value",
              },
              {
                label: "Visits Target",
                name: "visits",
                placeholder: "Enter Target Value",
              },
              {
                label: "Leads Target",
                name: "leads",
                placeholder: "Enter Target Value",
              },
            ].map(({ label, name, placeholder }) => (
              <div className="w-full" key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  name={name}
                  placeholder={placeholder}
                  value={formData[name as keyof typeof formData]}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" className="w-full md:w-auto">
              {loading ? (
                <InfinityLoader className="w-12 h-8" />
              ) : (
                "Update Target"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
