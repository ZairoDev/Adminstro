"use client";

import { z } from "zod";
import axios from "axios";
import { useEffect, useState } from "react";
import { Check, CircleX, RotateCw, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  const [phone, setPhone] = useState("");
  const [showAvailability, setShowAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState({
    VacationSaga: false,
    TechTunes: false,
  });
  const [leadStatus, setLeadStatus] = useState<(typeof leadStatuses)[number]>();

  const {
    name,
    propertyName,
    relation,
    email,
    propertyUrl,
    country,
    state,
    city,
    plan,
    discount,
    effectivePrice,
    expiryDate,
    callBackDate,
    callBackTime,
    // leadStatus
  } = useSalesOfferStore();

  // useEffect(() => {
  //   console.log(city, state, country, plan, discount, effectivePrice);
  // }, [city, state, country, plan, discount, effectivePrice]);

  useEffect(() => {
    console.log(name, propertyName, relation, email, propertyUrl);
  }, [name, propertyName, relation, email, propertyUrl]);

  // Select Lead Status
  const leadStatusSelector = () => {
    return (
      <div>
        <Label htmlFor="leadStatus">Lead Status</Label>
        <Select
          onValueChange={(value) => setLeadStatus(value as (typeof leadStatuses)[number])}
        >
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
      const response = await axios.post("/api/checkNumberInOffers", { phoneNo: phone });
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
  };

  return (
    <div className="mt-4 flex flex-col gap-y-4">
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

      <div>{leadStatusSelector()}</div>
      <div>{leadStatus === "Send Offer" && <SendOffer />}</div>
      <div>{leadStatus === "Send Offer" && <PlanDetails />}</div>

      <div className="flex gap-x-4 mx-auto">
        <Button>
          Reset <RotateCw className=" ml-1" size={16} />
        </Button>
        <Button>
          Save <Save className=" ml-1" size={16} />
        </Button>
      </div>
    </div>
  );
};
export default SalesOffer;
