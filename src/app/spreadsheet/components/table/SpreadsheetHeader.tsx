"use Client"
import { Phone } from "lucide-react";
import type { unregisteredOwners } from "@/util/type";

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
}

export function SpreadsheetHeader({ columns,
  sortBy,
  sortOrder,
  onSort,}:SpreadsheetHeaderProps){
    return(
        <div className="border-b bg-muted/30 sticky top-0 z-10">
          <div className="flex">
            {columns.map((col) => (
              <div
                key={col.field}
                onClick={
                  col.sortable
                    ? () => onSort(col.field as keyof unregisteredOwners)
                    : undefined
                }
                className={`${
                  col.sortable
                    ? "cursor-pointer select-none hover:bg-accent/50"
                    : ""
                } ${
                  col.width
                } px-3 py-2 h-10 text-xs font-semibold whitespace-nowrap border-r border-border last:border-r-0 flex items-center justify-center flex-shrink-0 bg-muted/30`}
              >
                {col.label}{" "}
                {col.sortable && sortBy === col.field
                  ? sortOrder === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </div>
            ))}
          </div>
        </div>
    )
}