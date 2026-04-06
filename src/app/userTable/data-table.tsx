"use client";
import React, { useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Search, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserInterface } from "@/util/type";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { OwnerJourneySites } from "@/components/owner-journey/OwnerJourneySites";
import { cn } from "@/lib/utils";

/** Left border accent on first cell — cycles so each record reads as its own block. */
const RECORD_LEFT_ACCENT = [
  "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-primary [&>td:first-child]:pl-3",
  "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-emerald-500 [&>td:first-child]:pl-3",
  "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-violet-500 [&>td:first-child]:pl-3",
  "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-amber-500 [&>td:first-child]:pl-3",
] as const;

interface DataTableProps {
  columns: ColumnDef<UserInterface, any>[];
  data: UserInterface[];
  search: string;
  setSearch: (value: string) => void;
  currentPage: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  totalUsers: number;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function DataTable({
  columns,
  data,
  search,
  setSearch,
  currentPage,
  setPage,
  totalPages,
  totalUsers,
  loading,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const serialCol: ColumnDef<UserInterface, any> = useMemo(() => ({
    id: "serial",
    header: "S.No.",
    cell: ({ row }) => (currentPage - 1) * PAGE_SIZE + row.index + 1,
  }), [currentPage]);

  const table = useReactTable({
    data,
    columns: [serialCol, ...columns],
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const startItem = totalUsers === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalUsers);

  return (
    <div className="space-y-5">
      <Heading heading="All Users" subheading="Manage and view all registered users" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search by name, email or phone... (Ctrl+K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-border/80 bg-background pl-9 pr-4 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-2" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  className="capitalize"
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/dashboard/createnewuser">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center text-muted-foreground">
            <Search className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={hg.id}
                  className="border-b border-border/80 bg-muted/50 hover:bg-muted/50 dark:bg-muted/30"
                >
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            {table.getRowModel().rows.map((row, recordIndex) => {
              const user = row.original as UserInterface;
              const colCount = table.getVisibleLeafColumns().length;
              const accent = RECORD_LEFT_ACCENT[recordIndex % RECORD_LEFT_ACCENT.length];
              const zebra = recordIndex % 2 === 0;

              return (
                <tbody
                  key={row.id}
                  className={cn(
                    "border-b border-border/70 last:border-b-0",
                    zebra
                      ? "[&_tr]:bg-card/90"
                      : "[&_tr]:bg-muted/40 dark:[&_tr]:bg-muted/15",
                  )}
                >
                  <TableRow
                    className={cn(
                      "border-b-0 transition-colors",
                      accent,
                      "hover:bg-muted/50 dark:hover:bg-muted/25",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-3.5 text-sm first:rounded-tl-md last:rounded-tr-md"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow
                    className={cn(
                      "border-b-0 transition-colors",
                      "hover:bg-muted/40 dark:hover:bg-muted/20",
                      zebra ? "bg-muted/25 dark:bg-muted/10" : "bg-muted/35 dark:bg-muted/20",
                    )}
                  >
                    <TableCell
                      colSpan={colCount}
                      className="border-t border-dashed border-border/60 px-4 py-4 first:rounded-bl-md last:rounded-br-md sm:px-5"
                    >
                      <div className="mb-2.5 flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                          aria-hidden
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Owner journey
                        </span>
                      </div>
                      <OwnerJourneySites journey={user.ownerJourney} />
                    </TableCell>
                  </TableRow>
                </tbody>
              );
            })}
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startItem}-{endItem}</span> of{" "}
          <span className="font-medium text-foreground">{totalUsers}</span> users
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => p + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
