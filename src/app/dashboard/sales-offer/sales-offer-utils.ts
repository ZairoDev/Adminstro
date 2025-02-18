import { useSalesOfferStore } from "./useSalesOfferStore";

export const leadStatuses = [
  "Not Interested",
  "Language Barrier",
  "Call Back",
  "Not Connected",
  "Send Offer",
  "Reject Lead",
  "Blacklist Lead",
] as const;

export const plans = [
  { planName: "Strategy", duration: "12M", price: 299, currency: "EUR" },
  { planName: "Action", duration: "18M", price: 399, currency: "EUR" },
  { planName: "Master Plan", duration: "24M", price: 499, currency: "EUR" },
  { planName: "Game Plan", duration: "18M", price: 599, currency: "EUR" },
] as const;

export const getSalesOfferStoreData = () => {
  const {
    phoneNumber,
    leadStatus,
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
    availableOn,
  } = useSalesOfferStore();

  const formData = {
    phoneNumber,
    leadStatus,
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
    availableOn,
  };

  return formData;
};
