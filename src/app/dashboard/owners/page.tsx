"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { Check, RotateCcw, Save, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";

import { OwnerInterface } from "@/util/type";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInputLayout as PhoneInput } from "@/components/PhoneInputLayout";

import OwnerAddress from "./onwer-address";
import { useOwnerStore } from "./owner-store";
import Aliases from "@/models/alias";
import { toast } from "@/hooks/use-toast";

const FormSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((value) => value && isValidPhoneNumber(value), {
      message: "Invalid phone number",
    }),
});
type FormData = z.infer<typeof FormSchema>;

const OwnerPage = () => {
  const [showAvailability, setShowAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { setField, resetForm } = useOwnerStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { phone: "" },
  });

  const checkNumber = async (data: FormData) => {
    setField("phoneNumber", data.phone);
    try {
      const response = await axios.post("/api/owner/checkNumberInOwners", {
        phoneNumber: data.phone,
      });
      setShowAvailability(!response.data.exists);
      setIsAvailable(true);
    } catch (error) {
      console.error("error in checking number: ", error);
    }
  };

  const handleOwnerFormSubmit = async () => {
    const ownerData: OwnerInterface = useOwnerStore.getState();

    let emptyFields = "";
    let emptyFieldsCount = 0;

    for (const key in ownerData) {
      if (
        ownerData[key as keyof OwnerInterface] == "" ||
        ownerData[key as keyof OwnerInterface] == null ||
        ownerData[key as keyof OwnerInterface] == undefined
      ) {
        emptyFields += `${key}, `;
        emptyFieldsCount++;
      }
    }

    if (emptyFieldsCount > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Please fill all the fields: ${emptyFields}`,
      });
      return;
    }

    try {
      await axios.post("/api/owner/addOwner", ownerData);
      toast({
        variant: "default",
        title: "Owner Added",
        description: "Owner added successfully",
      });
      handleReset();
    } catch (err: any) {
      console.log("error in adding owner: ", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error in adding owner",
      });
    }
  };

  const handleReset = () => {
    reset();
    resetForm();
    setShowAvailability(false);
    setIsAvailable(false);
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit(checkNumber)}
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
              Check Number
            </button>
            {isAvailable && (
              <div>
                {showAvailability ? (
                  <p className=" text-green-500 flex gap-x-1">
                    <Check />
                    Fresh Lead
                  </p>
                ) : (
                  <p className=" text-red-500 flex gap-x-1">
                    <X color="red" /> Existing Owner
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
      {/* Form */}
      {showAvailability && (
        <div>
          <h2 className=" font-semibold text-2xl my-4">Owner&apos; Form</h2>
          <div className=" flex justify-between gap-x-4">
            <Input
              type="text"
              placeholder="Property Name"
              onChange={(e) => setField("propertyName", e.target.value)}
            />
            <Input
              type="text"
              placeholder="Property URL"
              onChange={(e) => setField("propertyUrl", e.target.value)}
            />
          </div>
          <div>
            <OwnerAddress />
            <Input
              type="text"
              placeholder="Enter area "
              onChange={(e) => setField("area", e.target.value)}
            />
          </div>
          <div className=" flex justify-center gap-x-2 mt-4">
            <Button onClick={handleReset}>
              <RotateCcw className=" mr-1" size={16} />
              Reset
            </Button>
            <Button onClick={handleOwnerFormSubmit}>
              <Save className=" mr-1" size={16} />
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default OwnerPage;
