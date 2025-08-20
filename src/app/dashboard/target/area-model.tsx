import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

export function AreaModel({
  areaModel,
  setAreaModel,
  areaId,
}: {
  areaModel: boolean;
  setAreaModel: (val: boolean) => void;
  areaId: string;
}) {
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newArea, setNewArea] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newArea.trim()) return; // prevent empty submit

    try {
      setLoading(true);

      await axios.put(`/api/addons/target/updateTarget/${areaId}`, {
        area: newArea.trim(),
      });

      // Optimistic UI update
      setAreas((prev) => [...prev, newArea.trim()]);
      setNewArea(""); // reset input
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
      setAreas(res.data.target.area || []); // make sure schema matches
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
                    {area}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No areas yet</p>
              )}
            </div>

            {/* Input */}
            <div className="grid gap-3">
              <Label htmlFor="area">Location Name</Label>
              <Input
                id="area"
                name="area"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Enter location"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">

              <Button onClick={() => setAreaModel(false)} type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>

            <Button  type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
