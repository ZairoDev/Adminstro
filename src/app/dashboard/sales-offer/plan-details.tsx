"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
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
import { computeOfferTotals, formatEuroAmount } from "@/util/offerPricing";
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
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [callbackDate, setCallbackDate] = useState<Date>();
  const [availablePlans, setAvailablePlans] = useState<OfferPlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const {
    discount,
    effectivePrice,
    plan,
    pricePerProperty,
    propertiesAllowed,
    discountType,
    discountUnit,
    discountValue,
    setField,
  } = useSalesOfferStore();

  useEffect(() => {
    setField("expiryDate", expiryDate ?? null);
    setField("callBackDate", callbackDate ?? null);
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
          setField("plan", "");
          setField("pricePerProperty", 0);
          setField("propertiesAllowed", 1);
          setField("discountType", "TOTAL");
          setField("discountUnit", "FIXED");
          setField("discountValue", 0);
          setField("totalPrice", 0);
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
          if (!pricePerProperty || pricePerProperty <= 0) {
            setField("pricePerProperty", existing.price);
          }
          return;
        }

        const first = plans[0];
        setField("plan", serializeOfferPlan(first));
        setField("pricePerProperty", first.price);
        setField("propertiesAllowed", 1);
        setField("discountType", "TOTAL");
        setField("discountUnit", "FIXED");
        setField("discountValue", 0);
        setField("totalPrice", first.price);
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
  }, [selectedOrg, plan, setField, pricePerProperty]);

  const pricing = useMemo(
    () =>
      computeOfferTotals({
        pricePerProperty,
        propertiesAllowed,
        discountType,
        discountUnit,
        discountValue,
      }),
    [pricePerProperty, propertiesAllowed, discountType, discountUnit, discountValue],
  );

  useEffect(() => {
    setField("totalPrice", pricing.baseTotal);
    setField("discount", pricing.totalDiscount);
    setField("effectivePrice", pricing.effectivePrice);
  }, [pricing.baseTotal, pricing.totalDiscount, pricing.effectivePrice, setField]);

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
              setField("plan", value);
              setField("pricePerProperty", parsed.price);
              setField("propertiesAllowed", 1);
              setField("discountType", "TOTAL");
              setField("discountUnit", "FIXED");
              setField("discountValue", 0);
              setField("totalPrice", parsed.price);
              setField("discount", 0);
              setField("effectivePrice", parsed.price);
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

        {/* Properties Allowed */}
        <div>
          <Label>Properties Allowed</Label>
          <Input
            type="number"
            min={1}
            value={propertiesAllowed}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10);
              const normalized = Number.isFinite(value) ? Math.max(1, value) : 1;
              setField("propertiesAllowed", normalized);
            }}
          />
        </div>

        {/* Price Per Property */}
        <div>
          <Label>Price Per Property (€)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={pricePerProperty}
            onChange={(e) => {
              const value = Number.parseFloat(e.target.value);
              setField("pricePerProperty", Number.isFinite(value) ? Math.max(0, value) : 0);
            }}
          />
        </div>

        {/* Discount Type */}
        <div>
          <Label>Discount Type</Label>
          <Select
            value={discountType}
            onValueChange={(value) => setField("discountType", value as "PER_PROPERTY" | "TOTAL")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select discount scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_PROPERTY">Per Property</SelectItem>
              <SelectItem value="TOTAL">Total</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Discount Unit */}
        <div>
          <Label>Discount Unit</Label>
          <Select
            value={discountUnit}
            onValueChange={(value) => {
              setField("discountUnit", value as "FIXED" | "PERCENT");
              if (value === "PERCENT" && discountValue > 100) {
                setField("discountValue", 100);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select discount unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed (€)</SelectItem>
              <SelectItem value="PERCENT">Percent (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Discount Value */}
        <div>
          <Label>{discountUnit === "PERCENT" ? "Discount (%)" : "Discount (€)"}</Label>
          <Input
            type="number"
            min={0}
            max={discountUnit === "PERCENT" ? 100 : undefined}
            step={discountUnit === "PERCENT" ? 1 : 0.01}
            value={discountValue}
            onChange={(e) => {
              const value = Number.parseFloat(e.target.value);
              const raw = Number.isFinite(value) ? Math.max(0, value) : 0;
              const normalized = discountUnit === "PERCENT" ? Math.min(raw, 100) : raw;
              setField("discountValue", normalized);
            }}
          />
        </div>

        {/* Total Price */}
        <div>
          <Label>Base Total (€)</Label>
          <Input type="text" value={formatEuroAmount(pricing.baseTotal)} disabled readOnly />
        </div>

        {/* Discount */}
        <div>
          <Label>Discount Amount (€)</Label>
          <Input type="text" value={formatEuroAmount(discount)} disabled readOnly />
        </div>

        {/* Effective Price */}
        <div>
          <Label>Final Payable (€)</Label>
          <Input type="text" value={formatEuroAmount(effectivePrice)} disabled readOnly />
        </div>

        {/* Per Property Net */}
        <div>
          <Label>Per Property Effective (€)</Label>
          <Input type="text" value={formatEuroAmount(pricing.perPropertyNet)} disabled readOnly />
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
