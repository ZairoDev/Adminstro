"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Check, CircleX, RotateCw, Save } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInputLayout as PhoneInput } from "@/components/PhoneInputLayout";

import SendOffer from "./send-offer";
import PlanDetails from "./plan-details";
import { leadStatuses } from "./sales-offer-utils";
import { useSalesOfferStore } from "./useSalesOfferStore";

const FormSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((value) => value && isValidPhoneNumber(value), {
      message: "Invalid phone number",
    }),
});
type FormData = z.infer<typeof FormSchema>;

const SalesOffer = () => {
  const { toast } = useToast();

  const [showAvailability, setShowAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState({
    TechTunes: false,
    VacationSaga: false,
  });

  const { leadStatus, setField } = useSalesOfferStore();

  // Select Lead Status
  const leadStatusSelector = () => {
    return (
      <div>
        <Label htmlFor="leadStatus">Lead Status</Label>
        <Select onValueChange={(value) => setField("leadStatus", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Lead Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              {leadStatuses.map((status, index) => (
                <SelectItem key={index} value={status}>
                  <div>{status}</div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const platformSelector = () => {
    return (
      <div>
        <Label htmlFor="platform">Select Platform</Label>
        <Select onValueChange={(value) => setField("availableOn", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Platform</SelectLabel>
              {["VacationSaga", "TechTunes"].map((status, index) => (
                <SelectItem
                  key={index}
                  value={status}
                  disabled={!isAvailable[status as keyof typeof isAvailable]}
                >
                  <div>{status}</div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { phone: "" },
  });

  // check number for availbility in database
  const checkNumber = async (phone: string) => {
    try {
      const response = await axios.post("/api/sales-offer/checkNumberInOffers", {
        phoneNumber: phone,
      });
      setIsAvailable((prev) => {
        const avail = { ...prev };
        avail.TechTunes = !response.data.availableOnTT;
        avail.VacationSaga = !response.data.availableOnVS;
        return avail;
      });
      setShowAvailability(true);
    } catch (error) {
      console.error("error in checking number: ", error);
    }
  };

  const onSubmit = (data: FormData) => {
    checkNumber(data.phone);
    setField("phoneNumber", data.phone);
  };

  {
    /*Save Offer*/
  }
  // const offerData = getSalesOfferStoreData();
  const handleSaveOffer = async () => {
    const offerData = useSalesOfferStore.getState();
    console.log("called save offer", offerData);
    try {
      const response = await axios.post("/api/sales-offer/addSalesOffer", offerData);
      toast({
        title: "Success",
        description: "Offer saved successfully",
      });
    } catch (error: any) {
      console.log("error in frontend: ", error.response.data.error);
      toast({
        title: "Error in saving Offer",
        description: error.response.data.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-y-4">
      <Toaster />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex items-center gap-x-4 space-y-3 p-2 border border-neutral-600 rounded-md"
      >
        {/* Phone Input Field */}{" "}
        <div className="flex flex-col items-start ">
          <label htmlFor="phone" className="text-left font-medium">
            Phone Number
          </label>
          <div className=" flex items-center gap-x-8 py-2">
            <div className=" flex flex-col">
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    id="phone"
                    placeholder="Enter a phone number"
                    className="w-full border rounded-lg"
                  />
                )}
              />
              <div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="p-2 bg-primary text-background rounded-md text-sm"
            >
              Submit
            </button>
          </div>
        </div>
        {/* Availability */}
        {showAvailability && (
          <div>
            <div
              className={`flex items-center gap-x-2 text-sm font-semibold ${
                isAvailable.TechTunes ? "text-green-600" : "text-red-600"
              }`}
            >
              {isAvailable.TechTunes ? <Check size={16} /> : <CircleX size={16} />}
              <p>{isAvailable.TechTunes ? "Fresh Lead" : "Used Lead"} for Tech Tunes</p>
            </div>
            <div
              className={`flex items-center gap-x-2 text-sm font-semibold ${
                isAvailable.VacationSaga ? "text-green-600" : "text-red-600"
              }`}
            >
              {isAvailable.VacationSaga ? <Check size={16} /> : <CircleX size={16} />}
              <p>
                {isAvailable.VacationSaga ? "Fresh Lead" : "Used Lead"} for Vacation saga
              </p>
            </div>
          </div>
        )}
      </form>

      <div className=" flex gap-x-4">
        {platformSelector()}
        {(isAvailable.VacationSaga || isAvailable.TechTunes) && leadStatusSelector()}
      </div>
      {leadStatusSelector()}
      <div>{leadStatus === "Send Offer" && <SendOffer />}</div>
      <div>{leadStatus === "Send Offer" && <PlanDetails />}</div>

      <div className={`flex gap-x-4 mx-auto`}>
        <Button>
          Reset <RotateCw className=" ml-1" size={16} />
        </Button>
        <Button onClick={handleSaveOffer}>
          Save <Save className=" ml-1" size={16} />
        </Button>
      </div>
    </div>
  );
};
export default SalesOffer;
