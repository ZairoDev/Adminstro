import { create } from "zustand";

import { SalesOfferInterface } from "@/util/type";

export const useSalesOfferStore = create<SalesOfferInterface>((set) => ({
  phoneNumber: "",
  leadStatus: "",
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
  availableOn: [],
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  resetForm: () =>
    set({
      phoneNumber: "",
      leadStatus: "",
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
      availableOn: [],
    }),
}));
