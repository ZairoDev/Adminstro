import { Area } from "../page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axios from "axios";

export const metroLines = [
  { value: "blue", label: "Blue Line" },
  { value: "red", label: "Red Line" },
  { value: "green", label: "Green Line" },
  { value: "yellow", label: "Yellow Line" },
];

export function EditArea({
  open,
  setOpen,
  areaData,
  getAllTargets
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  areaData: Area;
  getAllTargets: () => void
}) {
  const [loading, setLoading] = useState(false);

  // default structure to avoid undefined reads
  const defaultArea = {
    city: areaData?.city ?? "",
    name: areaData?.name ?? "",
    zone: areaData?.zone ?? "",
    subUrban: areaData?.subUrban ?? false,
    town: areaData?.town ?? false,
    village: areaData?.village ?? false,
    municipality: areaData?.municipality ?? false,
    // transportation
    metroZone: areaData?.metroZone ?? "",
    extension: areaData?.extension ?? false,
    tram: areaData?.tram ?? false,
    subway: areaData?.subway ?? false,
    // price
    studio: areaData?.studio ?? undefined,
    sharedApartment: areaData?.sharedApartment ?? undefined,
    oneBhk: areaData?.oneBhk ?? undefined,
    twoBhk: areaData?.twoBhk ?? undefined,
    threeBhk: areaData?.threeBhk ?? undefined,
    // district
    district: (areaData as any)?.district ?? false,
    districtOf: (areaData as any)?.districtOf ?? "",
  } as Area & { district?: boolean; districtOf?: string };

  const [newArea, setNewArea] = useState<typeof defaultArea>(defaultArea);

  useEffect(() => {
    // reset state whenever modal opens with different areaData
    setNewArea({
      city: areaData?.city ?? "",
      name: areaData?.name ?? "",
      zone: areaData?.zone ?? "",
      subUrban: areaData?.subUrban ?? false,
      town: areaData?.town ?? false,
      village: areaData?.village ?? false,
      municipality: areaData?.municipality ?? false,
      metroZone: areaData?.metroZone ?? "",
      extension: areaData?.extension ?? false,
      tram: areaData?.tram ?? false,
      subway: areaData?.subway ?? false,
      studio: areaData?.studio ?? undefined,
      sharedApartment: areaData?.sharedApartment ?? undefined,
      oneBhk: areaData?.oneBhk ?? undefined,
      twoBhk: areaData?.twoBhk ?? undefined,
      threeBhk: areaData?.threeBhk ?? undefined,
      district: (areaData as any)?.district ?? false,
      districtOf: (areaData as any)?.districtOf ?? "",
    });
  }, [areaData, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);

      // include cityId explicitly (matches AreaModel pattern)
      await axios.put(`/api/addons/target/updateArea/${areaData._id}`, {
        area: { ...newArea},
      });

      setOpen(false);
      getAllTargets();  
    } catch (err) {
      console.error("Failed to update area:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Edit Area</DialogTitle>
            <DialogDescription>
              Update the information for this area.
            </DialogDescription>
          </DialogHeader>

          {/* Area Info */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Area Name</Label>
              <Input
                id="name"
                value={newArea.name}
                onChange={(e) =>
                  setNewArea((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Enter area name"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="zone">Zone</Label>
                <Select
                  value={newArea.zone}
                  onValueChange={(val) =>
                    setNewArea((p) => ({ ...p, zone: val }))
                  }
                >
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="North-East">North-East</SelectItem>
                    <SelectItem value="North-West">North-West</SelectItem>
                    <SelectItem value="South-East">South-East</SelectItem>
                    <SelectItem value="South-West">South-West</SelectItem>
                    <SelectItem value="Center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Metro Zone */}
              <div className="grid gap-2">
                <Label htmlFor="metroZone">Metro Zone</Label>
                <Select
                  value={newArea.metroZone}
                  onValueChange={(val) =>
                    setNewArea((p) => ({ ...p, metroZone: val }))
                  }
                >
                  <SelectTrigger disabled={loading}>
                    <SelectValue placeholder="Select Metro Line" />
                  </SelectTrigger>
                  <SelectContent>
                    {metroLines.map((line) => (
                      <SelectItem key={line.value} value={line.label}>
                        {line.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Transportation + Locality */}
          <div className="space-y-3">
            <Label>Details</Label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "extension", label: "Metro Extension" },
                { key: "tram", label: "Tram" },
                { key: "subway", label: "Subway" },
                { key: "subUrban", label: "Suburban" },
                { key: "town", label: "Town" },
                { key: "village", label: "Village" },
                { key: "municipality", label: "Municipality" },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <RadioGroup
                    value={
                      newArea[field.key as keyof typeof newArea] ? "yes" : "no"
                    }
                    onValueChange={(v) =>
                      setNewArea((prev) => ({
                        ...prev,
                        [field.key]: v === "yes",
                      }))
                    }
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" />
                      <Label>No</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}

              {/* District (with conditional District Of field) */}
              <div className="space-y-2">
                <Label>District</Label>
                <RadioGroup
                  value={newArea.district ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((p) => ({ ...p, district: v === "yes" }))
                  }
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" />
                    <Label>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" />
                    <Label>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* District Of input - visible only when district is true */}
            {newArea.district && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="districtOf">District Of</Label>
                <Input
                  id="districtOf"
                  value={(newArea as any).districtOf ?? ""}
                  onChange={(e) =>
                    setNewArea((p) => ({ ...p, districtOf: e.target.value }))
                  }
                  placeholder="Enter District Of"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="space-y-3">
            <Label>Price</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Studio"
                value={newArea.studio ?? ""}
                onChange={(e) =>
                  setNewArea((p) => ({ ...p, studio: Number(e.target.value) }))
                }
              />
              <Input
                type="number"
                placeholder="Shared Apartment"
                value={newArea.sharedApartment ?? ""}
                onChange={(e) =>
                  setNewArea((p) => ({
                    ...p,
                    sharedApartment: Number(e.target.value),
                  }))
                }
              />
            </div>

            <Label className="mt-2">Apartment</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                placeholder="1 BHK"
                value={newArea.oneBhk ?? ""}
                onChange={(e) =>
                  setNewArea((p) => ({ ...p, oneBhk: Number(e.target.value) }))
                }
              />
              <Input
                type="number"
                placeholder="2 BHK"
                value={newArea.twoBhk ?? ""}
                onChange={(e) =>
                  setNewArea((p) => ({ ...p, twoBhk: Number(e.target.value) }))
                }
              />
              <Input
                type="number"
                placeholder="3 BHK"
                value={newArea.threeBhk ?? ""}
                onChange={(e) =>
                  setNewArea((p) => ({
                    ...p,
                    threeBhk: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="mt-6">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
