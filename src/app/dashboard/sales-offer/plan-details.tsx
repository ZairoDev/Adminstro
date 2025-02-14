"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { plans } from "./sales-offer-utils";
import { useSalesOfferStore } from "./useSalesOfferStore";

const PlanDetails = () => {
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [effectivePrice, setEffectivePrice] = useState(0);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [callbackDate, setCallbackDate] = useState<Date>();

  const { setField } = useSalesOfferStore();

  return (
    <div className="border border-neutral-600 rounded-md p-2">
      <p className=" font-semibold text-xl">Plan Details</p>

      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
        {/* Plan Selector */}
        <div>
          <Label>Plan</Label>
          <Select
            onValueChange={(value) => {
              setSelectedPlanPrice(parseInt(value.split("-")[2], 10));
              setDiscount(0);
              setEffectivePrice(parseInt(value.split("-")[2], 10));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Plans</SelectLabel>
                {plans?.map((plan, index) => (
                  <SelectItem
                    key={index}
                    value={`${plan.planName}-${plan.duration}-${plan.price}${plan.currency}`}
                  >
                    <div>
                      {plan.planName} {plan.duration} - {plan.price} €
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Discount */}
        <div>
          <Label>Discount</Label>
          <Input
            type="number"
            min={0}
            max={selectedPlanPrice}
            defaultValue={0}
            value={discount}
            onChange={(e) => {
              const minValue = Math.min(parseInt(e.target.value), selectedPlanPrice);
              setDiscount(minValue);
              setField("discount", minValue);
              setEffectivePrice(selectedPlanPrice - minValue);
              setField("effectivePrice", selectedPlanPrice - minValue);
            }}
          />
        </div>

        {/* Effective Price */}
        <div>
          <Label>Effective Price</Label>
          <Input type="number" value={effectivePrice} disabled readOnly />
        </div>

        {/* Expiry Date */}
        <div className=" flex flex-col gap-y-1">
          <Label>Expiry Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal gap-x-2",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon />
                {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={setExpiryDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Callback Date */}
        <div className=" flex flex-col gap-y-1">
          <Label>Call Back Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal gap-x-2",
                  !callbackDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon />
                {callbackDate ? format(callbackDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={callbackDate}
                onSelect={setCallbackDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Callback Time */}
        <div className=" flex flex-col gap-y-1">
          <Label>Call Back Time</Label>
          <Input type="time" />
        </div>
      </div>
    </div>
  );
};
export default PlanDetails;
