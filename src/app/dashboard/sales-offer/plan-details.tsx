"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
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
import axios from "@/util/axios";
import { parseOfferPlan, serializeOfferPlan, type OfferPlanOption } from "@/util/offerPlan";
import { useOrgSelectionStore } from "./useOrgSelectionStore";

import { useSalesOfferStore } from "./useSalesOfferStore";

type CompanyPlanResponse = {
  _id: string;
  organization: "VacationSaga" | "Holidaysera" | "HousingSaga";
  companyName: string;
  plans: OfferPlanOption[];
};

const PlanDetails = () => {
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [callbackDate, setCallbackDate] = useState<Date>();
  const [availablePlans, setAvailablePlans] = useState<OfferPlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const { discount, effectivePrice, plan, setField } = useSalesOfferStore();

  useEffect(() => {
    setField("expiryDate", expiryDate);
    setField("callBackDate", callbackDate);
  }, [expiryDate, callbackDate, setField]);

  useEffect(() => {
    let mounted = true;
    async function loadPlans() {
      if (!selectedOrg) {
        if (!mounted) return;
        setAvailablePlans([]);
        setPlansError("Select organization to load plans.");
        return;
      }

      setPlansLoading(true);
      setPlansError("");
      try {
        const response = await axios.get(
          `/api/companies/offer-plans?organization=${encodeURIComponent(selectedOrg)}`,
        );
        const companies = (response.data?.companies ?? []) as CompanyPlanResponse[];
        const selectedCompany =
          companies.find((company) => company.organization === selectedOrg) ?? null;
        const plans = selectedCompany?.plans ?? [];
        if (!mounted) return;
        setAvailablePlans(plans);

        if (plans.length === 0) {
          setSelectedPlanPrice(0);
          setField("plan", "");
          setField("discount", 0);
          setField("effectivePrice", 0);
          return;
        }

        const existing = parseOfferPlan(plan);
        if (
          existing &&
          plans.some(
            (p) =>
              p.planName === existing.planName &&
              p.duration === existing.duration &&
              p.price === existing.price &&
              p.currency === existing.currency,
          )
        ) {
          setSelectedPlanPrice(existing.price);
          return;
        }

        const first = plans[0];
        setSelectedPlanPrice(first.price);
        setField("plan", serializeOfferPlan(first));
        setField("discount", 0);
        setField("effectivePrice", first.price);
      } catch (_error) {
        if (!mounted) return;
        setAvailablePlans([]);
        setPlansError("Unable to load plans for selected organization.");
      } finally {
        if (mounted) {
          setPlansLoading(false);
        }
      }
    }

    loadPlans().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [selectedOrg, plan, setField]);

  return (
    <div className="border border-neutral-600 rounded-md p-2">
      <p className=" font-semibold text-xl">Plan Details</p>

      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
        {/* Plan Selector */}
        <div>
          <Label>Plan</Label>
          <Select
            value={plan}
            onValueChange={(value) => {
              const parsed = parseOfferPlan(value);
              if (!parsed) return;
              const val = parsed.price;
              setSelectedPlanPrice(val);
              setField("plan", value);
              setField("discount", 0);
              setField("effectivePrice", val);
            }}
            disabled={plansLoading || availablePlans.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select Plan"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Plans</SelectLabel>
                {availablePlans.map((planOption, index) => (
                  <SelectItem
                    key={index}
                    value={serializeOfferPlan(planOption)}
                  >
                    <div>
                      {planOption.planName} {planOption.duration} - {planOption.price}{" "}
                      {planOption.currency}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {plansError ? <p className="mt-1 text-xs text-red-500">{plansError}</p> : null}
        </div>

        {/* Discount */}
        <div>
          <Label>Discount</Label>
          <Input
            type="number"
            min={0}
            max={selectedPlanPrice}
            value={!discount ? 0 : discount}
            onChange={(e) => {
              let minValue = Math.min(parseInt(e.target.value), selectedPlanPrice);
              minValue = !minValue ? 0 : minValue;
              setField("discount", minValue);
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
          <Input type="time" onChange={(e) => setField("callBackTime", e.target.value)} />
        </div>
      </div>
    </div>
  );
};
export default PlanDetails;
