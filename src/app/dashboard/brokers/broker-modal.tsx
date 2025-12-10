import axios from "axios";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import React, { useState } from "react";
import PhoneInput from "react-phone-number-input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const brokerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type BrokerValidationSchema = z.infer<typeof brokerSchema>;

interface PageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAllBrokers?: () => void;
}

const BrokerModal = ({ open, onOpenChange, getAllBrokers }: PageProps) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BrokerValidationSchema>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (data: BrokerValidationSchema) => {
    if (!phone) {
      toast({
        variant: "destructive",
        description: "Phone number is required",
      });
      return;
    }

    setLoading(true);
    const brokerData = {
      name: data.name,
      email: data.email || "",
      phone: phone,
      role: "Broker",
      isVerified: true,
    };

    try {
      await axios.post("/api/addons/brokers/addBroker", brokerData);
      toast({
        description: "Broker created successfully",
      });
      reset();
      setPhone(undefined);
      onOpenChange(false);
      getAllBrokers?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || "An error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col justify-center items-center">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-y-4 w-full"
        >
          <div className="w-full">
            <Label htmlFor="name">Name</Label>
            <Input
              {...register("name")}
              className="w-full"
              placeholder="Enter Broker's name"
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="w-full">
            <Label htmlFor="email">Email</Label>
            <Input
              {...register("email")}
              type="email"
              className="w-full"
              placeholder="Enter Broker's email (optional)"
            />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="w-full">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              className="phone-input"
              placeholder="Enter phone number"
              value={phone}
              international
              countryCallingCodeEditable={false}
              onChange={(value) => setPhone(value?.toString())}
            />
          </div>

          <div className="flex items-end justify-start">
            <Button type="submit" className="w-full">
              {loading ? (
                <InfinityLoader className="w-12 h-8 font-medium" />
              ) : (
                "Create Broker"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BrokerModal;

