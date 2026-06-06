import {
  OWNER_SHEET_FILTER_STORAGE_KEY,
  OWNER_SHEET_SHORT_TERM_FILTER_STORAGE_KEY,
} from "@/util/ownerSheetLocationFilter";

export type OwnerSheetVariant = "long-term" | "short-term";

export interface OwnerSheetConfig {
  variant: OwnerSheetVariant;
  title: string;
  apiBasePath: string;
  filterStorageKey: string;
  geoSearchHref?: string;
}

export const OWNER_SHEET_LONG_TERM_CONFIG: OwnerSheetConfig = {
  variant: "long-term",
  title: "Owner Sheet Long Term",
  apiBasePath: "/api/unregisteredOwners",
  filterStorageKey: OWNER_SHEET_FILTER_STORAGE_KEY,
  geoSearchHref: "/dashboard/geo-search",
};

export const OWNER_SHEET_SHORT_TERM_CONFIG: OwnerSheetConfig = {
  variant: "short-term",
  title: "Owner Sheet Short Term",
  apiBasePath: "/api/unregisteredOwnersShortTerm",
  filterStorageKey: OWNER_SHEET_SHORT_TERM_FILTER_STORAGE_KEY,
};
