import type { unregisteredOwners } from "@/util/type";

/** Only the Actions column is pinned to the right while horizontally scrolling. */
export const STICKY_RIGHT_FIELDS = ["upload"] as const;

export type StickyRightField = (typeof STICKY_RIGHT_FIELDS)[number];

const STICKY_WIDTHS_SMALL: Record<StickyRightField, number> = {
  upload: 50,
};

const STICKY_WIDTHS_LARGE: Record<StickyRightField, number> = {
  upload: 80,
};

export function getStickyRightOffsetPx(
  field: string,
  isLargeScreen: boolean,
  visibleStickyFields: readonly StickyRightField[],
): number | null {
  if (!visibleStickyFields.includes(field as StickyRightField)) {
    return null;
  }

  const widths = isLargeScreen ? STICKY_WIDTHS_LARGE : STICKY_WIDTHS_SMALL;
  const rightOrder = [...STICKY_RIGHT_FIELDS]
    .filter((stickyField) => visibleStickyFields.includes(stickyField))
    .reverse();

  const index = rightOrder.indexOf(field as StickyRightField);
  if (index === -1) return null;

  let right = 0;
  for (let i = 0; i < index; i += 1) {
    right += widths[rightOrder[i]];
  }
  return right;
}

export function getVisibleStickyRightFields(
  columnFields: string[],
): StickyRightField[] {
  return STICKY_RIGHT_FIELDS.filter((field) => columnFields.includes(field));
}

export function isStickyRightField(field: string): boolean {
  return STICKY_RIGHT_FIELDS.includes(field as StickyRightField);
}

/** Row highlight tones — opaque in dark mode so sticky cells match when scrolling. */
export function getOwnerRowToneClasses(
  item: unregisteredOwners,
  selectedRowId: string | null,
): string {
  if (selectedRowId === item._id) {
    return "!bg-amber-200 dark:!bg-amber-900/90 ring-2 ring-inset ring-amber-500 shadow-sm";
  }

  const missingEverything =
    (!item.VSID || item.VSID.trim() === "") &&
    (!item.link || item.link.trim() === "") &&
    (!item.referenceLink || item.referenceLink.trim() === "") &&
    (!item.imageUrls || item.imageUrls.length === 0);

  const missingVsidAndLink =
    (!item.VSID || item.VSID.trim() === "") &&
    (!item.link || item.link.trim() === "");

  if (missingEverything) {
    return "bg-red-100 dark:bg-red-950/95";
  }
  if (missingVsidAndLink) {
    return "bg-blue-100 dark:bg-blue-950/95";
  }

  return "bg-background";
}

export const STICKY_RIGHT_SHADOW =
  "shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.45)] dark:shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.65)]";
