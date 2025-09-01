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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Area = {
  name: string;
  zone?: string;
  subUrban?: boolean;
  transportation?: {
    metroZone?: string;
    extension?: boolean;
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
      extension:false,
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
        fourBhk: undefined,
      },
    },
  });

  const metroLines = [
    { value: "blue", label: "Blue Line " },
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
      setNewArea({
        name: "",
        zone: "",
        subUrban: false,
        transportation: {
          metroZone: "",
          extension:false,
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
            fourBhk: undefined,
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
            <div className="grid grid-cols-2 gap-5">
              <div className="grid gap-3">
                <Label htmlFor="zone">Zone</Label>
                <Select
                  value={newArea.zone}
                  onValueChange={(e) =>
                    setNewArea((prev) => ({ ...prev, zone: e }))
                  }
                >
                  <SelectTrigger id="zone">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  Suburban
                </div>

                <RadioGroup
                  value={newArea.subUrban ? "yes" : "no"}
                  // defaultValue={value === undefined ? defaultValue : undefined}
                  onValueChange={(v) => {
                    setNewArea((prev) => ({
                      ...prev,
                      subUrban: v === "yes",
                    }));
                  }}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id={`${name}-yes`} value="yes" />
                    <Label htmlFor={`${name}-yes`}>Yes</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id={`${name}-no`} value="no" />
                    <Label htmlFor={`${name}-no`}>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Transportation */}
            {/* Transportation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Transportation</Label>

                {/* Metro */}
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
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  Metro Extension
                </div>

                <RadioGroup
                  value={newArea.transportation?.extension ? "yes" : "no"}
                  // defaultValue={value === undefined ? defaultValue : undefined}
                  onValueChange={(v) => {
                    setNewArea((prev) => ({
                      ...prev,
                      transportation: {
                        ...prev.transportation,
                        extension: v === "yes",
                      },
                    }));
                  }}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id={`${name}-yes`} value="yes" />
                    <Label htmlFor={`${name}-yes`}>Yes</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id={`${name}-no`} value="no" />
                    <Label htmlFor={`${name}-no`}>No</Label>
                  </div>
                </RadioGroup>
              </div>

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
