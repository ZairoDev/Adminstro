import { OwnerInterface } from "@/util/type";
import { create } from "zustand";

interface OwnerStoreInterface extends OwnerInterface {
  setField: (field: keyof OwnerInterface, value: any) => void;
  resetForm: () => void;
}

export const useOwnerStore = create<OwnerStoreInterface>((set) => ({
  phoneNumber: 0,
  propertyName: "",
  propertyUrl: "",
  country: "",
  state: "",
  city: "",
  area: "",
  setField: (field: string, value: string | number) => set({ [field]: value }),
  resetForm: () =>
    set({
      phoneNumber: 0,
      propertyName: "",
      propertyUrl: "",
      country: "",
      state: "",
      city: "",
      area: "",
    }),
}));
