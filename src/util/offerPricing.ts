export type DiscountType = "PER_PROPERTY" | "TOTAL";
export type DiscountUnit = "FIXED" | "PERCENT";

export interface OfferPricingInput {
  pricePerProperty: number;
  propertiesAllowed: number;
  discountType: DiscountType;
  discountUnit: DiscountUnit;
  discountValue: number;
}

export interface OfferPricingResult {
  baseTotal: number;
  totalDiscount: number;
  effectivePrice: number;
  perPropertyNet: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function computeOfferTotals(input: OfferPricingInput): OfferPricingResult {
  const pricePerProperty = Math.max(0, Number(input.pricePerProperty) || 0);
  const propertiesAllowed = Math.max(1, Math.trunc(Number(input.propertiesAllowed) || 1));
  const discountValue = Math.max(0, Number(input.discountValue) || 0);
  const discountType = input.discountType;
  const discountUnit = input.discountUnit;

  const baseTotalRaw = pricePerProperty * propertiesAllowed;

  let effectivePriceRaw = baseTotalRaw;
  if (discountType === "PER_PROPERTY") {
    const perPropertyNetRaw =
      discountUnit === "PERCENT"
        ? pricePerProperty * (1 - discountValue / 100)
        : pricePerProperty - discountValue;
    effectivePriceRaw = Math.max(0, perPropertyNetRaw) * propertiesAllowed;
  } else {
    effectivePriceRaw =
      discountUnit === "PERCENT"
        ? baseTotalRaw * (1 - discountValue / 100)
        : baseTotalRaw - discountValue;
    effectivePriceRaw = Math.max(0, effectivePriceRaw);
  }

  const baseTotal = round2(baseTotalRaw);
  const effectivePrice = round2(Math.min(baseTotalRaw, effectivePriceRaw));
  const totalDiscount = round2(Math.max(0, baseTotal - effectivePrice));
  const perPropertyNet = round2(effectivePrice / propertiesAllowed);

  return {
    baseTotal,
    totalDiscount,
    effectivePrice,
    perPropertyNet,
  };
}

export function formatEuroAmount(value: number): string {
  return round2(value).toFixed(2);
}
