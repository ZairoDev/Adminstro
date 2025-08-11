import axios from "axios";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import React, { useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InfinityLoader } from "@/components/Loaders";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { agentSchema, AgentValidationSchema } from "@/schemas/agent.schema";
// import toast from "react-hot-toast";
import { set } from "mongoose";

interface PageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAllTargets: Function
}


const TargetModal = ({open, onOpenChange,getAllTargets}: PageProps) => {

  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  
  const handleSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const val = Object.fromEntries(formData);
    console.log(val);
    try{
      setLoading(true);
      const response = await axios.post("/api/addons/target/addTarget", val);
      console.log(response);
      toast({
        title: "Success",
        description: "Target added successfully",
        variant: "default", // or "destructive"
      });
      setLoading(false);
      onOpenChange(false);
      getAllTargets();
    }
    catch(err:any){
      // toast.error("Unable to add target");
      toast({
        title: "Warning",
        description: err.response.data.error,
        variant: "default", // or "destructive"
      });
      console.log(err);
      setLoading(false);
    }

  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-6 w-full max-w-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div className="w-full">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                placeholder="Enter Country's Name"
                className="w-full"
              />
            </div>

            {/* City */}
            <div className="w-full">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="Enter City's Name"
                className="w-full"
              />
            </div>

            {/* State */}
            <div className="w-full">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                placeholder="Enter State's Name"
                className="w-full"
              />
            </div>

            {/* Sales Target */}
            <div className="w-full">
              <Label htmlFor="sales">Sales Target</Label>
              <Input
                id="sales"
                name="sales"
                placeholder="Enter Target Value"
                className="w-full"
              />
            </div>

            {/* Visits Target */}
            <div className="w-full">
              <Label htmlFor="visits">Visits Target</Label>
              <Input
                id="visits"
                name="visits"
                placeholder="Enter Target Value"
                className="w-full"
              />
            </div>

            {/* Leads Target */}
            <div className="w-full">
              <Label htmlFor="leads">Leads Target</Label>
              <Input
                id="leads"
                name="leads"
                placeholder="Enter Target Value"
                className="w-full"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" className="w-full md:w-auto">
              {loading ? (
                <InfinityLoader className="w-12 h-8" />
              ) : (
                "Create Target"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default TargetModal;