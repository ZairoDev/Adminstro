"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Area = { name: string; metrolane?: string; zone?: string };

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
    area: Area[];
  };
  getAllTargets: () => void;
}

const METRO_LINES = ["Blue Line (M3)", "Red Line (M2)", "Green Line (M1)"];

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

  // area editing state
  const [selectedAreaOldName, setSelectedAreaOldName] = useState<string>("");
  const [areaEdit, setAreaEdit] = useState<Area>({
    name: "",
    metrolane: "",
    zone: "",
  });

  // hydrate form + reset area edit
  useEffect(() => {
    if (!targetData) return;
    setFormData({
      country: targetData.country || "",
      city: targetData.city || "",
      state: targetData.state || "",
      sales: targetData.sales?.toString() || "",
      visits: targetData.visits?.toString() || "",
      leads: targetData.leads?.toString() || "",
    });
    setSelectedAreaOldName("");
    setAreaEdit({ name: "", metrolane: "", zone: "" });
  }, [targetData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload: any = {
        ...formData,
        sales: Number(formData.sales || 0),
        visits: Number(formData.visits || 0),
        leads: Number(formData.leads || 0),
      };

      // only send areaUpdate when a specific area was selected
      if (selectedAreaOldName) {
        payload.areaUpdate = {
          oldName: selectedAreaOldName, // what to match on
          name: areaEdit.name?.trim(), // new values
          metrolane: areaEdit.metrolane?.trim() || "",
          zone: areaEdit.zone?.trim() || "",
        };
      }

      await axios.put(
        `/api/addons/target/updateTarget/${targetData._id}`,
        payload
      );

      toast({ title: "Target updated successfully" });
      onOpenChange(false);
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
                placeholder: "Enter Country",
              },
              { label: "City", name: "city", placeholder: "Enter City" },
              { label: "State", name: "state", placeholder: "Enter State" },
              {
                label: "Sales Target",
                name: "sales",
                placeholder: "Enter Sales",
              },
              {
                label: "Visits Target",
                name: "visits",
                placeholder: "Enter Visits",
              },
              {
                label: "Leads Target",
                name: "leads",
                placeholder: "Enter Leads",
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
                />
              </div>
            ))}

            {/* select area to edit */}
            <div className="w-full">
              <Label htmlFor="areaSelect">Select Area to Edit</Label>
              <Select
                value={selectedAreaOldName}
                onValueChange={(val) => {
                  setSelectedAreaOldName(val);
                  const found = targetData.area.find((a) => a.name === val);
                  setAreaEdit(
                    found ? { ...found } : { name: "", metrolane: "", zone: "" }
                  );
                }}
                disabled={loading}
              >
                <SelectTrigger id="areaSelect" className="w-full">
                  <SelectValue placeholder="Pick an area" />
                </SelectTrigger>
                <SelectContent>
                  {targetData.area.map((a) => (
                    <SelectItem key={a.name} value={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* show editable fields when an area is selected */}
            {selectedAreaOldName && (
              <>
                <div className="w-full">
                  <Label htmlFor="areaName">Area Name</Label>
                  <Input
                    id="areaName"
                    value={areaEdit.name}
                    onChange={(e) =>
                      setAreaEdit((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Enter area name"
                    disabled={loading}
                  />
                </div>

                <div className="w-full">
                  <Label htmlFor="metrolane">Metrolane</Label>
                  <Select
                    value={areaEdit.metrolane || ""}
                    onValueChange={(val) =>
                      setAreaEdit((p) => ({ ...p, metrolane: val }))
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="metrolane" className="w-full">
                      <SelectValue placeholder="Select Metro Line" />
                    </SelectTrigger>
                    <SelectContent>
                      {METRO_LINES.map((line) => (
                        <SelectItem key={line} value={line}>
                          {line}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full">
                  <Label htmlFor="zone">Zone</Label>
                  <Input
                    id="zone"
                    value={areaEdit.zone || ""}
                    onChange={(e) =>
                      setAreaEdit((p) => ({ ...p, zone: e.target.value }))
                    }
                    placeholder="Enter zone"
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={loading}
            >
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
