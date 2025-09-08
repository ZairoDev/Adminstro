"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Check, EllipsisVertical, Plus, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { EditableCell } from "../../spreadsheet/EditableCell";
import { IoOptions } from "react-icons/io5";
import BulkInvoiceButton from "./buttonBulk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoicePreview } from "../components/invoice-preview";
import { InvoiceData } from "../page";

export function InvoiceTable({
  tableData,
  setTableData,
}: {
  tableData: InvoiceData[];
  setTableData: React.Dispatch<React.SetStateAction<InvoiceData[]>>;
}) {
  const columns = [
    { label: "Invoice No", field: "invoiceNo", sortable: true },
    { label: "Name", field: "name", sortable: true },
    { label: "Phone", field: "phoneNumber", sortable: false },
    { label: "Email", field: "email", sortable: true },
    { label: "Amount", field: "amount", sortable: true },
    { label: "Total", field: "totalAmount", sortable: true },
    { label: "Status", field: "status", sortable: true },
    { label: "Check-In", field: "checkIn", sortable: true },
    { label: "Check-Out", field: "checkOut", sortable: true },
    { label: "Booking Type", field: "bookingType", sortable: true },
    { label: "Address", field: "address", sortable: false },
    { label: "Company Address", field: "companyAddress", sortable: false },
    {label: "Action", field: "action", sortable: false },
  ];

  const [sortedData, setSortedData] = useState<InvoiceData[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceData | null>(null);

  const [sortBy, setSortBy] = useState<keyof InvoiceData | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  useEffect(() => {
    if (sortBy) {
      applySort(sortBy, sortOrder);
    } else {
      setSortedData(tableData);
    }
  }, [tableData]);

  const applySort = (field: keyof InvoiceData, order: "asc" | "desc") => {
    const sorted = [...tableData].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }

      return order === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setSortedData(sorted);
  };

  const handleSort = (field: keyof InvoiceData) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortBy === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortBy(field);
    setSortOrder(newOrder);
    applySort(field, newOrder);
  };

  const handleSave = async (_id: string, key: keyof InvoiceData, newValue: any) => {
    const prev = tableData;
    const updatedData = tableData.map((item) =>
      item._id === _id ? { ...item, [key]: newValue } : item
    );
    setTableData(updatedData);

    try {
      await axios.put(`/api/invoice/${_id}`, {
        field: key,
        value: newValue,
      });
    } catch (error) {
      console.error("Update failed", error);
      setTableData(prev);
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Delete" && selectedRow) {
        setTableData((prev) => prev.filter((row) => row._id !== selectedRow));
        setSelectedRow(null);

        const res = await axios.delete(`/api/invoice/${selectedRow}`);
        if (res.status === 200) {
          toast(
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Invoice deleted successfully
            </div>
          );
        } else {
          toast(
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Error deleting invoice
            </div>
          );
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow]);

  return (
    <div className="space-y-4">
      

      <Table>
        <TableCaption>A list of your invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.field as string}
                onClick={
                  col.sortable
                    ? () => handleSort(col.field as keyof InvoiceData)
                    : undefined
                }
                className={col.sortable ? "cursor-pointer select-none" : ""}
              >
                {col.label}{" "}
                {col.sortable && sortBy === col.field
                  ? sortOrder === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedData.map((item: InvoiceData) => (
            <TableRow
              key={item._id}
              onClick={() => setSelectedRow(item._id!)}
              className={`cursor-pointer ${
                selectedRow === item._id ? "bg-gray-900 text-white" : ""
              }`}
            >
              <TableCell>{item.invoiceNumber?.toString() || ""}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.phoneNumber}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.amount?.toString() || ""}</TableCell>
              <TableCell>{item.totalAmount?.toString() || ""}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === "paid"
                      ? "bg-green-100 text-green-700"
                      : item.status === "unpaid"
                      ? "bg-red-100 text-red-700"
                      : item.status === "partially_paid"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {item.status}
                </span>
              </TableCell>
              <TableCell>
                {item.checkIn ? new Date(item.checkIn).toLocaleString() : ""}
              </TableCell>
              <TableCell>
                {item.checkOut ? new Date(item.checkOut).toLocaleString() : ""}
              </TableCell>
              <TableCell>{item.bookingType}</TableCell>
              <TableCell>{item.address}</TableCell>
              <TableCell>{item.companyAddress}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <EllipsisVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPreviewInvoice(item)}>
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>Download</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                    {/* <DropdownMenuItem>Subscription</DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog
        open={!!previewInvoice}
        onOpenChange={(open) => setPreviewInvoice(open ? previewInvoice : null)}
      >
        <DialogContent className="max-w-4xl p-0">
          {previewInvoice && (
            <InvoicePreview
              value={previewInvoice}
              computed={{
                subTotal: previewInvoice.amount,
                taxes: { sgst: 0, cgst: 0, igst: 0 }, // compute or pass real values
                total: previewInvoice.amount,
              }}
              currencyFormatter={(n) => `€${n.toFixed(2)}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
