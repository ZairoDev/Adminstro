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

type Area = {
  name: string;
  metrolane?: string;
  zone?: string;
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
    metrolane: "",
    zone: "",
  });

  const metroLines = [
    { value: "blue", label: "Blue Line (M3)" },
    { value: "red", label: "Red Line (M2)" },
    { value: "green", label: "Green Line (M1)" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newArea.name.trim()) return; // prevent empty name

    try {
      setLoading(true);

      await axios.put(`/api/addons/target/updateTarget/${areaId}`, {
        area: newArea, // 👈 send as object
      });

      // Optimistic UI update
      setAreas((prev) => [...prev, newArea]);
      setNewArea({ name: "", metrolane: "", zone: "" }); // reset input
      setAreaModel(false); // close modal
    } catch (err) {
      console.error("Failed to add area:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAllArea = async () => {
    try {
      const res = await axios.get(`/api/addons/target/getTargetById/${areaId}`);
      setAreas(res.data.target.area || []); // backend should return array of objects
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (areaId) getAllArea();
  }, [areaId]);

  return (
    <Dialog open={areaModel} onOpenChange={setAreaModel}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Locations</DialogTitle>
            <DialogDescription>
              Add new locations for this target.
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
                    {area.name} {area.metrolane ? `• ${area.metrolane}` : ""}{" "}
                    {area.zone ? `• ${area.zone}` : ""}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No areas yet</p>
              )}
            </div>

            {/* Location Name */}
            <div className="grid gap-3">
              <Label htmlFor="area">Location Name</Label>
              <Input
                id="area"
                value={newArea.name}
                onChange={(e) =>
                  setNewArea((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter location"
                disabled={loading}
              />
            </div>

            {/* Metro Line */}
            <div className="grid gap-3">
              <Label htmlFor="metroLane">Metro Line</Label>
              <Select
                value={newArea.metrolane}
                onValueChange={(val) =>
                  setNewArea((prev) => ({ ...prev, metrolane: val }))
                }
              >
                <SelectTrigger
                  id="metroLane"
                  className="w-full"
                  disabled={loading}
                >
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

            {/* Zone */}
            <div className="grid gap-3">
              <Label htmlFor="zone">Zone Name</Label>
              <Input
                id="zone"
                value={newArea.zone}
                onChange={(e) =>
                  setNewArea((prev) => ({ ...prev, zone: e.target.value }))
                }
                placeholder="Enter Zone Name"
                disabled={loading}
              />
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
