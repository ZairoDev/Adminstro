"use client";

import { OwnerSheetPage } from "./OwnerSheetPage";
import { OWNER_SHEET_LONG_TERM_CONFIG } from "./ownerSheetConfig";

export default function SpreadsheetPage() {
  return <OwnerSheetPage config={OWNER_SHEET_LONG_TERM_CONFIG} />;
}
