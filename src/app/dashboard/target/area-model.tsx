import { Button } from "@/components/ui/button";
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
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Area } from "./page";


export const metroLines = [
  { value: "blue", label: "Blue Line" },
  { value: "red", label: "Red Line" },
  { value: "green", label: "Green Line" },
  { value: "yellow", label: "Yellow Line" },
];

export function AreaModel({
  areaModel,
  setAreaModel,
  areaName,
  areaId,
  getAllTargets,
}: {
  areaModel: boolean;
  setAreaModel: (val: boolean) => void;
  areaName: string;
  areaId: string;
  getAllTargets: () => void;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [newArea, setNewArea] = useState<Area>({
    city: areaName,
    name: "",
    zone: "",
    subUrban: false,
    town: false,
    village: false,
    municipality: false,
    district: false,
    districtOf: "",

    metroZone: "",
    extension: false,
    tram: false,
    subway: false,

    studio: undefined,
    sharedApartment: undefined,
    oneBhk: undefined,
    twoBhk: undefined,
    threeBhk: undefined,

  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newArea.name.trim()) return;

    try {
      setLoading(true);

      await axios.put(`/api/addons/target/updateTarget/${areaId}`, {
        ...newArea,city:areaName
      });

      setAreas((prev) => [...prev, newArea]);
      setAreaModel(false);
      getAllTargets();
    } catch (err) {
      console.error("Failed to add area:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAllArea = async () => {
    try {
      const res = await axios.get(`/api/addons/target/getTargetById/${areaId}`);
      setAreas(res.data.target.area || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (areaId) getAllArea();
  }, [areaId]);

  return (
    <Dialog open={areaModel} onOpenChange={setAreaModel}>
      <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Add Area</DialogTitle>
            <DialogDescription>
              Fill in the detailed information for this area.
            </DialogDescription>
          </DialogHeader>

          {/* Existing Areas */}
          {/* <div className="flex flex-wrap gap-2">
            {areas.length > 0 ? (
              areas.map((area, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-700 rounded-md text-xs text-white"
                >
                  {area.name} • {area.zone}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No areas yet</p>
            )}
          </div> */}

          {/* Area Info */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="area">Area Name</Label>
              <Input
                id="area"
                value={newArea.name}
                onChange={(e) =>
                  setNewArea((prev) => ({ ...prev, name: e.target.value }))
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
                    setNewArea((prev) => ({ ...prev, zone: val }))
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
                    setNewArea((prev) => ({
                      ...prev,
                      metroZone: val,
                    }))
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

          {/* Transportation */}
          <div className="space-y-3">
            <Label>Transportation</Label>
            <div className="grid grid-cols-3 gap-4">
              {/* Metro Extension */}
              <div className="space-y-2">
                <Label>Metro Extension</Label>
                <RadioGroup
                  value={newArea.extension ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      extension: v === "yes",
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

              {/* Tram */}
              <div className="space-y-2">
                <Label>Tram</Label>
                <RadioGroup
                  value={newArea.tram ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      tram: v === "yes",
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
              <div className="">
                {/* Subway */}
                <div className="space-y-2">
                  <Label>Subway</Label>
                  <RadioGroup
                    value={newArea.subway ? "yes" : "no"}
                    onValueChange={(v) =>
                      setNewArea((prev) => ({
                        ...prev,
                        subway: v === "yes",
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
              </div>
              {/* Suburban */}
              <div className="space-y-2">
                <Label>Suburban</Label>
                <RadioGroup
                  value={newArea.subUrban ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({ ...prev, subUrban: v === "yes" }))
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
              {/* Town */}
              <div className="space-y-2">
                <Label>Town</Label>
                <RadioGroup
                  value={newArea.town ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({ ...prev, town: v === "yes" }))
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

              {/* Village */}
              <div className="space-y-2">
                <Label>Village</Label>
                <RadioGroup
                  value={newArea.village ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({ ...prev, village: v === "yes" }))
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

              {/* Municipality */}
              <div className="space-y-2">
                <Label>Municipality</Label>
                <RadioGroup
                  value={newArea.municipality ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      municipality: v === "yes",
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

              <div className="space-y-2">
                <Label>district</Label>
                <RadioGroup
                  value={newArea.district ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      district: v === "yes",
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

              {/* Bus */}
              {newArea.district && (
                <div className="grid gap-2">
                  <Label htmlFor="districtOf">District Of</Label>
                  <Input
                    id="districtOf"
                    value={newArea.districtOf ?? ""}
                    onChange={(e) =>
                      setNewArea((prev) => ({
                        ...prev,
                        districtOf: e.target.value,
                      }))
                    }
                    placeholder="Enter District Of"
                    disabled={loading}
                  />
                </div>
              )}
            </div>
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
                  setNewArea((prev) => ({
                    ...prev,
                    studio: Number(e.target.value),
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Shared Apartment"
                value={newArea.sharedApartment ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
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
                  setNewArea((prev) => ({
                    ...prev,
                    oneBhk: Number(e.target.value),
                  }))
                }
              />
              <Input
                type="number"
                placeholder="2 BHK"
                value={newArea.twoBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    twoBhk: Number(e.target.value),
                  }))
                }
              />
              <Input
                type="number"
                placeholder="3 BHK"
                value={newArea.threeBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    threeBhk: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="mt-6">
            <Button
              onClick={() => setAreaModel(false)}
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
