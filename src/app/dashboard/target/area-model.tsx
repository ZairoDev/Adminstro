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
import { Checkbox } from "@/components/ui/checkbox";

type Area = {
  name: string;
  zone?: string;
  transportation?: {
    metroZone?: string;
    tram?: string;
    subway?: string;
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
    transportation: {
      metroZone: "",
      tram: "",
      subway: "",
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
      },
    },
  });

  const metroLines = [
    { value: "blue", label: "Blue Line (M3)" },
    { value: "red", label: "Red Line (M2)" },
    { value: "green", label: "Green Line (M1)" },
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
      setNewArea({
        name: "",
        zone: "",
        transportation: {
          metroZone: "",
          tram: "",
          subway: "",
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
          },
        },
      });
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Area</DialogTitle>
            <DialogDescription>
              Add detailed information for this area.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Existing areas */}
            <div className="flex w-full flex-wrap gap-2">
              {areas.length > 0 ? (
                areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 rounded-md text-sm"
                  >
                    {area.name} • {area.zone}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No areas yet</p>
              )}
            </div>

            {/* Name */}
            <div className="grid gap-3">
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

            {/* Zone */}
            <div className="grid gap-3">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                value={newArea.zone}
                onChange={(e) =>
                  setNewArea((prev) => ({ ...prev, zone: e.target.value }))
                }
                placeholder="Enter zone"
                disabled={loading}
              />
            </div>

            {/* Transportation */}
            {/* Transportation */}
            <div className="grid gap-3">
              <Label>Transportation</Label>

              {/* Metro */}
              <Select
                value={newArea.transportation?.metroZone}
                onValueChange={(val) =>
                  setNewArea((prev) => ({
                    ...prev,
                    transportation: { ...prev.transportation, metroZone: val },
                  }))
                }
              >
                <SelectTrigger className="w-full" disabled={loading}>
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

              {/* Tram */}
              <div className="grid gap-2 mt-2">
                <Label htmlFor="tram">Tram</Label>
                <Input
                  id="tram"
                  value={newArea.transportation?.tram ?? ""}
                  onChange={(e) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        tram: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter Tram Line (e.g. Tram 5)"
                  disabled={loading}
                />
              </div>

              {/* Subway */}
              <div className="grid gap-2">
                <Label htmlFor="subway">Subway</Label>
                <Input
                  id="subway"
                  value={newArea.transportation?.subway ?? ""}
                  onChange={(e) =>
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        subway: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter Subway Line (e.g. Line 2)"
                  disabled={loading}
                />
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

            {/* Price Section */}
            <div className="grid gap-3">
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
              <div className="grid grid-cols-3 gap-3">
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
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
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
