"use client";

import { OwnerSheetPage } from "@/app/spreadsheet/OwnerSheetPage";
import { OWNER_SHEET_SHORT_TERM_CONFIG } from "@/app/spreadsheet/ownerSheetConfig";

export default function SpreadsheetShortTermPage() {
  return <OwnerSheetPage config={OWNER_SHEET_SHORT_TERM_CONFIG} />;
}
