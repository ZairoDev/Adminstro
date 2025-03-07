import axios from "axios";
import { useState } from "react";
import { LucideLoader2 } from "lucide-react";

import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

import { MONTHS } from "../add-listing/[[...stepIndex]]/PageAddListing8";

export default function PropertyBadge({
  property,
  bookedMonths,
  catalogueId,
}: {
  property: string;
  catalogueId: string;
  bookedMonths: string[];
}) {
  const [selectedMonths, setSelectedMonths] = useState<string[]>(bookedMonths);
  const [isLoading, setIsLoading] = useState(false);

  const handleBookingSubmit = async (propertyId: string) => {
    // console.log("propertyId", propertyId, selectedMonths, catalogueId);
    if (!selectedMonths.length) return;
    setIsLoading(true);
    try {
      await axios.post("/api/catalogue/updateBookedMonths", {
        catalogueId,
        VSID: propertyId,
        selectedMonths,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error in updating booked months",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className=" rounded-3xl font-semibold">{property}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Booked Months</DialogTitle>
        </DialogHeader>
        <DialogDescription>Tap to Select/Deselect the month</DialogDescription>
        <div className=" flex gap-x-4 text-sm">
          <div className=" flex gap-x-2">
            <p className=" w-4 h-4 bg-slate-700" />
            <p>Booked Months</p>
          </div>
          <div className=" flex gap-x-2">
            <p className=" w-4 h-4 bg-white" />
            <p>Available Months</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-2 mt-2 text-sm">
          {MONTHS.map((month, index) => (
            <div
              key={index}
              className={`px-2 py-0.5 rounded-xl bg-white text-black cursor-pointer ${
                selectedMonths.includes(month) && "bg-slate-900 text-white opacity-40"
              }`}
              onClick={() =>
                setSelectedMonths((prev) => {
                  let newState = [...prev];
                  newState.includes(month)
                    ? newState.splice(newState.indexOf(month), 1)
                    : newState.push(month);
                  return newState;
                })
              }
            >
              {month}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => handleBookingSubmit(property)}>
            {isLoading ? <LucideLoader2 /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
