"use Client";
import type { unregisteredOwners } from "@/util/type";
import {
  getStickyRightOffsetPx,
  isStickyRightField,
  STICKY_RIGHT_SHADOW,
  type StickyRightField,
} from "@/app/spreadsheet/utils/rowTone";

interface Column {
  label: string | React.ReactNode;
  field: string;
  sortable: boolean;
  width: string;
}

interface SpreadsheetHeaderProps {
  columns: Column[];
  sortBy: keyof unregisteredOwners | null;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof unregisteredOwners) => void;
  isLargeScreen: boolean;
  visibleStickyFields: readonly StickyRightField[];
}

export function SpreadsheetHeader({
  columns,
  sortBy,
  sortOrder,
  onSort,
  isLargeScreen,
  visibleStickyFields,
}: SpreadsheetHeaderProps) {
  return (
    <div className="border-b bg-muted/30 sticky top-0 z-10">
      <div className="flex w-max min-w-full">
        {columns.map((col) => {
          const stickyRight = getStickyRightOffsetPx(
            col.field,
            isLargeScreen,
            visibleStickyFields,
          );
          const isSticky = isStickyRightField(col.field);

          return (
            <div
              key={col.field}
              onClick={
                col.sortable
                  ? () => onSort(col.field as keyof unregisteredOwners)
                  : undefined
              }
              style={stickyRight !== null ? { right: stickyRight } : undefined}
              className={`${
                col.sortable
                  ? "cursor-pointer select-none hover:bg-accent/50"
                  : ""
              } ${col.width} px-3 py-2 h-10 text-xs font-semibold whitespace-nowrap border-r border-border last:border-r-0 flex items-center justify-center flex-shrink-0 bg-muted/30 ${
                isSticky
                  ? `sticky top-0 z-20 bg-muted ${STICKY_RIGHT_SHADOW}`
                  : ""
              }`}
            >
              {col.label}{" "}
              {col.sortable && sortBy === col.field
                ? sortOrder === "asc"
                  ? "↑"
                  : "↓"
                : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
