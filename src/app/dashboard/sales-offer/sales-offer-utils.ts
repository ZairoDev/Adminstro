import { useSalesOfferStore } from "./useSalesOfferStore";

export const leadStatuses = [
  "Not Interested",
  "Language Barrier",
  "Call Back",
  "Not Connected",
  "Send Offer",
  "Blacklist Lead",
] as const;

export const plans = [
  { planName: "Basic", duration: "6M", price: 399, currency: "EUR" },
  { planName: "Strategy", duration: "12M", price: 299, currency: "EUR" },
  { planName: "Action", duration: "18M", price: 399, currency: "EUR" },
  { planName: "Master Plan", duration: "24M", price: 499, currency: "EUR" },
  { planName: "Game Plan", duration: "18M", price: 599, currency: "EUR" },
] as const;
