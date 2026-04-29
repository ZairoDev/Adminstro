"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ColumnDef,
  flexRender,
  SortingState,
  useReactTable,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfferDoc } from "@/util/type";
import { ContactCell } from "./contact-cell";
import { LeadStatusBadge } from "./lead-status-badge";

export interface LeadsTableAction {
  label: string;
  onClick: (offer: OfferDoc) => void;
  /** Only render this action if the predicate returns true for a given offer */
  show?: (offer: OfferDoc) => boolean;
}

interface LeadsTableProps {
  offers: OfferDoc[];
  page: number;
  pageSize?: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  extraColumns?: ColumnDef<OfferDoc>[];
  actions?: LeadsTableAction[];
  onRowClick?: (offer: OfferDoc) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  bulkActionBar?: React.ReactNode;
}

type JourneyStepKey =
  | "offerSent"
  | "rejected"
  | "callbackAdded"
  | "updatedOffer"
  | "blacklisted"
  | "paymentComplete"
  | "rem1Sent"
  | "rem2Sent"
  | "rem3Sent"
  | "rem4Sent"
  | "rebuttal1Sent"
  | "rebuttal2Sent";

const JOURNEY_LABELS: Record<JourneyStepKey, string> = {
  offerSent: "Offer Sent",
  rejected: "rejected",
  callbackAdded: "Callback Added",
  updatedOffer: "updatedOffer",
  blacklisted: "blacklisted",
  paymentComplete: "paymentComplete",
  rem1Sent: "REM1 Sent",
  rem2Sent: "REM2 Sent",
  rem3Sent: "REM3 Sent",
  rem4Sent: "REM4 Sent",
  rebuttal1Sent: "Rebuttal1 Sent",
  rebuttal2Sent: "Rebuttal2 Sent",
};

function mapStatusToJourneyStep(status: string): JourneyStepKey | null {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === "offer_sent" ||
    normalized === "sent offer" ||
    normalized === "send offer" ||
    normalized === "sent"
  ) {
    return "offerSent";
  }
  if (
    normalized === "updated offer" ||
    normalized === "update offer" ||
    normalized === "updated_offer" ||
    normalized === "updatedoffer" ||
    normalized === "reverted to pending"
  ) {
    return "updatedOffer";
  }
  if (normalized === "reject lead" || normalized === "rejected") return "rejected";
  if (normalized === "call back" || normalized.startsWith("callback")) return "callbackAdded";
  if (normalized === "blacklist lead" || normalized === "blacklisted") return "blacklisted";
  if (normalized === "payment_complete" || normalized === "payment complete" || normalized === "accepted") {
    return "paymentComplete";
  }
  if (normalized === "rem1 sent") return "rem1Sent";
  if (normalized === "rem2 sent") return "rem2Sent";
  if (normalized === "rem3 sent") return "rem3Sent";
  if (normalized === "rem4 sent") return "rem4Sent";
  if (normalized === "rebuttal1 sent") return "rebuttal1Sent";
  if (normalized === "rebuttal2 sent") return "rebuttal2Sent";
  return null;
}

function deriveJourney(offer: OfferDoc): JourneyStepKey[] {
  const steps: JourneyStepKey[] = [];
  const pushStep = (step: JourneyStepKey | null) => {
    if (!step) return;
    if (step === "offerSent" && steps.includes("offerSent")) return;
    steps.push(step);
  };
  for (const event of offer.history ?? []) {
    pushStep(mapStatusToJourneyStep(event.status));
  }
  pushStep(mapStatusToJourneyStep(offer.leadStatus ?? ""));
  return steps;
}

