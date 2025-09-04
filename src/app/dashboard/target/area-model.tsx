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

type Area = {
  name: string;
  zone?: string;
  subUrban?: boolean;
  transportation?: {
    metroZone?: string;
    extension?: boolean;
    tram?: boolean;
    subway?: boolean;
    bus?: string;
  };
  price?: {
    studio?: number;
    sharedSpot?: number;
    sharedRoom?: number;
    apartment?: {
      oneBhk?: number;
      twoBhk?: number;
      threeBhk?: number;
      fourBhk?: number;
    };
  };
};

export function AreaModel({
  areaModel,
  setAreaModel,
  areaId,
}: {
  areaModel: boolean;
  setAreaModel: (val: boolean) => void;
  areaId: string;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [newArea, setNewArea] = useState<Area>({
    name: "",
    zone: "",
    subUrban: false,
    transportation: {
      metroZone: "",
      extension: false,
      tram: false,
      subway: false,
      bus: "",
    },
    price: {
      studio: undefined,
      sharedSpot: undefined,
      sharedRoom: undefined,
      apartment: {
        oneBhk: undefined,
        twoBhk: undefined,
        threeBhk: undefined,
        fourBhk: undefined,
      },
    },
  });

  const metroLines = [
    { value: "blue", label: "Blue Line" },
    { value: "red", label: "Red Line" },
    { value: "green", label: "Green Line" },
    { value: "yellow", label: "Yellow Line" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newArea.name.trim()) return;

    try {
      setLoading(true);

      await axios.put(`/api/addons/target/updateTarget/${areaId}`, {
        area: newArea,
      });

      setAreas((prev) => [...prev, newArea]);
      setAreaModel(false);
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
          <div className="flex flex-wrap gap-2">
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
          </div>

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
                    <SelectItem value="Central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>
          </div>

          {/* Transportation */}
          <div className="space-y-3">
            <Label>Transportation</Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Metro Zone */}
              <Select
                value={newArea.transportation?.metroZone}
                onValueChange={(val) =>
                  setNewArea((prev) => ({
                    ...prev,
                    transportation: {
                      ...prev.transportation,
                      metroZone: val,
                    },
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

              {/* Metro Extension */}
              <div className="space-y-2">
                <Label>Metro Extension</Label>
                <RadioGroup
                  value={newArea.transportation?.extension ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        extension: v === "yes",
                      },
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
                  value={newArea.transportation?.tram ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        tram: v === "yes",
                      },
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

              {/* Subway */}
              <div className="space-y-2">
                <Label>Subway</Label>
                <RadioGroup
                  value={newArea.transportation?.subway ? "yes" : "no"}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        subway: v === "yes",
                      },
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
              <div className="grid gap-2">
                <Label htmlFor="bus">Bus</Label>
                <Input
                  id="bus"
                  value={newArea.transportation?.bus ?? ""}
                  onChange={(e) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        bus: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter Bus Route (e.g. Bus 24B)"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="space-y-3">
            <Label>Price</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Studio"
                value={newArea.price?.studio ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: { ...prev.price, studio: Number(e.target.value) },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Shared Spot"
                value={newArea.price?.sharedSpot ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      sharedSpot: Number(e.target.value),
                    },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Shared Room"
                value={newArea.price?.sharedRoom ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      sharedRoom: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>

            <Label className="mt-2">Apartment</Label>
            <div className="grid grid-cols-4 gap-3">
              <Input
                type="number"
                placeholder="1 BHK"
                value={newArea.price?.apartment?.oneBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      apartment: {
                        ...prev.price?.apartment,
                        oneBhk: Number(e.target.value),
                      },
                    },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="2 BHK"
                value={newArea.price?.apartment?.twoBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      apartment: {
                        ...prev.price?.apartment,
                        twoBhk: Number(e.target.value),
                      },
                    },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="3 BHK"
                value={newArea.price?.apartment?.threeBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      apartment: {
                        ...prev.price?.apartment,
                        threeBhk: Number(e.target.value),
                      },
                    },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="4 BHK"
                value={newArea.price?.apartment?.fourBhk ?? ""}
                onChange={(e) =>
                  setNewArea((prev) => ({
                    ...prev,
                    price: {
                      ...prev.price,
                      apartment: {
                        ...prev.price?.apartment,
                        fourBhk: Number(e.target.value),
                      },
                    },
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
