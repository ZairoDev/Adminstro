import { create } from "zustand";

interface SalesOfferState {
  phoneNumber: string;
  leadStatus: string;
  name: string;
  propertyName: string;
  relation: string;
  email: string;
  propertyUrl: string;
  country: string;
  state: string;
  city: string;
  plan: string;
  discount: number;
  effectivePrice: number;
  expiryDate: string | null;
  callBackDate: string | null;
  callBackTime: string | null;
  setField: (field: keyof SalesOfferState, value: any) => void;
  resetForm: () => void;
}

export const useSalesOfferStore = create<SalesOfferState>((set) => ({
  phoneNumber: "",
  leadStatus: "Send Offer",
  name: "",
  propertyName: "",
  relation: "",
  email: "",
  propertyUrl: "",
  country: "",
  state: "",
  city: "",
  plan: "",
  discount: 0,
  effectivePrice: 0,
  expiryDate: null,
  callBackDate: null,
  callBackTime: null,
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  resetForm: () =>
    set({
      phoneNumber: "",
      leadStatus: "Send Offer",
      name: "",
      propertyName: "",
      relation: "",
      email: "",
      propertyUrl: "",
      country: "",
      state: "",
      city: "",
      plan: "",
      discount: 0,
      effectivePrice: 0,
      expiryDate: null,
      callBackDate: null,
      callBackTime: null,
    }),
}));
