import { create } from "zustand";

import { CatalogueInterface } from "@/util/type";

const useCatalogueStore = create<CatalogueInterface>((set) => ({
  addCatalogueModal: false,
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
}));

export default useCatalogueStore;