function JourneyTrail({ offer }: { offer: OfferDoc }) {
  const steps = deriveJourney(offer);
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      {steps.map((step, idx) => (
        <React.Fragment key={`${offer._id}-${step}-${idx}`}>
          <span
            className={
              step === steps[steps.length - 1]
                ? "text-[10px] rounded-full px-2 py-0.5 bg-primary/15 text-primary font-medium"
                : "text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground"
            }
          >
            {JOURNEY_LABELS[step]}
          </span>
          {idx < steps.length - 1 && <span className="text-[10px] text-muted-foreground">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function areRowSelectionsEqual(
  a: Record<string, boolean>,
  b: Record<string, boolean>,
): boolean {
  const aKeys = Object.keys(a).filter((k) => a[k]);
  const bKeys = Object.keys(b).filter((k) => b[k]);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => b[k] === true);
}

function buildBaseColumns(
  actions: LeadsTableAction[],
  onRowClick?: (offer: OfferDoc) => void,
): ColumnDef<OfferDoc>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div
          className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
          onClick={() => onRowClick?.(row.original)}
        >
          {row.getValue("name")}
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <ContactCell phone={row.original.phoneNumber} email={row.original.email} />
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <div className="text-sm">{row.getValue("price")}</div>,
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => <div className="text-sm">{row.getValue("country")}</div>,
    },
    {
      accessorKey: "leadStatus",
      header: "Status",
      cell: ({ row }) => <LeadStatusBadge status={row.getValue("leadStatus")} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const v = row.getValue("createdAt") as string;
        return <div className="text-xs text-muted-foreground whitespace-nowrap">{v ? format(new Date(v), "dd MMM yyyy") : "—"}</div>;
      },
    },
    ...(actions.length > 0
      ? [
          {
            id: "actions",
            header: "Actions",
            enableHiding: false,
            cell: ({ row }: { row: { original: OfferDoc } }) => {
              const offer = row.original;
              const visibleActions = actions.filter((a) => !a.show || a.show(offer));
              if (visibleActions.length === 0) return null;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {visibleActions.map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(offer);
                        }}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } satisfies ColumnDef<OfferDoc>,
        ]
      : []),
  ];
}

export function LeadsTable({
  offers,
  page,
  pageSize = 20,
  totalCount,
  totalPages,
  onPageChange,
  isLoading,
  extraColumns = [],
  actions = [],
  onRowClick,
  selectedIds,
  onSelectionChange,
  bulkActionBar,
}: LeadsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const baseColumns = React.useMemo(
    () => buildBaseColumns(actions, onRowClick),
    [actions, onRowClick],
  );

  const columns = React.useMemo(
    () => [...baseColumns.slice(0, -1), ...extraColumns, ...(actions.length > 0 ? [baseColumns[baseColumns.length - 1]] : [])],
    [baseColumns, extraColumns, actions.length],
  );

  React.useEffect(() => {
    if (!selectedIds) return;
    const next: Record<string, boolean> = {};
    offers.forEach((o, i) => {
      if (selectedIds.has(o._id)) next[String(i)] = true;
    });
    setRowSelection((prev) => (areRowSelectionsEqual(prev, next) ? prev : next));
  }, [selectedIds, offers]);

  React.useEffect(() => {
    if (!onSelectionChange) return;
    const ids = new Set(
      Object.keys(rowSelection)
        .filter((k) => rowSelection[k])
        .map((k) => offers[Number(k)]?._id)
        .filter(Boolean) as string[],
    );
    if (selectedIds && areSetsEqual(selectedIds, ids)) return;
    onSelectionChange(ids);
  }, [rowSelection, offers, onSelectionChange, selectedIds]);

  const table = useReactTable({
    data: offers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    rowCount: totalCount,
    state: { sorting, columnVisibility, rowSelection },
  });

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {selectedCount > 0 && bulkActionBar ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            {bulkActionBar}
          </div>
        ) : (
          <div />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs ml-auto">
              Columns <ChevronDown size={13} className="ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize text-sm"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap text-xs font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="cursor-pointer hover:bg-muted/40 data-[state=selected]:bg-muted"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="pt-0 pb-2">
                      <JourneyTrail offer={row.original} />
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
            : "0 results"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="px-2 text-xs">
            Page {page} / {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
